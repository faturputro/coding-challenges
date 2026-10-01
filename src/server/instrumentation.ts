/**
 * Loaded before the app with `node -r ./dist/server/instrumentation.js` (see the
 * start scripts) so auto-instrumentation can patch http, express, pg, ioredis and
 * socket.io before they are required.
 */
import 'dotenv/config';
import type { ClientRequest, IncomingMessage, ServerResponse } from 'node:http';
import { DiagConsoleLogger, DiagLogLevel, diag, type Span } from '@opentelemetry/api';
import { logs, SeverityNumber } from '@opentelemetry/api-logs';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { HostMetricsInstrumentation } from '@opentelemetry/instrumentation-host-metrics';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { BatchLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { NodeSDK } from '@opentelemetry/sdk-node';
import isApiPath from '@server/utils/isApiPath';

const openobserveUrl = process.env.OPENOBSERVE_URL;
const openobserveOrg = process.env.OPENOBSERVE_ORG ?? 'default';
const endpoint = openobserveUrl ? `${openobserveUrl}/api/${openobserveOrg}` : undefined;
const email = process.env.OPENOBSERVE_EMAIL;
const password = process.env.OPENOBSERVE_PASSWORD;
const authHeader = email && password ? `Basic ${Buffer.from(`${email}:${password}`).toString('base64')}` : undefined;
const serviceName = process.env.OTEL_SERVICE_NAME ?? 'elsa';
const serviceVersion = process.env.APP_VERSION_HASH ?? '1.0.0';
const environment = process.env.NODE_ENV ?? 'development';

type ExpressRequest = IncomingMessage & {
	baseUrl?: string;
	route?: {
		path?: string | string[];
	};
};

const getPathname = (request: IncomingMessage) => {
	try {
		return new URL(request.url ?? '/', 'http://localhost').pathname;
	} catch {
		return request.url?.split('?', 1)[0] ?? '/';
	}
};

const getRoutePattern = (request: IncomingMessage) => {
	const expressRequest = request as ExpressRequest;
	const routePath = expressRequest.route?.path;

	if (typeof routePath !== 'string') {
		return undefined;
	}

	const normalizedPath = routePath === '*' ? '/*' : routePath.startsWith('/') ? routePath : `/${routePath}`;
	const baseUrl = expressRequest.baseUrl?.replace(/\/$/, '') ?? '';

	if (!baseUrl || normalizedPath.startsWith(`${baseUrl}/`) || normalizedPath === baseUrl) {
		return normalizedPath;
	}

	return `${baseUrl}${normalizedPath}`.replace(/\/{2,}/g, '/');
};

const annotateServerSpan = (span: Span, request: ClientRequest | IncomingMessage, response: IncomingMessage | ServerResponse) => {
	if (!('getHeader' in response) || typeof response.getHeader !== 'function') {
		return;
	}

	const incomingRequest = request as IncomingMessage;
	const serverResponse = response as ServerResponse;
	const route = getRoutePattern(incomingRequest);

	if (route) {
		span.setAttribute('http.route', route);
		span.updateName(`${incomingRequest.method ?? 'HTTP'} ${route}`);
	}

	span.setAttribute('http.response.status_code', serverResponse.statusCode);

	const contentType = serverResponse.getHeader('content-type');
	if (serverResponse.statusCode === 101 || (typeof contentType === 'string' && contentType.includes('text/event-stream'))) {
		span.setAttribute('app.is_stream', true);
	}
};

if (environment !== 'development' && process.env.OPENOBSERVE_DEBUG === 'true') {
	diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);
}

if (environment === 'development') {
	// Keep development completely local: do not initialize providers or exporters.
} else if (!endpoint || !authHeader) {
	console.warn('OpenObserve telemetry is disabled: OPENOBSERVE_URL, OPENOBSERVE_EMAIL or OPENOBSERVE_PASSWORD is not set');
} else {
	console.info(
		`[openobserve] telemetry enabled service=${serviceName} env=${environment} version=${serviceVersion} endpoint=${endpoint}`,
	);

	const sdk = new NodeSDK({
		resource: resourceFromAttributes({
			'service.name': serviceName,
			'service.version': serviceVersion,
			'deployment.environment': environment,
		}),

		traceExporter: new OTLPTraceExporter({
			url: `${endpoint}/v1/traces`,
			headers: { Authorization: authHeader },
		}),

		metricReader: new PeriodicExportingMetricReader({
			exporter: new OTLPMetricExporter({
				url: `${endpoint}/v1/metrics`,
				headers: { Authorization: authHeader },
			}),
			exportIntervalMillis: 30_000,
		}),

		logRecordProcessors: [
			new BatchLogRecordProcessor({
				exporter: new OTLPLogExporter({
					url: `${endpoint}/v1/logs`,
					headers: { Authorization: authHeader },
				}),
			}),
		],

		instrumentations: [
			getNodeAutoInstrumentations({
				'@opentelemetry/instrumentation-winston': {
					enabled: false,
				},
				'@opentelemetry/instrumentation-http': {
					ignoreIncomingRequestHook: (request) => !isApiPath(getPathname(request)),
					headersToSpanAttributes: {
						server: {
							responseHeaders: ['content-type'],
						},
					},
					applyCustomAttributesOnSpan: annotateServerSpan,
				},
				'@opentelemetry/instrumentation-fs': {
					enabled: false,
				},
				// Redis commands are only traced inside a request or job (the default), so
				// BullMQ's blocking polls and Socket.IO pub/sub don't flood the traces.
				'@opentelemetry/instrumentation-ioredis': {
					requireParentSpan: true,
				},
			}),
			new HostMetricsInstrumentation(),
		],
	});

	sdk.start();

	// Flush batched spans, metrics and logs on shutdown so the last seconds before a
	// deploy or restart aren't lost. Runs alongside the app's own graceful shutdown.
	const flush = () => {
		sdk.shutdown().catch((error) => console.error('[openobserve] shutdown failed', error));
	};
	process.once('SIGTERM', flush);
	process.once('SIGINT', flush);

	logs.getLogger(`${serviceName}-bootstrap`).emit({
		severityNumber: SeverityNumber.INFO,
		severityText: 'INFO',
		body: 'OpenObserve telemetry started',
		attributes: {
			'service.name': serviceName,
			'service.version': serviceVersion,
			'deployment.environment': environment,
			'observability.endpoint': endpoint,
		},
	});
}

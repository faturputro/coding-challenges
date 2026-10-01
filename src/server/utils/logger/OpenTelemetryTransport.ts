import { context } from '@opentelemetry/api';
import { type AnyValue, type AnyValueMap, logs, SeverityNumber } from '@opentelemetry/api-logs';
import Transport from 'winston-transport';

type WinstonLogInfo = {
	level: string;
	message?: string;
	timestamp?: string;
	[key: string | symbol]: unknown;
};

const severityByLevel: Record<string, SeverityNumber> = {
	error: SeverityNumber.ERROR,
	warn: SeverityNumber.WARN,
	info: SeverityNumber.INFO,
	http: SeverityNumber.INFO,
	verbose: SeverityNumber.DEBUG,
	debug: SeverityNumber.DEBUG,
	silly: SeverityNumber.TRACE,
};

const logger = logs.getLogger('elsa-winston');

const toAttributeValue = (value: unknown): AnyValue | undefined => {
	if (value === undefined) {
		return undefined;
	}

	if (value === null || ['string', 'number', 'boolean'].includes(typeof value)) {
		return value as AnyValue;
	}

	return JSON.stringify(value);
};

const toAttributes = (metadata: Record<string, unknown>): AnyValueMap =>
	Object.fromEntries(
		Object.entries(metadata)
			.map(([key, value]) => [key, toAttributeValue(value)])
			.filter(([, value]) => value !== undefined),
	) as AnyValueMap;

export default class OpenTelemetryTransport extends Transport {
	log(info: WinstonLogInfo, callback?: () => void) {
		setImmediate(() => this.emit('logged', info));

		const { level, message, timestamp, ...metadata } = info as WinstonLogInfo;

		// Secrets are already removed by the logger's redact format (see ./index.ts).
		logger.emit({
			timestamp: timestamp ? new Date(timestamp) : new Date(),
			severityNumber: severityByLevel[level] ?? SeverityNumber.UNSPECIFIED,
			severityText: level.toUpperCase(),
			body: message,
			attributes: toAttributes(metadata),
			context: context.active(),
		});

		callback?.();
	}
}

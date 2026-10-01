import { SpanStatusCode, trace } from '@opentelemetry/api';
import { AppErrorCode } from '@server/types/app';
import context from '@server/types/context';
import AppError from '@server/utils/AppError';
import { logger } from '@server/utils/logger';
import type { NextFunction, Request, Response } from 'express';
import { UniqueConstraintError } from 'sequelize';

/**
 * Names the active request span after its route and records the outcome.
 * Only 5xx responses mark the span as an error; 4xx are client mistakes
 * (OpenTelemetry HTTP server semantics) and would otherwise drown real faults.
 */
const annotateFailedRequest = (req: Request, statusCode: number, error: Error) => {
	const span = trace.getActiveSpan();
	if (!span) return;

	const routePath = typeof req.route?.path === 'string' ? req.route.path : req.path;
	const baseUrl = req.baseUrl.replace(/\/$/, '');
	const normalizedRoute = `${baseUrl}${routePath.startsWith('/') ? routePath : `/${routePath}`}`.replace(/\/{2,}/g, '/');

	span.setAttributes({
		'http.request.method': req.method,
		'http.route': normalizedRoute,
		'http.response.status_code': statusCode,
		'url.path': req.originalUrl.split('?', 1)[0],
	});
	span.updateName(`${req.method} ${normalizedRoute}`);

	if (statusCode >= 500) {
		span.recordException(error);
		span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
	}
};

export default (req: Request, res: Response, next: NextFunction) => {
	const requestId = context.id;
	const timestamp = context.timestamp;

	const requestContext = {
		id: requestId,
		timestamp,
		path: req.path,
		headers: req.headers,
		body: req.body,
		params: req.params,
		query: req.query,
	};

	res.success = (data?: unknown, message?: string): Response => {
		let msg = message;

		return res.status(200).json({
			success: true,
			message: msg,
			request_id: requestId,
			timestamp,
			data: data || null,
		});
	};

	res.failed = (e: Error): Response => {
		if (e.name === 'SequelizeUniqueConstraintError') {
			annotateFailedRequest(req, 400, e);
			return res.status(400).json({
				success: false,
				code: AppErrorCode.DuplicateUniqueResource,
				message: (e as UniqueConstraintError).errors.map((err) => `${err.path} "${err.value} already exists"`).join(', '),
				request_id: requestId,
				timestamp,
				data: null,
			});
		}

		if (e instanceof AppError) {
			let message = e.message;

			const getHttpStatus = () => {
				switch (e.code) {
					case AppErrorCode.InternalServerError:
					case AppErrorCode.BadConfiguration:
						return 500;
					case AppErrorCode.InvalidCredentials:
					case AppErrorCode.TokenExpired:
					case AppErrorCode.InvalidToken:
					case AppErrorCode.Unauthorized:
						return 401;
					case AppErrorCode.Forbidden:
						return 403;
					case AppErrorCode.ValidationFailed:
						return 422;
					case AppErrorCode.TooManyRequests:
						return 429;
					case AppErrorCode.NotFound:
						return 404;
					case AppErrorCode.Conflict:
						return 409;
					default:
						return 400;
				}
			};

			const httpStatus = getHttpStatus();
			annotateFailedRequest(req, httpStatus, e);

			logger.error(`${httpStatus} ${req.method} ${req.originalUrl}`, {
				timestamp,
				request_id: requestId,
				code: e.code,
				stack: e.stack ?? null,
				metadata: requestContext,
			});

			return res.status(httpStatus).json({
				success: false,
				code: e.code,
				message,
				request_id: requestId,
				timestamp,
				data: e.data || null,
			});
		}

		annotateFailedRequest(req, 500, e);
		logger.error(`500 ${req.method} ${req.originalUrl}`, {
			stack: e.stack ?? null,
			request_id: requestId,
			timestamp,
			metadata: requestContext,
		});

		return res.status(500).json({
			success: false,
			code: AppErrorCode.InternalServerError,
			request_id: requestId,
			timestamp,
			data: null,
		});
	};

	return next();
};

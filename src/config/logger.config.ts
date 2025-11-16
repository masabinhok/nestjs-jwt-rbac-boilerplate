import { Params } from 'nestjs-pino';
import { IncomingMessage, ServerResponse } from 'http';

export const loggerConfig: Params = {
  pinoHttp: {
    transport:
      process.env.NODE_ENV !== 'production'
        ? {
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'SYS:standard',
              ignore: 'pid,hostname',
              singleLine: false,
              messageFormat: '[{context}] {msg}',
            },
          }
        : undefined,

    customProps: (req: unknown) => {
      const request = req as { correlationId?: string };
      return {
        correlationId: request.correlationId,
      };
    },

    // Customize log levels for different status codes
    customLogLevel: (
      _req: IncomingMessage,
      res: ServerResponse<IncomingMessage>,
      err: Error | undefined,
    ) => {
      if (res.statusCode >= 500 || err) {
        return 'error';
      }
      if (res.statusCode >= 400) {
        return 'warn';
      }
      return 'info';
    },

    // Customize success message
    customSuccessMessage: (
      req: IncomingMessage,
      res: ServerResponse<IncomingMessage>,
    ) => {
      return `${req.method} ${req.url} - ${res.statusCode}`;
    },

    // Customize error message
    customErrorMessage: (
      req: IncomingMessage,
      res: ServerResponse<IncomingMessage>,
      err: Error,
    ) => {
      return `${req.method} ${req.url} - ${res.statusCode} - ${err.message}`;
    },

    // Redact sensitive information
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'req.body.password',
        'res.headers["set-cookie"]',
      ],
      censor: '[REDACTED]',
    },

    serializers: {
      req: (req: {
        id: string;
        method: string;
        url: string;
        query: unknown;
        params: unknown;
        headers: Record<string, unknown>;
        remoteAddress: string;
        remotePort: number;
      }) => ({
        id: req.id,
        method: req.method,
        url: req.url,
        query: req.query,
        params: req.params,
        headers: {
          'user-agent': req.headers['user-agent'],
          'content-type': req.headers['content-type'],
        },
        remoteAddress: req.remoteAddress,
        remotePort: req.remotePort,
      }),
      res: (res: { statusCode: number; headers: Record<string, unknown> }) => ({
        statusCode: res.statusCode,
        headers: {
          'content-type': res.headers['content-type'],
        },
      }),
    },

    level: process.env.LOG_LEVEL || 'info',

    // Don't log health check endpoints
    autoLogging: {
      ignore: (req: IncomingMessage) =>
        req.url === '/health' || req.url === '/api/v1/health',
    },
  },
};

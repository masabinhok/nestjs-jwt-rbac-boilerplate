import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiResponse } from '../interfaces/api-response.interface';
import { Logger } from 'nestjs-pino';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(@Inject(Logger) private readonly logger: Logger) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();
    const correlationId = request['correlationId'] as string;

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let code = 'INTERNAL_SERVER_ERROR';
    let details: unknown = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null
      ) {
        const responseObj = exceptionResponse as Record<string, unknown>;
        message =
          (typeof responseObj.message === 'string'
            ? responseObj.message
            : undefined) || message;
        details = responseObj.error || responseObj.details;
      }

      // Generate error code from status
      code = this.getErrorCode(status, message);
    } else if (exception instanceof Error) {
      message = exception.message;
      code = 'INTERNAL_SERVER_ERROR';
    }

    // Log the error with correlation ID
    this.logger.error(
      {
        correlationId,
        statusCode: status,
        errorCode: code,
        message,
        details,
        path: request.url,
        method: request.method,
        stack: exception instanceof Error ? exception.stack : undefined,
      },
      `Error occurred: ${message}`,
    );

    const errorResponse: ApiResponse = {
      success: false,
      error: {
        message,
        code,
        ...(details !== undefined && { details }),
      },
      meta: {
        correlationId,
      },
    };

    response.status(status).json(errorResponse);
  }

  private getErrorCode(status: number, message: string): string {
    // Convert message to error code format
    const messageCode = message
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_|_$/g, '');

    // Map common HTTP status codes
    const statusCodeMap: { [key: number]: string } = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'UNPROCESSABLE_ENTITY',
      500: 'INTERNAL_SERVER_ERROR',
    };

    // If we have a specific message code, use it, otherwise use status code
    if (messageCode && messageCode !== statusCodeMap[status]) {
      return messageCode;
    }

    return statusCodeMap[status] || 'INTERNAL_SERVER_ERROR';
  }
}

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from '../interfaces/api-response.interface';
import { Request } from 'express';

@Injectable()
export class ResponseInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    const request = context.switchToHttp().getRequest<Request>();
    const correlationId = request['correlationId'] as string;

    return next.handle().pipe(
      map((data: T | ApiResponse<T>) => {
        // If the response is already in the correct format, return it
        if (
          data &&
          typeof data === 'object' &&
          'success' in data &&
          'meta' in data
        ) {
          const existingMeta = data.meta || {};
          return {
            ...data,
            meta: {
              ...existingMeta,
              correlationId,
              timestamp: new Date().toISOString(),
            },
          } as ApiResponse<T>;
        }

        // Otherwise, wrap it in the standard format
        return {
          success: true,
          data: data as T | undefined,
          meta: {
            correlationId,
            timestamp: new Date().toISOString(),
          },
        } as ApiResponse<T>;
      }),
    );
  }
}

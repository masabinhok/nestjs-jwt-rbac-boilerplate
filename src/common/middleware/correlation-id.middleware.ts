import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Get correlation ID from header or generate new one
    const correlationId =
      (req.headers['x-correlation-id'] as string) || randomUUID();

    // Attach to request for later use
    req['correlationId'] = correlationId;

    // Set response header
    res.setHeader('X-Correlation-ID', correlationId);

    next();
  }
}

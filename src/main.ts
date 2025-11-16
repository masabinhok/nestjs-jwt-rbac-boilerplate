import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { Logger } from 'nestjs-pino';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  
  // Use Pino logger
  app.useLogger(app.get(Logger));

  app.setGlobalPrefix('api/v1');

  const configService = app.get(ConfigService);

  const port = configService.get<number>('PORT');
  const corsOrigins = configService.get<string>('CORS_ORIGIN')?.split(',');

  app.enableCors({
    origins: corsOrigins,
    credentials: true, 
  })

  app.use(cookieParser());

  app.use(helmet());

  app.useGlobalPipes(new ValidationPipe(
   { whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,}
  ))

  // Get logger instance
  const logger = app.get(Logger);

  // Global response interceptor for standard API responses
  app.useGlobalInterceptors(new ResponseInterceptor());

  // Global exception filter for standard error responses
  app.useGlobalFilters(new HttpExceptionFilter(logger));

  await app.listen(port || 8080);
  
  logger.log(`🚀 Application is running on: http://localhost:${port || 8080}/api/v1`, 'Bootstrap');
}
bootstrap();

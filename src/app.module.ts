import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { AuthModule } from './modules/auth/auth.module';
import { LoggerModule } from 'nestjs-pino';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './modules/users/users.module';
import { AppConfigModule } from './config/config.module';
import { loggerConfig } from './config/logger.config';
import { CorrelationIdMiddleware } from './common/middleware/correlation-id.middleware';
import { RolesGuard } from './common/guards/roles.guard';
import { AuthGuard } from './common/guards/auth.guard';

@Module({
  imports: [
    LoggerModule.forRoot(loggerConfig),
    AppConfigModule,
    AuthModule,
    UsersModule,
    PrismaModule
  ],
  controllers: [],
  providers: [
    {
      provide: 'APP_GUARD',
      useClass: AuthGuard,
    },
    {
      provide: 'APP_GUARD',
      useClass: RolesGuard,
    }
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { envSchema } from './env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validate: (config) => {
        const parsed = envSchema.safeParse(config);

        if (!parsed.success) {
          console.error('Invalid environment variables:');
          console.error(JSON.stringify(parsed.error.format(), null, 2));
          throw new Error('Environment validation failed');
        }

        return parsed.data;
      },
    }),
  ],
})
export class AppConfigModule {}

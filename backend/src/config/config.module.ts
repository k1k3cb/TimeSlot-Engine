import { Global, Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule, ConfigService } from '@nestjs/config';
import { validateEnv } from './env.validation';
import { jwtConfig, argon2Config, corsConfig } from './configuration';

@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnv,
      load: [jwtConfig, argon2Config, corsConfig],
      envFilePath: ['.env.local', '.env'],
    }),
  ],
  exports: [NestConfigModule],
})
export class AppConfigModule {}

export { ConfigService };
import { NestFactory, Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: false,
  });

  const config = app.get(ConfigService);
  const port = config.get<number>('port', 3000);
  const origins = config.get<string[]>('cors.origins', ['http://localhost:5173']);

  app.enableCors({
    origin: origins,
    credentials: true,
  });

  app.setGlobalPrefix('api', {
    exclude: ['health'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      forbidUnknownValues: false,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(app.get(Reflector), {
      excludeExtraneousValues: false,
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());

  if (process.env.ENABLE_SHUTDOWN_HOOKS === 'true') {
    app.enableShutdownHooks();
  }

  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`TimeSlot API listening on http://localhost:${port}/api`);
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Fatal bootstrap error:', err);
  process.exit(1);
});
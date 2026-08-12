import { NestFactory, Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';
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

  const swaggerConfig = new DocumentBuilder()
    .setTitle('TimeSlot Engine')
    .setDescription(
      'Sistema de gestión de reservas de canchas de pádel. ' +
      'Autenticación JWT, motor de disponibilidad con timezone, ' +
      'prevención de solapamientos via constraint EXCLUDE en PostgreSQL, ' +
      'políticas de cancelación configurables, y notificaciones WebSocket.',
    )
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' })
    .addServer('http://localhost:3000')
    .addTag('auth', 'Autenticación y registro de usuarios')
    .addTag('resources', 'Gestión de canchas (CRUD admin)')
    .addTag('availability', 'Motor de slots disponibles')
    .addTag('bookings', 'Reservas de canchas')
    .addTag('policies', 'Políticas de cancelación')
    .build();

  const doc = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, doc);

  app.use('/reference', apiReference({ url: '/docs-json' }));

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
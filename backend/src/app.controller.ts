import { Controller, Get } from '@nestjs/common';
import { Public } from './common/decorators/auth.decorators';
import { PrismaService } from './prisma/prisma.service';

@Controller()
export class AppController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  index() {
    return {
      name: 'TimeSlot Engine API',
      version: '1.0.0',
      docs: {
        health: '/health',
        auth: {
          register: 'POST /api/auth/register',
          login: 'POST /api/auth/login',
          refresh: 'POST /api/auth/refresh',
          me: 'GET /api/auth/me',
        },
        resources: {
          list: 'GET /api/resources',
          get: 'GET /api/resources/:id',
          create: 'POST /api/resources (ADMIN)',
          update: 'PATCH /api/resources/:id (ADMIN)',
          delete: 'DELETE /api/resources/:id (ADMIN)',
        },
        availability: {
          compute: 'GET /api/availability?resourceId=...&date=YYYY-MM-DD',
        },
        bookings: {
          create: 'POST /api/bookings',
          list: 'GET /api/bookings',
          get: 'GET /api/bookings/:id',
          cancel: 'PATCH /api/bookings/:id/cancel',
          confirm: 'PATCH /api/bookings/:id/confirm (ADMIN)',
          attend: 'PATCH /api/bookings/:id/attend (ADMIN)',
          noShow: 'PATCH /api/bookings/:id/no-show (ADMIN)',
        },
        policies: {
          defaults: 'GET /api/policies/defaults',
          setGlobal: 'POST /api/policies/global (ADMIN)',
          setResource: 'POST /api/policies/resource/:resourceId (ADMIN)',
        },
        websocket: 'ws://localhost:3000/ws',
      },
    };
  }

  @Public()
  @Get('health')
  async health() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', db: 'up', timestamp: new Date().toISOString() };
    } catch (e) {
      return {
        status: 'degraded',
        db: 'down',
        error: (e as Error).message,
        timestamp: new Date().toISOString(),
      };
    }
  }
}
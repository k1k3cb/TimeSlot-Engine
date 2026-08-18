import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppConfigModule } from './config/config.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { JwtAuthGlobalGuard } from './auth/guards/jwt-auth-global.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { ResourcesModule } from './resources/resources.module';
import { AvailabilityModule } from './availability/availability.module';
import { PoliciesModule } from './policies/policies.module';
import { BookingsModule } from './bookings/bookings.module';
import { NotificationsModule } from './notifications/notifications.module';
import { UploadsModule } from './uploads/uploads.module';

@Module({
  imports: [
    AppConfigModule,
    PrismaModule,
    UsersModule,
    AuthModule,
    ResourcesModule,
    AvailabilityModule,
    PoliciesModule,
    NotificationsModule,
    BookingsModule,
    UploadsModule,
  ],
  controllers: [AppController],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGlobalGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
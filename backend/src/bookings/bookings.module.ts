import { Module } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';
import { PoliciesModule } from '../policies/policies.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PoliciesModule, NotificationsModule],
  controllers: [BookingsController],
  providers: [BookingsService],
  exports: [BookingsService],
})
export class BookingsModule {}
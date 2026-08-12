import { Module } from '@nestjs/common';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationsService } from './notifications.service';
import { WsJwtGuard } from './ws-jwt.guard';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  providers: [NotificationsGateway, NotificationsService, WsJwtGuard],
  exports: [NotificationsService],
})
export class NotificationsModule {}
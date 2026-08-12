import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../common/decorators/auth.decorators';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ParseCuidPipe } from '../common/pipes/parse-cuid.pipe';
import { BookingsService } from './bookings.service';
import { CreateBookingDto, ListBookingsQueryDto, CancelBookingDto } from './dto/booking.dto';
import type { RequestUser } from '../common/types/auth.types';
import { BookingStatus } from '@prisma/client';

@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookings: BookingsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CLIENT', 'ADMIN')
  @Post()
  create(@Body() dto: CreateBookingDto, @CurrentUser() user: RequestUser) {
    const startAt = new Date(dto.startAt);
    return this.bookings.createAndNotify({
      resourceId: dto.resourceId,
      userId: user.id,
      startAt,
      durationMinutes: dto.durationMinutes,
      notes: dto.notes,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  list(@Query() q: ListBookingsQueryDto, @CurrentUser() user: RequestUser) {
    if (user.role === 'ADMIN') {
      return this.bookings.listAll({
        resourceId: q.resourceId,
        userId: q.userId,
        status: q.status as BookingStatus | undefined,
      });
    }
    return this.bookings.listForUser(
      user.id,
      q.status ? [q.status as BookingStatus] : undefined,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async findOne(
    @Param('id', ParseCuidPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    const booking = await this.bookings.findById(id);
    if (user.role !== 'ADMIN' && booking.userId !== user.id) {
      throw new ForbiddenException('Cannot view another user booking');
    }
    return booking;
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/cancel')
  cancel(
    @Param('id', ParseCuidPipe) id: string,
    @Body() dto: CancelBookingDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.bookings.cancel({
      bookingId: id,
      userId: user.id,
      userRole: user.role,
      reason: dto.reason,
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch(':id/confirm')
  confirm(@Param('id', ParseCuidPipe) id: string) {
    return this.bookings.confirm(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch(':id/complete')
  @HttpCode(HttpStatus.OK)
  complete(@Param('id', ParseCuidPipe) id: string) {
    return this.bookings.complete(id);
  }
}
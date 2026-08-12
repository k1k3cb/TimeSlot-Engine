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
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/auth.decorators';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ParseCuidPipe } from '../common/pipes/parse-cuid.pipe';
import { BookingsService } from './bookings.service';
import { CreateBookingDto, ListBookingsQueryDto, CancelBookingDto, BookingResponseDto } from './dto/booking.dto';
import { ErrorResponseDto } from '../common/dto/response.dto';
import type { RequestUser } from '../common/types/auth.types';
import { BookingStatus } from '@prisma/client';

@ApiTags('bookings')
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookings: BookingsService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CLIENT', 'ADMIN')
  @Post()
  @ApiOperation({ summary: 'Crear reserva', description: 'Reserva un slot de tiempo en una cancha. Valida disponibilidad en tiempo real y previene solapamientos via constraint EXCLUDE en PostgreSQL.' })
  @ApiResponse({ status: 201, description: 'Reserva creada y confirmada', type: BookingResponseDto })
  @ApiResponse({ status: 400, description: 'Datos inválidos o slot fuera de horario', type: ErrorResponseDto })
  @ApiResponse({ status: 401, description: 'No autorizado', type: ErrorResponseDto })
  @ApiResponse({ status: 409, description: 'Slot ya reservado (solapamiento)', type: ErrorResponseDto })
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

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiOperation({ summary: 'Listar reservas', description: 'CLIENT ve solo las suyas. ADMIN ve todas (filtrable por resourceId, userId, status).' })
  @ApiResponse({ status: 200, description: 'Lista de reservas', type: [BookingResponseDto] })
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

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  @ApiOperation({ summary: 'Detalle de reserva' })
  @ApiResponse({ status: 200, description: 'Reserva encontrada', type: BookingResponseDto })
  @ApiResponse({ status: 401, description: 'No autorizado', type: ErrorResponseDto })
  @ApiResponse({ status: 403, description: 'No puedes ver reservas de otro usuario', type: ErrorResponseDto })
  @ApiResponse({ status: 404, description: 'Reserva no encontrada', type: ErrorResponseDto })
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

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancelar reserva', description: 'Cancela una reserva y aplica la política de reembolso correspondiente.' })
  @ApiResponse({ status: 200, description: 'Reserva cancelada con reembolso calculado', type: BookingResponseDto })
  @ApiResponse({ status: 400, description: 'Reserva ya cancelada o ya iniciada', type: ErrorResponseDto })
  @ApiResponse({ status: 403, description: 'No puedes cancelar reservas de otro usuario', type: ErrorResponseDto })
  @ApiResponse({ status: 404, description: 'Reserva no encontrada', type: ErrorResponseDto })
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

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch(':id/confirm')
  @ApiOperation({ summary: 'Confirmar reserva (ADMIN)' })
  @ApiResponse({ status: 200, description: 'Reserva confirmada', type: BookingResponseDto })
  @ApiResponse({ status: 404, description: 'Reserva no encontrada', type: ErrorResponseDto })
  confirm(@Param('id', ParseCuidPipe) id: string) {
    return this.bookings.confirm(id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch(':id/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Marcar reserva como completada (ADMIN)' })
  @ApiResponse({ status: 200, description: 'Reserva completada', type: BookingResponseDto })
  @ApiResponse({ status: 404, description: 'Reserva no encontrada', type: ErrorResponseDto })
  complete(@Param('id', ParseCuidPipe) id: string) {
    return this.bookings.complete(id);
  }
}
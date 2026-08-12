import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateBookingDto {
  @ApiProperty({ example: 'seed-cancha-1-p-del-cristal', description: 'ID del recurso (cancha)' })
  @IsString()
  resourceId!: string;

  @ApiProperty({ example: '2026-08-15T18:00:00.000Z', description: 'Inicio del slot en UTC' })
  @IsDateString()
  startAt!: string;

  @ApiPropertyOptional({ example: 60, minimum: 15, maximum: 480, default: 60, description: 'Duración en minutos' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(15)
  @Max(480)
  durationMinutes?: number;

  @ApiPropertyOptional({ example: 'Reserva para práctica', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class ListBookingsQueryDto {
  @ApiPropertyOptional({ description: 'Filtrar por ID de recurso' })
  @IsOptional() @IsString() resourceId?: string;

  @ApiPropertyOptional({ description: 'Filtrar por ID de usuario (solo ADMIN)' })
  @IsOptional() @IsString() userId?: string;

  @ApiPropertyOptional({ enum: ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'] })
  @IsOptional()
  @IsIn(['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'])
  status?: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
}

export class CancelBookingDto {
  @ApiPropertyOptional({ example: 'No puedo asistir', maxLength: 500 })
  @IsOptional() @IsString() @MaxLength(500) reason?: string;
}

export class ConfirmBookingDto {
  @ApiPropertyOptional({ example: 'Confirmado por admin', maxLength: 500 })
  @IsOptional() @IsString() @MaxLength(500) notes?: string;
}

export class BookingResponseDto {
  @ApiProperty({ example: 'cmspa8xfi0002gsgxww55fpu1' })
  id!: string;

  @ApiProperty({ example: 'seed-cancha-1-p-del-cristal' })
  resourceId!: string;

  @ApiProperty({ example: 'cmspa0dc200007ggxsn3bsgow' })
  userId!: string;

  @ApiProperty({ example: '2026-08-15T18:00:00.000Z' })
  startAt!: string;

  @ApiProperty({ example: '2026-08-15T19:00:00.000Z' })
  endAt!: string;

  @ApiProperty({ enum: ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'], example: 'CONFIRMED' })
  status!: string;

  @ApiProperty({ example: null, nullable: true })
  notes!: string | null;

  @ApiProperty({ example: null, nullable: true })
  cancelledAt!: string | null;

  @ApiProperty({ example: null, nullable: true, description: 'Porcentaje de reembolso aplicado' })
  refundPct!: number | null;
}
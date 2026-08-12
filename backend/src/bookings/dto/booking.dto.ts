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
  @IsString()
  resourceId!: string;

  @IsDateString()
  startAt!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(15)
  @Max(480)
  durationMinutes?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class ListBookingsQueryDto {
  @IsOptional() @IsString() resourceId?: string;
  @IsOptional() @IsString() userId?: string;
  @IsOptional()
  @IsIn(['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'])
  status?: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
}

export class CancelBookingDto {
  @IsOptional() @IsString() @MaxLength(500) reason?: string;
}

export class ConfirmBookingDto {
  @IsOptional() @IsString() @MaxLength(500) notes?: string;
}
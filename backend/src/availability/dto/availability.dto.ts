import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator';

export class AvailabilityQueryDto {
  @ApiProperty({ example: 'seed-cancha-1-p-del-cristal', description: 'ID del recurso' })
  @IsString()
  resourceId!: string;

  @ApiProperty({ example: '2026-08-15', description: 'Fecha (YYYY-MM-DD)' })
  @IsDateString()
  date!: string;

  @ApiPropertyOptional({ example: '08:00', description: 'Hora inicio filtro (HH:mm)' })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  fromTime?: string;

  @ApiPropertyOptional({ example: '20:00', description: 'Hora fin filtro (HH:mm)' })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  toTime?: string;

  @ApiPropertyOptional({ example: 60, minimum: 15, maximum: 480, default: 60, description: 'Duración del slot en minutos' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(15)
  @Max(480)
  slotMinutes?: number;
}

export class SlotDto {
  @ApiProperty({ example: '2026-08-15T14:00:00.000Z', description: 'Inicio del slot en UTC' })
  start!: string;

  @ApiProperty({ example: '2026-08-15T15:00:00.000Z', description: 'Fin del slot en UTC' })
  end!: string;
}

export class AvailabilityResponseDto {
  @ApiProperty({ example: 'seed-cancha-1-p-del-cristal' })
  resourceId!: string;

  @ApiProperty({ example: 'America/Mexico_City' })
  timezone!: string;

  @ApiProperty({ example: '2026-08-15' })
  date!: string;

  @ApiProperty({ example: 60 })
  slotMinutes!: number;

  @ApiProperty({ type: [SlotDto], description: 'Slots disponibles (horarios en UTC)' })
  slots!: SlotDto[];
}
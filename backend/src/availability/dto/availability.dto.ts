import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator';

export class AvailabilityQueryDto {
  @IsString()
  resourceId!: string;

  @IsDateString()
  date!: string;

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  fromTime?: string;

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  toTime?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(15)
  @Max(480)
  slotMinutes?: number;
}

export interface SlotDto {
  start: string;
  end: string;
}

export class AvailabilityResponseDto {
  resourceId!: string;
  timezone!: string;
  date!: string;
  slotMinutes!: number;
  slots!: SlotDto[];
}
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class ResourceScheduleDto {
  @ApiProperty({ example: 1, minimum: 0, maximum: 6, description: 'Día de la semana (0=Dom, 1=Lun, ..., 6=Sáb)' })
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek!: number;

  @ApiProperty({ example: '07:00', description: 'Hora de apertura (HH:mm)' })
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'openTime must be HH:mm' })
  openTime!: string;

  @ApiProperty({ example: '23:00', description: 'Hora de cierre (HH:mm)' })
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'closeTime must be HH:mm' })
  closeTime!: string;
}

export class CreateResourceDto {
  @ApiProperty({ example: 'Cancha 1 - Pádel Cristal', description: 'Nombre del recurso' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional({ example: 'Cancha de pádel con paredes de cristal', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ enum: ['EXCLUSIVE', 'SHARED'], default: 'EXCLUSIVE', description: 'EXCLUSIVE=1 persona, SHARED=varias' })
  @IsOptional()
  @IsIn(['EXCLUSIVE', 'SHARED'])
  mode?: 'EXCLUSIVE' | 'SHARED';

  @ApiPropertyOptional({ example: 1, minimum: 1, maximum: 1000, default: 1, description: 'Capacidad (1 para exclusivo)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  capacity?: number;

  @ApiPropertyOptional({ example: 'America/Mexico_City', default: 'UTC', description: 'Timezone IANA del recurso' })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z_]+(?:\/[A-Za-z_+\-]+)*$|^UTC$/, {
    message: 'timezone must be a valid IANA name',
  })
  timezone?: string;

  @ApiProperty({ type: [ResourceScheduleDto], description: 'Horarios semanales del recurso' })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ResourceScheduleDto)
  schedules!: ResourceScheduleDto[];

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateResourceDto {
  @ApiPropertyOptional({ example: 'Cancha 1 - Pádel Cristal' })
  @IsOptional() @IsString() @MinLength(2) @MaxLength(120) name?: string;

  @ApiPropertyOptional({ example: 'Descripción actualizada' })
  @IsOptional() @IsString() @MaxLength(500) description?: string;

  @ApiPropertyOptional({ enum: ['EXCLUSIVE', 'SHARED'] })
  @IsOptional() @IsIn(['EXCLUSIVE', 'SHARED']) mode?: 'EXCLUSIVE' | 'SHARED';

  @ApiPropertyOptional({ example: 2 })
  @IsOptional() @IsInt() @Min(1) @Max(1000) capacity?: number;

  @ApiPropertyOptional({ example: 'America/Mexico_City' })
  @IsOptional() @IsString() timezone?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsBoolean() isActive?: boolean;

  @ApiPropertyOptional({ type: [ResourceScheduleDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ResourceScheduleDto)
  schedules?: ResourceScheduleDto[];
}

export class ListResourcesQueryDto {
  @ApiPropertyOptional({ example: 'America/Mexico_City' })
  @IsOptional() @IsString() timezone?: string;

  @ApiPropertyOptional({ enum: ['EXCLUSIVE', 'SHARED'] })
  @IsOptional() @IsIn(['EXCLUSIVE', 'SHARED']) mode?: 'EXCLUSIVE' | 'SHARED';

  @ApiPropertyOptional({ default: true, description: 'Solo recursos activos' })
  @IsOptional() @IsBoolean() onlyActive?: boolean;
}

export class ResourceResponseDto {
  @ApiProperty({ example: 'seed-cancha-1-p-del-cristal' })
  id!: string;

  @ApiProperty({ example: 'Cancha 1 - Pádel Cristal' })
  name!: string;

  @ApiProperty({ example: 'Cancha de pádel con paredes de cristal', nullable: true })
  description!: string | null;

  @ApiProperty({ enum: ['EXCLUSIVE', 'SHARED'], example: 'EXCLUSIVE' })
  mode!: string;

  @ApiProperty({ example: 1 })
  capacity!: number;

  @ApiProperty({ example: 'America/Mexico_City' })
  timezone!: string;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiProperty({ type: [ResourceScheduleDto] })
  schedules!: ResourceScheduleDto[];
}
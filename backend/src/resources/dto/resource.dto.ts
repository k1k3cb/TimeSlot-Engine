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
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek!: number;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'openTime must be HH:mm' })
  openTime!: string;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'closeTime must be HH:mm' })
  closeTime!: string;
}

export class CreateResourceDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsIn(['EXCLUSIVE', 'SHARED'])
  mode?: 'EXCLUSIVE' | 'SHARED';

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  capacity?: number;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z_]+(?:\/[A-Za-z_+\-]+)*$|^UTC$/, {
    message: 'timezone must be a valid IANA name',
  })
  timezone?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ResourceScheduleDto)
  schedules!: ResourceScheduleDto[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateResourceDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(120) name?: string;
  @IsOptional() @IsString() @MaxLength(500) description?: string;
  @IsOptional() @IsIn(['EXCLUSIVE', 'SHARED']) mode?: 'EXCLUSIVE' | 'SHARED';
  @IsOptional() @IsInt() @Min(1) @Max(1000) capacity?: number;
  @IsOptional() @IsString() timezone?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ResourceScheduleDto)
  schedules?: ResourceScheduleDto[];
}

export class ListResourcesQueryDto {
  @IsOptional() @IsString() timezone?: string;
  @IsOptional() @IsIn(['EXCLUSIVE', 'SHARED']) mode?: 'EXCLUSIVE' | 'SHARED';
  @IsOptional() @IsBoolean() onlyActive?: boolean;
}
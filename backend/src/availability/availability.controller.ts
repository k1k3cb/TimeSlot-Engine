import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/auth.decorators';
import { AvailabilityService } from './availability.service';
import { AvailabilityQueryDto, AvailabilityResponseDto } from './dto/availability.dto';
import { ErrorResponseDto } from '../common/dto/response.dto';

@ApiTags('availability')
@Controller('availability')
export class AvailabilityController {
  constructor(private readonly availability: AvailabilityService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Consultar slots disponibles', description: 'Calcula los slots de tiempo disponibles para una cancha en una fecha específica, respetando timezone y reservas existentes.' })
  @ApiResponse({ status: 200, description: 'Slots disponibles', type: AvailabilityResponseDto })
  @ApiResponse({ status: 400, description: 'Fecha o parámetros inválidos', type: ErrorResponseDto })
  @ApiResponse({ status: 404, description: 'Recurso no encontrado', type: ErrorResponseDto })
  compute(@Query() q: AvailabilityQueryDto) {
    return this.availability.compute(
      q.resourceId,
      q.date,
      q.fromTime,
      q.toTime,
      q.slotMinutes ?? 60,
    );
  }
}
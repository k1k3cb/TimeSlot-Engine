import { Controller, Get, Query } from '@nestjs/common';
import { Public } from '../common/decorators/auth.decorators';
import { AvailabilityService } from './availability.service';
import { AvailabilityQueryDto } from './dto/availability.dto';

@Controller('availability')
export class AvailabilityController {
  constructor(private readonly availability: AvailabilityService) {}

  @Public()
  @Get()
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
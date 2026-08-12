import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Public, Roles } from '../common/decorators/auth.decorators';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ParseCuidPipe } from '../common/pipes/parse-cuid.pipe';
import { PoliciesService } from './policies.service';

@Controller('policies')
export class PoliciesController {
  constructor(private readonly policies: PoliciesService) {}

  @Public()
  @Get('defaults')
  defaults() {
    return { rules: this.policies.getDefaultRules() };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post('global')
  setGlobal(@Body() body: { rules: { hoursBeforeStart: number; refundPct: number }[] }) {
    return this.policies.setGlobal(body.rules);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post('resource/:resourceId')
  setForResource(
    @Param('resourceId', ParseCuidPipe) resourceId: string,
    @Body() body: { rules: { hoursBeforeStart: number; refundPct: number }[] },
  ) {
    return this.policies.setForResource(resourceId, body.rules);
  }
}
import { ApiProperty } from '@nestjs/swagger';

export class ErrorResponseDto {
  @ApiProperty({ example: 400 })
  statusCode!: number;

  @ApiProperty({ example: 'Bad Request' })
  error!: string;

  @ApiProperty({ example: 'Validation failed', oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }] })
  message!: string | string[];

  @ApiProperty({ example: '/api/bookings' })
  path!: string;

  @ApiProperty({ example: '2026-08-12T13:00:00.000Z' })
  timestamp!: string;
}

export class HealthResponseDto {
  @ApiProperty({ example: 'ok' })
  status!: string;

  @ApiProperty({ example: 'up' })
  db!: string;

  @ApiProperty({ example: '2026-08-12T13:00:00.000Z' })
  timestamp!: string;
}
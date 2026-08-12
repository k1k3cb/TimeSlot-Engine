import { BadRequestException, Injectable, type PipeTransform } from '@nestjs/common';

const CUID_RX = /^c[a-z0-9]{20,32}$/i;
const SLUG_RX = /^[a-z0-9][a-z0-9-]{1,100}[a-z0-9]$/i;

@Injectable()
export class ParseCuidPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (typeof value !== 'string' || value.length < 1 || value.length > 120) {
      throw new BadRequestException(`Invalid id: ${value}`);
    }
    if (!CUID_RX.test(value) && !SLUG_RX.test(value)) {
      throw new BadRequestException(`Invalid id: ${value}`);
    }
    return value;
  }
}
import { BadRequestException, Injectable, type PipeTransform } from '@nestjs/common';

const CUID_RX = /^c[a-z0-9]{20,32}$/i;

@Injectable()
export class ParseCuidPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (typeof value !== 'string' || !CUID_RX.test(value)) {
      throw new BadRequestException(`Invalid id: ${value}`);
    }
    return value;
  }
}
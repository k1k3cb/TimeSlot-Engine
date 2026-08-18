import { BadRequestException } from '@nestjs/common';
import { ParseCuidPipe } from './parse-cuid.pipe';

describe('ParseCuidPipe', () => {
  let pipe: ParseCuidPipe;

  beforeEach(() => {
    pipe = new ParseCuidPipe();
  });

  describe('valid CUIDs', () => {
    it('accepts standard CUID (c + 20 alphanumeric)', () => {
      const cuid = 'c' + 'a'.repeat(20);
      expect(pipe.transform(cuid)).toBe(cuid);
    });

    it('accepts CUID with max length (c + 32)', () => {
      const cuid = 'c' + '0'.repeat(32);
      expect(pipe.transform(cuid)).toBe(cuid);
    });

    it('accepts CUID with mixed case', () => {
      const cuid = 'cAbCdEfGhIjKlMnOpQrStU';
      expect(pipe.transform(cuid)).toBe(cuid);
    });
  });

  describe('valid slugs', () => {
    it('accepts simple slug', () => {
      expect(pipe.transform('abc')).toBe('abc');
    });

    it('accepts slug with hyphens', () => {
      expect(pipe.transform('my-court-1')).toBe('my-court-1');
    });

    it('accepts slug with at least 3 chars', () => {
      expect(pipe.transform('abc')).toBe('abc');
    });

    it('accepts slug starting with digit', () => {
      expect(pipe.transform('1abc')).toBe('1abc');
    });
  });

  describe('invalid inputs', () => {
    it('rejects non-string input', () => {
      expect(() => pipe.transform(123 as never)).toThrow(BadRequestException);
    });

    it('rejects empty string', () => {
      expect(() => pipe.transform('')).toThrow(BadRequestException);
    });

    it('rejects string longer than 120 chars', () => {
      expect(() => pipe.transform('a'.repeat(121))).toThrow(BadRequestException);
    });

    it('rejects slug with special chars', () => {
      expect(() => pipe.transform('court@1')).toThrow(BadRequestException);
    });

    it('rejects slug starting with hyphen', () => {
      expect(() => pipe.transform('-abc')).toThrow(BadRequestException);
    });

    it('rejects slug ending with hyphen', () => {
      expect(() => pipe.transform('abc-')).toThrow(BadRequestException);
    });
  });
});

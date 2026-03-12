import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

const LOCALE_CODE_PATTERN = /^[a-z]{2}(?:-[A-Z]{2})?$/;

export class LocaleQueryDto {
  @ApiProperty({
    description: 'Requested locale code. Public APIs do not fall back to another locale when content is unavailable.',
    example: 'en',
    pattern: LOCALE_CODE_PATTERN.source,
  })
  @IsString()
  @Matches(LOCALE_CODE_PATTERN)
  locale!: string;
}

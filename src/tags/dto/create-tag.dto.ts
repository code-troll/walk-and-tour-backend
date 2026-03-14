import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsObject, IsString, Matches, MaxLength } from 'class-validator';

const TAG_KEY_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class CreateTagDto {
  @ApiProperty({
    description: 'Stable tag identifier used across tours and blog posts.',
    example: 'history',
    pattern: TAG_KEY_PATTERN.source,
    maxLength: 100,
  })
  @IsString()
  @Matches(TAG_KEY_PATTERN)
  @MaxLength(100)
  key!: string;

  @ApiProperty({
    description:
      'Localized tag labels keyed by locale code. Every key must reference a registered language and each label can be at most 100 characters long.',
    type: 'object',
    additionalProperties: { type: 'string', maxLength: 100 },
    example: {
      en: 'History',
      es: 'Historia',
    },
  })
  @IsObject()
  @IsNotEmpty()
  labels!: Record<string, string>;
}

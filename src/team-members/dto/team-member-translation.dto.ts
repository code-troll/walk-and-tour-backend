import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

const LOCALE_CODE_PATTERN = /^[a-z]{2}(?:-[A-Z]{2})?$/;

export class CreateTeamMemberTranslationDto {
  @ApiProperty({
    description: 'Locale code for this translation.',
    example: 'en',
    pattern: LOCALE_CODE_PATTERN.source,
  })
  @IsString()
  @Matches(LOCALE_CODE_PATTERN)
  languageCode!: string;

  @ApiProperty({
    description: 'Localized team member name.',
    example: 'Ayelen Salazar',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @ApiProperty({
    description: 'Localized team member role or title.',
    example: 'Founder & Director',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  role!: string;

  @ApiPropertyOptional({
    description: 'Localized alt text for the team member photo.',
    example: 'Photo of Ayelen Salazar',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  imageAlt?: string;
}

export class UpdateTeamMemberTranslationDto {
  @ApiPropertyOptional({
    description: 'Updated localized team member name.',
    example: 'Ayelen Salazar',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({
    description: 'Updated localized team member role or title.',
    example: 'Founder & Director',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  role?: string;

  @ApiPropertyOptional({
    description: 'Updated localized alt text for the team member photo. Set `null` to clear it.',
    example: 'Photo of Ayelen Salazar',
    maxLength: 255,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  imageAlt?: string | null;
}

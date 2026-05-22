import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, IsUrl, MaxLength, Min } from 'class-validator';

export class UpdateTeamMemberDto {
  @ApiPropertyOptional({
    description: 'Updated team member name.',
    example: 'Ayelen Salazar',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({
    description: 'Updated alt text for the team member photo. Set `null` to clear it.',
    example: 'Photo of Ayelen Salazar',
    maxLength: 255,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  imageAlt?: string | null;

  @ApiPropertyOptional({
    description: 'Updated display order index.',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  orderIndex?: number;

  @ApiPropertyOptional({
    description: 'LinkedIn profile URL. Set `null` to clear it.',
    example: 'https://linkedin.com/in/example',
    maxLength: 500,
    nullable: true,
  })
  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  linkedinUrl?: string | null;

  @ApiPropertyOptional({
    description: 'Whether the team member is publicly visible.',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}

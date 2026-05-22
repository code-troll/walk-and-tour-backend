import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsUrl, MaxLength, Min } from 'class-validator';

export class CreateTeamMemberDto {
  @ApiPropertyOptional({
    description: 'Display order index. Auto-calculated as next available if omitted.',
    example: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  orderIndex?: number;

  @ApiPropertyOptional({
    description: 'LinkedIn profile URL.',
    example: 'https://linkedin.com/in/example',
    maxLength: 500,
  })
  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  linkedinUrl?: string;

  @ApiPropertyOptional({
    description: 'Whether the team member is publicly visible. Defaults to false.',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}

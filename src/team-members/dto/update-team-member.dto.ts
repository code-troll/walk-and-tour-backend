import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsUrl, MaxLength, Min } from 'class-validator';

export class UpdateTeamMemberDto {
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

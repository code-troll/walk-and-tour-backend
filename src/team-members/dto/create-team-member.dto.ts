import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, IsUrl, IsUUID, MaxLength, Min } from 'class-validator';

export class CreateTeamMemberDto {
  @ApiProperty({
    description: 'Team member name.',
    example: 'Ayelen Salazar',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @ApiProperty({
    description: 'Media asset UUID to attach as the team member photo.',
    format: 'uuid',
  })
  @IsUUID()
  mediaId!: string;

  @ApiPropertyOptional({
    description: 'Alt text for the team member photo.',
    example: 'Photo of Ayelen Salazar',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  imageAlt?: string;

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

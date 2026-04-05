import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class AdminListProposalsDto {
  @ApiPropertyOptional({
    description: 'Search by recipient name or email (case-insensitive partial match).',
    example: 'john',
  })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({
    description:
      'Include expired proposals in the results. When false (default), proposals with status "expired" or past expires_at are excluded.',
    example: 'true',
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === '1')
  includeExpired?: boolean;
}

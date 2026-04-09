import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

import {
  PROPOSAL_ACCEPTANCE_STATUSES,
  PROPOSAL_PUBLICATION_STATUSES,
} from '../../shared/domain/proposal.enums';

export class UpdateProposalDto {
  @ApiPropertyOptional({
    description: 'General name of the proposal (used as its display name in the frontend).',
    example: 'Rome Highlights Private Tour',
    maxLength: 255,
  })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: 'Language code for the proposal content.',
    example: 'en',
    maxLength: 10,
  })
  @IsString()
  @MaxLength(10)
  @IsOptional()
  language?: string;

  @ApiPropertyOptional({
    description: 'Name of the proposal recipient.',
    example: 'John Doe',
    maxLength: 255,
  })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  recipientName?: string;

  @ApiPropertyOptional({
    description: 'Email of the proposal recipient.',
    example: 'john@example.com',
    maxLength: 255,
  })
  @IsEmail()
  @MaxLength(255)
  @IsOptional()
  recipientEmail?: string;

  @ApiPropertyOptional({
    description: 'Acceptance status.',
    enum: PROPOSAL_ACCEPTANCE_STATUSES,
    example: 'pending',
  })
  @IsString()
  @IsIn(PROPOSAL_ACCEPTANCE_STATUSES)
  @IsOptional()
  acceptanceStatus?: string;

  @ApiPropertyOptional({
    description: 'Publication status.',
    enum: PROPOSAL_PUBLICATION_STATUSES,
    example: 'published',
  })
  @IsString()
  @IsIn(PROPOSAL_PUBLICATION_STATUSES)
  @IsOptional()
  publicationStatus?: string;

  @ApiPropertyOptional({
    description: 'Expiration date and time for the proposal (ISO 8601). Pass null to remove.',
    example: '2026-05-01T23:59:59.000Z',
  })
  @IsDateString()
  @IsOptional()
  expiresAt?: string | null;

  @ApiPropertyOptional({
    description: 'Internal admin notes about this proposal.',
  })
  @IsString()
  @IsOptional()
  notes?: string;
}

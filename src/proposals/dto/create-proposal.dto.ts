import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  IsNotEmpty,
  IsDateString,
} from 'class-validator';

export class CreateProposalDto {
  @ApiPropertyOptional({
    description: 'General name of the proposal (used as its display name in the frontend).',
    example: 'Rome Highlights Private Tour',
    maxLength: 255,
  })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  name?: string;

  @ApiProperty({
    description: 'Language code for the proposal content.',
    example: 'en',
    maxLength: 10,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  language!: string;

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
    description: 'Expiration date and time for the proposal (ISO 8601).',
    example: '2026-05-01T23:59:59.000Z',
  })
  @IsDateString()
  @IsOptional()
  expiresAt?: string;

  @ApiPropertyOptional({
    description: 'Internal admin notes about this proposal.',
  })
  @IsString()
  @IsOptional()
  notes?: string;
}

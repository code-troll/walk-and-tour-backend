import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

import { ProposalPointDto } from './create-proposal-version.dto';

export class UpdateProposalVersionDto {
  @ApiPropertyOptional({
    description: 'Display order for the version tab.',
    example: 0,
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  orderIndex?: number;

  @ApiPropertyOptional({
    description: 'Tour date (ISO date string).',
    example: '2026-05-15',
  })
  @IsString()
  @IsOptional()
  tourDate?: string;

  @ApiPropertyOptional({
    description: 'Tour duration in minutes.',
    example: 180,
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  durationMinutes?: number;

  @ApiPropertyOptional({
    description: 'Title of this proposal version.',
    example: 'Classic Walking Tour',
    maxLength: 255,
  })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ description: 'General description of the proposal version.' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Itinerary description for this version.' })
  @IsString()
  @IsOptional()
  itineraryDescription?: string;

  @ApiPropertyOptional({
    description: 'Price amount for this version.',
    example: 150,
    minimum: 0,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  priceAmount?: number;

  @ApiPropertyOptional({
    description: 'Currency code for the price.',
    example: 'EUR',
    maxLength: 10,
  })
  @IsString()
  @MaxLength(10)
  @IsOptional()
  priceCurrency?: string;

  @ApiPropertyOptional({
    description: 'List of items included in this version.',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  included?: string[];

  @ApiPropertyOptional({
    description: 'List of items not included in this version.',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  notIncluded?: string[];

  @ApiPropertyOptional({ description: 'Cancellation policy text.' })
  @IsString()
  @IsOptional()
  cancellationPolicy?: string;

  @ApiPropertyOptional({
    description: 'Tour start point.',
    type: () => ProposalPointDto,
  })
  @ValidateNested()
  @Type(() => ProposalPointDto)
  @IsOptional()
  startPoint?: ProposalPointDto;

  @ApiPropertyOptional({
    description: 'Tour end point.',
    type: () => ProposalPointDto,
  })
  @ValidateNested()
  @Type(() => ProposalPointDto)
  @IsOptional()
  endPoint?: ProposalPointDto;

  @ApiPropertyOptional({
    description: 'External Stripe Payment Link URL. Pass null to remove.',
    example: 'https://buy.stripe.com/test_abc123',
    maxLength: 500,
  })
  @IsUrl()
  @MaxLength(500)
  @IsOptional()
  stripePaymentLink?: string | null;
}

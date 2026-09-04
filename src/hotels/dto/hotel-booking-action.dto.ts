import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * The body of a status action. It carries a reason and nothing else — never a
 * target status. Which status an action leads to is decided by the transition
 * table, so a caller cannot name one.
 */
export class HotelBookingActionDto {
  @ApiPropertyOptional({
    type: String,
    description: 'Why the booking was cancelled, kept on the audit trail.',
    example: 'The guest changed their plans.',
    nullable: true,
  })
  @IsString()
  @MaxLength(1000)
  @IsOptional()
  reason?: string;
}

import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsISO8601, Min } from 'class-validator';

/** Query for listing team members available for a specific occurrence window. */
export class AvailableMembersQueryDto {
  @ApiProperty({
    description: 'Occurrence start datetime (UTC) to check availability against.',
    type: String,
    format: 'date-time',
    example: '2026-07-01T10:00:00.000Z',
  })
  @IsISO8601()
  date!: string;

  @ApiProperty({
    description: 'Duration of the occurrence in minutes.',
    example: 90,
    minimum: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  durationMinutes!: number;
}

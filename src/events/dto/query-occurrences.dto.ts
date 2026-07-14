import { ApiProperty } from '@nestjs/swagger';
import { IsISO8601 } from 'class-validator';

export class QueryOccurrencesDto {
  @ApiProperty({
    description: 'Start of the window (inclusive) to expand candidate dates from.',
    type: String,
    format: 'date-time',
  })
  @IsISO8601()
  from!: string;

  @ApiProperty({
    description: 'End of the window (inclusive) to expand candidate dates to.',
    type: String,
    format: 'date-time',
  })
  @IsISO8601()
  to!: string;
}

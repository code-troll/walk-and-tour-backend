import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

const TOKEN_PATTERN = /^[a-f0-9]{48}$/;

export class NewsletterTokenQueryDto {
  @ApiProperty({
    description: 'Opaque token delivered through confirmation or unsubscribe links.',
    example: '0123456789abcdef0123456789abcdef0123456789abcdef',
    pattern: TOKEN_PATTERN.source,
  })
  @IsString()
  @Matches(TOKEN_PATTERN)
  token!: string;
}

import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class SetBlogPostHeroMediaDto {
  @ApiProperty({
    description: 'Media asset UUID to attach as the blog hero media.',
    format: 'uuid',
  })
  @IsUUID()
  mediaId!: string;
}

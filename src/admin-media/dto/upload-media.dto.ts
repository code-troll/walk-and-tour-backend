import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

const FOLDER_PATTERN = /^(?:[a-z0-9]+(?:-[a-z0-9]+)*)(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*$/;

export class UploadMediaDto {
  @ApiPropertyOptional({
    description:
      'Optional logical folder used as the storage path prefix. The backend still generates the filename.',
    example: 'tours/historic-center',
    pattern: FOLDER_PATTERN.source,
    maxLength: 150,
  })
  @IsString()
  @Matches(FOLDER_PATTERN)
  @MaxLength(150)
  @IsOptional()
  folder?: string;
}

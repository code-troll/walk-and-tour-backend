import { IsNotEmpty, IsObject, IsString, Matches, MaxLength } from 'class-validator';

const TAG_KEY_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class CreateTagDto {
  @IsString()
  @Matches(TAG_KEY_PATTERN)
  @MaxLength(100)
  key!: string;

  @IsObject()
  @IsNotEmpty()
  labels!: Record<string, string>;
}

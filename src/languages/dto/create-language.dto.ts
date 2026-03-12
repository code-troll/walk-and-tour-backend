import { IsBoolean, IsInt, IsOptional, IsString, Matches, MaxLength, Min } from 'class-validator';

const LOCALE_CODE_PATTERN = /^[a-z]{2}(?:-[A-Z]{2})?$/;

export class CreateLanguageDto {
  @IsString()
  @Matches(LOCALE_CODE_PATTERN)
  code!: string;

  @IsString()
  @MaxLength(100)
  name!: string;

  @IsBoolean()
  @IsOptional()
  isEnabled?: boolean;

  @IsInt()
  @Min(0)
  sortOrder!: number;
}

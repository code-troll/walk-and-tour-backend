import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpdateLanguageDto {
  @IsString()
  @MaxLength(100)
  @IsOptional()
  name?: string;

  @IsBoolean()
  @IsOptional()
  isEnabled?: boolean;

  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;
}

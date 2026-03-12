import { IsNotEmpty, IsObject, IsOptional } from 'class-validator';

export class UpdateTagDto {
  @IsObject()
  @IsNotEmpty()
  @IsOptional()
  labels?: Record<string, string>;
}

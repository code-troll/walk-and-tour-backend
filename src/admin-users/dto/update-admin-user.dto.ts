import { IsEmail, IsIn, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

import { ADMIN_ROLES, ADMIN_USER_STATUSES } from '../../shared/domain';

const AUTH0_SUBJECT_PATTERN = /^[^\\s]+$/;

export class UpdateAdminUserDto {
  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsIn(ADMIN_ROLES)
  @IsOptional()
  roleName?: string;

  @IsString()
  @Matches(AUTH0_SUBJECT_PATTERN)
  @MaxLength(255)
  @IsOptional()
  auth0UserId?: string | null;

  @IsString()
  @IsIn(ADMIN_USER_STATUSES)
  @IsOptional()
  status?: string;
}

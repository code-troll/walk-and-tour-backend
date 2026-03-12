import { IsEmail, IsIn, IsOptional, IsString, MaxLength, Matches } from 'class-validator';

import { ADMIN_ROLES, ADMIN_USER_STATUSES } from '../../shared/domain';

const AUTH0_SUBJECT_PATTERN = /^[^\\s]+$/;

export class CreateAdminUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsIn(ADMIN_ROLES)
  roleName!: string;

  @IsString()
  @Matches(AUTH0_SUBJECT_PATTERN)
  @MaxLength(255)
  @IsOptional()
  auth0UserId?: string;

  @IsString()
  @IsIn(ADMIN_USER_STATUSES)
  @IsOptional()
  status?: string;
}

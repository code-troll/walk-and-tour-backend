import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsIn, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

import { ADMIN_ROLES, ADMIN_USER_STATUSES } from '../../shared/domain';

const AUTH0_SUBJECT_PATTERN = /^[^\\s]+$/;

export class UpdateAdminUserDto {
  @ApiPropertyOptional({
    description: 'Updated email address for the admin user.',
    example: 'admin@example.com',
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({
    description: 'Updated role assignment.',
    enum: ADMIN_ROLES,
    example: 'marketing',
  })
  @IsString()
  @IsIn(ADMIN_ROLES)
  @IsOptional()
  roleName?: string;

  @ApiPropertyOptional({
    description: 'Updated Auth0 subject. Set `null` to unlink the current identity.',
    example: 'auth0|abc123',
    nullable: true,
    maxLength: 255,
  })
  @IsString()
  @Matches(AUTH0_SUBJECT_PATTERN)
  @MaxLength(255)
  @IsOptional()
  auth0UserId?: string | null;

  @ApiPropertyOptional({
    description: 'Updated lifecycle status.',
    enum: ADMIN_USER_STATUSES,
    example: 'disabled',
  })
  @IsString()
  @IsIn(ADMIN_USER_STATUSES)
  @IsOptional()
  status?: string;
}

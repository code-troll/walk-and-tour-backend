import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsIn, IsOptional, IsString, MaxLength, Matches } from 'class-validator';

import { ADMIN_ROLES, ADMIN_USER_STATUSES } from '../../shared/domain';

const AUTH0_SUBJECT_PATTERN = /^[^\\s]+$/;

export class CreateAdminUserDto {
  @ApiProperty({
    description: 'Email address used to identify the local admin user.',
    example: 'admin@example.com',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    description: 'Role assigned to the new admin user.',
    enum: ADMIN_ROLES,
    example: 'editor',
  })
  @IsString()
  @IsIn(ADMIN_ROLES)
  roleName!: string;

  @ApiPropertyOptional({
    description: 'Optional Auth0 subject to pre-bind to the local admin user.',
    example: 'auth0|abc123',
    maxLength: 255,
  })
  @IsString()
  @Matches(AUTH0_SUBJECT_PATTERN)
  @MaxLength(255)
  @IsOptional()
  auth0UserId?: string;

  @ApiPropertyOptional({
    description: 'Initial lifecycle status. Defaults to `invited` when omitted.',
    enum: ADMIN_USER_STATUSES,
    example: 'invited',
    default: 'invited',
  })
  @IsString()
  @IsIn(ADMIN_USER_STATUSES)
  @IsOptional()
  status?: string;
}

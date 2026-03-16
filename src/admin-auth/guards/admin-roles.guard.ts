import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { AdminRequest } from '../admin-request.interface';
import { ADMIN_ROLES_KEY } from '../decorators/admin-roles.decorator';

@Injectable()
export class AdminRolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ADMIN_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AdminRequest>();
    const admin = request.admin;

    if (!admin) {
      throw new ForbiddenException('Authenticated admin context is missing.');
    }

    console.log(JSON.stringify(admin, null, 2), JSON.stringify(requiredRoles, null, 2));

    if (!requiredRoles.includes(admin.roleName)) {
      throw new ForbiddenException('Admin role is not allowed to perform this operation.');
    }

    return true;
  }
}

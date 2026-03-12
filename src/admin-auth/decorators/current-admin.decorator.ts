import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import { AuthenticatedAdmin } from '../authenticated-admin.interface';
import { AdminRequest } from '../admin-request.interface';

export const CurrentAdmin = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedAdmin => {
    const request = context.switchToHttp().getRequest<AdminRequest>();

    return request.admin as AuthenticatedAdmin;
  },
);

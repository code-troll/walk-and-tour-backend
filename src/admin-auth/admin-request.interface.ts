import { AuthenticatedAdmin } from './authenticated-admin.interface';

export interface AdminRequest {
  headers: {
    authorization?: string;
    [key: string]: string | string[] | undefined;
  };
  admin?: AuthenticatedAdmin;
}

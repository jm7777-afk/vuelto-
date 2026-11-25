export interface AuthUser {
  id: string;
  tenantId: string | null;
  roleId: 'SUPER_ADMIN' | 'ADMIN' | 'VENDEDOR' | 'CONSULTA';
  username: string;
  fullName: string;
}

declare global {
  namespace Express {
    interface Request {
      tenantId?: string;
      user?: AuthUser;
      rawBody?: Buffer;
    }
  }
}

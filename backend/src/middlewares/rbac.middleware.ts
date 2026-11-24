import { Request, Response, NextFunction } from 'express';

export type RoleId = 'SUPER_ADMIN' | 'ADMIN' | 'VENDEDOR' | 'CONSULTA';

/**
 * Middleware de Control de Acceso Basado en Roles (RBAC)
 */
export const requireRoles = (...allowedRoles: RoleId[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        code: 'UNAUTHORIZED',
        message: 'Usuario no autenticado',
      });
      return;
    }

    // SUPER_ADMIN tiene bypass a todos los roles
    if (req.user.roleId === 'SUPER_ADMIN' || allowedRoles.includes(req.user.roleId)) {
      next();
      return;
    }

    res.status(403).json({
      code: 'FORBIDDEN',
      message: 'No posee los permisos requeridos para ejecutar esta acción.',
      requiredRoles: allowedRoles,
      userRole: req.user.roleId,
    });
  };
};

/**
 * Middleware para Modo Administrador (Web Admin y Modo Administrador Móvil)
 */
export const requireAdmin = requireRoles('ADMIN', 'SUPER_ADMIN');

/**
 * Middleware para rol que puede facturar / POS
 */
export const requireCashierOrAdmin = requireRoles('VENDEDOR', 'ADMIN', 'SUPER_ADMIN');

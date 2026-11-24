import { Request, Response, NextFunction } from 'express';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const statusCode = err.statusCode || (err.name === 'UnauthorizedError' ? 401 : 500);
  const code = err.code || 'INTERNAL_SERVER_ERROR';
  const message = err.message || 'Ha ocurrido un error inesperado en el servidor.';

  // Log estructurado
  console.error(JSON.stringify({
    timestamp: new Date().toISOString(),
    tenantId: req.tenantId || null,
    userId: req.user?.id || null,
    path: req.path,
    method: req.method,
    statusCode,
    code,
    error: err.stack || err.message,
  }));

  res.status(statusCode).json({
    code,
    message,
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
  });
};

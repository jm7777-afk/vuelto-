import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { CashSessionService } from '../services/cash-session.service.js';

const openSchema = z
  .object({
    openingBalanceUsd: z.number().min(0).default(0),
    openingBalanceBs: z.number().min(0).default(0),
    warehouseId: z.string().uuid().optional(),
    notes: z.string().max(300).optional(),
  })
  .strict();

const closeSchema = z
  .object({
    closingDeclaredUsd: z.number().min(0),
    closingDeclaredBs: z.number().min(0).optional(),
    notes: z.string().max(300).optional(),
  })
  .strict();

export class CashSessionController {
  static async getCurrent(req: Request, res: Response, next: NextFunction) {
    try {
      const current = await CashSessionService.getCurrent(req.tenantId!, req.user!.id);
      res.json({ session: current });
    } catch (err) {
      next(err);
    }
  }

  static async open(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = openSchema.safeParse(req.body || {});
      if (!parsed.success) {
        res.status(400).json({ code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message });
        return;
      }

      const session = await CashSessionService.open(req.tenantId!, req.user!.id, parsed.data);
      res.status(201).json({ message: 'Caja abierta exitosamente', session });
    } catch (err: any) {
      if (err?.message === 'CASH_SESSION_ALREADY_OPEN') {
        res.status(409).json({ code: 'CASH_SESSION_ALREADY_OPEN', message: 'Ya existe una caja abierta para este usuario.' });
        return;
      }
      next(err);
    }
  }

  static async close(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = closeSchema.safeParse(req.body || {});
      if (!parsed.success) {
        res.status(400).json({ code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message });
        return;
      }

      const session = await CashSessionService.close(req.tenantId!, req.user!.id, parsed.data);
      res.json({ message: 'Cierre de caja registrado exitosamente', session });
    } catch (err: any) {
      if (err?.message === 'NO_OPEN_CASH_SESSION') {
        res.status(404).json({ code: 'NO_OPEN_CASH_SESSION', message: 'No posee una sesión de caja abierta actualmente.' });
        return;
      }
      next(err);
    }
  }

  static async history(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 30;
      const sessions = await CashSessionService.history(req.tenantId!, limit);
      res.json({ sessions });
    } catch (err) {
      next(err);
    }
  }
}


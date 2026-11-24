import { Request, Response, NextFunction } from 'express';
import { VoucherService } from '../services/voucher.service.js';

export class VoucherController {
  static async getByCode(req: Request, res: Response, next: NextFunction) {
    try {
      const code = String(req.params.code);
      const voucher = await VoucherService.getByCode(req.tenantId!, code);
      if (!voucher) {
        res.status(404).json({ code: 'VOUCHER_NOT_FOUND', message: 'Vale de cambio no encontrado' });
        return;
      }
      res.json(voucher);
    } catch (err) {
      next(err);
    }
  }

  static async redeem(req: Request, res: Response, next: NextFunction) {
    try {
      const { voucher_code, sale_id } = req.body;
      const voucher = await VoucherService.redeem(req.tenantId!, req.user!.id, voucher_code, sale_id);
      res.json(voucher);
    } catch (err) {
      next(err);
    }
  }
}

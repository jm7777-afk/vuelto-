import { db } from '../db/index.js';
import { auditLogs } from '../db/schema.js';

export interface CreateAuditEntry {
  tenantId: string;
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  payload?: any;
  result: 'SUCCESS' | 'FAILED' | 'VALIDATION_ERROR' | 'PRINTER_UNAVAILABLE' | 'SHARE_CANCELLED' | 'SHARE_ERROR';
  channel: 'POS_MOBILE' | 'MOBILE_ADMIN' | 'WEB_ADMIN' | 'SYSTEM_JOB';
  ipAddress?: string | null;
  userAgent?: string | null;
}

export class AuditService {
  /**
   * Registra una acción de auditoría inmutable en PostgreSQL.
   * La tabla rechaza cualquier comando UPDATE o DELETE mediante triggers de BD.
   */
  static async log(entry: CreateAuditEntry): Promise<void> {
    try {
      await db.insert(auditLogs).values({
        tenantId: entry.tenantId,
        userId: entry.userId || null,
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId || null,
        payload: entry.payload ? entry.payload : null,
        result: entry.result,
        channel: entry.channel,
        ipAddress: entry.ipAddress || null,
        userAgent: entry.userAgent || null,
      });
    } catch (error) {
      // El log de auditoría nunca debe quebrar la operación de negocio si la BD está saturada,
      // pero debe registrarse en la salida de error estructurada.
      console.error('Error registrando auditoría en DB:', error);
    }
  }
}

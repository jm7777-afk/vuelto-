import { eq, and, sql } from 'drizzle-orm';
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

  /**
   * Consulta el registro de auditoría inmutable con paginación y filtros.
   * Si tenantId es null o undefined (Súper Administrador), consulta transversalmente.
   */
  static async listLogs(
    tenantId?: string | null,
    options: { page?: number; limit?: number; action?: string; channel?: string } = {}
  ) {
    const page = options.page || 1;
    const limit = options.limit || 50;
    const offset = (page - 1) * limit;

    const conditions: any[] = [];
    if (tenantId) {
      conditions.push(eq(auditLogs.tenantId, tenantId));
    }
    if (options.action) {
      conditions.push(eq(auditLogs.action, options.action));
    }
    if (options.channel) {
      conditions.push(eq(auditLogs.channel, options.channel as any));
    }

    const query = db
      .select()
      .from(auditLogs);

    const rows = conditions.length > 0
      ? await query.where(and(...conditions)).orderBy(sql`${auditLogs.createdAt} DESC`).limit(limit).offset(offset)
      : await query.orderBy(sql`${auditLogs.createdAt} DESC`).limit(limit).offset(offset);

    return {
      page,
      limit,
      logs: rows,
    };
  }
}

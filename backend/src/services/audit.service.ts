import { eq, and, desc, sql, ilike, or } from 'drizzle-orm';
import { auditLogs, users, tenants } from '../db/schema.js';
import { withTenant, withSuperAdmin } from '../db/tenantDb.js';
import { MonitoringService } from './monitoring.service.js';

export interface CreateAuditEntry {
  tenantId?: string | null;
  userId?: string | null;
  action: string;
  entity: string;
  entityType?: string | null;
  entityId?: string | null;
  payload?: any;
  oldValues?: any;
  newValues?: any;
  result:
    | 'SUCCESS'
    | 'FAILED'
    | 'REJECTED'
    | 'VALIDATION_ERROR'
    | 'PRINTER_UNAVAILABLE'
    | 'SHARE_CANCELLED'
    | 'SHARE_ERROR';
  channel: 'POS_MOBILE' | 'MOBILE_ADMIN' | 'WEB_ADMIN' | 'SYSTEM_JOB' | 'API';
  ipAddress?: string | null;
  userAgent?: string | null;
}

const isValidUuid = (id?: string | null): boolean =>
  typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

export class AuditService {
  /**
   * Registra una acción de auditoría inmutable en PostgreSQL y la transmite al monitor en tiempo real.
   * La tabla soporta tenantId nullable para eventos globales de Súper Admin y plataforma.
   */
  static async log(entry: CreateAuditEntry, tx?: any): Promise<void> {
    // Si se pasó un tenantId explícito no vacío pero inválido (ej. mock), evitar error de tipo UUID en PG
    if (entry.tenantId !== undefined && entry.tenantId !== null && entry.tenantId !== '' && !isValidUuid(entry.tenantId)) {
      return;
    }

    const safeTenantId = entry.tenantId && isValidUuid(entry.tenantId) ? entry.tenantId : null;
    const safeUserId = isValidUuid(entry.userId) ? entry.userId : null;

    // Emitir evento en tiempo real hacia el monitor del Súper Admin
    MonitoringService.recordEvent({
      level: entry.result === 'SUCCESS' ? 'INFO' : entry.result === 'REJECTED' || entry.result === 'FAILED' ? 'ERROR' : 'WARN',
      category: entry.entityType === 'security' ? 'SECURITY' : 'AUDIT',
      message: `${entry.action} en ${entry.entity}${entry.entityId ? ` (${entry.entityId})` : ''} [${entry.result}]`,
      tenantId: safeTenantId,
      userId: safeUserId,
      action: entry.action,
      entity: entry.entity,
      result: entry.result,
      channel: entry.channel,
      ipAddress: entry.ipAddress || null,
      metadata: entry.payload,
    });

    const insertRow = async (executor: any) => {
      try {
        await executor.insert(auditLogs).values({
          tenantId: safeTenantId,
          userId: safeUserId,
          action: entry.action,
          entity: entry.entity,
          entityType: entry.entityType || null,
          entityId: entry.entityId || null,
          payload: entry.payload ? entry.payload : null,
          oldValues: entry.oldValues ? entry.oldValues : null,
          newValues: entry.newValues ? entry.newValues : null,
          result: entry.result,
          channel: entry.channel,
          ipAddress: entry.ipAddress || null,
          userAgent: entry.userAgent || null,
        });
      } catch (error: any) {
        if (error?.code === '23503' && entry.userId) {
          try {
            await executor.insert(auditLogs).values({
              tenantId: safeTenantId,
              userId: null,
              action: entry.action,
              entity: entry.entity,
              entityType: entry.entityType || null,
              entityId: entry.entityId || null,
              payload: entry.payload ? entry.payload : null,
              result: entry.result,
              channel: entry.channel,
              ipAddress: entry.ipAddress || null,
              userAgent: entry.userAgent || null,
            });
            return;
          } catch {}
        }
        throw error;
      }
    };

    try {
      if (tx) {
        await insertRow(tx);
      } else if (safeTenantId) {
        await withTenant(safeTenantId, (scopedTx) => insertRow(scopedTx));
      } else {
        await withSuperAdmin((adminTx) => insertRow(adminTx));
      }
    } catch (error: any) {
      console.error('Error registrando auditoría en DB:', error);
    }
  }

  /**
   * Consulta el registro de auditoría inmutable con paginación, filtros y datos enriquecidos de usuario/tenant.
   * Si tenantId es null o undefined (Súper Administrador), consulta transversalmente toda la plataforma.
   */
  static async listLogs(
    tenantId?: string | null,
    options: { page?: number; limit?: number; action?: string; channel?: string; result?: string; search?: string } = {}
  ) {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(200, Math.max(1, options.limit || 50));
    const offset = (page - 1) * limit;

    const conditions: any[] = [];
    if (tenantId) {
      conditions.push(eq(auditLogs.tenantId, tenantId));
    }
    if (options.action) {
      conditions.push(eq(auditLogs.action, options.action));
    }
    if (options.channel) {
      conditions.push(eq(auditLogs.channel, options.channel));
    }
    if (options.result) {
      conditions.push(eq(auditLogs.result, options.result));
    }
    if (options.search && options.search.trim()) {
      const pattern = `%${options.search.trim()}%`;
      conditions.push(
        or(
          ilike(auditLogs.action, pattern),
          ilike(auditLogs.entity, pattern),
          ilike(auditLogs.entityId, pattern),
          ilike(users.username, pattern),
          ilike(tenants.businessName, pattern)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const queryRunner = async (scopedTx: any) => {
      const rows = await scopedTx
        .select({
          id: auditLogs.id,
          tenantId: auditLogs.tenantId,
          tenantName: tenants.businessName,
          tenantSlug: tenants.slug,
          userId: auditLogs.userId,
          username: users.username,
          userFullName: users.fullName,
          userRoleId: users.roleId,
          action: auditLogs.action,
          entity: auditLogs.entity,
          entityType: auditLogs.entityType,
          entityId: auditLogs.entityId,
          payload: auditLogs.payload,
          result: auditLogs.result,
          channel: auditLogs.channel,
          ipAddress: auditLogs.ipAddress,
          userAgent: auditLogs.userAgent,
          createdAt: auditLogs.createdAt,
        })
        .from(auditLogs)
        .leftJoin(users, eq(auditLogs.userId, users.id))
        .leftJoin(tenants, eq(auditLogs.tenantId, tenants.id))
        .where(whereClause)
        .orderBy(desc(auditLogs.createdAt))
        .limit(limit)
        .offset(offset);

      const [totalRow] = await scopedTx
        .select({ count: sql<number>`count(*)::int` })
        .from(auditLogs)
        .leftJoin(users, eq(auditLogs.userId, users.id))
        .leftJoin(tenants, eq(auditLogs.tenantId, tenants.id))
        .where(whereClause);

      return {
        page,
        limit,
        total: totalRow?.count || 0,
        logs: rows,
      };
    };

    if (tenantId) {
      return withTenant(tenantId, queryRunner);
    }
    return withSuperAdmin(queryRunner);
  }
}

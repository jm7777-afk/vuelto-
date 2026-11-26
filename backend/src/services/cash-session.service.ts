import { eq, and, desc, gte, sql } from 'drizzle-orm';
import { withTenant } from '../db/tenantDb.js';
import { cashSessions, payments, sales, warehouses } from '../db/schema.js';
import { AuditService } from './audit.service.js';

export class CashSessionService {
  /**
   * Obtiene el turno de caja abierto actual para el cajero/usuario y calcula ingresos acumulados reales.
   */
  static async getCurrent(tenantId: string, userId: string) {
    return await withTenant(tenantId, async (tx) => {
      const [session] = await tx
        .select()
        .from(cashSessions)
        .where(
          and(
            eq(cashSessions.tenantId, tenantId),
            eq(cashSessions.userId, userId),
            eq(cashSessions.status, 'OPEN')
          )
        )
        .orderBy(desc(cashSessions.openedAt))
        .limit(1);

      if (!session) return null;

      const [salesAgg] = await tx
        .select({
          count: sql<number>`count(*)::int`,
          totalUsd: sql<string>`coalesce(sum(${sales.totalAmountUsd}), 0)::text`,
          totalBs: sql<string>`coalesce(sum(${sales.totalAmountBs}), 0)::text`,
        })
        .from(sales)
        .where(
          and(
            eq(sales.tenantId, tenantId),
            eq(sales.userId, userId),
            gte(sales.createdAt, session.openedAt),
            eq(sales.status, 'COMPLETED')
          )
        );

      const paymentsByMethod = await tx
        .select({
          paymentMethod: payments.paymentMethod,
          totalUsd: sql<string>`coalesce(sum(${payments.amountInUsd}), 0)::text`,
          totalBs: sql<string>`coalesce(sum(${payments.amountInBs}), 0)::text`,
        })
        .from(payments)
        .innerJoin(sales, eq(payments.saleId, sales.id))
        .where(
          and(
            eq(payments.tenantId, tenantId),
            eq(sales.userId, userId),
            gte(sales.createdAt, session.openedAt),
            eq(sales.status, 'COMPLETED')
          )
        )
        .groupBy(payments.paymentMethod);

      const openingUsd = parseFloat(session.openingBalanceUsd);
      const openingBs = parseFloat(session.openingBalanceBs);
      const salesTotalUsd = parseFloat(salesAgg?.totalUsd || '0');
      const salesTotalBs = parseFloat(salesAgg?.totalBs || '0');

      return {
        ...session,
        liveMetrics: {
          salesCount: salesAgg?.count || 0,
          salesTotalUsd: salesTotalUsd.toFixed(2),
          salesTotalBs: salesTotalBs.toFixed(2),
          expectedTotalUsd: (openingUsd + salesTotalUsd).toFixed(2),
          expectedTotalBs: (openingBs + salesTotalBs).toFixed(2),
          byMethod: paymentsByMethod,
        },
      };
    });
  }

  /**
   * Apertura formal de caja con fondo inicial USD/Bs bajo bloqueo y auditoría.
   */
  static async open(
    tenantId: string,
    userId: string,
    data: { openingBalanceUsd?: number; openingBalanceBs?: number; warehouseId?: string; notes?: string }
  ) {
    return await withTenant(tenantId, async (tx) => {
      const [existingOpen] = await tx
        .select()
        .from(cashSessions)
        .where(
          and(
            eq(cashSessions.tenantId, tenantId),
            eq(cashSessions.userId, userId),
            eq(cashSessions.status, 'OPEN')
          )
        )
        .for('update')
        .limit(1);

      if (existingOpen) {
        throw new Error('CASH_SESSION_ALREADY_OPEN');
      }

      let whId = data.warehouseId || null;
      if (!whId) {
        const [defaultWh] = await tx
          .select({ id: warehouses.id })
          .from(warehouses)
          .where(and(eq(warehouses.tenantId, tenantId), eq(warehouses.isActive, true)))
          .limit(1);
        whId = defaultWh?.id || null;
      }

      const [created] = await tx
        .insert(cashSessions)
        .values({
          tenantId,
          userId,
          warehouseId: whId,
          status: 'OPEN',
          openingBalanceUsd: (data.openingBalanceUsd ?? 0).toFixed(2),
          openingBalanceBs: (data.openingBalanceBs ?? 0).toFixed(2),
          notes: data.notes?.trim() || null,
          openedAt: new Date(),
        })
        .returning();

      await AuditService.log({
        tenantId,
        userId,
        action: 'CASH_SESSION_OPENED',
        entity: 'cash_session',
        entityId: created.id,
        payload: {
          openingBalanceUsd: created.openingBalanceUsd,
          openingBalanceBs: created.openingBalanceBs,
        },
        result: 'SUCCESS',
        channel: 'POS_MOBILE',
      }, tx);

      return created;
    });
  }

  /**
   * Cierre formal y arqueo de caja (calcula esperado vs declarado y registra discrepancias).
   */
  static async close(
    tenantId: string,
    userId: string,
    data: { closingDeclaredUsd: number; closingDeclaredBs?: number; notes?: string }
  ) {
    return await withTenant(tenantId, async (tx) => {
      const [session] = await tx
        .select()
        .from(cashSessions)
        .where(
          and(
            eq(cashSessions.tenantId, tenantId),
            eq(cashSessions.userId, userId),
            eq(cashSessions.status, 'OPEN')
          )
        )
        .for('update')
        .limit(1);

      if (!session) {
        throw new Error('NO_OPEN_CASH_SESSION');
      }

      const [salesAgg] = await tx
        .select({
          count: sql<number>`count(*)::int`,
          totalUsd: sql<string>`coalesce(sum(${sales.totalAmountUsd}), 0)::text`,
          totalBs: sql<string>`coalesce(sum(${sales.totalAmountBs}), 0)::text`,
        })
        .from(sales)
        .where(
          and(
            eq(sales.tenantId, tenantId),
            eq(sales.userId, userId),
            gte(sales.createdAt, session.openedAt),
            eq(sales.status, 'COMPLETED')
          )
        );

      const expectedUsd = +(parseFloat(session.openingBalanceUsd) + parseFloat(salesAgg?.totalUsd || '0')).toFixed(2);
      const expectedBs = +(parseFloat(session.openingBalanceBs) + parseFloat(salesAgg?.totalBs || '0')).toFixed(2);
      const declaredUsd = +data.closingDeclaredUsd.toFixed(2);
      const declaredBs = +(data.closingDeclaredBs ?? expectedBs).toFixed(2);
      const discrepancyUsd = +(declaredUsd - expectedUsd).toFixed(2);

      const [closed] = await tx
        .update(cashSessions)
        .set({
          status: 'CLOSED',
          closingExpectedUsd: expectedUsd.toFixed(2),
          closingExpectedBs: expectedBs.toFixed(2),
          closingDeclaredUsd: declaredUsd.toFixed(2),
          closingDeclaredBs: declaredBs.toFixed(2),
          discrepancyUsd: discrepancyUsd.toFixed(2),
          salesCount: salesAgg?.count || 0,
          notes: data.notes?.trim() || session.notes,
          closedAt: new Date(),
        })
        .where(eq(cashSessions.id, session.id))
        .returning();

      await AuditService.log({
        tenantId,
        userId,
        action: 'CASH_SESSION_CLOSED',
        entity: 'cash_session',
        entityId: closed.id,
        payload: {
          expectedUsd: closed.closingExpectedUsd,
          declaredUsd: closed.closingDeclaredUsd,
          discrepancyUsd: closed.discrepancyUsd,
          salesCount: closed.salesCount,
        },
        result: 'SUCCESS',
        channel: 'POS_MOBILE',
      }, tx);

      return closed;
    });
  }

  static async history(tenantId: string, limit = 30) {
    return await withTenant(tenantId, (tx) =>
      tx
        .select()
        .from(cashSessions)
        .where(eq(cashSessions.tenantId, tenantId))
        .orderBy(desc(cashSessions.openedAt))
        .limit(Math.min(100, Math.max(1, limit)))
    );
  }
}


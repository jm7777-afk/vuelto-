import { eq, and, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { suppliers, customerContacts, contactInteractions } from '../db/schema.js';
import { VenezuelaUtils } from '../utils/venezuela.js';
import { AuditService } from './audit.service.js';

export class SupplierService {
  static async create(
    tenantId: string,
    userId: string,
    data: {
      documentType: 'J' | 'G' | 'V' | 'E';
      documentNumber: string;
      name: string;
      phone: string;
      email?: string;
      address?: string;
    }
  ) {
    const cleanDoc = data.documentNumber.replace(/[^0-9]/g, '');
    const cleanPhone = VenezuelaUtils.normalizePhone(data.phone);

    const [supplier] = await db
      .insert(suppliers)
      .values({
        tenantId,
        documentType: data.documentType,
        documentNumber: cleanDoc,
        name: data.name.trim(),
        phone: cleanPhone,
        email: data.email,
        address: data.address,
        isActive: true,
      })
      .returning();

    await AuditService.log({
      tenantId,
      userId,
      action: 'SUPPLIER_CREATE',
      entity: 'supplier',
      entityId: supplier.id,
      payload: { documentType: data.documentType, documentNumber: cleanDoc },
      result: 'SUCCESS',
      channel: 'WEB_ADMIN',
    });

    return supplier;
  }

  static async list(tenantId: string) {
    return db
      .select()
      .from(suppliers)
      .where(eq(suppliers.tenantId, tenantId))
      .orderBy(suppliers.name);
  }

  static async getById(tenantId: string, id: string) {
    const [supplier] = await db
      .select()
      .from(suppliers)
      .where(and(eq(suppliers.tenantId, tenantId), eq(suppliers.id, id)));
    return supplier || null;
  }

  static async addContact(
    tenantId: string,
    supplierId: string,
    data: { name: string; phone?: string; email?: string; roleTitle?: string; notes?: string }
  ) {
    const [contact] = await db
      .insert(customerContacts)
      .values({
        tenantId,
        supplierId,
        name: data.name,
        phone: data.phone,
        email: data.email,
        roleTitle: data.roleTitle,
        notes: data.notes,
      })
      .returning();
    return contact;
  }

  static async addInteraction(
    tenantId: string,
    supplierId: string,
    userId: string,
    data: {
      channel: 'LLAMADA' | 'VISITA' | 'NOTA' | 'WHATSAPP' | 'EMAIL';
      summary: string;
      result: string;
      nextFollowupAt?: string;
    }
  ) {
    const [interaction] = await db
      .insert(contactInteractions)
      .values({
        tenantId,
        supplierId,
        userId,
        channel: data.channel,
        summary: data.summary,
        result: data.result,
        nextFollowupAt: data.nextFollowupAt ? new Date(data.nextFollowupAt) : null,
      })
      .returning();
    return interaction;
  }

  static async getInteractions(tenantId: string, supplierId: string) {
    return db
      .select()
      .from(contactInteractions)
      .where(and(eq(contactInteractions.tenantId, tenantId), eq(contactInteractions.supplierId, supplierId)))
      .orderBy(sql`${contactInteractions.createdAt} DESC`);
  }

  static async update(
    tenantId: string,
    id: string,
    data: {
      name?: string;
      phone?: string;
      email?: string;
      address?: string;
      isActive?: boolean;
    }
  ) {
    const updateData: any = { updatedAt: new Date() };
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.phone !== undefined) updateData.phone = VenezuelaUtils.normalizePhone(data.phone);
    if (data.email !== undefined) updateData.email = data.email;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const [updated] = await db
      .update(suppliers)
      .set(updateData)
      .where(and(eq(suppliers.tenantId, tenantId), eq(suppliers.id, id)))
      .returning();

    if (updated) {
      await AuditService.log({
        tenantId,
        action: 'SUPPLIER_UPDATED',
        entity: 'supplier',
        entityId: id,
        payload: updateData,
        result: 'SUCCESS',
        channel: 'WEB_ADMIN',
      });
    }
    return updated || null;
  }

  static async delete(tenantId: string, id: string) {
    const [deleted] = await db
      .update(suppliers)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(suppliers.tenantId, tenantId), eq(suppliers.id, id)))
      .returning();

    if (deleted) {
      await AuditService.log({
        tenantId,
        action: 'SUPPLIER_DELETED',
        entity: 'supplier',
        entityId: id,
        payload: { name: deleted.name },
        result: 'SUCCESS',
        channel: 'WEB_ADMIN',
      });
    }
    return deleted || null;
  }
}

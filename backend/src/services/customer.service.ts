import { eq, and, or, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { customers, customerContacts, contactInteractions } from '../db/schema.js';
import { VenezuelaUtils } from '../utils/venezuela.js';
import { AuditService } from './audit.service.js';

export class CustomerService {
  /**
   * Búsqueda previa obligatoria antes de registrar un cliente rápido en POS
   * Evita duplicados en mostrador.
   */
  static async lookup(tenantId: string, params: { documentNumber?: string; documentType?: string; phone?: string }) {
    const conditions = [eq(customers.tenantId, tenantId)];

    if (params.documentNumber) {
      const cleanNum = params.documentNumber.replace(/[^0-9]/g, '');
      if (params.documentType) {
        conditions.push(
          and(
            eq(customers.documentType, params.documentType.toUpperCase()),
            eq(customers.documentNumber, cleanNum)
          )!
        );
      } else {
        conditions.push(eq(customers.documentNumber, cleanNum));
      }
    } else if (params.phone) {
      const normalizedPhone = VenezuelaUtils.normalizePhone(params.phone);
      conditions.push(eq(customers.phone, normalizedPhone));
    } else {
      return { found: false, customer: null };
    }

    const [foundCustomer] = await db
      .select()
      .from(customers)
      .where(and(...conditions))
      .limit(1);

    return {
      found: !!foundCustomer,
      customer: foundCustomer || null,
    };
  }

  /**
   * Registro Rápido desde Móvil (Bottom Sheet en Pantalla de Venta)
   * Valida RIF Módulo 11 sin bloquear la venta.
   */
  static async quickCreate(
    tenantId: string,
    userId: string,
    data: {
      documentType: 'V' | 'E' | 'J' | 'G' | 'P';
      documentNumber: string;
      name: string;
      phone?: string;
    }
  ) {
    const cleanDoc = data.documentNumber.replace(/[^0-9]/g, '');
    const normalizedPhone = data.phone ? VenezuelaUtils.normalizePhone(data.phone) : null;

    // Validación RIF Módulo 11
    const rifValidation = VenezuelaUtils.validateRif(data.documentType, cleanDoc);

    const [newCustomer] = await db
      .insert(customers)
      .values({
        tenantId,
        documentType: data.documentType,
        documentNumber: cleanDoc,
        name: data.name.trim(),
        phone: normalizedPhone,
        creditLimit: '0.00',
        balanceDue: '0.00',
        createdVia: 'POS_QUICK',
        isActive: true,
      })
      .returning();

    // Auditoría de registro rápido de cliente
    await AuditService.log({
      tenantId,
      userId,
      action: 'CUSTOMER_QUICK_CREATE',
      entity: 'customer',
      entityId: newCustomer.id,
      payload: {
        documentType: data.documentType,
        documentNumber: cleanDoc,
        rifValid: rifValidation.isValid,
      },
      result: 'SUCCESS',
      channel: 'POS_MOBILE',
    });

    return newCustomer;
  }

  static async list(tenantId: string) {
    return db
      .select()
      .from(customers)
      .where(eq(customers.tenantId, tenantId))
      .orderBy(customers.name);
  }

  static async getById(tenantId: string, id: string) {
    const [customer] = await db
      .select()
      .from(customers)
      .where(and(eq(customers.tenantId, tenantId), eq(customers.id, id)));
    return customer || null;
  }

  static async addContact(
    tenantId: string,
    customerId: string,
    data: { name: string; phone?: string; email?: string; roleTitle?: string; notes?: string }
  ) {
    const [contact] = await db
      .insert(customerContacts)
      .values({
        tenantId,
        customerId,
        name: data.name,
        phone: data.phone,
        email: data.email,
        roleTitle: data.roleTitle,
        notes: data.notes,
      })
      .returning();
    return contact;
  }

  /**
   * Registro de Interacción (Inmutable - No admite UPDATE ni DELETE)
   */
  static async addInteraction(
    tenantId: string,
    customerId: string,
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
        customerId,
        userId,
        channel: data.channel,
        summary: data.summary,
        result: data.result,
        nextFollowupAt: data.nextFollowupAt ? new Date(data.nextFollowupAt) : null,
      })
      .returning();
    return interaction;
  }

  static async getInteractions(tenantId: string, customerId: string) {
    return db
      .select()
      .from(contactInteractions)
      .where(and(eq(contactInteractions.tenantId, tenantId), eq(contactInteractions.customerId, customerId)))
      .orderBy(sql`${contactInteractions.createdAt} DESC`);
  }
}

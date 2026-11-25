import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { db, pool } from '../src/db/index.js';
import { users, tenants, auditLogs, refreshTokens } from '../src/db/schema.js';
import { eq } from 'drizzle-orm';
import { PasswordService } from '../src/utils/password.js';
import { JwtService } from '../src/services/jwt.service.js';
import { TwoFactorService } from '../src/services/two-factor.service.js';

describe('Fase 2: Seguridad Backend, Hardening y Auditoría Inmutable', () => {
  const app = createApp();
  let testTenantId: string;
  let testUserId: string;
  const testUsername = `testuser_${Date.now()}`;
  const testPassword = 'StrongPassword2026!#';

  beforeAll(async () => {
    // Crear tenant de prueba
    const [tenant] = await db
      .insert(tenants)
      .values({
        slug: `tenant-sec-${Date.now()}`,
        businessName: 'Seguridad Test C.A.',
        tradeName: 'Seguridad Test',
        documentType: 'J',
        documentNumber: `${Math.floor(100000000 + Math.random() * 900000000)}`,
        fiscalAddress: 'Caracas, Venezuela',
        phone: '04141234567',
        email: `sec_${Date.now()}@vuelto.app`,
        isSpecialTaxpayer: true,
      })
      .returning();
    testTenantId = tenant.id;

    // Crear usuario con Argon2id
    const argonHash = await PasswordService.hash(testPassword);
    const [user] = await db
      .insert(users)
      .values({
        tenantId: testTenantId,
        roleId: 'ADMIN',
        username: testUsername,
        email: `${testUsername}@vuelto.app`,
        passwordHash: argonHash,
        fullName: 'Usuario Hardening Test',
        phone: '04140001122',
        isActive: true,
      })
      .returning();
    testUserId = user.id;
  });

  afterAll(async () => {
    try {
      await db.delete(refreshTokens).where(eq(refreshTokens.userId, testUserId));
      await db.delete(auditLogs).where(eq(auditLogs.tenantId, testTenantId));
      await db.delete(users).where(eq(users.id, testUserId));
      await db.delete(tenants).where(eq(tenants.id, testTenantId));
    } catch {}
  });

  // 1. Zod .strict() rechaza campos no reconocidos
  it('1. Zod Schemas Estrictos: rechaza campos no reconocidos en body con 400 (.strict())', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        username: testUsername,
        password: testPassword,
        campoInesperadoHacker: 'malicious_payload',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });

  // 2. Autenticación exitosa con Argon2id y emisión de sesión
  it('2. Argon2id & Sesión: login exitoso emite par de tokens y registra auditoría', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        username: testUsername,
        password: testPassword,
      });

    expect(res.status).toBe(200);
    expect(res.body.tokens).toBeDefined();
    expect(res.body.tokens.accessToken).toBeDefined();
    expect(res.body.tokens.refreshToken).toBeDefined();
    expect(res.body.tokens.expiresInSeconds).toBe(900);
    expect(res.body.user.username).toBe(testUsername);

    // Verificar que el log de auditoría se guardó
    const [auditEntry] = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.userId, testUserId))
      .limit(1);

    expect(auditEntry).toBeDefined();
  });

  // 3. Rotación de Refresh Token y Detección de Robo (Theft Detection)
  it('3. Refresh Token Rotation & Detección de Robo: reusar un token revocado revoca toda la familia', async () => {
    // Iniciar sesión para obtener token inicial
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: testUsername, password: testPassword });

    const initialRefreshToken = loginRes.body.tokens.refreshToken;

    // Primer uso legítimo: Rotación exitosa
    const refreshRes1 = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: initialRefreshToken });

    expect(refreshRes1.status).toBe(200);
    expect(refreshRes1.body.tokens.accessToken).toBeDefined();
    expect(refreshRes1.body.tokens.refreshToken).toBeDefined();
    const rotatedRefreshToken = refreshRes1.body.tokens.refreshToken;
    expect(rotatedRefreshToken).not.toBe(initialRefreshToken);

    // Ataque simulado: Un atacante intenta reusar initialRefreshToken (que ya fue rotado/revocado)
    const attackRes = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: initialRefreshToken });

    expect(attackRes.status).toBe(401);
    expect(attackRes.body.error).toBe('TOKEN_REUSE_DETECTED');

    // Comprobación de detección de robo: Ahora el token legítimo rotado también fue revocado
    const legitimateTryRes = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: rotatedRefreshToken });

    expect(legitimateTryRes.status).toBe(401);
  });

  // 4. Bloqueo de Cuenta (Account Lockout tras 5 intentos fallidos)
  it('4. Bloqueo de Cuenta: se bloquea automáticamente tras 5 intentos fallidos en 15 min', async () => {
    // Crear usuario específico para prueba de bloqueo
    const lockoutUsername = `lockout_${Date.now()}`;
    const hash = await PasswordService.hash('CorrectPass123!');
    const [lockoutUser] = await db
      .insert(users)
      .values({
        tenantId: testTenantId,
        roleId: 'VENDEDOR',
        username: lockoutUsername,
        email: `${lockoutUsername}@vuelto.app`,
        passwordHash: hash,
        fullName: 'Usuario Lockout Test',
        isActive: true,
      })
      .returning();

    // Intentos 1 a 4 (desde diferentes IPs para verificar bloqueo a nivel de cuenta/usuario): retornan 401
    for (let i = 1; i <= 4; i++) {
      const failRes = await request(app)
        .post('/api/v1/auth/login')
        .set('x-forwarded-for', `10.0.1.${i}`)
        .send({ username: lockoutUsername, password: 'WrongPassword!' });
      expect(failRes.status).toBe(401);
      expect(failRes.body.remainingAttempts).toBe(5 - i);
    }

    // 5to intento: activa el bloqueo a nivel de usuario y responde 423
    const fifthRes = await request(app)
      .post('/api/v1/auth/login')
      .set('x-forwarded-for', '10.0.1.5')
      .send({ username: lockoutUsername, password: 'WrongPassword!' });

    expect(fifthRes.status).toBe(423);
    expect(fifthRes.body.error).toBe('ACCOUNT_LOCKED');

    // 6to intento desde otra IP distinta: la cuenta sigue bloqueada para el usuario
    const sixthRes = await request(app)
      .post('/api/v1/auth/login')
      .set('x-forwarded-for', '10.0.1.6')
      .send({ username: lockoutUsername, password: 'CorrectPass123!' });

    expect(sixthRes.status).toBe(423);
    expect(sixthRes.body.error).toBe('ACCOUNT_LOCKED');

    // Limpieza
    await db.delete(users).where(eq(users.id, lockoutUser.id));
  });

  // 5. Autenticación 2FA TOTP con AES-256-GCM
  it('5. 2FA TOTP: genera secreto, encripta con AES-256-GCM y valida token', async () => {
    const { secret, encryptedSecret, qrCodeDataUrl } = await TwoFactorService.generateSecret('test@vuelto.app');
    expect(secret).toBeDefined();
    expect(encryptedSecret).toContain(':'); // Formato iv:authTag:cipher
    expect(qrCodeDataUrl).toMatch(/^data:image\/png;base64,/);

    const decrypted = TwoFactorService.decryptSecret(encryptedSecret);
    expect(decrypted).toBe(secret);
  });

  // 6. Auditoría Inmutable GET /api/v1/audit y aislamiento por rol
  it('6. Auditoría Inmutable: GET /api/v1/audit accesible por ADMIN con aislamiento por tenant', async () => {
    const adminToken = JwtService.generateTokenPair({
      id: testUserId,
      tenantId: testTenantId,
      roleId: 'ADMIN',
      username: testUsername,
      fullName: 'Admin Test',
    }).accessToken;

    const res = await request(app)
      .get('/api/v1/audit')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.logs)).toBe(true);

    // Todos los logs devueltos pertenecen estrictamente al tenant del admin
    for (const log of res.body.logs) {
      expect(log.tenantId).toBe(testTenantId);
    }

    // La tabla rechaza endpoints destructivos (inmutable)
    const deleteRes = await request(app)
      .delete('/api/v1/audit')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(deleteRes.status).toBe(404);
  });

  // 7. Rate Limiter de Login: el 6to intento en 1 minuto es bloqueado con 429
  it('7. Rate Limiting de Login: bloquea con 429 al superar 5 peticiones por minuto por IP', async () => {
    // Usamos una ruta o agente para probar los límites
    const agent = request(app);
    const ipSpoofHeader = { 'x-forwarded-for': '198.51.100.42' };

    let reached429 = false;
    for (let i = 0; i < 7; i++) {
      const res = await agent
        .post('/api/v1/auth/login')
        .set(ipSpoofHeader)
        .send({ username: 'nonexistent_rate_test', password: 'any' });

      if (res.status === 429) {
        reached429 = true;
        expect(res.body.error).toBe('TOO_MANY_REQUESTS');
        break;
      }
    }

    expect(reached429).toBe(true);
  });
});

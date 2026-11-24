import { describe, it, expect } from 'vitest';
import { JwtService } from '../src/services/jwt.service.js';
import { AuthUser } from '../src/types/express.js';

describe('JwtService', () => {
  const mockUser: AuthUser = {
    id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    tenantId: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b22',
    roleId: 'ADMIN',
    username: 'admin_test',
    fullName: 'Administrador de Prueba',
  };

  it('debe generar un par de tokens (access + refresh) con tenant_id', () => {
    const pair = JwtService.generateTokenPair(mockUser);
    expect(pair.accessToken).toBeDefined();
    expect(pair.refreshToken).toBeDefined();
    expect(pair.expiresInSeconds).toBe(900);
  });

  it('debe verificar exitosamente el access token y extraer el tenant_id inmutable', () => {
    const pair = JwtService.generateTokenPair(mockUser);
    const verified = JwtService.verifyAccessToken(pair.accessToken);

    expect(verified.id).toBe(mockUser.id);
    expect(verified.tenantId).toBe(mockUser.tenantId);
    expect(verified.roleId).toBe('ADMIN');
    expect(verified.username).toBe(mockUser.username);
  });

  it('debe verificar y validar el refresh token', () => {
    const pair = JwtService.generateTokenPair(mockUser);
    const verifiedRefresh = JwtService.verifyRefreshToken(pair.refreshToken);

    expect(verifiedRefresh.userId).toBe(mockUser.id);
    expect(verifiedRefresh.tenantId).toBe(mockUser.tenantId);
  });

  it('debe rechazar un token alterado o con firma inválida', () => {
    const pair = JwtService.generateTokenPair(mockUser);
    const tampered = pair.accessToken + 'corrupted';

    expect(() => JwtService.verifyAccessToken(tampered)).toThrow();
  });
});

import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

describe('Fase 6: OpenAPI / Swagger UI (/api/docs)', () => {
  const app = createApp();

  it('1. GET /api/docs.json devuelve especificación OpenAPI 3.0 válida', async () => {
    const res = await request(app).get('/api/docs.json');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.body.openapi).toBe('3.0.3');
    expect(res.body.info.title).toContain('Vuelto API');
    expect(res.body.components.securitySchemes.BearerAuth).toBeDefined();
    expect(res.body.paths['/auth/login']).toBeDefined();
    expect(res.body.paths['/products/by-barcode/{barcode}']).toBeDefined();
    expect(res.body.paths['/sales']).toBeDefined();
    expect(res.body.paths['/sync/offline-batch']).toBeDefined();
    expect(res.body.paths['/reports/purchases-book/csv']).toBeDefined();
  });

  it('2. GET /api/docs/ sirve Swagger UI HTML', async () => {
    const res = await request(app).get('/api/docs/');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/html/);
    expect(res.text).toContain('swagger-ui');
  });
});

# Guía de Contribución al Proyecto Vuelto

Agradecemos el interés en colaborar en el desarrollo de **Vuelto**, la plataforma de facturación e inventario para comercios venezolanos.

---

## 1. Principios de Desarrollo

- **TypeScript Estricto**: Todo el código debe compilar sin errores en modo strict (`noImplicitAny`, comprobación de nulos).
- **Aislamiento Multi-Tenant**: Ninguna consulta a la base de datos debe saltarse el filtro de `tenantId` ni la sesión contextual `withTenant`.
- **Bimoneda Consistente**: Todo cálculo monetario debe mantener consistencia simultánea en USD y Bolívares (VES) según la tasa oficial congelada en la transacción.
- **Idempotencia**: Cualquier mutación sensible (pagos, ventas, sincronizaciones) debe soportar claves de idempotencia.

---

## 2. Flujo de Trabajo y Ramas

1. Crear una rama descriptiva a partir de `main`:
   ```bash
   git checkout -b feature/nombre-de-la-mejora
   ```
2. Realizar cambios atómicos y estructurados.
3. Usar la convención de [Conventional Commits](https://www.conventionalcommits.org/):
   - `feat(...)`: Nueva característica.
   - `fix(...)`: Corrección de errores.
   - `docs(...)`: Cambios en la documentación.
   - `test(...)`: Añadir o modificar pruebas.
   - `refactor(...)`: Cambios de código sin modificar comportamiento externo.

---

## 3. Pruebas y Validación Local

Antes de enviar cualquier cambio, verifique que todas las comprobaciones y pruebas automatizadas pasen exitosamente:

```bash
# Backend: Typecheck y Pruebas Unitarias / Integración
cd backend
npm run build
npm test

# Web: Typecheck y Build
cd ../web
npm run build
```

---

## 4. Reporte de Vulnerabilidades de Seguridad

Por favor, **no reporte vulnerabilidades de seguridad en issues públicos**. Siga el protocolo establecido en `SECURITY.md` contactando directamente al equipo de seguridad en `seguridad@vuelto.app`.

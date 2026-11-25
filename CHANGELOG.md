# Registro de Cambios — Vuelto (Changelog)

Todas las versiones y fases de desarrollo del proyecto Vuelto se documentan a continuación según la convención de [Keep a Changelog](https://keepachangelog.com/).

---

## [1.0.0-prod] — 2026-11-25

### Fase 0 — Contención Urgente y Limpieza de Secretos
- **Eliminación de credenciales en frontend**: Retiro de contraseñas y accesos predeterminados visibles en la interfaz de inicio de sesión.
- **Seed con variables de entorno**: Script de inicialización ahora aborta en entornos de producción si faltan variables obligatorias.
- **Auditoría de seguridad**: Publicación de informe de incidente y directrices de rotación de credenciales en `docs/SECURITY_INCIDENT_2026-11-25.md`.
- **Limpieza de variables en Render**: Generación segura de claves `JWT_SECRET` y desactivación de pasarelas simuladas en producción.

### Fase 1 — Escáner de Código de Barras y Soporte para Balanzas
- **Escáner nativo de cámara**: Integración de componente multimodal con `expo-camera` (SDK 52), respuesta táctil con `expo-haptics` y sonido de escaneo.
- **Decodificador de balanzas**: Soporte para formatos EAN-13 de peso y precio variable (prefijos 20 y 21).
- **Lookup por código de barras**: Endpoint `GET /api/v1/products/by-barcode/:barcode` con validación estricta y protección contra inyecciones.

### Fase 2 — Endurecimiento de Seguridad en Backend
- **Hashing de contraseñas**: Migración a Argon2id y bcrypt con factor de costo 12.
- **Protección contra fuerza bruta**: Bloqueo temporal de cuentas tras 5 intentos fallidos consecutivos.
- **Autenticación en dos pasos (2FA)**: Soporte para TOTP compatible con Google Authenticator y Authy.
- **Rotación de tokens de refresco**: Detección de reutilización de tokens y revocación automática de sesiones comprometidas.
- **Cabeceras HTTP y CORS**: Configuración estricta mediante Helmet (CSP, HSTS) y allowlist para orígenes permitidos.

### Fase 3 — Aislamiento Multi-Tenant Blindado
- **Seguridad a nivel de fila (RLS)**: Activación de políticas obligatorias `tenant_isolation` en PostgreSQL 16 para todas las tablas del sistema.
- **Helper `withTenant`**: Envoltura de contexto de base de datos que garantiza el aislamiento sin posibilidad de fugas de datos entre comercios.
- **Validación con tests**: Pruebas de integración multi-tenant que confirman el bloqueo de acceso a datos ajenos.

### Fase 4 — Observabilidad y DevOps
- **Logging estructurado**: Adopción de Pino con formato JSON, timestamps ISO y censura de datos sensibles (PII).
- **Trazabilidad de peticiones**: Inyección de encabezado `X-Request-Id` y propagación de identificador de correlación en logs y respuestas.
- **Métricas Prometheus**: Recolección de métricas clave (`http_request_duration_seconds`, `sales_total`, `alerts_low_stock_total`).
- **Sondas de salud**: Implementación de endpoints `/health/live`, `/health/ready` y `/health/deep`.
- **Integración continua**: Flujo automatizado de GitHub Actions para linting, typechecking y ejecución de pruebas.

### Fase 5 — Fiscalidad SENIAT, Concurrencia y Sincronización Offline
- **Correlativos consecutivos estrictos**: Uso de bloqueos transaccionales pesimistas (`pg_advisory_xact_lock`) para prevenir saltos y duplicados.
- **Tasas dinámicas en caliente**: Tablas para configuración de IVA e IGTF con invalidación de caché en memoria.
- **Sincronización fuera de línea**: Endpoint `/api/v1/sync/offline-batch` con detección de duplicados e identificación de déficits de inventario.
- **Notas de crédito y débito**: Emisión de comprobantes de ajuste con anulación de factura original y reintegro automático de stock.
- **Libro de compras SENIAT**: Exportación en formato CSV con BOM UTF-8 y columnas oficiales según la Providencia Administrativa 0071.

### Fase 6 — Calidad, Documentación y Experiencia de Desarrollo
- **Documentación OpenAPI 3.0**: Interfaz interactiva de Swagger UI servida en `/api/docs` y especificación en `/api/docs.json`.
- **Paquete de tipos compartidos**: Paquete `@vuelto/shared` con modelos y tipos de dominio bimonetarios comunes.
- **Guías de hardware y API**: Documentación detallada para impresoras térmicas ESC/POS y consumo de la API REST.

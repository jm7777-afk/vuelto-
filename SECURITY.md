# Política de Seguridad - Vuelto

En el equipo de **Vuelto**, la seguridad de los datos de nuestros comercios afiliados, información fiscal y transacciones financieras es una prioridad fundamental.

---

## 1. Versiones Soportadas

Actualmente brindamos soporte de seguridad y parches inmediatos para las siguientes versiones:

| Versión | Soportada | Estado de Mantenimiento |
|---|---|---|
| `1.x.x` (Rama `main`) | ✅ Sí | Versión activa de desarrollo y producción |
| `< 1.0.0` | ❌ No | Deprecada |

---

## 2. Canal de Reporte de Vulnerabilidades

Si detectas una posible vulnerabilidad de seguridad, fuga de credenciales o falla de autorización multi-tenant en el código o despliegue de Vuelto, **por favor no abras un issue público en GitHub**.

Envía un reporte detallado a nuestro equipo de seguridad:
- **Correo electrónico:** [security@vuelto.app](mailto:security@vuelto.app)
- **Asunto sugerido:** `[REPORTE DE SEGURIDAD] Descripción breve de la vulnerabilidad`

Por favor incluye en tu reporte:
1. Descripción detallada del hallazgo y severidad estimada.
2. Pasos claros para reproducir el problema (Proof of Concept, capturas o peticiones HTTP de muestra).
3. Componentes o endpoints afectados (`/backend`, `/web`, `/mobile`).
4. Cualquier sugerencia o propuesta de mitigación si dispones de ella.

---

## 3. SLA de Respuesta y Compromiso

- **Reconocimiento inicial:** Dentro de las **72 horas** posteriores a la recepción del reporte.
- **Evaluación y triage:** Máximo **5 días hábiles**.
- **Liberación de parche y mitigación:** Prioridad inmediata (P0 para fugas de datos o cross-tenant; P1 para elevación de privilegios).

---

## 4. Alcance (Scope)

El alcance de nuestra política de seguridad cubre:
- **Backend API REST**: Control de acceso multi-tenant por fila, middleware de autenticación JWT/Argon2, validación de esquemas Zod, endpoints fiscales y de pagos.
- **Frontend Web SPA**: Protección contra ataques XSS, sanitización de entradas, ausencia de credenciales pre-cargadas en producción.
- **App Móvil (React Native)**: Almacenamiento seguro de tokens y escaneo de códigos de barra sin inyección de comandos.

---

Agradecemos a la comunidad de desarrolladores e investigadores por su colaboración responsable en la protección del ecosistema comercial de Vuelto.

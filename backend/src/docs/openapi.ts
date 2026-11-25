export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Vuelto API — Sistema Multi-Tenant de Facturación y POS (Venezuela)',
    version: '1.0.0',
    description: `API RESTful bimonetaria (USD / VES) de alta concurrencia y tolerancia a fallos para comercios en Venezuela.
Características principales:
- **Aislamiento Multi-Tenant**: RLS (Row-Level Security) en PostgreSQL 16 y claim en JWT.
- **Facturación y Correlativos**: Numeración estricta sin saltos ni huecos vía advisory locks de PostgreSQL.
- **Bimoneda Dinámica**: Tasas oficiales BCV, paralelo y sobreescritura auditada.
- **Cumplimiento Tributario SENIAT**: Tasas de IVA dinámicas (16%, 8%, exento), IGTF del 3% en divisas y libro de compras según Providencia Administrativa 0071.
- **Sincronización Offline e Idempotencia**: Detección de duplicados, resolución de déficit de stock y claves de idempotencia.
- **Escáner y Balanzas**: Búsqueda por código de barras EAN-13, SKU y balanzas de peso variable con prefijo 20/21.`,
    contact: {
      name: 'Soporte Técnico Vuelto',
      email: 'seguridad@vuelto.app',
      url: 'https://vuelto.onrender.com',
    },
  },
  servers: [
    {
      url: '/api/v1',
      description: 'API v1 Base URL',
    },
    {
      url: 'https://vuelto.onrender.com/api/v1',
      description: 'Servidor de Producción',
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Token JWT de acceso emitido por POST /auth/login o POST /auth/refresh.',
      },
    },
    schemas: {
      ErrorResponse: {
        type: 'object',
        properties: {
          error: { type: 'string', example: 'VALIDATION_ERROR' },
          message: { type: 'string', example: 'Parámetros inválidos' },
          details: { type: 'object' },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['username', 'password'],
        properties: {
          username: { type: 'string', example: 'cajero1' },
          password: { type: 'string', format: 'password', example: 'SecretP@ss2026' },
          totpCode: { type: 'string', example: '123456', description: 'Código TOTP de 6 dígitos si 2FA está habilitado' },
        },
      },
      LoginResponse: {
        type: 'object',
        properties: {
          accessToken: { type: 'string' },
          refreshToken: { type: 'string' },
          user: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              username: { type: 'string' },
              roleId: { type: 'string', enum: ['SUPERADMIN', 'ADMIN', 'CASHIER'] },
              fullName: { type: 'string' },
              tenantId: { type: 'string', format: 'uuid' },
            },
          },
        },
      },
      Product: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          tenantId: { type: 'string', format: 'uuid' },
          sku: { type: 'string' },
          name: { type: 'string' },
          salePriceUsd: { type: 'string' },
          taxRate: { type: 'string', example: '16.00' },
          isExempt: { type: 'boolean' },
          unitOfMeasure: { type: 'string' },
          stock: { type: 'string' },
        },
      },
      ConfirmSaleInput: {
        type: 'object',
        required: ['customerId', 'exchangeRateId', 'lines', 'payments'],
        properties: {
          customerId: { type: 'string', format: 'uuid' },
          warehouseId: { type: 'string', format: 'uuid' },
          exchangeRateId: { type: 'string', format: 'uuid' },
          clientAssignedUuid: { type: 'string', description: 'UUID generado por POS móvil offline' },
          lines: {
            type: 'array',
            items: {
              type: 'object',
              required: ['productId', 'quantity', 'unitPriceUsd'],
              properties: {
                productId: { type: 'string', format: 'uuid' },
                quantity: { type: 'number', example: 2 },
                unitPriceUsd: { type: 'number', example: 1.50 },
              },
            },
          },
          payments: {
            type: 'array',
            items: {
              type: 'object',
              required: ['paymentMethod', 'currency', 'amount'],
              properties: {
                paymentMethod: {
                  type: 'string',
                  enum: ['CASH_USD', 'CASH_VES', 'PAGO_MOVIL', 'POINT_OF_SALE', 'BIOPAGO', 'TRANSFER', 'VUELTO_WALLET', 'CHANGE_VOUCHER', 'CREDIT_DEBT'],
                },
                currency: { type: 'string', enum: ['USD', 'VES'] },
                amount: { type: 'number', example: 3.48 },
                referenceNumber: { type: 'string' },
              },
            },
          },
        },
      },
    },
  },
  security: [
    {
      BearerAuth: [],
    },
  ],
  paths: {
    '/auth/login': {
      post: {
        tags: ['Autenticación'],
        summary: 'Iniciar sesión y obtener tokens JWT',
        description: 'Autentica credenciales con bcrypt y bloquea temporalmente tras 5 intentos fallidos.',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LoginRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Autenticación exitosa',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/LoginResponse' } },
            },
          },
          '400': { description: 'Credenciales inválidas' },
          '423': { description: 'Cuenta temporalmente bloqueada por intentos fallidos' },
        },
      },
    },
    '/auth/refresh': {
      post: {
        tags: ['Autenticación'],
        summary: 'Renovar access token mediante refresh token con rotación',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['refreshToken'],
                properties: { refreshToken: { type: 'string' } },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Tokens renovados' },
          '401': { description: 'Refresh token inválido, expirado o reusado' },
        },
      },
    },
    '/products': {
      get: {
        tags: ['Productos'],
        summary: 'Listar productos con stock y precios',
        responses: {
          '200': {
            description: 'Catálogo de productos',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Product' },
                },
              },
            },
          },
        },
      },
    },
    '/products/by-barcode/{barcode}': {
      get: {
        tags: ['Productos'],
        summary: 'Buscar producto por código de barras o balanza de peso variable',
        description: 'Decodifica códigos EAN-13 estándar, SKU y prefijos de balanza (20/21) calculando el peso/precio.',
        parameters: [
          {
            name: 'barcode',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Código de barras escaneado (EAN-13, Code-128, etc.)',
          },
        ],
        responses: {
          '200': { description: 'Producto encontrado con detalles de peso si aplica' },
          '404': { description: 'Producto no encontrado' },
        },
      },
    },
    '/sales': {
      post: {
        tags: ['Ventas y POS'],
        summary: 'Registrar y emitir venta / factura fiscal digital',
        description: 'Aplica bloqueo pesimista de correlativo, cálculo automático de IGTF y desglose bimonetario.',
        parameters: [
          {
            name: 'Idempotency-Key',
            in: 'header',
            required: false,
            schema: { type: 'string' },
            description: 'Clave única para garantizar idempotencia en reintentos de red.',
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/ConfirmSaleInput' } },
          },
        },
        responses: {
          '201': { description: 'Venta registrada con correlativo consecutivo y nota digital WhatsApp' },
          '400': { description: 'Stock insuficiente o parámetros incorrectos' },
        },
      },
    },
    '/sales/{id}/receipt': {
      get: {
        tags: ['Ventas y POS'],
        summary: 'Generar comprobante térmico para impresora ESC/POS',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'paperWidth', in: 'query', schema: { type: 'number', enum: [58, 80], default: 80 } },
        ],
        responses: {
          '200': { description: 'Líneas formateadas para comando ESC/POS' },
        },
      },
    },
    '/sales/{id}/credit-note': {
      post: {
        tags: ['Ventas y POS'],
        summary: 'Emitir Nota de Crédito y anular factura',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['reason'],
                properties: {
                  reason: { type: 'string', example: 'Devolución de mercancía por cliente' },
                  returnInventory: { type: 'boolean', default: true },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Nota de crédito creada y factura anulada con reintegro de stock' },
        },
      },
    },
    '/sync/offline-batch': {
      post: {
        tags: ['Sincronización Offline'],
        summary: 'Sincronizar lote de ventas generadas offline',
        description: 'Procesamiento en lote idempotente por clientAssignedUuid con resolución de déficit de inventario.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'array',
                items: { $ref: '#/components/schemas/ConfirmSaleInput' },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Resumen de sincronización (totalReceived, syncedCount, duplicateCount, deficitCount)',
          },
        },
      },
    },
    '/sync/discrepancies': {
      get: {
        tags: ['Sincronización Offline'],
        summary: 'Listar ventas sincronizadas con déficit de stock para auditoría',
        responses: {
          '200': { description: 'Lista de ventas con discrepancia' },
        },
      },
    },
    '/reports/purchases-book/csv': {
      get: {
        tags: ['Fiscalidad SENIAT'],
        summary: 'Descargar Libro de Compras SENIAT en formato CSV',
        description: 'Cumple con Providencia Administrativa 0071 e incluye BOM UTF-8 para apertura directa en Microsoft Excel.',
        parameters: [
          { name: 'year', in: 'query', schema: { type: 'number' } },
          { name: 'month', in: 'query', schema: { type: 'number' } },
        ],
        responses: {
          '200': {
            description: 'Archivo CSV descargable con BOM UTF-8',
            content: { 'text/csv': {} },
          },
        },
      },
    },
    '/admin/fiscal/rates': {
      put: {
        tags: ['Fiscalidad SENIAT'],
        summary: 'Actualizar tasas impositivas del tenant en caliente',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  ivaGeneral: { type: 'number', example: 0.16 },
                  ivaReducido: { type: 'number', example: 0.08 },
                  igtfDivisas: { type: 'number', example: 0.03 },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Tasas actualizadas e invalidación de caché en memoria' },
        },
      },
    },
    '/exchange-rates/manual': {
      put: {
        tags: ['Tasas de Cambio'],
        summary: 'Sobreescribir tasa oficial con justificación obligatoria en auditoría',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['newRate', 'reason'],
                properties: {
                  newRate: { type: 'number', example: 935.50 },
                  reason: { type: 'string', example: 'Fluctuación bancaria vespertina' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Tasa manual fijada y snapshot registrado' },
        },
      },
    },
  },
};

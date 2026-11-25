# Protocolo de QA Físico — Escáner de Cámara y Balanzas EAN-13

Este documento detalla el protocolo de pruebas manuales y validación en hardware físico (Android e iOS con Expo Go / Development Build) para el componente `BarcodeScannerModal` y los flujos de escaneo de POS (Cajero) y Admin (Inventario) en **Vuelto**.

---

## 1. Dispositivos Objetivo

- **Android**: Dispositivo físico con Android 10+ (cámara trasera con autofocus y linterna LED).
- **iOS**: Dispositivo físico iPhone con iOS 16+ (cámara trasera con autofocus y linterna LED).

> [!NOTE]
> En el código fuente, los puntos de interacción con hardware y sensores físicos están marcados con el tag:
> `// TODO(device-verify): Expo camera scanning, audio beep, torch toggle and haptics require physical Android/iOS device validation.`

---

## 2. Códigos de Prueba E2E

Utilice los siguientes códigos reales impresos en etiquetas o desplegados en pantalla secundaria con brillo medio/alto:

| # | Tipo / Formato | Código de Muestra | Producto / Significado Esperado |
|---|----------------|-------------------|----------------------------------|
| 1 | **EAN-13 Estándar (Venezuela 759)** | `7591001001019` | Harina PAN Blanca 1kg. Añade 1 unidad ($1.25). |
| 2 | **Balanza Embebida (Prefijo 21)** | `210142004506` | Queso Blanco Llanero: SKU `0142`, Peso `0.450 kg` (450g), Checksum `6`. Se añade con cantidad `0.450`. |
| 3 | **Code128 Alfanumérico** | `SKU-PROD-001` | SKU industrial / interno. Búsqueda exacta en inventario. |
| 4 | **Código Desconocido (404)** | `7599999888877` | Producto inexistente en el tenant. Pausa escáner y abre modal de **Crear Producto Express**. |
| 5 | **Código Inválido / Checksum Roto** | `7591001001018` | Checksum EAN-13 errado (debe ser `9`, no `8`). Backend responde `400 INVALID_BARCODE`. |

---

## 3. Matriz de Casos de Prueba Manual

### Prueba 1: Gestión de Permisos de Cámara
1. Instalar la app limpia (o borrar datos / revocar permisos de cámara en los Ajustes del SO).
2. Abrir la pantalla de POS o Admin e interactuar con el botón **📷 Cámara** o el botón flotante **FAB**.
3. **Criterio de Aceptación:**
   - La app muestra el diálogo nativo del SO solicitando acceso a la cámara.
   - Si el usuario **Rechaza**: La app muestra pantalla informativa con botón `Abrir Ajustes` (`Linking.openSettings()`) y campo de búsqueda manual alternativo.
   - Si el usuario **Acepta**: El visor de cámara se inicializa a pantalla completa con la retícula verde central y la línea láser animada.

### Prueba 2: Escaneo Continuo en POS (Cajero)
1. Abrir POS en dispositivo físico.
2. Presionar el botón flotante **FAB (📷)** en la esquina inferior derecha.
3. Apuntar sucesivamente a los códigos 1 (`7591001001019`) y 2 (`210142004506`).
4. **Criterio de Aceptación:**
   - Se emite feedback háptico (`Haptics.notificationAsync(Success)` / vibración nativa).
   - Se reproduce el sonido de confirmación (`beep`).
   - La retícula emite un flash visual verde durante 200 ms.
   - El escáner **no se cierra**, permitiendo escanear el siguiente producto de inmediato.
   - El código 2 carga automáticamente la cantidad de `0.450 kg` por ser balanza prefijo 21.

### Prueba 3: Debounce de Lectura (2000 ms)
1. Mantener la cámara fija sobre el código `7591001001019` durante 5 segundos continuos sin mover el celular.
2. **Criterio de Aceptación:**
   - El producto se añade **una sola vez**.
   - No se duplica la lectura ni se incrementa la cantidad en bucle.
   - Si se retira el código y se vuelve a enfocar después de 2 segundos, se añade una segunda unidad correctamente.

### Prueba 4: Entorno de Poca Luz y Linterna (Torch)
1. Llevar el dispositivo a un ambiente con baja iluminación (< 50 lux).
2. Presionar el botón `🔦 ON / OFF` en la esquina superior derecha del modal del escáner.
3. **Criterio de Aceptación:**
   - El LED flash físico trasero del teléfono se enciende instantáneamente.
   - El código se detecta y lee con precisión en menos de 500 ms tras encender la linterna.
   - Al presionar nuevamente, la linterna se apaga. Al cerrar el modal, la linterna se apaga automáticamente.

### Prueba 5: Flujo de Código No Encontrado (404) y Creación Express
1. Escanear el código desconocido `7599999888877`.
2. **Criterio de Aceptación:**
   - La app pausa el escáner y muestra un `Alert`: *"El código no está registrado en el inventario"*.
   - Al seleccionar *"Crear Producto Nuevo"*, se abre el mini-modal con el código `7599999888877` precargado.
   - Rellenar nombre: *"Jugo Naranja 1L"*, precio: `2.50`, stock: `15`, unidad: `L`.
   - Presionar *"✓ Guardar y Cargar"*.
   - El producto se crea en el catálogo del tenant vía API, se guarda en caché local (`ProductCacheService`), y se añade de inmediato al carrito de la venta activa.

### Prueba 6: Escaneo Offline / Modo Avión
1. Activar el **Modo Avión** en el dispositivo móvil (desconectar WiFi y Datos Móviles).
2. Escanear productos previamente sincronizados en el inventario (`Harina PAN`, `Arroz Primor`).
3. **Criterio de Aceptación:**
   - El escáner resuelve el producto directamente desde la memoria caché local (`ProductCacheService`).
   - Se añade al carrito sin error de conexión ni spinner bloqueante.
   - Se muestra mensaje discreto: *"Modo offline: buscando en caché local"*.

### Prueba 7: Inventario Móvil en Admin (Ajuste Rápido y Detección de Duplicados)
1. Cambiar a Modo Administrador y entrar en la pestaña **Stock ($)**.
2. Presionar **📷 Escanear Stock**:
   - Apuntar a `7591001001019`.
   - Se abre el modal de ajuste con el stock actual (ej. 145).
   - Presionar `+5` y *"✓ Confirmar Ajuste"*.
   - El stock se actualiza a 150 con registro de auditoría.
3. Presionar **➕ Nuevo Producto**:
   - Presionar el botón de cámara `📷` junto al campo de código de barras.
   - Si se escanea un código ya existente (`7591001001019`), la app muestra la alerta: *"⚠️ Código Duplicado: ya pertenece a Harina PAN"*.
   - Si se escanea un código nuevo, se autocompleta el campo y el modal se cierra automáticamente (modo single scan).

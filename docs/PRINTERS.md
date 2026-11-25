# Guía de Compatibilidad y Configuración de Impresoras Térmicas ESC/POS

Vuelto soporta impresión térmica directa mediante comandos estándar ESC/POS para emisión de comprobantes, notas de entrega, vales de cambio (vouchers) y apertura de gaveta de dinero.

---

## 1. Modelos y Especificaciones Soportadas

| Formato | Ancho de Caracteres | Columnas | Conectividad | Usos Recomendados |
| :--- | :--- | :--- | :--- | :--- |
| **58mm (2 pulgadas)** | 384 puntos | 32 caracteres | Bluetooth / USB | Terminales POS portátiles, dispositivos Android móviles |
| **80mm (3 pulgadas)** | 576 puntos | 48 caracteres | Red Ethernet / USB / WiFi | Cajas fijas, supermercados, mayoristas |

### Marcas y Modelos Probados
- **Epson**: TM-T20III, TM-T88VI, TM-m30II (Ethernet, Bluetooth, USB).
- **Star Micronics**: TSP143III, SM-L200 (Bluetooth).
- **Xprinter**: XP-58IIH, XP-N160I, XP-80C (USB y Bluetooth).
- **Zijiang / POS-58**: Impresoras portátiles Bluetooth económicas (5802LD, 5805DD).
- **Terminales Todo-en-Uno**: Sunmi V2 / V2 Pro, PAX A920 con impresora térmica integrada.

---

## 2. Secuencias ESC/POS Utilizadas por Vuelto

El backend de Vuelto (`ReceiptService`) genera búferes de bytes crudos con secuencias ESC/POS estándar:

| Acción | Comando Hex | Propósito |
| :--- | :--- | :--- |
| **Inicializar** | `1B 40` (`ESC @`) | Restaura valores predeterminados de la impresora |
| **Alinear Centro** | `1B 61 01` (`ESC a 1`) | Centra encabezados, logotipos y totales |
| **Alinear Izquierda** | `1B 61 00` (`ESC a 0`) | Justifica ítems y descripciones de productos |
| **Negrita Activar/Desactivar** | `1B 45 01` / `1B 45 00` | Resalta totales y RIF de la empresa |
| **Doble Altura** | `1B 21 10` | Título del comercio y número de factura |
| **Apertura de Gaveta** | `1B 70 00 19 FA` (`ESC p 0 25 250`) | Emite pulso eléctrico al solenoide RJ11 (caja registradora) |
| **Corte de Papel (80mm)** | `1D 56 41 00` (`GS V A 0`) | Corte total o parcial automático |

---

## 3. Configuración en la App Móvil (Expo / Android)

1. **Emparejamiento Bluetooth**:
   - Encender la impresora térmica.
   - Ir a los Ajustes de Bluetooth del dispositivo móvil y seleccionar la impresora (PIN común: `0000` o `1234`).
2. **Selección en Vuelto POS**:
   - Abrir **Vuelto App** > **Configuración** > **Hardware**.
   - Seleccionar tipo de conexión: `Bluetooth`.
   - Seleccionar ancho de papel: `58mm` o `80mm`.
   - Activar la casilla **Abrir gaveta de dinero al cobrar** si la gaveta está conectada a la impresora vía RJ11.
3. **Prueba de Impresión**:
   - Presionar **Imprimir Ticket de Prueba** para verificar alineación de columnas y nitidez.

---

## 4. Configuración en POS Web (Navegador Chrome / Edge)

En la versión web para cajas fijas de escritorio:
1. Conectar la impresora por USB o Red local.
2. Instalar el controlador oficial de la impresora con papel configurado en 58mm u 80mm.
3. En el diálogo de impresión del navegador (`Ctrl + P`):
   - **Destino**: Seleccionar la impresora térmica directamente.
   - **Márgenes**: Ninguno (None).
   - **Opciones**: Desmarcar "Encabezados y pies de página".

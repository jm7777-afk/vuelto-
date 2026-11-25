import React, { useState, useRef, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Dimensions,
  Linking,
  Platform,
  Animated,
} from 'react-native';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';

export interface BarcodeScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onScanned: (code: string, format: string) => void;
  continuous?: boolean;      // default true: sigue escaneando
  allowedFormats?: string[]; // default: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'qr', 'itf14']
  title?: string;            // default: "Escanear producto"
}

const DEFAULT_FORMATS: any[] = [
  'ean13',
  'ean8',
  'upc_a',
  'upc_e',
  'code128',
  'code39',
  'qr',
  'itf14',
];

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SCAN_BOX_SIZE = Math.min(SCREEN_WIDTH * 0.75, 280);

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  visible,
  onClose,
  onScanned,
  continuous = true,
  allowedFormats = DEFAULT_FORMATS,
  title = 'Escanear producto',
}) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [isFlashActive, setIsFlashActive] = useState(false);

  // Debounce: ignorar el mismo código escaneado en los últimos 2000 ms
  const lastScannedMap = useRef<Map<string, number>>(new Map());

  // Animación de pulso / scanline
  const scanLineAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scanLineAnim, {
            toValue: SCAN_BOX_SIZE - 4,
            duration: 1800,
            useNativeDriver: true,
          }),
          Animated.timing(scanLineAnim, {
            toValue: 0,
            duration: 1800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      scanLineAnim.setValue(0);
      setTorchEnabled(false);
      setManualCode('');
    }
  }, [visible]);

  const handleBarcodeScanned = (result: BarcodeScanningResult) => {
    const rawData = result.data?.trim();
    if (!rawData) return;

    const now = Date.now();
    const lastScanTime = lastScannedMap.current.get(rawData) || 0;

    // Ignorar si se escaneó hace menos de 2 segundos (debounce)
    if (now - lastScanTime < 2000) {
      return;
    }

    lastScannedMap.current.set(rawData, now);

    // Feedback visual verde 200ms
    setIsFlashActive(true);
    setTimeout(() => {
      setIsFlashActive(false);
    }, 200);

    // Llamar callback
    onScanned(rawData, result.type);

    // Si modo single scan -> cerrar modal
    if (!continuous) {
      onClose();
    }
  };

  const handleManualSubmit = () => {
    const code = manualCode.trim();
    if (code.length >= 3) {
      onScanned(code, 'MANUAL');
      setManualCode('');
      if (!continuous) {
        onClose();
      }
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* ENCABEZADO */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            accessibilityLabel="Cerrar escáner"
          >
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>

          <Text style={styles.headerTitle}>{title}</Text>

          {/* Botón Linterna */}
          <TouchableOpacity
            style={[styles.torchBtn, torchEnabled && styles.torchBtnActive]}
            onPress={() => setTorchEnabled((prev) => !prev)}
            accessibilityLabel="Linterna"
          >
            <Text style={styles.torchBtnText}>{torchEnabled ? '🔦 ON' : '💡 OFF'}</Text>
          </TouchableOpacity>
        </View>

        {/* MANEJO DE PERMISOS */}
        {!permission ? (
          <View style={styles.centerMessageContainer}>
            <Text style={styles.messageText}>Iniciando cámara...</Text>
          </View>
        ) : !permission.granted ? (
          <View style={styles.permissionContainer}>
            <Text style={styles.permissionTitle}>Permiso de Cámara Requerido</Text>
            <Text style={styles.permissionSubtitle}>
              Vuelto necesita acceso a la cámara para escanear códigos de barra en el POS e inventario.
            </Text>

            {permission.canAskAgain ? (
              <TouchableOpacity style={styles.actionBtn} onPress={requestPermission}>
                <Text style={styles.actionBtnText}>Permitir Acceso a la Cámara</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => {
                  if (Platform.OS === 'ios') {
                    Linking.openURL('app-settings:');
                  } else {
                    Linking.openSettings();
                  }
                }}
              >
                <Text style={styles.actionBtnText}>Abrir Ajustes del Teléfono</Text>
              </TouchableOpacity>
            )}

            {/* Fallback de entrada manual */}
            <View style={styles.manualFallbackCard}>
              <Text style={styles.fallbackTitle}>O introduce el código manualmente:</Text>
              <View style={styles.manualInputRow}>
                <TextInput
                  style={styles.manualInput}
                  placeholder="Ej. 7591234567890 o SKU"
                  placeholderTextColor="#64748B"
                  value={manualCode}
                  onChangeText={setManualCode}
                  keyboardType="numeric"
                  onSubmitEditing={handleManualSubmit}
                />
                <TouchableOpacity style={styles.manualSubmitBtn} onPress={handleManualSubmit}>
                  <Text style={styles.manualSubmitBtnText}>Buscar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.cameraWrapper}>
            {/* VISTA DE CÁMARA */}
            <CameraView
              style={StyleSheet.absoluteFillObject}
              facing="back"
              enableTorch={torchEnabled}
              barcodeScannerSettings={{
                barcodeTypes: allowedFormats as any,
              }}
              onBarcodeScanned={handleBarcodeScanned}
            />

            {/* OVERLAY SEMITRANSPARENTE */}
            <View style={styles.overlayTop} />

            <View style={styles.overlayMiddleRow}>
              <View style={styles.overlaySide} />

              {/* RETÍCULA CENTRAL */}
              <View
                style={[
                  styles.scanBox,
                  isFlashActive && styles.scanBoxSuccessFlash,
                ]}
              >
                {/* Esquinas guía visual */}
                <View style={[styles.corner, styles.cornerTL]} />
                <View style={[styles.corner, styles.cornerTR]} />
                <View style={[styles.corner, styles.cornerBL]} />
                <View style={[styles.corner, styles.cornerBR]} />

                {/* Scanline animada */}
                <Animated.View
                  style={[
                    styles.scanLine,
                    {
                      transform: [{ translateY: scanLineAnim }],
                      backgroundColor: isFlashActive ? '#10B981' : '#38BDF8',
                    },
                  ]}
                />
              </View>

              <View style={styles.overlaySide} />
            </View>

            <View style={styles.overlayBottom}>
              <Text style={styles.guideInstructionText}>
                Apunta la cámara al código de barras del producto
              </Text>
              <Text style={styles.formatsBadgeText}>
                EAN-13 • EAN-8 • Balanza (20/21/22) • Code128 • UPC
              </Text>

              {/* BARRA DE ENTRADA MANUAL INLINE */}
              <View style={styles.inlineManualContainer}>
                <TextInput
                  style={styles.inlineManualInput}
                  placeholder="O escribe el código aquí..."
                  placeholderTextColor="#94A3B8"
                  value={manualCode}
                  onChangeText={setManualCode}
                  onSubmitEditing={handleManualSubmit}
                />
                <TouchableOpacity
                  style={styles.inlineManualBtn}
                  onPress={handleManualSubmit}
                >
                  <Text style={styles.inlineManualBtnText}>Cargar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 48 : 20,
    paddingBottom: 14,
    backgroundColor: '#071F27',
    zIndex: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#155E75',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0B3B49',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  torchBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#0B3B49',
    borderWidth: 1,
    borderColor: '#155E75',
  },
  torchBtnActive: {
    backgroundColor: '#F59E0B',
    borderColor: '#F59E0B',
  },
  torchBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  centerMessageContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#071F27',
  },
  messageText: {
    color: '#CBD5E1',
    fontSize: 14,
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: '#071F27',
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  permissionSubtitle: {
    color: '#94A3B8',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
  },
  actionBtn: {
    backgroundColor: '#0284C7',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 24,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  manualFallbackCard: {
    width: '100%',
    backgroundColor: '#0B3B49',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#155E75',
  },
  fallbackTitle: {
    color: '#A3E635',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  manualInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  manualInput: {
    flex: 1,
    backgroundColor: '#062F3B',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#155E75',
    color: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
  },
  manualSubmitBtn: {
    backgroundColor: '#10B981',
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  manualSubmitBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
  cameraWrapper: {
    flex: 1,
  },
  overlayTop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  overlayMiddleRow: {
    flexDirection: 'row',
    height: SCAN_BOX_SIZE,
  },
  overlaySide: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  scanBox: {
    width: SCAN_BOX_SIZE,
    height: SCAN_BOX_SIZE,
    position: 'relative',
    backgroundColor: 'transparent',
    borderColor: '#38BDF8',
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  scanBoxSuccessFlash: {
    borderColor: '#10B981',
    borderWidth: 3,
    backgroundColor: 'rgba(16, 185, 129, 0.25)',
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: '#38BDF8',
  },
  cornerTL: {
    top: -1,
    left: -1,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 10,
  },
  cornerTR: {
    top: -1,
    right: -1,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 10,
  },
  cornerBL: {
    bottom: -1,
    left: -1,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 10,
  },
  cornerBR: {
    bottom: -1,
    right: -1,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 10,
  },
  scanLine: {
    position: 'absolute',
    left: 2,
    right: 2,
    height: 2,
    shadowColor: '#38BDF8',
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 3,
  },
  overlayBottom: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    alignItems: 'center',
    paddingTop: 16,
    paddingHorizontal: 20,
  },
  guideInstructionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  formatsBadgeText: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 4,
    textAlign: 'center',
  },
  inlineManualContainer: {
    flexDirection: 'row',
    marginTop: 18,
    width: '100%',
    maxWidth: 320,
    gap: 8,
  },
  inlineManualInput: {
    flex: 1,
    backgroundColor: '#071F27',
    borderWidth: 1,
    borderColor: '#155E75',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#FFFFFF',
    fontSize: 12,
  },
  inlineManualBtn: {
    backgroundColor: '#0284C7',
    paddingHorizontal: 14,
    borderRadius: 8,
    justifyContent: 'center',
  },
  inlineManualBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
});


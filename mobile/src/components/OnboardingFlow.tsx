import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  SafeAreaView,
  Animated,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as FileSystem from 'expo-file-system';
import { VUELTO_COLORS } from '../theme/colors';

export const ONBOARDING_FILE = `${FileSystem.documentDirectory}vuelto_onboarding.json`;

interface OnboardingFlowProps {
  onComplete: () => void;
  mode?: 'initial' | 'replay';
}

const SLIDES = [
  {
    badge: 'TERMINAL POS BIMONEDA',
    title: 'Bienvenido a Vuelto',
    description: 'Gestiona tus ventas y facturas de forma rápida, sencilla y organizada.',
    visualTitle: 'FACT-A-00142 • Vuelto listo',
    visualSubtitle: 'Escaneo rápido • Múltiples cuentas • Ticket al instante',
    metrics: [
      { label: 'TOTAL', value: '$48.50' },
      { label: 'ESTADO', value: 'ACTIVO' },
      { label: 'IMPRESIÓN', value: 'TICKET OK' },
    ],
  },
  {
    badge: 'ADMINISTRACIÓN & ANALÍTICA',
    title: 'Todo bajo control',
    description: 'Administra tus ventas, caja, pedidos y reportes desde un solo sistema.',
    visualTitle: 'Control Total en Tiempo Real',
    visualSubtitle: 'Apertura/cierre de caja, kardex de inventario y reportes fiscales',
    metrics: [
      { label: 'VENTAS HOY', value: '$1,284' },
      { label: 'CAJA NETA', value: '$940' },
      { label: 'FISCAL', value: 'SENIAT ✓' },
    ],
  },
  {
    badge: 'RESTAURANTES Y NEGOCIOS',
    title: 'Una mejor experiencia',
    description: 'Optimiza tu negocio, agiliza la atención y ofrece un servicio más eficiente a tus clientes.',
    visualTitle: 'Pago & Vuelto Exitoso',
    visualSubtitle: 'Atención en segundos con comprobante digital y monedero de vuelto',
    metrics: [
      { label: 'COBRO', value: '< 15 seg' },
      { label: 'MONEDAS', value: 'USD / Bs' },
      { label: 'WHATSAPP', value: 'PDF LISTO' },
    ],
  },
] as const;

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({
  onComplete,
  mode = 'initial',
}) => {
  const [step, setStep] = useState(0);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const current = SLIDES[step];
  const isLastStep = step === SLIDES.length - 1;

  useEffect(() => {
    slideAnim.setValue(14);
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 240,
      useNativeDriver: true,
    }).start();
  }, [step, slideAnim]);

  const finishOnboarding = async () => {
    if (mode === 'initial') {
      try {
        await FileSystem.writeAsStringAsync(
          ONBOARDING_FILE,
          JSON.stringify({ completed: true, completedAt: new Date().toISOString() })
        );
      } catch {
        // Ignora errores de escritura en almacenamiento
      }
    }
    onComplete();
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <View style={styles.container}>
        <View style={styles.card}>
          {/* Cabecera */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.logoFrame}>
                <Image
                  source={require('../../assets/vuelto-logo.jpg')}
                  style={styles.logoImg}
                  resizeMode="contain"
                />
              </View>
              <View style={styles.stepPill}>
                <Text style={styles.stepPillText}>
                  Paso {step + 1} de {SLIDES.length}
                </Text>
              </View>
            </View>

            {(!isLastStep || mode === 'replay') && (
              <TouchableOpacity onPress={finishOnboarding} style={styles.skipBtn}>
                <Text style={styles.skipBtnText}>{isLastStep ? 'Cerrar' : 'Saltar'}</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Tarjeta visual ilustrativa */}
          <Animated.View style={[styles.stage, { transform: [{ translateY: slideAnim }] }]}>
            <View style={styles.illustrationBox}>
              <View style={styles.mockupWindow}>
                <View style={styles.mockupTopBar}>
                  <View style={styles.dotTurquoise} />
                  <View style={styles.dotTeal} />
                  <Text style={styles.mockupBrand}>vuelto POS</Text>
                </View>

                <Text style={styles.visualTitle}>{current.visualTitle}</Text>
                <Text style={styles.visualSubtitle}>{current.visualSubtitle}</Text>

                <View style={styles.metricsRow}>
                  {current.metrics.map((m) => (
                    <View key={m.label} style={styles.metricTile}>
                      <Text style={styles.metricLabel}>{m.label}</Text>
                      <Text style={styles.metricValue}>{m.value}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>

            <Text style={styles.badge}>{current.badge}</Text>
            <Text style={styles.title}>{current.title}</Text>
            <Text style={styles.description}>{current.description}</Text>
          </Animated.View>

          {/* Indicadores de progreso */}
          <View style={styles.dotsRow}>
            {SLIDES.map((s, idx) => {
              const active = idx === step;
              return (
                <TouchableOpacity
                  key={s.title}
                  onPress={() => setStep(idx)}
                  accessibilityLabel={`Paso ${idx + 1}: ${s.title}`}
                  style={[styles.dot, active && styles.dotActive]}
                />
              );
            })}
          </View>

          {/* Botones de navegación */}
          <View style={styles.footerBtns}>
            {step > 0 && (
              <TouchableOpacity
                style={styles.prevBtn}
                onPress={() => setStep((s) => Math.max(0, s - 1))}
              >
                <Text style={styles.prevBtnText}>← Anterior</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.nextBtn, { flex: 1 }]}
              onPress={() => {
                if (isLastStep) {
                  finishOnboarding();
                } else {
                  setStep((s) => Math.min(SLIDES.length - 1, s + 1));
                }
              }}
            >
              <Text style={styles.nextBtnText}>
                {isLastStep
                  ? mode === 'replay'
                    ? 'Volver al sistema ✓'
                    : '¡Comenzar! ✓'
                  : 'Siguiente →'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: VUELTO_COLORS.night,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 18,
    backgroundColor: VUELTO_COLORS.night,
  },
  card: {
    backgroundColor: VUELTO_COLORS.deep,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: VUELTO_COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoFrame: {
    backgroundColor: '#040C17',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 195, 0.35)',
  },
  logoImg: {
    width: 82,
    height: 26,
  },
  stepPill: {
    backgroundColor: 'rgba(0, 230, 195, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 195, 0.3)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  stepPillText: {
    color: VUELTO_COLORS.turquoise,
    fontSize: 11,
    fontWeight: '700',
  },
  skipBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  skipBtnText: {
    color: VUELTO_COLORS.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  stage: {
    alignItems: 'center',
  },
  illustrationBox: {
    width: '100%',
    backgroundColor: VUELTO_COLORS.night,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 195, 0.18)',
    marginBottom: 20,
  },
  mockupWindow: {
    backgroundColor: VUELTO_COLORS.deep,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(167, 184, 204, 0.2)',
  },
  mockupTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  dotTurquoise: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: VUELTO_COLORS.turquoise,
  },
  dotTeal: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: VUELTO_COLORS.teal,
    opacity: 0.6,
  },
  mockupBrand: {
    color: VUELTO_COLORS.white,
    fontSize: 11,
    fontWeight: '800',
    marginLeft: 4,
  },
  visualTitle: {
    color: VUELTO_COLORS.turquoise,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
  },
  visualSubtitle: {
    color: VUELTO_COLORS.muted,
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 12,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  metricTile: {
    flex: 1,
    backgroundColor: VUELTO_COLORS.night,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 195, 0.22)',
    alignItems: 'center',
  },
  metricLabel: {
    color: VUELTO_COLORS.muted,
    fontSize: 9,
    fontWeight: '700',
  },
  metricValue: {
    color: VUELTO_COLORS.white,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 2,
  },
  badge: {
    color: VUELTO_COLORS.turquoise,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 6,
  },
  title: {
    color: VUELTO_COLORS.white,
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    color: VUELTO_COLORS.muted,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 20,
    paddingHorizontal: 6,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 999,
    backgroundColor: 'rgba(167, 184, 204, 0.28)',
  },
  dotActive: {
    width: 28,
    backgroundColor: VUELTO_COLORS.turquoise,
  },
  footerBtns: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  prevBtn: {
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: VUELTO_COLORS.borderMuted,
  },
  prevBtnText: {
    color: VUELTO_COLORS.white,
    fontWeight: '700',
    fontSize: 13,
  },
  nextBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: VUELTO_COLORS.turquoise,
    alignItems: 'center',
  },
  nextBtnText: {
    color: VUELTO_COLORS.night,
    fontWeight: '800',
    fontSize: 15,
  },
});

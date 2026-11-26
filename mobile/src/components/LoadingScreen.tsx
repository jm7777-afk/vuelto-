import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ActivityIndicator,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { VUELTO_COLORS } from '../theme/colors';

interface LoadingScreenProps {
  isSlow?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onContinueToLogin?: () => void;
}

/**
 * Pantalla de carga inicial de Vuelto móvil.
 * Identidad oficial (#061426, #0A1D3A, #00E6C3, #00BFA5),
 * entrada suave del logo oficial, texto "Preparando tu experiencia..."
 * y manejo de errores con reintento.
 */
export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  isSlow = false,
  error = null,
  onRetry,
  onContinueToLogin,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.88)).current;
  const pulseAnim = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 7,
        tension: 45,
        useNativeDriver: true,
      }),
    ]).start();

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.8,
          duration: 1400,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.35,
          duration: 1400,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [fadeAnim, scaleAnim, pulseAnim]);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <Animated.View
        style={[
          styles.logoStage,
          { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
        ]}
      >
        <Animated.View style={[styles.logoGlow, { opacity: pulseAnim }]} />
        <View style={styles.logoFrame}>
          <Image
            source={require('../../assets/vuelto-logo.jpg')}
            style={styles.logoImg}
            resizeMode="contain"
          />
        </View>
      </Animated.View>

      {error ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorBadge}>⚠️ CONEXIÓN INTERRUMPIDA</Text>
          <Text style={styles.errorTitle}>No pudimos completar la verificación inicial</Text>
          <Text style={styles.errorBody}>{error}</Text>

          <View style={styles.errorActions}>
            {onRetry && (
              <TouchableOpacity style={styles.primaryBtn} onPress={onRetry}>
                <Text style={styles.primaryBtnText}>Reintentar</Text>
              </TouchableOpacity>
            )}
            {onContinueToLogin && (
              <TouchableOpacity style={styles.secondaryBtn} onPress={onContinueToLogin}>
                <Text style={styles.secondaryBtnText}>Ir al inicio de sesión →</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      ) : (
        <View style={styles.statusBox}>
          <ActivityIndicator size="large" color={VUELTO_COLORS.turquoise} />
          <Text style={styles.loadingText}>Preparando tu experiencia...</Text>
          <Text style={styles.subtitleText}>SISTEMA POS • FACTURACIÓN</Text>
          {isSlow && (
            <Text style={styles.slowHint}>
              La conexión está tardando más de lo habitual. Verificando sesión y recursos...
            </Text>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: VUELTO_COLORS.night,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  logoStage: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 34,
  },
  logoGlow: {
    position: 'absolute',
    width: 240,
    height: 110,
    borderRadius: 30,
    backgroundColor: 'rgba(0, 230, 195, 0.22)',
  },
  logoFrame: {
    backgroundColor: '#040C17',
    borderRadius: 18,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 195, 0.42)',
    shadowColor: VUELTO_COLORS.turquoise,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 20,
    elevation: 10,
  },
  logoImg: {
    width: 188,
    height: 58,
  },
  statusBox: {
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 15,
    fontWeight: '700',
    color: VUELTO_COLORS.white,
    marginTop: 8,
  },
  subtitleText: {
    fontSize: 11,
    fontWeight: '700',
    color: VUELTO_COLORS.turquoise,
    letterSpacing: 1.4,
  },
  slowHint: {
    fontSize: 12,
    color: VUELTO_COLORS.muted,
    textAlign: 'center',
    marginTop: 8,
    maxWidth: 300,
    lineHeight: 18,
  },
  errorCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: VUELTO_COLORS.deep,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.45)',
    alignItems: 'center',
  },
  errorBadge: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FCA5A5',
    marginBottom: 8,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: VUELTO_COLORS.white,
    textAlign: 'center',
    marginBottom: 6,
  },
  errorBody: {
    fontSize: 13,
    color: VUELTO_COLORS.muted,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 16,
  },
  errorActions: {
    width: '100%',
    gap: 10,
  },
  primaryBtn: {
    backgroundColor: VUELTO_COLORS.turquoise,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: VUELTO_COLORS.night,
    fontWeight: '800',
    fontSize: 14,
  },
  secondaryBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: VUELTO_COLORS.borderMuted,
  },
  secondaryBtnText: {
    color: VUELTO_COLORS.white,
    fontWeight: '600',
    fontSize: 13,
  },
});

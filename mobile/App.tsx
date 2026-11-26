import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { initMobileSentry } from './src/config/sentry';

initMobileSentry();

import { StatusBar } from 'expo-status-bar';
import * as FileSystem from 'expo-file-system';
import { MobileUserProfile, useAuthStore } from './src/stores/auth.store';
import { useCartStore } from './src/stores/cart.store';
import { PosCheckoutScreen } from './src/screens/pos/PosCheckoutScreen';
import { MobileAdminDashboard } from './src/screens/admin/MobileAdminDashboard';
import { LoginScreen } from './src/screens/auth/LoginScreen';
import { LoadingScreen } from './src/components/LoadingScreen';
import { OnboardingFlow, ONBOARDING_FILE } from './src/components/OnboardingFlow';
import {
  AUTH_FILE,
  MobileApiService,
  clearPersistedSession,
} from './src/services/api.service';
import { VUELTO_COLORS } from './src/theme/colors';

type BootPhase = 'LOADING' | 'ONBOARDING' | 'LOGIN' | 'READY';

export default function App() {
  const { user, activeMode, setAuth } = useAuthStore();
  const { setExchangeRate } = useCartStore();

  const [bootPhase, setBootPhase] = useState<BootPhase>('LOADING');
  const [bootSlow, setBootSlow] = useState(false);
  const [bootError, setBootError] = useState<string | null>(null);
  const [replayOnboarding, setReplayOnboarding] = useState(false);
  const [bcvRate, setBcvRate] = useState<number>(0);

  const checkOnboardingCompleted = async (): Promise<boolean> => {
    try {
      const info = await FileSystem.getInfoAsync(ONBOARDING_FILE);
      if (!info.exists) return false;
      const raw = await FileSystem.readAsStringAsync(ONBOARDING_FILE);
      const parsed = JSON.parse(raw);
      return Boolean(parsed?.completed);
    } catch {
      return false;
    }
  };

  const runBootstrap = useCallback(async () => {
    setBootPhase('LOADING');
    setBootSlow(false);
    setBootError(null);

    const slowTimer = setTimeout(() => {
      setBootSlow(true);
    }, 3500);

    try {
      // 1. Verificar estado de onboarding y sesión persistida en paralelo con tasas BCV en vivo
      const [hasCompletedOnboarding, authFileInfo, ratesRes] = await Promise.all([
        checkOnboardingCompleted(),
        FileSystem.getInfoAsync(AUTH_FILE).catch(() => ({ exists: false })),
        MobileApiService.getExchangeRates().catch(() => null),
      ]);

      if (ratesRes && typeof ratesRes.bcv === 'number' && ratesRes.bcv > 0) {
        setBcvRate(ratesRes.bcv);
        setExchangeRate(ratesRes.bcv, '');
      }

      // 2. Validar sesión guardada contra /api/v1/auth/me (y refresh automático en 401)
      let validSession = false;
      if (authFileInfo.exists) {
        try {
          const raw = await FileSystem.readAsStringAsync(AUTH_FILE);
          const parsed = JSON.parse(raw);
          if (parsed?.user && parsed?.accessToken) {
            setAuth(parsed.user, parsed.accessToken, parsed.refreshToken || '');
            const me = await MobileApiService.getMe();
            if (me?.user) {
              const latestState = useAuthStore.getState();
              setAuth(
                me.user,
                latestState.accessToken || parsed.accessToken,
                latestState.refreshToken || parsed.refreshToken || ''
              );
              validSession = true;
            }
          }
        } catch {
          await clearPersistedSession();
          validSession = false;
        }
      }

      // 3. Cargar snapshot activo del tenant si la sesión está activa
      if (validSession) {
        try {
          const activeRateData = await MobileApiService.getActiveRate();
          const val = Number(activeRateData?.activeRate ?? activeRateData?.rate ?? 0);
          if (val > 0 && activeRateData?.exchangeRateSnapshotId) {
            setBcvRate(val);
            setExchangeRate(val, activeRateData.exchangeRateSnapshotId, true);
          }
        } catch {
          // SuperAdmin sin tenant puede no tener tasa de comercio; no bloquea
        }
        setBootPhase('READY');
        return;
      }

      setBootPhase(hasCompletedOnboarding ? 'LOGIN' : 'ONBOARDING');
    } catch (e: any) {
      setBootError(e?.message || 'No se pudo conectar con el servidor de Vuelto.');
    } finally {
      clearTimeout(slowTimer);
    }
  }, [setAuth, setExchangeRate]);

  useEffect(() => {
    runBootstrap();
  }, [runBootstrap]);

  const handleLoginSuccess = async (
    loggedInUser: MobileUserProfile,
    accessToken: string,
    refreshToken: string
  ) => {
    setAuth(loggedInUser, accessToken, refreshToken);
    try {
      await FileSystem.writeAsStringAsync(
        AUTH_FILE,
        JSON.stringify({ user: loggedInUser, accessToken, refreshToken })
      );
    } catch {
      // Ignorar fallo de escritura
    }

    try {
      const activeRateData = await MobileApiService.getActiveRate();
      const val = Number(activeRateData?.activeRate ?? activeRateData?.rate ?? 0);
      if (val > 0 && activeRateData?.exchangeRateSnapshotId) {
        setBcvRate(val);
        setExchangeRate(val, activeRateData.exchangeRateSnapshotId, true);
      }
    } catch {
      // Ignora si no aplica para SUPER_ADMIN
    }

    setBootPhase('READY');
  };

  // Si el usuario cierra sesión desde dentro, volver a LOGIN
  useEffect(() => {
    if (bootPhase === 'READY' && !user) {
      FileSystem.deleteAsync(AUTH_FILE, { idempotent: true }).catch(() => {});
      setBootPhase('LOGIN');
    }
  }, [user, bootPhase]);

  if (bootPhase === 'LOADING') {
    return (
      <LoadingScreen
        isSlow={bootSlow}
        error={bootError}
        onRetry={runBootstrap}
        onContinueToLogin={() => setBootPhase('LOGIN')}
      />
    );
  }

  if (replayOnboarding) {
    return (
      <OnboardingFlow
        mode="replay"
        onComplete={() => setReplayOnboarding(false)}
      />
    );
  }

  if (bootPhase === 'ONBOARDING') {
    return (
      <OnboardingFlow
        mode="initial"
        onComplete={() => setBootPhase(user ? 'READY' : 'LOGIN')}
      />
    );
  }

  if (!user || bootPhase === 'LOGIN') {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <LoginScreen
          bcvRate={bcvRate}
          onLoginSuccess={handleLoginSuccess}
          onShowOnboarding={() => setReplayOnboarding(true)}
        />
      </View>
    );
  }

  const isAuthorizedAdmin = user.roleId === 'ADMIN' || user.roleId === 'SUPER_ADMIN';

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      {activeMode === 'ADMIN' && isAuthorizedAdmin ? (
        <MobileAdminDashboard onShowOnboarding={() => setReplayOnboarding(true)} />
      ) : (
        <PosCheckoutScreen onShowOnboarding={() => setReplayOnboarding(true)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: VUELTO_COLORS.night,
  },
});

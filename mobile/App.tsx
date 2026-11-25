import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, ActivityIndicator } from 'react-native';
import { initMobileSentry } from './src/config/sentry';

initMobileSentry();
import { StatusBar } from 'expo-status-bar';
import * as FileSystem from 'expo-file-system';
import { MobileUserProfile, useAuthStore } from './src/stores/auth.store';
import { useCartStore } from './src/stores/cart.store';
import { PosCheckoutScreen } from './src/screens/pos/PosCheckoutScreen';
import { MobileAdminDashboard } from './src/screens/admin/MobileAdminDashboard';
import { LoginScreen } from './src/screens/auth/LoginScreen';
import { MobileApiService } from './src/services/api.service';

const AUTH_FILE = `${FileSystem.documentDirectory}vuelto_auth.json`;

export default function App() {
  const { user, activeMode, setAuth, logout } = useAuthStore();
  const { setExchangeRate } = useCartStore();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function initApp() {
      try {
        // 1. Restaurar Sesión Persistente desde el almacenamiento local si existe
        const fileInfo = await FileSystem.getInfoAsync(AUTH_FILE);
        if (fileInfo.exists) {
          const content = await FileSystem.readAsStringAsync(AUTH_FILE);
          const parsed = JSON.parse(content);
          if (parsed && parsed.user) {
            setAuth(parsed.user, parsed.accessToken, parsed.refreshToken);
          }
        }

        // 2. Consultar Tasa Oficial BCV en vivo desde la API de Producción Render
        try {
          const rates = await MobileApiService.getExchangeRates();
          if (rates && rates.bcv) {
            setExchangeRate(rates.bcv.rate || 52.50, rates.bcv.id || 'snapshot-bcv-official');
          }
        } catch {
          // Fallback a tasa legal vigente en caso de estar offline
          setExchangeRate(52.50, 'snapshot-bcv-fallback');
        }
      } catch (e) {
        console.warn('Error inicializando sesión móvil:', e);
      } finally {
        setIsReady(true);
      }
    }

    initApp();
  }, []);

  // Guardar sesión persistente al iniciar sesión exitosamente
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
    } catch (e) {
      console.warn('Error persistiendo sesión:', e);
    }
  };

  // Limpiar archivo de sesión al cerrar sesión
  useEffect(() => {
    if (isReady && !user) {
      FileSystem.deleteAsync(AUTH_FILE, { idempotent: true }).catch(() => {});
    }
  }, [user, isReady]);

  if (!isReady) {
    return (
      <View style={styles.splash}>
        <StatusBar style="light" />
        <Text style={styles.brandTitle}>
          vuelto<Text style={styles.dot}>.</Text>
        </Text>
        <Text style={styles.brandSubtitle}>PUNTO DE VENTA & FACTURACIÓN</Text>
        <ActivityIndicator size="large" color="#A3E635" style={{ marginTop: 24 }} />
      </View>
    );
  }

  // Si no hay usuario autenticado, renderizar pantalla de Login profesional
  if (!user) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <LoginScreen onLoginSuccess={handleLoginSuccess} />
      </View>
    );
  }

  // Interfaz de VENDEDOR (Cajero): NUNCA puede acceder a MobileAdminDashboard (RBAC estricto)
  const isAuthorizedAdmin = user.roleId === 'ADMIN' || user.roleId === 'SUPER_ADMIN';

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      {activeMode === 'ADMIN' && isAuthorizedAdmin ? (
        <MobileAdminDashboard />
      ) : (
        <PosCheckoutScreen />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#071F27',
  },
  splash: {
    flex: 1,
    backgroundColor: '#0B3B49',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitle: {
    fontSize: 42,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  dot: {
    color: '#A3E635',
  },
  brandSubtitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#A3E635',
    letterSpacing: 3,
    marginTop: 8,
  },
});

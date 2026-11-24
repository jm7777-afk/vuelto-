import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from './src/stores/auth.store.js';
import { PosCheckoutScreen } from './src/screens/pos/PosCheckoutScreen.js';
import { MobileAdminDashboard } from './src/screens/admin/MobileAdminDashboard.js';

export default function App() {
  const { user, activeMode, setAuth } = useAuthStore();

  useEffect(() => {
    // Inicializar sesión demo para el entorno de mostrador
    if (!user) {
      setAuth(
        {
          id: 'usr_admin_123',
          tenantId: 'tenant_bodega_central',
          username: 'admin',
          fullName: 'Administrador Demo',
          roleId: 'ADMIN', // ADMIN permite alternar entre Modo POS y Modo Administrador Móvil
          businessName: 'Bodega Central C.A.',
        },
        'demo_jwt_access_token',
        'demo_jwt_refresh_token'
      );
    }
  }, [user]);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      {activeMode === 'ADMIN' && user?.roleId === 'ADMIN' ? (
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
    backgroundColor: '#0F172A',
  },
});

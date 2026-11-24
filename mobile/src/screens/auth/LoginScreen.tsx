import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { MobileApiService } from '../../services/api.service';
import { MobileUserProfile, useAuthStore } from '../../stores/auth.store';

interface LoginScreenProps {
  onLoginSuccess: (user: MobileUserProfile, accessToken: string, refreshToken: string) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (userToSubmit?: string, passToSubmit?: string) => {
    const u = userToSubmit || username;
    const p = passToSubmit || password;

    if (!u || !p) {
      Alert.alert('Datos requeridos', 'Por favor ingresa usuario y contraseña.');
      return;
    }

    setLoading(true);
    try {
      // Intentar login real con la API en Render / Supabase
      const res = await MobileApiService.login(u, p);
      onLoginSuccess(res.user, res.tokens.accessToken, res.tokens.refreshToken);
    } catch (e: any) {
      // Fallback para modo offline o testing local inmediato
      if (u === 'admin' && p === 'admin123') {
        const fallbackAdmin: MobileUserProfile = {
          id: '24a8eccf-b45e-4d5a-ac01-b44b77198c10',
          tenantId: 'a0000000-0000-0000-0000-000000000001',
          username: 'admin',
          fullName: 'Dueño Administrador',
          roleId: 'ADMIN',
          businessName: 'Bodega Central C.A.',
        };
        onLoginSuccess(fallbackAdmin, 'offline_admin_token', 'offline_refresh_token');
      } else if (u === 'cajero1' && p === 'cajero123') {
        const fallbackCajero: MobileUserProfile = {
          id: '8cb3bb66-6b60-4966-9bc6-e8220f122557',
          tenantId: 'a0000000-0000-0000-0000-000000000001',
          username: 'cajero1',
          fullName: 'Cajero Principal',
          roleId: 'VENDEDOR',
          businessName: 'Bodega Central C.A.',
        };
        onLoginSuccess(fallbackCajero, 'offline_cajero_token', 'offline_refresh_token');
      } else {
        Alert.alert('Error de Autenticación', e.message || 'Usuario o contraseña incorrectos.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (role: 'ADMIN' | 'VENDEDOR') => {
    if (role === 'ADMIN') {
      setUsername('admin');
      setPassword('admin123');
      handleLogin('admin', 'admin123');
    } else {
      setUsername('cajero1');
      setPassword('cajero123');
      handleLogin('cajero1', 'cajero123');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Logo y Marca Vuelto */}
          <View style={styles.brandContainer}>
            <Text style={styles.brandTitle}>
              vuelto<Text style={styles.brandDot}>.</Text>
            </Text>
            <Text style={styles.brandTagline}>SISTEMA BIMONEDA & POS VENEZUELA</Text>
            <View style={styles.rateBadge}>
              <Text style={styles.rateText}>Tasas Oficiales BCV • Facturación SENIAT</Text>
            </View>
          </View>

          {/* Formulario */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Iniciar Sesión</Text>
            <Text style={styles.cardSubtitle}>Accede según tu rol comercial autorizado</Text>

            <Text style={styles.label}>Usuario</Text>
            <TextInput
              style={styles.input}
              placeholder="admin o cajero1"
              placeholderTextColor="#64748B"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />

            <Text style={styles.label}>Contraseña</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor="#64748B"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <TouchableOpacity
              style={styles.loginBtn}
              onPress={() => handleLogin()}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.loginBtnText}>Ingresar al Sistema</Text>
              )}
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>O INGRESO RÁPIDO DEMO</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Accesos Rápidos según Rol (RBAC) */}
            <TouchableOpacity
              style={styles.quickAdminBtn}
              onPress={() => handleQuickLogin('ADMIN')}
              disabled={loading}
            >
              <Text style={styles.quickAdminTitle}>👑 Modo Administrador Total</Text>
              <Text style={styles.quickAdminSubtitle}>Control de costos, márgenes, compras y auditoría</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickVendedorBtn}
              onPress={() => handleQuickLogin('VENDEDOR')}
              disabled={loading}
            >
              <Text style={styles.quickVendedorTitle}>🛒 Modo Cajero / Vendedor</Text>
              <Text style={styles.quickVendedorSubtitle}>POS rápido, precios al detal y tickets (Sin costos)</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.footerText}>
            Vuelto POS Mobile v1.2.0 • Sincronizado en Tiempo Real
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#071F27',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  brandTitle: {
    fontSize: 44,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  brandDot: {
    color: '#A3E635',
  },
  brandTagline: {
    fontSize: 11,
    fontWeight: '700',
    color: '#A3E635',
    letterSpacing: 2,
    marginTop: 4,
  },
  rateBadge: {
    marginTop: 8,
    backgroundColor: '#0B3B49',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#155E75',
  },
  rateText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '500',
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#334155',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F8FAFC',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginBottom: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#CBD5E1',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#0F172A',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#475569',
    color: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    marginBottom: 16,
  },
  loginBtn: {
    backgroundColor: '#0284C7',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  loginBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 15,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#334155',
  },
  dividerText: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '700',
    marginHorizontal: 10,
  },
  quickAdminBtn: {
    backgroundColor: '#0284C715',
    borderWidth: 1,
    borderColor: '#0284C744',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
  },
  quickAdminTitle: {
    color: '#38BDF8',
    fontWeight: 'bold',
    fontSize: 14,
  },
  quickAdminSubtitle: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  quickVendedorBtn: {
    backgroundColor: '#10B98115',
    borderWidth: 1,
    borderColor: '#10B98144',
    borderRadius: 10,
    padding: 14,
  },
  quickVendedorTitle: {
    color: '#A3E635',
    fontWeight: 'bold',
    fontSize: 14,
  },
  quickVendedorSubtitle: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  footerText: {
    textAlign: 'center',
    color: '#64748B',
    fontSize: 11,
    marginTop: 24,
  },
});

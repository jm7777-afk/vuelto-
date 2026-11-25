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
  Image,
} from 'react-native';
import { MobileApiService } from '../../services/api.service';
import { MobileUserProfile, useAuthStore } from '../../stores/auth.store';

interface LoginScreenProps {
  onLoginSuccess: (user: MobileUserProfile, accessToken: string, refreshToken: string) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
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
      const res = await MobileApiService.login(u, p);
      onLoginSuccess(res.user, res.tokens.accessToken, res.tokens.refreshToken);
    } catch (e: any) {
      Alert.alert('Error de Autenticación', e.message || 'Usuario o contraseña incorrectos.');
    } finally {
      setLoading(false);
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
            <Image
              source={require('../../../assets/vuelto-logo.jpg')}
              style={{ width: 180, height: 50, resizeMode: 'contain', marginBottom: 8, borderRadius: 8 }}
            />
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

            {/* Información de Seguridad */}
            <View style={{ marginTop: 18, padding: 12, borderRadius: 10, backgroundColor: '#062F3B', borderWidth: 1, borderColor: '#155E75' }}>
              <Text style={{ color: '#A3E635', fontWeight: 'bold', fontSize: 11, marginBottom: 4 }}>
                ℹ️ Acceso Seguro Multi-Tenant:
              </Text>
              <Text style={{ color: '#94A3B8', fontSize: 11, lineHeight: 15 }}>
                • Autenticación cifrada conectada al servidor seguro Vuelto.{'\n'}
                • Los permisos y vistas se aplican estrictamente según el rol comercial asignado.
              </Text>
            </View>
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

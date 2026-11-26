import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { MobileApiService } from '../../services/api.service';
import { MobileUserProfile } from '../../stores/auth.store';
import { VUELTO_COLORS } from '../../theme/colors';

interface LoginScreenProps {
  bcvRate: number;
  onLoginSuccess: (user: MobileUserProfile, accessToken: string, refreshToken: string) => void;
  onShowOnboarding: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  bcvRate,
  onLoginSuccess,
  onShowOnboarding,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async () => {
    const u = username.trim();
    const p = password;

    if (!u || !p) {
      setErrorMsg('Por favor ingresa usuario y contraseña.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      const res = await MobileApiService.login(u, p, requiresTwoFactor ? twoFactorCode : undefined);

      if (res.requiresTwoFactor) {
        setRequiresTwoFactor(true);
        setErrorMsg('');
        return;
      }

      if (!res.user || !res.tokens?.accessToken) {
        throw new Error(res.message || 'Respuesta incompleta del servidor');
      }

      onLoginSuccess(res.user, res.tokens.accessToken, res.tokens.refreshToken);
    } catch (e: any) {
      setErrorMsg(e.message || 'Usuario o contraseña incorrectos.');
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
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            {/* Encabezado con Logo oficial */}
            <View style={styles.brandContainer}>
              <View style={styles.logoFrame}>
                <Image
                  source={require('../../../assets/vuelto-logo.jpg')}
                  style={styles.logoImg}
                  resizeMode="contain"
                />
              </View>

              <Text style={styles.cardTitle}>Iniciar sesión en Vuelto</Text>
              <Text style={styles.cardSubtitle}>
                Facturación, punto de venta y gestión administrativa
              </Text>

              <View style={styles.rateBadge}>
                <Text style={styles.rateText}>
                  {bcvRate > 0
                    ? `🛡️ BCV Oficial: ${bcvRate.toFixed(2)} Bs/$ • Conexión Cifrada`
                    : '🛡️ SENIAT Prov. 0071 • Conexión Segura'}
                </Text>
              </View>
            </View>

            {errorMsg ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            ) : null}

            <Text style={styles.label}>Usuario o correo</Text>
            <TextInput
              style={styles.input}
              placeholder="Ingresa tu usuario"
              placeholderTextColor={VUELTO_COLORS.subtle}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={styles.label}>Contraseña</Text>
            <View style={styles.passwordWrap}>
              <TextInput
                style={[styles.input, { marginBottom: 0, paddingRight: 64 }]}
                placeholder="••••••••"
                placeholderTextColor={VUELTO_COLORS.subtle}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowPassword((prev) => !prev)}
              >
                <Text style={styles.eyeBtnText}>{showPassword ? 'Ocultar' : 'Ver'}</Text>
              </TouchableOpacity>
            </View>

            {requiresTwoFactor && (
              <View style={{ marginTop: 14 }}>
                <Text style={[styles.label, { color: VUELTO_COLORS.turquoise }]}>
                  Código 2FA (Authenticator)
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      borderColor: VUELTO_COLORS.turquoise,
                      textAlign: 'center',
                      fontSize: 18,
                      letterSpacing: 6,
                    },
                  ]}
                  placeholder="000000"
                  placeholderTextColor={VUELTO_COLORS.subtle}
                  value={twoFactorCode}
                  onChangeText={setTwoFactorCode}
                  keyboardType="numeric"
                  maxLength={6}
                />
              </View>
            )}

            <TouchableOpacity
              style={[styles.loginBtn, loading && { opacity: 0.7 }]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={VUELTO_COLORS.night} />
              ) : (
                <Text style={styles.loginBtnText}>
                  🔒 {requiresTwoFactor ? 'Verificar 2FA e Ingresar' : 'Iniciar Sesión'}
                </Text>
              )}
            </TouchableOpacity>

            <View style={styles.onboardingLinkBox}>
              <TouchableOpacity onPress={onShowOnboarding} style={styles.onboardingLinkBtn}>
                <Text style={styles.onboardingLinkText}>
                  ❓ ¿Primera vez en Vuelto? Ver presentación
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.footerText}>
            Vuelto POS Mobile v1.4.0 • Sincronizado en Tiempo Real
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: VUELTO_COLORS.night,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: VUELTO_COLORS.deep,
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: VUELTO_COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 10,
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoFrame: {
    backgroundColor: '#040C17',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 195, 0.38)',
    marginBottom: 14,
  },
  logoImg: {
    width: 158,
    height: 46,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: VUELTO_COLORS.white,
    textAlign: 'center',
  },
  cardSubtitle: {
    fontSize: 12,
    color: VUELTO_COLORS.muted,
    textAlign: 'center',
    marginTop: 4,
  },
  rateBadge: {
    marginTop: 12,
    backgroundColor: 'rgba(6, 20, 38, 0.85)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 195, 0.28)',
  },
  rateText: {
    color: VUELTO_COLORS.muted,
    fontSize: 11,
    fontWeight: '600',
  },
  errorBox: {
    backgroundColor: VUELTO_COLORS.dangerBg,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.55)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  errorText: {
    color: '#FCA5A5',
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '600',
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: VUELTO_COLORS.muted,
    marginBottom: 6,
  },
  input: {
    backgroundColor: VUELTO_COLORS.night,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: VUELTO_COLORS.borderMuted,
    color: VUELTO_COLORS.white,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    marginBottom: 14,
  },
  passwordWrap: {
    position: 'relative',
    marginBottom: 14,
  },
  eyeBtn: {
    position: 'absolute',
    right: 12,
    top: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  eyeBtnText: {
    color: VUELTO_COLORS.turquoise,
    fontSize: 12,
    fontWeight: '700',
  },
  loginBtn: {
    backgroundColor: VUELTO_COLORS.turquoise,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 6,
  },
  loginBtnText: {
    color: VUELTO_COLORS.night,
    fontWeight: '800',
    fontSize: 15,
  },
  onboardingLinkBox: {
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(167, 184, 204, 0.14)',
    alignItems: 'center',
  },
  onboardingLinkBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  onboardingLinkText: {
    color: VUELTO_COLORS.turquoise,
    fontSize: 12,
    fontWeight: '700',
  },
  footerText: {
    textAlign: 'center',
    color: VUELTO_COLORS.subtle,
    fontSize: 11,
    marginTop: 18,
  },
});

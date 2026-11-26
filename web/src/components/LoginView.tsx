import React, { useState } from 'react';
import { Eye, EyeOff, Lock, HelpCircle, ShieldCheck } from 'lucide-react';

interface LoginViewProps {
  username: string;
  password: string;
  twoFactorCode: string;
  requiresTwoFactor: boolean;
  loading: boolean;
  error: string;
  bcvRate: number;
  onChangeUsername: (val: string) => void;
  onChangePassword: (val: string) => void;
  onChangeTwoFactor: (val: string) => void;
  onSubmit: () => void;
  onShowOnboarding: () => void;
}

/**
 * Pantalla de inicio de sesión moderna y coherente con la identidad visual de Vuelto.
 */
export const LoginView: React.FC<LoginViewProps> = ({
  username,
  password,
  twoFactorCode,
  requiresTwoFactor,
  loading,
  error,
  bcvRate,
  onChangeUsername,
  onChangePassword,
  onChangeTwoFactor,
  onSubmit,
  onShowOnboarding,
}) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="vuelto-intro-shell">
      <div className="vuelto-intro-grid" aria-hidden="true" />

      <div className="vuelto-glass-card vuelto-login-card">
        {/* Encabezado con Logo oficial Vuelto */}
        <div style={{ textAlign: 'center', marginBottom: '26px' }}>
          <div style={{ display: 'inline-block', marginBottom: '16px' }}>
            <div className="vuelto-logo-frame">
              <img
                src="/vuelto-logo.jpg"
                alt="Logo oficial de Vuelto"
                className="vuelto-logo-img"
                style={{ height: '48px' }}
              />
            </div>
          </div>

          <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.2px' }}>
            Iniciar sesión en Vuelto
          </h1>
          <p style={{ fontSize: '13px', color: '#A7B8CC', marginTop: '4px' }}>
            Facturación, punto de venta y gestión administrativa
          </p>

          <div
            style={{
              marginTop: '12px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'rgba(6, 20, 38, 0.72)',
              padding: '5px 12px',
              borderRadius: '999px',
              border: '1px solid rgba(0, 230, 195, 0.25)',
              fontSize: '11px',
              color: '#A7B8CC',
            }}
          >
            <ShieldCheck size={13} color="#00E6C3" />
            <span>
              {bcvRate > 0
                ? `BCV Oficial: ${bcvRate.toFixed(2)} Bs/$ • Conexión Cifrada`
                : 'SENIAT Prov. 0071 • Conexión Segura'}
            </span>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
          style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
        >
          {error && (
            <div
              role="alert"
              style={{
                padding: '12px 14px',
                borderRadius: '11px',
                backgroundColor: 'rgba(239, 68, 68, 0.14)',
                border: '1px solid rgba(239, 68, 68, 0.55)',
                color: '#FCA5A5',
                fontSize: '13px',
                textAlign: 'center',
                lineHeight: 1.4,
              }}
            >
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="vuelto-login-username"
              style={{ display: 'block', fontSize: '12px', color: '#A7B8CC', marginBottom: '6px', fontWeight: 600 }}
            >
              Usuario o correo
            </label>
            <input
              id="vuelto-login-username"
              type="text"
              autoComplete="username"
              placeholder="Ingresa tu usuario"
              value={username}
              onChange={(e) => onChangeUsername(e.target.value)}
              className="vuelto-input"
            />
          </div>

          <div>
            <label
              htmlFor="vuelto-login-password"
              style={{ display: 'block', fontSize: '12px', color: '#A7B8CC', marginBottom: '6px', fontWeight: 600 }}
            >
              Contraseña
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="vuelto-login-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => onChangePassword(e.target.value)}
                className="vuelto-input"
                style={{ paddingRight: '42px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#A7B8CC',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {requiresTwoFactor && (
            <div>
              <label
                htmlFor="vuelto-login-2fa"
                style={{ display: 'block', fontSize: '12px', color: '#00E6C3', marginBottom: '6px', fontWeight: 700 }}
              >
                Código 2FA (Authenticator)
              </label>
              <input
                id="vuelto-login-2fa"
                type="text"
                maxLength={6}
                placeholder="6 dígitos TOTP"
                value={twoFactorCode}
                onChange={(e) => onChangeTwoFactor(e.target.value)}
                className="vuelto-input"
                style={{
                  borderColor: 'rgba(0, 230, 195, 0.5)',
                  textAlign: 'center',
                  fontSize: '16px',
                  letterSpacing: '4px',
                }}
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="vuelto-btn-primary"
            style={{ width: '100%', marginTop: '4px' }}
          >
            <Lock size={15} />
            <span>{loading ? 'Autenticando...' : 'Iniciar Sesión'}</span>
          </button>
        </form>

        {/* Enlace sutil para volver a ver la presentación inicial */}
        <div
          style={{
            marginTop: '20px',
            paddingTop: '16px',
            borderTop: '1px solid rgba(167, 184, 204, 0.14)',
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <button
            type="button"
            onClick={onShowOnboarding}
            className="vuelto-btn-ghost"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}
          >
            <HelpCircle size={14} color="#00E6C3" />
            <span>¿Primera vez en Vuelto? Ver presentación</span>
          </button>
        </div>
      </div>
    </div>
  );
};

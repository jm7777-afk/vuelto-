import React from 'react';
import { AlertTriangle, RefreshCw, ArrowRight } from 'lucide-react';

interface LoadingScreenProps {
  /** Indica si la carga está tomando más tiempo de lo habitual */
  isSlow?: boolean;
  /** Mensaje de error si falló la inicialización o verificación de sesión */
  error?: string | null;
  /** Acción para reintentar la inicialización */
  onRetry?: () => void;
  /** Acción alternativa para continuar al login si el servidor no responde aún */
  onContinueToLogin?: () => void;
}

/**
 * Pantalla de carga inicial de Vuelto a pantalla completa.
 * Respeta la paleta oficial (#061426, #0A1D3A, #00E6C3, #00BFA5),
 * muestra el logo oficial con entrada suave y brillo turquesa,
 * e informa estados de espera o error con opción de reintento.
 */
export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  isSlow = false,
  error = null,
  onRetry,
  onContinueToLogin,
}) => {
  return (
    <div
      className="vuelto-intro-shell"
      role="status"
      aria-live="polite"
      aria-label="Inicializando aplicación Vuelto"
    >
      <div className="vuelto-intro-grid" aria-hidden="true" />

      <div
        style={{
          position: 'relative',
          zIndex: 2,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          maxWidth: '420px',
          width: '100%',
        }}
      >
        {/* Logo oficial Vuelto centrado con entrada scale(0.85 -> 1) + halo y brillo turquesa */}
        <div className="vuelto-logo-stage" style={{ marginBottom: '34px' }}>
          <div className="vuelto-logo-aura" aria-hidden="true" />
          <div className="vuelto-logo-frame">
            <img
              src="/vuelto-logo.jpg"
              alt="Logo oficial de Vuelto"
              className="vuelto-logo-img"
            />
            <div className="vuelto-logo-sheen" aria-hidden="true" />
          </div>
        </div>

        {error ? (
          <div
            className="vuelto-glass-card"
            role="alert"
            style={{
              padding: '22px 24px',
              borderColor: 'rgba(239, 68, 68, 0.45)',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '42px',
                height: '42px',
                margin: '0 auto 12px auto',
                borderRadius: '12px',
                backgroundColor: 'rgba(239, 68, 68, 0.14)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FCA5A5',
              }}
            >
              <AlertTriangle size={20} />
            </div>

            <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#FFFFFF', marginBottom: '6px' }}>
              No pudimos completar la verificación inicial
            </h2>
            <p style={{ fontSize: '13px', color: '#A7B8CC', lineHeight: 1.5, marginBottom: '18px' }}>
              {error}
            </p>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
              {onRetry && (
                <button type="button" onClick={onRetry} className="vuelto-btn-primary">
                  <RefreshCw size={15} />
                  <span>Reintentar</span>
                </button>
              )}
              {onContinueToLogin && (
                <button type="button" onClick={onContinueToLogin} className="vuelto-btn-secondary">
                  <span>Ir al inicio de sesión</span>
                  <ArrowRight size={14} />
                </button>
              )}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
            <div className="vuelto-spinner-ring" aria-hidden="true" />

            <div>
              <p
                style={{
                  fontSize: '15px',
                  fontWeight: 600,
                  color: '#FFFFFF',
                  letterSpacing: '0.2px',
                }}
              >
                Preparando tu experiencia...
              </p>
              <p
                style={{
                  fontSize: '12px',
                  color: '#00E6C3',
                  fontWeight: 600,
                  letterSpacing: '1.2px',
                  textTransform: 'uppercase',
                  marginTop: '6px',
                }}
              >
                Sistema POS • Facturación
              </p>
              {isSlow && (
                <p
                  style={{
                    fontSize: '12px',
                    color: '#A7B8CC',
                    marginTop: '10px',
                    lineHeight: 1.4,
                  }}
                >
                  La conexión está tardando más de lo habitual. Verificando sesión y recursos...
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

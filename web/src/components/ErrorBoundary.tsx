import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error captured by ErrorBoundary:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  private handleClearAndLogin = () => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            backgroundColor: '#071F27',
            color: '#F8FAFC',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '480px',
              backgroundColor: '#0B3B49',
              borderRadius: '24px',
              border: '1px solid #EF4444',
              padding: '36px',
              textAlign: 'center',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.7)',
            }}
          >
            <div
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '30px',
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                color: '#EF4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px auto',
                fontSize: '28px',
              }}
            >
              ⚠️
            </div>

            <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: '#FFFFFF', marginBottom: '8px' }}>
              Error al Cargar la Interfaz
            </h2>
            <p style={{ fontSize: '13px', color: '#CBD5E1', lineHeight: '1.5', marginBottom: '20px' }}>
              Se produjo un error al renderizar la aplicación. Es posible que existan datos en caché corruptos o una sesión anterior desactualizada.
            </p>

            {this.state.error?.message && (
              <div
                style={{
                  backgroundColor: '#062F3B',
                  border: '1px solid #334155',
                  borderRadius: '10px',
                  padding: '12px',
                  fontSize: '11px',
                  color: '#FCA5A5',
                  textAlign: 'left',
                  marginBottom: '24px',
                  wordBreak: 'break-word',
                  fontFamily: 'monospace',
                }}
              >
                {this.state.error.message}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                type="button"
                onClick={this.handleReset}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: '#0284C7',
                  color: '#FFFFFF',
                  fontWeight: 'bold',
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                Reintentar Carga
              </button>

              <button
                type="button"
                onClick={this.handleClearAndLogin}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '10px',
                  border: '1px solid #334155',
                  backgroundColor: 'transparent',
                  color: '#94A3B8',
                  fontWeight: '600',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                Limpiar Datos de Sesión y Volver al Login
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

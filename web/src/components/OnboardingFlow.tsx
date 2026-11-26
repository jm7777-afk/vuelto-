import React, { useState, useEffect, useCallback } from 'react';
import { ChevronRight, ChevronLeft, Check, X } from 'lucide-react';

interface OnboardingFlowProps {
  /** Se ejecuta cuando el usuario finaliza o salta la presentación */
  onComplete: () => void;
  /** 'initial' guarda estado completado en localStorage; 'replay' solo cierra la vista previa */
  mode?: 'initial' | 'replay';
}

export const ONBOARDING_STORAGE_KEY = 'vuelto_onboarding_completed';

/** Ilustración Pantalla 1: Terminal POS moderna con pantalla de ventas, impresora de tickets y logo Vuelto */
const PosTerminalIllustration: React.FC = () => (
  <svg
    viewBox="0 0 420 220"
    width="100%"
    height="100%"
    style={{ maxWidth: '400px', maxHeight: '205px' }}
    aria-hidden="true"
  >
    <defs>
      <linearGradient id="posScreenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#0A1D3A" />
        <stop offset="100%" stopColor="#061426" />
      </linearGradient>
      <linearGradient id="posTealGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#00E6C3" />
        <stop offset="100%" stopColor="#00BFA5" />
      </linearGradient>
    </defs>

    {/* Base / Escritorio POS */}
    <ellipse cx="210" cy="196" rx="156" ry="12" fill="rgba(0, 230, 195, 0.10)" />

    {/* Impresora térmica derecha con ticket saliendo */}
    <g transform="translate(274, 72)">
      {/* Papel de ticket */}
      <rect x="20" y="-26" width="64" height="58" rx="4" fill="#FFFFFF" stroke="#A7B8CC" strokeWidth="1" />
      <rect x="28" y="-16" width="28" height="4" rx="2" fill="#0A1D3A" />
      <rect x="28" y="-6" width="46" height="3" rx="1.5" fill="#A7B8CC" />
      <rect x="28" y="2" width="38" height="3" rx="1.5" fill="#A7B8CC" />
      <rect x="28" y="12" width="46" height="5" rx="2" fill="#00BFA5" />
      {/* Cuerpo de impresora */}
      <rect x="6" y="28" width="92" height="76" rx="12" fill="#0A1D3A" stroke="rgba(0, 230, 195, 0.35)" strokeWidth="1.8" />
      <rect x="16" y="24" width="72" height="8" rx="3" fill="#061426" stroke="#00E6C3" strokeWidth="1.2" />
      <circle cx="82" cy="52" r="4" fill="#00E6C3" />
      <rect x="20" y="68" width="64" height="22" rx="6" fill="#061426" stroke="rgba(167, 184, 204, 0.25)" strokeWidth="1" />
      <text x="52" y="83" fill="#00E6C3" fontSize="9" fontWeight="700" textAnchor="middle" fontFamily="sans-serif">
        TICKET LISTO
      </text>
    </g>

    {/* Terminal POS principal (Tablet / All-in-one) */}
    <g transform="translate(46, 22)">
      {/* Soporte metálico */}
      <path d="M 98 144 L 116 144 L 124 170 L 90 170 Z" fill="#0A1D3A" stroke="rgba(167, 184, 204, 0.35)" strokeWidth="1.5" />
      <rect x="70" y="168" width="74" height="7" rx="3.5" fill="#00BFA5" opacity="0.65" />

      {/* Carcasa */}
      <rect x="0" y="0" width="214" height="146" rx="14" fill="#0A1D3A" stroke="rgba(0, 230, 195, 0.55)" strokeWidth="2" />
      {/* Pantalla */}
      <rect x="10" y="10" width="194" height="126" rx="9" fill="url(#posScreenGrad)" stroke="rgba(167, 184, 204, 0.2)" strokeWidth="1" />

      {/* Barra superior pantalla con marca Vuelto */}
      <rect x="16" y="16" width="182" height="24" rx="6" fill="rgba(0, 230, 195, 0.1)" />
      <circle cx="28" cy="28" r="5" fill="#00E6C3" />
      <text x="39" y="31.5" fill="#FFFFFF" fontSize="10" fontWeight="800" fontFamily="sans-serif">
        vuelto POS
      </text>
      <rect x="142" y="21" width="48" height="14" rx="7" fill="url(#posTealGrad)" />
      <text x="166" y="31" fill="#061426" fontSize="8" fontWeight="800" textAnchor="middle" fontFamily="sans-serif">
        ACTIVO
      </text>

      {/* Líneas de productos en pantalla */}
      <rect x="18" y="48" width="110" height="16" rx="5" fill="rgba(255,255,255,0.05)" />
      <rect x="24" y="54" width="56" height="4" rx="2" fill="#FFFFFF" />
      <rect x="98" y="54" width="24" height="4" rx="2" fill="#00E6C3" />

      <rect x="18" y="68" width="110" height="16" rx="5" fill="rgba(255,255,255,0.05)" />
      <rect x="24" y="74" width="46" height="4" rx="2" fill="#A7B8CC" />
      <rect x="98" y="74" width="24" height="4" rx="2" fill="#00E6C3" />

      <rect x="18" y="88" width="110" height="16" rx="5" fill="rgba(255,255,255,0.05)" />
      <rect x="24" y="94" width="64" height="4" rx="2" fill="#A7B8CC" />
      <rect x="98" y="94" width="24" height="4" rx="2" fill="#00E6C3" />

      {/* Panel derecho de total + cobrar */}
      <rect x="134" y="48" width="64" height="80" rx="8" fill="rgba(0, 191, 165, 0.12)" stroke="rgba(0, 230, 195, 0.35)" strokeWidth="1" />
      <text x="166" y="64" fill="#A7B8CC" fontSize="8" textAnchor="middle" fontFamily="sans-serif">
        TOTAL
      </text>
      <text x="166" y="82" fill="#FFFFFF" fontSize="14" fontWeight="800" textAnchor="middle" fontFamily="sans-serif">
        $48.50
      </text>
      <rect x="142" y="96" width="48" height="22" rx="6" fill="url(#posTealGrad)" />
      <text x="166" y="110" fill="#061426" fontSize="9" fontWeight="800" textAnchor="middle" fontFamily="sans-serif">
        COBRAR
      </text>

      {/* Pie factura resumen */}
      <rect x="18" y="112" width="110" height="16" rx="5" fill="rgba(0, 230, 195, 0.08)" />
      <text x="26" y="123" fill="#00E6C3" fontSize="8.5" fontWeight="700" fontFamily="sans-serif">
        FACT-A-00142 • Vuelto listo
      </text>
    </g>
  </svg>
);

/** Ilustración Pantalla 2: Factura digital, gráficos de ventas e indicadores administrativos */
const ControlDashboardIllustration: React.FC = () => (
  <svg
    viewBox="0 0 420 220"
    width="100%"
    height="100%"
    style={{ maxWidth: '400px', maxHeight: '205px' }}
    aria-hidden="true"
  >
    <defs>
      <linearGradient id="chartBarGrad" x1="0%" y1="100%" x2="0%" y2="0%">
        <stop offset="0%" stopColor="#00BFA5" stopOpacity="0.45" />
        <stop offset="100%" stopColor="#00E6C3" />
      </linearGradient>
    </defs>

    {/* Ventana administrativa */}
    <rect x="22" y="18" width="268" height="182" rx="14" fill="#061426" stroke="rgba(0, 230, 195, 0.35)" strokeWidth="1.8" />
    {/* Topbar */}
    <rect x="22" y="18" width="268" height="28" rx="14" fill="#0A1D3A" />
    <circle cx="40" cy="32" r="4" fill="#00E6C3" />
    <circle cx="54" cy="32" r="4" fill="#00BFA5" opacity="0.6" />
    <rect x="70" y="29" width="84" height="6" rx="3" fill="rgba(167, 184, 204, 0.35)" />

    {/* 3 KPIs financieros */}
    <rect x="36" y="56" width="76" height="42" rx="8" fill="#0A1D3A" stroke="rgba(0, 230, 195, 0.22)" />
    <text x="44" y="71" fill="#A7B8CC" fontSize="7.5" fontFamily="sans-serif">VENTAS HOY</text>
    <text x="44" y="88" fill="#00E6C3" fontSize="13" fontWeight="800" fontFamily="sans-serif">$1,284</text>

    <rect x="118" y="56" width="76" height="42" rx="8" fill="#0A1D3A" stroke="rgba(167, 184, 204, 0.2)" />
    <text x="126" y="71" fill="#A7B8CC" fontSize="7.5" fontFamily="sans-serif">CAJA NETA</text>
    <text x="126" y="88" fill="#FFFFFF" fontSize="13" fontWeight="800" fontFamily="sans-serif">$940</text>

    <rect x="200" y="56" width="76" height="42" rx="8" fill="#0A1D3A" stroke="rgba(167, 184, 204, 0.2)" />
    <text x="208" y="71" fill="#A7B8CC" fontSize="7.5" fontFamily="sans-serif">PEDIDOS</text>
    <text x="208" y="88" fill="#00BFA5" fontSize="13" fontWeight="800" fontFamily="sans-serif">48 OK</text>

    {/* Gráfico de barras + línea */}
    <rect x="36" y="108" width="240" height="78" rx="10" fill="#0A1D3A" stroke="rgba(167, 184, 204, 0.16)" />
    <rect x="54" y="148" width="18" height="26" rx="4" fill="url(#chartBarGrad)" />
    <rect x="84" y="136" width="18" height="38" rx="4" fill="url(#chartBarGrad)" />
    <rect x="114" y="142" width="18" height="32" rx="4" fill="url(#chartBarGrad)" />
    <rect x="144" y="126" width="18" height="48" rx="4" fill="url(#chartBarGrad)" />
    <rect x="174" y="132" width="18" height="42" rx="4" fill="url(#chartBarGrad)" />
    <rect x="204" y="118" width="18" height="56" rx="4" fill="url(#chartBarGrad)" />
    <rect x="234" y="122" width="18" height="52" rx="4" fill="url(#chartBarGrad)" />
    <path d="M 63 142 L 93 130 L 123 136 L 153 120 L 183 125 L 213 114 L 243 116" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />

    {/* Tarjeta flotante de Factura Digital */}
    <g transform="translate(274, 48)">
      <rect x="0" y="0" width="122" height="146" rx="12" fill="#0A1D3A" stroke="#00E6C3" strokeWidth="1.8" />
      <rect x="14" y="16" width="54" height="6" rx="3" fill="#00E6C3" />
      <rect x="14" y="28" width="84" height="4" rx="2" fill="#A7B8CC" />
      <line x1="14" y1="44" x2="108" y2="44" stroke="rgba(167, 184, 204, 0.25)" strokeWidth="1" />
      <rect x="14" y="54" width="60" height="4" rx="2" fill="#FFFFFF" />
      <rect x="84" y="54" width="24" height="4" rx="2" fill="#00E6C3" />
      <rect x="14" y="68" width="52" height="4" rx="2" fill="#A7B8CC" />
      <rect x="84" y="68" width="24" height="4" rx="2" fill="#00E6C3" />
      <rect x="14" y="82" width="64" height="4" rx="2" fill="#A7B8CC" />
      <rect x="84" y="82" width="24" height="4" rx="2" fill="#00E6C3" />
      <rect x="14" y="106" width="94" height="26" rx="7" fill="rgba(0, 230, 195, 0.14)" stroke="rgba(0, 230, 195, 0.4)" />
      <text x="61" y="123" fill="#00E6C3" fontSize="9.5" fontWeight="800" textAnchor="middle" fontFamily="sans-serif">
        FACTURA FISCAL ✓
      </text>
    </g>
  </svg>
);

/** Ilustración Pantalla 3: Escena moderna de restaurante/comercio con atención ágil y cobro sin fricción */
const BusinessExperienceIllustration: React.FC = () => (
  <svg
    viewBox="0 0 420 220"
    width="100%"
    height="100%"
    style={{ maxWidth: '400px', maxHeight: '205px' }}
    aria-hidden="true"
  >
    {/* Fondo arquitectónico de local / barra moderna */}
    <rect x="34" y="24" width="352" height="148" rx="16" fill="#061426" stroke="rgba(167, 184, 204, 0.22)" strokeWidth="1.5" />
    {/* Luminaria colgante de restaurante moderno */}
    <line x1="120" y1="24" x2="120" y2="48" stroke="#A7B8CC" strokeWidth="1.5" />
    <path d="M 102 48 L 138 48 L 146 60 L 94 60 Z" fill="#0A1D3A" stroke="#00E6C3" strokeWidth="1.4" />
    <ellipse cx="120" cy="64" rx="22" ry="5" fill="rgba(0, 230, 195, 0.22)" />

    <line x1="300" y1="24" x2="300" y2="48" stroke="#A7B8CC" strokeWidth="1.5" />
    <path d="M 282 48 L 318 48 L 326 60 L 274 60 Z" fill="#0A1D3A" stroke="#00E6C3" strokeWidth="1.4" />
    <ellipse cx="300" cy="64" rx="22" ry="5" fill="rgba(0, 230, 195, 0.22)" />

    {/* Mostrador moderno */}
    <rect x="52" y="138" width="316" height="44" rx="10" fill="#0A1D3A" stroke="rgba(0, 230, 195, 0.38)" strokeWidth="1.6" />
    <rect x="66" y="148" width="120" height="6" rx="3" fill="rgba(0, 230, 195, 0.3)" />
    <rect x="66" y="160" width="84" height="4" rx="2" fill="rgba(167, 184, 204, 0.35)" />

    {/* Tablet POS en barra */}
    <g transform="translate(86, 82)">
      <rect x="0" y="0" width="96" height="58" rx="8" fill="#0A1D3A" stroke="#00E6C3" strokeWidth="1.8" />
      <rect x="8" y="8" width="80" height="40" rx="5" fill="#061426" />
      <rect x="14" y="15" width="42" height="5" rx="2.5" fill="#FFFFFF" />
      <rect x="14" y="25" width="68" height="4" rx="2" fill="#A7B8CC" />
      <rect x="14" y="34" width="36" height="8" rx="4" fill="#00E6C3" />
      <text x="32" y="40" fill="#061426" fontSize="6.5" fontWeight="800" textAnchor="middle" fontFamily="sans-serif">
        LISTO
      </text>
    </g>

    {/* Tarjeta de Comanda / Servicio ágil */}
    <g transform="translate(206, 74)">
      <rect x="0" y="0" width="142" height="64" rx="10" fill="#0A1D3A" stroke="rgba(0, 230, 195, 0.5)" strokeWidth="1.6" />
      <circle cx="24" cy="24" r="11" fill="rgba(0, 230, 195, 0.16)" stroke="#00E6C3" strokeWidth="1.5" />
      <path d="M 19 24 L 22.5 27.5 L 29.5 20" fill="none" stroke="#00E6C3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <text x="42" y="21" fill="#FFFFFF" fontSize="9.5" fontWeight="800" fontFamily="sans-serif">
        Pago &amp; Vuelto Exitoso
      </text>
      <text x="42" y="33" fill="#A7B8CC" fontSize="8" fontFamily="sans-serif">
        Atención en menos de 15 seg
      </text>
      <rect x="14" y="44" width="114" height="11" rx="5.5" fill="rgba(0, 191, 165, 0.2)" />
      <text x="71" y="52" fill="#00E6C3" fontSize="7.5" fontWeight="700" textAnchor="middle" fontFamily="sans-serif">
        MESA 04 • COMPROBANTE ENVIADO
      </text>
    </g>

    {/* Badge inferior de confianza */}
    <rect x="128" y="188" width="164" height="20" rx="10" fill="rgba(0, 230, 195, 0.12)" stroke="rgba(0, 230, 195, 0.35)" />
    <text x="210" y="201" fill="#00E6C3" fontSize="9" fontWeight="700" textAnchor="middle" fontFamily="sans-serif">
      EXPERIENCIA ÁGIL • RESTAURANTES &amp; COMERCIOS
    </text>
  </svg>
);

const ONBOARDING_SLIDES = [
  {
    title: 'Bienvenido a Vuelto',
    description: 'Gestiona tus ventas y facturas de forma rápida, sencilla y organizada.',
    badge: 'Terminal POS Bimoneda',
    illustration: <PosTerminalIllustration />,
  },
  {
    title: 'Todo bajo control',
    description: 'Administra tus ventas, caja, pedidos y reportes desde un solo sistema.',
    badge: 'Administración & Analítica',
    illustration: <ControlDashboardIllustration />,
  },
  {
    title: 'Una mejor experiencia',
    description: 'Optimiza tu negocio, agiliza la atención y ofrece un servicio más eficiente a tus clientes.',
    badge: 'Restaurantes y Negocios',
    illustration: <BusinessExperienceIllustration />,
  },
] as const;

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({
  onComplete,
  mode = 'initial',
}) => {
  const [step, setStep] = useState(0);
  const totalSteps = ONBOARDING_SLIDES.length;
  const isLastStep = step === totalSteps - 1;
  const current = ONBOARDING_SLIDES[step];

  const finishOnboarding = useCallback(() => {
    if (mode === 'initial') {
      try {
        localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
      } catch {
        // Ignora errores de cuota en modo privado
      }
    }
    onComplete();
  }, [mode, onComplete]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        if (!isLastStep) setStep((s) => Math.min(totalSteps - 1, s + 1));
        else finishOnboarding();
      } else if (e.key === 'ArrowLeft') {
        setStep((s) => Math.max(0, s - 1));
      } else if (e.key === 'Escape') {
        finishOnboarding();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLastStep, totalSteps, finishOnboarding]);

  return (
    <div
      className="vuelto-intro-shell"
      role="region"
      aria-label="Presentación inicial de Vuelto"
    >
      <div className="vuelto-intro-grid" aria-hidden="true" />

      <div className="vuelto-glass-card vuelto-onboarding-card">
        {/* Cabecera superior: Logo oficial Vuelto + Botón Saltar */}
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            marginBottom: '22px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="vuelto-logo-frame vuelto-logo-frame--compact">
              <img
                src="/vuelto-logo.jpg"
                alt="Vuelto"
                className="vuelto-logo-img"
              />
            </div>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#00E6C3',
                backgroundColor: 'rgba(0, 230, 195, 0.1)',
                border: '1px solid rgba(0, 230, 195, 0.25)',
                padding: '4px 10px',
                borderRadius: '20px',
                letterSpacing: '0.4px',
              }}
            >
              Paso {step + 1} de {totalSteps}
            </span>
          </div>

          {!isLastStep ? (
            <button
              type="button"
              onClick={finishOnboarding}
              className="vuelto-btn-ghost"
            >
              Saltar
            </button>
          ) : mode === 'replay' ? (
            <button
              type="button"
              onClick={finishOnboarding}
              aria-label="Cerrar guía"
              className="vuelto-btn-ghost"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            >
              <X size={16} />
              <span>Cerrar</span>
            </button>
          ) : null}
        </header>

        {/* Contenido animado de la pantalla actual */}
        <div key={step} className="vuelto-slide-stage">
          <div className="vuelto-illustration-box" style={{ marginBottom: '22px' }}>
            {current.illustration}
          </div>

          <div style={{ textAlign: 'center', maxWidth: '520px', margin: '0 auto 24px auto' }}>
            <span
              style={{
                display: 'inline-block',
                fontSize: '11px',
                fontWeight: 700,
                color: '#00E6C3',
                letterSpacing: '1px',
                textTransform: 'uppercase',
                marginBottom: '8px',
              }}
            >
              {current.badge}
            </span>

            <h1
              style={{
                fontSize: 'clamp(22px, 4vw, 28px)',
                fontWeight: 800,
                color: '#FFFFFF',
                letterSpacing: '-0.3px',
                marginBottom: '10px',
                lineHeight: 1.2,
              }}
            >
              {current.title}
            </h1>

            <p
              style={{
                fontSize: '15px',
                color: '#A7B8CC',
                lineHeight: 1.6,
              }}
            >
              {current.description}
            </p>
          </div>
        </div>

        {/* Indicadores de progreso */}
        <div
          role="tablist"
          aria-label="Progreso de presentación"
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '24px',
          }}
        >
          {ONBOARDING_SLIDES.map((slideItem, idx) => {
            const isActive = idx === step;
            return (
              <button
                key={slideItem.title}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-label={`Ir al paso ${idx + 1}: ${slideItem.title}`}
                onClick={() => setStep(idx)}
                style={{
                  width: isActive ? '28px' : '9px',
                  height: '9px',
                  borderRadius: '999px',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  backgroundColor: isActive ? '#00E6C3' : 'rgba(167, 184, 204, 0.28)',
                  boxShadow: isActive ? '0 0 12px rgba(0, 230, 195, 0.5)' : 'none',
                  transition: 'all 0.25s ease',
                }}
              />
            );
          })}
        </div>

        {/* Controles de navegación inferior */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {step > 0 && (
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              className="vuelto-btn-secondary"
            >
              <ChevronLeft size={16} />
              <span>Anterior</span>
            </button>
          )}

          {!isLastStep ? (
            <button
              type="button"
              onClick={() => setStep((s) => Math.min(totalSteps - 1, s + 1))}
              className="vuelto-btn-primary"
              style={{ flex: 1 }}
            >
              <span>Siguiente</span>
              <ChevronRight size={17} />
            </button>
          ) : (
            <button
              type="button"
              onClick={finishOnboarding}
              className="vuelto-btn-primary"
              style={{ flex: 1 }}
            >
              <span>{mode === 'replay' ? 'Volver al sistema' : '¡Comenzar!'}</span>
              <Check size={17} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

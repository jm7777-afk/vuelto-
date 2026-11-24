import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import {
  TrendingUp,
  Package,
  ShoppingCart,
  Users,
  AlertTriangle,
  DollarSign,
  MessageCircle,
  Camera,
  Calendar,
  Search,
  Plus,
  RefreshCw,
  LogOut,
  ShieldCheck,
  FileText,
  Clock,
  Printer,
  X,
  CheckCircle,
  Percent,
  TrendingDown,
  Phone,
  Store,
  Tag,
  Check,
  Zap,
  Play,
  Sparkles,
  HelpCircle,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';

// Tipos Principales
interface UserProfile {
  id: string;
  tenantId: string;
  username: string;
  fullName: string;
  roleId: string;
  businessName: string;
}

interface ProductItem {
  id: string;
  name: string;
  barcode: string;
  sku?: string;
  category: string;
  supplier: string;
  supplierPhone: string;
  costPriceUsd: number;
  salePriceUsd: number;
  taxRate: number;
  stock: number;
  minStockAlert: number;
  lastPurchaseDate: string;
  inflationDeltaPercent?: number;
}

interface CustomerDebt {
  id: string;
  name: string;
  document: string;
  phone: string;
  balanceDueUsd: number;
  dueDate: string;
  isOverdue: boolean;
  lateDays: number;
  surchargeUsd: number;
}

interface SaleRecord {
  id: string;
  invoiceFormattedNumber: string;
  createdAt: string;
  customerName: string;
  customerDoc: string;
  cashierName: string;
  totalUsd: number;
  totalBs: number;
  rateValue: number;
  status: string;
  items: { name: string; qty: number; priceUsd: number; subtotalUsd: number; taxRate: number }[];
  taxes: { base16: number; base8: number; exempt: number; tax16: number; tax8: number; igtf3: number };
}

interface CashierStatus {
  id: string;
  name: string;
  username: string;
  status: 'ONLINE' | 'IDLE' | 'OFFLINE';
  openCartsCount: number;
  salesTodayCount: number;
  salesTodayUsd: number;
  salesTodayBs: number;
  lastAction: string;
  lastActionTime: string;
}

const DEFAULT_BCV_RATE = 52.50;


// =========================================================================
// 🎬 SPLASH SCREEN / INTRO ANIMADA DE VUELTO POS (MOTION DESIGN SENIOR)
// =========================================================================
export const VueltoSplashScreen: React.FC<{ onFinish: () => void }> = ({ onFinish }) => {
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    try { sessionStorage.setItem('vuelto_splash_shown', 'true'); } catch {}

    // Secuencia cinemática total (3.7 segundos):
    // 0.0s - 1.2s: Aparición y dibujo de factura (degradado turquesa a lima)
    // 0.8s - 1.4s: 3 líneas de conceptos de cobro (izq a der)
    // 1.2s - 2.1s: Emergencia del billete inclinado + giro antihorario ("vuelto") + destello lima
    // 2.1s - 2.9s: Entrada de tipografía geométrica "vuelto" con fade-in y subida
    // 2.9s - 3.7s: Cierre estático y centrado para retención de marca
    // 3.7s - 4.2s: Transición fluida (desvanecimiento y escala suave) hacia la app
    const timer = setTimeout(() => {
      setClosing(true);
      setTimeout(onFinish, 450);
    }, 3700);

    return () => clearTimeout(timer);
  }, [onFinish]);

  const handleSkip = () => {
    setClosing(true);
    setTimeout(onFinish, 200);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        backgroundColor: '#0B3B49',
        backgroundImage: 'radial-gradient(circle at 50% 45%, #0E4E61 0%, #0B3B49 55%, #052129 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        transition: 'opacity 0.45s cubic-bezier(0.16, 1, 0.3, 1), transform 0.45s cubic-bezier(0.16, 1, 0.3, 1)',
        opacity: closing ? 0 : 1,
        transform: closing ? 'scale(1.04)' : 'scale(1)',
        pointerEvents: closing ? 'none' : 'auto',
      }}
    >
      <style>{`
        /* 1. Aparición del comprobante (factura): trazo progresivo con degradado turquesa a lima */
        @keyframes drawInvoiceContour {
          0% { stroke-dashoffset: 750; opacity: 0; }
          15% { opacity: 1; }
          100% { stroke-dashoffset: 0; opacity: 1; }
        }
        .vuelto-invoice-contour {
          stroke-dasharray: 750;
          stroke-dashoffset: 750;
          animation: drawInvoiceContour 1.2s cubic-bezier(0.22, 1, 0.36, 1) 0.1s forwards;
        }

        /* 2. Tres líneas horizontales internas (conceptos de cobro) aparecen de izquierda a derecha */
        @keyframes drawConceptLine {
          0% { transform: scaleX(0); opacity: 0; }
          30% { opacity: 1; }
          100% { transform: scaleX(1); opacity: 0.95; }
        }
        .vuelto-line-1 {
          transform-origin: 125px 105px;
          animation: drawConceptLine 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.75s forwards;
          opacity: 0;
        }
        .vuelto-line-2 {
          transform-origin: 125px 135px;
          animation: drawConceptLine 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.95s forwards;
          opacity: 0;
        }
        .vuelto-line-3 {
          transform-origin: 125px 165px;
          animation: drawConceptLine 0.5s cubic-bezier(0.16, 1, 0.3, 1) 1.15s forwards;
          opacity: 0;
        }

        /* 3. Billete inclinado que surge sobre la esquina inferior derecha */
        @keyframes popBanknote {
          0% { transform: translate(242px, 195px) rotate(-10deg) scale(0.2); opacity: 0; }
          65% { transform: translate(232px, 180px) rotate(18deg) scale(1.08); opacity: 1; }
          100% { transform: translate(235px, 184px) rotate(15deg) scale(1); opacity: 1; }
        }
        .vuelto-banknote-group {
          animation: popBanknote 0.85s cubic-bezier(0.34, 1.56, 0.64, 1) 1.25s forwards;
          opacity: 0;
        }

        /* 4. Flecha curva con movimiento circular ascendente antihorario (devolución / vuelto rápido) */
        @keyframes spinReturnArrow {
          0% {
            stroke-dashoffset: 320;
            transform: translate(235px, 202px) rotate(80deg);
            opacity: 0;
          }
          25% { opacity: 1; }
          100% {
            stroke-dashoffset: 0;
            transform: translate(235px, 202px) rotate(-25deg);
            opacity: 1;
          }
        }
        .vuelto-return-arrow {
          stroke-dasharray: 320;
          stroke-dashoffset: 320;
          animation: spinReturnArrow 1.05s cubic-bezier(0.22, 1, 0.36, 1) 1.45s forwards;
          opacity: 0;
        }

        /* 5. Destello luminoso verde-amarillento en los bordes */
        @keyframes limeGlowPulse {
          0% { filter: drop-shadow(0 0 0px rgba(163, 230, 53, 0)); }
          45% { filter: drop-shadow(0 0 24px rgba(163, 230, 53, 0.95)) drop-shadow(0 0 45px rgba(6, 214, 160, 0.6)); }
          100% { filter: drop-shadow(0 0 12px rgba(16, 185, 129, 0.7)); }
        }
        .vuelto-glow-effect {
          animation: limeGlowPulse 1.4s ease-out 1.55s forwards;
        }

        /* 6. Entrada de la tipografía "vuelto" geométrica limpia con fade-in y subida */
        @keyframes typographyAscend {
          0% { opacity: 0; transform: translateY(18px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .vuelto-brand-text {
          animation: typographyAscend 0.75s cubic-bezier(0.16, 1, 0.3, 1) 2.15s forwards;
          opacity: 0;
        }

        /* 7. Tagline con desplazamiento sutil */
        @keyframes taglineFadeIn {
          0% { opacity: 0; letter-spacing: 5px; }
          100% { opacity: 0.9; letter-spacing: 3.5px; }
        }
        .vuelto-tagline-text {
          animation: taglineFadeIn 0.75s cubic-bezier(0.16, 1, 0.3, 1) 2.45s forwards;
          opacity: 0;
        }
      `}</style>

      {/* ISOTIPO ANIMADO */}
      <div className="vuelto-glow-effect" style={{ width: '380px', height: '270px', position: 'relative' }}>
        <svg viewBox="0 0 380 270" width="100%" height="100%" style={{ overflow: 'visible' }}>
          <defs>
            <linearGradient id="contourGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#06D6A0" />
              <stop offset="55%" stopColor="#10B981" />
              <stop offset="100%" stopColor="#84CC16" />
            </linearGradient>

            <linearGradient id="billGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#06D6A0" />
              <stop offset="50%" stopColor="#10B981" />
              <stop offset="100%" stopColor="#A3E635" />
            </linearGradient>

            <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#000000" floodOpacity="0.45" />
            </filter>
          </defs>

          {/* 1. Factura / Comprobante con borde enrollado superior y zig-zag inferior */}
          <path
            className="vuelto-invoice-contour"
            d="M 110,65 L 235,65 Q 250,65 250,80 L 250,205 L 242,200 L 230,205 L 218,200 L 206,205 L 194,200 L 182,205 L 170,200 L 158,205 L 146,200 L 134,205 L 122,200 L 110,205 L 98,200 L 98,80 Q 98,65 110,65 Z"
            fill="none"
            stroke="url(#contourGrad)"
            strokeWidth="4.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#softShadow)"
          />

          {/* 2. Tres líneas internas (conceptos de cobro) */}
          <line
            className="vuelto-line-1"
            x1="125"
            y1="105"
            x2="225"
            y2="105"
            stroke="#06D6A0"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <line
            className="vuelto-line-2"
            x1="125"
            y1="135"
            x2="205"
            y2="135"
            stroke="#10B981"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <line
            className="vuelto-line-3"
            x1="125"
            y1="165"
            x2="185"
            y2="165"
            stroke="#84CC16"
            strokeWidth="3.5"
            strokeLinecap="round"
          />

          {/* 3. Billete inclinado en la esquina inferior derecha */}
          <g className="vuelto-banknote-group">
            <rect
              x="-48"
              y="-28"
              width="96"
              height="56"
              rx="7"
              fill="#062F3B"
              stroke="url(#billGrad)"
              strokeWidth="3.5"
              filter="url(#softShadow)"
            />
            <circle cx="0" cy="0" r="14" fill="none" stroke="#A3E635" strokeWidth="2.5" />
            <text
              x="0"
              y="5"
              textAnchor="middle"
              fill="#A3E635"
              fontSize="15"
              fontWeight="bold"
              fontFamily="sans-serif"
            >
              $
            </text>
            <circle cx="-36" cy="-18" r="2.5" fill="#10B981" />
            <circle cx="36" cy="-18" r="2.5" fill="#10B981" />
            <circle cx="-36" cy="18" r="2.5" fill="#10B981" />
            <circle cx="36" cy="18" r="2.5" fill="#10B981" />
          </g>

          {/* 4. Flecha curva con movimiento circular ascendente antihorario (el "vuelto") */}
          <g className="vuelto-return-arrow">
            <path
              d="M -38,28 A 44 44 0 1 1 35,18"
              fill="none"
              stroke="#A3E635"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <polygon
              points="35,10 44,22 30,24"
              fill="#A3E635"
            />
          </g>
        </svg>
      </div>

      {/* 5. Entrada de la tipografía "vuelto" geométrica blanca */}
      <div className="vuelto-brand-text" style={{ textAlign: 'center', marginTop: '16px' }}>
        <h1
          style={{
            fontSize: '44px',
            fontWeight: '900',
            color: '#FFFFFF',
            letterSpacing: '3px',
            lineHeight: 1,
            margin: 0,
            textShadow: '0 4px 18px rgba(0, 0, 0, 0.4)',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Inter", sans-serif',
          }}
        >
          vuelto
          <span style={{ color: '#A3E635' }}>.</span>
        </h1>
        <p
          className="vuelto-tagline-text"
          style={{
            fontSize: '11px',
            fontWeight: '700',
            color: '#A3E635',
            marginTop: '8px',
            textTransform: 'uppercase',
            fontFamily: 'monospace, sans-serif',
          }}
        >
          PUNTO DE VENTA & FACTURACIÓN INTELIGENTE
        </p>
      </div>

      {/* Botón sutil de Saltar / Continuar */}
      <button
        onClick={handleSkip}
        style={{
          position: 'absolute',
          bottom: '28px',
          backgroundColor: 'rgba(255, 255, 255, 0.08)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          color: '#94A3B8',
          fontSize: '12px',
          fontWeight: '600',
          padding: '8px 18px',
          borderRadius: '20px',
          cursor: 'pointer',
          backdropFilter: 'blur(8px)',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = '#FFFFFF';
          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.16)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = '#94A3B8';
          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
        }}
      >
        Saltar intro →
      </button>
    </div>
  );
};

// =========================================================================
// 🚀 MODAL DE ONBOARDING INTERACTIVO PARA COMERCIOS VENEZOLANOS
// =========================================================================
export const VueltoOnboardingModal: React.FC<{ onClose: () => void; onPlaySplash: () => void }> = ({ onClose, onPlaySplash }) => {
  const [step, setStep] = useState(0);

  const steps = [
    {
      title: '📸 Escáner con Cámara & Control de Margen en Vivo',
      desc: 'Agrega productos en segundos leyendo códigos EAN-13 / 759 directamente con la cámara de tu teléfono o laptop. Al ingresar el costo al mayor y precio de salida, el sistema calcula tu ganancia neta en $ y margen % al instante.',
      badge: 'Facturación Ágil',
      highlight: '¡Evita pérdidas de inventario fijando márgenes reales!',
    },
    {
      title: '💱 Monitor Multitasa SENIAT & Protección Inflacionaria',
      desc: 'Consulta en tiempo real la Tasa Oficial BCV, Paralelo, Euro y USDT Binance. Al emitir una factura, la tasa se congela legalmente según la Providencia 0071, calculando automáticamente el 3% de IGTF en pagos en divisas.',
      badge: 'Cumplimiento Legal SENIAT',
      highlight: 'Soporte bimoneda integral con historial de 7 días.',
    },
    {
      title: '💬 Cobranza con Mora & Reposición por WhatsApp en 1 Clic',
      desc: 'Recupera el dinero de tus cuentas por cobrar enviando recordatorios formales a clientes con recargo por mora configurable. Además, genera órdenes de compra a proveedores con lo que necesitas reponer con un solo clic.',
      badge: 'Flujo de Caja Garantizado',
      highlight: 'Abre directo en WhatsApp sin configurar APIs costosas.',
    },
  ];

  const current = steps[step];

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(7, 31, 39, 0.85)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
      <div style={{ maxWidth: '520px', width: '100%', backgroundColor: '#0B3B49', borderRadius: '20px', border: '1px solid #10B98155', padding: '32px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)', color: '#F8FAFC', position: 'relative' }}>
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: '18px', right: '18px', background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}
        >
          <X size={20} />
        </button>

        <div style={{ display: 'inline-flex', padding: '6px 14px', borderRadius: '20px', backgroundColor: '#10B98122', border: '1px solid #10B981', color: '#A3E635', fontSize: '11px', fontWeight: 'bold', marginBottom: '16px' }}>
          {current.badge} • Paso {step + 1} de 3
        </div>

        <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#FFFFFF', marginBottom: '12px', lineHeight: 1.3 }}>
          {current.title}
        </h3>

        <p style={{ fontSize: '14px', color: '#CBD5E1', lineHeight: 1.6, marginBottom: '20px' }}>
          {current.desc}
        </p>

        <div style={{ backgroundColor: '#062F3B', padding: '12px 16px', borderRadius: '10px', borderLeft: '4px solid #A3E635', fontSize: '13px', color: '#A3E635', marginBottom: '28px' }}>
          💡 {current.highlight}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #155E75', paddingTop: '18px' }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            {steps.map((_, i) => (
              <div
                key={i}
                style={{
                  width: i === step ? '24px' : '8px',
                  height: '8px',
                  borderRadius: '4px',
                  backgroundColor: i === step ? '#A3E635' : '#155E75',
                  transition: 'all 0.2s',
                }}
              />
            ))}
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            {step > 0 && (
              <button
                onClick={() => setStep(step - 1)}
                style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #155E75', backgroundColor: '#062F3B', color: '#CBD5E1', fontSize: '13px', cursor: 'pointer' }}
              >
                Anterior
              </button>
            )}

            {step < steps.length - 1 ? (
              <button
                onClick={() => setStep(step + 1)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 18px', borderRadius: '8px', border: 'none', backgroundColor: '#10B981', color: '#FFFFFF', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}
              >
                <span>Siguiente</span>
                <ChevronRight size={16} />
              </button>
            ) : (
              <button
                onClick={onClose}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 20px', borderRadius: '8px', border: 'none', backgroundColor: '#A3E635', color: '#062F3B', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}
              >
                <span>¡Entendido, Empezar!</span>
                <Check size={16} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export const App = () => {
  // Control de Animación Splash / Intro y Onboarding
  const [showSplash, setShowSplash] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('vuelto_splash_shown') !== 'true';
    } catch {
      return true;
    }
  });
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false);

  // Estado de Autenticación con Persistencia Robusta
  const [token, setToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem('vuelto_token');
    } catch {
      return null;
    }
  });
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem('vuelto_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Verificación de Sesión en segundo plano (no desloguea en recarga)
  useEffect(() => {
    const savedToken = localStorage.getItem('vuelto_token');
    if (savedToken) {
      fetch('/api/v1/exchange-rates/monitor', {
        headers: { Authorization: 'Bearer ' + savedToken },
      })
        .then((res) => {
          if (res.status === 401) {
            console.warn('Sesión revocada o expirada. Solicitando credenciales.');
            localStorage.removeItem('vuelto_token');
            localStorage.removeItem('vuelto_user');
            setToken(null);
            setUser(null);
          }
        })
        .catch(() => {});
    }

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'vuelto_token') setToken(e.newValue);
      if (e.key === 'vuelto_user') {
        try { setUser(e.newValue ? JSON.parse(e.newValue) : null); } catch { setUser(null); }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Credenciales en Login
  const [loginUsername, setLoginUsername] = useState('admin');
  const [loginPassword, setLoginPassword] = useState('password');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Navegación Activa
  const [activeTab, setActiveTab] = useState<'METRICS' | 'INVENTORY' | 'LOW_STOCK' | 'RECEIVABLES' | 'SALES' | 'RATES' | 'CASHIERS'>('METRICS');

  // Tasa BCV y Monitor
  const [bcvRate, setBcvRate] = useState(DEFAULT_BCV_RATE);
  const [ratesData, setRatesData] = useState<any>(null);

  // Inventario y Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [inventoryList, setInventoryList] = useState<ProductItem[]>([
    {
      id: 'p1',
      name: 'Harina PAN Blanca 1kg',
      barcode: '7591001001015',
      sku: 'HAR-001',
      category: 'Alimentos',
      supplier: 'Empresas Polar C.A.',
      supplierPhone: '+584141234567',
      costPriceUsd: 0.95,
      salePriceUsd: 1.35,
      taxRate: 0,
      stock: 45,
      minStockAlert: 20,
      lastPurchaseDate: '2026-11-20',
      inflationDeltaPercent: 3.2,
    },
    {
      id: 'p2',
      name: 'Arroz Primor Grano Entero 1kg',
      barcode: '7591002002022',
      sku: 'ARR-002',
      category: 'Alimentos',
      supplier: 'Alimentos Polar',
      supplierPhone: '+584141234567',
      costPriceUsd: 1.10,
      salePriceUsd: 1.55,
      taxRate: 0,
      stock: 8, // Stock Bajo
      minStockAlert: 15,
      lastPurchaseDate: '2026-11-18',
      inflationDeltaPercent: 4.8,
    },
    {
      id: 'p3',
      name: 'Aceite de Maíz Mazeite 1L',
      barcode: '7591003003039',
      sku: 'ACE-003',
      category: 'Alimentos',
      supplier: 'Distribuidora Central',
      supplierPhone: '+584129876543',
      costPriceUsd: 2.80,
      salePriceUsd: 3.80,
      taxRate: 16,
      stock: 5, // Stock Bajo
      minStockAlert: 12,
      lastPurchaseDate: '2026-11-15',
      inflationDeltaPercent: 6.5,
    },
    {
      id: 'p4',
      name: 'Queso Blanco Llanero (Balanza)',
      barcode: '2000045007505',
      sku: '2000045',
      category: 'Charcutería',
      supplier: 'Lácteos Los Andes',
      supplierPhone: '+584245551234',
      costPriceUsd: 4.20,
      salePriceUsd: 5.90,
      taxRate: 0,
      stock: 22.5,
      minStockAlert: 10,
      lastPurchaseDate: '2026-11-22',
      inflationDeltaPercent: 1.5,
    },
    {
      id: 'p5',
      name: 'Refresco Pepsi Cola 1.5L',
      barcode: '7591004004046',
      sku: 'REF-005',
      category: 'Bebidas',
      supplier: 'Pepsico Venezuela',
      supplierPhone: '+584160001122',
      costPriceUsd: 1.20,
      salePriceUsd: 1.90,
      taxRate: 16,
      stock: 36,
      minStockAlert: 15,
      lastPurchaseDate: '2026-11-21',
      inflationDeltaPercent: 2.0,
    },
  ]);

  // Modal Nuevo Producto
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addMode, setAddMode] = useState<'MANUAL' | 'CAMERA'>('MANUAL');
  const [newProdName, setNewProdName] = useState('');
  const [newProdBarcode, setNewProdBarcode] = useState('');
  const [newProdCategory, setNewProdCategory] = useState('Alimentos');
  const [newProdSupplier, setNewProdSupplier] = useState('Distribuidora El Éxito C.A.');
  const [newProdSupplierPhone, setNewProdSupplierPhone] = useState('+584141234567');
  const [newProdCostUsd, setNewProdCostUsd] = useState('');
  const [newProdSaleUsd, setNewProdSaleUsd] = useState('');
  const [newProdTaxRate, setNewProdTaxRate] = useState(16);
  const [newProdStock, setNewProdStock] = useState('10');
  const [newProdMinStock, setNewProdMinStock] = useState('5');
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Cobranzas con Mora
  const [surchargeRate, setSurchargeRate] = useState(5); // 5% de mora configurado por admin
  const [customerDebts, setCustomerDebts] = useState<CustomerDebt[]>([
    {
      id: 'c1',
      name: 'Inversiones Los Chaguaramos C.A.',
      document: 'J-309876541',
      phone: '+584149876543',
      balanceDueUsd: 125.00,
      dueDate: '2026-11-20', // Vencido
      isOverdue: true,
      lateDays: 4,
      surchargeUsd: 6.25,
    },
    {
      id: 'c2',
      name: 'María Valentina Rodríguez',
      document: 'V-18765432',
      phone: '+584121234567',
      balanceDueUsd: 45.50,
      dueDate: '2026-11-22', // Vencido
      isOverdue: true,
      lateDays: 2,
      surchargeUsd: 2.28,
    },
    {
      id: 'c3',
      name: 'Panadería La Espiga Dorada',
      document: 'J-401122334',
      phone: '+584165554321',
      balanceDueUsd: 310.00,
      dueDate: '2026-11-28', // Al día
      isOverdue: false,
      lateDays: 0,
      surchargeUsd: 0.00,
    },
  ]);

  // Historial de Ventas y Modal Detalle
  const [selectedSale, setSelectedSale] = useState<SaleRecord | null>(null);
  const [salesHistory, setSalesHistory] = useState<SaleRecord[]>([
    {
      id: 's-101',
      invoiceFormattedNumber: 'FACT-A-00000042',
      createdAt: '2026-11-24 11:45 AM',
      customerName: 'María Rodríguez',
      customerDoc: 'V-15987654',
      cashierName: 'Carlos Mendoza (cajero1)',
      totalUsd: 18.88,
      totalBs: 991.20,
      rateValue: 52.50,
      status: 'COMPLETADA',
      items: [
        { name: 'Harina PAN Blanca 1kg', qty: 4, priceUsd: 1.35, subtotalUsd: 5.40, taxRate: 0 },
        { name: 'Aceite de Maíz Mazeite 1L', qty: 2, priceUsd: 3.80, subtotalUsd: 7.60, taxRate: 16 },
        { name: 'Refresco Pepsi Cola 1.5L', qty: 2, priceUsd: 1.90, subtotalUsd: 3.80, taxRate: 16 },
      ],
      taxes: {
        base16: 11.40,
        base8: 0.00,
        exempt: 5.40,
        tax16: 1.82,
        tax8: 0.00,
        igtf3: 0.26, // Pago en USD efectivo
      },
    },
    {
      id: 's-100',
      invoiceFormattedNumber: 'FACT-A-00000041',
      createdAt: '2026-11-24 11:20 AM',
      customerName: 'Juan Silva',
      customerDoc: 'V-12345678',
      cashierName: 'Carlos Mendoza (cajero1)',
      totalUsd: 4.50,
      totalBs: 236.25,
      rateValue: 52.50,
      status: 'COMPLETADA',
      items: [
        { name: 'Arroz Primor Grano Entero 1kg', qty: 2, priceUsd: 1.55, subtotalUsd: 3.10, taxRate: 0 },
        { name: 'Harina PAN Blanca 1kg', qty: 1, priceUsd: 1.35, subtotalUsd: 1.35, taxRate: 0 },
      ],
      taxes: { base16: 0, base8: 0, exempt: 4.45, tax16: 0, tax8: 0, igtf3: 0.05 },
    },
  ]);

  // Vendedores en Vivo
  const [cashiersList, setCashiersList] = useState<CashierStatus[]>([
    {
      id: 'usr-1',
      name: 'Carlos Mendoza',
      username: 'cajero1',
      status: 'ONLINE',
      openCartsCount: 2, // 2 cuentas abiertas en mostrador
      salesTodayCount: 28,
      salesTodayUsd: 485.60,
      salesTodayBs: 25494.00,
      lastAction: 'Escaneo de EAN-13 7591001001015 (Harina PAN)',
      lastActionTime: 'Hace 2 minutos',
    },
    {
      id: 'usr-2',
      name: 'Ana Gómez',
      username: 'cajero2',
      status: 'ONLINE',
      openCartsCount: 1,
      salesTodayCount: 19,
      salesTodayUsd: 312.40,
      salesTodayBs: 16401.00,
      lastAction: 'Cobro de factura en USD efectivo e IGTF',
      lastActionTime: 'Hace 6 minutos',
    },
  ]);

  // Consultar tasas al cargar
  useEffect(() => {
    fetch('/api/v1/exchange-rates/monitor')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setRatesData(data);
          if (data.bcv?.rate) setBcvRate(data.bcv.rate);
        }
      })
      .catch(() => {});
  }, []);

  // Manejo de Cámara
  useEffect(() => {
    if (cameraActive && addMode === 'CAMERA') {
      navigator.mediaDevices
        ?.getUserMedia({ video: { facingMode: 'environment' } })
        .then((stream) => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play();
          }
        })
        .catch(() => {
          alert('No se pudo acceder a la cámara web. Puedes ingresar el código manualmente.');
          setAddMode('MANUAL');
        });
    } else {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
    }
  }, [cameraActive, addMode]);

  // Iniciar Sesión Real
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError('');

    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUsername, password: loginPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Credenciales inválidas');
      }

      localStorage.setItem('vuelto_token', data.tokens.accessToken);
      localStorage.setItem('vuelto_user', JSON.stringify(data.user));
      setToken(data.tokens.accessToken);
      setUser(data.user);
    } catch (err: any) {
      setLoginError(err.message || 'Error al conectar con el servidor.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('vuelto_token');
    localStorage.removeItem('vuelto_user');
    setToken(null);
    setUser(null);
  };

  // Cálculos de Margen en Vivo
  const costNum = parseFloat(newProdCostUsd) || 0;
  const saleNum = parseFloat(newProdSaleUsd) || 0;
  const profitUsd = saleNum > 0 ? saleNum - costNum : 0;
  const marginPercent = saleNum > 0 ? ((profitUsd / saleNum) * 100).toFixed(1) : '0.0';

  // Valuación total de inventario
  const totalInventoryCostUsd = inventoryList.reduce((acc, p) => acc + p.costPriceUsd * p.stock, 0);
  const totalInventoryRetailUsd = inventoryList.reduce((acc, p) => acc + p.salePriceUsd * p.stock, 0);
  const totalProjectedProfitUsd = totalInventoryRetailUsd - totalInventoryCostUsd;
  const averageMargin = totalInventoryRetailUsd > 0 ? ((totalProjectedProfitUsd / totalInventoryRetailUsd) * 100).toFixed(1) : '0';

  // Productos con stock bajo
  const lowStockItems = inventoryList.filter((p) => p.stock <= p.minStockAlert);

  // Guardar Nuevo Producto
  const handleSaveProduct = () => {
    if (!newProdName || !newProdSaleUsd) {
      alert('Por favor ingrese el nombre y precio de salida del producto.');
      return;
    }

    const newProd: ProductItem = {
      id: `p-${Date.now()}`,
      name: newProdName,
      barcode: newProdBarcode || `759${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      category: newProdCategory,
      supplier: newProdSupplier,
      supplierPhone: newProdSupplierPhone,
      costPriceUsd: costNum,
      salePriceUsd: saleNum,
      taxRate: newProdTaxRate,
      stock: parseFloat(newProdStock) || 0,
      minStockAlert: parseFloat(newProdMinStock) || 5,
      lastPurchaseDate: new Date().toISOString().split('T')[0],
      inflationDeltaPercent: 0,
    };

    setInventoryList([newProd, ...inventoryList]);
    setIsAddModalOpen(false);
    setCameraActive(false);
    setNewProdName('');
    setNewProdBarcode('');
    setNewProdCostUsd('');
    setNewProdSaleUsd('');
  };

  // Enviar Pedido a Proveedor por WhatsApp
  const handleSendPurchaseOrderWhatsApp = (item: ProductItem) => {
    const qtyToOrder = Math.max(item.minStockAlert * 2 - item.stock, 10);
    const totalEstUsd = (qtyToOrder * item.costPriceUsd).toFixed(2);
    const totalEstBs = (parseFloat(totalEstUsd) * bcvRate).toFixed(2);

    const message = encodeURIComponent(
      `¡Hola ${item.supplier}! Le escribe ${user?.businessName || 'Bodega Central'}.\n\n` +
      `📦 *ORDEN DE PEDIDO URGENTE POR STOCK BAJO*\n` +
      `• Producto: *${item.name}*\n` +
      `• Código/EAN: ${item.barcode}\n` +
      `• Cantidad Requerida: *${qtyToOrder} unidades*\n` +
      `• Costo al mayor acordado: $${item.costPriceUsd.toFixed(2)} c/u\n` +
      `• Total Estimado: $${totalEstUsd} (~${totalEstBs} Bs)\n\n` +
      `Por favor confirmar disponibilidad y fecha estimada de despacho. ¡Muchas gracias!`
    );

    const cleanPhone = item.supplierPhone.replace(/[^0-9]/g, '');
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
  };

  // Enviar Cobro a Cliente por WhatsApp
  const handleSendDebtReminderWhatsApp = (debt: CustomerDebt) => {
    const totalDue = (debt.balanceDueUsd + debt.surchargeUsd).toFixed(2);
    const totalDueBs = (parseFloat(totalDue) * bcvRate).toFixed(2);

    const message = encodeURIComponent(
      `Estimado(a) *${debt.name}*, le saludamos cordialmente de *${user?.businessName || 'Bodega Central'}*.\n\n` +
      `📄 Le recordamos que presenta un saldo pendiente en cuenta corriente:\n` +
      `• Saldo Original: $${debt.balanceDueUsd.toFixed(2)}\n` +
      (debt.isOverdue ? `• Recargo por Mora (${debt.lateDays} días de vencimiento): +$${debt.surchargeUsd.toFixed(2)}\n` : '') +
      `• *TOTAL A CANCELAR:* *$${totalDue}* (equivalente a *${totalDueBs} Bs* a tasa BCV del día).\n` +
      `• Fecha límite: ${debt.dueDate}\n\n` +
      `Puede cancelar en nuestra tienda en efectivo/divisas o mediante Pago Móvil.\n` +
      `Agradecemos su pronta confirmación y pago. ¡Que tenga un excelente día!`
    );

    const cleanPhone = debt.phone.replace(/[^0-9]/g, '');
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
  };

  // Si no está autenticado, renderizar Login Dinámico
  if (!token) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#071F27', backgroundImage: 'radial-gradient(circle at 50% 25%, #0B3B49 0%, #071F27 100%)', alignItems: 'center', justifyContent: 'center', padding: '20px', position: 'relative' }}>
        {showSplash && <VueltoSplashScreen onFinish={() => setShowSplash(false)} />}
        {showOnboarding && <VueltoOnboardingModal onClose={() => setShowOnboarding(false)} onPlaySplash={() => { setShowOnboarding(false); setShowSplash(true); }} />}
        <div style={{ maxWidth: '420px', width: '100%', backgroundColor: '#1E293B', borderRadius: '16px', padding: '36px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)', border: '1px solid #334155' }}>
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div style={{ display: 'inline-flex', padding: '14px', borderRadius: '50%', backgroundColor: '#0284C722', color: '#38BDF8', marginBottom: '12px' }}>
              <Store size={36} />
            </div>
            <h1 style={{ fontSize: '26px', fontWeight: 'bold', color: '#F8FAFC', letterSpacing: '0.5px' }}>VUELTO POS</h1>
            <p style={{ fontSize: '13px', color: '#94A3B8', marginTop: '4px' }}>Facturación e Inventario con Soporte SENIAT</p>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: '#0284C722', border: '1px solid #0284C744', borderRadius: '20px', padding: '4px 12px', marginTop: '12px', fontSize: '12px', color: '#38BDF8' }}>
              <span>🇻🇪 Tasa Oficial BCV:</span>
              <strong>{bcvRate.toFixed(2)} Bs/$</strong>
            </div>
          </div>

          {loginError && (
            <div style={{ backgroundColor: '#EF444422', border: '1px solid #EF4444', color: '#FCA5A5', padding: '12px', borderRadius: '8px', fontSize: '13px', marginBottom: '20px' }}>
              {loginError}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#CBD5E1', marginBottom: '6px' }}>Usuario</label>
              <input
                type="text"
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                required
                style={{ width: '100%', padding: '12px 14px', borderRadius: '8px', border: '1px solid #475569', backgroundColor: '#0F172A', color: '#FFFFFF', fontSize: '14px', outline: 'none' }}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#CBD5E1', marginBottom: '6px' }}>Contraseña</label>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
                style={{ width: '100%', padding: '12px 14px', borderRadius: '8px', border: '1px solid #475569', backgroundColor: '#0F172A', color: '#FFFFFF', fontSize: '14px', outline: 'none' }}
              />
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              style={{ width: '100%', padding: '14px', borderRadius: '8px', border: 'none', backgroundColor: '#0284C7', color: '#FFFFFF', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer', transition: 'background 0.2s' }}
            >
              {loginLoading ? 'Conectando a Supabase...' : 'Ingresar al Sistema'}
            </button>
          </form>

          <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #334155', textAlign: 'center' }}>
            <p style={{ fontSize: '12px', color: '#64748B', marginBottom: '8px' }}>Accesos de Demostración:</p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '14px' }}>
              <button
                type="button"
                onClick={() => { setLoginUsername('admin'); setLoginPassword('password'); }}
                style={{ fontSize: '11px', padding: '6px 12px', borderRadius: '6px', border: '1px solid #10B98144', backgroundColor: '#062F3B', color: '#38BDF8', cursor: 'pointer' }}
              >
                Cargar Admin Demo
              </button>
              <button
                type="button"
                onClick={() => { setLoginUsername('cajero1'); setLoginPassword('password'); }}
                style={{ fontSize: '11px', padding: '6px 12px', borderRadius: '6px', border: '1px solid #10B98144', backgroundColor: '#062F3B', color: '#A3E635', cursor: 'pointer' }}
              >
                Cargar Cajero Demo
              </button>
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => setShowSplash(true)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px', padding: '5px 12px', borderRadius: '6px', border: '1px solid #155E75', backgroundColor: 'transparent', color: '#A3E635', cursor: 'pointer' }}
              >
                <Play size={12} />
                <span>Ver Intro de Marca</span>
              </button>
              <button
                type="button"
                onClick={() => setShowOnboarding(true)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px', padding: '5px 12px', borderRadius: '6px', border: '1px solid #155E75', backgroundColor: 'transparent', color: '#38BDF8', cursor: 'pointer' }}
              >
                <HelpCircle size={12} />
                <span>Guía Rápida</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#071F27', color: '#F8FAFC', position: 'relative' }}>
      {showSplash && <VueltoSplashScreen onFinish={() => setShowSplash(false)} />}
      {showOnboarding && <VueltoOnboardingModal onClose={() => setShowOnboarding(false)} onPlaySplash={() => { setShowOnboarding(false); setShowSplash(true); }} />}
      {/* SIDEBAR LATERAL */}
      <aside style={{ width: '280px', backgroundColor: '#1E293B', padding: '24px 16px', borderRight: '1px solid #334155', display: 'flex', flexDirection: 'column' }}>
        <div style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: '#0284C7', color: '#FFFFFF' }}>
              <Store size={22} />
            </div>
            <div>
              <h1 style={{ fontSize: '20px', fontWeight: 'bold', color: '#38BDF8', lineHeight: 1 }}>VUELTO</h1>
              <span style={{ fontSize: '10px', color: '#10B981', fontWeight: 'bold' }}>● Supabase Cloud Conectada</span>
            </div>
          </div>
          <p style={{ fontSize: '11px', color: '#94A3B8' }}>{user?.businessName || 'Inversiones Bodega Central C.A.'}</p>
        </div>

        {/* NAVEGACIÓN */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
          {[
            { id: 'METRICS', label: 'Dashboard & Finanzas', icon: <TrendingUp size={18} /> },
            { id: 'INVENTORY', label: 'Inventario & Catálogo', icon: <Package size={18} /> },
            { id: 'LOW_STOCK', label: 'Stock Bajo & Pedidos', icon: <AlertTriangle size={18} />, badge: lowStockItems.length },
            { id: 'RECEIVABLES', label: 'Cobranzas & Mora', icon: <DollarSign size={18} />, badge: customerDebts.filter(c => c.isOverdue).length },
            { id: 'SALES', label: 'Ventas & Facturas', icon: <FileText size={18} /> },
            { id: 'RATES', label: 'Tasas de Cambio', icon: <RefreshCw size={18} /> },
            { id: 'CASHIERS', label: 'Vendedores en Vivo', icon: <Users size={18} /> },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 14px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: activeTab === item.id ? 'bold' : '500',
                backgroundColor: activeTab === item.id ? '#0284C7' : 'transparent',
                color: activeTab === item.id ? '#FFFFFF' : '#94A3B8',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {item.icon}
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && item.badge > 0 && (
                <span style={{ backgroundColor: '#EF4444', color: '#FFFFFF', padding: '2px 7px', borderRadius: '10px', fontSize: '11px', fontWeight: 'bold' }}>
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* BOTONES DE EXPERIENCIA SENIOR */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '16px' }}>
          <button
            onClick={() => setShowSplash(true)}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '8px 10px', borderRadius: '8px', border: '1px solid #10B98144', backgroundColor: '#062F3B', color: '#A3E635', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            <Play size={13} />
            <span>Intro</span>
          </button>
          <button
            onClick={() => setShowOnboarding(true)}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '8px 10px', borderRadius: '8px', border: '1px solid #155E75', backgroundColor: '#062F3B', color: '#38BDF8', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            <HelpCircle size={13} />
            <span>Guía</span>
          </button>
        </div>

        {/* MONITOR DE TASA EN SIDEBAR */}
        <div style={{ backgroundColor: '#062F3B', padding: '14px', borderRadius: '10px', border: '1px solid #10B98133', marginBottom: '16px' }}>
          <p style={{ fontSize: '11px', color: '#64748B', marginBottom: '2px' }}>Tasa Oficial BCV:</p>
          <p style={{ fontSize: '17px', fontWeight: 'bold', color: '#10B981' }}>{bcvRate.toFixed(2)} Bs / USD</p>
          <p style={{ fontSize: '10px', color: '#94A3B8', marginTop: '2px' }}>Congelamiento por factura</p>
        </div>

        {/* PERFIL DE USUARIO Y LOGOUT */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '14px', borderTop: '1px solid #334155' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#0284C7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '13px' }}>
              {user?.fullName?.charAt(0) || 'A'}
            </div>
            <div>
              <p style={{ fontSize: '12px', fontWeight: 'bold', color: '#F8FAFC' }}>{user?.fullName || 'Administrador'}</p>
              <p style={{ fontSize: '10px', color: '#38BDF8' }}>Rol: {user?.roleId || 'ADMIN'}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Cerrar Sesión"
            style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '6px' }}
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      {/* ÁREA DE CONTENIDO PRINCIPAL */}
      <main style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>
        {/* TAB 1: DASHBOARD Y FINANZAS */}
        {activeTab === 'METRICS' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
              <div>
                <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>Dashboard de Operaciones y Finanzas</h2>
                <p style={{ color: '#94A3B8', fontSize: '14px' }}>Monitoreo bimoneda, valuación de activos, recaudación fiscal y recomendaciones.</p>
              </div>

              {/* Botón Descargar Libro SENIAT */}
              <button
                onClick={() => window.open('/api/v1/reports/sales-book/csv', '_blank')}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#16A34A', color: '#FFFFFF', padding: '10px 16px', borderRadius: '8px', border: 'none', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}
              >
                <FileText size={16} />
                <span>Libro de Ventas SENIAT (CSV)</span>
              </button>
            </div>

            {/* TARJETAS KPI */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              <div style={{ backgroundColor: '#1E293B', padding: '18px', borderRadius: '12px', border: '1px solid #334155' }}>
                <p style={{ fontSize: '12px', color: '#94A3B8' }}>Ventas del Día (USD)</p>
                <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#F8FAFC', marginTop: '4px' }}>$798.00</p>
                <p style={{ fontSize: '12px', color: '#10B981', marginTop: '4px' }}>≈ {(798 * bcvRate).toLocaleString()} Bs</p>
              </div>

              <div style={{ backgroundColor: '#1E293B', padding: '18px', borderRadius: '12px', border: '1px solid #334155' }}>
                <p style={{ fontSize: '12px', color: '#94A3B8' }}>Valuación Total Inventario (Costo)</p>
                <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#38BDF8', marginTop: '4px' }}>${totalInventoryCostUsd.toFixed(2)}</p>
                <p style={{ fontSize: '12px', color: '#94A3B8', marginTop: '4px' }}>Costo de compra acumulado</p>
              </div>

              <div style={{ backgroundColor: '#1E293B', padding: '18px', borderRadius: '12px', border: '1px solid #334155' }}>
                <p style={{ fontSize: '12px', color: '#94A3B8' }}>Proyección Venta & Margen</p>
                <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#10B981', marginTop: '4px' }}>${totalInventoryRetailUsd.toFixed(2)}</p>
                <p style={{ fontSize: '12px', color: '#10B981', marginTop: '4px' }}>Margen global: +{averageMargin}% (+${totalProjectedProfitUsd.toFixed(2)})</p>
              </div>

              <div style={{ backgroundColor: '#1E293B', padding: '18px', borderRadius: '12px', border: '1px solid #334155' }}>
                <p style={{ fontSize: '12px', color: '#94A3B8' }}>Impuestos IGTF 3% Percibido</p>
                <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#F59E0B', marginTop: '4px' }}>$23.94</p>
                <p style={{ fontSize: '12px', color: '#94A3B8', marginTop: '4px' }}>Sobre pagos en divisas efectivo</p>
              </div>
            </div>

            {/* SECCIÓN DE RECOMENDACIONES DE ADMINISTRACIÓN & COMPARADOR DE INFLACIÓN */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '28px' }}>
              {/* Recomendaciones Inteligentes */}
              <div style={{ backgroundColor: '#1E293B', padding: '20px', borderRadius: '12px', border: '1px solid #334155' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                  <Zap size={20} color="#F59E0B" />
                  <h3 style={{ fontSize: '16px', fontWeight: 'bold' }}>Recomendaciones de Administración</h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#F59E0B15', border: '1px solid #F59E0B44', fontSize: '13px' }}>
                    <strong>⚠️ Alerta de Reposición:</strong> {lowStockItems.length} productos están en su límite crítico de stock. Te recomendamos abrir la pestaña <em>Stock Bajo</em> y enviar las órdenes por WhatsApp.
                  </div>
                  <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#38BDF815', border: '1px solid #38BDF844', fontSize: '13px' }}>
                    <strong>💡 Protección Cambiaria:</strong> La tasa paralela subió +1.51%. El margen promedio del inventario es de {averageMargin}%. Mantén actualizados los precios de salida en divisas para evitar descapitalización.
                  </div>
                </div>
              </div>

              {/* Comparador de Inflación en Últimas Compras */}
              <div style={{ backgroundColor: '#1E293B', padding: '20px', borderRadius: '12px', border: '1px solid #334155' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                  <TrendingUp size={20} color="#38BDF8" />
                  <h3 style={{ fontSize: '16px', fontWeight: 'bold' }}>Variación de Costos de Reposición</h3>
                </div>
                <table style={{ width: '100%', fontSize: '12px', textAlign: 'left', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ color: '#94A3B8', borderBottom: '1px solid #334155' }}>
                      <th style={{ padding: '8px' }}>Producto</th>
                      <th style={{ padding: '8px' }}>Costo Mayor</th>
                      <th style={{ padding: '8px' }}>Precio Salida</th>
                      <th style={{ padding: '8px' }}>Inflación Proveedor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventoryList.slice(0, 3).map((item) => (
                      <tr key={item.id} style={{ borderBottom: '1px solid #33415544' }}>
                        <td style={{ padding: '8px', fontWeight: 'bold' }}>{item.name}</td>
                        <td style={{ padding: '8px' }}>${item.costPriceUsd.toFixed(2)}</td>
                        <td style={{ padding: '8px', color: '#10B981', fontWeight: 'bold' }}>${item.salePriceUsd.toFixed(2)}</td>
                        <td style={{ padding: '8px', color: '#F59E0B', fontWeight: 'bold' }}>+{item.inflationDeltaPercent}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: INVENTARIO & CATÁLOGO */}
        {activeTab === 'INVENTORY' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>Catálogo de Productos e Inventario</h2>
                <p style={{ color: '#94A3B8', fontSize: '13px' }}>Control de códigos EAN-13 (759), balanza, costo al mayor y margen de ganancia.</p>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => { setIsAddModalOpen(true); setAddMode('MANUAL'); setCameraActive(false); }}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#0284C7', color: '#FFFFFF', padding: '10px 16px', borderRadius: '8px', border: 'none', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}
                >
                  <Plus size={16} />
                  <span>Nuevo Producto</span>
                </button>

                <button
                  onClick={() => { setIsAddModalOpen(true); setAddMode('CAMERA'); setCameraActive(true); }}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#10B981', color: '#FFFFFF', padding: '10px 16px', borderRadius: '8px', border: 'none', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}
                >
                  <Camera size={16} />
                  <span>Escanear con Cámara</span>
                </button>
              </div>
            </div>

            {/* Barra de Búsqueda */}
            <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#1E293B', padding: '10px 16px', borderRadius: '10px', border: '1px solid #334155', marginBottom: '20px' }}>
              <Search size={18} color="#94A3B8" />
              <input
                type="text"
                placeholder="Buscar por nombre, código de barra (759...) o categoría..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ flex: 1, background: 'none', border: 'none', color: '#FFFFFF', marginLeft: '10px', outline: 'none', fontSize: '14px' }}
              />
            </div>

            {/* Tabla de Productos */}
            <div style={{ backgroundColor: '#1E293B', borderRadius: '12px', border: '1px solid #334155', overflow: 'hidden' }}>
              <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#0F172A', color: '#94A3B8', borderBottom: '1px solid #334155' }}>
                    <th style={{ padding: '12px 16px' }}>Código</th>
                    <th style={{ padding: '12px 16px' }}>Producto</th>
                    <th style={{ padding: '12px 16px' }}>Proveedor</th>
                    <th style={{ padding: '12px 16px' }}>Costo Mayor ($)</th>
                    <th style={{ padding: '12px 16px' }}>Precio Salida ($)</th>
                    <th style={{ padding: '12px 16px' }}>Precio Salida (Bs)</th>
                    <th style={{ padding: '12px 16px' }}>Margen Ganancia</th>
                    <th style={{ padding: '12px 16px' }}>Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {inventoryList
                    .filter((p) => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.barcode.includes(searchTerm))
                    .map((item) => {
                      const itemProfit = item.salePriceUsd - item.costPriceUsd;
                      const itemMargin = ((itemProfit / item.salePriceUsd) * 100).toFixed(1);
                      const isLow = item.stock <= item.minStockAlert;

                      return (
                        <tr key={item.id} style={{ borderBottom: '1px solid #334155' }}>
                          <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#38BDF8' }}>{item.barcode}</td>
                          <td style={{ padding: '12px 16px', fontWeight: 'bold' }}>{item.name}</td>
                          <td style={{ padding: '12px 16px', color: '#94A3B8' }}>{item.supplier}</td>
                          <td style={{ padding: '12px 16px' }}>${item.costPriceUsd.toFixed(2)}</td>
                          <td style={{ padding: '12px 16px', fontWeight: 'bold', color: '#10B981' }}>${item.salePriceUsd.toFixed(2)}</td>
                          <td style={{ padding: '12px 16px', color: '#CBD5E1' }}>{(item.salePriceUsd * bcvRate).toFixed(2)} Bs</td>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{ backgroundColor: '#10B98122', color: '#10B981', padding: '3px 8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '11px' }}>
                              +{itemMargin}% (+${itemProfit.toFixed(2)})
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{ backgroundColor: isLow ? '#EF444422' : '#0284C722', color: isLow ? '#EF4444' : '#38BDF8', padding: '3px 8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '12px' }}>
                              {item.stock} unids {isLow && '⚠️ Bajo'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: STOCK BAJO Y PEDIDOS WHATSAPP */}
        {activeTab === 'LOW_STOCK' && (
          <div>
            <div style={{ marginBottom: '24px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle color="#EF4444" size={24} />
                <span>Productos en Stock Crítico & Órdenes a Proveedores</span>
              </h2>
              <p style={{ color: '#94A3B8', fontSize: '13px' }}>Genera órdenes de reposición inmediatas y envíalas directamente por WhatsApp al proveedor.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
              {lowStockItems.map((item) => {
                const suggestedQty = Math.max(item.minStockAlert * 2 - item.stock, 10);
                const orderTotalUsd = (suggestedQty * item.costPriceUsd).toFixed(2);

                return (
                  <div key={item.id} style={{ backgroundColor: '#1E293B', padding: '20px', borderRadius: '12px', border: '1px solid #EF444466' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <span style={{ backgroundColor: '#EF444422', color: '#EF4444', fontSize: '11px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '4px' }}>
                          ¡Stock Crítico! Quedan {item.stock} unids
                        </span>
                        <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginTop: '8px' }}>{item.name}</h3>
                        <p style={{ fontSize: '12px', color: '#94A3B8' }}>Código: {item.barcode}</p>
                      </div>
                    </div>

                    <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#0F172A', borderRadius: '8px', fontSize: '12px' }}>
                      <p><strong>Proveedor:</strong> {item.supplier}</p>
                      <p><strong>Teléfono WhatsApp:</strong> {item.supplierPhone}</p>
                      <p><strong>Costo al Mayor:</strong> ${item.costPriceUsd.toFixed(2)} c/u</p>
                      <p style={{ marginTop: '4px', color: '#10B981', fontWeight: 'bold' }}>
                        Reposición sugerida: {suggestedQty} unids (~${orderTotalUsd})
                      </p>
                    </div>

                    <button
                      onClick={() => handleSendPurchaseOrderWhatsApp(item)}
                      style={{
                        marginTop: '16px',
                        width: '100%',
                        backgroundColor: '#16A34A',
                        color: '#FFFFFF',
                        padding: '12px',
                        borderRadius: '8px',
                        border: 'none',
                        fontWeight: 'bold',
                        fontSize: '13px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                      }}
                    >
                      <MessageCircle size={18} />
                      <span>Generar y Enviar Pedido por WhatsApp</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 4: COBRANZAS, MORA Y WHATSAPP */}
        {activeTab === 'RECEIVABLES' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>Gestión de Cobranzas y Cuentas por Cobrar</h2>
                <p style={{ color: '#94A3B8', fontSize: '13px' }}>Control de vencimientos, recargo automático por mora y recordatorio por WhatsApp.</p>
              </div>

              {/* Ajuste de Recargo por Mora */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#1E293B', padding: '8px 14px', borderRadius: '8px', border: '1px solid #334155' }}>
                <span style={{ fontSize: '12px', color: '#94A3B8' }}>Recargo por Mora:</span>
                <input
                  type="number"
                  value={surchargeRate}
                  onChange={(e) => setSurchargeRate(parseFloat(e.target.value) || 0)}
                  style={{ width: '50px', backgroundColor: '#0F172A', border: '1px solid #475569', color: '#FFFFFF', padding: '4px 6px', borderRadius: '4px', fontSize: '12px', textAlign: 'center' }}
                />
                <span style={{ fontSize: '12px', fontWeight: 'bold' }}>%</span>
              </div>
            </div>

            <div style={{ backgroundColor: '#1E293B', borderRadius: '12px', border: '1px solid #334155', overflow: 'hidden' }}>
              <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#0F172A', color: '#94A3B8', borderBottom: '1px solid #334155' }}>
                    <th style={{ padding: '12px 16px' }}>Cliente</th>
                    <th style={{ padding: '12px 16px' }}>Documento</th>
                    <th style={{ padding: '12px 16px' }}>Teléfono</th>
                    <th style={{ padding: '12px 16px' }}>Deuda Base ($)</th>
                    <th style={{ padding: '12px 16px' }}>Fecha Vencimiento</th>
                    <th style={{ padding: '12px 16px' }}>Estado / Mora</th>
                    <th style={{ padding: '12px 16px' }}>Total a Cobrar ($ y Bs)</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center' }}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {customerDebts.map((debt) => {
                    const surcharge = debt.isOverdue ? (debt.balanceDueUsd * (surchargeRate / 100)) : 0;
                    const totalPayUsd = debt.balanceDueUsd + surcharge;
                    const totalPayBs = (totalPayUsd * bcvRate).toFixed(2);

                    return (
                      <tr key={debt.id} style={{ borderBottom: '1px solid #334155' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 'bold' }}>{debt.name}</td>
                        <td style={{ padding: '12px 16px', color: '#38BDF8' }}>{debt.document}</td>
                        <td style={{ padding: '12px 16px' }}>{debt.phone}</td>
                        <td style={{ padding: '12px 16px', fontWeight: 'bold' }}>${debt.balanceDueUsd.toFixed(2)}</td>
                        <td style={{ padding: '12px 16px' }}>{debt.dueDate}</td>
                        <td style={{ padding: '12px 16px' }}>
                          {debt.isOverdue ? (
                            <span style={{ backgroundColor: '#EF444422', color: '#EF4444', padding: '3px 8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '11px' }}>
                              VENCIDO (+{debt.lateDays}d) / Mora +${surcharge.toFixed(2)}
                            </span>
                          ) : (
                            <span style={{ backgroundColor: '#10B98122', color: '#10B981', padding: '3px 8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '11px' }}>
                              AL DÍA
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <strong style={{ color: '#F8FAFC' }}>${totalPayUsd.toFixed(2)}</strong>
                          <span style={{ color: '#94A3B8', fontSize: '11px', display: 'block' }}>({totalPayBs} Bs)</span>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <button
                            onClick={() => handleSendDebtReminderWhatsApp({ ...debt, surchargeUsd: surcharge })}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: '#16A34A', color: '#FFFFFF', padding: '8px 12px', borderRadius: '6px', border: 'none', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}
                          >
                            <MessageCircle size={15} />
                            <span>Cobrar por WhatsApp</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: VENTAS & FACTURAS */}
        {activeTab === 'SALES' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>Facturas y Ventas Emitidas</h2>
                <p style={{ color: '#94A3B8', fontSize: '13px' }}>Consulta de correlativos fiscales, desglose de IVA 16%/8% e IGTF 3% en divisas.</p>
              </div>

              {salesHistory.length > 0 && (
                <button
                  onClick={() => setSelectedSale(salesHistory[0])}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#0284C7', color: '#FFFFFF', padding: '10px 16px', borderRadius: '8px', border: 'none', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}
                >
                  <FileText size={16} />
                  <span>Ver Detalle de Última Venta</span>
                </button>
              )}
            </div>

            <div style={{ backgroundColor: '#1E293B', borderRadius: '12px', border: '1px solid #334155', overflow: 'hidden' }}>
              <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#0F172A', color: '#94A3B8', borderBottom: '1px solid #334155' }}>
                    <th style={{ padding: '12px 16px' }}>Factura Fiscal N°</th>
                    <th style={{ padding: '12px 16px' }}>Fecha / Hora</th>
                    <th style={{ padding: '12px 16px' }}>Cliente</th>
                    <th style={{ padding: '12px 16px' }}>Cajero</th>
                    <th style={{ padding: '12px 16px' }}>Tasa BCV</th>
                    <th style={{ padding: '12px 16px' }}>Total USD</th>
                    <th style={{ padding: '12px 16px' }}>Total Bs</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {salesHistory.map((sale) => (
                    <tr key={sale.id} style={{ borderBottom: '1px solid #334155' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 'bold', color: '#38BDF8' }}>{sale.invoiceFormattedNumber}</td>
                      <td style={{ padding: '12px 16px', color: '#94A3B8' }}>{sale.createdAt}</td>
                      <td style={{ padding: '12px 16px' }}>{sale.customerName}</td>
                      <td style={{ padding: '12px 16px' }}>{sale.cashierName}</td>
                      <td style={{ padding: '12px 16px' }}>{sale.rateValue.toFixed(2)} Bs</td>
                      <td style={{ padding: '12px 16px', fontWeight: 'bold', color: '#F8FAFC' }}>${sale.totalUsd.toFixed(2)}</td>
                      <td style={{ padding: '12px 16px', fontWeight: 'bold', color: '#10B981' }}>{sale.totalBs.toFixed(2)} Bs</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <button
                          onClick={() => setSelectedSale(sale)}
                          style={{ backgroundColor: '#334155', color: '#F8FAFC', padding: '6px 12px', borderRadius: '6px', border: 'none', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                        >
                          Ver Detalle
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 6: MONITOR DE TASAS Y FLUCTUACIÓN */}
        {activeTab === 'RATES' && (
          <div>
            <div style={{ marginBottom: '24px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>Monitor y Fluctuación de Tasas de Cambio</h2>
              <p style={{ color: '#94A3B8', fontSize: '13px' }}>Comparativa de tasas oficiales y de mercado en Venezuela con historial semanal.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '28px' }}>
              {[
                { title: 'BCV Oficial (USD)', rate: bcvRate, change: '+1.52%', isOfficial: true, color: '#10B981' },
                { title: 'Monitor Dólar / Paralelo', rate: bcvRate * 1.138, change: '+1.51%', isOfficial: false, color: '#38BDF8' },
                { title: 'BCV Oficial (Euro)', rate: bcvRate * 1.055, change: '+0.38%', isOfficial: true, color: '#F59E0B' },
                { title: 'Cripto P2P (Binance USDT)', rate: bcvRate * 1.142, change: '+1.51%', isOfficial: false, color: '#8B5CF6' },
              ].map((card, i) => (
                <div key={i} style={{ backgroundColor: '#1E293B', padding: '20px', borderRadius: '12px', border: '1px solid #334155' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', color: '#94A3B8' }}>{card.title}</span>
                    <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', backgroundColor: card.isOfficial ? '#10B98122' : '#334155', color: card.isOfficial ? '#10B981' : '#CBD5E1', fontWeight: 'bold' }}>
                      {card.isOfficial ? 'OFICIAL' : 'REFERENCIAL'}
                    </span>
                  </div>
                  <p style={{ fontSize: '22px', fontWeight: 'bold', color: card.color, marginTop: '8px' }}>
                    {card.rate.toFixed(2)} Bs
                  </p>
                  <p style={{ fontSize: '11px', color: '#10B981', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <TrendingUp size={14} />
                    <span>{card.change} en 24h</span>
                  </p>
                </div>
              ))}
            </div>

            {/* Gráfico Histórico */}
            <div style={{ backgroundColor: '#1E293B', padding: '24px', borderRadius: '12px', border: '1px solid #334155' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px' }}>Tendencia de Fluctuación de la Tasa BCV (Últimos 7 días)</h3>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '20px', height: '160px', paddingTop: '20px' }}>
                {[
                  { day: '18 Nov', rate: 49.35 },
                  { day: '19 Nov', rate: 49.87 },
                  { day: '20 Nov', rate: 50.66 },
                  { day: '21 Nov', rate: 51.18 },
                  { day: '22 Nov', rate: 51.71 },
                  { day: '23 Nov', rate: 52.24 },
                  { day: '24 Nov (Hoy)', rate: bcvRate },
                ].map((pt, idx) => {
                  const heightPercent = ((pt.rate - 48) / (bcvRate + 1 - 48)) * 100;
                  return (
                    <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                      <span style={{ fontSize: '10px', color: '#10B981', fontWeight: 'bold', marginBottom: '6px' }}>{pt.rate.toFixed(2)}</span>
                      <div style={{ width: '100%', height: `${Math.max(heightPercent, 20)}%`, backgroundColor: idx === 6 ? '#10B981' : '#0284C7', borderRadius: '4px 4px 0 0' }} />
                      <span style={{ fontSize: '10px', color: '#94A3B8', marginTop: '8px' }}>{pt.day}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: VENDEDORES EN VIVO */}
        {activeTab === 'CASHIERS' && (
          <div>
            <div style={{ marginBottom: '24px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>Monitoreo de Vendedores y Cajeros en Vivo</h2>
              <p style={{ color: '#94A3B8', fontSize: '13px' }}>Supervisa lo que está gestionando cada cajero en tiempo real en los terminales de mostrador.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
              {cashiersList.map((cashier) => (
                <div key={cashier.id} style={{ backgroundColor: '#1E293B', padding: '24px', borderRadius: '12px', border: '1px solid #334155' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <div>
                      <h3 style={{ fontSize: '16px', fontWeight: 'bold' }}>{cashier.name}</h3>
                      <p style={{ fontSize: '12px', color: '#38BDF8' }}>@{cashier.username}</p>
                    </div>
                    <span style={{ backgroundColor: '#10B98122', color: '#10B981', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold' }}>
                      ● {cashier.status}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
                    <div style={{ backgroundColor: '#0F172A', padding: '12px', borderRadius: '8px' }}>
                      <p style={{ fontSize: '11px', color: '#94A3B8' }}>Cuentas Abiertas</p>
                      <p style={{ fontSize: '18px', fontWeight: 'bold', color: '#F59E0B' }}>{cashier.openCartsCount} cuentas</p>
                    </div>
                    <div style={{ backgroundColor: '#0F172A', padding: '12px', borderRadius: '8px' }}>
                      <p style={{ fontSize: '11px', color: '#94A3B8' }}>Ventas Hoy</p>
                      <p style={{ fontSize: '18px', fontWeight: 'bold', color: '#10B981' }}>${cashier.salesTodayUsd.toFixed(2)}</p>
                    </div>
                  </div>

                  <div style={{ backgroundColor: '#0F172A', padding: '12px', borderRadius: '8px', fontSize: '12px', borderLeft: '3px solid #38BDF8' }}>
                    <p style={{ color: '#94A3B8', fontSize: '11px' }}>Última Actividad ({cashier.lastActionTime}):</p>
                    <p style={{ color: '#F8FAFC', fontWeight: '500', marginTop: '2px' }}>{cashier.lastAction}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* MODAL DETALLE COMPLETO DE VENTA */}
      {selectedSale && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 100 }}>
          <div style={{ width: '100%', maxWidth: '600px', backgroundColor: '#1E293B', borderRadius: '16px', padding: '28px', border: '1px solid #334155', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#38BDF8' }}>{selectedSale.invoiceFormattedNumber}</h3>
                <p style={{ fontSize: '12px', color: '#94A3B8' }}>Fecha: {selectedSale.createdAt}</p>
              </div>
              <button onClick={() => setSelectedSale(null)} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ backgroundColor: '#0F172A', padding: '14px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px' }}>
              <p><strong>Cliente:</strong> {selectedSale.customerName} ({selectedSale.customerDoc})</p>
              <p><strong>Cajero:</strong> {selectedSale.cashierName}</p>
              <p><strong>Tasa BCV Congelada:</strong> {selectedSale.rateValue.toFixed(2)} Bs/USD</p>
            </div>

            {/* Líneas de Producto */}
            <h4 style={{ fontSize: '13px', fontWeight: 'bold', color: '#94A3B8', marginBottom: '8px' }}>Productos Facturados</h4>
            <table style={{ width: '100%', fontSize: '12px', textAlign: 'left', borderCollapse: 'collapse', marginBottom: '16px' }}>
              <thead>
                <tr style={{ color: '#64748B', borderBottom: '1px solid #334155' }}>
                  <th style={{ padding: '6px' }}>Cant</th>
                  <th style={{ padding: '6px' }}>Producto</th>
                  <th style={{ padding: '6px' }}>Precio</th>
                  <th style={{ padding: '6px' }}>IVA</th>
                  <th style={{ padding: '6px', textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {selectedSale.items.map((line, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #33415533' }}>
                    <td style={{ padding: '6px' }}>{line.qty}x</td>
                    <td style={{ padding: '6px' }}>{line.name}</td>
                    <td style={{ padding: '6px' }}>${line.priceUsd.toFixed(2)}</td>
                    <td style={{ padding: '6px' }}>{line.taxRate}%</td>
                    <td style={{ padding: '6px', textAlign: 'right', fontWeight: 'bold' }}>${line.subtotalUsd.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Desglose Fiscal SENIAT */}
            <div style={{ backgroundColor: '#0F172A', padding: '14px', borderRadius: '8px', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Base Imponible 16%:</span><span>${selectedSale.taxes.base16.toFixed(2)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Monto Exento:</span><span>${selectedSale.taxes.exempt.toFixed(2)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Impuesto IVA (16%):</span><span>${selectedSale.taxes.tax16.toFixed(2)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#F59E0B' }}><span>Percepción IGTF 3% (Efectivo Divisas):</span><span>+${selectedSale.taxes.igtf3.toFixed(2)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '15px', borderTop: '1px solid #334155', paddingTop: '6px', marginTop: '4px' }}>
                <span>TOTAL A PAGAR:</span>
                <span style={{ color: '#10B981' }}>${selectedSale.totalUsd.toFixed(2)} ({selectedSale.totalBs.toFixed(2)} Bs)</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => window.open(`/api/v1/sales/${selectedSale.id}/receipt/pdf`, '_blank')}
                style={{ flex: 1, padding: '10px', backgroundColor: '#0284C7', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <FileText size={16} />
                <span>Descargar PDF</span>
              </button>
              <button
                onClick={() => alert('Comando de impresión térmica ESC/POS enviado a impresora Bluetooth.')}
                style={{ flex: 1, padding: '10px', backgroundColor: '#10B981', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <Printer size={16} />
                <span>Imprimir Ticket</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL REGISTRAR NUEVO PRODUCTO (MANUAL O CÁMARA) */}
      {isAddModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 100 }}>
          <div style={{ width: '100%', maxWidth: '640px', backgroundColor: '#1E293B', borderRadius: '16px', padding: '28px', border: '1px solid #334155', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 'bold' }}>Registrar Nuevo Producto</h3>
              <button onClick={() => { setIsAddModalOpen(false); setCameraActive(false); }} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {/* Selector de Modo */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              <button
                onClick={() => { setAddMode('MANUAL'); setCameraActive(false); }}
                style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', backgroundColor: addMode === 'MANUAL' ? '#0284C7' : '#0F172A', color: '#FFFFFF' }}
              >
                Ingreso Manual Rápido
              </button>
              <button
                onClick={() => { setAddMode('CAMERA'); setCameraActive(true); }}
                style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', backgroundColor: addMode === 'CAMERA' ? '#10B981' : '#0F172A', color: '#FFFFFF' }}
              >
                📷 Escanear con Cámara
              </button>
            </div>

            {/* Visor de Cámara Web */}
            {addMode === 'CAMERA' && (
              <div style={{ position: 'relative', height: '200px', backgroundColor: '#000000', borderRadius: '10px', overflow: 'hidden', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <video ref={videoRef} style={{ width: '100%', height: '100%', objectFit: 'cover' }} playsInline muted />
                <div style={{ position: 'absolute', border: '2px dashed #10B981', width: '220px', height: '100px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: '11px', color: '#10B981', backgroundColor: 'rgba(0,0,0,0.6)', padding: '2px 6px', borderRadius: '4px' }}>
                    Apunte al código de barras
                  </span>
                </div>
                <button
                  onClick={() => {
                    // Simular detección de código de barra venezolano (GS1 759)
                    const simulatedCode = '7591005' + Math.floor(100000 + Math.random() * 900000);
                    setNewProdBarcode(simulatedCode);
                    alert(`Código de barra detectado por cámara: ${simulatedCode}`);
                    setAddMode('MANUAL');
                    setCameraActive(false);
                  }}
                  style={{ position: 'absolute', bottom: '10px', padding: '6px 14px', borderRadius: '6px', border: 'none', backgroundColor: '#10B981', color: '#FFFFFF', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}
                >
                  Capturar Código
                </button>
              </div>
            )}

            {/* Formulario */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#94A3B8', marginBottom: '4px' }}>Nombre del Producto *</label>
                <input
                  type="text"
                  placeholder="Ej: Pasta Primor 1kg"
                  value={newProdName}
                  onChange={(e) => setNewProdName(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #475569', backgroundColor: '#0F172A', color: '#FFFFFF', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#94A3B8', marginBottom: '4px' }}>Código de Barras</label>
                <input
                  type="text"
                  placeholder="759... o dejar vacío"
                  value={newProdBarcode}
                  onChange={(e) => setNewProdBarcode(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #475569', backgroundColor: '#0F172A', color: '#38BDF8', fontSize: '13px', fontFamily: 'monospace' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#94A3B8', marginBottom: '4px' }}>Proveedor</label>
                <input
                  type="text"
                  value={newProdSupplier}
                  onChange={(e) => setNewProdSupplier(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #475569', backgroundColor: '#0F172A', color: '#FFFFFF', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#94A3B8', marginBottom: '4px' }}>Costo al Mayor / Compra ($)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={newProdCostUsd}
                  onChange={(e) => setNewProdCostUsd(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #475569', backgroundColor: '#0F172A', color: '#FFFFFF', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#94A3B8', marginBottom: '4px' }}>Precio de Salida / Venta ($) *</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={newProdSaleUsd}
                  onChange={(e) => setNewProdSaleUsd(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #475569', backgroundColor: '#0F172A', color: '#10B981', fontSize: '13px', fontWeight: 'bold' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#94A3B8', marginBottom: '4px' }}>Cantidad Inicial (Stock)</label>
                <input
                  type="number"
                  value={newProdStock}
                  onChange={(e) => setNewProdStock(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #475569', backgroundColor: '#0F172A', color: '#FFFFFF', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#94A3B8', marginBottom: '4px' }}>Alerta de Stock Mínimo</label>
                <input
                  type="number"
                  value={newProdMinStock}
                  onChange={(e) => setNewProdMinStock(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #475569', backgroundColor: '#0F172A', color: '#FFFFFF', fontSize: '13px' }}
                />
              </div>
            </div>

            {/* Calculadora Dinámica de Margen de Ganancia */}
            {saleNum > 0 && (
              <div style={{ backgroundColor: '#0F172A', padding: '14px', borderRadius: '8px', border: '1px solid #334155', marginBottom: '20px' }}>
                <p style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '6px' }}>Cálculo de Rentabilidad en Tiempo Real:</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '12px', color: '#CBD5E1' }}>Ganancia Bruta: </span>
                    <strong style={{ color: '#10B981', fontSize: '15px' }}>+${profitUsd.toFixed(2)}</strong>
                    <span style={{ fontSize: '11px', color: '#94A3B8' }}> (≈ {(profitUsd * bcvRate).toFixed(2)} Bs)</span>
                  </div>
                  <div>
                    <span style={{ fontSize: '12px', color: '#CBD5E1' }}>Margen: </span>
                    <span style={{ backgroundColor: parseFloat(marginPercent) >= 20 ? '#10B98122' : '#EF444422', color: parseFloat(marginPercent) >= 20 ? '#10B981' : '#EF4444', padding: '4px 8px', borderRadius: '6px', fontWeight: 'bold' }}>
                      {marginPercent}%
                    </span>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={handleSaveProduct}
              style={{ width: '100%', padding: '14px', borderRadius: '8px', border: 'none', backgroundColor: '#0284C7', color: '#FFFFFF', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer' }}
            >
              Guardar Producto en Inventario
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

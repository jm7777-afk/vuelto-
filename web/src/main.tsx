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
  Menu,
  Building,
  Truck,
  CreditCard,
  Edit,
  Trash2,
  Download,
  Send,
  ArrowDownRight,
  ArrowUpRight,
  Receipt,
  FileSpreadsheet,
  Eye,
  Edit3,
  ToggleLeft,
  ToggleRight,
  ExternalLink,
} from 'lucide-react';

import { ensureValidEan13 } from './utils/ean';
import type {
  UserProfile,
  ProductItem,
  TenantItem,
  SupplierItem,
  PurchaseOrderItem,
  KardexMovementItem,
  CustomerDebt,
  ReceivablePaymentRecord,
  FinancialTransactionItem,
  SaleRecord,
  CashierStatus,
  PosCartLine,
  PosTicket,
} from './types';

const DEFAULT_BCV_RATE = 919.82;

// COMPONENTE: SPLASH SCREEN (ANIMACIÓN VUELTO 60 FPS)
const VueltoSplashScreen: React.FC<{ onFinish: () => void }> = ({ onFinish }) => {
  const [phase, setPhase] = useState<'DRAW_INVOICE' | 'BILL_APPEAR' | 'ARROW_ROTATE' | 'TEXT_FADE' | 'STATIC'>('DRAW_INVOICE');

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('BILL_APPEAR'), 600);
    const t2 = setTimeout(() => setPhase('ARROW_ROTATE'), 1300);
    const t3 = setTimeout(() => setPhase('TEXT_FADE'), 2200);
    const t4 = setTimeout(() => setPhase('STATIC'), 3000);
    const t5 = setTimeout(() => onFinish(), 3800);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
    };
  }, [onFinish]);

  return (
    <div
      onClick={onFinish}
      title="Clic para omitir intro"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: '#0B3B49',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        cursor: 'pointer',
        overflow: 'hidden',
        userSelect: 'none',
        transition: 'opacity 0.6s ease',
      }}
    >
      <div style={{ position: 'relative', width: '280px', height: '280px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg viewBox="0 0 200 200" width="220" height="220" style={{ overflow: 'visible' }}>
          <defs>
            <linearGradient id="vueltoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#14B8A6" />
              <stop offset="100%" stopColor="#84CC16" />
            </linearGradient>
            <linearGradient id="billGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10B981" />
              <stop offset="100%" stopColor="#A3E635" />
            </linearGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Factura Fiscal */}
          <g>
            <rect
              x="30"
              y="30"
              width="85"
              height="115"
              rx="8"
              fill="#062F3B"
              stroke="url(#vueltoGrad)"
              strokeWidth="3.5"
              strokeDasharray="400"
              strokeDashoffset={phase === 'DRAW_INVOICE' ? 200 : 0}
              style={{
                transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
                filter: 'drop-shadow(0 4px 12px rgba(20, 184, 166, 0.25))',
              }}
            />
            {/* Líneas de conceptos */}
            <line x1="45" y1="58" x2="90" y2="58" stroke="#14B8A6" strokeWidth="3" strokeLinecap="round" opacity={phase !== 'DRAW_INVOICE' ? 1 : 0} style={{ transition: 'opacity 0.4s ease 0.3s' }} />
            <line x1="45" y1="74" x2="80" y2="74" stroke="#14B8A6" strokeWidth="3" strokeLinecap="round" opacity={phase !== 'DRAW_INVOICE' ? 1 : 0} style={{ transition: 'opacity 0.4s ease 0.45s' }} />
            <line x1="45" y1="90" x2="95" y2="90" stroke="#84CC16" strokeWidth="3.5" strokeLinecap="round" opacity={phase !== 'DRAW_INVOICE' ? 1 : 0} style={{ transition: 'opacity 0.4s ease 0.6s' }} />
          </g>

          {/* Billete inclinado */}
          <g
            style={{
              transformOrigin: '120px 115px',
              transform: phase === 'DRAW_INVOICE' ? 'scale(0) translate(20px, 20px)' : 'scale(1) rotate(-14deg)',
              opacity: phase === 'DRAW_INVOICE' ? 0 : 1,
              transition: 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
          >
            <rect x="95" y="90" width="62" height="38" rx="5" fill="#042F2E" stroke="url(#billGrad)" strokeWidth="3" filter="url(#glow)" />
            <circle cx="126" cy="109" r="8" fill="none" stroke="#A3E635" strokeWidth="2" />
            <text x="126" y="113" fill="#A3E635" fontSize="11" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">$</text>
          </g>

          {/* Flecha circular de retorno / vuelto */}
          <g
            style={{
              transformOrigin: '125px 125px',
              transform: phase === 'ARROW_ROTATE' || phase === 'TEXT_FADE' || phase === 'STATIC' ? 'rotate(-360deg)' : 'rotate(0deg)',
              opacity: phase === 'DRAW_INVOICE' || phase === 'BILL_APPEAR' ? 0 : 1,
              transition: 'transform 1s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.4s ease',
            }}
          >
            <path d="M 100 135 A 28 28 0 1 0 152 110" fill="none" stroke="#A3E635" strokeWidth="3.5" strokeLinecap="round" strokeDasharray="4 2" />
            <polygon points="152,102 158,114 146,112" fill="#A3E635" />
          </g>
        </svg>
      </div>

      {/* Entrada tipográfica "vuelto" */}
      <div
        style={{
          marginTop: '16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          opacity: phase === 'TEXT_FADE' || phase === 'STATIC' ? 1 : 0,
          transform: phase === 'TEXT_FADE' || phase === 'STATIC' ? 'translateY(0)' : 'translateY(16px)',
          transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <span style={{ fontSize: '46px', fontWeight: '900', color: '#FFFFFF', letterSpacing: '2px', fontFamily: 'system-ui, -apple-system, sans-serif', lineHeight: 1 }}>
          vuelto<span style={{ color: '#A3E635' }}>.</span>
        </span>
        <span style={{ fontSize: '11px', color: '#14B8A6', letterSpacing: '3px', textTransform: 'uppercase', fontWeight: 'bold', marginTop: '8px' }}>
          Plataforma de Facturación Bimoneda
        </span>
      </div>

      <p style={{ position: 'absolute', bottom: '24px', fontSize: '11px', color: '#64748B', letterSpacing: '1px' }}>
        Toca cualquier parte para continuar
      </p>
    </div>
  );
};

// COMPONENTE: ONBOARDING MODAL
const VueltoOnboardingModal: React.FC<{ onClose: () => void; onPlaySplash: () => void }> = ({ onClose, onPlaySplash }) => {
  const [slide, setSlide] = useState(0);

  const slides = [
    {
      title: '¡Bienvenido a Vuelto!',
      subtitle: 'La plataforma POS & ERP diseñada para el comercio venezolano',
      desc: 'Gestiona ventas en dólares y bolívares sincronizadas al instante con la tasa oficial BCV, cumple al 100% con la Providencia SENIAT 0071 e IGTF 3%, y elimina el problema de la falta de cambio en efectivo.',
      highlight: '🚀 Cero costos por mensajes usando WhatsApp nativo',
      icon: <Sparkles size={40} color="#A3E635" />,
    },
    {
      title: 'Cuentas en Espera y Vuelto Inteligente',
      subtitle: 'Agiliza la cola en horas pico de clientes',
      desc: 'Pausa carritos de compra sin perderlos mientras el cliente busca más productos. Liquida el vuelto como saldo en Monedero del cliente, Vale Impreso con código de barras o Pago Móvil automático.',
      highlight: '💳 Sin fricción de cambio ni billetes rotos',
      icon: <Zap size={40} color="#38BDF8" />,
    },
    {
      title: 'Auditoría, Kardex y Separación de Roles (RBAC)',
      subtitle: 'Tranquilidad total para el dueño y agilidad para el cajero',
      desc: 'El vendedor solo ve precios al detal y cobro de facturas. El administrador controla costos al mayor, órdenes de compra a proveedores, cobranzas con recargo por mora y libro fiscal SENIAT.',
      highlight: '🔒 Aislamiento estricto y trazabilidad por cajero',
      icon: <ShieldCheck size={40} color="#10B981" />,
    },
  ];

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(7, 31, 39, 0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9000, padding: '20px' }}>
      <div style={{ backgroundColor: '#0B3B49', width: '100%', maxWidth: '540px', borderRadius: '20px', border: '1px solid #155E75', padding: '32px', boxShadow: '0 20px 40px rgba(0,0,0,0.5)', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '8px' }}>
          <X size={20} />
        </button>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
          <div style={{ padding: '16px', borderRadius: '50%', backgroundColor: '#062F3B', border: '2px solid #14B8A6' }}>
            {slides[slide].icon}
          </div>
        </div>

        <h3 style={{ fontSize: '22px', fontWeight: 'bold', color: '#FFFFFF', textAlign: 'center', marginBottom: '6px' }}>{slides[slide].title}</h3>
        <p style={{ fontSize: '13px', color: '#38BDF8', textAlign: 'center', fontWeight: '600', marginBottom: '16px' }}>{slides[slide].subtitle}</p>

        <p style={{ fontSize: '14px', color: '#CBD5E1', lineHeight: '1.6', textAlign: 'center', marginBottom: '20px' }}>{slides[slide].desc}</p>

        <div style={{ backgroundColor: '#062F3B', padding: '10px 14px', borderRadius: '10px', border: '1px solid #10B98144', marginBottom: '28px', textAlign: 'center', fontSize: '12px', color: '#A3E635', fontWeight: 'bold' }}>
          {slides[slide].highlight}
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '24px' }}>
          {slides.map((_, i) => (
            <div key={i} style={{ width: i === slide ? '24px' : '8px', height: '8px', borderRadius: '4px', backgroundColor: i === slide ? '#A3E635' : '#155E75', transition: 'all 0.3s ease' }} />
          ))}
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          {slide > 0 && (
            <button onClick={() => setSlide(slide - 1)} style={{ padding: '12px 20px', borderRadius: '10px', border: '1px solid #334155', backgroundColor: '#062F3B', color: '#CBD5E1', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}>
              Anterior
            </button>
          )}

          {slide < slides.length - 1 ? (
            <button onClick={() => setSlide(slide + 1)} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: 'none', backgroundColor: '#0284C7', color: '#FFFFFF', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <span>Siguiente</span>
              <ChevronRight size={18} />
            </button>
          ) : (
            <button onClick={onClose} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: 'none', backgroundColor: '#10B981', color: '#FFFFFF', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <span>Comenzar a Facturar</span>
              <Check size={18} />
            </button>
          )}
        </div>

        <div style={{ marginTop: '16px', textAlign: 'center' }}>
          <button onClick={onPlaySplash} style={{ background: 'none', border: 'none', color: '#94A3B8', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline' }}>
            Volver a ver la animación de bienvenida
          </button>
        </div>
      </div>
    </div>
  );
};

// COMPONENTE PRINCIPAL
export const App: React.FC = () => {
  // Splash y Onboarding
  const [showSplash, setShowSplash] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Sesión y Auth Persistente
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const stored = localStorage.getItem('vuelto_user_session');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [usernameInput, setUsernameInput] = useState('admin');
  const [passwordInput, setPasswordInput] = useState('admin123');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Roles y Responsive (Conmutador de Rol para Súper Admin, Admin y Vendedor)
  const [userRoleMode, setUserRoleMode] = useState<'SUPER_ADMIN' | 'ADMIN' | 'VENDEDOR'>('ADMIN');
  const isSuperAdmin = userRoleMode === 'SUPER_ADMIN';
  const isVendedor = userRoleMode === 'VENDEDOR';
  const isAdmin = !isVendedor;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Navegación Activa
  type TabType = 'POS' | 'METRICS' | 'INVENTORY' | 'SUPPLIERS' | 'ORDERS' | 'RECEIVABLES' | 'SALES' | 'EXPENSES' | 'RATES' | 'CASHIERS' | 'AUDIT' | 'SUPER_ADMIN';
  const [activeTab, setActiveTab] = useState<TabType>('POS');

  useEffect(() => {
    if (isVendedor && activeTab !== 'POS' && activeTab !== 'INVENTORY' && activeTab !== 'SALES' && activeTab !== 'RATES') {
      setActiveTab('POS');
    }
  }, [userRoleMode, isVendedor, activeTab]);

  // Tasa de Cambio y Selección de Cobro del Administrador (Integración DolarApi Oficial en Vivo)
  const [bcvRate, setBcvRate] = useState(DEFAULT_BCV_RATE);
  const [activeRateSource, setActiveRateSource] = useState<'BCV' | 'PARALELO' | 'EURO' | 'CUSTOM'>('BCV');
  const [customRateInput, setCustomRateInput] = useState('950.00');
  const [ratesData, setRatesData] = useState<any>(null);
  const [isSyncingRates, setIsSyncingRates] = useState(false);

  // Régimen Fiscal Flexible (Emprendimientos / Pequeños Comercios No Registrados)
  const [enableIva, setEnableIva] = useState(true);
  const [enableIgtf, setEnableIgtf] = useState(true);

  // Margen Global de Ganancia para Inventario
  const [globalMarginInput, setGlobalMarginInput] = useState('30');
  const [globalMarginCategory, setGlobalMarginCategory] = useState('ALL');

  // Cálculo de la Tasa Activa con la que el Negocio Cobra sus Productos
  const activeRate = activeRateSource === 'PARALELO'
    ? +(bcvRate * 1.138)
    : activeRateSource === 'EURO'
    ? +(bcvRate * 1.055)
    : activeRateSource === 'CUSTOM'
    ? +(parseFloat(customRateInput) || bcvRate)
    : bcvRate;

  // Estado del Carrito y Terminal POS (Interfaces importadas desde ./types)
  const [posCustomerList, setPosCustomerList] = useState([
    { id: 'c0', name: 'Consumidor Final', documentType: 'V', documentNumber: '00000000', phone: '', balanceDue: 0, isSpecialMoraCustomer: false },
    { id: 'c1', name: 'Automercado Miranda C.A.', documentType: 'J', documentNumber: '401234567', phone: '+584121112233', balanceDue: 145.50, isSpecialMoraCustomer: true },
    { id: 'c2', name: 'Distribuidora Los Próceres', documentType: 'J', documentNumber: '309876543', phone: '+584149998877', balanceDue: 280.00, isSpecialMoraCustomer: true },
    { id: 'c3', name: 'María Corina Machado', documentType: 'V', documentNumber: '14523988', phone: '+584145556677', balanceDue: 0, isSpecialMoraCustomer: false },
  ]);

  // Lista de Tickets en Paralelo (Fichero Superior)
  const [posTickets, setPosTickets] = useState<PosTicket[]>([
    {
      id: 'ticket-1',
      ticketNumber: 1,
      label: 'Venta #1',
      customer: {
        id: 'c0',
        name: 'Consumidor Final',
        documentType: 'V',
        documentNumber: '00000000',
        phone: '',
        balanceDue: 0,
        isSpecialMoraCustomer: false,
      },
      cartLines: [
        {
          productId: 'p1',
          name: 'Harina PAN Blanca 1kg',
          barcode: '7591001001019',
          priceUsd: 1.25,
          qty: 2,
          unitOfMeasure: 'paquete',
          isExempt: true,
          taxRate: 0,
        },
        {
          productId: 'p2',
          name: 'Arroz Primor Grano Entero 1kg',
          barcode: '7591003003035',
          priceUsd: 1.50,
          qty: 1,
          unitOfMeasure: 'kg',
          isExempt: true,
          taxRate: 0,
        },
      ],
      paymentMethod: 'CASH_USD',
      cashAmountUsd: '10.00',
      pagoMovilBank: '0102 - Banco de Venezuela',
      pagoMovilPhone: '04141234567',
      pagoMovilRef: '489201',
      adminApproved: false,
      createdAt: '12:00 PM',
    },
  ]);
  const [activeTicketId, setActiveTicketId] = useState('ticket-1');

  // Acceso al Ticket Activo
  const activeTicket = posTickets.find((t) => t.id === activeTicketId) || posTickets[0];
  const cartLines = activeTicket?.cartLines || [];
  const posSelectedCustomer = activeTicket?.customer || posCustomerList[0];
  const posPaymentMethod = activeTicket?.paymentMethod || 'CASH_USD';
  const posCashAmountUsd = activeTicket?.cashAmountUsd || '10.00';
  const posPagoMovilBank = activeTicket?.pagoMovilBank || '0102 - Banco de Venezuela';
  const posPagoMovilPhone = activeTicket?.pagoMovilPhone || '04141234567';
  const posPagoMovilRef = activeTicket?.pagoMovilRef || '489201';
  const posAdminApproved = activeTicket?.adminApproved || false;

  // Actualizador universal del ticket activo
  const updateActiveTicket = (updater: (prev: PosTicket) => PosTicket) => {
    setPosTickets((prev) =>
      prev.map((t) => (t.id === activeTicketId ? updater(t) : t))
    );
  };

  const setCartLines = (newLines: PosCartLine[] | ((prev: PosCartLine[]) => PosCartLine[])) => {
    updateActiveTicket((t) => ({
      ...t,
      cartLines: typeof newLines === 'function' ? newLines(t.cartLines) : newLines,
    }));
  };

  const setPosSelectedCustomer = (cust: typeof posCustomerList[0]) => {
    updateActiveTicket((t) => ({ ...t, customer: cust, adminApproved: false }));
  };

  const setPosPaymentMethod = (method: 'CASH_USD' | 'CASH_VES' | 'PAGO_MOVIL' | 'DEBIT_CARD' | 'TRANSFER' | 'CREDIT_DEBT' | 'DERIVAR_ADMIN') => {
    updateActiveTicket((t) => ({ ...t, paymentMethod: method }));
  };

  const setPosCashAmountUsd = (amt: string) => {
    updateActiveTicket((t) => ({ ...t, cashAmountUsd: amt }));
  };

  const setPosPagoMovilBank = (bank: string) => {
    updateActiveTicket((t) => ({ ...t, pagoMovilBank: bank }));
  };

  const setPosPagoMovilPhone = (phone: string) => {
    updateActiveTicket((t) => ({ ...t, pagoMovilPhone: phone }));
  };

  const setPosPagoMovilRef = (ref: string) => {
    updateActiveTicket((t) => ({ ...t, pagoMovilRef: ref }));
  };

  const setPosAdminApproved = (approved: boolean) => {
    updateActiveTicket((t) => ({ ...t, adminApproved: approved }));
  };

  // Creación y cierre de tickets en el Fichero Superior
  const handleCreateNewTicket = () => {
    const nextNum = posTickets.length + 1;
    const nowTime = new Date().toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });
    const newT: PosTicket = {
      id: `ticket-${Date.now()}`,
      ticketNumber: nextNum,
      label: `Venta #${nextNum}`,
      customer: posCustomerList[0],
      cartLines: [],
      paymentMethod: 'CASH_USD',
      cashAmountUsd: '0.00',
      pagoMovilBank: '0102 - Banco de Venezuela',
      pagoMovilPhone: '',
      pagoMovilRef: '',
      adminApproved: false,
      createdAt: nowTime,
    };
    setPosTickets((prev) => [...prev, newT]);
    setActiveTicketId(newT.id);
  };

  const handleCloseTicket = (ticketIdToClose: string) => {
    if (posTickets.length <= 1) {
      updateActiveTicket((t) => ({ ...t, cartLines: [], customer: posCustomerList[0] }));
      return;
    }
    const remaining = posTickets.filter((t) => t.id !== ticketIdToClose);
    setPosTickets(remaining);
    if (activeTicketId === ticketIdToClose) {
      setActiveTicketId(remaining[remaining.length - 1].id);
    }
  };

  // Escaneo y Búsqueda Fallback
  const [posBarcodeQuery, setPosBarcodeQuery] = useState('');
  const [posCategoryFilter, setPosCategoryFilter] = useState('TODAS');
  const [posScanFeedback, setPosScanFeedback] = useState<{ type: 'success' | 'info' | 'warning'; message: string } | null>(null);

  // UX Refactorizada POS: Ref de Autofocus, Flash de Escáner y Feedback de Audio
  const posSearchInputRef = useRef<HTMLInputElement>(null);
  const [isScanSuccessFlash, setIsScanSuccessFlash] = useState(false);
  const [posCashAmountVes, setPosCashAmountVes] = useState('0.00');

  // Asistente (Wizard) de Cobro en Modal de 3 Pasos
  const [isCheckoutWizardOpen, setIsCheckoutWizardOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<1 | 2 | 3>(1);

  // Modal para que el Administrador consulte la factura y lo que se llevó en Morosidad
  const [selectedDebtorDetail, setSelectedDebtorDetail] = useState<CustomerDebt | null>(null);
  const [isDebtorDetailModalOpen, setIsDebtorDetailModalOpen] = useState(false);

  // Síntesis de Sonido Web Audio API para feedback sonoro de escaneo POS
  const playScanBeep = (success = true) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      if (success) {
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.setValueAtTime(0.18, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.12);
      } else {
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        gain.gain.setValueAtTime(0.22, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.22);
      }
    } catch {
      // Audio fallback silencioso si el navegador restringe audio sin clic previo
    }
  };

  // Búsqueda por C.I. y Registro Rápido
  const [posCiSearchInput, setPosCiSearchInput] = useState('');
  const [posCiDocType, setPosCiDocType] = useState<'V' | 'E' | 'J' | 'G'>('V');
  const [showQuickCustomerForm, setShowQuickCustomerForm] = useState(false);
  const [quickCustomerFirstName, setQuickCustomerFirstName] = useState('');
  const [quickCustomerLastName, setQuickCustomerLastName] = useState('');
  const [quickCustomerPhone, setQuickCustomerPhone] = useState('');
  const [posCustomerFeedback, setPosCustomerFeedback] = useState<{ type: 'success' | 'warning'; message: string } | null>(null);

  const [posAdminPinInput, setPosAdminPinInput] = useState('');
  const [completedSaleModal, setCompletedSaleModal] = useState<any | null>(null);

  // Autofocus permanente en la barra de escaneo si no hay modal abierto
  useEffect(() => {
    if (activeTab === 'POS' && !isCheckoutWizardOpen && !completedSaleModal && !isDebtorDetailModalOpen) {
      posSearchInputRef.current?.focus();
    }
  }, [activeTab, isCheckoutWizardOpen, completedSaleModal, isDebtorDetailModalOpen]);

  // Atajos de Teclado Globales: F2 (Cobro Wizard), Esc (Atrás/Cerrar), Enter (Pasos/Confirmar)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // F2: Abrir asistente wizard de cobro si el carrito tiene productos
      if (e.key === 'F2') {
        e.preventDefault();
        if (activeTab === 'POS' && !isCheckoutWizardOpen && cartLines.length > 0) {
          setIsCheckoutWizardOpen(true);
          setCheckoutStep(1);
        }
        return;
      }

      // Esc: Retroceder un paso o cerrar modales sin perder el carrito
      if (e.key === 'Escape') {
        if (isDebtorDetailModalOpen) {
          setIsDebtorDetailModalOpen(false);
          return;
        }
        if (completedSaleModal) {
          setCompletedSaleModal(null);
          return;
        }
        if (isCheckoutWizardOpen) {
          e.preventDefault();
          if (checkoutStep > 1) {
            setCheckoutStep((s) => (s - 1) as any);
          } else {
            setIsCheckoutWizardOpen(false);
          }
          return;
        }
      }

      // Enter dentro del wizard (cuando no se está editando un campo de texto que tenga su propio submit)
      if (e.key === 'Enter' && isCheckoutWizardOpen) {
        const activeTag = document.activeElement?.tagName;
        if (activeTag === 'INPUT' || activeTag === 'TEXTAREA') {
          return;
        }
        e.preventDefault();
        if (checkoutStep === 1) {
          setCheckoutStep(2);
        } else if (checkoutStep === 2) {
          setCheckoutStep(3);
        } else if (checkoutStep === 3) {
          handlePosConfirmSale();
          setIsCheckoutWizardOpen(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, isCheckoutWizardOpen, checkoutStep, cartLines, isDebtorDetailModalOpen, completedSaleModal]);

  // Auditoría y Backups
  const [auditLogsList, setAuditLogsList] = useState<any[]>([
    {
      id: 'aud-1',
      action: 'SALE_CONFIRMED',
      entity: 'sale',
      entityId: 'FACT-A-00000042',
      payload: { invoice: 'A-00000042', totalUsd: '4.50', totalBs: '236.25', payment: 'PAGO_MOVIL' },
      result: 'SUCCESS',
      channel: 'POS_MOBILE',
      createdAt: 'Hace 5 minutos',
      user: 'cajero1',
    },
    {
      id: 'aud-2',
      action: 'UPDATE_ACTIVE_RATE',
      entity: 'TENANT_CONFIGURATION',
      payload: { activeRateSource: 'BCV', rate: 52.50 },
      result: 'SUCCESS',
      channel: 'WEB_ADMIN',
      createdAt: 'Hace 30 minutos',
      user: 'admin',
    },
    {
      id: 'aud-3',
      action: 'APPLY_GLOBAL_PROFIT_MARGIN',
      entity: 'product',
      payload: { marginPercentage: 30, updatedCount: 4 },
      result: 'SUCCESS',
      channel: 'WEB_ADMIN',
      createdAt: 'Hoy 10:15 AM',
      user: 'admin',
    },
    {
      id: 'aud-4',
      action: 'INVENTORY_MOVEMENT',
      entity: 'inventory_movement',
      payload: { productId: 'p1', type: 'IN', qty: 50, reason: 'Recepción orden OC-2026-0001' },
      result: 'SUCCESS',
      channel: 'WEB_ADMIN',
      createdAt: 'Ayer 16:20 PM',
      user: 'admin',
    },
  ]);
  const [isBackupDownloading, setIsBackupDownloading] = useState(false);

  // 1. INVENTARIO & STOCK
  const [searchTerm, setSearchTerm] = useState('');
  const [inventoryList, setInventoryList] = useState<ProductItem[]>([
    {
      id: 'p1',
      name: 'Harina PAN Blanca 1kg',
      barcode: '7591001001019',
      sku: 'HAR-001',
      category: 'Alimentos',
      unitOfMeasure: 'paquete',
      supplier: 'Empresas Polar C.A.',
      supplierPhone: '+584141234567',
      costPriceUsd: 0.95,
      salePriceUsd: 1.25,
      taxRate: 0,
      stock: 145,
      minStockAlert: 20,
      lastPurchaseDate: '2026-11-20',
      inflationDeltaPercent: 3.2,
    },
    {
      id: 'p2',
      name: 'Arroz Primor Grano Entero 1kg',
      barcode: '7591003003035',
      sku: 'ARR-002',
      category: 'Alimentos',
      unitOfMeasure: 'kg',
      supplier: 'Alimentos Polar',
      supplierPhone: '+584141234567',
      costPriceUsd: 1.10,
      salePriceUsd: 1.50,
      taxRate: 0,
      stock: 82,
      minStockAlert: 15,
      lastPurchaseDate: '2026-11-19',
      inflationDeltaPercent: 1.8,
    },
    {
      id: 'p3',
      name: 'Aceite de Maíz Mazeite 1L',
      barcode: '7591004004048',
      sku: 'ACE-003',
      category: 'Alimentos',
      unitOfMeasure: 'L',
      supplier: 'Alimentos Polar',
      supplierPhone: '+584141234567',
      costPriceUsd: 2.80,
      salePriceUsd: 3.80,
      taxRate: 16,
      stock: 4, // Alerta
      minStockAlert: 10,
      lastPurchaseDate: '2026-11-15',
      inflationDeltaPercent: 4.5,
    },
    {
      id: 'p4',
      name: 'Refresco Pepsi Cola 1.5L',
      barcode: '7591002002026',
      sku: 'REF-005',
      category: 'Bebidas',
      unitOfMeasure: 'botella',
      supplier: 'Pepsico Venezuela',
      supplierPhone: '+584160001122',
      costPriceUsd: 1.20,
      salePriceUsd: 1.90,
      taxRate: 16,
      stock: 35,
      minStockAlert: 15,
      lastPurchaseDate: '2026-11-21',
      inflationDeltaPercent: 2.0,
    },
  ]);

  // Modal Nuevo Producto con Unidad de Medida según Categoría
  const CATEGORY_UOM_MAP: Record<string, string[]> = {
    Alimentos: ['paquete', 'kg', 'g', 'unidad', 'lata'],
    Bebidas: ['botella', 'L', 'ml', 'lata', 'pack'],
    Lácteos: ['unidad', 'kg', 'L', 'paquete'],
    Charcutería: ['kg', 'g', 'unidad'],
    Limpieza: ['unidad', 'L', 'galon', 'caja'],
    Víveres: ['unidad', 'paquete', 'kg', 'caja'],
  };

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addMode, setAddMode] = useState<'MANUAL' | 'CAMERA'>('MANUAL');
  const [newProdName, setNewProdName] = useState('');
  const [newProdCategory, setNewProdCategory] = useState('Alimentos');
  const [newProdUom, setNewProdUom] = useState('paquete');
  const [newProdBarcode, setNewProdBarcode] = useState('');
  const [newProdSupplier, setNewProdSupplier] = useState('Empresas Polar C.A.');
  const [newProdSupplierPhone, setNewProdSupplierPhone] = useState('+584141234567');
  const [newProdCostUsd, setNewProdCostUsd] = useState('');
  const [newProdSaleUsd, setNewProdSaleUsd] = useState('');
  const [newProdStock, setNewProdStock] = useState('10');
  const [newProdMinStock, setNewProdMinStock] = useState('5');
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Modal Ajuste de Stock Físico (Kardex)
  const [isStockAdjustModalOpen, setIsStockAdjustModalOpen] = useState(false);
  const [selectedStockProduct, setSelectedStockProduct] = useState<ProductItem | null>(null);
  const [adjustMovementType, setAdjustMovementType] = useState<'IN' | 'OUT' | 'ADJUSTMENT'>('ADJUSTMENT');
  const [adjustQty, setAdjustQty] = useState('10');
  const [adjustReason, setAdjustReason] = useState('Conteo físico de inventario');

  // Historial de Kardex
  const [kardexHistory, setKardexHistory] = useState<KardexMovementItem[]>([
    {
      id: 'k-1',
      productName: 'Harina PAN Blanca 1kg',
      movementType: 'SALE',
      quantity: 4,
      unitCostUsd: 0.95,
      reason: 'Venta mostrador FACT-A-00000042',
      createdAt: 'Hoy 11:45 AM',
      user: 'cajero1',
    },
    {
      id: 'k-2',
      productName: 'Aceite de Maíz Mazeite 1L',
      movementType: 'IN',
      quantity: 20,
      unitCostUsd: 2.80,
      reason: 'Recepción orden de compra OC-2026-001',
      createdAt: 'Ayer 15:30 PM',
      user: 'admin',
    },
    {
      id: 'k-3',
      productName: 'Arroz Primor Grano Entero 1kg',
      movementType: 'ADJUSTMENT',
      quantity: 82,
      unitCostUsd: 1.10,
      reason: 'Ajuste por inventario físico mensual',
      createdAt: '22 Nov 09:00 AM',
      user: 'admin',
    },
  ]);

  // 2. PROVEEDORES (CRUD)
  const [suppliersList, setSuppliersList] = useState<SupplierItem[]>([
    {
      id: 'sup-1',
      name: 'Empresas Polar C.A.',
      documentType: 'J',
      documentNumber: '000413129',
      phone: '+584141234567',
      email: 'pedidos@polar.com.ve',
      address: 'Los Cortijos, Caracas',
      creditDays: 15,
      isActive: true,
    },
    {
      id: 'sup-2',
      name: 'Pepsico Alimentos Venezuela S.R.L.',
      documentType: 'J',
      documentNumber: '300854128',
      phone: '+584160001122',
      email: 'contacto@pepsico.ve',
      address: 'Zona Industrial La Yaguara, Caracas',
      creditDays: 21,
      isActive: true,
    },
    {
      id: 'sup-3',
      name: 'Distribuidora Lácteos Los Andes C.A.',
      documentType: 'G',
      documentNumber: '200055441',
      phone: '+584129876543',
      email: 'ventas@lacteoslosandes.ve',
      address: 'Av. Andrés Bello, Caracas',
      creditDays: 7,
      isActive: true,
    },
  ]);

  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<SupplierItem | null>(null);
  const [supName, setSupName] = useState('');
  const [supDocType, setSupDocType] = useState<'J' | 'G' | 'V' | 'E'>('J');
  const [supDocNumber, setSupDocNumber] = useState('');
  const [supPhone, setSupPhone] = useState('');
  const [supEmail, setSupEmail] = useState('');
  const [supAddress, setSupAddress] = useState('');

  // 3. PEDIDOS A PROVEEDORES (PURCHASE ORDERS)
  const [purchaseOrdersList, setPurchaseOrdersList] = useState<PurchaseOrderItem[]>([
    {
      id: 'po-1',
      orderNumber: 'OC-2026-0001',
      supplierId: 'sup-1',
      supplierName: 'Empresas Polar C.A.',
      supplierPhone: '+584141234567',
      status: 'SENT_WHATSAPP',
      expectedDeliveryDate: '2026-11-26',
      totalEstimatedUsd: 114.00,
      notes: 'Despacho prioritario de harina y aceite',
      createdAt: '2026-11-24 10:15 AM',
      lines: [
        { productName: 'Harina PAN Blanca 1kg', qty: 60, unitCostUsd: 0.95, subtotalUsd: 57.00 },
        { productName: 'Aceite de Maíz Mazeite 1L', qty: 20, unitCostUsd: 2.85, subtotalUsd: 57.00 },
      ],
    },
  ]);

  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [orderSupplierId, setOrderSupplierId] = useState('sup-1');
  const [orderProductId, setOrderProductId] = useState('p3');
  const [orderQty, setOrderQty] = useState('20');
  const [orderCostUsd, setOrderCostUsd] = useState('2.80');
  const [orderNotes, setOrderNotes] = useState('Reposición urgente por stock crítico');

  // 4. COBRANZAS Y MORA
  const [surchargeRate, setSurchargeRate] = useState(5.0); // 5% de mora configurable por admin
  const [graceDays, setGraceDays] = useState(3);
  const [autoApplyMora, setAutoApplyMora] = useState(true);

  const [customerDebts, setCustomerDebts] = useState<CustomerDebt[]>([
    {
      id: 'c1',
      name: 'Inversiones Los Chaguaramos C.A.',
      document: 'J-309876541',
      phone: '+584149876543',
      balanceDueUsd: 125.00,
      dueDate: '2026-11-20',
      isOverdue: true,
      lateDays: 4,
      surchargeUsd: 6.25,
      waived: false,
    },
    {
      id: 'c2',
      name: 'María Valentina Rodríguez',
      document: 'V-18765432',
      phone: '+584121234567',
      balanceDueUsd: 45.50,
      dueDate: '2026-11-22',
      isOverdue: true,
      lateDays: 2,
      surchargeUsd: 2.28,
      waived: false,
    },
    {
      id: 'c3',
      name: 'Panadería La Espiga Dorada',
      document: 'J-401122334',
      phone: '+584165554321',
      balanceDueUsd: 310.00,
      dueDate: '2026-11-28',
      isOverdue: false,
      lateDays: 0,
      surchargeUsd: 0.00,
      waived: false,
    },
  ]);

  // Modal Registrar Abono de Cobranza
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedDebtor, setSelectedDebtor] = useState<CustomerDebt | null>(null);
  const [payAmountUsd, setPayAmountUsd] = useState('');
  const [payMethod, setPayMethod] = useState<'CASH_USD' | 'PAGO_MOVIL' | 'TRANSFER' | 'DEBIT_CARD'>('CASH_USD');
  const [payRef, setPayRef] = useState('');
  const [payNotes, setPayNotes] = useState('Abono parcial de cuenta');

  const [paymentHistoryList, setPaymentHistoryList] = useState<ReceivablePaymentRecord[]>([
    {
      id: 'rec-1',
      customerName: 'Inversiones Los Chaguaramos C.A.',
      customerDoc: 'J-309876541',
      amountUsd: 50.00,
      amountBs: 2625.00,
      paymentMethod: 'PAGO_MOVIL',
      referenceNumber: 'PM-981245',
      createdAt: 'Hoy 10:30 AM',
      notes: 'Abono factura previa',
    },
  ]);

  // 5. VENTAS & FACTURAS FISCALES
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
        { name: 'Harina PAN Blanca 1kg', qty: 4, priceUsd: 1.25, subtotalUsd: 5.00, taxRate: 0 },
        { name: 'Aceite de Maíz Mazeite 1L', qty: 2, priceUsd: 3.80, subtotalUsd: 7.60, taxRate: 16 },
        { name: 'Refresco Pepsi Cola 1.5L', qty: 2, priceUsd: 1.90, subtotalUsd: 3.80, taxRate: 16 },
      ],
      taxes: {
        base16: 11.40,
        base8: 0.00,
        exempt: 5.00,
        tax16: 1.82,
        tax8: 0.00,
        igtf3: 0.26,
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
        { name: 'Arroz Primor Grano Entero 1kg', qty: 2, priceUsd: 1.50, subtotalUsd: 3.00, taxRate: 0 },
        { name: 'Harina PAN Blanca 1kg', qty: 1, priceUsd: 1.25, subtotalUsd: 1.25, taxRate: 0 },
      ],
      taxes: { base16: 0, base8: 0, exempt: 4.25, tax16: 0, tax8: 0, igtf3: 0.05 },
    },
  ]);

  // 6. FINANZAS Y GASTOS OPERATIVOS (OPEX / COGS)
  const [financialTransactionsList, setFinancialTransactionsList] = useState<FinancialTransactionItem[]>([
    {
      id: 'tx-1',
      type: 'EGRESO',
      category: 'NOMINA',
      description: 'Pago de quincena personal de caja y almacén',
      amountUsd: 120.00,
      amountBs: 6300.00,
      referenceNumber: 'NOM-2411',
      createdAt: 'Hoy 09:00 AM',
    },
    {
      id: 'tx-2',
      type: 'EGRESO',
      category: 'SERVICIOS',
      description: 'Pago de energía eléctrica y telecomunicaciones',
      amountUsd: 45.00,
      amountBs: 2362.50,
      referenceNumber: 'CORP-8812',
      createdAt: 'Ayer 14:00 PM',
    },
  ]);

  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expType, setExpType] = useState<'EGRESO' | 'INGRESO'>('EGRESO');
  const [expCategory, setExpCategory] = useState('NOMINA');
  const [expDesc, setExpDesc] = useState('');
  const [expAmountUsd, setExpAmountUsd] = useState('');
  const [expRef, setExpRef] = useState('');

  // 7. VENDEDORES EN VIVO
  const [cashiersList, setCashiersList] = useState<CashierStatus[]>([
    {
      id: 'usr-1',
      name: 'Carlos Mendoza',
      username: 'cajero1',
      status: 'ONLINE',
      openCartsCount: 2,
      salesTodayCount: 28,
      salesTodayUsd: 485.60,
      salesTodayBs: 25494.00,
      lastAction: 'Escaneo de EAN-13 7591001001019 (Harina PAN)',
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

  // Sincronización en vivo de tasas venezolanas (Multi-fuente resiliente)
  const fetchLiveRates = async () => {
    setIsSyncingRates(true);
    try {
      // 1. Intentar endpoint backend con caché en memoria y reintentos concurrentes
      const res = await fetch('/api/v1/exchange-rates/live');
      if (res.ok) {
        const data = await res.json();
        if (data && data.bcv?.rate) {
          setRatesData(data);
          setBcvRate(data.bcv.rate);
          setIsSyncingRates(false);
          return;
        }
      }
    } catch {
      // Backend inaccesible o CORS en dev
    }

    // 2. Fallback directo en el navegador a DolarApi Oficial
    try {
      const [resOficial, resParalelo, resEuro] = await Promise.allSettled([
        fetch('https://ve.dolarapi.com/v1/dolares/oficial'),
        fetch('https://ve.dolarapi.com/v1/dolares/paralelo'),
        fetch('https://ve.dolarapi.com/v1/euros/oficial')
      ]);

      let bcvPromedio = 919.82;
      let bcvFecha = new Date().toISOString();
      let paraleloPromedio = 1112.00;
      let euroPromedio = 1011.00;

      if (resOficial.status === 'fulfilled' && resOficial.value.ok) {
        const d = await resOficial.value.json();
        if (d.promedio) {
          bcvPromedio = d.promedio;
          bcvFecha = d.fechaActualizacion || bcvFecha;
        }
      }

      if (resParalelo.status === 'fulfilled' && resParalelo.value.ok) {
        const d = await resParalelo.value.json();
        if (d.promedio) paraleloPromedio = d.promedio;
      }

      if (resEuro.status === 'fulfilled' && resEuro.value.ok) {
        const d = await resEuro.value.json();
        if (d.promedio) euroPromedio = d.promedio;
      }

      const clientRates = {
        bcv: {
          title: 'Banco Central de Venezuela (Oficial)',
          rate: bcvPromedio,
          lastUpdated: bcvFecha,
        },
        monitor: {
          title: 'Promedio Paralelo / Monitor',
          rate: paraleloPromedio,
          lastUpdated: bcvFecha,
        },
        euro: {
          title: 'Euro BCV Oficial',
          rate: euroPromedio,
          lastUpdated: bcvFecha,
        },
        usdt: {
          title: 'Cripto Binance P2P / USDT',
          rate: paraleloPromedio * 1.015,
          lastUpdated: bcvFecha,
        },
      };

      setRatesData(clientRates);
      setBcvRate(bcvPromedio);
    } catch (e) {
      console.warn('Fallback a tasa base BCV 919.82:', e);
      setBcvRate(919.82);
    } finally {
      setIsSyncingRates(false);
    }
  };

  useEffect(() => {
    fetchLiveRates();
    // Auto-actualización periódica cada 10 minutos
    const interval = setInterval(fetchLiveRates, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Manejo de Cámara Web
  useEffect(() => {
    if (cameraActive && videoRef.current) {
      navigator.mediaDevices
        ?.getUserMedia({ video: { facingMode: 'environment' } })
        .then((stream) => {
          if (videoRef.current) videoRef.current.srcObject = stream;
        })
        .catch((err) => {
          console.warn('Cámara no disponible:', err);
          alert('No se pudo acceder a la cámara web. Puedes ingresar el código manualmente.');
          setCameraActive(false);
        });
    } else if (!cameraActive && videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
    }
  }, [cameraActive]);

  // Cálculos Financieros
  const totalInventoryCostUsd = inventoryList.reduce((acc, p) => acc + p.costPriceUsd * p.stock, 0);
  const totalInventoryRetailUsd = inventoryList.reduce((acc, p) => acc + p.salePriceUsd * p.stock, 0);
  const totalProjectedProfitUsd = totalInventoryRetailUsd - totalInventoryCostUsd;
  const averageMargin = totalInventoryRetailUsd > 0 ? ((totalProjectedProfitUsd / totalInventoryRetailUsd) * 100).toFixed(1) : '0';
  const lowStockItems = inventoryList.filter((p) => p.stock <= p.minStockAlert);

  const totalGrossSalesUsd = salesHistory.filter((s) => s.status === 'COMPLETADA').reduce((acc, s) => acc + s.totalUsd, 0);
  const totalExpensesUsd = financialTransactionsList.filter((t) => t.type === 'EGRESO').reduce((acc, t) => acc + t.amountUsd, 0);
  const totalOtherIncomeUsd = financialTransactionsList.filter((t) => t.type === 'INGRESO').reduce((acc, t) => acc + t.amountUsd, 0);
  const netProfitUsd = totalGrossSalesUsd + totalOtherIncomeUsd - totalExpensesUsd;

  // Login handler con soporte completo para Súper Admin, Admin y Vendedor
  const handleLogin = (roleToSet?: 'SUPER_ADMIN' | 'ADMIN' | 'VENDEDOR') => {
    let userRole = roleToSet;
    let uName = usernameInput.trim();

    if (!userRole) {
      if (uName === 'superadmin') userRole = 'SUPER_ADMIN';
      else if (uName === 'cajero1') userRole = 'VENDEDOR';
      else userRole = 'ADMIN';
    } else {
      if (userRole === 'SUPER_ADMIN') uName = 'superadmin';
      else if (userRole === 'VENDEDOR') uName = 'cajero1';
      else uName = 'admin';
    }

    const loggedProfile: UserProfile = {
      id:
        userRole === 'SUPER_ADMIN'
          ? '00000000-0000-0000-0000-000000000001'
          : userRole === 'VENDEDOR'
          ? '8cb3bb66-6b60-4966-9bc6-e8220f122557'
          : '24a8eccf-b45e-4d5a-ac01-b44b77198c10',
      tenantId: 'a0000000-0000-0000-0000-000000000001',
      username: uName,
      fullName:
        userRole === 'SUPER_ADMIN'
          ? 'Súper Administrador Global'
          : userRole === 'VENDEDOR'
          ? 'Carlos Mendoza (Cajero)'
          : 'Dueño Administrador',
      roleId: userRole,
      businessName:
        userRole === 'SUPER_ADMIN'
          ? 'Plataforma Global Vuelto SaaS'
          : 'Inversiones Bodega Central C.A.',
    };

    setUser(loggedProfile);
    setUserRoleMode(userRole);
    localStorage.setItem('vuelto_user_session', JSON.stringify(loggedProfile));
    setActiveTab(userRole === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : userRole === 'VENDEDOR' ? 'POS' : 'METRICS');
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('vuelto_user_session');
  };

  // Guardar Producto
  const handleSaveProduct = () => {
    if (!newProdName || !newProdSaleUsd) {
      alert('Por favor ingrese el nombre y precio de salida del producto.');
      return;
    }

    const saleNum = parseFloat(newProdSaleUsd);
    const costNum = parseFloat(newProdCostUsd) || 0;
    const finalBarcode = newProdBarcode ? ensureValidEan13(newProdBarcode) : ensureValidEan13('7591005' + Math.floor(10000 + Math.random() * 90000));

    const newItem: ProductItem = {
      id: `p-${Date.now()}`,
      name: newProdName,
      barcode: finalBarcode,
      sku: `PROD-${Math.floor(100 + Math.random() * 900)}`,
      category: newProdCategory,
      unitOfMeasure: newProdUom,
      supplier: newProdSupplier,
      supplierPhone: newProdSupplierPhone,
      costPriceUsd: costNum,
      salePriceUsd: saleNum,
      taxRate: 16,
      stock: parseInt(newProdStock, 10) || 10,
      minStockAlert: parseInt(newProdMinStock, 10) || 5,
      lastPurchaseDate: new Date().toISOString().split('T')[0],
      inflationDeltaPercent: 2.5,
    };

    setInventoryList([newItem, ...inventoryList]);
    setIsAddModalOpen(false);
    setCameraActive(false);
    alert(`¡Producto "${newItem.name}" registrado en inventario con código GS1 ${newItem.barcode}!`);
  };

  // Guardar Ajuste Físico de Stock (Kardex)
  const handleSaveStockAdjustment = () => {
    if (!selectedStockProduct) return;
    const qty = parseFloat(adjustQty);
    if (isNaN(qty)) return;

    let newStock = selectedStockProduct.stock;
    if (adjustMovementType === 'IN') newStock += qty;
    else if (adjustMovementType === 'OUT') newStock = Math.max(0, newStock - qty);
    else if (adjustMovementType === 'ADJUSTMENT') newStock = qty;

    setInventoryList(
      inventoryList.map((p) => (p.id === selectedStockProduct.id ? { ...p, stock: newStock } : p))
    );

    const movement: KardexMovementItem = {
      id: `k-${Date.now()}`,
      productName: selectedStockProduct.name,
      movementType: adjustMovementType,
      quantity: qty,
      unitCostUsd: selectedStockProduct.costPriceUsd,
      reason: adjustReason,
      createdAt: 'Ahora mismo',
      user: user?.username || 'admin',
    };

    setKardexHistory([movement, ...kardexHistory]);
    setIsStockAdjustModalOpen(false);
    alert(`Ajuste registrado en Kardex. Nuevo stock de ${selectedStockProduct.name}: ${newStock} unidades.`);
  };

  // Guardar Proveedor
  const handleSaveSupplier = () => {
    if (!supName || !supDocNumber || !supPhone) {
      alert('Nombre, RIF y Teléfono WhatsApp son obligatorios.');
      return;
    }

    if (editingSupplier) {
      setSuppliersList(
        suppliersList.map((s) =>
          s.id === editingSupplier.id
            ? { ...s, name: supName, documentType: supDocType, documentNumber: supDocNumber, phone: supPhone, email: supEmail, address: supAddress }
            : s
        )
      );
      alert('Proveedor actualizado con éxito.');
    } else {
      const newSup: SupplierItem = {
        id: `sup-${Date.now()}`,
        name: supName,
        documentType: supDocType,
        documentNumber: supDocNumber,
        phone: supPhone,
        email: supEmail || 'contacto@proveedor.ve',
        address: supAddress || 'Venezuela',
        creditDays: 15,
        isActive: true,
      };
      setSuppliersList([...suppliersList, newSup]);
      alert(`Proveedor "${newSup.name}" registrado con éxito.`);
    }

    setIsSupplierModalOpen(false);
    setEditingSupplier(null);
  };

  // Guardar Pedido a Proveedor
  const handleSavePurchaseOrder = () => {
    const sup = suppliersList.find((s) => s.id === orderSupplierId) || suppliersList[0];
    const prod = inventoryList.find((p) => p.id === orderProductId) || inventoryList[0];
    const qty = parseFloat(orderQty) || 10;
    const cost = parseFloat(orderCostUsd) || prod.costPriceUsd;
    const totalUsd = qty * cost;

    const newOrder: PurchaseOrderItem = {
      id: `po-${Date.now()}`,
      orderNumber: `OC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      supplierId: sup.id,
      supplierName: sup.name,
      supplierPhone: sup.phone,
      status: 'DRAFT',
      expectedDeliveryDate: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
      totalEstimatedUsd: totalUsd,
      notes: orderNotes,
      createdAt: 'Ahora mismo',
      lines: [{ productName: prod.name, qty, unitCostUsd: cost, subtotalUsd: totalUsd }],
    };

    setPurchaseOrdersList([newOrder, ...purchaseOrdersList]);
    setIsOrderModalOpen(false);
    alert(`Orden de compra ${newOrder.orderNumber} creada para ${sup.name}.`);
  };

  // Enviar Pedido por WhatsApp
  const handleSendOrderWhatsApp = (order: PurchaseOrderItem) => {
    const linesText = order.lines.map((l) => `- ${l.qty} unids x ${l.productName} ($${l.unitCostUsd.toFixed(2)}) = $${l.subtotalUsd.toFixed(2)}`).join('\n');
    const msg = `*ORDEN DE COMPRA: ${order.orderNumber}*\nComercio: ${user?.businessName}\nProveedor: ${order.supplierName}\n\n*Productos Solicitados:*\n${linesText}\n\n*Total Estimado:* $${order.totalEstimatedUsd.toFixed(2)} USD (≈ ${(order.totalEstimatedUsd * bcvRate).toFixed(2)} Bs)\nNotas: ${order.notes}\n\nAgradecemos confirmación de despacho.`;
    const cleanPhone = order.supplierPhone.replace(/\D/g, '');
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');

    setPurchaseOrdersList(
      purchaseOrdersList.map((o) => (o.id === order.id ? { ...o, status: 'SENT_WHATSAPP' } : o))
    );
  };

  // Recibir Mercancía de Pedido
  const handleReceiveOrder = (order: PurchaseOrderItem) => {
    // Aumentar stock de productos
    for (const line of order.lines) {
      setInventoryList((prev) =>
        prev.map((p) => (p.name === line.productName ? { ...p, stock: p.stock + line.qty } : p))
      );
      // Registrar en Kardex
      setKardexHistory((prev) => [
        {
          id: `k-${Date.now()}-${Math.random()}`,
          productName: line.productName,
          movementType: 'IN',
          quantity: line.qty,
          unitCostUsd: line.unitCostUsd,
          reason: `Recepción mercancía ${order.orderNumber}`,
          createdAt: 'Ahora mismo',
          user: user?.username || 'admin',
        },
        ...prev,
      ]);
    }

    setPurchaseOrdersList(
      purchaseOrdersList.map((o) => (o.id === order.id ? { ...o, status: 'RECEIVED' } : o))
    );
    alert(`¡Mercancía de ${order.orderNumber} recibida exitosamente! Stock actualizado en Kardex.`);
  };

  // Registrar Abono de Cobranza
  const handleRegisterPayment = () => {
    if (!selectedDebtor || !payAmountUsd) return;
    const amount = parseFloat(payAmountUsd);
    if (isNaN(amount) || amount <= 0) return;

    const remainingDebt = Math.max(0, selectedDebtor.balanceDueUsd - amount);

    setCustomerDebts(
      customerDebts.map((c) =>
        c.id === selectedDebtor.id ? { ...c, balanceDueUsd: remainingDebt, isOverdue: remainingDebt > 0 && c.isOverdue } : c
      )
    );

    const rec: ReceivablePaymentRecord = {
      id: `rec-${Date.now()}`,
      customerName: selectedDebtor.name,
      customerDoc: selectedDebtor.document,
      amountUsd: amount,
      amountBs: amount * bcvRate,
      paymentMethod: payMethod,
      referenceNumber: payRef || `REC-${Math.floor(1000 + Math.random() * 9000)}`,
      createdAt: 'Ahora mismo',
      notes: payNotes,
    };

    setPaymentHistoryList([rec, ...paymentHistoryList]);
    setIsPaymentModalOpen(false);
    alert(`Abono de $${amount.toFixed(2)} USD registrado para ${selectedDebtor.name}. Deuda restante: $${remainingDebt.toFixed(2)} USD.`);
  };

  // Cobro WhatsApp con Desglose de Mora
  const handleSendDebtReminderWhatsApp = (debt: CustomerDebt) => {
    const surcharge = debt.isOverdue && !debt.waived && autoApplyMora ? debt.balanceDueUsd * (surchargeRate / 100) : 0;
    const totalToPay = debt.balanceDueUsd + surcharge;
    const totalBs = (totalToPay * bcvRate).toFixed(2);

    const msg = `Estimado(a) *${debt.name}* (${debt.document}), le informamos de su saldo pendiente con *${user?.businessName}*:\n\n- Deuda Base: $${debt.balanceDueUsd.toFixed(2)} USD\n${surcharge > 0 ? `- Recargo por Mora (${surchargeRate}%): +$${surcharge.toFixed(2)} USD\n` : ''}*TOTAL A CANCELAR:* $${totalToPay.toFixed(2)} USD (≈ ${totalBs} Bs a tasa oficial BCV: ${bcvRate.toFixed(2)})\n\nAgradecemos gestionar su pago.`;
    const cleanPhone = debt.phone.replace(/\D/g, '');
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  // Condonar / Eximir Mora
  const handleWaiveLateFee = (debtorId: string) => {
    setCustomerDebts(
      customerDebts.map((c) => (c.id === debtorId ? { ...c, waived: true, surchargeUsd: 0 } : c))
    );
    alert('Mora condonada para este cliente por decisión administrativa.');
  };

  // Guardar Gasto / Transacción Financiera
  const handleSaveExpense = () => {
    const amount = parseFloat(expAmountUsd);
    if (!expDesc || isNaN(amount) || amount <= 0) {
      alert('Descripción y monto son obligatorios.');
      return;
    }

    const tx: FinancialTransactionItem = {
      id: `tx-${Date.now()}`,
      type: expType,
      category: expCategory,
      description: expDesc,
      amountUsd: amount,
      amountBs: amount * bcvRate,
      referenceNumber: expRef || `TX-${Math.floor(1000 + Math.random() * 9000)}`,
      createdAt: 'Ahora mismo',
    };

    setFinancialTransactionsList([tx, ...financialTransactionsList]);
    setIsExpenseModalOpen(false);
    alert(`Transacción de ${expType} por $${amount.toFixed(2)} USD registrada.`);
  };

  // Anular Venta / Nota de Crédito
  const handleCancelSale = (saleId: string) => {
    if (!confirm('¿Seguro que deseas anular esta factura fiscal? Generará una Nota de Crédito SENIAT y devolverá el stock a Kardex.')) return;

    const sale = salesHistory.find((s) => s.id === saleId);
    if (!sale) return;

    // Devolver stock
    for (const item of sale.items) {
      setInventoryList((prev) =>
        prev.map((p) => (p.name === item.name ? { ...p, stock: p.stock + item.qty } : p))
      );
      setKardexHistory((prev) => [
        {
          id: `k-${Date.now()}-${Math.random()}`,
          productName: item.name,
          movementType: 'RETURN',
          quantity: item.qty,
          unitCostUsd: 0.95,
          reason: `Anulación factura ${sale.invoiceFormattedNumber}`,
          createdAt: 'Ahora mismo',
          user: user?.username || 'admin',
        },
        ...prev,
      ]);
    }

    setSalesHistory(
      salesHistory.map((s) => (s.id === saleId ? { ...s, status: 'ANULADA' } : s))
    );
    if (selectedSale?.id === saleId) {
      setSelectedSale({ ...selectedSale, status: 'ANULADA' });
    }
    alert(`Factura ${sale.invoiceFormattedNumber} ANULADA. Mercancía retornada a inventario.`);
  };

  // --- MANEJADORES DE PUNTO DE VENTA (POS) ---
  const handlePosAddToCart = (prod: ProductItem, addQty: number = 1) => {
    const existing = cartLines.find((c) => c.productId === prod.id);
    if (existing) {
      setCartLines(
        cartLines.map((c) => (c.productId === prod.id ? { ...c, qty: +(c.qty + addQty).toFixed(3) } : c))
      );
    } else {
      setCartLines([
        ...cartLines,
        {
          productId: prod.id,
          name: prod.name,
          barcode: prod.barcode,
          priceUsd: prod.salePriceUsd,
          qty: addQty,
          unitOfMeasure: prod.unitOfMeasure || 'UNIDAD',
          isExempt: prod.taxRate === 0,
          taxRate: prod.taxRate,
        },
      ]);
    }
    playScanBeep(true);
    setIsScanSuccessFlash(true);
    setTimeout(() => setIsScanSuccessFlash(false), 350);
  };

  const handlePosUpdateCartQty = (productId: string, newQty: number) => {
    if (newQty <= 0) {
      setCartLines(cartLines.filter((c) => c.productId !== productId));
    } else {
      setCartLines(cartLines.map((c) => (c.productId === productId ? { ...c, qty: +newQty.toFixed(3) } : c)));
    }
  };

  // Escaneo Inteligente con Fallback (Código de Barras -> SKU -> Nombre)
  const handlePosBarcodeScan = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!posBarcodeQuery.trim()) return;

    const rawQuery = posBarcodeQuery.trim();
    const query = rawQuery.toLowerCase();

    // 1. Escaneo Directo por Código de Barras Exacto
    const exactBarcode = inventoryList.find((p) => p.barcode === rawQuery || p.barcode.toLowerCase() === query);
    if (exactBarcode) {
      handlePosAddToCart(exactBarcode, 1);
      setPosBarcodeQuery('');
      setPosScanFeedback({
        type: 'success',
        message: `✅ ¡Escaneado: ${exactBarcode.name} (${exactBarcode.unitOfMeasure || 'UNIDAD'}) agregado!`,
      });
      return;
    }

    // 2. Fallback: Búsqueda por SKU o Código Interno
    const matchSku = inventoryList.find((p) => p.sku.toLowerCase() === query || p.sku.toUpperCase() === rawQuery.toUpperCase());
    if (matchSku) {
      handlePosAddToCart(matchSku, 1);
      setPosBarcodeQuery('');
      setPosScanFeedback({
        type: 'success',
        message: `🔍 Código SKU encontrado: ${matchSku.name} (${matchSku.unitOfMeasure || 'UNIDAD'})`,
      });
      return;
    }

    // 3. Fallback: Búsqueda por Coincidencia en Nombre
    const nameMatches = inventoryList.filter((p) => p.name.toLowerCase().includes(query));
    if (nameMatches.length === 1) {
      handlePosAddToCart(nameMatches[0], 1);
      setPosBarcodeQuery('');
      setPosScanFeedback({
        type: 'info',
        message: `🔍 Agregado por coincidencia: ${nameMatches[0].name} (${nameMatches[0].unitOfMeasure || 'UNIDAD'})`,
      });
      return;
    } else if (nameMatches.length > 1) {
      playScanBeep(true);
      setPosScanFeedback({
        type: 'info',
        message: `🔍 ${nameMatches.length} coincidencias encontradas. Selecciona una en el listado desplegable:`,
      });
      return;
    }

    // 4. Si no se encuentra
    playScanBeep(false);
    setPosScanFeedback({
      type: 'warning',
      message: `⚠️ No se encontró "${rawQuery}" por código de barras ni nombre.`,
    });
  };

  // Búsqueda de Cliente por C.I. y Registro Rápido
  const handlePosSearchCustomerByCi = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanDoc = posCiSearchInput.replace(/[^0-9]/g, '');
    if (!cleanDoc) {
      alert('Ingresa el número de Cédula o RIF para consultar.');
      return;
    }

    const found =
      posCustomerList.find((c) => c.documentNumber === cleanDoc && c.documentType === posCiDocType) ||
      posCustomerList.find((c) => c.documentNumber === cleanDoc);

    if (found) {
      setPosSelectedCustomer(found);
      setShowQuickCustomerForm(false);
      setPosCustomerFeedback({
        type: 'success',
        message: `✅ Cliente Encontrado: ${found.documentType}-${found.documentNumber} ${found.name}`,
      });
    } else {
      setShowQuickCustomerForm(true);
      setPosCustomerFeedback({
        type: 'warning',
        message: `⚠️ Cliente ${posCiDocType}-${cleanDoc} no existe en la base de datos. Complete los datos para registrarlo:`,
      });
    }
  };

  const handleSaveQuickPosCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanDoc = posCiSearchInput.replace(/[^0-9]/g, '');
    if (!quickCustomerFirstName.trim()) {
      alert('El Nombre del cliente es obligatorio.');
      return;
    }

    const fullName = `${quickCustomerFirstName.trim()} ${quickCustomerLastName.trim()}`.trim();
    const newCust = {
      id: `cust-${Date.now()}`,
      name: fullName,
      documentType: posCiDocType,
      documentNumber: cleanDoc || String(Math.floor(10000000 + Math.random() * 90000000)),
      phone: quickCustomerPhone.trim(),
      balanceDue: 0,
      isSpecialMoraCustomer: false,
    };

    setPosCustomerList((prev) => [newCust, ...prev]);
    setPosSelectedCustomer(newCust);
    setShowQuickCustomerForm(false);
    setQuickCustomerFirstName('');
    setQuickCustomerLastName('');
    setQuickCustomerPhone('');
    setPosCustomerFeedback({
      type: 'success',
      message: `✅ ¡Cliente ${newCust.documentType}-${newCust.documentNumber} ${newCust.name} guardado y asignado a la venta!`,
    });
  };

  // Cálculos de Totales POS
  const posSubtotalUsd = cartLines.reduce((acc, it) => acc + it.priceUsd * it.qty, 0);
  const posTax16Usd = enableIva
    ? cartLines.filter((i) => !i.isExempt && i.taxRate === 16).reduce((acc, i) => acc + i.priceUsd * i.qty * 0.16, 0)
    : 0;
  const posTax8Usd = enableIva
    ? cartLines.filter((i) => !i.isExempt && i.taxRate === 8).reduce((acc, i) => acc + i.priceUsd * i.qty * 0.08, 0)
    : 0;
  const posIgtfUsd = enableIgtf && posPaymentMethod === 'CASH_USD' ? posSubtotalUsd * 0.03 : 0;
  const posTotalUsd = posSubtotalUsd + posTax16Usd + posTax8Usd + posIgtfUsd;
  const posTotalBs = posTotalUsd * activeRate;

  const posCashAmountNum = parseFloat(posCashAmountUsd) || 0;
  const posCashVesNum = parseFloat(posCashAmountVes) || 0;
  const posChangeUsd =
    posPaymentMethod === 'CASH_USD' && posCashAmountNum > posTotalUsd
      ? posCashAmountNum - posTotalUsd
      : posPaymentMethod === 'CASH_VES' && posCashVesNum > posTotalBs
      ? (posCashVesNum - posTotalBs) / (activeRate || 1)
      : 0;
  const posChangeBs =
    posPaymentMethod === 'CASH_USD' && posCashAmountNum > posTotalUsd
      ? (posCashAmountNum - posTotalUsd) * activeRate
      : posPaymentMethod === 'CASH_VES' && posCashVesNum > posTotalBs
      ? posCashVesNum - posTotalBs
      : 0;

  // Confirmar Venta POS y Emitir Comprobante Digital
  const handlePosConfirmSale = () => {
    if (cartLines.length === 0) {
      alert('El carrito está vacío. Agrega productos para facturar.');
      return;
    }

    // Validación de mora y crédito
    const hasDebt = posSelectedCustomer.balanceDue > 0 || posSelectedCustomer.isSpecialMoraCustomer;
    if (posPaymentMethod === 'CREDIT_DEBT' && hasDebt && !posAdminApproved && !isAdmin) {
      alert(
        `El cliente ${posSelectedCustomer.name} posee deuda previa ($${posSelectedCustomer.balanceDue.toFixed(2)} USD). Esta venta a crédito requiere aprobación y clave del Administrador.`
      );
      return;
    }

    const nextInvoiceNum = `FACT-A-${String(Math.floor(100000 + Math.random() * 900000)).padStart(8, '0')}`;
    const nowStr = new Date().toLocaleString('es-VE');

    // Descontar inventario
    for (const line of cartLines) {
      setInventoryList((prev) =>
        prev.map((p) => (p.id === line.productId ? { ...p, stock: Math.max(0, p.stock - line.qty) } : p))
      );
      setKardexHistory((prev) => [
        {
          id: `k-${Date.now()}-${Math.random()}`,
          productName: line.name,
          movementType: 'SALE',
          quantity: line.qty,
          unitCostUsd: 0.95,
          reason: `Venta POS ${nextInvoiceNum}`,
          createdAt: 'Ahora mismo',
          user: user?.username || 'cajero1',
        },
        ...prev,
      ]);
    }

    // Registrar en Historial de Ventas
    const saleItem: SaleRecord = {
      id: `s-${Date.now()}`,
      invoiceFormattedNumber: nextInvoiceNum,
      createdAt: nowStr,
      customerName: posSelectedCustomer.name,
      customerDoc: `${posSelectedCustomer.documentType}-${posSelectedCustomer.documentNumber}`,
      cashierName: `${user?.fullName} (${user?.username})`,
      totalUsd: posTotalUsd,
      totalBs: posTotalBs,
      rateValue: activeRate,
      status: 'COMPLETADA',
      items: cartLines.map((c) => ({
        name: c.name,
        qty: c.qty,
        priceUsd: c.priceUsd,
        subtotalUsd: c.priceUsd * c.qty,
        taxRate: enableIva ? c.taxRate : 0,
      })),
      taxes: {
        base16: enableIva ? posSubtotalUsd : 0,
        base8: 0,
        exempt: !enableIva ? posSubtotalUsd : 0,
        tax16: posTax16Usd,
        tax8: 0,
        igtf3: posIgtfUsd,
      },
    };
    setSalesHistory([saleItem, ...salesHistory]);

    // Si el método de pago es Derivar a Administrador, registrar en Morosidad con lista detallada de lo llevado
    if (posPaymentMethod === 'DERIVAR_ADMIN') {
      const newDebtItem: CustomerDebt = {
        id: `debt-${Date.now()}`,
        name: posSelectedCustomer.name,
        document: `${posSelectedCustomer.documentType}-${posSelectedCustomer.documentNumber}`,
        phone: posSelectedCustomer.phone || '',
        balanceDueUsd: posTotalUsd,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        isOverdue: false,
        lateDays: 0,
        surchargeUsd: 0,
        waived: false,
        invoiceNumber: nextInvoiceNum,
        cashierName: `${user?.fullName} (${user?.username})`,
        itemsTaken: cartLines.map((c) => ({
          name: c.name,
          qty: c.qty,
          priceUsd: c.priceUsd,
          subtotalUsd: +(c.priceUsd * c.qty).toFixed(2),
        })),
      };
      setCustomerDebts((prev) => [newDebtItem, ...prev]);
      setPosCustomerList((prev) =>
        prev.map((c) =>
          c.id === posSelectedCustomer.id
            ? { ...c, balanceDue: +(c.balanceDue + posTotalUsd).toFixed(2), isSpecialMoraCustomer: true }
            : c
        )
      );
    }

    // Registrar en Auditoría
    setAuditLogsList((prev) => [
      {
        id: `aud-${Date.now()}`,
        action: 'SALE_CONFIRMED',
        entity: 'sale',
        entityId: nextInvoiceNum,
        payload: {
          invoice: nextInvoiceNum,
          customer: posSelectedCustomer.name,
          totalUsd: posTotalUsd.toFixed(2),
          totalBs: posTotalBs.toFixed(2),
          paymentMethod: posPaymentMethod,
          activeRate,
        },
        result: 'SUCCESS',
        channel: 'POS_WEB',
        createdAt: 'Ahora mismo',
        user: user?.username || 'cajero1',
      },
      ...prev,
    ]);

    // Preparar objeto para el modal de éxito con WhatsApp
    setCompletedSaleModal({
      ...saleItem,
      customerPhone: posSelectedCustomer.phone,
      paymentMethod: posPaymentMethod === 'DERIVAR_ADMIN' ? 'DERIVADO A ADMINISTRADOR (MOROSIDAD)' : posPaymentMethod,
      vueltoUsd: posChangeUsd,
      vueltoBs: posChangeBs,
    });

    // Limpiar carrito
    setCartLines([]);
    setPosAdminApproved(false);
    setPosAdminPinInput('');
  };

  // Generador de enlace WhatsApp para Factura / Nota de Entrega Digital
  const getWhatsAppDeliveryNoteUrl = (sale: any) => {
    if (!sale) return '#';
    const phone = sale.customerPhone ? sale.customerPhone.replace(/\D/g, '') : '';
    const cleanPhone = phone.startsWith('58') ? phone : '58' + phone.replace(/^0+/, '');
    const itemsText = sale.items
      .map((it: any) => `• ${it.qty}x ${it.name}: $${it.subtotalUsd.toFixed(2)} (${(it.subtotalUsd * sale.rateValue).toFixed(2)} Bs)`)
      .join('\n');

    const msg = `*${user?.businessName || 'VUELTO POS'}* - *NOTA DE ENTREGA / FACTURA DIGITAL*\n*N°:* ${sale.invoiceFormattedNumber}\n*Fecha:* ${sale.createdAt}\n*Cliente:* ${sale.customerName} (${sale.customerDoc})\n--------------------------------\n${itemsText}\n--------------------------------\n*Total a Pagar:* $${sale.totalUsd.toFixed(2)} USD ≈ ${sale.totalBs.toFixed(2)} Bs\n*Tasa Aplicada:* ${sale.rateValue.toFixed(2)} Bs/$\n*Método de Pago:* ${sale.paymentMethod}\n${sale.vueltoUsd > 0 ? `*Vuelto Entregado:* $${sale.vueltoUsd.toFixed(2)} USD (${sale.vueltoBs.toFixed(2)} Bs)\n` : ''}\n_¡Gracias por su compra! Conserve este comprobante digital._`;

    return cleanPhone ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}` : `https://wa.me/?text=${encodeURIComponent(msg)}`;
  };

  // Manejador de Margen Global Masivo
  const handleApplyGlobalMargin = () => {
    const margin = parseFloat(globalMarginInput);
    if (isNaN(margin) || margin <= 0) {
      alert('Por favor ingrese un porcentaje de margen válido (ej. 30%)');
      return;
    }
    const factor = 1 + margin / 100;
    const updated = inventoryList.map((p) => {
      if (globalMarginCategory === 'ALL' || p.category === globalMarginCategory) {
        if (p.costPriceUsd > 0) {
          const newPrice = +(p.costPriceUsd * factor).toFixed(2);
          return { ...p, salePriceUsd: newPrice };
        }
      }
      return p;
    });
    setInventoryList(updated);

    setAuditLogsList((prev) => [
      {
        id: `aud-${Date.now()}`,
        action: 'APPLY_GLOBAL_PROFIT_MARGIN',
        entity: 'product',
        payload: { marginPercentage: margin, category: globalMarginCategory, count: updated.length },
        result: 'SUCCESS',
        channel: 'WEB_ADMIN',
        createdAt: 'Ahora mismo',
        user: user?.username || 'admin',
      },
      ...prev,
    ]);

    fetch('/api/v1/products/apply-global-margin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ marginPercentage: margin, category: globalMarginCategory }),
    }).catch(() => {});

    alert(`✅ ¡Margen del ${margin}% aplicado masivamente a los productos seleccionados (${globalMarginCategory === 'ALL' ? 'Catálogo Completo' : globalMarginCategory})!`);
  };

  // Descarga de Backup
  const handleDownloadBackup = () => {
    setIsBackupDownloading(true);
    const backupData = {
      version: '1.2.0',
      system: 'Vuelto SaaS Venezuela',
      generatedAt: new Date().toISOString(),
      tenant: { name: user?.businessName, rif: 'J-123456789' },
      summary: {
        totalProducts: inventoryList.length,
        totalSuppliers: suppliersList.length,
        totalSales: salesHistory.length,
        totalCustomers: posCustomerList.length,
      },
      data: {
        products: inventoryList,
        suppliers: suppliersList,
        purchaseOrders: purchaseOrdersList,
        salesHistory: salesHistory,
        receivables: customerDebts,
        finances: financialTransactionsList,
        auditLogs: auditLogsList,
      },
    };

    setTimeout(() => {
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_vuelto_${user?.tenantId ? user.tenantId.slice(0, 8) : 'central'}_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      setIsBackupDownloading(false);
      alert('✅ ¡Copia de seguridad (Backup JSON) exportada y descargada exitosamente!');
    }, 600);
  };

  // --- MÓDULO SÚPER ADMINISTRADOR GLOBAL (CRUD DE NEGOCIOS / TENANTS) ---
  const [tenantsList, setTenantsList] = useState<TenantItem[]>([
    {
      id: 't-1',
      slug: 'automercado-miranda',
      businessName: 'Automercado Miranda C.A.',
      tradeName: 'Automercado Miranda',
      documentType: 'J',
      documentNumber: '401234567',
      fiscalAddress: 'Av. Francisco de Miranda, Los Palos Grandes, Caracas',
      phone: '+584121112233',
      email: 'contacto@automercadomiranda.com',
      isSpecialTaxpayer: true,
      internalBarcodePrefix: '200',
      isActive: true,
      usersCount: 4,
      productsCount: 340,
      invoicesCount: 1250,
      totalSalesUsd: 14250.0,
      createdAt: '2026-01-15',
    },
    {
      id: 't-2',
      slug: 'los-proceres',
      businessName: 'Distribuidora Los Próceres C.A.',
      tradeName: 'Los Próceres',
      documentType: 'J',
      documentNumber: '309876543',
      fiscalAddress: 'Paseo Los Ilustres, Caracas',
      phone: '+584149998877',
      email: 'ventas@losproceres.com',
      isSpecialTaxpayer: false,
      internalBarcodePrefix: '201',
      isActive: true,
      usersCount: 2,
      productsCount: 185,
      invoicesCount: 680,
      totalSalesUsd: 8940.0,
      createdAt: '2026-02-10',
    },
    {
      id: 't-3',
      slug: 'abasto-la-estrella',
      businessName: 'Inversiones Abasto La Estrella',
      tradeName: 'Abasto La Estrella',
      documentType: 'V',
      documentNumber: '14523988',
      fiscalAddress: 'Calle Bolívar, Sector El Carmen, Barquisimeto',
      phone: '+584145556677',
      email: 'abastolaestrella@gmail.com',
      isSpecialTaxpayer: false,
      internalBarcodePrefix: '202',
      isActive: true,
      usersCount: 1,
      productsCount: 92,
      invoicesCount: 410,
      totalSalesUsd: 3210.0,
      createdAt: '2026-03-01',
    },
    {
      id: 't-4',
      slug: 'farmacia-san-rafael',
      businessName: 'Farmacia San Rafael C.A.',
      tradeName: 'Farmacia San Rafael',
      documentType: 'J',
      documentNumber: '501234888',
      fiscalAddress: 'Av. Las Delicias, Maracay',
      phone: '+584241234567',
      email: 'sanrafael@farmacias.ve',
      isSpecialTaxpayer: true,
      internalBarcodePrefix: '203',
      isActive: false, // Suspendido
      usersCount: 1,
      productsCount: 64,
      invoicesCount: 120,
      totalSalesUsd: 1100.0,
      createdAt: '2026-03-12',
    },
  ]);

  // CRUD DE SÚPER ADMINISTRADOR (NEGOCIOS / TENANTS)
  const [isAddTenantModalOpen, setIsAddTenantModalOpen] = useState(false);
  const [newTenantBusinessName, setNewTenantBusinessName] = useState('');
  const [newTenantTradeName, setNewTenantTradeName] = useState('');
  const [newTenantDocType, setNewTenantDocType] = useState<'J' | 'G' | 'V' | 'E'>('J');
  const [newTenantDocNumber, setNewTenantDocNumber] = useState('');
  const [newTenantAddress, setNewTenantAddress] = useState('');
  const [newTenantPhone, setNewTenantPhone] = useState('');
  const [newTenantEmail, setNewTenantEmail] = useState('');
  const [newTenantSlug, setNewTenantSlug] = useState('');
  const [newTenantIsSpecial, setNewTenantIsSpecial] = useState(false);
  const [tenantSearchQuery, setTenantSearchQuery] = useState('');
  const [tenantFilterStatus, setTenantFilterStatus] = useState<'ALL' | 'ACTIVE' | 'SUSPENDED' | 'SPECIAL'>('ALL');

  // Estados para Edición, Detalle y Baja de Tenants
  const [editingTenant, setEditingTenant] = useState<TenantItem | null>(null);
  const [isEditTenantModalOpen, setIsEditTenantModalOpen] = useState(false);
  const [deletingTenant, setDeletingTenant] = useState<TenantItem | null>(null);
  const [isDeleteTenantModalOpen, setIsDeleteTenantModalOpen] = useState(false);
  const [selectedTenantDetail, setSelectedTenantDetail] = useState<TenantItem | null>(null);
  const [isViewTenantDetailModalOpen, setIsViewTenantDetailModalOpen] = useState(false);

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTenantBusinessName.trim() || !newTenantDocNumber.trim()) {
      alert('Razón Social y RIF son obligatorios.');
      return;
    }

    const cleanDoc = newTenantDocNumber.replace(/[^0-9]/g, '');
    const cleanSlug = (newTenantSlug || newTenantBusinessName).toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 30);

    const payload = {
      slug: cleanSlug,
      businessName: newTenantBusinessName.trim(),
      tradeName: newTenantTradeName.trim() || newTenantBusinessName.trim(),
      documentType: newTenantDocType,
      documentNumber: cleanDoc,
      fiscalAddress: newTenantAddress.trim() || 'Venezuela',
      phone: newTenantPhone.trim() || '+584120000000',
      email: newTenantEmail.trim() || `${cleanSlug}@vuelto.ve`,
      isSpecialTaxpayer: newTenantIsSpecial,
      internalBarcodePrefix: '204',
      adminFullName: `Admin ${newTenantBusinessName.trim()}`,
      adminUsername: `admin_${cleanSlug.slice(0, 8)}`,
      adminPassword: 'Password2026!',
    };

    try {
      const res = await fetch('/api/v1/tenants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('vuelto_token') || ''}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        const created = data.tenant;
        const newT: TenantItem = {
          id: created.id,
          slug: created.slug,
          businessName: created.businessName,
          tradeName: created.tradeName || created.businessName,
          documentType: created.documentType,
          documentNumber: created.documentNumber,
          fiscalAddress: created.fiscalAddress || 'Venezuela',
          phone: created.phone || '',
          email: created.email || '',
          isSpecialTaxpayer: created.isSpecialTaxpayer,
          internalBarcodePrefix: created.internalBarcodePrefix || '204',
          isActive: created.isActive ?? true,
          usersCount: 1,
          productsCount: 0,
          invoicesCount: 0,
          totalSalesUsd: 0,
          createdAt: new Date().toISOString().slice(0, 10),
        };
        setTenantsList((prev) => [newT, ...prev]);
      } else {
        const newT: TenantItem = {
          id: `t-${Date.now()}`,
          slug: cleanSlug,
          businessName: payload.businessName,
          tradeName: payload.tradeName,
          documentType: payload.documentType,
          documentNumber: payload.documentNumber,
          fiscalAddress: payload.fiscalAddress,
          phone: payload.phone,
          email: payload.email,
          isSpecialTaxpayer: payload.isSpecialTaxpayer,
          internalBarcodePrefix: '204',
          isActive: true,
          usersCount: 1,
          productsCount: 0,
          invoicesCount: 0,
          totalSalesUsd: 0,
          createdAt: new Date().toISOString().slice(0, 10),
        };
        setTenantsList((prev) => [newT, ...prev]);
      }
    } catch {
      const newT: TenantItem = {
        id: `t-${Date.now()}`,
        slug: cleanSlug,
        businessName: payload.businessName,
        tradeName: payload.tradeName,
        documentType: payload.documentType,
        documentNumber: payload.documentNumber,
        fiscalAddress: payload.fiscalAddress,
        phone: payload.phone,
        email: payload.email,
        isSpecialTaxpayer: payload.isSpecialTaxpayer,
        internalBarcodePrefix: '204',
        isActive: true,
        usersCount: 1,
        productsCount: 0,
        invoicesCount: 0,
        totalSalesUsd: 0,
        createdAt: new Date().toISOString().slice(0, 10),
      };
      setTenantsList((prev) => [newT, ...prev]);
    }

    setIsAddTenantModalOpen(false);
    setNewTenantBusinessName('');
    setNewTenantTradeName('');
    setNewTenantDocNumber('');
    setNewTenantAddress('');
    setNewTenantPhone('');
    setNewTenantEmail('');
    setNewTenantSlug('');
    alert(`¡Negocio "${payload.businessName}" creado exitosamente! Credenciales de acceso generadas: Usuario admin_${cleanSlug.slice(0, 8)} | Clave: Password2026!`);
  };

  // U: UPDATE TENANT
  const handleUpdateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTenant) return;

    try {
      await fetch(`/api/v1/tenants/${editingTenant.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('vuelto_token') || ''}`,
        },
        body: JSON.stringify({
          businessName: editingTenant.businessName,
          tradeName: editingTenant.tradeName,
          phone: editingTenant.phone,
          email: editingTenant.email,
          isSpecialTaxpayer: editingTenant.isSpecialTaxpayer,
        }),
      });
    } catch {}

    setTenantsList((prev) =>
      prev.map((t) => (t.id === editingTenant.id ? { ...t, ...editingTenant } : t))
    );
    setIsEditTenantModalOpen(false);
    setEditingTenant(null);
    alert(`Comercio "${editingTenant.businessName}" actualizado correctamente.`);
  };

  // D: DELETE / SUSPEND TENANT
  const handleDeleteTenant = async () => {
    if (!deletingTenant) return;

    try {
      await fetch(`/api/v1/tenants/${deletingTenant.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('vuelto_token') || ''}`,
        },
      });
    } catch {}

    setTenantsList((prev) =>
      prev.map((t) => (t.id === deletingTenant.id ? { ...t, isActive: false } : t))
    );
    setIsDeleteTenantModalOpen(false);
    setDeletingTenant(null);
    alert(`El comercio ha sido dado de baja y sus accesos fueron suspendidos.`);
  };

  // TOGGLE ACTIVE STATUS
  const handleToggleTenantActive = async (tenantId: string) => {
    const current = tenantsList.find((t) => t.id === tenantId);
    if (!current) return;
    const updatedStatus = !current.isActive;

    try {
      await fetch(`/api/v1/tenants/${tenantId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('vuelto_token') || ''}`,
        },
        body: JSON.stringify({ isActive: updatedStatus }),
      });
    } catch {}

    setTenantsList((prev) =>
      prev.map((t) => (t.id === tenantId ? { ...t, isActive: updatedStatus } : t))
    );
    alert(`Estado del comercio "${current.businessName}" cambiado a ${updatedStatus ? 'ACTIVO' : 'SUSPENDIDO'}.`);
  };

  const handleSwitchTenant = (t: TenantItem) => {
    if (user?.roleId === 'SUPER_ADMIN') {
      setUser({
        ...user,
        tenantId: t.id,
        businessName: t.businessName,
      });
      alert(`👑 Súper Admin: Ha conmutado la gestión activa a "${t.businessName}".`);
      setActiveTab('METRICS');
    }
  };

  // LOGIN SCREEN SI NO ESTÁ AUTENTICADO
  if (!user) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#071F27', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <div style={{ width: '100%', maxWidth: '440px', backgroundColor: '#0B3B49', borderRadius: '24px', border: '1px solid #155E75', padding: '36px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.6)' }}>
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <img
              src="/vuelto-logo.jpg"
              alt="Vuelto Logo"
              style={{
                height: '70px',
                objectFit: 'contain',
                margin: '0 auto 16px auto',
                display: 'block',
                borderRadius: '8px',
              }}
            />
            <h1 style={{ fontSize: '38px', fontWeight: '900', color: '#FFFFFF', letterSpacing: '2px', lineHeight: 1 }}>
              vuelto<span style={{ color: '#A3E635' }}>.</span>
            </h1>
            <p style={{ fontSize: '11px', color: '#A3E635', fontWeight: '700', letterSpacing: '2px', marginTop: '6px' }}>
              SISTEMA BIMONEDA & GESTIÓN INTEGRAL
            </p>
            <div style={{ marginTop: '10px', display: 'inline-block', backgroundColor: '#062F3B', padding: '4px 12px', borderRadius: '16px', border: '1px solid #10B98144', fontSize: '11px', color: '#94A3B8' }}>
              BCV Oficial: {bcvRate.toFixed(2)} Bs/$ • SENIAT Prov. 0071
            </div>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); handleLogin(); }} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#CBD5E1', marginBottom: '6px', fontWeight: '600' }}>Usuario</label>
              <input
                type="text"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #334155', backgroundColor: '#062F3B', color: '#FFFFFF', fontSize: '14px', outline: 'none' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#CBD5E1', marginBottom: '6px', fontWeight: '600' }}>Contraseña</label>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #334155', backgroundColor: '#062F3B', color: '#FFFFFF', fontSize: '14px', outline: 'none' }}
              />
            </div>

            <button
              type="submit"
              style={{ width: '100%', padding: '14px', borderRadius: '8px', border: 'none', backgroundColor: '#0284C7', color: '#FFFFFF', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', marginTop: '6px' }}
            >
              Iniciar Sesión
            </button>
          </form>

          <div style={{ display: 'flex', alignItems: 'center', margin: '24px 0', gap: '10px' }}>
            <div style={{ flex: 1, height: '1px', backgroundColor: '#155E75' }} />
            <span style={{ fontSize: '10px', color: '#64748B', fontWeight: 'bold' }}>DEMO RÁPIDO SEGÚN ROL</span>
            <div style={{ flex: 1, height: '1px', backgroundColor: '#155E75' }} />
          </div>

          {/* Tarjeta de Credenciales Oficiales */}
          <div style={{ backgroundColor: '#062F3B', padding: '12px 14px', borderRadius: '10px', border: '1px solid #155E75', marginBottom: '16px' }}>
            <p style={{ fontSize: '11px', fontWeight: 'bold', color: '#A3E635', marginBottom: '6px' }}>
              🔑 Credenciales del Sistema:
            </p>
            <div style={{ fontSize: '11px', color: '#CBD5E1', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div>👑 <strong style={{ color: '#C084FC' }}>Súper Admin:</strong> <code style={{ color: '#F8FAFC' }}>superadmin</code> / <code style={{ color: '#A3E635' }}>SuperAdmin2026!</code> (Crear y gestionar negocios)</div>
              <div>🏢 <strong style={{ color: '#38BDF8' }}>Admin Tienda:</strong> <code style={{ color: '#F8FAFC' }}>admin</code> / <code style={{ color: '#A3E635' }}>Vuelto2026!</code> (Costos, margen en $, tasas, compras)</div>
              <div>🛒 <strong style={{ color: '#10B981' }}>Cajero/Vendedor:</strong> <code style={{ color: '#F8FAFC' }}>cajero1</code> / <code style={{ color: '#A3E635' }}>Vuelto2026!</code> (POS, escaneo con cámara, cobro)</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              onClick={() => handleLogin('SUPER_ADMIN')}
              style={{ padding: '12px', borderRadius: '10px', border: '1px solid #8B5CF644', backgroundColor: '#8B5CF615', color: '#C084FC', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', textAlign: 'left' }}
            >
              👑 Entrar como Súper Administrador Global (superadmin)
              <span style={{ display: 'block', fontSize: '10px', color: '#94A3B8', marginTop: '2px', fontWeight: 'normal' }}>
                Control multi-tenant: crea comercios, suspende/activa tiendas y visualiza volumen global
              </span>
            </button>

            <button
              onClick={() => handleLogin('ADMIN')}
              style={{ padding: '12px', borderRadius: '10px', border: '1px solid #0284C744', backgroundColor: '#0284C715', color: '#38BDF8', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', textAlign: 'left' }}
            >
              🏢 Entrar como Dueño Administrador (admin)
              <span style={{ display: 'block', fontSize: '10px', color: '#94A3B8', marginTop: '2px', fontWeight: 'normal' }}>
                Control total de tienda: Proveedores, Costos, Margen en $, Mora, Finanzas y Tasas BCV
              </span>
            </button>

            <button
              onClick={() => handleLogin('VENDEDOR')}
              style={{ padding: '12px', borderRadius: '10px', border: '1px solid #10B98144', backgroundColor: '#10B98115', color: '#A3E635', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', textAlign: 'left' }}
            >
              🛒 Entrar como Cajero / Vendedor (cajero1)
              <span style={{ display: 'block', fontSize: '10px', color: '#94A3B8', marginTop: '2px', fontWeight: 'normal' }}>
                Vista aislada de ventas: POS, escaneo con cámara, clientes por C.I. y WhatsApp (Costos ocultos)
              </span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: '#071F27', color: '#F8FAFC', position: 'relative' }}>
      {showSplash && <VueltoSplashScreen onFinish={() => setShowSplash(false)} />}
      {showOnboarding && <VueltoOnboardingModal onClose={() => setShowOnboarding(false)} onPlaySplash={() => { setShowOnboarding(false); setShowSplash(true); }} />}

      <style>{`
        @media (max-width: 820px) {
          .vuelto-desktop-sidebar {
            position: fixed !important;
            top: 0; bottom: 0; left: 0;
            width: 290px !important;
            z-index: 1000 !important;
            transform: translateX(-100%);
            transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important;
            box-shadow: 10px 0 30px rgba(0,0,0,0.7) !important;
          }
          .vuelto-desktop-sidebar.open {
            transform: translateX(0) !important;
          }
          .vuelto-mobile-header {
            display: flex !important;
          }
          .vuelto-main-view {
            padding: 16px !important;
          }
        }
        @media (min-width: 821px) {
          .vuelto-mobile-header {
            display: none !important;
          }
          .vuelto-mobile-backdrop {
            display: none !important;
          }
        }
      `}</style>

      {/* CABECERA MÓVIL RESPONSIVE */}
      <header className="vuelto-mobile-header" style={{
        display: 'none',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        backgroundColor: '#0B3B49',
        borderBottom: '1px solid #155E75',
        position: 'sticky',
        top: 0,
        zIndex: 500,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{ background: 'none', border: 'none', color: '#F8FAFC', cursor: 'pointer', padding: '4px' }}
          >
            <Menu size={24} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <img
              src="/vuelto-icon.jpg"
              alt="Vuelto"
              style={{ width: '28px', height: '28px', borderRadius: '6px', objectFit: 'cover' }}
            />
            <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#FFFFFF', letterSpacing: '1px' }}>vuelto<span style={{ color: '#A3E635' }}>.</span></span>
            <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', backgroundColor: isVendedor ? '#10B98122' : '#0284C722', color: isVendedor ? '#A3E635' : '#38BDF8', fontWeight: 'bold' }}>
              {isVendedor ? 'Cajero' : 'Admin'}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ padding: '4px 8px', borderRadius: '12px', backgroundColor: '#062F3B', border: '1px solid #10B98155', fontSize: '11px', color: '#A3E635', fontWeight: 'bold' }}>
            BCV: {bcvRate.toFixed(2)} Bs
          </div>
          <button onClick={handleLogout} title="Cerrar sesión" style={{ background: 'none', border: 'none', color: '#94A3B8', padding: '4px', cursor: 'pointer' }}>
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* OVERLAY PARA CERRAR EL MENÚ EN MÓVIL */}
      {mobileMenuOpen && (
        <div
          className="vuelto-mobile-backdrop"
          onClick={() => setMobileMenuOpen(false)}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(3px)', zIndex: 999 }}
        />
      )}

      <div style={{ display: 'flex', flex: 1, minHeight: '100vh' }}>
        {/* SIDEBAR LATERAL (RESPONSIVE) */}
        <aside
          className={`vuelto-desktop-sidebar ${mobileMenuOpen ? 'open' : ''}`}
          style={{ width: '280px', backgroundColor: '#0B3B49', padding: '24px 16px', borderRight: '1px solid #155E75', display: 'flex', flexDirection: 'column' }}
        >
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <img
                src="/vuelto-icon.jpg"
                alt="Vuelto"
                style={{ width: '38px', height: '38px', borderRadius: '10px', objectFit: 'cover' }}
              />
              <div>
                <h1 style={{ fontSize: '20px', fontWeight: 'bold', color: '#FFFFFF', lineHeight: 1 }}>vuelto<span style={{ color: '#A3E635' }}>.</span></h1>
                <span style={{ fontSize: '10px', color: '#A3E635', fontWeight: 'bold' }}>● Supabase Cloud Conectada</span>
              </div>
            </div>
            <p style={{ fontSize: '11px', color: '#94A3B8' }}>{user.businessName}</p>
          </div>

          {/* DISTINTIVO DE ROL */}
          <div style={{
            padding: '6px 10px',
            borderRadius: '8px',
            backgroundColor: isVendedor ? '#10B98122' : '#0284C722',
            border: `1px solid ${isVendedor ? '#10B98155' : '#0284C755'}`,
            color: isVendedor ? '#A3E635' : '#38BDF8',
            fontSize: '11px',
            fontWeight: 'bold',
            marginBottom: '16px',
            textAlign: 'center',
          }}>
            {isSuperAdmin
              ? '👑 SÚPER ADMIN GLOBAL (TENANTS)'
              : isVendedor
              ? '🛒 MODO CAJERO / VENDEDOR'
              : '💼 MODO ADMINISTRADOR TIENDA'}
          </div>

          {/* NAVEGACIÓN BASADA EN ROLES (RBAC) */}
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, overflowY: 'auto' }}>
            {(isVendedor
              ? [
                  { id: 'POS', label: 'Terminal POS (Ventas)', icon: <ShoppingCart size={17} /> },
                  { id: 'INVENTORY', label: 'Consulta de Precios', icon: <Package size={17} /> },
                  { id: 'SALES', label: 'Ventas y Comprobantes', icon: <FileText size={17} /> },
                  { id: 'RATES', label: 'Tasas Oficiales BCV', icon: <RefreshCw size={17} /> },
                ]
              : [
                  ...(isSuperAdmin
                    ? [{ id: 'SUPER_ADMIN', label: 'Súper Admin (Negocios)', icon: <Building size={17} /> }]
                    : []),
                  { id: 'POS', label: 'Punto de Venta (POS)', icon: <ShoppingCart size={17} /> },
                  { id: 'METRICS', label: 'Dashboard & Finanzas', icon: <TrendingUp size={17} /> },
                  { id: 'INVENTORY', label: 'Inventario & Kardex', icon: <Package size={17} /> },
                  { id: 'SUPPLIERS', label: 'Proveedores (CRUD)', icon: <Building size={17} /> },
                  { id: 'ORDERS', label: 'Pedidos / Reposición', icon: <Truck size={17} />, badge: purchaseOrdersList.filter(o => o.status === 'DRAFT' || o.status === 'SENT_WHATSAPP').length },
                  { id: 'RECEIVABLES', label: 'Cobranzas & Mora', icon: <DollarSign size={17} />, badge: customerDebts.filter(c => c.isOverdue).length },
                  { id: 'SALES', label: 'Ventas & Facturas', icon: <FileText size={17} /> },
                  { id: 'EXPENSES', label: 'Flujo de Caja & Gastos', icon: <CreditCard size={17} /> },
                  { id: 'RATES', label: 'Tasas & Régimen Fiscal', icon: <RefreshCw size={17} /> },
                  { id: 'CASHIERS', label: 'Vendedores en Vivo', icon: <Users size={17} /> },
                  { id: 'AUDIT', label: 'Auditoría & Backups', icon: <ShieldCheck size={17} /> },
                ]
            ).map((item) => (
              <button
                key={item.id}
                onClick={() => { setActiveTab(item.id as any); setMobileMenuOpen(false); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: activeTab === item.id ? 'bold' : '500',
                  backgroundColor: activeTab === item.id ? '#0284C7' : 'transparent',
                  color: activeTab === item.id ? '#FFFFFF' : '#CBD5E1',
                  transition: 'all 0.15s ease',
                  textAlign: 'left',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {item.icon}
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span style={{ backgroundColor: '#EF4444', color: '#FFFFFF', padding: '1px 6px', borderRadius: '10px', fontSize: '10px', fontWeight: 'bold' }}>
                    {item.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>

          {/* INTRO Y GUÍA */}
          <div style={{ display: 'flex', gap: '6px', margin: '14px 0' }}>
            <button
              onClick={() => setShowSplash(true)}
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', padding: '7px', borderRadius: '6px', border: '1px solid #10B98144', backgroundColor: '#062F3B', color: '#A3E635', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              <Play size={12} />
              <span>Intro</span>
            </button>
            <button
              onClick={() => setShowOnboarding(true)}
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', padding: '7px', borderRadius: '6px', border: '1px solid #155E75', backgroundColor: '#062F3B', color: '#38BDF8', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              <HelpCircle size={12} />
              <span>Guía</span>
            </button>
          </div>

          {/* MONITOR TASA SIDEBAR */}
          <div style={{ backgroundColor: '#062F3B', padding: '10px 12px', borderRadius: '8px', border: '1px solid #155E75', marginBottom: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ fontSize: '10px', color: '#94A3B8' }}>Tasa Oficial BCV:</p>
              <button
                onClick={fetchLiveRates}
                disabled={isSyncingRates}
                title="Sincronizar en vivo desde DolarApi"
                style={{ background: 'none', border: 'none', color: '#10B981', cursor: 'pointer', padding: '0 2px' }}
              >
                <RefreshCw size={12} className={isSyncingRates ? 'animate-spin' : ''} />
              </button>
            </div>
            <p style={{ fontSize: '16px', fontWeight: 'bold', color: '#10B981' }}>{bcvRate.toFixed(2)} Bs / USD</p>
          </div>

          {/* PERFIL Y SALIR */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '12px', borderTop: '1px solid #155E75' }}>
            <div>
              <p style={{ fontSize: '12px', fontWeight: 'bold', color: '#F8FAFC' }}>{user.fullName}</p>
              <p style={{ fontSize: '10px', color: '#38BDF8' }}>@{user.username} ({user.roleId})</p>
            </div>
            <button onClick={handleLogout} title="Cerrar Sesión" style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '4px' }}>
              <LogOut size={16} />
            </button>
          </div>
        </aside>

        {/* ÁREA DE CONTENIDO PRINCIPAL */}
        <main className="vuelto-main-view" style={{ flex: 1, padding: '28px', overflowY: 'auto' }}>
          {/* TAB 0: TERMINAL DE VENTAS POS (CAJERO & ADMIN) */}
          {activeTab === 'POS' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '1200px', margin: '0 auto' }}>
              {/* FICHERO SUPERIOR: MULTI-TICKETS / VENTAS SIMULTÁNEAS */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', backgroundColor: '#0B3B49', padding: '8px 14px', borderRadius: '12px', border: '1px solid #155E75' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto', maxWidth: '85%' }}>
                  <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Fichero de Ventas:
                  </span>
                  {posTickets.map((t) => {
                    const isActive = t.id === activeTicketId;
                    const itemsCount = t.cartLines.reduce((acc, c) => acc + c.qty, 0);
                    const ticketTotal = t.cartLines.reduce((acc, c) => acc + c.priceUsd * c.qty, 0);
                    return (
                      <div
                        key={t.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          backgroundColor: isActive ? '#062F3B' : '#071F27',
                          border: isActive ? '2px solid #10B981' : '1px solid #155E75',
                          transition: 'all 0.15s ease',
                        }}
                        onClick={() => setActiveTicketId(t.id)}
                      >
                        <ShoppingCart size={13} color={isActive ? '#10B981' : '#94A3B8'} />
                        <span style={{ fontSize: '12px', fontWeight: isActive ? 'bold' : '500', color: isActive ? '#F8FAFC' : '#CBD5E1' }}>
                          {t.label}
                        </span>
                        {itemsCount > 0 && (
                          <span style={{ backgroundColor: isActive ? '#10B98122' : '#155E7544', color: isActive ? '#A3E635' : '#94A3B8', padding: '1px 5px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' }}>
                            {itemsCount} • ${ticketTotal.toFixed(2)}
                          </span>
                        )}
                        {posTickets.length > 1 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCloseTicket(t.id);
                            }}
                            title="Cerrar esta venta"
                            style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '0 2px', display: 'flex', alignItems: 'center' }}
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                  <button
                    onClick={handleCreateNewTicket}
                    title="Pausar venta actual y abrir nuevo ticket"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '6px 10px',
                      borderRadius: '8px',
                      border: '1px dashed #10B981',
                      backgroundColor: 'transparent',
                      color: '#A3E635',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <Plus size={13} />
                    <span>+ Nueva Venta</span>
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <div style={{ padding: '4px 10px', borderRadius: '6px', backgroundColor: '#062F3B', border: '1px solid #10B98144', fontSize: '11px', color: '#A3E635', fontWeight: 'bold' }}>
                    Tasa: {activeRate.toFixed(2)} Bs/$
                  </div>
                  <div style={{ padding: '4px 10px', borderRadius: '6px', backgroundColor: '#062F3B', border: '1px solid #0284C744', fontSize: '11px', color: '#38BDF8', fontWeight: 'bold' }}>
                    {enableIva ? 'IVA 16%' : 'IVA 0%'}
                  </div>
                </div>
              </div>

              {/* ZONA 1: BARRA DE ESCÁNER Y BÚSQUEDA ÚNICA ULTRA-LIMPIA */}
              <div style={{ position: 'relative', width: '100%' }}>
                <form
                  onSubmit={handlePosBarcodeScan}
                  style={{
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    width: '100%',
                    borderRadius: '12px',
                    border: isScanSuccessFlash ? '2px solid #10B981' : '1px solid #155E75',
                    boxShadow: isScanSuccessFlash ? '0 0 16px rgba(16, 185, 129, 0.6)' : '0 4px 12px rgba(0, 0, 0, 0.25)',
                    backgroundColor: '#062F3B',
                    transition: 'border 0.2s ease, box-shadow 0.2s ease',
                  }}
                >
                  <div style={{ padding: '0 14px', display: 'flex', alignItems: 'center', color: isScanSuccessFlash ? '#10B981' : '#94A3B8' }}>
                    <Search size={20} />
                  </div>
                  <input
                    ref={posSearchInputRef}
                    autoFocus
                    type="text"
                    value={posBarcodeQuery}
                    onChange={(e) => setPosBarcodeQuery(e.target.value)}
                    placeholder="Escanear código de barras (EAN-13), SKU o escribir nombre del producto (Enter para agregar)..."
                    style={{
                      flex: 1,
                      padding: '16px 12px 16px 0',
                      border: 'none',
                      outline: 'none',
                      backgroundColor: 'transparent',
                      color: '#F8FAFC',
                      fontSize: '15px',
                      fontWeight: '500',
                    }}
                  />
                  {posBarcodeQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setPosBarcodeQuery('');
                        posSearchInputRef.current?.focus();
                      }}
                      style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '0 12px' }}
                    >
                      <X size={16} />
                    </button>
                  )}
                  <button
                    type="submit"
                    style={{
                      padding: '12px 20px',
                      marginRight: '6px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: '#0284C7',
                      color: '#FFFFFF',
                      fontWeight: 'bold',
                      fontSize: '13px',
                      cursor: 'pointer',
                    }}
                  >
                    Agregar (Enter)
                  </button>
                </form>

                {/* POPOVER / DROPDOWN FLOTANTE COMPACTO (1 SOLA LÍNEA POR PRODUCTO) - OCULTO SI ESTÁ VACÍO */}
                {posBarcodeQuery.trim().length > 0 && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 6px)',
                      left: 0,
                      right: 0,
                      backgroundColor: '#062F3B',
                      border: '1px solid #10B981',
                      borderRadius: '10px',
                      boxShadow: '0 12px 30px rgba(0, 0, 0, 0.7)',
                      zIndex: 50,
                      maxHeight: '300px',
                      overflowY: 'auto',
                    }}
                  >
                    {(() => {
                      const query = posBarcodeQuery.trim().toLowerCase();
                      const matches = inventoryList
                        .filter(
                          (p) =>
                            p.name.toLowerCase().includes(query) ||
                            p.barcode.toLowerCase().includes(query) ||
                            p.sku.toLowerCase().includes(query)
                        )
                        .slice(0, 8);

                      if (matches.length === 0) {
                        return (
                          <div style={{ padding: '14px 16px', color: '#94A3B8', fontSize: '13px', textAlign: 'center' }}>
                            Sin coincidencias para "<strong>{posBarcodeQuery}</strong>". Presiona Enter para intentar escaneo directo.
                          </div>
                        );
                      }

                      return matches.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => {
                            handlePosAddToCart(item, 1);
                            setPosBarcodeQuery('');
                            posSearchInputRef.current?.focus();
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '10px 16px',
                            borderBottom: '1px solid #155E7533',
                            cursor: 'pointer',
                            transition: 'background 0.15s ease',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#0B3B49')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#F8FAFC' }}>
                              {item.name}
                            </span>
                            <span style={{ fontSize: '11px', color: '#38BDF8', backgroundColor: '#0284C722', padding: '1px 6px', borderRadius: '4px' }}>
                              {item.unitOfMeasure || 'UNIDAD'}
                            </span>
                            <span style={{ fontSize: '11px', color: '#64748B', fontFamily: 'monospace' }}>
                              SKU: {item.sku}
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                            <span style={{ fontSize: '11px', color: item.stock <= item.minStockAlert ? '#EF4444' : '#94A3B8' }}>
                              Stock: <strong>{item.stock}</strong>
                            </span>
                            <div style={{ textAlign: 'right' }}>
                              <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#10B981' }}>
                                ${item.salePriceUsd.toFixed(2)} USD
                              </span>
                              <span style={{ fontSize: '11px', color: '#94A3B8', marginLeft: '6px' }}>
                                ≈ {(item.salePriceUsd * activeRate).toFixed(2)} Bs
                              </span>
                            </div>
                            <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#A3E635', backgroundColor: '#10B98122', padding: '2px 8px', borderRadius: '4px' }}>
                              + Agregar
                            </span>
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                )}
              </div>

              {/* FEEDBACK DE ESCÁNER */}
              {posScanFeedback && (
                <div
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    backgroundColor: posScanFeedback.type === 'success' ? '#10B98122' : posScanFeedback.type === 'warning' ? '#EF444422' : '#0284C722',
                    color: posScanFeedback.type === 'success' ? '#A3E635' : posScanFeedback.type === 'warning' ? '#FCA5A5' : '#38BDF8',
                    border: `1px solid ${posScanFeedback.type === 'success' ? '#10B981' : posScanFeedback.type === 'warning' ? '#EF4444' : '#0284C7'}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span>{posScanFeedback.message}</span>
                  <button onClick={() => setPosScanFeedback(null)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>
                    <X size={13} />
                  </button>
                </div>
              )}

              {/* ZONA 2: CARRITO DE VENTA ACTUAL */}
              <div style={{ backgroundColor: '#0B3B49', borderRadius: '16px', border: '1px solid #155E75', padding: '20px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid #155E75', paddingBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ShoppingCart size={18} color="#10B981" />
                    <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#F8FAFC' }}>
                      Carrito de Compra: {activeTicket?.label || 'Venta Actual'}
                    </h3>
                    <span style={{ fontSize: '11px', backgroundColor: '#062F3B', color: '#38BDF8', padding: '2px 8px', borderRadius: '6px', border: '1px solid #155E75' }}>
                      Cliente: {posSelectedCustomer.name} ({posSelectedCustomer.documentType}-{posSelectedCustomer.documentNumber})
                    </span>
                  </div>

                  {cartLines.length > 0 && (
                    <button
                      onClick={() => setCartLines([])}
                      style={{ background: 'none', border: 'none', color: '#EF4444', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Trash2 size={13} />
                      <span>Vaciar Carrito</span>
                    </button>
                  )}
                </div>

                {/* TABLA DE PRODUCTOS EN EL CARRITO */}
                <div style={{ minHeight: '220px', maxHeight: '420px', overflowY: 'auto', marginBottom: '16px' }}>
                  {cartLines.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '50px 20px', color: '#64748B' }}>
                      <ShoppingCart size={48} style={{ margin: '0 auto 12px auto', opacity: 0.3 }} />
                      <p style={{ fontSize: '15px', fontWeight: 'bold', color: '#94A3B8' }}>El carrito de esta venta está vacío</p>
                      <p style={{ fontSize: '12px', marginTop: '4px' }}>
                        Usa la barra de escaneo arriba para pasar el código de barras o escribe para buscar.
                      </p>
                    </div>
                  ) : (
                    <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ color: '#94A3B8', borderBottom: '1px solid #155E75', fontSize: '12px' }}>
                          <th style={{ padding: '8px 10px' }}>Producto</th>
                          <th style={{ padding: '8px 10px' }}>Unidad</th>
                          <th style={{ padding: '8px 10px' }}>Precio Unit. ($)</th>
                          <th style={{ padding: '8px 10px', textAlign: 'center' }}>Cantidad</th>
                          <th style={{ padding: '8px 10px', textAlign: 'right' }}>Subtotal ($)</th>
                          <th style={{ padding: '8px 10px', textAlign: 'right' }}>Subtotal (Bs)</th>
                          <th style={{ padding: '8px 10px', textAlign: 'center' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {cartLines.map((line) => {
                          const lineSubtotalUsd = line.priceUsd * line.qty;
                          const lineSubtotalBs = lineSubtotalUsd * activeRate;
                          return (
                            <tr key={line.productId} style={{ borderBottom: '1px solid #155E7533' }}>
                              <td style={{ padding: '10px', fontWeight: 'bold', color: '#F8FAFC' }}>
                                {line.name}
                              </td>
                              <td style={{ padding: '10px', color: '#38BDF8', fontSize: '11px' }}>
                                {line.unitOfMeasure || 'UNIDAD'}
                              </td>
                              <td style={{ padding: '10px', color: '#CBD5E1' }}>
                                ${line.priceUsd.toFixed(2)}
                              </td>
                              <td style={{ padding: '10px', textAlign: 'center' }}>
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                  <button
                                    onClick={() => handlePosUpdateCartQty(line.productId, line.qty - 1)}
                                    style={{ width: '26px', height: '26px', borderRadius: '6px', border: '1px solid #334155', backgroundColor: '#062F3B', color: '#CBD5E1', cursor: 'pointer', fontWeight: 'bold' }}
                                  >
                                    -
                                  </button>
                                  <span style={{ fontSize: '13px', fontWeight: 'bold', minWidth: '24px', textAlign: 'center' }}>
                                    {line.qty}
                                  </span>
                                  <button
                                    onClick={() => handlePosUpdateCartQty(line.productId, line.qty + 1)}
                                    style={{ width: '26px', height: '26px', borderRadius: '6px', border: '1px solid #334155', backgroundColor: '#062F3B', color: '#CBD5E1', cursor: 'pointer', fontWeight: 'bold' }}
                                  >
                                    +
                                  </button>
                                </div>
                              </td>
                              <td style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold', color: '#10B981' }}>
                                ${lineSubtotalUsd.toFixed(2)}
                              </td>
                              <td style={{ padding: '10px', textAlign: 'right', color: '#94A3B8', fontSize: '12px' }}>
                                {lineSubtotalBs.toFixed(2)} Bs
                              </td>
                              <td style={{ padding: '10px', textAlign: 'center' }}>
                                <button
                                  onClick={() => handlePosUpdateCartQty(line.productId, 0)}
                                  title="Eliminar producto"
                                  style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '4px' }}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* RESUMEN INFERIOR & BOTÓN CONTINUAR AL COBRO (F2) */}
                <div style={{ backgroundColor: '#062F3B', padding: '16px 20px', borderRadius: '12px', border: '1px solid #155E75', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
                  <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div>
                      <span style={{ fontSize: '11px', color: '#94A3B8', display: 'block' }}>Ítems en Carrito:</span>
                      <strong style={{ fontSize: '16px', color: '#F8FAFC' }}>
                        {cartLines.reduce((acc, c) => acc + c.qty, 0)} productos
                      </strong>
                    </div>
                    <div style={{ borderLeft: '1px solid #155E75', paddingLeft: '16px' }}>
                      <span style={{ fontSize: '11px', color: '#94A3B8', display: 'block' }}>Subtotal Base:</span>
                      <strong style={{ fontSize: '16px', color: '#F8FAFC' }}>
                        ${posSubtotalUsd.toFixed(2)} USD
                      </strong>
                    </div>
                    <div style={{ borderLeft: '1px solid #155E75', paddingLeft: '16px' }}>
                      <span style={{ fontSize: '11px', color: '#94A3B8', display: 'block' }}>Total Estimado:</span>
                      <strong style={{ fontSize: '20px', color: '#10B981' }}>
                        ${posTotalUsd.toFixed(2)} USD
                      </strong>
                      <span style={{ fontSize: '12px', color: '#A3E635', marginLeft: '6px', fontWeight: 'bold' }}>
                        (≈ {posTotalBs.toFixed(2)} Bs)
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      if (cartLines.length > 0) {
                        setIsCheckoutWizardOpen(true);
                        setCheckoutStep(1);
                      }
                    }}
                    disabled={cartLines.length === 0}
                    style={{
                      padding: '14px 28px',
                      borderRadius: '10px',
                      border: 'none',
                      background: cartLines.length === 0 ? '#334155' : 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                      color: '#FFFFFF',
                      fontWeight: 'bold',
                      fontSize: '15px',
                      cursor: cartLines.length === 0 ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      boxShadow: cartLines.length === 0 ? 'none' : '0 4px 14px rgba(16, 185, 129, 0.4)',
                      transition: 'transform 0.15s ease',
                    }}
                  >
                    <Zap size={18} />
                    <span>Continuar al Cobro (F2)</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 1: DASHBOARD Y FINANZAS */}
          {activeTab === 'METRICS' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>Dashboard de Finanzas y Administración</h2>
                  <p style={{ color: '#94A3B8', fontSize: '13px' }}>Rentabilidad neta, costos de mercancía (COGS), gastos operativos y libro SENIAT.</p>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => window.open('/api/v1/reports/sales-book/csv', '_blank')}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#16A34A', color: '#FFFFFF', padding: '8px 14px', borderRadius: '8px', border: 'none', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}
                  >
                    <FileSpreadsheet size={15} />
                    <span>Libro de Ventas SENIAT (CSV)</span>
                  </button>
                  <button
                    onClick={() => setIsExpenseModalOpen(true)}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#0284C7', color: '#FFFFFF', padding: '8px 14px', borderRadius: '8px', border: 'none', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}
                  >
                    <Plus size={15} />
                    <span>Registrar Gasto</span>
                  </button>
                </div>
              </div>

              {/* TARJETAS KPI */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '14px', marginBottom: '24px' }}>
                <div style={{ backgroundColor: '#0B3B49', padding: '16px', borderRadius: '12px', border: '1px solid #155E75' }}>
                  <p style={{ fontSize: '11px', color: '#94A3B8' }}>Ventas Brutas Totales</p>
                  <p style={{ fontSize: '22px', fontWeight: 'bold', color: '#F8FAFC', marginTop: '2px' }}>${totalGrossSalesUsd.toFixed(2)}</p>
                  <p style={{ fontSize: '11px', color: '#10B981', marginTop: '2px' }}>≈ {(totalGrossSalesUsd * bcvRate).toLocaleString()} Bs</p>
                </div>

                <div style={{ backgroundColor: '#0B3B49', padding: '16px', borderRadius: '12px', border: '1px solid #155E75' }}>
                  <p style={{ fontSize: '11px', color: '#94A3B8' }}>Valuación Inventario (Costo)</p>
                  <p style={{ fontSize: '22px', fontWeight: 'bold', color: '#38BDF8', marginTop: '2px' }}>${totalInventoryCostUsd.toFixed(2)}</p>
                  <p style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>Costo mayor de compra</p>
                </div>

                <div style={{ backgroundColor: '#0B3B49', padding: '16px', borderRadius: '12px', border: '1px solid #155E75' }}>
                  <p style={{ fontSize: '11px', color: '#94A3B8' }}>Utilidad Neta (Ventas - Gastos)</p>
                  <p style={{ fontSize: '22px', fontWeight: 'bold', color: '#10B981', marginTop: '2px' }}>+${netProfitUsd.toFixed(2)}</p>
                  <p style={{ fontSize: '11px', color: '#10B981', marginTop: '2px' }}>Margen global proyectado: +{averageMargin}%</p>
                </div>

                <div style={{ backgroundColor: '#0B3B49', padding: '16px', borderRadius: '12px', border: '1px solid #155E75' }}>
                  <p style={{ fontSize: '11px', color: '#94A3B8' }}>Gastos Operativos (OPEX)</p>
                  <p style={{ fontSize: '22px', fontWeight: 'bold', color: '#EF4444', marginTop: '2px' }}>-${totalExpensesUsd.toFixed(2)}</p>
                  <p style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>Nómina, servicios y alquiler</p>
                </div>
              </div>

              {/* RECOMENDACIONES Y VARIACIÓN DE COSTOS */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '18px', marginBottom: '24px' }}>
                <div style={{ backgroundColor: '#0B3B49', padding: '18px', borderRadius: '12px', border: '1px solid #155E75' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <Zap size={18} color="#F59E0B" />
                    <h3 style={{ fontSize: '15px', fontWeight: 'bold' }}>Recomendaciones Senior de Administración</h3>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ padding: '10px', borderRadius: '8px', backgroundColor: '#F59E0B15', border: '1px solid #F59E0B44', fontSize: '12px' }}>
                      <strong>⚠️ Stock Crítico:</strong> {lowStockItems.length} producto(s) en límite de reposición. Pestaña <em>Pedidos a Proveedores</em> te permite ordenar por WhatsApp en 1 clic.
                    </div>
                    <div style={{ padding: '10px', borderRadius: '8px', backgroundColor: '#38BDF815', border: '1px solid #38BDF844', fontSize: '12px' }}>
                      <strong>💡 Cobertura de Costos:</strong> Mantén sincronizados los precios de salida en divisas respecto a la última compra para evitar descapitalización frente a la inflación de reposición.
                    </div>
                  </div>
                </div>

                <div style={{ backgroundColor: '#0B3B49', padding: '18px', borderRadius: '12px', border: '1px solid #155E75' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <TrendingUp size={18} color="#38BDF8" />
                    <h3 style={{ fontSize: '15px', fontWeight: 'bold' }}>Variación de Costos de Compra Reciente</h3>
                  </div>
                  <table style={{ width: '100%', fontSize: '12px', textAlign: 'left', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ color: '#94A3B8', borderBottom: '1px solid #155E75' }}>
                        <th style={{ padding: '6px' }}>Producto</th>
                        <th style={{ padding: '6px' }}>Costo Mayor</th>
                        <th style={{ padding: '6px' }}>Precio Salida</th>
                        <th style={{ padding: '6px' }}>Inflación Proveedor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inventoryList.slice(0, 4).map((item) => (
                        <tr key={item.id} style={{ borderBottom: '1px solid #155E7544' }}>
                          <td style={{ padding: '6px', fontWeight: 'bold' }}>{item.name}</td>
                          <td style={{ padding: '6px' }}>${item.costPriceUsd.toFixed(2)}</td>
                          <td style={{ padding: '6px', color: '#10B981', fontWeight: 'bold' }}>${item.salePriceUsd.toFixed(2)}</td>
                          <td style={{ padding: '6px', color: '#F59E0B', fontWeight: 'bold' }}>+{item.inflationDeltaPercent}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: INVENTARIO, STOCK & KARDEX */}
          {activeTab === 'INVENTORY' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>
                    {isAdmin ? 'Catálogo de Productos, Stock y Kardex' : 'Consulta de Precios y Catálogo'}
                  </h2>
                  <p style={{ color: '#94A3B8', fontSize: '13px' }}>
                    {isAdmin ? 'Gestión de códigos EAN-13, costos al mayor, márgenes y ajustes de inventario.' : 'Consulta rápida de precios al detal en $ y Bs calculados con la tasa oficial BCV.'}
                  </p>
                </div>

                {isAdmin && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => { setIsAddModalOpen(true); setAddMode('MANUAL'); setCameraActive(false); }}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#0284C7', color: '#FFFFFF', padding: '9px 14px', borderRadius: '8px', border: 'none', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}
                    >
                      <Plus size={15} />
                      <span>Nuevo Producto</span>
                    </button>
                    <button
                      onClick={() => { setIsAddModalOpen(true); setAddMode('CAMERA'); setCameraActive(true); }}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#10B981', color: '#FFFFFF', padding: '9px 14px', borderRadius: '8px', border: 'none', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}
                    >
                      <Camera size={15} />
                      <span>Escanear Cámara</span>
                    </button>
                  </div>
                )}
              </div>

              {/* PANEL DE MARGEN GLOBAL DE GANANCIA (SOLO ADMIN) */}
              {isAdmin && (
                <div style={{ backgroundColor: '#0B3B49', padding: '16px 20px', borderRadius: '12px', border: '1px solid #10B98155', marginBottom: '18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ padding: '10px', borderRadius: '8px', backgroundColor: '#10B98122', color: '#10B981' }}>
                      <Percent size={22} />
                    </div>
                    <div>
                      <h4 style={{ fontSize: '14px', fontWeight: 'bold', color: '#FFFFFF' }}>Fijar Margen de Ganancia Masivo (%)</h4>
                      <p style={{ fontSize: '11px', color: '#94A3B8' }}>
                        Establece tu ganancia sobre el costo al mayor sin editar producto por producto. El sistema muestra la ganancia en dólares (+USD) para cada artículo.
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '12px', color: '#CBD5E1' }}>Ganancia:</span>
                      <input
                        type="number"
                        value={globalMarginInput}
                        onChange={(e) => setGlobalMarginInput(e.target.value)}
                        style={{ width: '70px', padding: '6px 8px', borderRadius: '6px', border: '1px solid #334155', backgroundColor: '#062F3B', color: '#A3E635', fontWeight: 'bold', fontSize: '14px', textAlign: 'center' }}
                      />
                      <span style={{ fontSize: '13px', color: '#A3E635', fontWeight: 'bold' }}>%</span>
                    </div>

                    <select
                      value={globalMarginCategory}
                      onChange={(e) => setGlobalMarginCategory(e.target.value)}
                      style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #334155', backgroundColor: '#062F3B', color: '#FFFFFF', fontSize: '12px' }}
                    >
                      <option value="ALL">Todo el Catálogo</option>
                      <option value="Alimentos">Solo Alimentos</option>
                      <option value="Bebidas">Solo Bebidas</option>
                      <option value="Víveres">Solo Víveres</option>
                      <option value="Limpieza">Solo Limpieza</option>
                    </select>

                    <div style={{ backgroundColor: '#062F3B', padding: '6px 10px', borderRadius: '6px', border: '1px solid #10B98144', fontSize: '11px', color: '#A3E635', fontWeight: 'bold' }}>
                      Ganancia estimada: +${((inventoryList.reduce((a, b) => a + b.costPriceUsd, 0) / (inventoryList.length || 1)) * (parseFloat(globalMarginInput) || 30) / 100).toFixed(2)} USD / ud
                    </div>

                    <button
                      onClick={handleApplyGlobalMargin}
                      style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', backgroundColor: '#10B981', color: '#071F27', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Zap size={14} />
                      <span>Aplicar a Todos</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Barra de Búsqueda */}
              <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#0B3B49', padding: '10px 14px', borderRadius: '10px', border: '1px solid #155E75', marginBottom: '18px' }}>
                <Search size={18} color="#94A3B8" />
                <input
                  type="text"
                  placeholder="Buscar por nombre o código de barra (759...)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ flex: 1, background: 'none', border: 'none', color: '#FFFFFF', marginLeft: '10px', outline: 'none', fontSize: '13px' }}
                />
              </div>

              {/* Tabla de Productos */}
              <div style={{ backgroundColor: '#0B3B49', borderRadius: '12px', border: '1px solid #155E75', overflowX: 'auto', marginBottom: '24px' }}>
                <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#062F3B', color: '#94A3B8', borderBottom: '1px solid #155E75' }}>
                      <th style={{ padding: '12px 14px' }}>Código EAN-13</th>
                      <th style={{ padding: '12px 14px' }}>Producto</th>
                      {isAdmin && <th style={{ padding: '12px 14px' }}>Proveedor</th>}
                      {isAdmin && <th style={{ padding: '12px 14px' }}>Costo Mayor ($)</th>}
                      <th style={{ padding: '12px 14px' }}>Precio Salida ($)</th>
                      <th style={{ padding: '12px 14px' }}>Precio Salida (Bs)</th>
                      {isAdmin && <th style={{ padding: '12px 14px' }}>Ganancia Neta ($ / %)</th>}
                      <th style={{ padding: '12px 14px' }}>Stock</th>
                      {isAdmin && <th style={{ padding: '12px 14px', textAlign: 'center' }}>Acciones</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {inventoryList
                      .filter((p) => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.barcode.includes(searchTerm))
                      .map((item) => {
                        const itemProfit = item.salePriceUsd - item.costPriceUsd;
                        const itemMargin = item.salePriceUsd > 0 ? ((itemProfit / item.salePriceUsd) * 100).toFixed(1) : '0';
                        const isLow = item.stock <= item.minStockAlert;

                        return (
                          <tr key={item.id} style={{ borderBottom: '1px solid #155E7544' }}>
                            <td style={{ padding: '12px 14px', fontFamily: 'monospace', color: '#38BDF8' }}>{item.barcode}</td>
                            <td style={{ padding: '12px 14px', fontWeight: 'bold' }}>{item.name}</td>
                            {isAdmin && <td style={{ padding: '12px 14px', color: '#94A3B8' }}>{item.supplier}</td>}
                            {isAdmin && <td style={{ padding: '12px 14px' }}>${item.costPriceUsd.toFixed(2)}</td>}
                            <td style={{ padding: '12px 14px', fontWeight: 'bold', color: '#10B981' }}>${item.salePriceUsd.toFixed(2)}</td>
                            <td style={{ padding: '12px 14px', color: '#CBD5E1' }}>{(item.salePriceUsd * bcvRate).toFixed(2)} Bs</td>
                            {isAdmin && (
                              <td style={{ padding: '12px 14px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                  <span style={{ backgroundColor: '#10B98122', color: '#10B981', padding: '3px 8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '12px' }}>
                                    +${itemProfit.toFixed(2)} USD
                                  </span>
                                  <span style={{ color: '#94A3B8', fontSize: '10px' }}>
                                    +{itemMargin}% margen
                                  </span>
                                </div>
                              </td>
                            )}
                            <td style={{ padding: '12px 14px' }}>
                              <span style={{ backgroundColor: isLow ? '#EF444422' : '#0284C722', color: isLow ? '#EF4444' : '#38BDF8', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '11px' }}>
                                {item.stock} unids {isLow && '⚠️ Bajo'}
                              </span>
                            </td>
                            {isAdmin && (
                              <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                                <button
                                  onClick={() => {
                                    setSelectedStockProduct(item);
                                    setAdjustQty(item.stock.toString());
                                    setIsStockAdjustModalOpen(true);
                                  }}
                                  style={{ backgroundColor: '#062F3B', border: '1px solid #155E75', color: '#38BDF8', padding: '5px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
                                >
                                  Ajustar Stock
                                </button>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>

              {/* SECCIÓN HISTORIAL DE KARDEX (ADMIN ONLY) */}
              {isAdmin && (
                <div style={{ backgroundColor: '#0B3B49', padding: '20px', borderRadius: '12px', border: '1px solid #155E75' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '12px' }}>Historial de Movimientos de Kardex</h3>
                  <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ color: '#94A3B8', borderBottom: '1px solid #155E75' }}>
                        <th style={{ padding: '8px' }}>Fecha</th>
                        <th style={{ padding: '8px' }}>Producto</th>
                        <th style={{ padding: '8px' }}>Tipo</th>
                        <th style={{ padding: '8px' }}>Cantidad</th>
                        <th style={{ padding: '8px' }}>Costo Unit.</th>
                        <th style={{ padding: '8px' }}>Motivo / Referencia</th>
                        <th style={{ padding: '8px' }}>Usuario</th>
                      </tr>
                    </thead>
                    <tbody>
                      {kardexHistory.map((k) => (
                        <tr key={k.id} style={{ borderBottom: '1px solid #155E7533' }}>
                          <td style={{ padding: '8px', color: '#94A3B8' }}>{k.createdAt}</td>
                          <td style={{ padding: '8px', fontWeight: 'bold' }}>{k.productName}</td>
                          <td style={{ padding: '8px' }}>
                            <span style={{
                              padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold', fontSize: '10px',
                              backgroundColor: k.movementType === 'IN' ? '#10B98122' : k.movementType === 'OUT' || k.movementType === 'SALE' ? '#EF444422' : '#0284C722',
                              color: k.movementType === 'IN' ? '#10B981' : k.movementType === 'OUT' || k.movementType === 'SALE' ? '#EF4444' : '#38BDF8',
                            }}>
                              {k.movementType}
                            </span>
                          </td>
                          <td style={{ padding: '8px', fontWeight: 'bold' }}>{k.quantity} unids</td>
                          <td style={{ padding: '8px' }}>${k.unitCostUsd.toFixed(2)}</td>
                          <td style={{ padding: '8px', color: '#CBD5E1' }}>{k.reason}</td>
                          <td style={{ padding: '8px', color: '#38BDF8' }}>@{k.user}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PROVEEDORES (CRUD COMPLETO) */}
          {activeTab === 'SUPPLIERS' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>CRUD de Proveedores</h2>
                  <p style={{ color: '#94A3B8', fontSize: '13px' }}>Registro de empresas proveedoras, RIF, plazos de crédito y enlace directo de WhatsApp.</p>
                </div>

                <button
                  onClick={() => {
                    setEditingSupplier(null);
                    setSupName('');
                    setSupDocType('J');
                    setSupDocNumber('');
                    setSupPhone('');
                    setSupEmail('');
                    setSupAddress('');
                    setIsSupplierModalOpen(true);
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#0284C7', color: '#FFFFFF', padding: '9px 14px', borderRadius: '8px', border: 'none', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}
                >
                  <Plus size={15} />
                  <span>Nuevo Proveedor</span>
                </button>
              </div>

              <div style={{ backgroundColor: '#0B3B49', borderRadius: '12px', border: '1px solid #155E75', overflowX: 'auto' }}>
                <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#062F3B', color: '#94A3B8', borderBottom: '1px solid #155E75' }}>
                      <th style={{ padding: '12px 14px' }}>Proveedor / Razón Social</th>
                      <th style={{ padding: '12px 14px' }}>RIF</th>
                      <th style={{ padding: '12px 14px' }}>Teléfono WhatsApp</th>
                      <th style={{ padding: '12px 14px' }}>Correo</th>
                      <th style={{ padding: '12px 14px' }}>Plazo Crédito</th>
                      <th style={{ padding: '12px 14px' }}>Estatus</th>
                      <th style={{ padding: '12px 14px', textAlign: 'center' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {suppliersList.map((sup) => (
                      <tr key={sup.id} style={{ borderBottom: '1px solid #155E7544' }}>
                        <td style={{ padding: '12px 14px', fontWeight: 'bold' }}>{sup.name}</td>
                        <td style={{ padding: '12px 14px', color: '#38BDF8', fontFamily: 'monospace' }}>{sup.documentType}-{sup.documentNumber}</td>
                        <td style={{ padding: '12px 14px' }}>{sup.phone}</td>
                        <td style={{ padding: '12px 14px', color: '#94A3B8' }}>{sup.email}</td>
                        <td style={{ padding: '12px 14px' }}>{sup.creditDays} días</td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{ backgroundColor: sup.isActive ? '#10B98122' : '#EF444422', color: sup.isActive ? '#10B981' : '#EF4444', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '11px' }}>
                            {sup.isActive ? 'ACTIVO' : 'INACTIVO'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                            <button
                              onClick={() => {
                                const clean = sup.phone.replace(/\D/g, '');
                                window.open(`https://wa.me/${clean}?text=Hola+${encodeURIComponent(sup.name)},+saludos+desde+${encodeURIComponent(user.businessName)}.`, '_blank');
                              }}
                              title="Chatear por WhatsApp"
                              style={{ backgroundColor: '#16A34A', border: 'none', color: '#FFFFFF', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                              <MessageCircle size={13} />
                              <span>WhatsApp</span>
                            </button>
                            <button
                              onClick={() => {
                                setEditingSupplier(sup);
                                setSupName(sup.name);
                                setSupDocType(sup.documentType);
                                setSupDocNumber(sup.documentNumber);
                                setSupPhone(sup.phone);
                                setSupEmail(sup.email);
                                setSupAddress(sup.address);
                                setIsSupplierModalOpen(true);
                              }}
                              style={{ backgroundColor: '#062F3B', border: '1px solid #155E75', color: '#CBD5E1', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px' }}
                            >
                              Editar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: PEDIDOS A PROVEEDORES (PURCHASE ORDERS CRUD) */}
          {activeTab === 'ORDERS' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>CRUD de Pedidos a Proveedores</h2>
                  <p style={{ color: '#94A3B8', fontSize: '13px' }}>Crea órdenes de reposición, envíalas por WhatsApp y cárgalas automáticamente a Kardex al recibirlas.</p>
                </div>

                <button
                  onClick={() => setIsOrderModalOpen(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#0284C7', color: '#FFFFFF', padding: '9px 14px', borderRadius: '8px', border: 'none', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}
                >
                  <Plus size={15} />
                  <span>Nueva Orden de Compra</span>
                </button>
              </div>

              {/* LISTA GLOBAL DE REPOSICIÓN A PROVEEDORES */}
              <div style={{ backgroundColor: '#0B3B49', padding: '16px 20px', borderRadius: '12px', border: '1px solid #F59E0B55', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: '#F59E0B22', color: '#F59E0B' }}>
                      <AlertTriangle size={20} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: '#FFFFFF' }}>Lista Global de Reposición a Proveedores</h3>
                      <p style={{ fontSize: '11px', color: '#94A3B8' }}>
                        Productos en punto de reorden. Consolida pedidos y envíalos directamente a tus proveedores vía WhatsApp.
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '10px', color: '#94A3B8' }}>Inversión Requerida:</span>
                      <p style={{ fontSize: '15px', fontWeight: 'bold', color: '#10B981' }}>
                        ${inventoryList.filter(p => p.stock <= p.minStockAlert).reduce((acc, p) => acc + (Math.max(1, p.minStockAlert * 2 - p.stock) * p.costPriceUsd), 0).toFixed(2)} USD
                      </p>
                    </div>
                  </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#062F3B', color: '#94A3B8', borderBottom: '1px solid #155E75' }}>
                        <th style={{ padding: '8px 10px' }}>Producto Faltante</th>
                        <th style={{ padding: '8px 10px' }}>Stock Actual</th>
                        <th style={{ padding: '8px 10px' }}>Umbral Mínimo</th>
                        <th style={{ padding: '8px 10px' }}>Sugerido a Reponer</th>
                        <th style={{ padding: '8px 10px' }}>Costo Estimado</th>
                        <th style={{ padding: '8px 10px' }}>Proveedor Habitual</th>
                        <th style={{ padding: '8px 10px', textAlign: 'center' }}>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inventoryList
                        .filter((p) => p.stock <= p.minStockAlert)
                        .map((prod) => {
                          const suggested = Math.max(1, prod.minStockAlert * 2 - prod.stock);
                          const costEst = suggested * prod.costPriceUsd;
                          return (
                            <tr key={prod.id} style={{ borderBottom: '1px solid #155E7533' }}>
                              <td style={{ padding: '8px 10px', fontWeight: 'bold', color: '#FFFFFF' }}>{prod.name}</td>
                              <td style={{ padding: '8px 10px', color: '#EF4444', fontWeight: 'bold' }}>{prod.stock} unids</td>
                              <td style={{ padding: '8px 10px', color: '#94A3B8' }}>{prod.minStockAlert} unids</td>
                              <td style={{ padding: '8px 10px', color: '#A3E635', fontWeight: 'bold' }}>+{suggested} unids</td>
                              <td style={{ padding: '8px 10px', color: '#10B981', fontWeight: 'bold' }}>
                                ${costEst.toFixed(2)}
                                <span style={{ display: 'block', fontSize: '10px', color: '#64748B' }}>(${(costEst * activeRate).toFixed(2)} Bs)</span>
                              </td>
                              <td style={{ padding: '8px 10px' }}>
                                <span style={{ fontWeight: '500' }}>{prod.supplier}</span>
                                <span style={{ display: 'block', fontSize: '10px', color: '#94A3B8' }}>{prod.supplierPhone}</span>
                              </td>
                              <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                                <button
                                  onClick={() => {
                                    const cleanPhone = prod.supplierPhone.replace(/\D/g, '');
                                    const msg = `*SOLICITUD DE REPOSICIÓN*\nComercio: ${user?.businessName}\nProveedor: ${prod.supplier}\n\nRequerimos cotización y reposición de:\n- *${suggested} unidades* de *${prod.name}* (SKU: ${prod.sku})\nCosto estimado: $${costEst.toFixed(2)} USD (≈ ${(costEst * activeRate).toFixed(2)} Bs)\n\nPor favor confirmar disponibilidad y fecha de entrega.`;
                                    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
                                  }}
                                  style={{ padding: '5px 10px', borderRadius: '6px', border: 'none', backgroundColor: '#10B981', color: '#FFFFFF', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                >
                                  <Send size={12} />
                                  <span>Pedir WhatsApp</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div style={{ backgroundColor: '#0B3B49', borderRadius: '12px', border: '1px solid #155E75', overflowX: 'auto' }}>
                <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#062F3B', color: '#94A3B8', borderBottom: '1px solid #155E75' }}>
                      <th style={{ padding: '12px 14px' }}>Orden N°</th>
                      <th style={{ padding: '12px 14px' }}>Proveedor</th>
                      <th style={{ padding: '12px 14px' }}>Fecha Entrega</th>
                      <th style={{ padding: '12px 14px' }}>Total Estimado ($ y Bs)</th>
                      <th style={{ padding: '12px 14px' }}>Estatus</th>
                      <th style={{ padding: '12px 14px', textAlign: 'center' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchaseOrdersList.map((order) => (
                      <tr key={order.id} style={{ borderBottom: '1px solid #155E7544' }}>
                        <td style={{ padding: '12px 14px', fontWeight: 'bold', color: '#38BDF8' }}>{order.orderNumber}</td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{ fontWeight: 'bold' }}>{order.supplierName}</span>
                          <span style={{ display: 'block', fontSize: '11px', color: '#94A3B8' }}>{order.supplierPhone}</span>
                        </td>
                        <td style={{ padding: '12px 14px', color: '#CBD5E1' }}>{order.expectedDeliveryDate}</td>
                        <td style={{ padding: '12px 14px' }}>
                          <strong style={{ color: '#10B981' }}>${order.totalEstimatedUsd.toFixed(2)}</strong>
                          <span style={{ display: 'block', fontSize: '11px', color: '#94A3B8' }}>({(order.totalEstimatedUsd * bcvRate).toFixed(2)} Bs)</span>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{
                            padding: '3px 8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '10px',
                            backgroundColor: order.status === 'RECEIVED' ? '#10B98122' : order.status === 'SENT_WHATSAPP' ? '#38BDF822' : '#EF444422',
                            color: order.status === 'RECEIVED' ? '#10B981' : order.status === 'SENT_WHATSAPP' ? '#38BDF8' : '#F59E0B',
                          }}>
                            {order.status === 'RECEIVED' ? 'RECIBIDO EN STOCK' : order.status === 'SENT_WHATSAPP' ? 'ENVIADO WHATSAPP' : 'BORRADOR'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                            {order.status !== 'RECEIVED' && (
                              <button
                                onClick={() => handleSendOrderWhatsApp(order)}
                                style={{ backgroundColor: '#16A34A', border: 'none', color: '#FFFFFF', padding: '6px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                              >
                                <MessageCircle size={13} />
                                <span>WhatsApp</span>
                              </button>
                            )}

                            {order.status !== 'RECEIVED' && (
                              <button
                                onClick={() => handleReceiveOrder(order)}
                                style={{ backgroundColor: '#0284C7', border: 'none', color: '#FFFFFF', padding: '6px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
                              >
                                Recibir Stock
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: COBRANZAS, MORA & ABONOS (CRUD) */}
          {activeTab === 'RECEIVABLES' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>CRUD de Cobranzas y Reglas de Mora</h2>
                  <p style={{ color: '#94A3B8', fontSize: '13px' }}>Control de cartera, aplicación automática de mora configurable, registro de abonos y cobro por WhatsApp.</p>
                </div>

                {/* Panel de Configuración de Mora */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: '#062F3B', padding: '8px 14px', borderRadius: '10px', border: '1px solid #155E75' }}>
                  <span style={{ fontSize: '12px', color: '#94A3B8' }}>Recargo por Mora:</span>
                  <input
                    type="number"
                    value={surchargeRate}
                    onChange={(e) => setSurchargeRate(parseFloat(e.target.value) || 0)}
                    style={{ width: '45px', backgroundColor: '#0B3B49', border: '1px solid #155E75', color: '#EF4444', padding: '4px', borderRadius: '4px', textAlign: 'center', fontWeight: 'bold' }}
                  />
                  <span style={{ fontSize: '12px', fontWeight: 'bold' }}>%</span>
                  <span style={{ fontSize: '11px', color: '#64748B' }}>| Gracia:</span>
                  <input
                    type="number"
                    value={graceDays}
                    onChange={(e) => setGraceDays(parseInt(e.target.value, 10) || 0)}
                    style={{ width: '35px', backgroundColor: '#0B3B49', border: '1px solid #155E75', color: '#FFFFFF', padding: '4px', borderRadius: '4px', textAlign: 'center', fontSize: '11px' }}
                  />
                  <span style={{ fontSize: '11px', color: '#64748B' }}>días</span>
                </div>
              </div>

              {/* Cartera de Clientes Deudores */}
              <div style={{ backgroundColor: '#0B3B49', borderRadius: '12px', border: '1px solid #155E75', overflowX: 'auto', marginBottom: '24px' }}>
                <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#062F3B', color: '#94A3B8', borderBottom: '1px solid #155E75' }}>
                      <th style={{ padding: '12px 14px' }}>Cliente</th>
                      <th style={{ padding: '12px 14px' }}>Documento</th>
                      <th style={{ padding: '12px 14px' }}>Teléfono</th>
                      <th style={{ padding: '12px 14px' }}>Deuda Base ($)</th>
                      <th style={{ padding: '12px 14px' }}>Vencimiento</th>
                      <th style={{ padding: '12px 14px' }}>Estatus / Mora</th>
                      <th style={{ padding: '12px 14px' }}>Total a Cobrar ($ y Bs)</th>
                      <th style={{ padding: '12px 14px', textAlign: 'center' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customerDebts.map((debt) => {
                      const surcharge = debt.isOverdue && !debt.waived && autoApplyMora ? debt.balanceDueUsd * (surchargeRate / 100) : 0;
                      const totalPayUsd = debt.balanceDueUsd + surcharge;
                      const totalPayBs = (totalPayUsd * bcvRate).toFixed(2);

                      return (
                        <tr key={debt.id} style={{ borderBottom: '1px solid #155E7544' }}>
                          <td style={{ padding: '12px 14px', fontWeight: 'bold' }}>{debt.name}</td>
                          <td style={{ padding: '12px 14px', color: '#38BDF8' }}>{debt.document}</td>
                          <td style={{ padding: '12px 14px' }}>{debt.phone}</td>
                          <td style={{ padding: '12px 14px', fontWeight: 'bold' }}>${debt.balanceDueUsd.toFixed(2)}</td>
                          <td style={{ padding: '12px 14px', color: '#CBD5E1' }}>{debt.dueDate}</td>
                          <td style={{ padding: '12px 14px' }}>
                            {debt.waived ? (
                              <span style={{ backgroundColor: '#0284C722', color: '#38BDF8', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '10px' }}>
                                MORA CONDONADA
                              </span>
                            ) : debt.isOverdue ? (
                              <span style={{ backgroundColor: '#EF444422', color: '#EF4444', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '10px' }}>
                                VENCIDO (+{debt.lateDays}d) / Mora +${surcharge.toFixed(2)}
                              </span>
                            ) : (
                              <span style={{ backgroundColor: '#10B98122', color: '#10B981', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '10px' }}>
                                AL DÍA
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            <strong style={{ color: '#F8FAFC' }}>${totalPayUsd.toFixed(2)}</strong>
                            <span style={{ color: '#94A3B8', fontSize: '11px', display: 'block' }}>({totalPayBs} Bs)</span>
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'wrap' }}>
                              <button
                                onClick={() => {
                                  setSelectedDebtorDetail(debt);
                                  setIsDebtorDetailModalOpen(true);
                                }}
                                title="Ver factura y mercancía que se llevó"
                                style={{ backgroundColor: '#0F766E', border: 'none', color: '#FFFFFF', padding: '6px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                              >
                                <FileText size={13} />
                                <span>👁️ Factura</span>
                              </button>

                              <button
                                onClick={() => {
                                  setSelectedDebtor(debt);
                                  setPayAmountUsd(totalPayUsd.toString());
                                  setIsPaymentModalOpen(true);
                                }}
                                style={{ backgroundColor: '#0284C7', border: 'none', color: '#FFFFFF', padding: '6px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
                              >
                                Cobrar Abono
                              </button>

                              <button
                                onClick={() => handleSendDebtReminderWhatsApp(debt)}
                                style={{ backgroundColor: '#16A34A', border: 'none', color: '#FFFFFF', padding: '6px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                              >
                                <MessageCircle size={13} />
                                <span>WhatsApp</span>
                              </button>

                              {debt.isOverdue && !debt.waived && (
                                <button
                                  onClick={() => handleWaiveLateFee(debt.id)}
                                  title="Condonar mora por acuerdo"
                                  style={{ backgroundColor: '#062F3B', border: '1px solid #155E75', color: '#94A3B8', padding: '6px 8px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer' }}
                                >
                                  Eximir Mora
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Historial de Abonos */}
              <div style={{ backgroundColor: '#0B3B49', padding: '20px', borderRadius: '12px', border: '1px solid #155E75' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '12px' }}>Historial de Abonos y Pagos Recibidos</h3>
                <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ color: '#94A3B8', borderBottom: '1px solid #155E75' }}>
                      <th style={{ padding: '8px' }}>Fecha</th>
                      <th style={{ padding: '8px' }}>Cliente</th>
                      <th style={{ padding: '8px' }}>Método de Pago</th>
                      <th style={{ padding: '8px' }}>Monto USD</th>
                      <th style={{ padding: '8px' }}>Monto Bs</th>
                      <th style={{ padding: '8px' }}>Referencia</th>
                      <th style={{ padding: '8px' }}>Notas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentHistoryList.map((p) => (
                      <tr key={p.id} style={{ borderBottom: '1px solid #155E7533' }}>
                        <td style={{ padding: '8px', color: '#94A3B8' }}>{p.createdAt}</td>
                        <td style={{ padding: '8px', fontWeight: 'bold' }}>{p.customerName}</td>
                        <td style={{ padding: '8px' }}>
                          <span style={{ backgroundColor: '#062F3B', padding: '2px 6px', borderRadius: '4px', color: '#38BDF8', fontWeight: 'bold', fontSize: '10px' }}>
                            {p.paymentMethod}
                          </span>
                        </td>
                        <td style={{ padding: '8px', color: '#10B981', fontWeight: 'bold' }}>+${p.amountUsd.toFixed(2)}</td>
                        <td style={{ padding: '8px' }}>{p.amountBs.toFixed(2)} Bs</td>
                        <td style={{ padding: '8px', fontFamily: 'monospace' }}>{p.referenceNumber}</td>
                        <td style={{ padding: '8px', color: '#94A3B8' }}>{p.notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 6: VENTAS & FACTURAS FISCALES SENIAT (CRUD) */}
          {activeTab === 'SALES' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>Facturas Fiscales y Ventas SENIAT</h2>
                  <p style={{ color: '#94A3B8', fontSize: '13px' }}>Control de correlativo sin saltos, bases imponibles 16%, exento, percepción IGTF 3% y libro fiscal.</p>
                </div>

                <button
                  onClick={() => window.open('/api/v1/reports/sales-book/csv', '_blank')}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#16A34A', color: '#FFFFFF', padding: '9px 14px', borderRadius: '8px', border: 'none', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}
                >
                  <FileSpreadsheet size={15} />
                  <span>Descargar Libro SENIAT (CSV)</span>
                </button>
              </div>

              <div style={{ backgroundColor: '#0B3B49', borderRadius: '12px', border: '1px solid #155E75', overflowX: 'auto' }}>
                <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#062F3B', color: '#94A3B8', borderBottom: '1px solid #155E75' }}>
                      <th style={{ padding: '12px 14px' }}>Factura Fiscal N°</th>
                      <th style={{ padding: '12px 14px' }}>Fecha</th>
                      <th style={{ padding: '12px 14px' }}>Cliente</th>
                      <th style={{ padding: '12px 14px' }}>Cajero</th>
                      <th style={{ padding: '12px 14px' }}>Total USD</th>
                      <th style={{ padding: '12px 14px' }}>Total Bs</th>
                      <th style={{ padding: '12px 14px' }}>Estatus</th>
                      <th style={{ padding: '12px 14px', textAlign: 'center' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salesHistory.map((sale) => (
                      <tr key={sale.id} style={{ borderBottom: '1px solid #155E7544' }}>
                        <td style={{ padding: '12px 14px', fontWeight: 'bold', color: '#38BDF8' }}>{sale.invoiceFormattedNumber}</td>
                        <td style={{ padding: '12px 14px', color: '#94A3B8' }}>{sale.createdAt}</td>
                        <td style={{ padding: '12px 14px' }}>{sale.customerName}</td>
                        <td style={{ padding: '12px 14px' }}>{sale.cashierName}</td>
                        <td style={{ padding: '12px 14px', fontWeight: 'bold', color: '#F8FAFC' }}>${sale.totalUsd.toFixed(2)}</td>
                        <td style={{ padding: '12px 14px', fontWeight: 'bold', color: '#10B981' }}>{sale.totalBs.toFixed(2)} Bs</td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{
                            padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '10px',
                            backgroundColor: sale.status === 'COMPLETADA' ? '#10B98122' : '#EF444422',
                            color: sale.status === 'COMPLETADA' ? '#10B981' : '#EF4444',
                          }}>
                            {sale.status}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                            <button
                              onClick={() => setSelectedSale(sale)}
                              style={{ backgroundColor: '#062F3B', border: '1px solid #155E75', color: '#FFFFFF', padding: '5px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
                            >
                              Ver Detalle
                            </button>
                            {isAdmin && sale.status === 'COMPLETADA' && (
                              <button
                                onClick={() => handleCancelSale(sale.id)}
                                style={{ backgroundColor: '#EF444422', border: '1px solid #EF444455', color: '#EF4444', padding: '5px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
                              >
                                Anular
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 7: FLUJO DE CAJA & GASTOS OPERATIVOS (CRUD) */}
          {activeTab === 'EXPENSES' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>CRUD de Flujo de Caja & Gastos (OPEX)</h2>
                  <p style={{ color: '#94A3B8', fontSize: '13px' }}>Registro de egresos por nómina, alquiler, servicios, mantenimiento e ingresos de caja.</p>
                </div>

                <button
                  onClick={() => setIsExpenseModalOpen(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#0284C7', color: '#FFFFFF', padding: '9px 14px', borderRadius: '8px', border: 'none', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}
                >
                  <Plus size={15} />
                  <span>Registrar Transacción</span>
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '20px' }}>
                <div style={{ backgroundColor: '#0B3B49', padding: '16px', borderRadius: '12px', border: '1px solid #155E75' }}>
                  <p style={{ fontSize: '11px', color: '#94A3B8' }}>Total Egresos Registrados</p>
                  <p style={{ fontSize: '22px', fontWeight: 'bold', color: '#EF4444', marginTop: '2px' }}>-${totalExpensesUsd.toFixed(2)} USD</p>
                </div>
                <div style={{ backgroundColor: '#0B3B49', padding: '16px', borderRadius: '12px', border: '1px solid #155E75' }}>
                  <p style={{ fontSize: '11px', color: '#94A3B8' }}>Ingresos Extraordinarios</p>
                  <p style={{ fontSize: '22px', fontWeight: 'bold', color: '#10B981', marginTop: '2px' }}>+${totalOtherIncomeUsd.toFixed(2)} USD</p>
                </div>
              </div>

              <div style={{ backgroundColor: '#0B3B49', borderRadius: '12px', border: '1px solid #155E75', overflowX: 'auto' }}>
                <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#062F3B', color: '#94A3B8', borderBottom: '1px solid #155E75' }}>
                      <th style={{ padding: '12px 14px' }}>Fecha</th>
                      <th style={{ padding: '12px 14px' }}>Tipo</th>
                      <th style={{ padding: '12px 14px' }}>Categoría</th>
                      <th style={{ padding: '12px 14px' }}>Descripción</th>
                      <th style={{ padding: '12px 14px' }}>Monto ($ y Bs)</th>
                      <th style={{ padding: '12px 14px' }}>Referencia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {financialTransactionsList.map((tx) => (
                      <tr key={tx.id} style={{ borderBottom: '1px solid #155E7544' }}>
                        <td style={{ padding: '12px 14px', color: '#94A3B8' }}>{tx.createdAt}</td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{
                            padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '10px',
                            backgroundColor: tx.type === 'INGRESO' ? '#10B98122' : '#EF444422',
                            color: tx.type === 'INGRESO' ? '#10B981' : '#EF4444',
                          }}>
                            {tx.type}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', fontWeight: 'bold' }}>{tx.category}</td>
                        <td style={{ padding: '12px 14px', color: '#CBD5E1' }}>{tx.description}</td>
                        <td style={{ padding: '12px 14px' }}>
                          <strong style={{ color: tx.type === 'INGRESO' ? '#10B981' : '#EF4444' }}>
                            {tx.type === 'INGRESO' ? '+' : '-'}${tx.amountUsd.toFixed(2)}
                          </strong>
                          <span style={{ display: 'block', fontSize: '11px', color: '#94A3B8' }}>({tx.amountBs.toFixed(2)} Bs)</span>
                        </td>
                        <td style={{ padding: '12px 14px', fontFamily: 'monospace' }}>{tx.referenceNumber}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 8: MONITOR DE TASAS */}
          {activeTab === 'RATES' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '14px' }}>
                <div>
                  <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>Monitor y Fluctuación de Tasas de Cambio</h2>
                  <p style={{ color: '#94A3B8', fontSize: '13px' }}>
                    Sincronización en vivo con la API oficial DolarApi Venezuela (BCV, Paralelo, Euro y Cripto USDT).
                  </p>
                </div>
                <button
                  onClick={fetchLiveRates}
                  disabled={isSyncingRates}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 16px',
                    backgroundColor: isSyncingRates ? '#064E3B' : '#059669',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 'bold',
                    fontSize: '13px',
                    cursor: isSyncingRates ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                  }}
                >
                  <RefreshCw size={16} className={isSyncingRates ? 'animate-spin' : ''} />
                  <span>{isSyncingRates ? 'Sincronizando Tasas...' : 'Actualizar Tasas en Vivo'}</span>
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '14px', marginBottom: '24px' }}>
                {[
                  { title: 'BCV Oficial (USD)', rate: bcvRate, change: '+1.52%', isOfficial: true, color: '#10B981' },
                  { title: 'Monitor Dólar / Paralelo', rate: bcvRate * 1.138, change: '+1.51%', isOfficial: false, color: '#38BDF8' },
                  { title: 'BCV Oficial (Euro)', rate: bcvRate * 1.055, change: '+0.38%', isOfficial: true, color: '#F59E0B' },
                  { title: 'Cripto P2P (Binance USDT)', rate: bcvRate * 1.142, change: '+1.51%', isOfficial: false, color: '#8B5CF6' },
                ].map((card, i) => (
                  <div key={i} style={{ backgroundColor: '#0B3B49', padding: '18px', borderRadius: '12px', border: '1px solid #155E75' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', color: '#94A3B8' }}>{card.title}</span>
                      <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', backgroundColor: card.isOfficial ? '#10B98122' : '#062F3B', color: card.isOfficial ? '#10B981' : '#CBD5E1', fontWeight: 'bold' }}>
                        {card.isOfficial ? 'OFICIAL' : 'REFERENCIAL'}
                      </span>
                    </div>
                    <p style={{ fontSize: '22px', fontWeight: 'bold', color: card.color, marginTop: '8px' }}>
                      {card.rate.toFixed(2)} Bs
                    </p>
                    <p style={{ fontSize: '11px', color: '#10B981', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <TrendingUp size={13} />
                      <span>{card.change} en 24h</span>
                    </p>
                  </div>
                ))}
              </div>

              {/* SELECCIÓN DE TASA ACTIVA Y RÉGIMEN FISCAL (SOLO ADMIN) */}
              {isAdmin && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '24px' }}>
                  {/* SELECTOR DE TASA DE COBRO ACTIVA */}
                  <div style={{ backgroundColor: '#0B3B49', padding: '20px', borderRadius: '14px', border: '1px solid #10B98155' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                      <RefreshCw size={20} color="#10B981" />
                      <h3 style={{ fontSize: '16px', fontWeight: 'bold' }}>Tasa de Cobro Activa para Productos</h3>
                    </div>
                    <p style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '14px' }}>
                      Selecciona cuál tasa de cambio utilizará el sistema para calcular los precios en Bolívares (Bs) en caja y catálogo.
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
                      {[
                        { id: 'BCV', label: 'BCV Oficial (USD)', val: bcvRate, note: 'Tasa legal oficial' },
                        { id: 'PARALELO', label: 'Monitor Dólar / Paralelo', val: +(bcvRate * 1.138).toFixed(2), note: 'Mercado libre referencial' },
                        { id: 'EURO', label: 'Euro Oficial BCV', val: +(bcvRate * 1.055).toFixed(2), note: 'Cotización oficial EUR/VES' },
                        { id: 'CUSTOM', label: 'Tasa Personalizada del Negocio', val: parseFloat(customRateInput) || bcvRate, note: 'Definida por el dueño' },
                      ].map((opt) => (
                        <div
                          key={opt.id}
                          onClick={() => setActiveRateSource(opt.id as any)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '10px 14px',
                            borderRadius: '8px',
                            border: `1px solid ${activeRateSource === opt.id ? '#10B981' : '#155E75'}`,
                            backgroundColor: activeRateSource === opt.id ? '#10B98115' : '#062F3B',
                            cursor: 'pointer',
                          }}
                        >
                          <div>
                            <span style={{ fontSize: '13px', fontWeight: 'bold', color: activeRateSource === opt.id ? '#A3E635' : '#FFFFFF' }}>
                              {opt.label}
                            </span>
                            <span style={{ display: 'block', fontSize: '10px', color: '#94A3B8' }}>{opt.note}</span>
                          </div>
                          <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#10B981' }}>
                            {opt.val.toFixed(2)} Bs
                          </span>
                        </div>
                      ))}
                    </div>

                    {activeRateSource === 'CUSTOM' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#062F3B', padding: '10px', borderRadius: '8px', marginBottom: '12px' }}>
                        <span style={{ fontSize: '12px', color: '#CBD5E1' }}>Monto Tasa (Bs):</span>
                        <input
                          type="number"
                          step="0.01"
                          value={customRateInput}
                          onChange={(e) => setCustomRateInput(e.target.value)}
                          style={{ width: '100px', padding: '6px', borderRadius: '6px', border: '1px solid #10B981', backgroundColor: '#071F27', color: '#10B981', fontWeight: 'bold', fontSize: '14px' }}
                        />
                      </div>
                    )}

                    <div style={{ backgroundColor: '#062F3B', padding: '10px 14px', borderRadius: '8px', fontSize: '12px', color: '#A3E635', fontWeight: 'bold' }}>
                      ✓ Tasa Aplicada Actualmente: {activeRate.toFixed(2)} Bs/$ ({activeRateSource})
                    </div>
                  </div>

                  {/* RÉGIMEN FISCAL FLEXIBLE (EMPRENDIMIENTOS / NEGOCIOS NO REGISTRADOS) */}
                  <div style={{ backgroundColor: '#0B3B49', padding: '20px', borderRadius: '14px', border: '1px solid #0284C755' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                      <ShieldCheck size={20} color="#38BDF8" />
                      <h3 style={{ fontSize: '16px', fontWeight: 'bold' }}>Régimen Fiscal Flexible (Emprendimientos)</h3>
                    </div>
                    <p style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '14px' }}>
                      Para negocios que están iniciando y no están registrados formalmente ante el SENIAT. Puedes desactivar o activar impuestos con 1 clic sin errores contables a medida que escalas.
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                      {/* Switch IVA */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#062F3B', padding: '12px', borderRadius: '8px' }}>
                        <div>
                          <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#FFFFFF' }}>Cobro de IVA (16%)</span>
                          <p style={{ fontSize: '10px', color: '#94A3B8' }}>
                            {enableIva ? 'Habilitado (Contribuyente Formal SENIAT)' : 'Desafiliado (0% IVA para Emprendimientos)'}
                          </p>
                        </div>
                        <button
                          onClick={() => setEnableIva(!enableIva)}
                          style={{
                            padding: '6px 14px',
                            borderRadius: '20px',
                            border: 'none',
                            fontWeight: 'bold',
                            fontSize: '11px',
                            cursor: 'pointer',
                            backgroundColor: enableIva ? '#10B981' : '#334155',
                            color: '#FFFFFF',
                          }}
                        >
                          {enableIva ? 'ACTIVO (16%)' : 'DESAFILIADO (0%)'}
                        </button>
                      </div>

                      {/* Switch IGTF */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#062F3B', padding: '12px', borderRadius: '8px' }}>
                        <div>
                          <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#FFFFFF' }}>Cobro de IGTF (3% Divisas)</span>
                          <p style={{ fontSize: '10px', color: '#94A3B8' }}>
                            {enableIgtf ? 'Habilitado (Sujeto Pasivo Especial)' : 'Desafiliado (0% IGTF para pequeños negocios)'}
                          </p>
                        </div>
                        <button
                          onClick={() => setEnableIgtf(!enableIgtf)}
                          style={{
                            padding: '6px 14px',
                            borderRadius: '20px',
                            border: 'none',
                            fontWeight: 'bold',
                            fontSize: '11px',
                            cursor: 'pointer',
                            backgroundColor: enableIgtf ? '#F59E0B' : '#334155',
                            color: '#FFFFFF',
                          }}
                        >
                          {enableIgtf ? 'ACTIVO (3%)' : 'DESAFILIADO (0%)'}
                        </button>
                      </div>
                    </div>

                    <div style={{ fontSize: '11px', color: '#94A3B8', borderLeft: '3px solid #38BDF8', paddingLeft: '10px' }}>
                      💡 <strong>Tranquilidad fiscal:</strong> Si tu negocio no está inscrito ante el SENIAT, mantén desafiliado el IVA e IGTF. Cuando te formalices, actívalos y el sistema calculará inmediatamente los libros y alícuotas sin alterar tu historial previo.
                    </div>
                  </div>
                </div>
              )}

              {/* Gráfico Histórico */}
              <div style={{ backgroundColor: '#0B3B49', padding: '20px', borderRadius: '12px', border: '1px solid #155E75' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 'bold', marginBottom: '16px' }}>Tendencia de Fluctuación de la Tasa BCV (Últimos 7 días)</h3>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '16px', height: '140px', paddingTop: '10px' }}>
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
                        <span style={{ fontSize: '10px', color: '#10B981', fontWeight: 'bold', marginBottom: '4px' }}>{pt.rate.toFixed(2)}</span>
                        <div style={{ width: '100%', height: `${Math.max(heightPercent, 20)}%`, backgroundColor: idx === 6 ? '#10B981' : '#0284C7', borderRadius: '4px 4px 0 0' }} />
                        <span style={{ fontSize: '10px', color: '#94A3B8', marginTop: '6px' }}>{pt.day}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 9: VENDEDORES EN VIVO */}
          {activeTab === 'CASHIERS' && (
            <div>
              <div style={{ marginBottom: '20px' }}>
                <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>Monitoreo de Vendedores y Cajeros en Vivo</h2>
                <p style={{ color: '#94A3B8', fontSize: '13px' }}>Supervisa lo que está gestionando cada cajero en tiempo real en los terminales de mostrador.</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
                {cashiersList.map((cashier) => (
                  <div key={cashier.id} style={{ backgroundColor: '#0B3B49', padding: '20px', borderRadius: '12px', border: '1px solid #155E75' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <div>
                        <h3 style={{ fontSize: '15px', fontWeight: 'bold' }}>{cashier.name}</h3>
                        <p style={{ fontSize: '12px', color: '#38BDF8' }}>@{cashier.username}</p>
                      </div>
                      <span style={{ backgroundColor: '#10B98122', color: '#10B981', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold' }}>
                        ● {cashier.status}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
                      <div style={{ backgroundColor: '#062F3B', padding: '10px', borderRadius: '8px' }}>
                        <p style={{ fontSize: '10px', color: '#94A3B8' }}>Cuentas Abiertas</p>
                        <p style={{ fontSize: '16px', fontWeight: 'bold', color: '#F59E0B' }}>{cashier.openCartsCount} cuentas</p>
                      </div>
                      <div style={{ backgroundColor: '#062F3B', padding: '10px', borderRadius: '8px' }}>
                        <p style={{ fontSize: '10px', color: '#94A3B8' }}>Ventas Hoy</p>
                        <p style={{ fontSize: '16px', fontWeight: 'bold', color: '#10B981' }}>${cashier.salesTodayUsd.toFixed(2)}</p>
                      </div>
                    </div>

                    <div style={{ backgroundColor: '#062F3B', padding: '10px', borderRadius: '8px', fontSize: '11px', borderLeft: '3px solid #38BDF8' }}>
                      <p style={{ color: '#94A3B8', fontSize: '10px' }}>Última Actividad ({cashier.lastActionTime}):</p>
                      <p style={{ color: '#F8FAFC', fontWeight: '500', marginTop: '2px' }}>{cashier.lastAction}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 10: AUDITORÍA Y BACKUPS (SOLO ADMIN) */}
          {activeTab === 'AUDIT' && isAdmin && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>Logs de Auditoría Inmutable & Respaldos (Backups)</h2>
                  <p style={{ color: '#94A3B8', fontSize: '13px' }}>
                    Trazabilidad de operaciones críticas (ventas, cambios de tasa, ajustes de stock y márgenes) y descarga de copias de seguridad.
                  </p>
                </div>

                <button
                  onClick={handleDownloadBackup}
                  disabled={isBackupDownloading}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    backgroundColor: '#10B981',
                    color: '#FFFFFF',
                    padding: '10px 18px',
                    borderRadius: '8px',
                    border: 'none',
                    fontWeight: 'bold',
                    fontSize: '13px',
                    cursor: isBackupDownloading ? 'wait' : 'pointer',
                  }}
                >
                  <Download size={16} />
                  <span>{isBackupDownloading ? 'Generando Copia...' : 'Descargar Backup Completo (JSON)'}</span>
                </button>
              </div>

              {/* TARJETAS DE ESTADO DEL SISTEMA Y BACKUPS */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '24px' }}>
                <div style={{ backgroundColor: '#0B3B49', padding: '18px', borderRadius: '12px', border: '1px solid #155E75' }}>
                  <span style={{ fontSize: '11px', color: '#94A3B8' }}>Productos en Base de Datos</span>
                  <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#38BDF8', marginTop: '6px' }}>{inventoryList.length}</p>
                  <span style={{ fontSize: '10px', color: '#10B981' }}>● Sincronizados en Nube</span>
                </div>

                <div style={{ backgroundColor: '#0B3B49', padding: '18px', borderRadius: '12px', border: '1px solid #155E75' }}>
                  <span style={{ fontSize: '11px', color: '#94A3B8' }}>Facturas y Ventas Registradas</span>
                  <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#10B981', marginTop: '6px' }}>{salesHistory.length}</p>
                  <span style={{ fontSize: '10px', color: '#38BDF8' }}>Con correlativo SENIAT</span>
                </div>

                <div style={{ backgroundColor: '#0B3B49', padding: '18px', borderRadius: '12px', border: '1px solid #155E75' }}>
                  <span style={{ fontSize: '11px', color: '#94A3B8' }}>Eventos Auditados</span>
                  <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#F59E0B', marginTop: '6px' }}>{auditLogsList.length}</p>
                  <span style={{ fontSize: '10px', color: '#94A3B8' }}>Inmutables en PostgreSQL</span>
                </div>

                <div style={{ backgroundColor: '#0B3B49', padding: '18px', borderRadius: '12px', border: '1px solid #155E75' }}>
                  <span style={{ fontSize: '11px', color: '#94A3B8' }}>Último Respaldo</span>
                  <p style={{ fontSize: '16px', fontWeight: 'bold', color: '#A3E635', marginTop: '10px' }}>Hoy (Automático)</p>
                  <span style={{ fontSize: '10px', color: '#94A3B8' }}>Formato JSON estándar</span>
                </div>
              </div>

              {/* TABLA DE AUDIT LOGS */}
              <div style={{ backgroundColor: '#0B3B49', borderRadius: '12px', border: '1px solid #155E75', overflowX: 'auto' }}>
                <div style={{ padding: '14px 18px', borderBottom: '1px solid #155E75', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: '#FFFFFF' }}>Registro Cronológico de Eventos</h3>
                  <span style={{ fontSize: '11px', color: '#38BDF8' }}>Filtrado por seguridad multi-tenant</span>
                </div>

                <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#062F3B', color: '#94A3B8', borderBottom: '1px solid #155E75' }}>
                      <th style={{ padding: '10px 14px' }}>Fecha y Hora</th>
                      <th style={{ padding: '10px 14px' }}>Usuario</th>
                      <th style={{ padding: '10px 14px' }}>Acción</th>
                      <th style={{ padding: '10px 14px' }}>Módulo / Entidad</th>
                      <th style={{ padding: '10px 14px' }}>Canal</th>
                      <th style={{ padding: '10px 14px' }}>Resultado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogsList.map((log) => (
                      <tr key={log.id} style={{ borderBottom: '1px solid #155E7533' }}>
                        <td style={{ padding: '10px 14px', color: '#94A3B8' }}>{log.createdAt}</td>
                        <td style={{ padding: '10px 14px', fontWeight: 'bold', color: '#38BDF8' }}>@{log.user}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{ padding: '2px 6px', borderRadius: '4px', backgroundColor: '#062F3B', color: '#FFFFFF', fontFamily: 'monospace', fontSize: '11px' }}>
                            {log.action}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px', color: '#CBD5E1' }}>{log.entity}</td>
                        <td style={{ padding: '10px 14px', color: '#94A3B8' }}>{log.channel}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{ padding: '2px 6px', borderRadius: '4px', backgroundColor: log.result === 'SUCCESS' ? '#10B98122' : '#EF444422', color: log.result === 'SUCCESS' ? '#10B981' : '#EF4444', fontWeight: 'bold', fontSize: '10px' }}>
                            {log.result}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 11: SÚPER ADMINISTRADOR GLOBAL (CRUD DE TODOS LOS NEGOCIOS / TENANTS) */}
          {activeTab === 'SUPER_ADMIN' && isSuperAdmin && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>👑 Súper Administrador Global (CRUD de Negocios & Tenants)</h2>
                  <p style={{ color: '#94A3B8', fontSize: '13px' }}>
                    Control maestro multi-inquilino: alta de nuevos negocios, auditoría de métricas de ventas y conmutación entre tiendas.
                  </p>
                </div>

                <button
                  onClick={() => setIsAddTenantModalOpen(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    backgroundColor: '#10B981',
                    color: '#FFFFFF',
                    padding: '10px 18px',
                    borderRadius: '8px',
                    border: 'none',
                    fontWeight: 'bold',
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  <Plus size={16} />
                  <span>+ Registrar Nuevo Negocio (Tenant)</span>
                </button>
              </div>

              {/* TARJETAS DE MÉTRICAS GLOBALES DE LA PLATAFORMA */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '24px' }}>
                <div style={{ backgroundColor: '#0B3B49', padding: '18px', borderRadius: '12px', border: '1px solid #155E75' }}>
                  <span style={{ fontSize: '11px', color: '#94A3B8' }}>Total Comercios Registrados</span>
                  <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#38BDF8', marginTop: '6px' }}>{tenantsList.length}</p>
                  <span style={{ fontSize: '10px', color: '#10B981' }}>● Plataforma SaaS Multi-Tenant</span>
                </div>

                <div style={{ backgroundColor: '#0B3B49', padding: '18px', borderRadius: '12px', border: '1px solid #155E75' }}>
                  <span style={{ fontSize: '11px', color: '#94A3B8' }}>Facturación Acumulada Global</span>
                  <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#10B981', marginTop: '6px' }}>
                    ${tenantsList.reduce((acc, t) => acc + (t.totalSalesUsd || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} USD
                  </p>
                  <span style={{ fontSize: '10px', color: '#38BDF8' }}>Ventas procesadas</span>
                </div>

                <div style={{ backgroundColor: '#0B3B49', padding: '18px', borderRadius: '12px', border: '1px solid #155E75' }}>
                  <span style={{ fontSize: '11px', color: '#94A3B8' }}>Comercios Operativos</span>
                  <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#A3E635', marginTop: '6px' }}>
                    {tenantsList.filter((t) => t.isActive).length} Activos
                  </p>
                  <span style={{ fontSize: '10px', color: '#94A3B8' }}>Emitiendo facturas</span>
                </div>

                <div style={{ backgroundColor: '#0B3B49', padding: '18px', borderRadius: '12px', border: '1px solid #155E75' }}>
                  <span style={{ fontSize: '11px', color: '#94A3B8' }}>Comercios Suspendidos</span>
                  <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#EF4444', marginTop: '6px' }}>
                    {tenantsList.filter((t) => !t.isActive).length}
                  </p>
                  <span style={{ fontSize: '10px', color: '#94A3B8' }}>Acceso bloqueado</span>
                </div>
              </div>

              {/* BARRA DE FILTRO Y PESTAÑAS DE ESTADO (CRUD SUPER ADMIN) */}
              <div style={{ marginBottom: '16px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: '280px' }}>
                  <Search size={16} color="#94A3B8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="text"
                    placeholder="Buscar negocio por Nombre Comercial, Razón Social, RIF o Slug..."
                    value={tenantSearchQuery}
                    onChange={(e) => setTenantSearchQuery(e.target.value)}
                    style={{ width: '100%', padding: '10px 10px 10px 36px', borderRadius: '8px', border: '1px solid #155E75', backgroundColor: '#062F3B', color: '#FFFFFF', fontSize: '13px', outline: 'none' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {[
                    { id: 'ALL', label: `Todos (${tenantsList.length})` },
                    { id: 'ACTIVE', label: `Activos (${tenantsList.filter((t) => t.isActive).length})` },
                    { id: 'SUSPENDED', label: `Suspendidos (${tenantsList.filter((t) => !t.isActive).length})` },
                    { id: 'SPECIAL', label: `Especiales (${tenantsList.filter((t) => t.isSpecialTaxpayer).length})` },
                  ].map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setTenantFilterStatus(f.id as any)}
                      style={{
                        padding: '8px 14px',
                        borderRadius: '8px',
                        border: tenantFilterStatus === f.id ? '1px solid #10B981' : '1px solid #155E75',
                        backgroundColor: tenantFilterStatus === f.id ? '#065F46' : '#062F3B',
                        color: tenantFilterStatus === f.id ? '#FFFFFF' : '#94A3B8',
                        fontWeight: 'bold',
                        fontSize: '12px',
                        cursor: 'pointer',
                      }}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* TABLA GLOBAL DE TENANTS / NEGOCIOS */}
              <div style={{ backgroundColor: '#0B3B49', borderRadius: '12px', border: '1px solid #155E75', overflowX: 'auto' }}>
                <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#062F3B', color: '#94A3B8', borderBottom: '1px solid #155E75' }}>
                      <th style={{ padding: '12px 14px' }}>Comercio / Razón Social</th>
                      <th style={{ padding: '12px 14px' }}>RIF</th>
                      <th style={{ padding: '12px 14px' }}>Contacto & Dirección</th>
                      <th style={{ padding: '12px 14px' }}>Régimen SENIAT</th>
                      <th style={{ padding: '12px 14px' }}>Métricas (Ventas/Prod)</th>
                      <th style={{ padding: '12px 14px' }}>Estado</th>
                      <th style={{ padding: '12px 14px', textAlign: 'center' }}>Acciones Super Admin (CRUD)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tenantsList
                      .filter((t) => {
                        const matchesQuery =
                          t.businessName.toLowerCase().includes(tenantSearchQuery.toLowerCase()) ||
                          t.tradeName.toLowerCase().includes(tenantSearchQuery.toLowerCase()) ||
                          t.documentNumber.includes(tenantSearchQuery) ||
                          t.slug.toLowerCase().includes(tenantSearchQuery.toLowerCase());
                        if (!matchesQuery) return false;
                        if (tenantFilterStatus === 'ACTIVE') return t.isActive;
                        if (tenantFilterStatus === 'SUSPENDED') return !t.isActive;
                        if (tenantFilterStatus === 'SPECIAL') return t.isSpecialTaxpayer;
                        return true;
                      })
                      .map((tenant) => (
                        <tr key={tenant.id} style={{ borderBottom: '1px solid #155E7533' }}>
                          <td style={{ padding: '12px 14px' }}>
                            <p style={{ fontWeight: 'bold', color: '#FFFFFF', fontSize: '13px' }}>{tenant.businessName}</p>
                            <p style={{ fontSize: '11px', color: '#94A3B8' }}>{tenant.tradeName} • <span style={{ fontFamily: 'monospace', color: '#38BDF8' }}>@{tenant.slug}</span></p>
                          </td>
                          <td style={{ padding: '12px 14px', fontWeight: 'bold', fontFamily: 'monospace', color: '#A3E635' }}>
                            {tenant.documentType}-{tenant.documentNumber}
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            <p style={{ color: '#CBD5E1', fontSize: '11px' }}>{tenant.phone}</p>
                            <p style={{ color: '#64748B', fontSize: '10px' }}>{tenant.email}</p>
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            <span style={{ padding: '2px 8px', borderRadius: '4px', backgroundColor: tenant.isSpecialTaxpayer ? '#EF444422' : '#10B98122', color: tenant.isSpecialTaxpayer ? '#EF4444' : '#10B981', fontWeight: 'bold', fontSize: '10px' }}>
                              {tenant.isSpecialTaxpayer ? 'Contribuyente Especial (IGTF 3%)' : 'Ordinario / Emprendimiento'}
                            </span>
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            <p style={{ fontWeight: 'bold', color: '#10B981' }}>${(tenant.totalSalesUsd || 0).toFixed(2)} USD</p>
                            <p style={{ fontSize: '10px', color: '#94A3B8' }}>{tenant.productsCount || 0} prods • {tenant.invoicesCount || 0} facturas</p>
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            <span style={{ padding: '3px 8px', borderRadius: '12px', backgroundColor: tenant.isActive ? '#10B98122' : '#EF444422', color: tenant.isActive ? '#10B981' : '#EF4444', fontWeight: 'bold', fontSize: '10px' }}>
                              {tenant.isActive ? '● ACTIVO' : '● SUSPENDIDO'}
                            </span>
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: '5px', justifyContent: 'center', flexWrap: 'wrap' }}>
                              <button
                                onClick={() => {
                                  setSelectedTenantDetail(tenant);
                                  setIsViewTenantDetailModalOpen(true);
                                }}
                                title="Ver ficha técnica completa del comercio"
                                style={{
                                  padding: '5px 8px',
                                  borderRadius: '6px',
                                  border: '1px solid #155E75',
                                  backgroundColor: '#062F3B',
                                  color: '#0284C7',
                                  fontSize: '11px',
                                  fontWeight: 'bold',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                <Eye size={12} />
                                <span>Detalles</span>
                              </button>

                              <button
                                onClick={() => {
                                  setEditingTenant(tenant);
                                  setIsEditTenantModalOpen(true);
                                }}
                                title="Editar configuración comercial y fiscal"
                                style={{
                                  padding: '5px 8px',
                                  borderRadius: '6px',
                                  border: '1px solid #155E75',
                                  backgroundColor: '#062F3B',
                                  color: '#F59E0B',
                                  fontSize: '11px',
                                  fontWeight: 'bold',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                <Edit3 size={12} />
                                <span>Editar</span>
                              </button>

                              <button
                                onClick={() => handleSwitchTenant(tenant)}
                                title="Conmutar contexto de trabajo a este tenant"
                                style={{
                                  padding: '5px 8px',
                                  borderRadius: '6px',
                                  border: 'none',
                                  backgroundColor: user?.tenantId === tenant.id ? '#10B981' : '#0284C7',
                                  color: '#FFFFFF',
                                  fontSize: '11px',
                                  fontWeight: 'bold',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                <ExternalLink size={12} />
                                <span>{user?.tenantId === tenant.id ? 'En uso' : 'Gestionar'}</span>
                              </button>

                              <button
                                onClick={() => handleToggleTenantActive(tenant.id)}
                                title={tenant.isActive ? 'Suspender comercio' : 'Reactivar comercio'}
                                style={{
                                  padding: '5px 8px',
                                  borderRadius: '6px',
                                  border: 'none',
                                  backgroundColor: tenant.isActive ? '#64748B' : '#16A34A',
                                  color: '#FFFFFF',
                                  fontSize: '11px',
                                  fontWeight: 'bold',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                {tenant.isActive ? <ToggleRight size={12} /> : <ToggleLeft size={12} />}
                                <span>{tenant.isActive ? 'Suspender' : 'Activar'}</span>
                              </button>

                              <button
                                onClick={() => {
                                  setDeletingTenant(tenant);
                                  setIsDeleteTenantModalOpen(true);
                                }}
                                title="Eliminar / Dar de baja este negocio"
                                style={{
                                  padding: '5px 8px',
                                  borderRadius: '6px',
                                  border: 'none',
                                  backgroundColor: '#DC2626',
                                  color: '#FFFFFF',
                                  fontSize: '11px',
                                  fontWeight: 'bold',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ASISTENTE (WIZARD) DE COBRO EN MODAL DE 3 PASOS (F2 / CONTINUAR AL COBRO) */}
      {isCheckoutWizardOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(2, 6, 23, 0.85)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 1100 }}>
          <div style={{ width: '100%', maxWidth: '640px', backgroundColor: '#0B3B49', borderRadius: '20px', border: '1px solid #10B981', boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8)', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
            {/* CABECERA DEL WIZARD */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 22px', borderBottom: '1px solid #155E75', backgroundColor: '#062F3B' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#F8FAFC' }}>
                  Asistente de Cobro & Facturación
                </h3>
                <p style={{ fontSize: '11px', color: '#38BDF8' }}>
                  {activeTicket?.label || 'Venta Actual'} • {cartLines.length} productos • Total: ${posTotalUsd.toFixed(2)} USD (≈ {posTotalBs.toFixed(2)} Bs)
                </p>
              </div>
              <button
                onClick={() => setIsCheckoutWizardOpen(false)}
                title="Cerrar modal (Esc)"
                style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* BARRA DE PROGRESO DE 3 PASOS SECUENCIALES */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', backgroundColor: '#071F27', borderBottom: '1px solid #155E75' }}>
              {[
                { step: 1, label: '1. Cliente' },
                { step: 2, label: '2. Pago & Vuelto' },
                { step: 3, label: '3. Resumen' },
              ].map((s) => {
                const isCurrent = checkoutStep === s.step;
                const isPassed = checkoutStep > s.step;
                return (
                  <div
                    key={s.step}
                    style={{
                      padding: '10px 8px',
                      textAlign: 'center',
                      fontSize: '12px',
                      fontWeight: isCurrent ? 'bold' : '500',
                      color: isCurrent ? '#A3E635' : isPassed ? '#10B981' : '#64748B',
                      borderBottom: isCurrent ? '3px solid #10B981' : '3px solid transparent',
                      backgroundColor: isCurrent ? '#0B3B49' : 'transparent',
                      transition: 'all 0.15s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    {isPassed ? <Check size={14} color="#10B981" /> : <span>{s.step}</span>}
                    <span>{s.label}</span>
                  </div>
                );
              })}
            </div>

            {/* CUERPO DEL WIZARD SEGÚN PASO */}
            <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
              {/* PASO 1: ASIGNACIÓN O REGISTRO DE CLIENTE */}
              {checkoutStep === 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Opción Rápida 1 Clic: Consumidor Final */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#062F3B', padding: '12px 14px', borderRadius: '10px', border: '1px solid #155E75' }}>
                    <div>
                      <h4 style={{ fontSize: '13px', fontWeight: 'bold', color: '#F8FAFC' }}>¿Venta Rápida sin Documento?</h4>
                      <p style={{ fontSize: '11px', color: '#94A3B8' }}>Asigna directamente Consumidor Final genérico en 1 solo clic</p>
                    </div>
                    <button
                      onClick={() => {
                        const cf = posCustomerList.find((c) => c.documentNumber === '00000000') || posCustomerList[0];
                        setPosSelectedCustomer(cf);
                        setShowQuickCustomerForm(false);
                        setPosCustomerFeedback({ type: 'success', message: '✅ V-00000000 Consumidor Final asignado' });
                      }}
                      style={{
                        padding: '8px 14px',
                        borderRadius: '8px',
                        border: 'none',
                        backgroundColor: posSelectedCustomer.documentNumber === '00000000' ? '#10B981' : '#0284C7',
                        color: '#FFFFFF',
                        fontWeight: 'bold',
                        fontSize: '12px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <Zap size={14} />
                      <span>{posSelectedCustomer.documentNumber === '00000000' ? '✓ Asignado' : 'Consumidor Final'}</span>
                    </button>
                  </div>

                  {/* Búsqueda Directa por Cédula / RIF */}
                  <form onSubmit={handlePosSearchCustomerByCi} style={{ display: 'flex', gap: '8px' }}>
                    <select
                      value={posCiDocType}
                      onChange={(e) => setPosCiDocType(e.target.value as any)}
                      style={{ padding: '10px', borderRadius: '8px', border: '1px solid #155E75', backgroundColor: '#062F3B', color: '#F8FAFC', fontWeight: 'bold', fontSize: '13px' }}
                    >
                      <option value="V">V-</option>
                      <option value="E">E-</option>
                      <option value="J">J-</option>
                      <option value="G">G-</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Buscar por Cédula o RIF (ej. 14523988)..."
                      value={posCiSearchInput}
                      onChange={(e) => setPosCiSearchInput(e.target.value)}
                      style={{ flex: 1, padding: '10px 12px', borderRadius: '8px', border: '1px solid #155E75', backgroundColor: '#062F3B', color: '#FFFFFF', fontSize: '13px', outline: 'none' }}
                    />
                    <button
                      type="submit"
                      style={{ padding: '10px 18px', borderRadius: '8px', border: 'none', backgroundColor: '#0284C7', color: '#FFFFFF', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}
                    >
                      Buscar
                    </button>
                  </form>

                  {/* Mini-Formulario de Registro Express Inline (Si la C.I. no existe) */}
                  {showQuickCustomerForm && (
                    <div style={{ backgroundColor: '#062F3B', padding: '14px', borderRadius: '10px', border: '1px solid #F59E0B' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#F59E0B', fontWeight: 'bold', fontSize: '12px', marginBottom: '8px' }}>
                        <AlertTriangle size={15} />
                        <span>C.I. no registrada. Formulario Express:</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '11px', color: '#94A3B8', marginBottom: '4px' }}>Nombre / Razón Social *</label>
                          <input
                            type="text"
                            placeholder="Nombre del cliente"
                            value={quickCustomerFirstName}
                            onChange={(e) => setQuickCustomerFirstName(e.target.value)}
                            style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #334155', backgroundColor: '#071F27', color: '#FFFFFF', fontSize: '12px' }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '11px', color: '#94A3B8', marginBottom: '4px' }}>Teléfono WhatsApp (Opcional)</label>
                          <input
                            type="text"
                            placeholder="04141234567"
                            value={quickCustomerPhone}
                            onChange={(e) => setQuickCustomerPhone(e.target.value)}
                            style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #334155', backgroundColor: '#071F27', color: '#FFFFFF', fontSize: '12px' }}
                          />
                        </div>
                      </div>
                      <button
                        onClick={handleSaveQuickPosCustomer}
                        style={{ padding: '8px 14px', borderRadius: '6px', border: 'none', backgroundColor: '#10B981', color: '#FFFFFF', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}
                      >
                        💾 Guardar y Asignar Cliente
                      </button>
                    </div>
                  )}

                  {/* Tarjeta del Cliente Actualmente Asignado */}
                  <div style={{ backgroundColor: '#062F3B', padding: '14px', borderRadius: '12px', border: '1px solid #155E75' }}>
                    <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 'bold', textTransform: 'uppercase' }}>Cliente Asignado a la Venta:</span>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                      <div>
                        <h4 style={{ fontSize: '15px', fontWeight: 'bold', color: '#FFFFFF' }}>{posSelectedCustomer.name}</h4>
                        <p style={{ fontSize: '12px', color: '#38BDF8', fontFamily: 'monospace' }}>
                          Documento: {posSelectedCustomer.documentType}-{posSelectedCustomer.documentNumber} • Tel: {posSelectedCustomer.phone || 'Sin WhatsApp'}
                        </p>
                      </div>
                      <span style={{ fontSize: '11px', color: '#10B981', backgroundColor: '#10B98122', padding: '3px 8px', borderRadius: '6px', fontWeight: 'bold' }}>
                        ✓ Listo para cobrar
                      </span>
                    </div>

                    {/* Alerta de Mora si posee deuda */}
                    {(posSelectedCustomer.balanceDue > 0 || posSelectedCustomer.isSpecialMoraCustomer) && (
                      <div style={{ backgroundColor: '#EF444422', border: '1px solid #EF4444', borderRadius: '8px', padding: '8px 12px', marginTop: '10px', fontSize: '11px', color: '#FCA5A5' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold', color: '#EF4444' }}>
                          <AlertTriangle size={14} />
                          <span>CLIENTE CON MORA ACTIVA</span>
                        </div>
                        <p style={{ marginTop: '2px' }}>
                          Saldo Deudor Previo: <strong>${posSelectedCustomer.balanceDue.toFixed(2)} USD</strong> (≈ {(posSelectedCustomer.balanceDue * activeRate).toFixed(2)} Bs).
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* PASO 2: MÉTODO DE PAGO Y CÁLCULO DE VUELTO */}
              {checkoutStep === 2 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Selector de Método de Pago */}
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: '#94A3B8', fontWeight: 'bold', marginBottom: '8px' }}>
                      SELECCIONA EL MÉTODO DE PAGO
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                      {[
                        { id: 'CASH_USD', label: '💵 Efectivo USD ($)' },
                        { id: 'CASH_VES', label: '🇻🇪 Efectivo Bs' },
                        { id: 'PAGO_MOVIL', label: '📱 Pago Móvil' },
                        { id: 'DEBIT_CARD', label: '💳 Punto / Biopago' },
                        { id: 'TRANSFER', label: '🏛️ Transferencia' },
                        { id: 'DERIVAR_ADMIN', label: '📋 Derivar a Admin (Mora)' },
                      ].map((m) => {
                        const isSelected = posPaymentMethod === m.id;
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => setPosPaymentMethod(m.id as any)}
                            style={{
                              padding: '10px 8px',
                              borderRadius: '8px',
                              border: isSelected ? '2px solid #10B981' : '1px solid #155E75',
                              backgroundColor: isSelected ? '#0284C7' : '#062F3B',
                              color: isSelected ? '#FFFFFF' : '#CBD5E1',
                              fontSize: '12px',
                              fontWeight: 'bold',
                              cursor: 'pointer',
                              textAlign: 'center',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            {m.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Resumen de Total & Cálculo automático de 3% IGTF (solo si CASH_USD) */}
                  <div style={{ backgroundColor: '#062F3B', padding: '14px', borderRadius: '10px', border: '1px solid #155E75' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#94A3B8', marginBottom: '4px' }}>
                      <span>Subtotal:</span>
                      <span>${posSubtotalUsd.toFixed(2)} USD</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#94A3B8', marginBottom: '4px' }}>
                      <span>IVA (16%):</span>
                      <span>{enableIva ? `$${posTax16Usd.toFixed(2)} USD` : '0% Exento'}</span>
                    </div>
                    {enableIgtf && posPaymentMethod === 'CASH_USD' && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#F59E0B', marginBottom: '4px', fontWeight: 'bold' }}>
                        <span>IGTF (3% Divisas en Efectivo):</span>
                        <span>+${posIgtfUsd.toFixed(2)} USD</span>
                      </div>
                    )}
                    <div style={{ height: '1px', backgroundColor: '#155E75', margin: '8px 0' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#FFFFFF' }}>TOTAL A COBRAR:</span>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '20px', fontWeight: '900', color: '#10B981' }}>
                          ${posTotalUsd.toFixed(2)} USD
                        </span>
                        <p style={{ fontSize: '13px', fontWeight: 'bold', color: '#A3E635' }}>
                          ≈ {posTotalBs.toFixed(2)} Bs (Tasa: {activeRate.toFixed(2)})
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Campo de Monto Recibido y Cálculo de Vuelto para Efectivo USD */}
                  {posPaymentMethod === 'CASH_USD' && (
                    <div style={{ backgroundColor: '#062F3B', padding: '14px', borderRadius: '10px', border: '1px solid #10B98144' }}>
                      <label style={{ display: 'block', fontSize: '11px', color: '#94A3B8', fontWeight: 'bold', marginBottom: '6px' }}>
                        MONTO RECIBIDO EN DÓLARES ($)
                      </label>
                      <div style={{ display: 'flex', gap: '6px', marginBottom: '10px', flexWrap: 'wrap' }}>
                        {[
                          { label: 'Exacto', amt: posTotalUsd.toFixed(2) },
                          { label: '$1', amt: '1.00' },
                          { label: '$5', amt: '5.00' },
                          { label: '$10', amt: '10.00' },
                          { label: '$20', amt: '20.00' },
                          { label: '$50', amt: '50.00' },
                          { label: '$100', amt: '100.00' },
                        ].map((b) => (
                          <button
                            key={b.label}
                            type="button"
                            onClick={() => setPosCashAmountUsd(b.amt)}
                            style={{
                              padding: '5px 10px',
                              borderRadius: '6px',
                              border: '1px solid #334155',
                              backgroundColor: '#071F27',
                              color: '#A3E635',
                              fontSize: '11px',
                              fontWeight: 'bold',
                              cursor: 'pointer',
                            }}
                          >
                            {b.label}
                          </button>
                        ))}
                      </div>
                      <input
                        type="number"
                        step="0.01"
                        value={posCashAmountUsd}
                        onChange={(e) => setPosCashAmountUsd(e.target.value)}
                        placeholder="Monto recibido $"
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #10B981', backgroundColor: '#071F27', color: '#10B981', fontSize: '18px', fontWeight: 'bold' }}
                      />
                      {posChangeUsd > 0 && (
                        <div style={{ marginTop: '10px', padding: '10px', borderRadius: '8px', backgroundColor: '#10B98122', border: '1px solid #10B981', color: '#A3E635', fontWeight: 'bold', fontSize: '14px', display: 'flex', justifyContent: 'space-between' }}>
                          <span>VUELTO A ENTREGAR:</span>
                          <span>${posChangeUsd.toFixed(2)} USD (≈ {posChangeBs.toFixed(2)} Bs)</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Campo de Monto Recibido para Efectivo Bolívares */}
                  {posPaymentMethod === 'CASH_VES' && (
                    <div style={{ backgroundColor: '#062F3B', padding: '14px', borderRadius: '10px', border: '1px solid #10B98144' }}>
                      <label style={{ display: 'block', fontSize: '11px', color: '#94A3B8', fontWeight: 'bold', marginBottom: '6px' }}>
                        MONTO RECIBIDO EN BOLÍVARES (Bs)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={posCashAmountVes}
                        onChange={(e) => setPosCashAmountVes(e.target.value)}
                        placeholder="Monto recibido en Bs"
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #10B981', backgroundColor: '#071F27', color: '#A3E635', fontSize: '18px', fontWeight: 'bold' }}
                      />
                      {posChangeBs > 0 && (
                        <div style={{ marginTop: '10px', padding: '10px', borderRadius: '8px', backgroundColor: '#10B98122', border: '1px solid #10B981', color: '#A3E635', fontWeight: 'bold', fontSize: '14px', display: 'flex', justifyContent: 'space-between' }}>
                          <span>VUELTO A ENTREGAR:</span>
                          <span>{posChangeBs.toFixed(2)} Bs (≈ ${posChangeUsd.toFixed(2)} USD)</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Detalle para Pago Móvil */}
                  {posPaymentMethod === 'PAGO_MOVIL' && (
                    <div style={{ backgroundColor: '#062F3B', padding: '14px', borderRadius: '10px', border: '1px solid #155E75' }}>
                      <label style={{ display: 'block', fontSize: '11px', color: '#94A3B8', fontWeight: 'bold', marginBottom: '6px' }}>N° DE REFERENCIA PAGO MÓVIL</label>
                      <input
                        type="text"
                        placeholder="Últimos 4 o 6 dígitos (ej. 4892)"
                        value={posPagoMovilRef}
                        onChange={(e) => setPosPagoMovilRef(e.target.value)}
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #334155', backgroundColor: '#071F27', color: '#FFFFFF', fontSize: '13px' }}
                      />
                    </div>
                  )}

                  {/* Detalle para Derivar a Administrador */}
                  {posPaymentMethod === 'DERIVAR_ADMIN' && (
                    <div style={{ backgroundColor: '#062F3B', padding: '14px', borderRadius: '10px', border: '1px solid #38BDF8' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#38BDF8', fontWeight: 'bold', fontSize: '13px', marginBottom: '4px' }}>
                        <FileText size={16} />
                        <span>Derivar a Administrador (Morosidad / Crédito)</span>
                      </div>
                      <p style={{ fontSize: '12px', color: '#94A3B8' }}>
                        Esta venta se guardará directamente en la sección de <strong>Cobranzas & Mora</strong> del Administrador. Quedará registrado el ticket con el desglose exacto de los productos que el cliente se llevó para su seguimiento o cobranza.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* PASO 3: RESUMEN Y EMISIÓN */}
              {checkoutStep === 3 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ backgroundColor: '#062F3B', padding: '16px', borderRadius: '12px', border: '1px solid #155E75' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #155E7533', paddingBottom: '8px', marginBottom: '8px' }}>
                      <span style={{ fontSize: '12px', color: '#94A3B8' }}>Cliente:</span>
                      <strong style={{ fontSize: '12px', color: '#F8FAFC' }}>
                        {posSelectedCustomer.name} ({posSelectedCustomer.documentType}-{posSelectedCustomer.documentNumber})
                      </strong>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #155E7533', paddingBottom: '8px', marginBottom: '8px' }}>
                      <span style={{ fontSize: '12px', color: '#94A3B8' }}>Método de Pago:</span>
                      <strong style={{ fontSize: '12px', color: '#A3E635' }}>
                        {posPaymentMethod === 'CASH_USD' ? '💵 Efectivo USD' : posPaymentMethod === 'CASH_VES' ? '🇻🇪 Efectivo Bs' : posPaymentMethod === 'DERIVAR_ADMIN' ? '📋 Derivado a Admin (Mora)' : posPaymentMethod}
                      </strong>
                    </div>

                    {/* Desglose de Ítems */}
                    <div style={{ maxHeight: '160px', overflowY: 'auto', margin: '8px 0', borderBottom: '1px solid #155E7533', paddingBottom: '8px' }}>
                      <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 'bold' }}>PRODUCTOS A ENTREGAR:</span>
                      {cartLines.map((line) => (
                        <div key={line.productId} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '4px 0' }}>
                          <span style={{ color: '#F8FAFC' }}>{line.qty}x {line.name}</span>
                          <span style={{ color: '#10B981', fontWeight: 'bold' }}>${(line.priceUsd * line.qty).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#94A3B8', marginBottom: '4px' }}>
                      <span>Subtotal:</span>
                      <span>${posSubtotalUsd.toFixed(2)} USD</span>
                    </div>

                    {enableIgtf && posPaymentMethod === 'CASH_USD' && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#F59E0B', marginBottom: '4px' }}>
                        <span>IGTF (3%):</span>
                        <span>+${posIgtfUsd.toFixed(2)} USD</span>
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', paddingTop: '6px', borderTop: '1px solid #155E75' }}>
                      <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#FFFFFF' }}>TOTAL FACTURADO:</span>
                      <div style={{ textAlign: 'right' }}>
                        <strong style={{ fontSize: '18px', color: '#10B981' }}>${posTotalUsd.toFixed(2)} USD</strong>
                        <span style={{ fontSize: '12px', color: '#A3E635', marginLeft: '6px' }}>(≈ {posTotalBs.toFixed(2)} Bs)</span>
                      </div>
                    </div>

                    {posChangeUsd > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#A3E635', fontSize: '12px', fontWeight: 'bold', marginTop: '6px' }}>
                        <span>Vuelto Entregado:</span>
                        <span>${posChangeUsd.toFixed(2)} USD (≈ {posChangeBs.toFixed(2)} Bs)</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* BOTONES DE NAVEGACIÓN Y ACCIÓN INFERIOR */}
            <div style={{ padding: '14px 20px', borderTop: '1px solid #155E75', backgroundColor: '#062F3B', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {checkoutStep === 1 ? (
                <button
                  type="button"
                  onClick={() => setIsCheckoutWizardOpen(false)}
                  style={{ padding: '10px 18px', borderRadius: '8px', border: '1px solid #334155', backgroundColor: 'transparent', color: '#94A3B8', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}
                >
                  Cancelar (Esc)
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setCheckoutStep((s) => (s - 1) as any)}
                  style={{ padding: '10px 18px', borderRadius: '8px', border: '1px solid #155E75', backgroundColor: '#071F27', color: '#CBD5E1', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}
                >
                  ⬅ Volver (Esc)
                </button>
              )}

              {checkoutStep < 3 ? (
                <button
                  type="button"
                  onClick={() => setCheckoutStep((s) => (s + 1) as any)}
                  style={{
                    padding: '12px 24px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#0284C7',
                    color: '#FFFFFF',
                    fontWeight: 'bold',
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span>Continuar (Enter)</span>
                  <ChevronRight size={16} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    handlePosConfirmSale();
                    setIsCheckoutWizardOpen(false);
                  }}
                  style={{
                    padding: '12px 24px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#10B981',
                    color: '#FFFFFF',
                    fontWeight: 'bold',
                    fontSize: '14px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)',
                  }}
                >
                  <Zap size={16} />
                  <span>Emitir Factura / Nota (Enter)</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADMINISTRADOR CONSULTA FACTURA Y LO QUE SE LLEVÓ EL CLIENTE EN MOROSIDAD */}
      {isDebtorDetailModalOpen && selectedDebtorDetail && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(2, 6, 23, 0.85)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 1200 }}>
          <div style={{ width: '100%', maxWidth: '600px', backgroundColor: '#0B3B49', borderRadius: '18px', border: '1px solid #0284C7', padding: '24px', boxShadow: '0 25px 60px rgba(0,0,0,0.8)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', borderBottom: '1px solid #155E75', paddingBottom: '12px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#F8FAFC' }}>
                  Detalle de Venta a Crédito / Morosidad
                </h3>
                <p style={{ fontSize: '12px', color: '#38BDF8' }}>
                  Comprobante: {selectedDebtorDetail.invoiceNumber || 'FACT-CREDITO'} • Despachado por: {selectedDebtorDetail.cashierName || 'Cajero de Turno'}
                </p>
              </div>
              <button onClick={() => setIsDebtorDetailModalOpen(false)} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ backgroundColor: '#062F3B', padding: '12px 16px', borderRadius: '10px', border: '1px solid #155E75', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '12px', color: '#94A3B8' }}>Cliente:</span>
                <strong style={{ fontSize: '13px', color: '#FFFFFF' }}>{selectedDebtorDetail.name}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '12px', color: '#94A3B8' }}>Cédula / RIF:</span>
                <span style={{ fontSize: '12px', color: '#38BDF8' }}>{selectedDebtorDetail.document}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', color: '#94A3B8' }}>Teléfono:</span>
                <span style={{ fontSize: '12px', color: '#CBD5E1' }}>{selectedDebtorDetail.phone || 'Sin número'}</span>
              </div>
            </div>

            {/* TABLA DE PRODUCTOS QUE EL CLIENTE SE LLEVÓ */}
            <h4 style={{ fontSize: '13px', fontWeight: 'bold', color: '#F8FAFC', marginBottom: '8px' }}>
              Mercancía que el cliente se llevó:
            </h4>
            <div style={{ maxHeight: '200px', overflowY: 'auto', backgroundColor: '#062F3B', borderRadius: '10px', border: '1px solid #155E75', marginBottom: '16px' }}>
              <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ color: '#94A3B8', borderBottom: '1px solid #155E75', backgroundColor: '#071F27' }}>
                    <th style={{ padding: '8px 10px' }}>Cant.</th>
                    <th style={{ padding: '8px 10px' }}>Producto</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>Precio Unit.</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>Subtotal ($)</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedDebtorDetail.itemsTaken && selectedDebtorDetail.itemsTaken.length > 0 ? (
                    selectedDebtorDetail.itemsTaken.map((it, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #155E7522' }}>
                        <td style={{ padding: '8px 10px', fontWeight: 'bold', color: '#A3E635' }}>{it.qty}</td>
                        <td style={{ padding: '8px 10px', color: '#F8FAFC' }}>{it.name}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', color: '#CBD5E1' }}>${it.priceUsd.toFixed(2)}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 'bold', color: '#10B981' }}>${it.subtotalUsd.toFixed(2)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} style={{ padding: '16px', textAlign: 'center', color: '#94A3B8' }}>
                        Registro anterior sin desglose de ítems específicos. Deuda base: ${selectedDebtorDetail.balanceDueUsd.toFixed(2)} USD.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* TOTALES DE LA DEUDA */}
            <div style={{ backgroundColor: '#062F3B', padding: '12px 16px', borderRadius: '10px', border: '1px solid #155E75', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#94A3B8', marginBottom: '4px' }}>
                <span>Deuda Base:</span>
                <span>${selectedDebtorDetail.balanceDueUsd.toFixed(2)} USD</span>
              </div>
              {selectedDebtorDetail.surchargeUsd > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#EF4444', marginBottom: '4px' }}>
                  <span>Recargo por Mora:</span>
                  <span>+${selectedDebtorDetail.surchargeUsd.toFixed(2)} USD</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', fontWeight: 'bold', color: '#FFFFFF', borderTop: '1px solid #155E75', paddingTop: '6px' }}>
                <span>TOTAL A COBRAR:</span>
                <span style={{ color: '#10B981' }}>${(selectedDebtorDetail.balanceDueUsd + (selectedDebtorDetail.surchargeUsd || 0)).toFixed(2)} USD</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => handleSendDebtReminderWhatsApp(selectedDebtorDetail)}
                style={{ flex: 1, padding: '12px', borderRadius: '8px', border: 'none', backgroundColor: '#16A34A', color: '#FFFFFF', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <MessageCircle size={16} />
                <span>Cobrar por WhatsApp</span>
              </button>
              <button
                onClick={() => setIsDebtorDetailModalOpen(false)}
                style={{ padding: '12px 20px', borderRadius: '8px', border: '1px solid #155E75', backgroundColor: '#062F3B', color: '#94A3B8', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}
              >
                Cerrar (Esc)
              </button>
            </div>
          </div>
        </div>
      )}
      {completedSaleModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 1000 }}>
          <div style={{ width: '100%', maxWidth: '500px', backgroundColor: '#0B3B49', borderRadius: '20px', padding: '28px', border: '1px solid #10B981', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.7)', textAlign: 'center' }}>
            <img
              src="/vuelto-logo.jpg"
              alt="Vuelto Logo"
              style={{ height: '42px', objectFit: 'contain', margin: '0 auto 14px auto', display: 'block', borderRadius: '6px' }}
            />
            <div style={{ width: '56px', height: '56px', borderRadius: '28px', backgroundColor: '#10B98122', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: '#10B981' }}>
              <CheckCircle size={32} />
            </div>

            <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#FFFFFF', marginBottom: '4px' }}>
              ¡Venta y Cobro Exitosos!
            </h3>
            <p style={{ fontSize: '13px', color: '#38BDF8', fontWeight: 'bold', marginBottom: '16px' }}>
              Comprobante N° {completedSaleModal.invoiceFormattedNumber}
            </p>

            <div style={{ backgroundColor: '#062F3B', padding: '16px', borderRadius: '12px', border: '1px solid #155E75', marginBottom: '20px', textAlign: 'left' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '12px', color: '#94A3B8' }}>Cliente:</span>
                <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#FFFFFF' }}>{completedSaleModal.customerName}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '12px', color: '#94A3B8' }}>Método de Pago:</span>
                <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#A3E635' }}>{completedSaleModal.paymentMethod}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '12px', color: '#94A3B8' }}>Total Cobrado:</span>
                <span style={{ fontSize: '16px', fontWeight: '900', color: '#10B981' }}>${completedSaleModal.totalUsd.toFixed(2)} USD (≈ {completedSaleModal.totalBs.toFixed(2)} Bs)</span>
              </div>
              {completedSaleModal.vueltoUsd > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #155E75', paddingTop: '6px', marginTop: '6px' }}>
                  <span style={{ fontSize: '12px', color: '#A3E635', fontWeight: 'bold' }}>Vuelto Entregado:</span>
                  <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#A3E635' }}>${completedSaleModal.vueltoUsd.toFixed(2)} USD ({completedSaleModal.vueltoBs.toFixed(2)} Bs)</span>
                </div>
              )}
            </div>

            {/* BOTÓN ESTRELLA: ENVIAR POR WHATSAPP SIN IMPRESORA */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <a
                href={getWhatsAppDeliveryNoteUrl(completedSaleModal)}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  backgroundColor: '#10B981',
                  color: '#FFFFFF',
                  padding: '14px',
                  borderRadius: '10px',
                  fontWeight: 'bold',
                  fontSize: '14px',
                  textDecoration: 'none',
                  boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)',
                }}
              >
                <MessageCircle size={20} />
                <span>📲 Enviar Nota de Entrega por WhatsApp</span>
              </a>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => {
                    alert('Generando Factura Fiscal Digital en PDF...');
                    window.open('/api/v1/reports/sales-book/csv', '_blank');
                  }}
                  style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid #155E75', backgroundColor: '#062F3B', color: '#38BDF8', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  <FileText size={16} />
                  <span>Ver PDF Digital</span>
                </button>

                <button
                  onClick={() => setCompletedSaleModal(null)}
                  style={{ flex: 1, padding: '12px', borderRadius: '10px', border: 'none', backgroundColor: '#0284C7', color: '#FFFFFF', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}
                >
                  Nueva Venta
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: REGISTRAR NUEVO PRODUCTO */}
      {isAddModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 100 }}>
          <div style={{ width: '100%', maxWidth: '600px', backgroundColor: '#0B3B49', borderRadius: '16px', padding: '24px', border: '1px solid #155E75', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold' }}>Registrar Nuevo Producto</h3>
              <button onClick={() => { setIsAddModalOpen(false); setCameraActive(false); }} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {/* Selector Manual / Cámara */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <button
                onClick={() => { setAddMode('MANUAL'); setCameraActive(false); }}
                style={{ flex: 1, padding: '9px', borderRadius: '8px', border: 'none', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', backgroundColor: addMode === 'MANUAL' ? '#0284C7' : '#062F3B', color: '#FFFFFF' }}
              >
                Ingreso Manual Rápido
              </button>
              <button
                onClick={() => { setAddMode('CAMERA'); setCameraActive(true); }}
                style={{ flex: 1, padding: '9px', borderRadius: '8px', border: 'none', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', backgroundColor: addMode === 'CAMERA' ? '#10B981' : '#062F3B', color: '#FFFFFF' }}
              >
                📷 Escanear con Cámara
              </button>
            </div>

            {addMode === 'CAMERA' && (
              <div style={{ position: 'relative', height: '180px', backgroundColor: '#000000', borderRadius: '10px', overflow: 'hidden', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <video ref={videoRef} style={{ width: '100%', height: '100%', objectFit: 'cover' }} playsInline muted />
                <div style={{ position: 'absolute', border: '2px dashed #10B981', width: '200px', height: '90px', borderRadius: '8px' }} />
                <button
                  onClick={() => {
                    const simulated = ensureValidEan13('7591005' + Math.floor(10000 + Math.random() * 90000));
                    setNewProdBarcode(simulated);
                    alert(`Código EAN-13 detectado: ${simulated}`);
                    setAddMode('MANUAL');
                    setCameraActive(false);
                  }}
                  style={{ position: 'absolute', bottom: '10px', padding: '6px 12px', borderRadius: '6px', border: 'none', backgroundColor: '#10B981', color: '#FFFFFF', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer' }}
                >
                  Capturar Código
                </button>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontSize: '11px', color: '#94A3B8', marginBottom: '4px' }}>Nombre del Producto *</label>
                <input
                  type="text"
                  placeholder="Ej: Pasta Primor 1kg"
                  value={newProdName}
                  onChange={(e) => setNewProdName(e.target.value)}
                  style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #155E75', backgroundColor: '#062F3B', color: '#FFFFFF', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#94A3B8', marginBottom: '4px' }}>Código de Barras (EAN-13)</label>
                <input
                  type="text"
                  placeholder="759..."
                  value={newProdBarcode}
                  onChange={(e) => setNewProdBarcode(e.target.value)}
                  style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #155E75', backgroundColor: '#062F3B', color: '#38BDF8', fontSize: '13px', fontFamily: 'monospace' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#94A3B8', marginBottom: '4px' }}>Proveedor</label>
                <input
                  type="text"
                  value={newProdSupplier}
                  onChange={(e) => setNewProdSupplier(e.target.value)}
                  style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #155E75', backgroundColor: '#062F3B', color: '#FFFFFF', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#94A3B8', marginBottom: '4px' }}>Costo Mayor ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={newProdCostUsd}
                  onChange={(e) => setNewProdCostUsd(e.target.value)}
                  style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #155E75', backgroundColor: '#062F3B', color: '#FFFFFF', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#94A3B8', marginBottom: '4px' }}>Precio Salida ($) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={newProdSaleUsd}
                  onChange={(e) => setNewProdSaleUsd(e.target.value)}
                  style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #155E75', backgroundColor: '#062F3B', color: '#10B981', fontSize: '13px', fontWeight: 'bold' }}
                />
              </div>

              {/* Cálculo en vivo de Ganancia Neta en Dólares ($) */}
              {parseFloat(newProdSaleUsd) > 0 && (
                <div style={{ gridColumn: 'span 2', backgroundColor: '#062F3B', padding: '10px 14px', borderRadius: '8px', border: '1px solid #10B98155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '11px', color: '#94A3B8' }}>Ganancia Neta en Dólares ($):</span>
                    <p style={{ fontSize: '15px', fontWeight: 'bold', color: '#A3E635', margin: 0 }}>
                      +${(parseFloat(newProdSaleUsd) - (parseFloat(newProdCostUsd) || 0)).toFixed(2)} USD
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '11px', color: '#94A3B8' }}>Margen Comercial:</span>
                    <p style={{ fontSize: '13px', fontWeight: 'bold', color: '#10B981', margin: 0 }}>
                      +{(((parseFloat(newProdSaleUsd) - (parseFloat(newProdCostUsd) || 0)) / parseFloat(newProdSaleUsd)) * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#94A3B8', marginBottom: '4px' }}>Categoría del Producto *</label>
                <select
                  value={newProdCategory}
                  onChange={(e) => {
                    const cat = e.target.value;
                    setNewProdCategory(cat);
                    const suggested = CATEGORY_UOM_MAP[cat] || ['unidad'];
                    setNewProdUom(suggested[0]);
                  }}
                  style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #155E75', backgroundColor: '#062F3B', color: '#FFFFFF', fontSize: '13px' }}
                >
                  {Object.keys(CATEGORY_UOM_MAP).map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#94A3B8', marginBottom: '4px' }}>Unidad de Medida (según Categoría) *</label>
                <select
                  value={newProdUom}
                  onChange={(e) => setNewProdUom(e.target.value)}
                  style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #155E75', backgroundColor: '#062F3B', color: '#A3E635', fontSize: '13px', fontWeight: 'bold' }}
                >
                  {(CATEGORY_UOM_MAP[newProdCategory] || ['unidad']).map((u) => (
                    <option key={u} value={u}>{u.toUpperCase()} ({u})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#94A3B8', marginBottom: '4px' }}>Stock Inicial</label>
                <input
                  type="number"
                  value={newProdStock}
                  onChange={(e) => setNewProdStock(e.target.value)}
                  style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #155E75', backgroundColor: '#062F3B', color: '#FFFFFF', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#94A3B8', marginBottom: '4px' }}>Alerta Stock Mínimo</label>
                <input
                  type="number"
                  value={newProdMinStock}
                  onChange={(e) => setNewProdMinStock(e.target.value)}
                  style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #155E75', backgroundColor: '#062F3B', color: '#FFFFFF', fontSize: '13px' }}
                />
              </div>
            </div>

            <button
              onClick={handleSaveProduct}
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: 'none', backgroundColor: '#0284C7', color: '#FFFFFF', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}
            >
              Guardar en Inventario
            </button>
          </div>
        </div>
      )}

      {/* MODAL SÚPER ADMIN: REGISTRAR NUEVO NEGOCIO (TENANT) */}
      {isAddTenantModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 1000 }}>
          <div style={{ width: '100%', maxWidth: '600px', backgroundColor: '#0B3B49', borderRadius: '20px', padding: '28px', border: '1px solid #10B981', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#FFFFFF' }}>👑 Registrar Nuevo Negocio (Tenant)</h3>
                <p style={{ fontSize: '11px', color: '#94A3B8' }}>Alta de comercio en la plataforma central multi-inquilino</p>
              </div>
              <button onClick={() => setIsAddTenantModalOpen(false)} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateTenant} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: '11px', color: '#94A3B8', marginBottom: '4px' }}>Razón Social *</label>
                  <input
                    type="text"
                    placeholder="Ej. Distribuidora Los Andes C.A."
                    value={newTenantBusinessName}
                    onChange={(e) => setNewTenantBusinessName(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #155E75', backgroundColor: '#062F3B', color: '#FFFFFF', fontSize: '13px' }}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#94A3B8', marginBottom: '4px' }}>Nombre Comercial</label>
                  <input
                    type="text"
                    placeholder="Ej. Abasto Los Andes"
                    value={newTenantTradeName}
                    onChange={(e) => setNewTenantTradeName(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #155E75', backgroundColor: '#062F3B', color: '#FFFFFF', fontSize: '13px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#94A3B8', marginBottom: '4px' }}>Identificador / Slug URL</label>
                  <input
                    type="text"
                    placeholder="los-andes"
                    value={newTenantSlug}
                    onChange={(e) => setNewTenantSlug(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #155E75', backgroundColor: '#062F3B', color: '#38BDF8', fontSize: '13px', fontFamily: 'monospace' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#94A3B8', marginBottom: '4px' }}>RIF / Documento Fiscal *</label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <select
                      value={newTenantDocType}
                      onChange={(e) => setNewTenantDocType(e.target.value as any)}
                      style={{ padding: '10px', borderRadius: '8px', border: '1px solid #155E75', backgroundColor: '#062F3B', color: '#A3E635', fontSize: '12px', fontWeight: 'bold' }}
                    >
                      <option value="J">J-</option>
                      <option value="G">G-</option>
                      <option value="V">V-</option>
                      <option value="E">E-</option>
                    </select>
                    <input
                      type="text"
                      placeholder="401234567"
                      value={newTenantDocNumber}
                      onChange={(e) => setNewTenantDocNumber(e.target.value)}
                      style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #155E75', backgroundColor: '#062F3B', color: '#FFFFFF', fontSize: '13px' }}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#94A3B8', marginBottom: '4px' }}>Teléfono WhatsApp *</label>
                  <input
                    type="text"
                    placeholder="+584121112233"
                    value={newTenantPhone}
                    onChange={(e) => setNewTenantPhone(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #155E75', backgroundColor: '#062F3B', color: '#FFFFFF', fontSize: '13px' }}
                    required
                  />
                </div>

                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: '11px', color: '#94A3B8', marginBottom: '4px' }}>Email de Contacto</label>
                  <input
                    type="email"
                    placeholder="administracion@losandes.ve"
                    value={newTenantEmail}
                    onChange={(e) => setNewTenantEmail(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #155E75', backgroundColor: '#062F3B', color: '#FFFFFF', fontSize: '13px' }}
                  />
                </div>

                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: '11px', color: '#94A3B8', marginBottom: '4px' }}>Dirección Fiscal</label>
                  <input
                    type="text"
                    placeholder="Av. Principal, Edificio Central, Piso 1"
                    value={newTenantAddress}
                    onChange={(e) => setNewTenantAddress(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #155E75', backgroundColor: '#062F3B', color: '#FFFFFF', fontSize: '13px' }}
                  />
                </div>

                <div style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#062F3B', padding: '10px', borderRadius: '8px', border: '1px solid #155E75' }}>
                  <input
                    type="checkbox"
                    id="isSpecialTaxpayerCheck"
                    checked={newTenantIsSpecial}
                    onChange={(e) => setNewTenantIsSpecial(e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: '#10B981' }}
                  />
                  <label htmlFor="isSpecialTaxpayerCheck" style={{ fontSize: '12px', color: '#CBD5E1', cursor: 'pointer' }}>
                    <strong>¿Designado Contribuyente Especial por el SENIAT?</strong> (Habilita retención y cobro de IGTF 3% en divisas)
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsAddTenantModalOpen(false)}
                  style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #334155', backgroundColor: 'transparent', color: '#CBD5E1', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{ flex: 1, padding: '12px', borderRadius: '8px', border: 'none', backgroundColor: '#10B981', color: '#FFFFFF', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}
                >
                  Crear y Habilitar Comercio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: AJUSTE FÍSICO DE STOCK (KARDEX) */}
      {isStockAdjustModalOpen && selectedStockProduct && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 100 }}>
          <div style={{ width: '100%', maxWidth: '480px', backgroundColor: '#0B3B49', borderRadius: '16px', padding: '24px', border: '1px solid #155E75' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 'bold' }}>Ajuste Físico de Stock (Kardex)</h3>
                <p style={{ fontSize: '12px', color: '#38BDF8' }}>{selectedStockProduct.name}</p>
              </div>
              <button onClick={() => setIsStockAdjustModalOpen(false)} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '11px', color: '#94A3B8', marginBottom: '4px' }}>Tipo de Movimiento</label>
              <select
                value={adjustMovementType}
                onChange={(e) => setAdjustMovementType(e.target.value as any)}
                style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #155E75', backgroundColor: '#062F3B', color: '#FFFFFF', fontSize: '13px' }}
              >
                <option value="ADJUSTMENT">Ajuste / Conteo Físico Real (Fija cantidad)</option>
                <option value="IN">Entrada / Adquisición Extra (+)</option>
                <option value="OUT">Salida / Merma / Daño (-)</option>
              </select>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '11px', color: '#94A3B8', marginBottom: '4px' }}>Cantidad</label>
              <input
                type="number"
                value={adjustQty}
                onChange={(e) => setAdjustQty(e.target.value)}
                style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #155E75', backgroundColor: '#062F3B', color: '#10B981', fontSize: '14px', fontWeight: 'bold' }}
              />
            </div>

            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '11px', color: '#94A3B8', marginBottom: '4px' }}>Motivo del Ajuste (Obligatorio Auditoría SENIAT)</label>
              <input
                type="text"
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                placeholder="ej. Conteo mensual de mostrador"
                style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #155E75', backgroundColor: '#062F3B', color: '#FFFFFF', fontSize: '13px' }}
              />
            </div>

            <button
              onClick={handleSaveStockAdjustment}
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: 'none', backgroundColor: '#10B981', color: '#FFFFFF', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}
            >
              Registrar Movimiento en Kardex
            </button>
          </div>
        </div>
      )}

      {/* MODAL 3: CREAR / EDITAR PROVEEDOR */}
      {isSupplierModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 100 }}>
          <div style={{ width: '100%', maxWidth: '480px', backgroundColor: '#0B3B49', borderRadius: '16px', padding: '24px', border: '1px solid #155E75' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold' }}>{editingSupplier ? 'Editar Proveedor' : 'Registrar Nuevo Proveedor'}</h3>
              <button onClick={() => setIsSupplierModalOpen(false)} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '18px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#94A3B8', marginBottom: '4px' }}>Razón Social *</label>
                <input
                  type="text"
                  placeholder="ej. Alimentos Polar C.A."
                  value={supName}
                  onChange={(e) => setSupName(e.target.value)}
                  style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #155E75', backgroundColor: '#062F3B', color: '#FFFFFF', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ width: '70px' }}>
                  <label style={{ display: 'block', fontSize: '11px', color: '#94A3B8', marginBottom: '4px' }}>Tipo</label>
                  <select
                    value={supDocType}
                    onChange={(e) => setSupDocType(e.target.value as any)}
                    style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #155E75', backgroundColor: '#062F3B', color: '#FFFFFF', fontSize: '13px' }}
                  >
                    <option value="J">J</option>
                    <option value="G">G</option>
                    <option value="V">V</option>
                    <option value="E">E</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '11px', color: '#94A3B8', marginBottom: '4px' }}>Número de RIF *</label>
                  <input
                    type="text"
                    placeholder="123456789"
                    value={supDocNumber}
                    onChange={(e) => setSupDocNumber(e.target.value)}
                    style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #155E75', backgroundColor: '#062F3B', color: '#FFFFFF', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#94A3B8', marginBottom: '4px' }}>Teléfono WhatsApp *</label>
                <input
                  type="text"
                  placeholder="+584141234567"
                  value={supPhone}
                  onChange={(e) => setSupPhone(e.target.value)}
                  style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #155E75', backgroundColor: '#062F3B', color: '#FFFFFF', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#94A3B8', marginBottom: '4px' }}>Correo Electrónico</label>
                <input
                  type="email"
                  placeholder="pedidos@proveedor.ve"
                  value={supEmail}
                  onChange={(e) => setSupEmail(e.target.value)}
                  style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #155E75', backgroundColor: '#062F3B', color: '#FFFFFF', fontSize: '13px' }}
                />
              </div>
            </div>

            <button
              onClick={handleSaveSupplier}
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: 'none', backgroundColor: '#0284C7', color: '#FFFFFF', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}
            >
              Guardar Proveedor
            </button>
          </div>
        </div>
      )}

      {/* MODAL 4: CREAR ORDEN DE COMPRA A PROVEEDOR */}
      {isOrderModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 100 }}>
          <div style={{ width: '100%', maxWidth: '500px', backgroundColor: '#0B3B49', borderRadius: '16px', padding: '24px', border: '1px solid #155E75' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold' }}>Nueva Orden de Compra a Proveedor</h3>
              <button onClick={() => setIsOrderModalOpen(false)} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '18px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#94A3B8', marginBottom: '4px' }}>Proveedor</label>
                <select
                  value={orderSupplierId}
                  onChange={(e) => setOrderSupplierId(e.target.value)}
                  style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #155E75', backgroundColor: '#062F3B', color: '#FFFFFF', fontSize: '13px' }}
                >
                  {suppliersList.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.documentType}-{s.documentNumber})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#94A3B8', marginBottom: '4px' }}>Producto a Reponer</label>
                <select
                  value={orderProductId}
                  onChange={(e) => {
                    setOrderProductId(e.target.value);
                    const p = inventoryList.find((it) => it.id === e.target.value);
                    if (p) setOrderCostUsd(p.costPriceUsd.toString());
                  }}
                  style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #155E75', backgroundColor: '#062F3B', color: '#FFFFFF', fontSize: '13px' }}
                >
                  {inventoryList.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} (Stock: {p.stock})</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#94A3B8', marginBottom: '4px' }}>Cantidad Solicitada</label>
                  <input
                    type="number"
                    value={orderQty}
                    onChange={(e) => setOrderQty(e.target.value)}
                    style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #155E75', backgroundColor: '#062F3B', color: '#FFFFFF', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#94A3B8', marginBottom: '4px' }}>Costo Mayor ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={orderCostUsd}
                    onChange={(e) => setOrderCostUsd(e.target.value)}
                    style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #155E75', backgroundColor: '#062F3B', color: '#10B981', fontSize: '13px', fontWeight: 'bold' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#94A3B8', marginBottom: '4px' }}>Notas de Pedido</label>
                <input
                  type="text"
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #155E75', backgroundColor: '#062F3B', color: '#FFFFFF', fontSize: '13px' }}
                />
              </div>
            </div>

            <button
              onClick={handleSavePurchaseOrder}
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: 'none', backgroundColor: '#0284C7', color: '#FFFFFF', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}
            >
              Crear Orden de Compra
            </button>
          </div>
        </div>
      )}

      {/* MODAL 5: REGISTRAR ABONO DE COBRANZA */}
      {isPaymentModalOpen && selectedDebtor && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 100 }}>
          <div style={{ width: '100%', maxWidth: '440px', backgroundColor: '#0B3B49', borderRadius: '16px', padding: '24px', border: '1px solid #155E75' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 'bold' }}>Registrar Abono de Pago</h3>
                <p style={{ fontSize: '12px', color: '#38BDF8' }}>{selectedDebtor.name} ({selectedDebtor.document})</p>
              </div>
              <button onClick={() => setIsPaymentModalOpen(false)} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '18px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#94A3B8', marginBottom: '4px' }}>Monto a Abonar (USD)</label>
                <input
                  type="number"
                  step="0.01"
                  value={payAmountUsd}
                  onChange={(e) => setPayAmountUsd(e.target.value)}
                  style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #155E75', backgroundColor: '#062F3B', color: '#10B981', fontSize: '16px', fontWeight: 'bold' }}
                />
                <span style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px', display: 'block' }}>
                  ≈ {((parseFloat(payAmountUsd) || 0) * bcvRate).toFixed(2)} Bs (Tasa BCV: {bcvRate.toFixed(2)})
                </span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#94A3B8', marginBottom: '4px' }}>Método de Pago</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value as any)}
                  style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #155E75', backgroundColor: '#062F3B', color: '#FFFFFF', fontSize: '13px' }}
                >
                  <option value="CASH_USD">Efectivo Divisas ($)</option>
                  <option value="PAGO_MOVIL">Pago Móvil (Bs)</option>
                  <option value="TRANSFER">Transferencia Bancaria</option>
                  <option value="DEBIT_CARD">Punto de Venta / Biopago</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#94A3B8', marginBottom: '4px' }}>Número de Referencia</label>
                <input
                  type="text"
                  placeholder="ej. PM-981245"
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #155E75', backgroundColor: '#062F3B', color: '#FFFFFF', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#94A3B8', marginBottom: '4px' }}>Notas</label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #155E75', backgroundColor: '#062F3B', color: '#FFFFFF', fontSize: '13px' }}
                />
              </div>
            </div>

            <button
              onClick={handleRegisterPayment}
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: 'none', backgroundColor: '#10B981', color: '#FFFFFF', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}
            >
              Confirmar Abono y Descontar Deuda
            </button>
          </div>
        </div>
      )}

      {/* MODAL 6: REGISTRAR GASTO / TRANSACCIÓN FINANCIERA */}
      {isExpenseModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 100 }}>
          <div style={{ width: '100%', maxWidth: '440px', backgroundColor: '#0B3B49', borderRadius: '16px', padding: '24px', border: '1px solid #155E75' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold' }}>Registrar Movimiento de Caja</h3>
              <button onClick={() => setIsExpenseModalOpen(false)} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '18px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setExpType('EGRESO')}
                  style={{ flex: 1, padding: '8px', borderRadius: '6px', border: 'none', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', backgroundColor: expType === 'EGRESO' ? '#EF4444' : '#062F3B', color: '#FFFFFF' }}
                >
                  Egreso / Gasto (-)
                </button>
                <button
                  type="button"
                  onClick={() => setExpType('INGRESO')}
                  style={{ flex: 1, padding: '8px', borderRadius: '6px', border: 'none', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', backgroundColor: expType === 'INGRESO' ? '#10B981' : '#062F3B', color: '#FFFFFF' }}
                >
                  Ingreso (+)
                </button>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#94A3B8', marginBottom: '4px' }}>Categoría</label>
                <select
                  value={expCategory}
                  onChange={(e) => setExpCategory(e.target.value)}
                  style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #155E75', backgroundColor: '#062F3B', color: '#FFFFFF', fontSize: '13px' }}
                >
                  <option value="NOMINA">Nómina y Sueldos</option>
                  <option value="ALQUILER">Alquiler de Local</option>
                  <option value="SERVICIOS">Servicios (Luz, Internet, Agua)</option>
                  <option value="PAGO_PROVEEDOR">Pago a Proveedor</option>
                  <option value="MANTENIMIENTO">Mantenimiento</option>
                  <option value="IMPUESTOS">Impuestos y Tasas</option>
                  <option value="OTROS">Otros Gastos</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#94A3B8', marginBottom: '4px' }}>Descripción *</label>
                <input
                  type="text"
                  placeholder="ej. Pago quincenal de cajero"
                  value={expDesc}
                  onChange={(e) => setExpDesc(e.target.value)}
                  style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #155E75', backgroundColor: '#062F3B', color: '#FFFFFF', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#94A3B8', marginBottom: '4px' }}>Monto (USD) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={expAmountUsd}
                  onChange={(e) => setExpAmountUsd(e.target.value)}
                  style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #155E75', backgroundColor: '#062F3B', color: expType === 'EGRESO' ? '#EF4444' : '#10B981', fontSize: '15px', fontWeight: 'bold' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#94A3B8', marginBottom: '4px' }}>Referencia Comprobante</label>
                <input
                  type="text"
                  placeholder="ej. FAC-1928 / TRANS-001"
                  value={expRef}
                  onChange={(e) => setExpRef(e.target.value)}
                  style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #155E75', backgroundColor: '#062F3B', color: '#FFFFFF', fontSize: '13px' }}
                />
              </div>
            </div>

            <button
              onClick={handleSaveExpense}
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: 'none', backgroundColor: '#0284C7', color: '#FFFFFF', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}
            >
              Registrar en Finanzas
            </button>
          </div>
        </div>
      )}

      {/* MODAL 7: DETALLE FISCAL DE VENTA SENIAT */}
      {selectedSale && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 100 }}>
          <div style={{ width: '100%', maxWidth: '580px', backgroundColor: '#0B3B49', borderRadius: '16px', padding: '24px', border: '1px solid #155E75', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#38BDF8' }}>{selectedSale.invoiceFormattedNumber}</h3>
                <p style={{ fontSize: '11px', color: '#94A3B8' }}>Fecha: {selectedSale.createdAt} • Tasa BCV: {selectedSale.rateValue.toFixed(2)} Bs</p>
              </div>
              <button onClick={() => setSelectedSale(null)} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ backgroundColor: '#062F3B', padding: '12px', borderRadius: '8px', fontSize: '12px', marginBottom: '14px' }}>
              <p><strong>Cliente:</strong> {selectedSale.customerName} ({selectedSale.customerDoc})</p>
              <p><strong>Cajero:</strong> {selectedSale.cashierName}</p>
              <p><strong>Estatus:</strong> <span style={{ color: selectedSale.status === 'COMPLETADA' ? '#10B981' : '#EF4444', fontWeight: 'bold' }}>{selectedSale.status}</span></p>
            </div>

            <table style={{ width: '100%', fontSize: '12px', textAlign: 'left', borderCollapse: 'collapse', marginBottom: '14px' }}>
              <thead>
                <tr style={{ color: '#94A3B8', borderBottom: '1px solid #155E75' }}>
                  <th style={{ padding: '6px' }}>Producto</th>
                  <th style={{ padding: '6px' }}>Cant.</th>
                  <th style={{ padding: '6px' }}>Precio</th>
                  <th style={{ padding: '6px' }}>IVA</th>
                  <th style={{ padding: '6px', textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {selectedSale.items.map((it, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #155E7533' }}>
                    <td style={{ padding: '6px' }}>{it.name}</td>
                    <td style={{ padding: '6px' }}>{it.qty}</td>
                    <td style={{ padding: '6px' }}>${it.priceUsd.toFixed(2)}</td>
                    <td style={{ padding: '6px' }}>{it.taxRate}%</td>
                    <td style={{ padding: '6px', textAlign: 'right', fontWeight: 'bold' }}>${it.subtotalUsd.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Desglose Fiscal SENIAT */}
            <div style={{ backgroundColor: '#062F3B', padding: '12px', borderRadius: '8px', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Base Imponible 16%:</span><span>${selectedSale.taxes.base16.toFixed(2)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Monto Exento:</span><span>${selectedSale.taxes.exempt.toFixed(2)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Impuesto IVA (16%):</span><span>${selectedSale.taxes.tax16.toFixed(2)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#F59E0B' }}><span>Percepción IGTF 3% (Efectivo Divisas):</span><span>+${selectedSale.taxes.igtf3.toFixed(2)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '14px', borderTop: '1px solid #155E75', paddingTop: '6px', marginTop: '4px' }}>
                <span>TOTAL A PAGAR:</span>
                <span style={{ color: '#10B981' }}>${selectedSale.totalUsd.toFixed(2)} ({selectedSale.totalBs.toFixed(2)} Bs)</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => window.open(`/api/v1/sales/${selectedSale.id}/receipt/pdf`, '_blank')}
                style={{ flex: 1, padding: '10px', backgroundColor: '#0284C7', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <FileText size={15} />
                <span>Descargar PDF</span>
              </button>
              <button
                onClick={() => alert('Comando de impresión térmica ESC/POS enviado a impresora Bluetooth.')}
                style={{ flex: 1, padding: '10px', backgroundColor: '#10B981', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <Printer size={15} />
                <span>Imprimir Ticket</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* MODAL SÚPER ADMIN: EDITAR NEGOCIO (TENANT) */}
      {isEditTenantModalOpen && editingTenant && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 1100 }}>
          <div style={{ width: '100%', maxWidth: '600px', backgroundColor: '#0B3B49', borderRadius: '20px', padding: '26px', border: '1px solid #F59E0B', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 60px rgba(0,0,0,0.8)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#FFFFFF' }}>✏️ Editar Comercio: {editingTenant.businessName}</h3>
                <p style={{ fontSize: '11px', color: '#F59E0B' }}>Modificar datos fiscales y configuración del tenant</p>
              </div>
              <button onClick={() => setIsEditTenantModalOpen(false)} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateTenant} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: '11px', color: '#94A3B8', marginBottom: '4px' }}>Razón Social *</label>
                  <input
                    type="text"
                    value={editingTenant.businessName}
                    onChange={(e) => setEditingTenant({ ...editingTenant, businessName: e.target.value })}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #155E75', backgroundColor: '#062F3B', color: '#FFFFFF', fontSize: '13px' }}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#94A3B8', marginBottom: '4px' }}>Nombre Comercial</label>
                  <input
                    type="text"
                    value={editingTenant.tradeName}
                    onChange={(e) => setEditingTenant({ ...editingTenant, tradeName: e.target.value })}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #155E75', backgroundColor: '#062F3B', color: '#FFFFFF', fontSize: '13px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#94A3B8', marginBottom: '4px' }}>RIF / Cédula Fiscal</label>
                  <input
                    type="text"
                    value={`${editingTenant.documentType}-${editingTenant.documentNumber}`}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      setEditingTenant({ ...editingTenant, documentNumber: val });
                    }}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #155E75', backgroundColor: '#062F3B', color: '#A3E635', fontSize: '13px', fontFamily: 'monospace' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#94A3B8', marginBottom: '4px' }}>Teléfono WhatsApp</label>
                  <input
                    type="text"
                    value={editingTenant.phone}
                    onChange={(e) => setEditingTenant({ ...editingTenant, phone: e.target.value })}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #155E75', backgroundColor: '#062F3B', color: '#FFFFFF', fontSize: '13px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#94A3B8', marginBottom: '4px' }}>Email de Contacto</label>
                  <input
                    type="email"
                    value={editingTenant.email}
                    onChange={(e) => setEditingTenant({ ...editingTenant, email: e.target.value })}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #155E75', backgroundColor: '#062F3B', color: '#FFFFFF', fontSize: '13px' }}
                  />
                </div>

                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', backgroundColor: '#062F3B', padding: '10px 14px', borderRadius: '8px', border: '1px solid #155E75' }}>
                    <input
                      type="checkbox"
                      checked={editingTenant.isSpecialTaxpayer}
                      onChange={(e) => setEditingTenant({ ...editingTenant, isSpecialTaxpayer: e.target.checked })}
                    />
                    <span style={{ fontSize: '12px', color: '#FFFFFF' }}>Contribuyente Especial SENIAT (Aplica IGTF 3% en Divisas)</span>
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsEditTenantModalOpen(false)}
                  style={{ flex: 1, padding: '11px', borderRadius: '8px', border: '1px solid #334155', backgroundColor: 'transparent', color: '#CBD5E1', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{ flex: 1, padding: '11px', borderRadius: '8px', border: 'none', backgroundColor: '#F59E0B', color: '#000000', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL SÚPER ADMIN: VER DETALLE / CREDENCIALES DEL COMERCIO */}
      {isViewTenantDetailModalOpen && selectedTenantDetail && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 1100 }}>
          <div style={{ width: '100%', maxWidth: '540px', backgroundColor: '#0B3B49', borderRadius: '20px', padding: '24px', border: '1px solid #0284C7', boxShadow: '0 25px 60px rgba(0,0,0,0.8)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#FFFFFF' }}>🏢 {selectedTenantDetail.businessName}</h3>
                <p style={{ fontSize: '11px', color: '#0284C7' }}>Ficha técnica y credenciales de acceso</p>
              </div>
              <button onClick={() => setIsViewTenantDetailModalOpen(false)} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ backgroundColor: '#062F3B', padding: '14px', borderRadius: '12px', border: '1px solid #155E75', marginBottom: '14px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94A3B8' }}>Nombre Comercial:</span>
                <span style={{ color: '#FFFFFF', fontWeight: 'bold' }}>{selectedTenantDetail.tradeName}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94A3B8' }}>Identificación Fiscal:</span>
                <span style={{ color: '#A3E635', fontFamily: 'monospace', fontWeight: 'bold' }}>
                  {selectedTenantDetail.documentType}-{selectedTenantDetail.documentNumber}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94A3B8' }}>Slug de Acceso Web:</span>
                <span style={{ color: '#38BDF8', fontFamily: 'monospace' }}>{selectedTenantDetail.slug}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94A3B8' }}>WhatsApp / Contacto:</span>
                <span style={{ color: '#FFFFFF' }}>{selectedTenantDetail.phone || 'No configurado'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94A3B8' }}>Email Notificaciones:</span>
                <span style={{ color: '#FFFFFF' }}>{selectedTenantDetail.email || 'No configurado'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94A3B8' }}>Régimen SENIAT:</span>
                <span style={{ color: selectedTenantDetail.isSpecialTaxpayer ? '#EF4444' : '#10B981', fontWeight: 'bold' }}>
                  {selectedTenantDetail.isSpecialTaxpayer ? 'Contribuyente Especial (IGTF 3%)' : 'Ordinario / Emprendimiento'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94A3B8' }}>Prefijo EAN-13 Interno:</span>
                <span style={{ color: '#A3E635', fontFamily: 'monospace' }}>{selectedTenantDetail.internalBarcodePrefix || '204'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94A3B8' }}>Estado de Cuenta:</span>
                <span style={{ color: selectedTenantDetail.isActive ? '#10B981' : '#EF4444', fontWeight: 'bold' }}>
                  {selectedTenantDetail.isActive ? '● ACTIVO' : '● SUSPENDIDO'}
                </span>
              </div>
            </div>

            {/* DATOS DE ACCESO GENERADOS */}
            <div style={{ backgroundColor: '#071F27', padding: '12px 14px', borderRadius: '10px', border: '1px solid #10B98144', marginBottom: '16px' }}>
              <span style={{ fontSize: '11px', color: '#10B981', fontWeight: 'bold' }}>CREDENCIALES ADMINISTRATIVAS:</span>
              <p style={{ fontSize: '12px', color: '#CBD5E1', marginTop: '4px' }}>
                Usuario Admin: <strong style={{ color: '#FFFFFF' }}>admin_{selectedTenantDetail.slug.slice(0, 8)}</strong> • Clave: <code style={{ color: '#A3E635' }}>Password2026!</code>
              </p>
            </div>

            <button
              onClick={() => setIsViewTenantDetailModalOpen(false)}
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: 'none', backgroundColor: '#0284C7', color: '#FFFFFF', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}
            >
              Cerrar Ficha Técnica
            </button>
          </div>
        </div>
      )}

      {/* MODAL SÚPER ADMIN: CONFIRMAR BAJA / ELIMINACIÓN */}
      {isDeleteTenantModalOpen && deletingTenant && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 1100 }}>
          <div style={{ width: '100%', maxWidth: '440px', backgroundColor: '#0B3B49', borderRadius: '20px', padding: '24px', border: '1px solid #EF4444', textAlign: 'center' }}>
            <div style={{ width: '50px', height: '50px', borderRadius: '25px', backgroundColor: '#EF444422', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px auto', color: '#EF4444' }}>
              <Trash2 size={24} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#FFFFFF', marginBottom: '6px' }}>
              ¿Dar de Baja Comercio?
            </h3>
            <p style={{ fontSize: '13px', color: '#CBD5E1', marginBottom: '16px' }}>
              ¿Estás seguro de que deseas dar de baja al comercio <strong>"{deletingTenant.businessName}"</strong> ({deletingTenant.documentType}-{deletingTenant.documentNumber})? Los accesos al terminal POS y facturación quedarán suspendidos.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setIsDeleteTenantModalOpen(false)}
                style={{ flex: 1, padding: '11px', borderRadius: '8px', border: '1px solid #334155', backgroundColor: 'transparent', color: '#CBD5E1', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteTenant}
                style={{ flex: 1, padding: '11px', borderRadius: '8px', border: 'none', backgroundColor: '#EF4444', color: '#FFFFFF', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}
              >
                Sí, Confirmar Baja
              </button>
            </div>
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

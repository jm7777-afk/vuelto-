// Cálculo y normalización de EAN-13 válido (Módulo 10 GS1)
const ensureValidEan13 = (raw: string): string => {
  const digits = raw.replace(/\D/g, '').slice(0, 12);
  const padded = digits.padEnd(12, '0');
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const d = parseInt(padded[i], 10);
    sum += i % 2 === 0 ? d : d * 3;
  }
  const check = (10 - (sum % 10)) % 10;
  return padded + check;
};

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
  sku: string;
  category: string;
  supplier: string;
  supplierPhone: string;
  costPriceUsd: number;
  salePriceUsd: number;
  taxRate: number;
  stock: number;
  minStockAlert: number;
  lastPurchaseDate: string;
  inflationDeltaPercent: number;
}

interface SupplierItem {
  id: string;
  name: string;
  documentType: 'J' | 'G' | 'V' | 'E';
  documentNumber: string;
  phone: string;
  email: string;
  address: string;
  creditDays: number;
  isActive: boolean;
}

interface PurchaseOrderItem {
  id: string;
  orderNumber: string;
  supplierId: string;
  supplierName: string;
  supplierPhone: string;
  status: 'DRAFT' | 'SENT_WHATSAPP' | 'RECEIVED' | 'CANCELLED';
  expectedDeliveryDate: string;
  totalEstimatedUsd: number;
  notes: string;
  createdAt: string;
  lines: Array<{ productName: string; qty: number; unitCostUsd: number; subtotalUsd: number }>;
}

interface KardexMovementItem {
  id: string;
  productName: string;
  movementType: 'IN' | 'OUT' | 'ADJUSTMENT' | 'SALE' | 'RETURN';
  quantity: number;
  unitCostUsd: number;
  reason: string;
  createdAt: string;
  user: string;
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
  waived?: boolean;
}

interface ReceivablePaymentRecord {
  id: string;
  customerName: string;
  customerDoc: string;
  amountUsd: number;
  amountBs: number;
  paymentMethod: string;
  referenceNumber: string;
  createdAt: string;
  notes: string;
}

interface FinancialTransactionItem {
  id: string;
  type: 'INGRESO' | 'EGRESO';
  category: string;
  description: string;
  amountUsd: number;
  amountBs: number;
  referenceNumber: string;
  createdAt: string;
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
  status: 'COMPLETADA' | 'ANULADA';
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

  // Roles y Responsive
  const isVendedor = user?.roleId === 'VENDEDOR' || user?.username === 'cajero1';
  const isAdmin = !isVendedor;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Navegación Activa
  type TabType = 'METRICS' | 'INVENTORY' | 'SUPPLIERS' | 'ORDERS' | 'RECEIVABLES' | 'SALES' | 'EXPENSES' | 'RATES' | 'CASHIERS';
  const [activeTab, setActiveTab] = useState<TabType>('METRICS');

  useEffect(() => {
    if (isVendedor && activeTab !== 'INVENTORY' && activeTab !== 'SALES' && activeTab !== 'RATES') {
      setActiveTab('INVENTORY');
    }
  }, [user, isVendedor, activeTab]);

  // Tasa BCV y Monitor
  const [bcvRate, setBcvRate] = useState(DEFAULT_BCV_RATE);
  const [ratesData, setRatesData] = useState<any>(null);

  // 1. INVENTARIO & STOCK
  const [searchTerm, setSearchTerm] = useState('');
  const [inventoryList, setInventoryList] = useState<ProductItem[]>([
    {
      id: 'p1',
      name: 'Harina PAN Blanca 1kg',
      barcode: '7591001001019',
      sku: 'HAR-001',
      category: 'Alimentos',
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

  // Modal Nuevo Producto
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addMode, setAddMode] = useState<'MANUAL' | 'CAMERA'>('MANUAL');
  const [newProdName, setNewProdName] = useState('');
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

  // Login handler
  const handleLogin = (roleToSet?: 'ADMIN' | 'VENDEDOR') => {
    const userRole = roleToSet || (usernameInput === 'cajero1' ? 'VENDEDOR' : 'ADMIN');
    const uName = roleToSet === 'VENDEDOR' ? 'cajero1' : roleToSet === 'ADMIN' ? 'admin' : usernameInput;

    const loggedProfile: UserProfile = {
      id: uName === 'cajero1' ? '8cb3bb66-6b60-4966-9bc6-e8220f122557' : '24a8eccf-b45e-4d5a-ac01-b44b77198c10',
      tenantId: 'a0000000-0000-0000-0000-000000000001',
      username: uName,
      fullName: uName === 'cajero1' ? 'Carlos Mendoza (Cajero)' : 'Dueño Administrador',
      roleId: userRole,
      businessName: 'Inversiones Bodega Central C.A.',
    };

    setUser(loggedProfile);
    localStorage.setItem('vuelto_user_session', JSON.stringify(loggedProfile));
    setActiveTab(userRole === 'VENDEDOR' ? 'INVENTORY' : 'METRICS');
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
      category: 'General',
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

  // LOGIN SCREEN SI NO ESTÁ AUTENTICADO
  if (!user) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#071F27', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <div style={{ width: '100%', maxWidth: '440px', backgroundColor: '#0B3B49', borderRadius: '24px', border: '1px solid #155E75', padding: '36px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.6)' }}>
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <h1 style={{ fontSize: '42px', fontWeight: '900', color: '#FFFFFF', letterSpacing: '2px', lineHeight: 1 }}>
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

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              onClick={() => handleLogin('ADMIN')}
              style={{ padding: '12px', borderRadius: '10px', border: '1px solid #0284C744', backgroundColor: '#0284C715', color: '#38BDF8', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', textAlign: 'left' }}
            >
              👑 Entrar como Administrador Total (admin)
              <span style={{ display: 'block', fontSize: '10px', color: '#94A3B8', marginTop: '2px', fontWeight: 'normal' }}>
                Acceso a todos los CRUDs: Proveedores, Costos, Márgenes, Mora y Finanzas
              </span>
            </button>

            <button
              onClick={() => handleLogin('VENDEDOR')}
              style={{ padding: '12px', borderRadius: '10px', border: '1px solid #10B98144', backgroundColor: '#10B98115', color: '#A3E635', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', textAlign: 'left' }}
            >
              🛒 Entrar como Cajero / Vendedor (cajero1)
              <span style={{ display: 'block', fontSize: '10px', color: '#94A3B8', marginTop: '2px', fontWeight: 'normal' }}>
                Solo POS, Precios de salida y Facturación (Costos y Márgenes estrictamente ocultos)
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
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
              <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: '#0284C7', color: '#FFFFFF' }}>
                <Store size={22} />
              </div>
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
            {isVendedor ? '🛒 MODO CAJERO / VENDEDOR' : '👑 MODO ADMINISTRADOR TOTAL'}
          </div>

          {/* NAVEGACIÓN BASADA EN ROLES (RBAC) */}
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, overflowY: 'auto' }}>
            {(isVendedor
              ? [
                  { id: 'INVENTORY', label: 'Consulta de Precios', icon: <Package size={17} /> },
                  { id: 'SALES', label: 'Ventas y Facturas', icon: <FileText size={17} /> },
                  { id: 'RATES', label: 'Tasas Oficiales BCV', icon: <RefreshCw size={17} /> },
                ]
              : [
                  { id: 'METRICS', label: 'Dashboard & Finanzas', icon: <TrendingUp size={17} /> },
                  { id: 'INVENTORY', label: 'Inventario & Kardex', icon: <Package size={17} /> },
                  { id: 'SUPPLIERS', label: 'Proveedores (CRUD)', icon: <Building size={17} /> },
                  { id: 'ORDERS', label: 'Pedidos a Proveedores', icon: <Truck size={17} />, badge: purchaseOrdersList.filter(o => o.status === 'DRAFT' || o.status === 'SENT_WHATSAPP').length },
                  { id: 'RECEIVABLES', label: 'Cobranzas & Mora', icon: <DollarSign size={17} />, badge: customerDebts.filter(c => c.isOverdue).length },
                  { id: 'SALES', label: 'Ventas & Facturas', icon: <FileText size={17} /> },
                  { id: 'EXPENSES', label: 'Flujo de Caja & Gastos', icon: <CreditCard size={17} /> },
                  { id: 'RATES', label: 'Tasas de Cambio', icon: <RefreshCw size={17} /> },
                  { id: 'CASHIERS', label: 'Vendedores en Vivo', icon: <Users size={17} /> },
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
            <p style={{ fontSize: '10px', color: '#94A3B8' }}>Tasa Oficial BCV:</p>
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
                      {isAdmin && <th style={{ padding: '12px 14px' }}>Margen Ganancia</th>}
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
                                <span style={{ backgroundColor: '#10B98122', color: '#10B981', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '11px' }}>
                                  +{itemMargin}% (+${itemProfit.toFixed(2)})
                                </span>
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
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
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
              <div style={{ marginBottom: '20px' }}>
                <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>Monitor y Fluctuación de Tasas de Cambio</h2>
                <p style={{ color: '#94A3B8', fontSize: '13px' }}>Comparativa de tasas oficiales y de mercado en Venezuela con historial semanal.</p>
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
        </main>
      </div>

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
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

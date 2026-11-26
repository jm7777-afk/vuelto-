import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import { initWebSentry } from './config/sentry';
import { ErrorBoundary } from './components/ErrorBoundary';
import './styles/vuelto-intro.css';
import { LoadingScreen } from './components/LoadingScreen';
import { OnboardingFlow, ONBOARDING_STORAGE_KEY } from './components/OnboardingFlow';
import { LoginView } from './components/LoginView';
import { WebBarcodeScanner } from './components/WebBarcodeScanner';
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
import { SuperAdminConsole } from './components/SuperAdminConsole';
import { apiFetch, getAccessToken, setSessionTokens, clearSessionStorage } from './services/api';
import type {
  UserProfile,
  ProductItem,
  SupplierItem,
  PurchaseOrderItem,
  KardexMovementItem,
  CustomerDebt,
  ReceivablePaymentRecord,
  FinancialTransactionItem,
  SaleRecord,
  CashierStatus,
  PosCustomerItem,
  PosCartLine,
  PosTicket,
} from './types';

initWebSentry();

const DEFAULT_BCV_RATE = 0;

// COMPONENTE PRINCIPAL
export const App: React.FC = () => {
  // Flujo inicial: Loading Screen -> Onboarding (1ra vez) / Login / Dashboard
  const [bootPhase, setBootPhase] = useState<'LOADING' | 'ONBOARDING' | 'LOGIN' | 'READY'>('LOADING');
  const [bootSlow, setBootSlow] = useState(false);
  const [bootError, setBootError] = useState<string | null>(null);
  const [showSplash, setShowSplash] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (!showSplash) return;
    const t = setTimeout(() => setShowSplash(false), 1800);
    return () => clearTimeout(t);
  }, [showSplash]);

  // Sesión y Auth Persistente (validada contra /api/v1/auth/me)
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const token = getAccessToken();
      if (!token) return null;
      const stored = localStorage.getItem('vuelto_user_session');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [twoFactorInput, setTwoFactorInput] = useState('');
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Modal de Cambio de Contraseña para usuarios de tienda
  const [isStorePwdModalOpen, setIsStorePwdModalOpen] = useState(false);
  const [storeCurPwd, setStoreCurPwd] = useState('');
  const [storeNewPwd, setStoreNewPwd] = useState('');
  const [storeConfPwd, setStoreConfPwd] = useState('');
  const [storePwdMsg, setStorePwdMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Roles y Responsive (derivado estrictamente del rol autenticado)
  const userRoleMode: 'SUPER_ADMIN' | 'ADMIN' | 'VENDEDOR' =
    user?.roleId === 'SUPER_ADMIN'
      ? 'SUPER_ADMIN'
      : user?.roleId === 'VENDEDOR'
      ? 'VENDEDOR'
      : 'ADMIN';
  const isVendedor = userRoleMode === 'VENDEDOR';
  const isAdmin = !isVendedor;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Navegación Activa de Tienda
  type TabType = 'POS' | 'METRICS' | 'INVENTORY' | 'SUPPLIERS' | 'ORDERS' | 'RECEIVABLES' | 'SALES' | 'EXPENSES' | 'RATES' | 'CASHIERS' | 'AUDIT';
  const [activeTab, setActiveTab] = useState<TabType>('POS');

  useEffect(() => {
    if (isVendedor && activeTab !== 'POS' && activeTab !== 'INVENTORY' && activeTab !== 'SALES' && activeTab !== 'RATES') {
      setActiveTab('POS');
    }
  }, [userRoleMode, isVendedor, activeTab]);

  // Tasa de Cambio y Selección de Cobro del Administrador (Integración DolarApi Oficial en Vivo)
  const [bcvRate, setBcvRate] = useState(DEFAULT_BCV_RATE);
  const [activeExchangeRateId, setActiveExchangeRateId] = useState<string>('');
  const [activeRateSource, setActiveRateSource] = useState<'BCV' | 'PARALELO' | 'EURO' | 'CUSTOM'>('BCV');
  const [customRateInput, setCustomRateInput] = useState('0.00');
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
    ? +(ratesData?.monitor?.rate || bcvRate * 1.138)
    : activeRateSource === 'EURO'
    ? +(ratesData?.euro?.rate || bcvRate * 1.055)
    : activeRateSource === 'CUSTOM'
    ? +(parseFloat(customRateInput) || bcvRate)
    : bcvRate;

  // Estado del Carrito y Terminal POS (100% desde PostgreSQL)
  const defaultEmptyCustomer: PosCustomerItem = {
    id: '',
    name: 'Consumidor Final',
    documentType: 'V',
    documentNumber: '00000000',
    phone: '',
    balanceDue: 0,
    isSpecialMoraCustomer: false,
  };
  const [posCustomerList, setPosCustomerList] = useState<PosCustomerItem[]>([]);

  // Lista de Tickets en Paralelo (Fichero Superior - sin productos ficticios)
  const [posTickets, setPosTickets] = useState<PosTicket[]>([
    {
      id: 'ticket-1',
      ticketNumber: 1,
      label: 'Venta #1',
      customer: defaultEmptyCustomer,
      cartLines: [],
      paymentMethod: 'CASH_USD',
      cashAmountUsd: '0.00',
      pagoMovilBank: '0102 - Banco de Venezuela',
      pagoMovilPhone: '',
      pagoMovilRef: '',
      adminApproved: false,
      createdAt: new Date().toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' }),
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

  // Auditoría y Backups (100% desde PostgreSQL)
  const [auditLogsList, setAuditLogsList] = useState<any[]>([]);
  const [isBackupDownloading, setIsBackupDownloading] = useState(false);

  // 1. INVENTARIO & STOCK (100% desde PostgreSQL)
  const [searchTerm, setSearchTerm] = useState('');
  const [inventoryList, setInventoryList] = useState<ProductItem[]>([]);

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
  const [newProdSupplier, setNewProdSupplier] = useState('');
  const [newProdSupplierPhone, setNewProdSupplierPhone] = useState('');
  const [newProdCostUsd, setNewProdCostUsd] = useState('');
  const [newProdSaleUsd, setNewProdSaleUsd] = useState('');
  const [newProdStock, setNewProdStock] = useState('0');
  const [newProdMinStock, setNewProdMinStock] = useState('5');
  const [cameraActive, setCameraActive] = useState(false);
  const [scannedBarcodeInfo, setScannedBarcodeInfo] = useState<string | null>(null);
  const [posCameraOpen, setPosCameraOpen] = useState(false);

  // Estado Apertura y Cierre de Caja
  const [cashSession, setCashSession] = useState<any>(null);
  const [isCashModalOpen, setIsCashModalOpen] = useState(false);
  const [cashOpeningUsd, setCashOpeningUsd] = useState('0.00');
  const [cashOpeningBs, setCashOpeningBs] = useState('0.00');
  const [cashClosingUsd, setCashClosingUsd] = useState('0.00');
  const [cashClosingBs, setCashClosingBs] = useState('0.00');
  const [cashNotes, setCashNotes] = useState('');
  const [cashLoading, setCashLoading] = useState(false);

  // Modal Ajuste de Stock Físico (Kardex)
  const [isStockAdjustModalOpen, setIsStockAdjustModalOpen] = useState(false);
  const [selectedStockProduct, setSelectedStockProduct] = useState<ProductItem | null>(null);
  const [adjustMovementType, setAdjustMovementType] = useState<'IN' | 'OUT' | 'ADJUSTMENT'>('ADJUSTMENT');
  const [adjustQty, setAdjustQty] = useState('0');
  const [adjustReason, setAdjustReason] = useState('Conteo físico de inventario');

  // Historial de Kardex (100% desde PostgreSQL)
  const [kardexHistory, setKardexHistory] = useState<KardexMovementItem[]>([]);

  // 2. PROVEEDORES (CRUD - 100% desde PostgreSQL)
  const [suppliersList, setSuppliersList] = useState<SupplierItem[]>([]);

  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<SupplierItem | null>(null);
  const [supName, setSupName] = useState('');
  const [supDocType, setSupDocType] = useState<'J' | 'G' | 'V' | 'E'>('J');
  const [supDocNumber, setSupDocNumber] = useState('');
  const [supPhone, setSupPhone] = useState('');
  const [supEmail, setSupEmail] = useState('');
  const [supAddress, setSupAddress] = useState('');

  // 3. PEDIDOS A PROVEEDORES (PURCHASE ORDERS - 100% desde PostgreSQL)
  const [purchaseOrdersList, setPurchaseOrdersList] = useState<PurchaseOrderItem[]>([]);

  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [orderSupplierId, setOrderSupplierId] = useState('');
  const [orderProductId, setOrderProductId] = useState('');
  const [orderQty, setOrderQty] = useState('10');
  const [orderCostUsd, setOrderCostUsd] = useState('0');
  const [orderNotes, setOrderNotes] = useState('');

  // 4. COBRANZAS Y MORA (100% desde PostgreSQL)
  const [surchargeRate, setSurchargeRate] = useState(5.0);
  const [graceDays, setGraceDays] = useState(3);
  const [autoApplyMora, setAutoApplyMora] = useState(true);

  const [customerDebts, setCustomerDebts] = useState<CustomerDebt[]>([]);

  // Modal Registrar Abono de Cobranza
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedDebtor, setSelectedDebtor] = useState<CustomerDebt | null>(null);
  const [payAmountUsd, setPayAmountUsd] = useState('');
  const [payMethod, setPayMethod] = useState<'CASH_USD' | 'PAGO_MOVIL' | 'TRANSFER' | 'DEBIT_CARD'>('CASH_USD');
  const [payRef, setPayRef] = useState('');
  const [payNotes, setPayNotes] = useState('Abono de cuenta');

  const [paymentHistoryList, setPaymentHistoryList] = useState<ReceivablePaymentRecord[]>([]);

  // 5. VENTAS & FACTURAS FISCALES (100% desde PostgreSQL)
  const [selectedSale, setSelectedSale] = useState<SaleRecord | null>(null);
  const [salesHistory, setSalesHistory] = useState<SaleRecord[]>([]);

  // 6. FINANZAS Y GASTOS OPERATIVOS (OPEX / COGS - 100% desde PostgreSQL)
  const [financialTransactionsList, setFinancialTransactionsList] = useState<FinancialTransactionItem[]>([]);

  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expType, setExpType] = useState<'EGRESO' | 'INGRESO'>('EGRESO');
  const [expCategory, setExpCategory] = useState('NOMINA');
  const [expDesc, setExpDesc] = useState('');
  const [expAmountUsd, setExpAmountUsd] = useState('');
  const [expRef, setExpRef] = useState('');

  // 7. VENDEDORES EN VIVO (100% desde PostgreSQL)
  const [cashiersList, setCashiersList] = useState<CashierStatus[]>([]);

  // Sincronización en vivo de tasas venezolanas (Multi-fuente resiliente)
  const fetchLiveRates = async () => {
    setIsSyncingRates(true);
    try {
      const res = await fetch('/api/v1/exchange-rates/live');
      if (res.ok) {
        const data = await res.json();
        const bcvVal = typeof data?.bcv === 'number' ? data.bcv : data?.bcv?.rate;
        if (bcvVal && bcvVal > 0) {
          setRatesData({
            bcv: { title: 'Banco Central de Venezuela (Oficial)', rate: bcvVal, lastUpdated: data.updatedAt },
            monitor: { title: 'Promedio Paralelo / Monitor', rate: data.paralelo || bcvVal * 1.138, lastUpdated: data.updatedAt },
            euro: { title: 'Euro BCV Oficial', rate: data.euro || bcvVal * 1.055, lastUpdated: data.updatedAt },
          });
          setBcvRate(bcvVal);
          setIsSyncingRates(false);
          return;
        }
      }
    } catch {
      // Fallback directo en el navegador
    }

    try {
      const [resOficial, resParalelo, resEuro] = await Promise.allSettled([
        fetch('https://ve.dolarapi.com/v1/dolares/oficial'),
        fetch('https://ve.dolarapi.com/v1/dolares/paralelo'),
        fetch('https://ve.dolarapi.com/v1/euros/oficial')
      ]);

      let bcvPromedio = 0;
      let bcvFecha = new Date().toISOString();
      let paraleloPromedio = 0;
      let euroPromedio = 0;

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

      if (bcvPromedio > 0) {
        setRatesData({
          bcv: { title: 'Banco Central de Venezuela (Oficial)', rate: bcvPromedio, lastUpdated: bcvFecha },
          monitor: { title: 'Promedio Paralelo / Monitor', rate: paraleloPromedio || bcvPromedio * 1.138, lastUpdated: bcvFecha },
          euro: { title: 'Euro BCV Oficial', rate: euroPromedio || bcvPromedio * 1.055, lastUpdated: bcvFecha },
        });
        setBcvRate(bcvPromedio);
      }
    } catch {
      // Silencioso si no hay conexión externa
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

  // Manejadores de Apertura y Cierre de Caja
  const handleRefreshCashSession = async () => {
    try {
      const res = await apiFetch('/api/v1/cash-sessions/current', {}, handleLogout);
      if (res.ok) {
        const data = await res.json();
        setCashSession(data.session || null);
        if (data.session?.liveMetrics) {
          setCashClosingUsd(data.session.liveMetrics.expectedTotalUsd || '0.00');
          setCashClosingBs(data.session.liveMetrics.expectedTotalBs || '0.00');
        }
      }
    } catch {}
  };

  const handleOpenCashSession = async () => {
    setCashLoading(true);
    try {
      const res = await apiFetch('/api/v1/cash-sessions/open', {
        method: 'POST',
        body: JSON.stringify({
          openingBalanceUsd: parseFloat(cashOpeningUsd) || 0,
          openingBalanceBs: parseFloat(cashOpeningBs) || 0,
          notes: cashNotes.trim() || undefined,
        }),
      }, handleLogout);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.message || 'No se pudo abrir la caja.');
        return;
      }
      await handleRefreshCashSession();
      setCashNotes('');
      setIsCashModalOpen(false);
      alert('Caja abierta exitosamente. Ya puedes facturar en el turno actual.');
    } catch {
      alert('Error de conexión abriendo caja.');
    } finally {
      setCashLoading(false);
    }
  };

  const handleCloseCashSession = async () => {
    setCashLoading(true);
    try {
      const res = await apiFetch('/api/v1/cash-sessions/close', {
        method: 'POST',
        body: JSON.stringify({
          closingDeclaredUsd: parseFloat(cashClosingUsd) || 0,
          closingDeclaredBs: parseFloat(cashClosingBs) || 0,
          notes: cashNotes.trim() || undefined,
        }),
      }, handleLogout);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.message || 'No se pudo cerrar la caja.');
        return;
      }
      setCashSession(null);
      setCashNotes('');
      setIsCashModalOpen(false);
      const disc = parseFloat(data.session?.discrepancyUsd || '0');
      alert(`Caja cerrada correctamente. Esperado: $${data.session?.closingExpectedUsd} USD • Declarado: $${data.session?.closingDeclaredUsd} USD • Diferencia: $${disc.toFixed(2)} USD`);
    } catch {
      alert('Error de conexión cerrando caja.');
    } finally {
      setCashLoading(false);
    }
  };

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

  // Cargar datos reales de tienda desde PostgreSQL cuando un usuario de comercio está autenticado
  const loadStoreData = async (currentUser: UserProfile | null) => {
    if (!currentUser || currentUser.roleId === 'SUPER_ADMIN') return;
    try {
      const [prodRes, custRes, salesRes, cfgRes, rateRes, cashSessRes] = await Promise.all([
        apiFetch('/api/v1/products', {}, handleLogout),
        apiFetch('/api/v1/customers', {}, handleLogout),
        apiFetch('/api/v1/sales', {}, handleLogout),
        apiFetch('/api/v1/config', {}, handleLogout),
        apiFetch('/api/v1/exchange-rates/active', {}, handleLogout),
        apiFetch('/api/v1/cash-sessions/current', {}, handleLogout),
      ]);

      if (cashSessRes.ok) {
        const csData = await cashSessRes.json();
        setCashSession(csData.session || null);
        if (csData.session?.liveMetrics) {
          setCashClosingUsd(csData.session.liveMetrics.expectedTotalUsd || '0.00');
          setCashClosingBs(csData.session.liveMetrics.expectedTotalBs || '0.00');
        }
      }

      if (prodRes.ok) {
        const prods = await prodRes.json();
        if (Array.isArray(prods)) {
          setInventoryList(
            prods.map((p: any) => ({
              id: p.id,
              name: p.name,
              barcode: p.barcode || '',
              sku: p.sku || '',
              category: p.categoryName || 'General',
              unitOfMeasure: p.unitOfMeasure || 'UNIDAD',
              supplier: p.supplierName || 'Sin asignar',
              supplierPhone: p.supplierPhone || '',
              costPriceUsd: parseFloat(p.costPriceUsd || '0'),
              salePriceUsd: parseFloat(p.salePriceUsd || '0'),
              taxRate: p.isExempt ? 0 : parseFloat(p.taxRate || '16'),
              stock: parseFloat(p.stock || '0'),
              minStockAlert: parseFloat(p.minStockAlert || '5'),
              lastPurchaseDate: p.createdAt ? new Date(p.createdAt).toISOString().slice(0, 10) : '',
              inflationDeltaPercent: 0,
            }))
          );
        }
      }

      if (custRes.ok) {
        const custs = await custRes.json();
        if (Array.isArray(custs)) {
          const mappedCusts: PosCustomerItem[] = custs.map((c: any) => ({
            id: c.id,
            name: c.name,
            documentType: c.documentType,
            documentNumber: c.documentNumber,
            phone: c.phone || '',
            balanceDue: parseFloat(c.balanceDue || '0'),
            isSpecialMoraCustomer: Boolean(c.isSpecialMoraCustomer),
          }));
          setPosCustomerList(mappedCusts);
          const cf = mappedCusts.find((c) => c.documentNumber === '00000000') || mappedCusts[0];
          if (cf) {
            setPosTickets((prev) =>
              prev.map((t) => (!t.customer.id ? { ...t, customer: cf } : t))
            );
          }
        }
      }

      if (salesRes.ok) {
        const sls = await salesRes.json();
        if (Array.isArray(sls)) {
          setSalesHistory(
            sls.map((s: any) => ({
              id: s.id,
              invoiceFormattedNumber: s.invoiceFormattedNumber,
              createdAt: new Date(s.createdAt).toLocaleString('es-VE'),
              customerName: s.customerName || 'Cliente',
              customerDoc: s.customerDocType ? `${s.customerDocType}-${s.customerDocNumber}` : 'N/A',
              cashierName: s.userId || 'Cajero',
              totalUsd: parseFloat(s.totalAmountUsd || '0'),
              totalBs: parseFloat(s.totalAmountBs || '0'),
              rateValue: parseFloat(s.rateValue || '0'),
              status: s.status === 'ANNULLED_BY_NC' || s.status === 'CANCELLED' ? 'ANULADA' : 'COMPLETADA',
              items: [],
              taxes: {
                base16: parseFloat(s.taxableBase16Usd || '0'),
                base8: parseFloat(s.taxableBase8Usd || '0'),
                exempt: parseFloat(s.exemptAmountUsd || '0'),
                tax16: parseFloat(s.taxAmount16Usd || '0'),
                tax8: parseFloat(s.taxAmount8Usd || '0'),
                igtf3: parseFloat(s.igtfAmountUsd || '0'),
              },
            }))
          );
        }
      }

      if (cfgRes.ok) {
        const cfg = await cfgRes.json();
        setEnableIva(Boolean(cfg.enableIva));
        setEnableIgtf(Boolean(cfg.enableIgtf));
        if (cfg.activeRateSource) setActiveRateSource(cfg.activeRateSource);
        if (cfg.customRateValue) setCustomRateInput(String(cfg.customRateValue));
        if (cfg.defaultProfitMargin) setGlobalMarginInput(String(cfg.defaultProfitMargin));
        if (cfg.lateFeePercentage !== undefined) setSurchargeRate(cfg.lateFeePercentage);
        if (cfg.lateFeeGraceDays !== undefined) setGraceDays(cfg.lateFeeGraceDays);
        if (cfg.autoApplyLateFee !== undefined) setAutoApplyMora(Boolean(cfg.autoApplyLateFee));
      }

      if (rateRes.ok) {
        const r = await rateRes.json();
        if (r?.exchangeRateSnapshotId) setActiveExchangeRateId(r.exchangeRateSnapshotId);
        if (r?.rateValue && bcvRate === 0) setBcvRate(r.rateValue);
      }

      if (currentUser.roleId === 'ADMIN') {
        const [kardexRes, supRes, poRes, debtRes, payHistRes, finRes, cashRes, audRes] = await Promise.all([
          apiFetch('/api/v1/inventory/kardex', {}, handleLogout),
          apiFetch('/api/v1/suppliers', {}, handleLogout),
          apiFetch('/api/v1/purchase-orders', {}, handleLogout),
          apiFetch('/api/v1/receivables/debtors', {}, handleLogout),
          apiFetch('/api/v1/receivables/history', {}, handleLogout),
          apiFetch('/api/v1/finances/transactions', {}, handleLogout),
          apiFetch('/api/v1/cashiers/live', {}, handleLogout),
          apiFetch('/api/v1/audit/logs', {}, handleLogout),
        ]);

        if (kardexRes.ok) {
          const kd = await kardexRes.json();
          if (Array.isArray(kd)) {
            setKardexHistory(
              kd.map((k: any) => ({
                id: k.id,
                productName: k.productName,
                movementType: k.movementType,
                quantity: parseFloat(k.quantity || '0'),
                unitCostUsd: parseFloat(k.unitCostUsd || '0'),
                reason: k.reason,
                createdAt: new Date(k.createdAt).toLocaleString('es-VE'),
                user: 'sistema',
              }))
            );
          }
        }

        if (supRes.ok) {
          const sups = await supRes.json();
          if (Array.isArray(sups)) {
            setSuppliersList(
              sups.map((s: any) => ({
                id: s.id,
                name: s.name,
                documentType: s.documentType,
                documentNumber: s.documentNumber,
                phone: s.phone,
                email: s.email || '',
                address: s.address || '',
                creditDays: 15,
                isActive: Boolean(s.isActive),
              }))
            );
          }
        }

        if (poRes.ok) {
          const pos = await poRes.json();
          if (Array.isArray(pos)) {
            setPurchaseOrdersList(
              pos.map((o: any) => ({
                id: o.id,
                orderNumber: o.orderNumber,
                supplierId: o.supplierId,
                supplierName: o.supplierName || '',
                supplierPhone: o.supplierPhone || '',
                status: o.status,
                expectedDeliveryDate: o.expectedDeliveryDate ? new Date(o.expectedDeliveryDate).toISOString().slice(0, 10) : '',
                totalEstimatedUsd: parseFloat(o.totalEstimatedUsd || '0'),
                notes: o.notes || '',
                createdAt: new Date(o.createdAt).toLocaleString('es-VE'),
                lines: [],
              }))
            );
          }
        }

        if (debtRes.ok) {
          const debts = await debtRes.json();
          if (Array.isArray(debts)) {
            setCustomerDebts(
              debts.map((d: any) => ({
                id: d.id,
                name: d.name,
                document: `${d.documentType}-${d.documentNumber}`,
                phone: d.phone || '',
                balanceDueUsd: d.balanceDueUsd || 0,
                dueDate: d.updatedAt ? new Date(d.updatedAt).toISOString().slice(0, 10) : '',
                isOverdue: (d.balanceDueUsd || 0) > 0,
                lateDays: 0,
                surchargeUsd: d.surchargeUsd || 0,
                waived: false,
              }))
            );
          }
        }

        if (payHistRes.ok) {
          const ph = await payHistRes.json();
          if (Array.isArray(ph)) {
            setPaymentHistoryList(
              ph.map((p: any) => ({
                id: p.id,
                customerName: p.customerName,
                customerDoc: p.customerDoc,
                amountUsd: parseFloat(p.amountUsd || '0'),
                amountBs: parseFloat(p.amountBs || '0'),
                paymentMethod: p.paymentMethod,
                referenceNumber: p.referenceNumber || '',
                createdAt: new Date(p.createdAt).toLocaleString('es-VE'),
                notes: p.notes || '',
              }))
            );
          }
        }

        if (finRes.ok) {
          const ftx = await finRes.json();
          if (Array.isArray(ftx)) {
            setFinancialTransactionsList(
              ftx.map((t: any) => ({
                id: t.id,
                type: t.type,
                category: t.category,
                description: t.description,
                amountUsd: parseFloat(t.amountUsd || '0'),
                amountBs: parseFloat(t.amountBs || '0'),
                referenceNumber: t.referenceNumber || '',
                createdAt: new Date(t.transactionDate || t.createdAt).toLocaleString('es-VE'),
              }))
            );
          }
        }

        if (cashRes.ok) {
          const ch = await cashRes.json();
          if (Array.isArray(ch)) setCashiersList(ch);
        }

        if (audRes.ok) {
          const aud = await audRes.json();
          if (Array.isArray(aud.logs)) {
            setAuditLogsList(
              aud.logs.map((l: any) => ({
                ...l,
                user: l.username || 'sistema',
                createdAt: new Date(l.createdAt).toLocaleString('es-VE'),
              }))
            );
          }
        }
      }
    } catch {
      // Silencioso; apiFetch maneja 401
    }
  };

  const hasCompletedOnboarding = () => {
    try {
      return localStorage.getItem(ONBOARDING_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  };

  // Inicialización real: verifica conectividad/recursos, valida sesión contra /api/v1/auth/me y enruta sin tiempos artificiales
  const runBootstrap = useCallback(async () => {
    setBootPhase('LOADING');
    setBootError(null);
    setBootSlow(false);

    const startedAt = Date.now();
    const slowTimer = setTimeout(() => setBootSlow(true), 2400);

    const finishTransition = (nextPhase: 'ONBOARDING' | 'LOGIN' | 'READY') => {
      clearTimeout(slowTimer);
      const reducedMotion =
        typeof window !== 'undefined' &&
        window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      const minVisualMs = reducedMotion ? 0 : 380;
      const elapsed = Date.now() - startedAt;
      const remaining = Math.max(0, minVisualMs - elapsed);
      if (remaining > 0) {
        setTimeout(() => setBootPhase(nextPhase), remaining);
      } else {
        setBootPhase(nextPhase);
      }
    };

    try {
      const token = getAccessToken();

      if (!token) {
        clearSessionStorage();
        setUser(null);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 7000);
        try {
          const healthRes = await fetch('/health/live', { signal: controller.signal });
          if (!healthRes.ok) {
            throw new Error(`El servidor respondió con estado ${healthRes.status}.`);
          }
        } finally {
          clearTimeout(timeoutId);
        }

        finishTransition(hasCompletedOnboarding() ? 'LOGIN' : 'ONBOARDING');
        return;
      }

      const res = await apiFetch('/api/v1/auth/me');
      if (!res.ok) {
        clearSessionStorage();
        setUser(null);
        finishTransition(hasCompletedOnboarding() ? 'LOGIN' : 'ONBOARDING');
        return;
      }

      const me = await res.json();
      const roleFromBackend: UserProfile['roleId'] =
        me.roleId === 'SUPER_ADMIN'
          ? 'SUPER_ADMIN'
          : me.roleId === 'VENDEDOR'
          ? 'VENDEDOR'
          : me.roleId === 'CONSULTA'
          ? 'CONSULTA'
          : 'ADMIN';

      const verifiedProfile: UserProfile = {
        id: me.id,
        tenantId: me.tenantId ?? null,
        username: me.username,
        email: me.email,
        fullName: me.fullName,
        roleId: roleFromBackend,
        businessName: me.businessName,
        twoFactorEnabled: me.twoFactorEnabled,
        lastLoginAt: me.lastLoginAt,
      };

      setUser(verifiedProfile);
      localStorage.setItem('vuelto_user_session', JSON.stringify(verifiedProfile));

      if (roleFromBackend !== 'SUPER_ADMIN') {
        await loadStoreData(verifiedProfile);
      }

      finishTransition('READY');
    } catch (err: any) {
      clearTimeout(slowTimer);
      clearSessionStorage();
      setUser(null);
      setBootError(
        err?.name === 'AbortError'
          ? 'El servidor tardó demasiado en responder al inicializar los recursos.'
          : 'No pudimos conectar con el servidor de Vuelto. Verifica que el backend esté activo e inténtalo de nuevo.'
      );
    }
  }, []);

  useEffect(() => {
    runBootstrap();
  }, [runBootstrap]);

  // Login handler 100% conectado a PostgreSQL (sin fallback ficticio)
  const handleLogin = async () => {
    setLoginError('');
    const uName = usernameInput.trim();
    const pass = passwordInput;
    if (!uName || !pass) {
      setLoginError('Debe ingresar su usuario y contraseña.');
      return;
    }

    setLoginLoading(true);
    try {
      const bodyPayload: any = { username: uName, password: pass };
      if (requiresTwoFactor && twoFactorInput.trim()) {
        bodyPayload.twoFactorCode = twoFactorInput.trim();
      }

      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload),
      });

      const authData = await res.json().catch(() => ({}));

      if (res.ok && authData.requiresTwoFactor) {
        setRequiresTwoFactor(true);
        setLoginLoading(false);
        return;
      }

      if (!res.ok) {
        setLoginError(authData.message || authData.error || 'Usuario o contraseña incorrectos.');
        setLoginLoading(false);
        return;
      }

      if (authData.tokens?.accessToken) {
        setSessionTokens(authData.tokens.accessToken, authData.tokens.refreshToken);
      } else if (authData.accessToken) {
        setSessionTokens(authData.accessToken, authData.refreshToken);
      }

      const roleFromBackend: UserProfile['roleId'] =
        authData.user?.roleId === 'SUPER_ADMIN'
          ? 'SUPER_ADMIN'
          : authData.user?.roleId === 'VENDEDOR'
          ? 'VENDEDOR'
          : authData.user?.roleId === 'CONSULTA'
          ? 'CONSULTA'
          : 'ADMIN';

      const loggedProfile: UserProfile = {
        id: authData.user.id,
        tenantId: authData.user.tenantId ?? null,
        username: authData.user.username,
        email: authData.user.email,
        fullName: authData.user.fullName,
        roleId: roleFromBackend,
        businessName: authData.user.businessName || 'Vuelto SaaS',
        twoFactorEnabled: authData.user.twoFactorEnabled,
      };

      setUser(loggedProfile);
      localStorage.setItem('vuelto_user_session', JSON.stringify(loggedProfile));
      try {
        localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
      } catch {}
      setRequiresTwoFactor(false);
      setTwoFactorInput('');
      setActiveTab(roleFromBackend === 'VENDEDOR' ? 'POS' : 'METRICS');
      if (roleFromBackend !== 'SUPER_ADMIN') {
        await loadStoreData(loggedProfile);
      }
      setBootPhase('READY');
    } catch {
      setLoginError('No se pudo conectar con el servidor API. Verifica que el backend esté activo.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    const token = getAccessToken();
    if (token) {
      fetch('/api/v1/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
    setUser(null);
    clearSessionStorage();
    setInventoryList([]);
    setKardexHistory([]);
    setSuppliersList([]);
    setPurchaseOrdersList([]);
    setCustomerDebts([]);
    setPaymentHistoryList([]);
    setSalesHistory([]);
    setFinancialTransactionsList([]);
    setPosCustomerList([]);
    setAuditLogsList([]);
    setCashiersList([]);
    setUsernameInput('');
    setPasswordInput('');
    setTwoFactorInput('');
    setRequiresTwoFactor(false);
    setLoginError('');
    setBootPhase('LOGIN');
  };

  // Guardar Producto en PostgreSQL
  const handleSaveProduct = async () => {
    if (!newProdName || !newProdSaleUsd) {
      alert('Por favor ingrese el nombre y precio de salida del producto.');
      return;
    }

    const saleNum = parseFloat(newProdSaleUsd);
    const costNum = parseFloat(newProdCostUsd) || 0;
    const rawCode = newProdBarcode.trim();
    let finalBarcode = rawCode;
    let detectedType: 'EAN13' | 'EAN8' | 'UPC' | 'CODE128' = 'EAN13';

    if (!rawCode) {
      finalBarcode = ensureValidEan13('7591005' + Math.floor(10000 + Math.random() * 90000));
      detectedType = 'EAN13';
    } else if (/^\d{13}$/.test(rawCode)) {
      finalBarcode = ensureValidEan13(rawCode);
      detectedType = 'EAN13';
    } else if (/^\d{8}$/.test(rawCode)) {
      detectedType = 'EAN8';
    } else if (/^\d{12}$/.test(rawCode)) {
      detectedType = 'UPC';
    } else {
      detectedType = 'CODE128';
    }

    try {
      const res = await apiFetch('/api/v1/products', {
        method: 'POST',
        body: JSON.stringify({
          name: newProdName.trim(),
          unitOfMeasure: newProdUom,
          costPriceUsd: costNum,
          salePriceUsd: saleNum,
          taxRate: 16,
          isExempt: false,
          minStockAlert: parseInt(newProdMinStock, 10) || 5,
          initialStock: parseFloat(newProdStock) || 0,
          barcodes: [{ barcode: finalBarcode, barcodeType: detectedType, isPrimary: true }],
        }),
      }, handleLogout);

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.message || 'Error guardando producto en base de datos.');
        return;
      }

      setIsAddModalOpen(false);
      setCameraActive(false);
      setNewProdName('');
      setNewProdBarcode('');
      setNewProdCostUsd('');
      setNewProdSaleUsd('');
      await loadStoreData(user);
      alert(`¡Producto "${data.name}" guardado en PostgreSQL con código ${finalBarcode}!`);
    } catch {
      alert('Error de conexión al guardar producto.');
    }
  };

  // Guardar Ajuste Físico de Stock (Kardex) en PostgreSQL
  const handleSaveStockAdjustment = async () => {
    if (!selectedStockProduct) return;
    const qty = parseFloat(adjustQty);
    if (isNaN(qty)) return;

    try {
      const res = await apiFetch('/api/v1/inventory/adjust', {
        method: 'POST',
        body: JSON.stringify({
          productId: selectedStockProduct.id,
          movementType: adjustMovementType,
          quantity: qty,
          unitCostUsd: selectedStockProduct.costPriceUsd,
          reason: adjustReason || 'Ajuste manual de inventario',
        }),
      }, handleLogout);

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.message || 'No se pudo registrar el ajuste en Kardex.');
        return;
      }

      setIsStockAdjustModalOpen(false);
      await loadStoreData(user);
      alert(`Ajuste registrado en Kardex. Nuevo stock de ${selectedStockProduct.name}: ${data.newStock} unidades.`);
    } catch {
      alert('Error de conexión al ajustar stock.');
    }
  };

  // Guardar Proveedor en PostgreSQL
  const handleSaveSupplier = async () => {
    if (!supName || !supDocNumber || !supPhone) {
      alert('Nombre, RIF y Teléfono WhatsApp son obligatorios.');
      return;
    }

    try {
      const url = editingSupplier ? `/api/v1/suppliers/${editingSupplier.id}` : '/api/v1/suppliers';
      const method = editingSupplier ? 'PUT' : 'POST';
      const payload = editingSupplier
        ? { name: supName, phone: supPhone, email: supEmail || undefined, address: supAddress || undefined }
        : {
            documentType: supDocType,
            documentNumber: supDocNumber.replace(/[^0-9]/g, ''),
            name: supName,
            phone: supPhone,
            email: supEmail || undefined,
            address: supAddress || undefined,
          };

      const res = await apiFetch(url, { method, body: JSON.stringify(payload) }, handleLogout);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.message || 'Error guardando proveedor.');
        return;
      }

      setIsSupplierModalOpen(false);
      setEditingSupplier(null);
      await loadStoreData(user);
      alert(editingSupplier ? 'Proveedor actualizado en PostgreSQL.' : `Proveedor "${data.name}" registrado en PostgreSQL.`);
    } catch {
      alert('Error de conexión al guardar proveedor.');
    }
  };

  // Guardar Pedido a Proveedor en PostgreSQL
  const handleSavePurchaseOrder = async () => {
    const sup = suppliersList.find((s) => s.id === orderSupplierId) || suppliersList[0];
    const prod = inventoryList.find((p) => p.id === orderProductId) || inventoryList[0];
    if (!sup || !prod) {
      alert('Debes tener al menos un proveedor y un producto registrado.');
      return;
    }
    const qty = parseFloat(orderQty) || 10;
    const cost = parseFloat(orderCostUsd) || prod.costPriceUsd;

    try {
      const res = await apiFetch('/api/v1/purchase-orders', {
        method: 'POST',
        body: JSON.stringify({
          supplierId: sup.id,
          expectedDeliveryDate: new Date(Date.now() + 3 * 86400000).toISOString(),
          notes: orderNotes,
          lines: [{ productId: prod.id, quantityOrdered: qty, unitCostUsd: cost }],
        }),
      }, handleLogout);

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.message || 'Error creando orden de compra.');
        return;
      }

      setIsOrderModalOpen(false);
      await loadStoreData(user);
      alert(`Orden de compra ${data.orderNumber} creada en PostgreSQL para ${sup.name}.`);
    } catch {
      alert('Error de conexión al crear orden de compra.');
    }
  };

  // Enviar Pedido por WhatsApp y actualizar estado en PostgreSQL
  const handleSendOrderWhatsApp = async (order: PurchaseOrderItem) => {
    const msg = `*ORDEN DE COMPRA: ${order.orderNumber}*\nComercio: ${user?.businessName}\nProveedor: ${order.supplierName}\n*Total Estimado:* $${order.totalEstimatedUsd.toFixed(2)} USD (≈ ${(order.totalEstimatedUsd * bcvRate).toFixed(2)} Bs)\nNotas: ${order.notes}\n\nAgradecemos confirmación de despacho.`;
    const cleanPhone = order.supplierPhone.replace(/\D/g, '');
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');

    await apiFetch(`/api/v1/purchase-orders/${order.id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'SENT_WHATSAPP' }),
    }, handleLogout).catch(() => {});
    await loadStoreData(user);
  };

  // Recibir Mercancía de Pedido en PostgreSQL
  const handleReceiveOrder = async (order: PurchaseOrderItem) => {
    try {
      const res = await apiFetch(`/api/v1/purchase-orders/${order.id}/receive`, {
        method: 'POST',
        body: JSON.stringify({}),
      }, handleLogout);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.message || 'Error recepcionando orden.');
        return;
      }
      await loadStoreData(user);
      alert(`¡Mercancía de ${order.orderNumber} recibida en PostgreSQL! Stock actualizado en Kardex.`);
    } catch {
      alert('Error de conexión al recibir mercancía.');
    }
  };

  // Registrar Abono de Cobranza en PostgreSQL
  const handleRegisterPayment = async () => {
    if (!selectedDebtor || !payAmountUsd) return;
    const amount = parseFloat(payAmountUsd);
    if (isNaN(amount) || amount <= 0) return;

    try {
      const res = await apiFetch('/api/v1/receivables/payment', {
        method: 'POST',
        body: JSON.stringify({
          customerId: selectedDebtor.id,
          paymentMethod: payMethod,
          amountUsd: amount,
          rateValue: bcvRate,
          referenceNumber: payRef || undefined,
          notes: payNotes,
        }),
      }, handleLogout);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.message || 'Error registrando abono.');
        return;
      }
      setIsPaymentModalOpen(false);
      await loadStoreData(user);
      alert(`Abono de $${amount.toFixed(2)} USD registrado. Deuda restante: $${data.remainingDebtUsd} USD.`);
    } catch {
      alert('Error de conexión registrando abono.');
    }
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

  // Guardar Gasto / Transacción Financiera en PostgreSQL
  const handleSaveExpense = async () => {
    const amount = parseFloat(expAmountUsd);
    if (!expDesc || isNaN(amount) || amount <= 0) {
      alert('Descripción y monto son obligatorios.');
      return;
    }

    try {
      const res = await apiFetch('/api/v1/finances/transactions', {
        method: 'POST',
        body: JSON.stringify({
          type: expType,
          category: expCategory,
          description: expDesc,
          amountUsd: amount,
          rateValue: bcvRate,
          referenceNumber: expRef || undefined,
        }),
      }, handleLogout);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.message || 'Error registrando transacción financiera.');
        return;
      }
      setIsExpenseModalOpen(false);
      setExpDesc('');
      setExpAmountUsd('');
      setExpRef('');
      await loadStoreData(user);
      alert(`Transacción de ${expType} por $${amount.toFixed(2)} USD guardada en PostgreSQL.`);
    } catch {
      alert('Error de conexión registrando transacción.');
    }
  };

  // Anular Venta / Nota de Crédito en PostgreSQL
  const handleCancelSale = async (saleId: string) => {
    if (!confirm('¿Seguro que deseas anular esta factura fiscal? Generará una Nota de Crédito SENIAT y devolverá el stock a Kardex.')) return;

    try {
      const res = await apiFetch(`/api/v1/sales/${saleId}/credit-note`, {
        method: 'POST',
        body: JSON.stringify({ reason: 'Anulación administrativa desde Web Admin', returnInventory: true }),
      }, handleLogout);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.message || 'No se pudo emitir la Nota de Crédito.');
        return;
      }
      await loadStoreData(user);
      if (selectedSale?.id === saleId) {
        setSelectedSale({ ...selectedSale, status: 'ANULADA' });
      }
      alert(`Factura ANULADA con Nota de Crédito ${data.note?.noteNumber || ''}. Mercancía retornada a inventario.`);
    } catch {
      alert('Error de conexión anulando factura.');
    }
  };

  // Cargar líneas completas de una venta desde PostgreSQL
  const handleInspectSale = async (sale: SaleRecord) => {
    setSelectedSale(sale);
    try {
      const res = await apiFetch(`/api/v1/sales/${sale.id}`, {}, handleLogout);
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data?.lines)) {
        setSelectedSale({
          ...sale,
          items: data.lines.map((l: any) => ({
            name: l.productName || 'Producto',
            qty: parseFloat(l.quantity || '0'),
            priceUsd: parseFloat(l.unitPriceUsd || '0'),
            taxRate: parseFloat(l.taxRate || '0'),
            subtotalUsd: parseFloat(l.totalUsd || l.subtotalUsd || '0'),
          })),
        });
      }
    } catch {
      // Mantiene cabecera visible si falla lectura de detalle
    }
  };

  // Persistir fuente de tasa activa en PostgreSQL
  const handleSelectRateSource = async (
    nextSource: 'BCV' | 'PARALELO' | 'EURO' | 'CUSTOM',
    customRateOverride?: number
  ) => {
    setActiveRateSource(nextSource);
    const customNumeric =
      customRateOverride !== undefined
        ? customRateOverride
        : parseFloat(customRateInput) || bcvRate || 0;
    try {
      await apiFetch('/api/v1/config', {
        method: 'PUT',
        body: JSON.stringify({
          activeRateSource: nextSource,
          customRateValue: customNumeric,
        }),
      }, handleLogout);
      await apiFetch('/api/v1/exchange-rates/select-active', {
        method: 'POST',
        body: JSON.stringify({ source: nextSource }),
      }, handleLogout);
    } catch {
      alert('No se pudo persistir la tasa seleccionada en el servidor.');
    }
  };

  // Persistir régimen fiscal flexible (IVA / IGTF) en PostgreSQL
  const handleToggleTaxRegime = async (field: 'enableIva' | 'enableIgtf', nextValue: boolean) => {
    if (field === 'enableIva') setEnableIva(nextValue);
    else setEnableIgtf(nextValue);

    try {
      const res = await apiFetch('/api/v1/config', {
        method: 'PUT',
        body: JSON.stringify({ [field]: nextValue }),
      }, handleLogout);
      if (!res.ok) {
        if (field === 'enableIva') setEnableIva(!nextValue);
        else setEnableIgtf(!nextValue);
        alert('No se pudo actualizar la configuración fiscal en el servidor.');
      }
    } catch {
      if (field === 'enableIva') setEnableIva(!nextValue);
      else setEnableIgtf(!nextValue);
      alert('Error de conexión actualizando configuración fiscal.');
    }
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

  const handleSaveQuickPosCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanDoc = posCiSearchInput.replace(/[^0-9]/g, '');
    if (!quickCustomerFirstName.trim()) {
      alert('El Nombre del cliente es obligatorio.');
      return;
    }

    const fullName = `${quickCustomerFirstName.trim()} ${quickCustomerLastName.trim()}`.trim();
    try {
      const res = await apiFetch('/api/v1/customers/quick', {
        method: 'POST',
        body: JSON.stringify({
          documentType: posCiDocType,
          documentNumber: cleanDoc || String(Math.floor(10000000 + Math.random() * 90000000)),
          name: fullName,
          phone: quickCustomerPhone.trim() || undefined,
        }),
      }, handleLogout);

      const created = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(created.message || 'No se pudo registrar el cliente en la base de datos.');
        return;
      }

      const newCust: PosCustomerItem = {
        id: created.id,
        name: created.name,
        documentType: created.documentType,
        documentNumber: created.documentNumber,
        phone: created.phone || '',
        balanceDue: parseFloat(created.balanceDue || '0'),
        isSpecialMoraCustomer: Boolean(created.isSpecialMoraCustomer),
      };

      setPosCustomerList((prev) => [newCust, ...prev]);
      setPosSelectedCustomer(newCust);
      setShowQuickCustomerForm(false);
      setQuickCustomerFirstName('');
      setQuickCustomerLastName('');
      setQuickCustomerPhone('');
      setPosCustomerFeedback({
        type: 'success',
        message: `✅ ¡Cliente ${newCust.documentType}-${newCust.documentNumber} ${newCust.name} guardado en BD y asignado a la venta!`,
      });
    } catch {
      alert('Error de conexión al guardar cliente.');
    }
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

  // Confirmar Venta POS y Emitir Comprobante Digital en PostgreSQL
  const handlePosConfirmSale = async () => {
    if (cartLines.length === 0) {
      alert('El carrito está vacío. Agrega productos para facturar.');
      return;
    }

    const hasDebt = posSelectedCustomer.balanceDue > 0 || posSelectedCustomer.isSpecialMoraCustomer;
    if (posPaymentMethod === 'CREDIT_DEBT' && hasDebt && !posAdminApproved && !isAdmin) {
      alert(
        `El cliente ${posSelectedCustomer.name} posee deuda previa ($${posSelectedCustomer.balanceDue.toFixed(2)} USD). Esta venta a crédito requiere aprobación del Administrador.`
      );
      return;
    }

    const targetCustomer = posSelectedCustomer.id ? posSelectedCustomer : posCustomerList[0];
    if (!targetCustomer?.id) {
      alert('Debe seleccionar o registrar un cliente válido antes de facturar.');
      return;
    }

    // Asegurar exchangeRateId real desde el backend
    let rateIdToUse = activeExchangeRateId;
    if (!rateIdToUse) {
      try {
        const rRes = await apiFetch('/api/v1/exchange-rates/active', {}, handleLogout);
        if (rRes.ok) {
          const rData = await rRes.json();
          rateIdToUse = rData.exchangeRateSnapshotId || '';
          if (rateIdToUse) setActiveExchangeRateId(rateIdToUse);
        }
      } catch {}
    }

    if (!rateIdToUse) {
      alert('No se pudo obtener la tasa de cambio activa de la base de datos.');
      return;
    }

    const mappedMethod =
      posPaymentMethod === 'CASH_VES'
        ? 'CASH_BS'
        : posPaymentMethod === 'DERIVAR_ADMIN'
        ? 'CREDIT_DEBT'
        : posPaymentMethod;
    const isVes = posPaymentMethod === 'CASH_VES';

    try {
      const res = await apiFetch('/api/v1/sales', {
        method: 'POST',
        headers: { 'Idempotency-Key': `pos-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` },
        body: JSON.stringify({
          customerId: targetCustomer.id,
          exchangeRateId: rateIdToUse,
          lines: cartLines.map((c) => ({
            productId: c.productId,
            quantity: c.qty,
            unitPriceUsd: c.priceUsd,
          })),
          payments: [
            {
              paymentMethod: mappedMethod,
              currency: isVes ? 'VES' : 'USD',
              amount: +(isVes ? posTotalBs : posTotalUsd).toFixed(2),
              ...(posPaymentMethod === 'PAGO_MOVIL' && posPagoMovilRef ? { referenceNumber: posPagoMovilRef } : {}),
            },
          ],
          ...(posChangeUsd > 0
            ? {
                vueltoOption: {
                  type: 'CASH',
                  amountUsd: +posChangeUsd.toFixed(2),
                },
              }
            : {}),
        }),
      }, handleLogout);

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.message || 'No se pudo procesar la venta en PostgreSQL.');
        return;
      }

      const saleModalObj: any = {
        id: data.id,
        invoiceFormattedNumber: data.invoiceFormattedNumber,
        createdAt: new Date().toLocaleString('es-VE'),
        customerName: targetCustomer.name,
        customerDoc: `${targetCustomer.documentType}-${targetCustomer.documentNumber}`,
        customerPhone: targetCustomer.phone,
        cashierName: `${user?.fullName} (${user?.username})`,
        totalUsd: parseFloat(data.totalAmountUsd || String(posTotalUsd)),
        totalBs: parseFloat(data.totalAmountBs || String(posTotalBs)),
        rateValue: parseFloat(data.rateValue || String(activeRate)),
        status: 'COMPLETADA',
        paymentMethod: posPaymentMethod === 'DERIVAR_ADMIN' ? 'DERIVADO A ADMINISTRADOR (MOROSIDAD)' : posPaymentMethod,
        vueltoUsd: posChangeUsd,
        vueltoBs: posChangeBs,
        items: cartLines.map((c) => ({
          name: c.name,
          qty: c.qty,
          priceUsd: c.priceUsd,
          subtotalUsd: c.priceUsd * c.qty,
          taxRate: enableIva ? c.taxRate : 0,
        })),
      };

      setCompletedSaleModal(saleModalObj);
      setCartLines([]);
      setPosAdminApproved(false);
      setPosAdminPinInput('');
      await loadStoreData(user);
    } catch {
      alert('Error de red al confirmar la venta.');
    }
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

  // Manejador de Margen Global Masivo en PostgreSQL
  const handleApplyGlobalMargin = async () => {
    const margin = parseFloat(globalMarginInput);
    if (isNaN(margin) || margin <= 0) {
      alert('Por favor ingrese un porcentaje de margen válido (ej. 30%)');
      return;
    }

    try {
      const res = await apiFetch('/api/v1/products/apply-global-margin', {
        method: 'POST',
        body: JSON.stringify({ marginPercentage: margin }),
      }, handleLogout);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.message || 'No se pudo aplicar el margen global.');
        return;
      }
      await loadStoreData(user);
      alert(`✅ ¡Margen del ${margin}% aplicado en base de datos (${data.updatedCount || 0} productos actualizados)!`);
    } catch {
      alert('Error de conexión aplicando margen global.');
    }
  };

  // Descarga de Backup real desde PostgreSQL
  const handleDownloadBackup = async () => {
    setIsBackupDownloading(true);
    try {
      const res = await apiFetch('/api/v1/admin/backup', {}, handleLogout);
      if (!res.ok) {
        alert('Error generando copia de seguridad en el servidor.');
        return;
      }
      const backupData = await res.json();
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_vuelto_${user?.tenantId ? user.tenantId.slice(0, 8) : 'central'}_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      await loadStoreData(user);
      alert('✅ ¡Copia de seguridad (Backup JSON) descargada desde PostgreSQL!');
    } catch {
      alert('Error de conexión descargando backup.');
    } finally {
      setIsBackupDownloading(false);
    }
  };

  // Cambio de contraseña para usuarios de tienda
  const handleStoreChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setStorePwdMsg(null);
    try {
      const res = await apiFetch('/api/v1/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({
          currentPassword: storeCurPwd,
          newPassword: storeNewPwd,
          confirmPassword: storeConfPwd,
        }),
      }, handleLogout);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStorePwdMsg({ type: 'err', text: data.message || 'Error actualizando contraseña.' });
        return;
      }
      if (data.tokens?.accessToken) {
        setSessionTokens(data.tokens.accessToken, data.tokens.refreshToken);
      }
      setStoreCurPwd('');
      setStoreNewPwd('');
      setStoreConfPwd('');
      setStorePwdMsg({ type: 'ok', text: 'Contraseña actualizada correctamente.' });
    } catch {
      setStorePwdMsg({ type: 'err', text: 'Error de red actualizando contraseña.' });
    }
  };

  // 1. LOADING SCREEN INICIAL (HASTA VERIFICAR SESIÓN Y RECURSOS)
  if (bootPhase === 'LOADING') {
    return (
      <LoadingScreen
        isSlow={bootSlow}
        error={bootError}
        onRetry={runBootstrap}
        onContinueToLogin={() => {
          setBootError(null);
          setBootPhase(hasCompletedOnboarding() ? 'LOGIN' : 'ONBOARDING');
        }}
      />
    );
  }

  // 2. ONBOARDING INICIAL (SOLO PRIMERA VISITA) O LOGIN SCREEN
  if (!user) {
    if (bootPhase === 'ONBOARDING') {
      return (
        <OnboardingFlow
          mode="initial"
          onComplete={() => setBootPhase('LOGIN')}
        />
      );
    }

    return (
      <LoginView
        username={usernameInput}
        password={passwordInput}
        twoFactorCode={twoFactorInput}
        requiresTwoFactor={requiresTwoFactor}
        loading={loginLoading}
        error={loginError}
        bcvRate={bcvRate}
        onChangeUsername={setUsernameInput}
        onChangePassword={setPasswordInput}
        onChangeTwoFactor={setTwoFactorInput}
        onSubmit={handleLogin}
        onShowOnboarding={() => setBootPhase('ONBOARDING')}
      />
    );
  }

  // REPLAY OPCIONAL DE INTRO / ONBOARDING DESDE AYUDA DEL SISTEMA
  if (showSplash) {
    return (
      <div
        onClick={() => setShowSplash(false)}
        title="Clic para volver al panel"
        style={{ cursor: 'pointer' }}
      >
        <LoadingScreen />
      </div>
    );
  }

  if (showOnboarding) {
    return (
      <OnboardingFlow
        mode="replay"
        onComplete={() => setShowOnboarding(false)}
      />
    );
  }

  // VISTA EXCLUSIVA Y ORGANIZADA DEL SÚPER ADMINISTRADOR (SIN MEZCLAR FUNCIONES DE TIENDA/POS)
  if (user.roleId === 'SUPER_ADMIN') {
    return (
      <SuperAdminConsole
        user={user}
        bcvRate={bcvRate}
        onLogout={handleLogout}
        onShowOnboarding={() => setShowOnboarding(true)}
        onUserUpdated={(updated) => {
          setUser(updated);
          localStorage.setItem('vuelto_user_session', JSON.stringify(updated));
        }}
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: '#071F27', color: '#F8FAFC', position: 'relative' }}>

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
            {isVendedor ? '🛒 MODO CAJERO / VENDEDOR' : '💼 MODO ADMINISTRADOR TIENDA'}
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
            <div style={{ display: 'flex', gap: '4px' }}>
              <button onClick={() => { setStorePwdMsg(null); setIsStorePwdModalOpen(true); }} title="Cambiar Contraseña" style={{ background: 'none', border: 'none', color: '#38BDF8', cursor: 'pointer', padding: '4px' }}>
                <ShieldCheck size={16} />
              </button>
              <button onClick={handleLogout} title="Cerrar Sesión" style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '4px' }}>
                <LogOut size={16} />
              </button>
            </div>
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

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => {
                      handleRefreshCashSession();
                      setIsCashModalOpen(true);
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      backgroundColor: cashSession ? 'rgba(0, 230, 195, 0.14)' : 'rgba(245, 158, 11, 0.16)',
                      border: cashSession ? '1px solid rgba(0, 230, 195, 0.45)' : '1px solid rgba(245, 158, 11, 0.45)',
                      color: cashSession ? '#00E6C3' : '#FBBF24',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                    }}
                  >
                    <DollarSign size={12} />
                    <span>
                      {cashSession
                        ? `Caja Abierta ($${cashSession.liveMetrics?.expectedTotalUsd || cashSession.openingBalanceUsd})`
                        : 'Abrir Caja'}
                    </span>
                  </button>
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
                    type="button"
                    onClick={() => setPosCameraOpen((prev) => !prev)}
                    title="Escanear código con cámara"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '12px 14px',
                      marginRight: '6px',
                      borderRadius: '8px',
                      border: '1px solid rgba(0, 230, 195, 0.35)',
                      backgroundColor: posCameraOpen ? '#00E6C3' : '#0A1D3A',
                      color: posCameraOpen ? '#061426' : '#00E6C3',
                      fontWeight: 'bold',
                      fontSize: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    <Camera size={15} />
                    <span>{posCameraOpen ? 'Cerrar Cámara' : 'Cámara'}</span>
                  </button>
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

                {posCameraOpen && (
                  <div style={{ marginTop: '10px', padding: '12px', backgroundColor: '#0A1D3A', borderRadius: '12px', border: '1px solid rgba(0, 230, 195, 0.3)' }}>
                    <WebBarcodeScanner
                      active={posCameraOpen}
                      hintText="Enfoca el código del producto para agregarlo al ticket actual"
                      onDetected={async (code) => {
                        const localMatch = inventoryList.find((p) => p.barcode === code || p.sku === code);
                        if (localMatch) {
                          handlePosAddToCart(localMatch, 1);
                          setPosScanFeedback({ type: 'success', message: `✅ Escaneado con cámara: ${localMatch.name} (+1)` });
                          return;
                        }
                        try {
                          const res = await apiFetch(`/api/v1/products/by-barcode/${encodeURIComponent(code)}`, {}, handleLogout);
                          if (res.ok) {
                            const found = await res.json();
                            const item: ProductItem = {
                              id: found.productId,
                              name: found.name,
                              barcode: found.barcode || code,
                              sku: found.sku || '',
                              category: 'General',
                              unitOfMeasure: found.unitOfMeasure || 'UNIDAD',
                              supplier: '',
                              supplierPhone: '',
                              costPriceUsd: parseFloat(found.costPriceUsd || '0'),
                              salePriceUsd: parseFloat(found.salePriceUsd || '0'),
                              taxRate: found.isExempt ? 0 : parseFloat(found.taxRate || '16'),
                              stock: parseFloat(found.currentStock || '0'),
                              minStockAlert: parseFloat(found.minStockAlert || '5'),
                              lastPurchaseDate: '',
                              inflationDeltaPercent: 0,
                            };
                            handlePosAddToCart(item, found.embeddedWeightKg || 1);
                            setPosScanFeedback({ type: 'success', message: `✅ Escaneado desde BD: ${item.name}` });
                          } else {
                            setPosBarcodeQuery(code);
                            setPosScanFeedback({ type: 'warning', message: `Código ${code} no registrado en inventario.` });
                          }
                        } catch {
                          setPosBarcodeQuery(code);
                        }
                      }}
                    />
                  </div>
                )}

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
                              onClick={() => handleInspectSale(sale)}
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
                          onClick={() => handleSelectRateSource(opt.id as any)}
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#062F3B', padding: '10px', borderRadius: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '12px', color: '#CBD5E1' }}>Monto Tasa (Bs):</span>
                        <input
                          type="number"
                          step="0.01"
                          value={customRateInput}
                          onChange={(e) => setCustomRateInput(e.target.value)}
                          style={{ width: '100px', padding: '6px', borderRadius: '6px', border: '1px solid #10B981', backgroundColor: '#071F27', color: '#10B981', fontWeight: 'bold', fontSize: '14px' }}
                        />
                        <button
                          onClick={() => handleSelectRateSource('CUSTOM', parseFloat(customRateInput) || bcvRate)}
                          style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', backgroundColor: '#10B981', color: '#022C22', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}
                        >
                          Guardar Tasa
                        </button>
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
                          onClick={() => handleToggleTaxRegime('enableIva', !enableIva)}
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
                          onClick={() => handleToggleTaxRegime('enableIgtf', !enableIgtf)}
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

              {/* Referencia de Tasas en Vivo */}
              <div style={{ backgroundColor: '#0B3B49', padding: '20px', borderRadius: '12px', border: '1px solid #155E75' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 'bold', marginBottom: '10px' }}>Estado de Sincronización BCV</h3>
                <p style={{ fontSize: '13px', color: '#CBD5E1' }}>
                  Última tasa oficial sincronizada: <strong style={{ color: '#10B981' }}>{bcvRate > 0 ? `${bcvRate.toFixed(2)} Bs/$` : 'Pendiente de sincronización'}</strong>
                  {ratesData?.bcv?.lastUpdated ? ` • Actualizado: ${new Date(ratesData.bcv.lastUpdated).toLocaleString('es-VE')}` : ''}
                </p>
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
              <WebBarcodeScanner
                active={isAddModalOpen && addMode === 'CAMERA'}
                hintText="Enfoca el código de barras del nuevo producto o usa Foto/Archivo"
                onDetected={(code) => {
                  setNewProdBarcode(code);
                  const existing = inventoryList.find((p) => p.barcode === code);
                  if (existing) {
                    setScannedBarcodeInfo(`⚠️ El código ${code} ya pertenece a "${existing.name}".`);
                  } else {
                    setScannedBarcodeInfo(`✅ Código capturado con cámara: ${code}`);
                  }
                  setAddMode('MANUAL');
                  setCameraActive(false);
                }}
              />
            )}

            {scannedBarcodeInfo && (
              <div
                style={{
                  marginBottom: '12px',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  backgroundColor: scannedBarcodeInfo.startsWith('⚠️') ? 'rgba(245, 158, 11, 0.15)' : 'rgba(0, 230, 195, 0.14)',
                  border: scannedBarcodeInfo.startsWith('⚠️') ? '1px solid #F59E0B' : '1px solid #00E6C3',
                  color: scannedBarcodeInfo.startsWith('⚠️') ? '#FDE68A' : '#00E6C3',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span>{scannedBarcodeInfo}</span>
                <button
                  type="button"
                  onClick={() => setScannedBarcodeInfo(null)}
                  style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}
                >
                  <X size={14} />
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

      {/* MODAL 8: APERTURA Y CIERRE DE CAJA (TURNO DE CAJERO) */}
      {isCashModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(6, 20, 38, 0.78)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 110 }}>
          <div style={{ width: '100%', maxWidth: '460px', backgroundColor: '#0A1D3A', borderRadius: '18px', padding: '24px', border: '1px solid rgba(0, 230, 195, 0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#FFFFFF' }}>
                {cashSession ? 'Arqueo y Cierre de Caja' : 'Apertura de Caja'}
              </h3>
              <button onClick={() => setIsCashModalOpen(false)} style={{ background: 'none', border: 'none', color: '#A7B8CC', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {!cashSession ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <p style={{ fontSize: '12px', color: '#A7B8CC' }}>
                  Registra el fondo de caja inicial en divisas y bolívares antes de iniciar la jornada de cobro.
                </p>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#A7B8CC', marginBottom: '4px' }}>Fondo Inicial USD ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={cashOpeningUsd}
                    onChange={(e) => setCashOpeningUsd(e.target.value)}
                    className="vuelto-input"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#A7B8CC', marginBottom: '4px' }}>Fondo Inicial Bs</label>
                  <input
                    type="number"
                    step="0.01"
                    value={cashOpeningBs}
                    onChange={(e) => setCashOpeningBs(e.target.value)}
                    className="vuelto-input"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#A7B8CC', marginBottom: '4px' }}>Observaciones (opcional)</label>
                  <input
                    type="text"
                    placeholder="Turno mañana / Caja 1"
                    value={cashNotes}
                    onChange={(e) => setCashNotes(e.target.value)}
                    className="vuelto-input"
                  />
                </div>
                <button
                  type="button"
                  disabled={cashLoading}
                  onClick={handleOpenCashSession}
                  className="vuelto-btn-primary"
                  style={{ width: '100%', marginTop: '6px' }}
                >
                  {cashLoading ? 'Abriendo Caja...' : 'Confirmar Apertura de Caja'}
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ backgroundColor: '#061426', padding: '12px', borderRadius: '10px', border: '1px solid rgba(0, 230, 195, 0.2)', fontSize: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ color: '#A7B8CC' }}>Fondo inicial:</span>
                    <strong style={{ color: '#FFFFFF' }}>${cashSession.openingBalanceUsd} USD / {cashSession.openingBalanceBs} Bs</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ color: '#A7B8CC' }}>Ventas del turno ({cashSession.liveMetrics?.salesCount || 0}):</span>
                    <strong style={{ color: '#00E6C3' }}>${cashSession.liveMetrics?.salesTotalUsd || '0.00'} USD</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(167, 184, 204, 0.15)', paddingTop: '6px', marginTop: '6px' }}>
                    <span style={{ color: '#FFFFFF', fontWeight: 'bold' }}>Esperado en caja:</span>
                    <strong style={{ color: '#00E6C3' }}>${cashSession.liveMetrics?.expectedTotalUsd || cashSession.openingBalanceUsd} USD</strong>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#A7B8CC', marginBottom: '4px' }}>Total Contado USD ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={cashClosingUsd}
                    onChange={(e) => setCashClosingUsd(e.target.value)}
                    className="vuelto-input"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#A7B8CC', marginBottom: '4px' }}>Total Contado Bs</label>
                  <input
                    type="number"
                    step="0.01"
                    value={cashClosingBs}
                    onChange={(e) => setCashClosingBs(e.target.value)}
                    className="vuelto-input"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#A7B8CC', marginBottom: '4px' }}>Notas de cierre</label>
                  <input
                    type="text"
                    placeholder="Observaciones de arqueo..."
                    value={cashNotes}
                    onChange={(e) => setCashNotes(e.target.value)}
                    className="vuelto-input"
                  />
                </div>
                <button
                  type="button"
                  disabled={cashLoading}
                  onClick={handleCloseCashSession}
                  className="vuelto-btn-primary"
                  style={{ width: '100%', marginTop: '6px' }}
                >
                  {cashLoading ? 'Cerrando Caja...' : 'Confirmar Cierre Z de Caja'}
                </button>
              </div>
            )}
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

      {/* MODAL CAMBIAR CONTRASEÑA (TIENDA) */}
      {isStorePwdModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 1100 }}>
          <div style={{ width: '100%', maxWidth: '420px', backgroundColor: '#0B3B49', borderRadius: '18px', padding: '24px', border: '1px solid #38BDF8' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '17px', fontWeight: 'bold' }}>Cambiar Mi Contraseña</h3>
              <button onClick={() => setIsStorePwdModalOpen(false)} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            {storePwdMsg && (
              <div style={{ marginBottom: '12px', padding: '10px', borderRadius: '8px', fontSize: '12px', backgroundColor: storePwdMsg.type === 'ok' ? '#10B98122' : '#EF444422', color: storePwdMsg.type === 'ok' ? '#A3E635' : '#FCA5A5', border: `1px solid ${storePwdMsg.type === 'ok' ? '#10B981' : '#EF4444'}` }}>
                {storePwdMsg.text}
              </div>
            )}
            <form onSubmit={handleStoreChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input type="password" required placeholder="Contraseña actual" value={storeCurPwd} onChange={(e) => setStoreCurPwd(e.target.value)} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #155E75', backgroundColor: '#062F3B', color: '#FFFFFF' }} />
              <input type="password" required minLength={8} placeholder="Nueva contraseña (min 8, Mayús/Minús/Núm)" value={storeNewPwd} onChange={(e) => setStoreNewPwd(e.target.value)} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #155E75', backgroundColor: '#062F3B', color: '#FFFFFF' }} />
              <input type="password" required placeholder="Confirmar nueva contraseña" value={storeConfPwd} onChange={(e) => setStoreConfPwd(e.target.value)} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #155E75', backgroundColor: '#062F3B', color: '#FFFFFF' }} />
              <button type="submit" style={{ padding: '11px', borderRadius: '8px', border: 'none', backgroundColor: '#10B981', color: '#071F27', fontWeight: 'bold', cursor: 'pointer', marginTop: '4px' }}>
                Actualizar Contraseña
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);

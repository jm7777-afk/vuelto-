import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  Modal,
  TextInput,
  Alert,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Image,
  Vibration,
  ActivityIndicator,
} from 'react-native';
import { useCartStore } from '../../stores/cart.store';
import { useAuthStore } from '../../stores/auth.store';
import { NativeShareService } from '../../services/share.service';
import { API_BASE_URL, MobileApiService } from '../../services/api.service';
import { BarcodeScannerModal } from '../../components/BarcodeScannerModal';
import { ProductCacheService } from '../../services/product-cache.service';
import { MobileScaleBarcodeUtils } from '../../utils/scale-barcode';
import { VUELTO_COLORS } from '../../theme/colors';

interface PosCatalogProduct {
  id: string;
  name: string;
  barcode: string;
  unitOfMeasure: string;
  category: string;
  salePriceUsd: number;
  taxRate: number;
  isExempt: boolean;
  stock: number;
}

interface PosCheckoutScreenProps {
  onShowOnboarding?: () => void;
}

function detectBarcodeType(code: string): 'EAN13' | 'EAN8' | 'CODE128' | 'UPC' | 'INTERNAL' {
  if (/^\d{13}$/.test(code)) return 'EAN13';
  if (/^\d{8}$/.test(code)) return 'EAN8';
  if (/^\d{12}$/.test(code)) return 'UPC';
  if (/^[a-zA-Z0-9\-_]{3,64}$/.test(code)) return 'CODE128';
  return 'INTERNAL';
}

export const PosCheckoutScreen: React.FC<PosCheckoutScreenProps> = ({ onShowOnboarding }) => {
  const { user, accessToken, refreshToken, toggleMode } = useAuthStore();
  const {
    activeLines,
    activeCustomer,
    frozenRate,
    exchangeRateId,
    heldCarts,
    setExchangeRate,
    addProduct,
    updateQuantity,
    clearActiveCart,
    parkCurrentCart,
    resumeHeldCart,
    discardHeldCart,
    setCustomer,
    getTotalUsd,
    getTotalBs,
  } = useCartStore();

  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [showQuickCustomerModal, setShowQuickCustomerModal] = useState(false);
  const [showHeldCartsModal, setShowHeldCartsModal] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [showPostSaleModal, setShowPostSaleModal] = useState(false);
  const [showCashModal, setShowCashModal] = useState(false);
  const [confirmedInvoice, setConfirmedInvoice] = useState<any>(null);

  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogProducts, setCatalogProducts] = useState<PosCatalogProduct[]>([]);
  const [customersList, setCustomersList] = useState<any[]>([]);
  const [quickBarcodeInput, setQuickBarcodeInput] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSubmittingSale, setIsSubmittingSale] = useState(false);
  const [pendingIdempotencyKey, setPendingIdempotencyKey] = useState<string | null>(null);

  // Caja actual (Apertura y Cierre)
  const [cashSession, setCashSession] = useState<any | null>(null);
  const [cashOpeningUsd, setCashOpeningUsd] = useState('0');
  const [cashOpeningBs, setCashOpeningBs] = useState('0');
  const [cashClosingUsd, setCashClosingUsd] = useState('0');
  const [cashClosingBs, setCashClosingBs] = useState('0');
  const [cashNotes, setCashNotes] = useState('');
  const [cashLoading, setCashLoading] = useState(false);

  // Escáner Físico
  const [showCameraScanner, setShowCameraScanner] = useState(false);
  const [scanFeedbackMsg, setScanFeedbackMsg] = useState<string | null>(null);

  // Modal de Creación Rápida de Producto (404)
  const [showCreateProductModal, setShowCreateProductModal] = useState(false);
  const [newProductBarcode, setNewProductBarcode] = useState('');
  const [newProductName, setNewProductName] = useState('');
  const [newProductPrice, setNewProductPrice] = useState('1.00');
  const [newProductStock, setNewProductStock] = useState('10');
  const [newProductUnit, setNewProductUnit] = useState('unidad');
  const [isSavingProduct, setIsSavingProduct] = useState(false);

  // Cliente Rápido por C.I.
  const [docType, setDocType] = useState<'V' | 'E' | 'J' | 'G'>('V');
  const [docNumber, setDocNumber] = useState('');
  const [customerFirstName, setCustomerFirstName] = useState('');
  const [customerLastName, setCustomerLastName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerSearchMsg, setCustomerSearchMsg] = useState<{ type: 'success' | 'warning' | null; text: string }>({
    type: null,
    text: '',
  });
  const [lookingUpCustomer, setLookingUpCustomer] = useState(false);

  // Pago y Vuelto
  const [paymentCurrency, setPaymentCurrency] = useState<'USD_CASH' | 'BS_PAGO_MOVIL' | 'BS_BIOPAGO'>('USD_CASH');
  const [pagoMovilRef, setPagoMovilRef] = useState('');
  const [vueltoType, setVueltoType] = useState<'WALLET_CREDIT' | 'CHANGE_VOUCHER' | 'PAGO_MOVIL' | 'CASH'>('CASH');

  const rate = frozenRate || 0;
  const isVendedor = user?.roleId === 'VENDEDOR';
  const isAdmin = user?.roleId === 'ADMIN' || user?.roleId === 'SUPER_ADMIN';

  const syncPosResources = useCallback(async () => {
    if (!accessToken || !user?.tenantId) return;
    setIsSyncing(true);
    try {
      const [prodsRes, custRes, rateRes, cashRes] = await Promise.allSettled([
        MobileApiService.getProducts(accessToken),
        MobileApiService.getCustomers(),
        MobileApiService.getActiveRate(),
        MobileApiService.getCurrentCashSession(),
      ]);

      if (prodsRes.status === 'fulfilled') {
        const rawList = Array.isArray(prodsRes.value)
          ? prodsRes.value
          : Array.isArray(prodsRes.value?.products)
          ? prodsRes.value.products
          : [];
        const mapped: PosCatalogProduct[] = rawList.map((p: any) => ({
          id: p.id,
          name: p.name,
          barcode: p.barcode || p.sku || p.id,
          unitOfMeasure: (p.unitOfMeasure || 'unidad').toLowerCase(),
          category: p.categoryName || 'General',
          salePriceUsd: parseFloat(p.salePriceUsd) || 0,
          taxRate: parseFloat(p.taxRate) || 0,
          isExempt: Boolean(p.isExempt || parseFloat(p.taxRate) === 0),
          stock: parseFloat(p.stock || '0') || 0,
        }));
        setCatalogProducts(mapped);
        ProductCacheService.syncCatalog(
          user.tenantId,
          mapped.map((m) => ({
            id: m.id,
            name: m.name,
            barcode: m.barcode,
            price: m.salePriceUsd,
            taxRate: m.taxRate,
            stock: m.stock,
            unit: m.unitOfMeasure,
            isBulk: m.unitOfMeasure === 'kg',
          }))
        );
      }

      if (custRes.status === 'fulfilled') {
        const list = Array.isArray(custRes.value) ? custRes.value : [];
        setCustomersList(list);
      }

      if (rateRes.status === 'fulfilled') {
        const val = Number(rateRes.value?.activeRate ?? rateRes.value?.rate ?? 0);
        const snapId = rateRes.value?.exchangeRateSnapshotId || '';
        if (val > 0 && snapId) {
          setExchangeRate(val, snapId, true);
        }
      }

      if (cashRes.status === 'fulfilled') {
        const sess = cashRes.value?.session || null;
        setCashSession(sess);
        if (sess?.liveMetrics) {
          setCashClosingUsd(String(sess.liveMetrics.expectedTotalUsd || '0.00'));
          setCashClosingBs(String(sess.liveMetrics.expectedTotalBs || '0.00'));
        }
      }
    } finally {
      setIsSyncing(false);
    }
  }, [accessToken, user?.tenantId, setExchangeRate]);

  useEffect(() => {
    syncPosResources();
  }, [syncPosResources]);

  const handleOpenCashSession = async () => {
    setCashLoading(true);
    try {
      await MobileApiService.openCashSession(
        parseFloat(cashOpeningUsd) || 0,
        parseFloat(cashOpeningBs) || 0,
        cashNotes.trim() || undefined
      );
      setCashNotes('');
      setShowCashModal(false);
      await syncPosResources();
      Alert.alert('✅ Caja Abierta', 'Turno de caja iniciado correctamente.');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo abrir la caja.');
    } finally {
      setCashLoading(false);
    }
  };

  const handleCloseCashSession = async () => {
    setCashLoading(true);
    try {
      const res = await MobileApiService.closeCashSession(
        parseFloat(cashClosingUsd) || 0,
        parseFloat(cashClosingBs) || 0,
        cashNotes.trim() || undefined
      );
      setCashSession(null);
      setCashNotes('');
      setShowCashModal(false);
      const disc = parseFloat(res?.session?.discrepancyUsd || '0');
      Alert.alert(
        '✅ Caja Cerrada',
        `Esperado: $${res?.session?.closingExpectedUsd || '0.00'} USD\nDeclarado: $${res?.session?.closingDeclaredUsd || '0.00'} USD\nDiferencia: $${disc.toFixed(2)} USD`
      );
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo cerrar la caja.');
    } finally {
      setCashLoading(false);
    }
  };

  const handleScannerBarcodeResult = async (scannedCode: string, _format: string) => {
    const clean = scannedCode.trim();
    if (!clean) return;

    const tenantId = user?.tenantId || 'default';
    const token = useAuthStore.getState().accessToken || '';

    // 1. Código de balanza (prefijo 20, 21 o 22)
    const scaleInfo = MobileScaleBarcodeUtils.parseScaleBarcode(clean);
    if (scaleInfo.isScaleBarcode && scaleInfo.sku) {
      let foundScaleProd = catalogProducts.find(
        (p) => p.barcode === scaleInfo.sku || p.barcode === clean || p.id.includes(scaleInfo.sku!)
      );

      if (!foundScaleProd && token) {
        try {
          const apiProd = await MobileApiService.findByBarcode(token, scaleInfo.sku);
          if (apiProd && apiProd.id) {
            foundScaleProd = {
              id: apiProd.id,
              name: apiProd.name,
              barcode: apiProd.barcode || scaleInfo.sku,
              salePriceUsd: parseFloat(apiProd.price) || 1.0,
              taxRate: parseFloat(apiProd.taxRate) || 0,
              isExempt: apiProd.taxRate === 0,
              stock: apiProd.stock || 0,
              unitOfMeasure: apiProd.unit || 'kg',
              category: 'Balanza',
            };
          }
        } catch {
          // Fallback caché
        }
      }

      if (foundScaleProd) {
        addProduct(foundScaleProd);
        if (scaleInfo.weightKg && scaleInfo.weightKg > 0) {
          updateQuantity(foundScaleProd.id, scaleInfo.weightKg);
        }
        setScanFeedbackMsg(`⚖️ Balanza: ${foundScaleProd.name} (${scaleInfo.weightKg} kg)`);
        try { Vibration.vibrate(80); } catch {}
        return;
      }
    }

    // 2. Búsqueda local en catálogo cargado / caché
    let target = catalogProducts.find(
      (p) => p.barcode === clean || p.barcode.toLowerCase() === clean.toLowerCase()
    );

    if (!target) {
      const cached = ProductCacheService.findByBarcode(tenantId, clean);
      if (cached) {
        target = {
          id: cached.id,
          name: cached.name,
          barcode: cached.barcode,
          salePriceUsd: cached.price,
          taxRate: cached.taxRate,
          isExempt: cached.taxRate === 0,
          stock: cached.stock,
          unitOfMeasure: cached.unit,
          category: 'General',
        };
      }
    }

    if (target) {
      addProduct(target);
      setScanFeedbackMsg(`✅ ${target.name} agregado ($${target.salePriceUsd.toFixed(2)})`);
      try { Vibration.vibrate(80); } catch {}
      return;
    }

    // 3. Consultar API en vivo
    if (token) {
      try {
        const liveProd = await MobileApiService.findByBarcode(token, clean);
        if (liveProd && liveProd.id) {
          const mapped: PosCatalogProduct = {
            id: liveProd.id,
            name: liveProd.name,
            barcode: liveProd.barcode || clean,
            salePriceUsd: parseFloat(liveProd.price) || 1.0,
            taxRate: parseFloat(liveProd.taxRate) || 0,
            isExempt: liveProd.taxRate === 0,
            stock: liveProd.stock || 0,
            unitOfMeasure: liveProd.unit || 'unidad',
            category: 'General',
          };
          setCatalogProducts((prev) => [...prev, mapped]);
          addProduct(mapped);
          setScanFeedbackMsg(`🌐 ${mapped.name} agregado ($${mapped.salePriceUsd.toFixed(2)})`);
          try { Vibration.vibrate(80); } catch {}
          return;
        }
      } catch {
        setScanFeedbackMsg('⚠️ Error consultando código en el servidor');
      }
    }

    // 4. 404 -> Permitir crear si es admin
    setShowCameraScanner(false);
    Alert.alert(
      'Producto No Encontrado',
      `El código "${clean}" no está registrado en ${user?.businessName || 'la tienda'}.`,
      [
        { text: 'Continuar Escaneando', style: 'cancel', onPress: () => setShowCameraScanner(true) },
        ...(isAdmin
          ? [
              {
                text: 'Crear Producto Nuevo',
                onPress: () => {
                  setNewProductBarcode(clean);
                  setNewProductName('');
                  setNewProductPrice('1.00');
                  setNewProductStock('10');
                  setNewProductUnit('unidad');
                  setShowCreateProductModal(true);
                },
              },
            ]
          : []),
      ]
    );
  };

  const handleSaveQuickProduct = async () => {
    const cleanBarcode = newProductBarcode.trim();
    const cleanName = newProductName.trim();
    if (!cleanName || !cleanBarcode) {
      Alert.alert('Datos Incompletos', 'Indique el nombre y código de barras.');
      return;
    }

    const token = useAuthStore.getState().accessToken || '';
    const priceNum = parseFloat(newProductPrice);
    const stockNum = parseInt(newProductStock, 10);
    if (isNaN(priceNum) || priceNum < 0) {
      Alert.alert('Precio Inválido', 'Ingrese un precio de venta válido.');
      return;
    }

    setIsSavingProduct(true);
    try {
      const created = await MobileApiService.createProduct(token, {
        name: cleanName,
        unitOfMeasure: newProductUnit.toUpperCase(),
        costPriceUsd: +(priceNum * 0.7).toFixed(2),
        salePriceUsd: +priceNum.toFixed(2),
        taxRate: 16,
        isExempt: false,
        minStockAlert: 5,
        initialStock: isNaN(stockNum) ? 0 : stockNum,
        barcodes: [
          {
            barcode: cleanBarcode,
            barcodeType: detectBarcodeType(cleanBarcode),
            isPrimary: true,
          },
        ],
      });

      const mapped: PosCatalogProduct = {
        id: created.id,
        name: created.name || cleanName,
        barcode: cleanBarcode,
        salePriceUsd: parseFloat(created.salePriceUsd) || priceNum,
        taxRate: parseFloat(created.taxRate) || 16,
        isExempt: Boolean(created.isExempt),
        stock: isNaN(stockNum) ? 0 : stockNum,
        unitOfMeasure: newProductUnit,
        category: 'General',
      };

      setCatalogProducts((prev) => [mapped, ...prev]);
      addProduct(mapped);
      setShowCreateProductModal(false);
      Alert.alert('✅ Producto Registrado', `"${mapped.name}" guardado en PostgreSQL y agregado al carrito.`);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo registrar el producto.');
    } finally {
      setIsSavingProduct(false);
    }
  };

  const handleScanOrSearch = () => {
    const query = quickBarcodeInput.trim();
    if (!query) {
      Alert.alert('Escáner / Búsqueda', 'Ingrese o escanee un código de barra o nombre de producto.');
      return;
    }

    const exactBarcode = catalogProducts.find((p) => p.barcode === query);
    if (exactBarcode) {
      addProduct(exactBarcode);
      setQuickBarcodeInput('');
      setScanFeedbackMsg(`✅ ${exactBarcode.name} agregado`);
      return;
    }

    const lower = query.toLowerCase();
    const matches = catalogProducts.filter(
      (p) =>
        p.barcode.includes(query) ||
        p.id.toLowerCase().includes(lower) ||
        p.name.toLowerCase().includes(lower)
    );

    if (matches.length === 1) {
      addProduct(matches[0]);
      setQuickBarcodeInput('');
      setScanFeedbackMsg(`🔍 ${matches[0].name} agregado`);
    } else if (matches.length > 1) {
      setCatalogSearch(query);
      setShowCatalogModal(true);
      setQuickBarcodeInput('');
    } else {
      handleScannerBarcodeResult(query, 'MANUAL');
      setQuickBarcodeInput('');
    }
  };

  const handleSearchCustomerByCi = async () => {
    const cleanNum = docNumber.trim();
    if (!cleanNum || cleanNum.length < 5) {
      Alert.alert('Documento Requerido', 'Ingrese un número de cédula o RIF válido (mínimo 5 dígitos).');
      return;
    }

    setLookingUpCustomer(true);
    try {
      const res = await MobileApiService.lookupCustomer(docType, cleanNum);
      if (res && res.id) {
        const nameParts = String(res.name || '').split(' ');
        setCustomerFirstName(nameParts[0] || '');
        setCustomerLastName(nameParts.slice(1).join(' ') || '');
        setCustomerPhone(res.phone || '');
        setCustomer({
          id: res.id,
          name: res.name,
          documentType: res.documentType || docType,
          documentNumber: res.documentNumber || cleanNum,
          phone: res.phone || '',
          balanceDue: parseFloat(res.balanceDue || '0') || 0,
        });
        setCustomerSearchMsg({
          type: 'success',
          text: `✅ Cliente encontrado en PostgreSQL: ${res.name}`,
        });
      } else {
        setCustomerFirstName('');
        setCustomerLastName('');
        setCustomerPhone('');
        setCustomerSearchMsg({
          type: 'warning',
          text: `⚠️ Documento ${docType}-${cleanNum} no registrado. Complete Nombre y Teléfono para registrarlo:`,
        });
      }
    } catch (e: any) {
      setCustomerSearchMsg({
        type: 'warning',
        text: e.message || 'No se pudo consultar el cliente.',
      });
    } finally {
      setLookingUpCustomer(false);
    }
  };

  const handleSaveQuickCustomer = async () => {
    const cleanNum = docNumber.trim();
    const cleanFirst = customerFirstName.trim();
    const cleanLast = customerLastName.trim();

    if (cleanNum.length < 5 || !cleanFirst) {
      Alert.alert('Datos Incompletos', 'El documento (mín. 5 dígitos) y nombre son obligatorios.');
      return;
    }

    const fullName = cleanLast ? `${cleanFirst} ${cleanLast}` : cleanFirst;
    setLookingUpCustomer(true);
    try {
      const existing = await MobileApiService.lookupCustomer(docType, cleanNum).catch(() => null);
      const saved =
        existing && existing.id
          ? existing
          : await MobileApiService.createQuickCustomer({
              documentType: docType,
              documentNumber: cleanNum,
              name: fullName,
              phone: customerPhone.trim() || undefined,
            });

      const mapped = {
        id: saved.id,
        name: saved.name || fullName,
        documentType: saved.documentType || docType,
        documentNumber: saved.documentNumber || cleanNum,
        phone: saved.phone || customerPhone.trim(),
        balanceDue: parseFloat(saved.balanceDue || '0') || 0,
      };

      setCustomer(mapped);
      setCustomersList((prev) => [mapped, ...prev.filter((c) => c.id !== mapped.id)]);
      setShowQuickCustomerModal(false);
      setDocNumber('');
      setCustomerFirstName('');
      setCustomerLastName('');
      setCustomerPhone('');
      setCustomerSearchMsg({ type: null, text: '' });
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo registrar el cliente en el servidor.');
    } finally {
      setLookingUpCustomer(false);
    }
  };

  const handleCreateAnotherSale = () => {
    if (activeLines.length > 0) {
      const label = activeCustomer
        ? activeCustomer.name.split(' ')[0]
        : `Venta #${heldCarts.length + 1}`;
      const res = parkCurrentCart(label);
      if (res.success) {
        Alert.alert('Venta Pausada', `La venta de ${label} quedó guardada en el fichero superior.`);
      } else {
        Alert.alert('Aviso', res.error || 'No se pudo pausar la venta.');
      }
    } else {
      clearActiveCart();
    }
  };

  const resolveCustomerForSale = async (): Promise<string> => {
    if (activeCustomer?.id) return activeCustomer.id;

    const existingDefault = customersList.find((c) => c.documentNumber === '00000000');
    if (existingDefault?.id) return existingDefault.id;

    const lookedUp = await MobileApiService.lookupCustomer('V', '00000000').catch(() => null);
    if (lookedUp?.id) return lookedUp.id;

    const created = await MobileApiService.createQuickCustomer({
      documentType: 'V',
      documentNumber: '00000000',
      name: 'Consumidor Final',
    });
    return created.id;
  };

  const handleConfirmSale = async () => {
    if (activeLines.length === 0) return;

    if (!cashSession) {
      Alert.alert('Caja Cerrada', 'Debes abrir turno de caja antes de facturar.', [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Abrir Caja',
          onPress: () => {
            setShowCheckoutModal(false);
            setShowCashModal(true);
          },
        },
      ]);
      return;
    }

    setIsSubmittingSale(true);
    const idempKey =
      pendingIdempotencyKey || `mob-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setPendingIdempotencyKey(idempKey);

    try {
      let rateIdToUse = exchangeRateId;
      let rateValueToUse = rate;
      if (!rateIdToUse || rateValueToUse <= 0) {
        const activeR = await MobileApiService.getActiveRate();
        rateIdToUse = activeR?.exchangeRateSnapshotId || '';
        rateValueToUse = Number(activeR?.activeRate ?? activeR?.rate ?? 0);
        if (rateValueToUse > 0 && rateIdToUse) {
          setExchangeRate(rateValueToUse, rateIdToUse, true);
        }
      }

      if (!rateIdToUse) {
        throw new Error('No hay snapshot de tasa de cambio activo en la base de datos.');
      }

      const customerId = await resolveCustomerForSale();
      const baseTotalUsd = getTotalUsd();
      const igtfUsd = paymentCurrency === 'USD_CASH' ? +(baseTotalUsd * 0.03).toFixed(2) : 0;
      const finalTotalUsd = +(baseTotalUsd + igtfUsd).toFixed(2);
      const finalTotalBs = +(finalTotalUsd * rateValueToUse).toFixed(2);

      const backendPaymentMethod =
        paymentCurrency === 'USD_CASH'
          ? 'CASH_USD'
          : paymentCurrency === 'BS_PAGO_MOVIL'
          ? 'PAGO_MOVIL'
          : 'DEBIT_CARD';
      const isVes = paymentCurrency !== 'USD_CASH';

      const token = useAuthStore.getState().accessToken || '';
      const saleResult = await MobileApiService.confirmSale(
        token,
        {
          customerId,
          exchangeRateId: rateIdToUse,
          lines: activeLines.map((l) => ({
            productId: l.productId,
            quantity: l.quantity,
            unitPriceUsd: l.unitPriceUsd,
          })),
          payments: [
            {
              paymentMethod: backendPaymentMethod,
              currency: isVes ? 'VES' : 'USD',
              amount: isVes ? finalTotalBs : finalTotalUsd,
              ...(paymentCurrency === 'BS_PAGO_MOVIL' && pagoMovilRef.trim()
                ? { referenceNumber: pagoMovilRef.trim() }
                : {}),
            },
          ],
        },
        idempKey
      );

      setConfirmedInvoice({
        id: saleResult.id,
        invoiceNumber: saleResult.invoiceFormattedNumber || saleResult.invoiceNumber,
        customerName: activeCustomer ? activeCustomer.name : 'Consumidor Final',
        customerDoc: activeCustomer
          ? `${activeCustomer.documentType}-${activeCustomer.documentNumber}`
          : 'V-00000000',
        totalUsd: parseFloat(saleResult.totalAmountUsd || String(finalTotalUsd)).toFixed(2),
        totalBs: parseFloat(saleResult.totalAmountBs || String(finalTotalBs)).toFixed(2),
        subtotalUsd: baseTotalUsd.toFixed(2),
        igtf3Usd: igtfUsd.toFixed(2),
        vueltoType,
        rate: rateValueToUse,
      });

      setPendingIdempotencyKey(null);
      setPagoMovilRef('');
      setShowCheckoutModal(false);
      setShowPostSaleModal(true);
      clearActiveCart();
      syncPosResources();
    } catch (e: any) {
      Alert.alert('Error al Facturar', e.message || 'No se pudo registrar la factura en el servidor.');
    } finally {
      setIsSubmittingSale(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={VUELTO_COLORS.deep} />

      {/* 1. Header Oficial */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Image
              source={require('../../../assets/vuelto-icon.jpg')}
              style={{ width: 28, height: 28, borderRadius: 7 }}
            />
            <Text style={styles.title}>VUELTO POS</Text>
            <View style={isVendedor ? styles.roleBadgeVendedor : styles.roleBadgeAdmin}>
              <Text style={isVendedor ? styles.roleBadgeVendedorText : styles.roleBadgeAdminText}>
                {isVendedor ? 'CAJERO' : 'ADMIN'}
              </Text>
            </View>
          </View>
          <Text style={styles.subtitle}>
            {rate > 0 ? `Tasa Activa: ${rate.toFixed(2)} Bs/$` : 'Sin tasa sincronizada'}
            {isSyncing ? ' • Sincronizando...' : ''}
          </Text>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={[
              styles.cashBadgeBtn,
              cashSession ? styles.cashBadgeOpen : styles.cashBadgeClosed,
            ]}
            onPress={() => setShowCashModal(true)}
          >
            <Text style={styles.cashBadgeText}>
              {cashSession ? '🟢 Caja' : '🔴 Abrir Caja'}
            </Text>
          </TouchableOpacity>

          {isAdmin && (
            <TouchableOpacity
              style={styles.adminSwitchButton}
              onPress={() => toggleMode('ADMIN')}
            >
              <Text style={styles.adminSwitchText}>Admin</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.logoutButton}
            onPress={() => {
              Alert.alert('Cerrar Sesión', '¿Deseas cerrar tu sesión actual?', [
                { text: 'Cancelar', style: 'cancel' },
                {
                  text: 'Cerrar Sesión',
                  style: 'destructive',
                  onPress: () => MobileApiService.logout(refreshToken),
                },
              ]);
            }}
          >
            <Text style={styles.logoutButtonText}>Salir</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. Fichero Superior de Cuentas Paralelas */}
      <View style={styles.ticketsTabBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.ticketsScrollContent}
        >
          <View style={styles.activeTicketTab}>
            <Text style={{ fontSize: 13 }}>🛒</Text>
            <View>
              <Text style={styles.activeTicketTitle}>
                {activeCustomer ? activeCustomer.name.split(' ')[0] : 'Venta Activa'}
              </Text>
              <Text style={styles.activeTicketSubtitle}>
                {activeLines.length} prod. | ${getTotalUsd().toFixed(2)}
              </Text>
            </View>
          </View>

          {heldCarts.map((h) => (
            <TouchableOpacity
              key={h.id}
              style={styles.heldTicketTab}
              onPress={() => resumeHeldCart(h.id)}
            >
              <Text style={{ fontSize: 13 }}>⏸️</Text>
              <View style={{ marginRight: 6 }}>
                <Text style={styles.heldTicketTitle}>{h.label}</Text>
                <Text style={styles.heldTicketSubtitle}>
                  {h.lines.length} prod. | ${h.totalUsd.toFixed(2)}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => discardHeldCart(h.id)}
                style={styles.discardTabBtn}
              >
                <Text style={styles.discardTabBtnText}>✕</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ))}

          <TouchableOpacity style={styles.newTicketBtn} onPress={handleCreateAnotherSale}>
            <Text style={styles.newTicketBtnText}>+ Otra Venta</Text>
          </TouchableOpacity>

          {onShowOnboarding && (
            <TouchableOpacity style={styles.helpTabBtn} onPress={onShowOnboarding}>
              <Text style={styles.helpTabBtnText}>❓ Guía</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>

      {/* 3. Barra de Escáner y Búsqueda */}
      <View style={styles.barcodeScannerBar}>
        <TextInput
          style={styles.barcodeInput}
          placeholder="Código EAN o buscar producto..."
          placeholderTextColor={VUELTO_COLORS.subtle}
          value={quickBarcodeInput}
          onChangeText={setQuickBarcodeInput}
          onSubmitEditing={handleScanOrSearch}
          returnKeyType="search"
          autoCapitalize="none"
        />
        <TouchableOpacity style={styles.cameraScanActionBtn} onPress={() => setShowCameraScanner(true)}>
          <Text style={styles.cameraScanActionBtnText}>📷 Escáner</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.barcodeScanActionBtn} onPress={handleScanOrSearch}>
          <Text style={styles.barcodeScanActionBtnText}>Buscar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.openCatalogIconBtn} onPress={() => setShowCatalogModal(true)}>
          <Text style={styles.openCatalogIconBtnText}>📦</Text>
        </TouchableOpacity>
      </View>

      {scanFeedbackMsg ? (
        <View style={styles.feedbackBanner}>
          <Text style={styles.feedbackBannerText}>{scanFeedbackMsg}</Text>
        </View>
      ) : null}

      {/* 4. Cliente Activo */}
      <View style={styles.customerBar}>
        <View style={{ flex: 1 }}>
          <Text style={styles.customerLabel}>Cliente Asignado</Text>
          <Text style={styles.customerName}>
            {activeCustomer
              ? `${activeCustomer.documentType}-${activeCustomer.documentNumber} ${activeCustomer.name}`
              : 'Consumidor Final (V-00000000)'}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.quickCustomerBtn}
          onPress={() => setShowQuickCustomerModal(true)}
        >
          <Text style={styles.quickCustomerBtnText}>+ Cliente / C.I.</Text>
        </TouchableOpacity>
      </View>

      {/* 5. Lista de Ítems en Carrito */}
      <View style={styles.cartContainer}>
        {activeLines.length === 0 ? (
          <View style={styles.emptyCart}>
            <Text style={styles.emptyCartText}>
              {catalogProducts.length === 0 && !isSyncing
                ? 'Catálogo vacío en tu comercio. Agrega productos desde Admin o escanea un código nuevo.'
                : 'Carrito listo para facturación.\nEscanea un código de barras o abre el catálogo.'}
            </Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                style={styles.scanSimBtn}
                onPress={() => setShowCatalogModal(true)}
              >
                <Text style={styles.scanSimBtnText}>Abrir Catálogo ({catalogProducts.length})</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.scanSimBtn}
                onPress={syncPosResources}
              >
                <Text style={styles.scanSimBtnText}>↻ Sincronizar</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <FlatList
            data={activeLines}
            keyExtractor={(item) => item.productId}
            renderItem={({ item }) => (
              <View style={styles.cartItemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemPrice}>
                    ${item.unitPriceUsd.toFixed(2)} USD / {item.unitOfMeasure || 'ud'}
                    {rate > 0 ? ` ≈ ${(item.unitPriceUsd * rate).toFixed(2)} Bs` : ''}
                  </Text>
                </View>

                <View style={styles.qtyControls}>
                  <TouchableOpacity
                    style={styles.qtyBtn}
                    onPress={() => updateQuantity(item.productId, item.quantity - 1)}
                  >
                    <Text style={styles.qtyBtnText}>-</Text>
                  </TouchableOpacity>
                  <Text style={styles.qtyText}>{item.quantity}</Text>
                  <TouchableOpacity
                    style={styles.qtyBtn}
                    onPress={() => updateQuantity(item.productId, item.quantity + 1)}
                  >
                    <Text style={styles.qtyBtnText}>+</Text>
                  </TouchableOpacity>
                </View>

                <View style={{ alignItems: 'flex-end', minWidth: 72 }}>
                  <Text style={styles.itemTotal}>${item.totalUsd.toFixed(2)}</Text>
                  {rate > 0 && (
                    <Text style={styles.itemTotalBs}>{(item.totalUsd * rate).toFixed(2)} Bs</Text>
                  )}
                </View>
              </View>
            )}
          />
        )}
      </View>

      {/* 6. Totales y Cobro */}
      <View style={styles.footer}>
        <View style={styles.totalsRow}>
          <View>
            <Text style={styles.totalUsdText}>TOTAL: ${getTotalUsd().toFixed(2)} USD</Text>
            <Text style={styles.totalBsText}>
              {rate > 0 ? `≈ ${getTotalBs().toFixed(2)} Bs` : 'Tasa pendiente'}
            </Text>
          </View>
          <Text style={styles.itemsCountBadge}>{activeLines.length} ítems</Text>
        </View>

        <View style={styles.actionButtonsRow}>
          <TouchableOpacity
            style={[styles.parkButton, activeLines.length === 0 && styles.disabledBtn]}
            disabled={activeLines.length === 0}
            onPress={() => {
              const res = parkCurrentCart();
              if (res.success) Alert.alert('Cuenta Pausada', 'La cuenta ha sido guardada en espera.');
              else Alert.alert('Error', res.error);
            }}
          >
            <Text style={styles.parkButtonText}>Pausar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.checkoutButton, activeLines.length === 0 && styles.disabledBtn]}
            disabled={activeLines.length === 0}
            onPress={() => setShowCheckoutModal(true)}
          >
            <Text style={styles.checkoutButtonText}>Cobrar Factura</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* MODAL CAJA (APERTURA / CIERRE) */}
      <Modal visible={showCashModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {cashSession ? '🔒 Cierre de Caja' : '🟢 Apertura de Caja'}
            </Text>

            {cashSession ? (
              <>
                <Text style={styles.modalSub}>
                  Caja abierta desde {new Date(cashSession.openedAt).toLocaleString('es-VE')}
                </Text>
                <Text style={styles.fieldLabel}>Efectivo Declarado (USD):</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={cashClosingUsd}
                  onChangeText={setCashClosingUsd}
                />
                <Text style={styles.fieldLabel}>Efectivo Declarado (Bs):</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={cashClosingBs}
                  onChangeText={setCashClosingBs}
                />
              </>
            ) : (
              <>
                <Text style={styles.modalSub}>
                  Registra el fondo inicial para habilitar la facturación del turno.
                </Text>
                <Text style={styles.fieldLabel}>Fondo Inicial (USD):</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={cashOpeningUsd}
                  onChangeText={setCashOpeningUsd}
                />
                <Text style={styles.fieldLabel}>Fondo Inicial (Bs):</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={cashOpeningBs}
                  onChangeText={setCashOpeningBs}
                />
              </>
            )}

            <Text style={styles.fieldLabel}>Observaciones:</Text>
            <TextInput
              style={styles.input}
              placeholder="Opcional"
              placeholderTextColor={VUELTO_COLORS.subtle}
              value={cashNotes}
              onChangeText={setCashNotes}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelModalBtn} onPress={() => setShowCashModal(false)}>
                <Text style={styles.cancelModalBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveModalBtn}
                disabled={cashLoading}
                onPress={cashSession ? handleCloseCashSession : handleOpenCashSession}
              >
                {cashLoading ? (
                  <ActivityIndicator color={VUELTO_COLORS.night} />
                ) : (
                  <Text style={styles.saveModalBtnText}>
                    {cashSession ? 'Cerrar Turno' : 'Abrir Turno'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL CATÁLOGO */}
      <Modal visible={showCatalogModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentLarge}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Catálogo de Productos</Text>
              <TouchableOpacity onPress={() => setShowCatalogModal(false)}>
                <Text style={styles.closeModalText}>✕ Cerrar</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Buscar por nombre o código de barra..."
              placeholderTextColor={VUELTO_COLORS.subtle}
              value={catalogSearch}
              onChangeText={setCatalogSearch}
            />

            <FlatList
              data={catalogProducts.filter(
                (p) =>
                  p.name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
                  p.barcode.includes(catalogSearch)
              )}
              keyExtractor={(item) => item.id}
              style={{ maxHeight: 380 }}
              ListEmptyComponent={
                <Text style={{ textAlign: 'center', color: VUELTO_COLORS.muted, padding: 20 }}>
                  No hay productos registrados en este comercio.
                </Text>
              }
              renderItem={({ item }) => (
                <View style={styles.catalogItemRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.catalogItemName}>{item.name}</Text>
                    <Text style={styles.catalogItemBarcode}>
                      EAN: {item.barcode} • Stock: {item.stock} ({item.unitOfMeasure})
                    </Text>
                    <Text style={styles.catalogItemPriceUsd}>
                      ${item.salePriceUsd.toFixed(2)} USD
                      {rate > 0 ? ` (${(item.salePriceUsd * rate).toFixed(2)} Bs)` : ''}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.addToCartBtn}
                    onPress={() => {
                      addProduct(item);
                      setShowCatalogModal(false);
                    }}
                  >
                    <Text style={styles.addToCartBtnText}>+ Agregar</Text>
                  </TouchableOpacity>
                </View>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* MODAL CLIENTE RÁPIDO */}
      <Modal visible={showQuickCustomerModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Búsqueda y Registro de Cliente</Text>

            <View style={styles.docTypeRow}>
              {(['V', 'E', 'J', 'G'] as const).map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.docTypeChip, docType === t && styles.docTypeChipActive]}
                  onPress={() => setDocType(t)}
                >
                  <Text style={[styles.docTypeText, docType === t && styles.docTypeTextActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.ciSearchRow}>
              <TextInput
                style={styles.ciInput}
                placeholder="Cédula o RIF"
                placeholderTextColor={VUELTO_COLORS.subtle}
                keyboardType="numeric"
                value={docNumber}
                onChangeText={(val) => {
                  setDocNumber(val);
                  setCustomerSearchMsg({ type: null, text: '' });
                }}
              />
              <TouchableOpacity style={styles.ciSearchBtn} onPress={handleSearchCustomerByCi} disabled={lookingUpCustomer}>
                <Text style={styles.ciSearchBtnText}>{lookingUpCustomer ? '...' : '🔍 Buscar'}</Text>
              </TouchableOpacity>
            </View>

            {customerSearchMsg.text ? (
              <View
                style={[
                  styles.searchStatusBanner,
                  customerSearchMsg.type === 'success'
                    ? styles.searchStatusBannerSuccess
                    : styles.searchStatusBannerWarning,
                ]}
              >
                <Text
                  style={[
                    styles.searchStatusText,
                    customerSearchMsg.type === 'success'
                      ? styles.searchStatusTextSuccess
                      : styles.searchStatusTextWarning,
                  ]}
                >
                  {customerSearchMsg.text}
                </Text>
              </View>
            ) : null}

            <View style={styles.nameRow}>
              <TextInput
                style={[styles.input, { flex: 1, marginRight: 4 }]}
                placeholder="Nombre(s) *"
                placeholderTextColor={VUELTO_COLORS.subtle}
                value={customerFirstName}
                onChangeText={setCustomerFirstName}
              />
              <TextInput
                style={[styles.input, { flex: 1, marginLeft: 4 }]}
                placeholder="Apellido(s)"
                placeholderTextColor={VUELTO_COLORS.subtle}
                value={customerLastName}
                onChangeText={setCustomerLastName}
              />
            </View>

            <TextInput
              style={styles.input}
              placeholder="Teléfono WhatsApp (ej. 04141234567)"
              placeholderTextColor={VUELTO_COLORS.subtle}
              keyboardType="phone-pad"
              value={customerPhone}
              onChangeText={setCustomerPhone}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelModalBtn}
                onPress={() => {
                  setShowQuickCustomerModal(false);
                  setCustomerSearchMsg({ type: null, text: '' });
                }}
              >
                <Text style={styles.cancelModalBtnText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveModalBtn}
                disabled={lookingUpCustomer}
                onPress={handleSaveQuickCustomer}
              >
                <Text style={styles.saveModalBtnText}>Asignar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL CUENTAS EN ESPERA */}
      <Modal visible={showHeldCartsModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Cuentas en Espera ({heldCarts.length}/10)</Text>
            <FlatList
              data={heldCarts}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={styles.heldCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.heldLabel}>{item.label}</Text>
                    <Text style={styles.heldInfo}>
                      {item.lines.length} productos | ${item.totalUsd.toFixed(2)}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.resumeBtn}
                    onPress={() => {
                      resumeHeldCart(item.id);
                      setShowHeldCartsModal(false);
                    }}
                  >
                    <Text style={styles.resumeBtnText}>Reanudar</Text>
                  </TouchableOpacity>
                </View>
              )}
            />
            <TouchableOpacity style={[styles.cancelModalBtn, { marginTop: 14 }]} onPress={() => setShowHeldCartsModal(false)}>
              <Text style={styles.cancelModalBtnText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL CONFIRMAR COBRO REAL */}
      <Modal visible={showCheckoutModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Confirmar Cobro Fiscal</Text>

            <View style={styles.summaryBox}>
              <View style={styles.summaryLine}>
                <Text style={styles.summaryLabel}>Subtotal + IVA:</Text>
                <Text style={styles.summaryValue}>${getTotalUsd().toFixed(2)} USD</Text>
              </View>
              {paymentCurrency === 'USD_CASH' && (
                <View style={styles.summaryLine}>
                  <Text style={[styles.summaryLabel, { color: VUELTO_COLORS.warning }]}>IGTF 3%:</Text>
                  <Text style={[styles.summaryValue, { color: VUELTO_COLORS.warning }]}>
                    +${(getTotalUsd() * 0.03).toFixed(2)} USD
                  </Text>
                </View>
              )}
              <View style={[styles.summaryLine, { borderTopWidth: 1, borderTopColor: VUELTO_COLORS.borderMuted, paddingTop: 6, marginTop: 4 }]}>
                <Text style={[styles.summaryLabel, { fontWeight: '800' }]}>TOTAL FACTURA:</Text>
                <Text style={[styles.summaryValue, { color: VUELTO_COLORS.turquoise, fontWeight: '800', fontSize: 16 }]}>
                  ${(getTotalUsd() * (paymentCurrency === 'USD_CASH' ? 1.03 : 1)).toFixed(2)} USD
                </Text>
              </View>
              {rate > 0 && (
                <Text style={{ textAlign: 'right', color: VUELTO_COLORS.muted, fontSize: 12 }}>
                  ≈ {(getTotalUsd() * (paymentCurrency === 'USD_CASH' ? 1.03 : 1) * rate).toFixed(2)} Bs
                </Text>
              )}
            </View>

            <Text style={styles.sectionHeader}>Método de Pago:</Text>
            <View style={styles.vueltoRow}>
              {[
                { id: 'USD_CASH', label: 'Efectivo $' },
                { id: 'BS_PAGO_MOVIL', label: 'Pago Móvil (Bs)' },
                { id: 'BS_BIOPAGO', label: 'Punto / Biopago' },
              ].map((m) => (
                <TouchableOpacity
                  key={m.id}
                  style={[styles.vueltoChip, paymentCurrency === m.id && styles.vueltoChipActive]}
                  onPress={() => setPaymentCurrency(m.id as any)}
                >
                  <Text style={[styles.vueltoChipText, paymentCurrency === m.id && styles.vueltoChipTextActive]}>
                    {m.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {paymentCurrency === 'BS_PAGO_MOVIL' && (
              <TextInput
                style={styles.input}
                placeholder="Referencia Pago Móvil (últimos dígitos)"
                placeholderTextColor={VUELTO_COLORS.subtle}
                value={pagoMovilRef}
                onChangeText={setPagoMovilRef}
              />
            )}

            <Text style={styles.sectionHeader}>Destino del Vuelto:</Text>
            <View style={styles.vueltoRow}>
              {[
                { type: 'CASH', label: 'Efectivo' },
                { type: 'WALLET_CREDIT', label: 'Monedero' },
                { type: 'CHANGE_VOUCHER', label: 'Vale' },
                { type: 'PAGO_MOVIL', label: 'Pago Móvil' },
              ].map((opt) => (
                <TouchableOpacity
                  key={opt.type}
                  style={[styles.vueltoChip, vueltoType === opt.type && styles.vueltoChipActive]}
                  onPress={() => setVueltoType(opt.type as any)}
                >
                  <Text style={[styles.vueltoChipText, vueltoType === opt.type && styles.vueltoChipTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelModalBtn}
                disabled={isSubmittingSale}
                onPress={() => setShowCheckoutModal(false)}
              >
                <Text style={styles.cancelModalBtnText}>Atrás</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveModalBtn}
                disabled={isSubmittingSale}
                onPress={handleConfirmSale}
              >
                {isSubmittingSale ? (
                  <ActivityIndicator color={VUELTO_COLORS.night} />
                ) : (
                  <Text style={styles.saveModalBtnText}>Confirmar Venta</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL POST-VENTA */}
      <Modal visible={showPostSaleModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={[styles.modalTitle, { color: VUELTO_COLORS.turquoise }]}>
              ¡Factura Emitida con Éxito!
            </Text>
            <Text style={{ textAlign: 'center', color: VUELTO_COLORS.muted, marginBottom: 16, lineHeight: 20 }}>
              Factura N° {confirmedInvoice?.invoiceNumber}{'\n'}
              Total: ${confirmedInvoice?.totalUsd} USD ({confirmedInvoice?.totalBs} Bs)
            </Text>

            <TouchableOpacity
              style={styles.postSaleBtnShare}
              onPress={async () => {
                const token = useAuthStore.getState().accessToken || '';
                const saleId = confirmedInvoice?.id;
                if (!saleId || !token) return;
                await NativeShareService.shareInvoice({
                  saleId,
                  invoiceNumber: confirmedInvoice.invoiceNumber,
                  businessName: user?.businessName || 'Vuelto',
                  pdfDownloadUrl: `${API_BASE_URL}/sales/${saleId}/receipt/pdf`,
                  jwtToken: token,
                  onAuditCallback: async (r) => {
                    await MobileApiService.auditShare(saleId, r);
                  },
                });
              }}
            >
              <Text style={styles.postSaleBtnShareText}>📲 Compartir PDF por WhatsApp</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.postSaleBtnPrint}
              onPress={async () => {
                if (confirmedInvoice?.id) {
                  await MobileApiService.auditPrint(confirmedInvoice.id);
                }
                Alert.alert('Impresora Térmica', 'Comprobante enviado y auditado.');
              }}
            >
              <Text style={styles.postSaleBtnPrintText}>🖨️ Imprimir Ticket Térmico</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.cancelModalBtn, { marginTop: 10 }]}
              onPress={() => setShowPostSaleModal(false)}
            >
              <Text style={styles.cancelModalBtnText}>Nueva Venta</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ESCÁNER CON CÁMARA */}
      <BarcodeScannerModal
        visible={showCameraScanner}
        onClose={() => setShowCameraScanner(false)}
        onScanned={handleScannerBarcodeResult}
        continuous={true}
        title="Escáner POS Vuelto"
      />

      {/* MINI-MODAL CREACIÓN RÁPIDA DE PRODUCTO */}
      <Modal visible={showCreateProductModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>📦 Crear Producto Nuevo</Text>
            <Text style={styles.modalSub}>
              Registra este código en PostgreSQL para agregarlo al carrito.
            </Text>

            <Text style={styles.fieldLabel}>Código de Barras:</Text>
            <TextInput
              style={[styles.input, { color: VUELTO_COLORS.turquoise }]}
              value={newProductBarcode}
              onChangeText={setNewProductBarcode}
            />

            <Text style={styles.fieldLabel}>Nombre del Producto (*):</Text>
            <TextInput
              style={styles.input}
              placeholder="Nombre del producto"
              placeholderTextColor={VUELTO_COLORS.subtle}
              value={newProductName}
              onChangeText={setNewProductName}
            />

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Precio Venta ($):</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={newProductPrice}
                  onChangeText={setNewProductPrice}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Stock Inicial:</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={newProductStock}
                  onChangeText={setNewProductStock}
                />
              </View>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelModalBtn}
                onPress={() => setShowCreateProductModal(false)}
              >
                <Text style={styles.cancelModalBtnText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveModalBtn}
                onPress={handleSaveQuickProduct}
                disabled={isSavingProduct}
              >
                <Text style={styles.saveModalBtnText}>
                  {isSavingProduct ? 'Guardando...' : '✓ Guardar'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <TouchableOpacity
        style={styles.fabScannerBtn}
        onPress={() => setShowCameraScanner(true)}
        accessibilityLabel="Abrir escáner de cámara"
      >
        <Text style={{ fontSize: 22 }}>📷</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: VUELTO_COLORS.night },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    backgroundColor: VUELTO_COLORS.deep,
    borderBottomWidth: 1,
    borderBottomColor: VUELTO_COLORS.border,
  },
  title: { color: VUELTO_COLORS.white, fontSize: 17, fontWeight: '800', letterSpacing: 0.8 },
  subtitle: { color: VUELTO_COLORS.turquoise, fontSize: 11, fontWeight: '600', marginTop: 2 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  roleBadgeVendedor: {
    backgroundColor: 'rgba(0, 230, 195, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 195, 0.35)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  roleBadgeVendedorText: { color: VUELTO_COLORS.turquoise, fontSize: 10, fontWeight: '800' },
  roleBadgeAdmin: {
    backgroundColor: 'rgba(0, 191, 165, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 195, 0.45)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  roleBadgeAdminText: { color: VUELTO_COLORS.turquoise, fontSize: 10, fontWeight: '800' },
  cashBadgeBtn: {
    paddingVertical: 6,
    paddingHorizontal: 9,
    borderRadius: 8,
    borderWidth: 1,
  },
  cashBadgeOpen: {
    backgroundColor: 'rgba(16, 185, 129, 0.16)',
    borderColor: 'rgba(16, 185, 129, 0.45)',
  },
  cashBadgeClosed: {
    backgroundColor: 'rgba(239, 68, 68, 0.16)',
    borderColor: 'rgba(239, 68, 68, 0.45)',
  },
  cashBadgeText: { color: VUELTO_COLORS.white, fontSize: 11, fontWeight: '700' },
  adminSwitchButton: {
    backgroundColor: VUELTO_COLORS.turquoise,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  adminSwitchText: { color: VUELTO_COLORS.night, fontSize: 11, fontWeight: '800' },
  logoutButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: VUELTO_COLORS.borderMuted,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  logoutButtonText: { color: VUELTO_COLORS.muted, fontSize: 11, fontWeight: '700' },

  ticketsTabBar: {
    backgroundColor: '#08182E',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: VUELTO_COLORS.borderMuted,
  },
  ticketsScrollContent: {
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  activeTicketTab: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 191, 165, 0.16)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: VUELTO_COLORS.turquoise,
    gap: 6,
  },
  activeTicketTitle: { color: VUELTO_COLORS.white, fontSize: 12, fontWeight: '800' },
  activeTicketSubtitle: { color: VUELTO_COLORS.turquoise, fontSize: 10 },
  heldTicketTab: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: VUELTO_COLORS.deep,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: VUELTO_COLORS.borderMuted,
    gap: 6,
  },
  heldTicketTitle: { color: VUELTO_COLORS.white, fontSize: 12, fontWeight: '600' },
  heldTicketSubtitle: { color: VUELTO_COLORS.muted, fontSize: 10 },
  discardTabBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.18)',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  discardTabBtnText: { color: '#FCA5A5', fontSize: 10, fontWeight: '800' },
  newTicketBtn: {
    backgroundColor: VUELTO_COLORS.teal,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  newTicketBtnText: { color: VUELTO_COLORS.night, fontSize: 11, fontWeight: '800' },
  helpTabBtn: {
    backgroundColor: VUELTO_COLORS.deep,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: VUELTO_COLORS.border,
  },
  helpTabBtnText: { color: VUELTO_COLORS.turquoise, fontSize: 11, fontWeight: '700' },

  barcodeScannerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: VUELTO_COLORS.deep,
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: VUELTO_COLORS.borderMuted,
  },
  barcodeInput: {
    flex: 1,
    backgroundColor: VUELTO_COLORS.night,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: VUELTO_COLORS.white,
    fontSize: 12,
    borderWidth: 1,
    borderColor: VUELTO_COLORS.borderMuted,
  },
  cameraScanActionBtn: {
    backgroundColor: VUELTO_COLORS.turquoise,
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  cameraScanActionBtnText: { color: VUELTO_COLORS.night, fontSize: 11, fontWeight: '800' },
  barcodeScanActionBtn: {
    backgroundColor: VUELTO_COLORS.teal,
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  barcodeScanActionBtnText: { color: VUELTO_COLORS.night, fontSize: 11, fontWeight: '800' },
  openCatalogIconBtn: {
    backgroundColor: VUELTO_COLORS.night,
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: VUELTO_COLORS.border,
  },
  openCatalogIconBtnText: { fontSize: 13 },

  feedbackBanner: {
    backgroundColor: 'rgba(0, 230, 195, 0.12)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: VUELTO_COLORS.border,
  },
  feedbackBannerText: { color: VUELTO_COLORS.turquoise, fontSize: 11, fontWeight: '700' },

  customerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#08182E',
    borderBottomWidth: 1,
    borderBottomColor: VUELTO_COLORS.borderMuted,
  },
  customerLabel: { color: VUELTO_COLORS.muted, fontSize: 10 },
  customerName: { color: VUELTO_COLORS.white, fontSize: 13, fontWeight: '700' },
  quickCustomerBtn: {
    backgroundColor: 'rgba(0, 230, 195, 0.14)',
    borderWidth: 1,
    borderColor: VUELTO_COLORS.turquoise,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  quickCustomerBtnText: { color: VUELTO_COLORS.turquoise, fontSize: 11, fontWeight: '800' },

  cartContainer: { flex: 1, padding: 12 },
  emptyCart: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  emptyCartText: {
    color: VUELTO_COLORS.muted,
    textAlign: 'center',
    fontSize: 13,
    marginBottom: 16,
    lineHeight: 20,
  },
  scanSimBtn: {
    backgroundColor: VUELTO_COLORS.deep,
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: VUELTO_COLORS.border,
  },
  scanSimBtnText: { color: VUELTO_COLORS.turquoise, fontSize: 12, fontWeight: '800' },

  cartItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: VUELTO_COLORS.deep,
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: VUELTO_COLORS.borderMuted,
  },
  itemName: { color: VUELTO_COLORS.white, fontSize: 14, fontWeight: '700' },
  itemPrice: { color: VUELTO_COLORS.muted, fontSize: 11, marginTop: 2 },
  qtyControls: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 10 },
  qtyBtn: {
    backgroundColor: VUELTO_COLORS.night,
    borderWidth: 1,
    borderColor: VUELTO_COLORS.border,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyBtnText: { color: VUELTO_COLORS.turquoise, fontSize: 15, fontWeight: '800' },
  qtyText: { color: VUELTO_COLORS.white, marginHorizontal: 8, fontSize: 13, fontWeight: '800' },
  itemTotal: { color: VUELTO_COLORS.turquoise, fontSize: 14, fontWeight: '800' },
  itemTotalBs: { color: VUELTO_COLORS.muted, fontSize: 10 },

  footer: {
    padding: 16,
    backgroundColor: VUELTO_COLORS.deep,
    borderTopWidth: 1,
    borderTopColor: VUELTO_COLORS.border,
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  totalUsdText: { color: VUELTO_COLORS.white, fontSize: 18, fontWeight: '800' },
  totalBsText: { color: VUELTO_COLORS.turquoise, fontSize: 13, fontWeight: '700' },
  itemsCountBadge: {
    backgroundColor: VUELTO_COLORS.night,
    color: VUELTO_COLORS.muted,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 11,
    fontWeight: '700',
  },
  actionButtonsRow: { flexDirection: 'row', gap: 10 },
  parkButton: {
    flex: 1,
    backgroundColor: VUELTO_COLORS.night,
    borderWidth: 1,
    borderColor: VUELTO_COLORS.borderMuted,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  parkButtonText: { color: VUELTO_COLORS.white, fontSize: 14, fontWeight: '700' },
  checkoutButton: {
    flex: 2,
    backgroundColor: VUELTO_COLORS.turquoise,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  checkoutButtonText: { color: VUELTO_COLORS.night, fontSize: 14, fontWeight: '800' },
  disabledBtn: { opacity: 0.45 },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(3, 10, 20, 0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: VUELTO_COLORS.deep,
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 420,
    borderWidth: 1,
    borderColor: VUELTO_COLORS.border,
  },
  modalContentLarge: {
    backgroundColor: VUELTO_COLORS.deep,
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 480,
    borderWidth: 1,
    borderColor: VUELTO_COLORS.border,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: VUELTO_COLORS.white, marginBottom: 8 },
  modalSub: { fontSize: 12, color: VUELTO_COLORS.muted, marginBottom: 12, lineHeight: 17 },
  closeModalText: { color: VUELTO_COLORS.muted, fontSize: 13, fontWeight: '700' },
  fieldLabel: { color: VUELTO_COLORS.muted, fontSize: 12, fontWeight: '700', marginBottom: 4 },
  input: {
    backgroundColor: VUELTO_COLORS.night,
    borderWidth: 1,
    borderColor: VUELTO_COLORS.borderMuted,
    color: VUELTO_COLORS.white,
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    fontSize: 13,
  },
  modalButtons: { flexDirection: 'row', gap: 10, marginTop: 10 },
  cancelModalBtn: {
    flex: 1,
    padding: 13,
    borderRadius: 12,
    backgroundColor: VUELTO_COLORS.night,
    borderWidth: 1,
    borderColor: VUELTO_COLORS.borderMuted,
    alignItems: 'center',
  },
  cancelModalBtnText: { color: VUELTO_COLORS.muted, fontWeight: '700' },
  saveModalBtn: {
    flex: 1,
    padding: 13,
    borderRadius: 12,
    backgroundColor: VUELTO_COLORS.turquoise,
    alignItems: 'center',
  },
  saveModalBtnText: { color: VUELTO_COLORS.night, fontWeight: '800' },

  catalogItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: VUELTO_COLORS.borderMuted,
  },
  catalogItemName: { color: VUELTO_COLORS.white, fontSize: 14, fontWeight: '700' },
  catalogItemBarcode: { color: VUELTO_COLORS.muted, fontSize: 11 },
  catalogItemPriceUsd: { color: VUELTO_COLORS.turquoise, fontSize: 13, fontWeight: '800', marginTop: 2 },
  addToCartBtn: {
    backgroundColor: VUELTO_COLORS.turquoise,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 10,
  },
  addToCartBtnText: { color: VUELTO_COLORS.night, fontSize: 12, fontWeight: '800' },

  docTypeRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  docTypeChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: VUELTO_COLORS.night,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: VUELTO_COLORS.borderMuted,
  },
  docTypeChipActive: { backgroundColor: VUELTO_COLORS.turquoise, borderColor: VUELTO_COLORS.turquoise },
  docTypeText: { color: VUELTO_COLORS.muted, fontWeight: '800' },
  docTypeTextActive: { color: VUELTO_COLORS.night },
  ciSearchRow: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  ciInput: {
    flex: 1,
    backgroundColor: VUELTO_COLORS.night,
    borderWidth: 1,
    borderColor: VUELTO_COLORS.borderMuted,
    color: VUELTO_COLORS.white,
    borderRadius: 10,
    padding: 10,
    fontSize: 13,
  },
  ciSearchBtn: {
    backgroundColor: VUELTO_COLORS.teal,
    paddingHorizontal: 14,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ciSearchBtnText: { color: VUELTO_COLORS.night, fontSize: 12, fontWeight: '800' },
  searchStatusBanner: { padding: 8, borderRadius: 8, marginBottom: 10, borderWidth: 1 },
  searchStatusBannerSuccess: { backgroundColor: 'rgba(16, 185, 129, 0.14)', borderColor: VUELTO_COLORS.success },
  searchStatusBannerWarning: { backgroundColor: VUELTO_COLORS.warningBg, borderColor: VUELTO_COLORS.warning },
  searchStatusText: { fontSize: 11, fontWeight: '700' },
  searchStatusTextSuccess: { color: '#6EE7B7' },
  searchStatusTextWarning: { color: '#FCD34D' },
  nameRow: { flexDirection: 'row', marginBottom: 2 },

  heldCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: VUELTO_COLORS.night,
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  heldLabel: { color: VUELTO_COLORS.white, fontWeight: '700' },
  heldInfo: { color: VUELTO_COLORS.muted, fontSize: 11 },
  resumeBtn: { backgroundColor: VUELTO_COLORS.turquoise, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8 },
  resumeBtnText: { color: VUELTO_COLORS.night, fontWeight: '800', fontSize: 12 },

  summaryBox: {
    backgroundColor: VUELTO_COLORS.night,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: VUELTO_COLORS.borderMuted,
    marginBottom: 14,
  },
  summaryLine: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  summaryLabel: { color: VUELTO_COLORS.muted, fontSize: 13 },
  summaryValue: { color: VUELTO_COLORS.white, fontSize: 13, fontWeight: '700' },
  sectionHeader: { color: VUELTO_COLORS.muted, fontSize: 12, fontWeight: '700', marginBottom: 8 },
  vueltoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  vueltoChip: {
    backgroundColor: VUELTO_COLORS.night,
    borderWidth: 1,
    borderColor: VUELTO_COLORS.borderMuted,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  vueltoChipActive: { backgroundColor: 'rgba(0, 230, 195, 0.18)', borderColor: VUELTO_COLORS.turquoise },
  vueltoChipText: { color: VUELTO_COLORS.muted, fontSize: 11, fontWeight: '700' },
  vueltoChipTextActive: { color: VUELTO_COLORS.turquoise },

  postSaleBtnShare: {
    backgroundColor: VUELTO_COLORS.turquoise,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  postSaleBtnShareText: { color: VUELTO_COLORS.night, fontWeight: '800', fontSize: 14 },
  postSaleBtnPrint: {
    backgroundColor: VUELTO_COLORS.night,
    borderWidth: 1,
    borderColor: VUELTO_COLORS.border,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  postSaleBtnPrintText: { color: VUELTO_COLORS.white, fontWeight: '700', fontSize: 14 },

  fabScannerBtn: {
    position: 'absolute',
    right: 18,
    bottom: 116,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: VUELTO_COLORS.turquoise,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: VUELTO_COLORS.turquoise,
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
});

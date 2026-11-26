import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  SafeAreaView,
  StatusBar,
  Linking,
  Image,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useAuthStore } from '../../stores/auth.store';
import { BarcodeScannerModal } from '../../components/BarcodeScannerModal';
import { MobileScaleBarcodeUtils } from '../../utils/scale-barcode';
import { API_BASE_URL, MobileApiService } from '../../services/api.service';
import { NativeShareService } from '../../services/share.service';
import { VUELTO_COLORS } from '../../theme/colors';

export interface TenantEntry {
  id: string;
  slug: string;
  businessName: string;
  tradeName: string;
  documentType: 'J' | 'V' | 'G' | 'E';
  documentNumber: string;
  phone: string;
  email: string;
  isActive: boolean;
  isSpecialTaxpayer: boolean;
}

interface MobileAdminDashboardProps {
  onShowOnboarding?: () => void;
}

function detectBarcodeType(code: string): 'EAN13' | 'EAN8' | 'CODE128' | 'UPC' | 'INTERNAL' {
  if (/^\d{13}$/.test(code)) return 'EAN13';
  if (/^\d{8}$/.test(code)) return 'EAN8';
  if (/^\d{12}$/.test(code)) return 'UPC';
  if (/^[a-zA-Z0-9\-_]{3,64}$/.test(code)) return 'CODE128';
  return 'INTERNAL';
}

export const MobileAdminDashboard: React.FC<MobileAdminDashboardProps> = ({ onShowOnboarding }) => {
  const { user, accessToken, refreshToken, toggleMode } = useAuthStore();
  const isSuperAdmin = user?.roleId === 'SUPER_ADMIN';
  const hasTenantContext = Boolean(user?.tenantId);

  const [activeSection, setActiveSection] = useState<
    'STOCK' | 'ORDERS' | 'DEBTS' | 'SUPPLIERS' | 'SALES' | 'RATES' | 'USERS' | 'TENANTS' | 'SECURITY'
  >(isSuperAdmin && !hasTenantContext ? 'TENANTS' : 'STOCK');

  const [loadingData, setLoadingData] = useState(false);

  // Datos reales desde PostgreSQL
  const [adminProducts, setAdminProducts] = useState<any[]>([]);
  const [tenantsList, setTenantsList] = useState<TenantEntry[]>([]);
  const [ordersList, setOrdersList] = useState<any[]>([]);
  const [suppliersList, setSuppliersList] = useState<any[]>([]);
  const [debtorsList, setDebtorsList] = useState<any[]>([]);
  const [salesList, setSalesList] = useState<any[]>([]);
  const [cashiersList, setCashiersList] = useState<any[]>([]);

  // Tasas en vivo y configuración
  const [liveMonitorRates, setLiveMonitorRates] = useState({ bcv: 0, paralelo: 0, euro: 0 });
  const [activeRateSource, setActiveRateSource] = useState<'BCV' | 'PARALELO' | 'EURO' | 'CUSTOM'>('BCV');
  const [customRate, setCustomRate] = useState('0');
  const [enableIva, setEnableIva] = useState(true);
  const [enableIgtf, setEnableIgtf] = useState(true);
  const [globalMargin, setGlobalMargin] = useState('30');

  // Escáner de inventario y formularios
  const [showAdminScanner, setShowAdminScanner] = useState(false);
  const [scannerMode, setScannerMode] = useState<'ADJUST_STOCK' | 'NEW_PRODUCT_BARCODE'>('ADJUST_STOCK');
  const [showNewProductModal, setShowNewProductModal] = useState(false);
  const [newProdName, setNewProdName] = useState('');
  const [newProdBarcode, setNewProdBarcode] = useState('');
  const [newProdUnit, setNewProdUnit] = useState('UNIDAD');
  const [newProdCost, setNewProdCost] = useState('1.00');
  const [newProdSale, setNewProdSale] = useState('1.40');
  const [newProdStock, setNewProdStock] = useState('20');
  const [newProdMinStock, setNewProdMinStock] = useState('5');

  const [scannedProductForAdjustment, setScannedProductForAdjustment] = useState<any | null>(null);
  const [showQuickAdjustModal, setShowQuickAdjustModal] = useState(false);
  const [quickStockAmount, setQuickStockAmount] = useState('0');

  // Ajuste manual stock
  const [adjustProductId, setAdjustProductId] = useState('');
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustReason, setAdjustReason] = useState('');

  // Nuevo proveedor
  const [newSupDocType, setNewSupDocType] = useState<'J' | 'G' | 'V' | 'E'>('J');
  const [newSupRif, setNewSupRif] = useState('');
  const [newSupName, setNewSupName] = useState('');
  const [newSupPhone, setNewSupPhone] = useState('');

  // Nuevo tenant (SUPER_ADMIN)
  const [showAddTenantModal, setShowAddTenantModal] = useState(false);
  const [newTenantSlug, setNewTenantSlug] = useState('');
  const [newTenantBusinessName, setNewTenantBusinessName] = useState('');
  const [newTenantTradeName, setNewTenantTradeName] = useState('');
  const [newTenantDocType, setNewTenantDocType] = useState<'J' | 'V' | 'G' | 'E'>('J');
  const [newTenantDocNumber, setNewTenantDocNumber] = useState('');
  const [newTenantPhone, setNewTenantPhone] = useState('');
  const [newTenantEmail, setNewTenantEmail] = useState('');
  const [newTenantIsSpecial, setNewTenantIsSpecial] = useState(false);
  const [newTenantAdminUser, setNewTenantAdminUser] = useState('');
  const [newTenantAdminPass, setNewTenantAdminPass] = useState('');

  // Cambio de contraseña
  const [curPassword, setCurPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPwd, setChangingPwd] = useState(false);

  const loadDashboardData = useCallback(async () => {
    if (!accessToken) return;
    setLoadingData(true);
    try {
      const monitorPromise = MobileApiService.getExchangeRates(accessToken).catch(() => null);
      if (isSuperAdmin) {
        MobileApiService.getSuperAdminTenants()
          .then((list) => setTenantsList(Array.isArray(list) ? list : []))
          .catch(() => {});
      }

      const mRates = await monitorPromise;
      if (mRates) {
        setLiveMonitorRates({
          bcv: Number(mRates.bcv) || 0,
          paralelo: Number(mRates.paralelo) || 0,
          euro: Number(mRates.euro) || 0,
        });
      }

      if (!hasTenantContext) return;

      const [prods, sups, ords, debts, sls, cashiers, cfg] = await Promise.allSettled([
        MobileApiService.getProducts(accessToken),
        MobileApiService.getSuppliers(),
        MobileApiService.getPurchaseOrders(),
        MobileApiService.getDebtors(),
        MobileApiService.getSales(),
        MobileApiService.getCashiersLive(),
        MobileApiService.getConfig(),
      ]);

      if (prods.status === 'fulfilled') {
        const arr = Array.isArray(prods.value) ? prods.value : prods.value?.products || [];
        setAdminProducts(
          arr.map((p: any) => ({
            id: p.id,
            name: p.name,
            barcode: p.barcode || p.sku || p.id,
            unit: p.unitOfMeasure || 'UNIDAD',
            category: p.categoryName || 'General',
            costPriceUsd: parseFloat(p.costPriceUsd) || 0,
            salePriceUsd: parseFloat(p.salePriceUsd) || 0,
            stock: parseFloat(p.stock || '0') || 0,
            minStock: parseFloat(p.minStockAlert || '5') || 5,
            supplier: p.supplierName || 'Sin proveedor',
            supplierPhone: p.supplierPhone || '',
          }))
        );
      }

      if (sups.status === 'fulfilled') {
        setSuppliersList(Array.isArray(sups.value) ? sups.value : []);
      }
      if (ords.status === 'fulfilled') {
        setOrdersList(Array.isArray(ords.value) ? ords.value : []);
      }
      if (debts.status === 'fulfilled') {
        setDebtorsList(Array.isArray(debts.value) ? debts.value : []);
      }
      if (sls.status === 'fulfilled') {
        setSalesList(Array.isArray(sls.value) ? sls.value : []);
      }
      if (cashiers.status === 'fulfilled') {
        setCashiersList(Array.isArray(cashiers.value) ? cashiers.value : []);
      }
      if (cfg.status === 'fulfilled' && cfg.value) {
        if (cfg.value.activeExchangeRateSource) {
          setActiveRateSource(cfg.value.activeExchangeRateSource);
        }
        if (cfg.value.customExchangeRate) {
          setCustomRate(String(cfg.value.customExchangeRate));
        }
        if (typeof cfg.value.enableIva === 'boolean') setEnableIva(cfg.value.enableIva);
        if (typeof cfg.value.enableIgtf === 'boolean') setEnableIgtf(cfg.value.enableIgtf);
      }
    } finally {
      setLoadingData(false);
    }
  }, [accessToken, isSuperAdmin, hasTenantContext]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleAdminScanned = (scannedCode: string, _format: string) => {
    const clean = scannedCode.trim();
    if (!clean) return;

    if (scannerMode === 'NEW_PRODUCT_BARCODE') {
      const duplicate = adminProducts.find(
        (p) => p.barcode === clean || p.barcode.toLowerCase() === clean.toLowerCase()
      );
      if (duplicate) {
        Alert.alert('Código Duplicado', `El código ${clean} ya pertenece a "${duplicate.name}".`);
        setShowAdminScanner(false);
        return;
      }
      setNewProdBarcode(clean);
      setShowAdminScanner(false);
      return;
    }

    const scaleInfo = MobileScaleBarcodeUtils.parseScaleBarcode(clean);
    const lookupCode = scaleInfo.isScaleBarcode && scaleInfo.sku ? scaleInfo.sku : clean;
    const found = adminProducts.find(
      (p) => p.barcode === lookupCode || p.barcode === clean || p.id.includes(lookupCode)
    );

    if (found) {
      setShowAdminScanner(false);
      setScannedProductForAdjustment(found);
      setQuickStockAmount(String(found.stock));
      setShowQuickAdjustModal(true);
    } else {
      Alert.alert('Producto No Encontrado', `El código ${clean} no está registrado.`);
    }
  };

  const handleSaveQuickStockAdjustment = async () => {
    if (!scannedProductForAdjustment) return;
    const newStockVal = parseFloat(quickStockAmount);
    if (isNaN(newStockVal) || newStockVal < 0) {
      Alert.alert('Valor Inválido', 'Ingrese una cantidad válida.');
      return;
    }
    try {
      await MobileApiService.adjustStock(
        scannedProductForAdjustment.id,
        newStockVal,
        'Ajuste rápido desde escáner móvil'
      );
      setShowQuickAdjustModal(false);
      await loadDashboardData();
      Alert.alert('✅ Stock Actualizado', `Stock de "${scannedProductForAdjustment.name}" actualizado en Kardex.`);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo actualizar el stock.');
    }
  };

  const handleSaveNewAdminProduct = async () => {
    const cleanBarcode = newProdBarcode.trim();
    const cleanName = newProdName.trim();
    if (!cleanName || !cleanBarcode) {
      Alert.alert('Datos Incompletos', 'Indique el nombre y código de barras.');
      return;
    }

    try {
      await MobileApiService.createProduct(accessToken || '', {
        name: cleanName,
        unitOfMeasure: newProdUnit || 'UNIDAD',
        costPriceUsd: parseFloat(newProdCost) || 0,
        salePriceUsd: parseFloat(newProdSale) || 0,
        taxRate: enableIva ? 16 : 0,
        isExempt: !enableIva,
        minStockAlert: parseFloat(newProdMinStock) || 5,
        initialStock: parseFloat(newProdStock) || 0,
        barcodes: [
          {
            barcode: cleanBarcode,
            barcodeType: detectBarcodeType(cleanBarcode),
            isPrimary: true,
          },
        ],
      });
      setShowNewProductModal(false);
      setNewProdName('');
      setNewProdBarcode('');
      await loadDashboardData();
      Alert.alert('✅ Producto Guardado', `"${cleanName}" creado en PostgreSQL.`);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo guardar el producto.');
    }
  };

  const handleAdjustStockManual = async () => {
    const target = adminProducts.find(
      (p) => p.barcode === adjustProductId.trim() || p.name.toLowerCase().includes(adjustProductId.trim().toLowerCase())
    );
    const qty = parseFloat(adjustQty);
    if (!target || isNaN(qty) || qty < 0 || !adjustReason.trim()) {
      Alert.alert('Datos Incompletos', 'Indique un producto existente (nombre o código), nueva cantidad y motivo.');
      return;
    }
    try {
      await MobileApiService.adjustStock(target.id, qty, adjustReason.trim());
      setAdjustProductId('');
      setAdjustQty('');
      setAdjustReason('');
      await loadDashboardData();
      Alert.alert('✅ Kardex Actualizado', `Stock de "${target.name}" ajustado a ${qty}.`);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo registrar el ajuste.');
    }
  };

  const handleApplyGlobalMargin = async () => {
    const margin = parseFloat(globalMargin);
    if (isNaN(margin) || margin <= 0) {
      Alert.alert('Margen Inválido', 'Ingrese un porcentaje mayor a 0.');
      return;
    }
    try {
      await MobileApiService.applyGlobalMargin(margin);
      await loadDashboardData();
      Alert.alert('✅ Margen Aplicado', `Margen del ${margin}% aplicado al catálogo en PostgreSQL.`);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo aplicar el margen.');
    }
  };

  const handleCreateSupplier = async () => {
    const cleanDoc = newSupRif.replace(/\D/g, '').trim();
    if (!newSupName.trim() || cleanDoc.length < 5 || newSupPhone.trim().length < 7) {
      Alert.alert('Datos Incompletos', 'Razón social, documento (mín. 5 dígitos) y teléfono son obligatorios.');
      return;
    }
    try {
      await MobileApiService.createSupplier({
        documentType: newSupDocType,
        documentNumber: cleanDoc,
        name: newSupName.trim(),
        phone: newSupPhone.trim(),
      });
      setNewSupName('');
      setNewSupRif('');
      setNewSupPhone('');
      await loadDashboardData();
      Alert.alert('✅ Proveedor Registrado', 'Proveedor guardado en el servidor.');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo crear el proveedor.');
    }
  };

  const handleCreateTenant = async () => {
    if (!newTenantBusinessName.trim() || newTenantDocNumber.trim().length < 5 || !newTenantPhone.trim() || !newTenantEmail.trim()) {
      Alert.alert('Datos Incompletos', 'Razón social, RIF (mín. 5 dígitos), teléfono y correo son obligatorios.');
      return;
    }
    const slug =
      newTenantSlug.trim() ||
      newTenantBusinessName
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 30);

    try {
      await MobileApiService.createTenant({
        slug,
        businessName: newTenantBusinessName.trim(),
        tradeName: newTenantTradeName.trim() || newTenantBusinessName.trim(),
        documentType: newTenantDocType,
        documentNumber: newTenantDocNumber.trim(),
        phone: newTenantPhone.trim(),
        email: newTenantEmail.trim(),
        isSpecialTaxpayer: newTenantIsSpecial,
        ...(newTenantAdminUser.trim() ? { adminUsername: newTenantAdminUser.trim() } : {}),
        ...(newTenantAdminPass.trim() ? { adminPassword: newTenantAdminPass.trim() } : {}),
      });
      setShowAddTenantModal(false);
      setNewTenantSlug('');
      setNewTenantBusinessName('');
      setNewTenantTradeName('');
      setNewTenantDocNumber('');
      setNewTenantPhone('');
      setNewTenantEmail('');
      setNewTenantAdminUser('');
      setNewTenantAdminPass('');
      await loadDashboardData();
      Alert.alert('✅ Negocio Creado', 'Comercio registrado y habilitado en PostgreSQL.');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo registrar el negocio.');
    }
  };

  const handleToggleTenant = async (id: string) => {
    try {
      await MobileApiService.toggleTenantActive(id);
      await loadDashboardData();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo cambiar el estado.');
    }
  };

  const handleChangePassword = async () => {
    if (!curPassword || !newPassword || newPassword !== confirmPassword) {
      Alert.alert('Validación', 'Verifica la contraseña actual y asegúrate que las nuevas coincidan.');
      return;
    }
    setChangingPwd(true);
    try {
      await MobileApiService.changePassword(curPassword, newPassword, confirmPassword);
      setCurPassword('');
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert('✅ Contraseña Actualizada', 'Tu contraseña se cambió de forma segura.');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo actualizar la contraseña.');
    } finally {
      setChangingPwd(false);
    }
  };

  const totalCostValuation = adminProducts.reduce((acc, p) => acc + p.costPriceUsd * p.stock, 0);
  const totalRetailValuation = adminProducts.reduce((acc, p) => acc + p.salePriceUsd * p.stock, 0);
  const avgMarginPct =
    totalRetailValuation > 0
      ? (((totalRetailValuation - totalCostValuation) / totalRetailValuation) * 100).toFixed(1)
      : '0.0';
  const lowStockItems = adminProducts.filter((p) => p.stock <= p.minStock);

  const navItems = [
    ...(isSuperAdmin ? [{ id: 'TENANTS', label: '👑 Negocios' }] : []),
    ...(hasTenantContext
      ? [
          { id: 'STOCK', label: 'Stock ($)' },
          { id: 'SALES', label: 'Ventas' },
          { id: 'SUPPLIERS', label: 'Proveed.' },
          { id: 'ORDERS', label: 'Pedidos' },
          { id: 'DEBTS', label: 'Cobros' },
          { id: 'RATES', label: 'Tasas/Fiscal' },
          { id: 'USERS', label: 'Cajeros' },
        ]
      : []),
    { id: 'SECURITY', label: 'Cuenta' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={VUELTO_COLORS.deep} />

      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Image
              source={require('../../../assets/vuelto-icon.jpg')}
              style={{ width: 28, height: 28, borderRadius: 7 }}
            />
            <Text style={styles.title}>VUELTO ADMIN</Text>
            <View style={styles.adminPill}>
              <Text style={styles.adminPillText}>{isSuperAdmin ? 'SUPER ADMIN' : 'ADMIN'}</Text>
            </View>
          </View>
          <Text style={styles.subtitle}>
            {user?.businessName || 'Plataforma Central'} • {user?.fullName}
          </Text>
        </View>

        <View style={styles.headerRight}>
          {hasTenantContext && (
            <TouchableOpacity style={styles.posSwitchBtn} onPress={() => toggleMode('POS')}>
              <Text style={styles.posSwitchBtnText}>Ir a POS</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={() => {
              Alert.alert('Cerrar Sesión', '¿Deseas salir de tu cuenta?', [
                { text: 'Cancelar', style: 'cancel' },
                {
                  text: 'Salir',
                  style: 'destructive',
                  onPress: () => MobileApiService.logout(refreshToken),
                },
              ]);
            }}
          >
            <Text style={styles.logoutBtnText}>Salir</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Navegación */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.navBarScroll}>
        <View style={styles.navBar}>
          {navItems.map((sec) => (
            <TouchableOpacity
              key={sec.id}
              style={[styles.navItem, activeSection === sec.id && styles.navItemActive]}
              onPress={() => setActiveSection(sec.id as any)}
            >
              <Text style={[styles.navText, activeSection === sec.id && styles.navTextActive]}>
                {sec.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {loadingData && (
        <View style={{ paddingVertical: 8, alignItems: 'center' }}>
          <ActivityIndicator color={VUELTO_COLORS.turquoise} size="small" />
        </View>
      )}

      <ScrollView style={styles.content}>
        {/* TENANTS (SUPER ADMIN) */}
        {activeSection === 'TENANTS' && isSuperAdmin && (
          <View>
            <Text style={styles.sectionTitle}>👑 Súper Administrador Global</Text>
            <Text style={styles.sectionDesc}>
              Control multi-tenant en PostgreSQL: crea comercios y habilita o suspende accesos.
            </Text>

            <View style={styles.kpiRow}>
              <View style={styles.kpiCard}>
                <Text style={styles.kpiLabel}>Total Negocios</Text>
                <Text style={styles.kpiValue}>{tenantsList.length}</Text>
              </View>
              <View style={styles.kpiCard}>
                <Text style={styles.kpiLabel}>Activos</Text>
                <Text style={[styles.kpiValue, { color: VUELTO_COLORS.turquoise }]}>
                  {tenantsList.filter((t) => t.isActive).length}
                </Text>
              </View>
            </View>

            <TouchableOpacity style={styles.primaryBtn} onPress={() => setShowAddTenantModal(true)}>
              <Text style={styles.primaryBtnText}>➕ Crear Nuevo Negocio (Tenant)</Text>
            </TouchableOpacity>

            <View style={styles.card}>
              <Text style={styles.cardHeader}>Directorio de Comercios</Text>
              {tenantsList.length === 0 ? (
                <Text style={styles.emptyText}>No hay comercios registrados aún.</Text>
              ) : (
                tenantsList.map((tenant) => (
                  <View key={tenant.id} style={styles.listRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemTitle}>{tenant.tradeName || tenant.businessName}</Text>
                      <Text style={styles.itemSub}>
                        {tenant.documentType}-{tenant.documentNumber} • {tenant.phone}
                      </Text>
                      <Text style={{ color: tenant.isActive ? VUELTO_COLORS.turquoise : '#FCA5A5', fontSize: 10, fontWeight: '800', marginTop: 2 }}>
                        {tenant.isActive ? '● ACTIVO' : '● SUSPENDIDO'}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.badgeBtn, tenant.isActive ? styles.badgeBtnDanger : styles.badgeBtnOk]}
                      onPress={() => handleToggleTenant(tenant.id)}
                    >
                      <Text style={styles.badgeBtnText}>{tenant.isActive ? 'Suspender' : 'Activar'}</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>
          </View>
        )}

        {/* STOCK */}
        {activeSection === 'STOCK' && hasTenantContext && (
          <View>
            <Text style={styles.sectionTitle}>Control de Inventario & Márgenes</Text>

            <View style={styles.kpiRow}>
              <View style={styles.kpiCard}>
                <Text style={styles.kpiLabel}>Valuación Costo</Text>
                <Text style={styles.kpiValue}>${totalCostValuation.toFixed(2)}</Text>
              </View>
              <View style={styles.kpiCard}>
                <Text style={styles.kpiLabel}>Margen Promedio</Text>
                <Text style={[styles.kpiValue, { color: VUELTO_COLORS.turquoise }]}>+{avgMarginPct}%</Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
              <TouchableOpacity
                style={[styles.secondaryBtn, { flex: 1 }]}
                onPress={() => {
                  setScannerMode('ADJUST_STOCK');
                  setShowAdminScanner(true);
                }}
              >
                <Text style={styles.secondaryBtnText}>📷 Escanear Stock</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryBtn, { flex: 1, marginBottom: 0 }]}
                onPress={() => setShowNewProductModal(true)}
              >
                <Text style={styles.primaryBtnText}>➕ Nuevo Producto</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardHeader}>Margen de Ganancia Global (%)</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TextInput
                  style={[styles.input, { width: 72, marginBottom: 0, textAlign: 'center', color: VUELTO_COLORS.turquoise, fontWeight: '800' }]}
                  value={globalMargin}
                  onChangeText={setGlobalMargin}
                  keyboardType="numeric"
                />
                <Text style={{ color: VUELTO_COLORS.turquoise, fontWeight: '800' }}>%</Text>
                <TouchableOpacity style={[styles.primaryBtn, { flex: 1, marginBottom: 0 }]} onPress={handleApplyGlobalMargin}>
                  <Text style={styles.primaryBtnText}>⚡ Aplicar a Todo</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardHeader}>Catálogo Real ({adminProducts.length})</Text>
              {adminProducts.length === 0 ? (
                <Text style={styles.emptyText}>No hay productos cargados todavía.</Text>
              ) : (
                adminProducts.map((p) => {
                  const profitUsd = p.salePriceUsd - p.costPriceUsd;
                  const marginPct = p.salePriceUsd > 0 ? ((profitUsd / p.salePriceUsd) * 100).toFixed(1) : '0.0';
                  return (
                    <View key={p.id} style={styles.listRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.itemTitle}>{p.name}</Text>
                        <Text style={styles.itemSub}>
                          {p.barcode} • Costo: ${p.costPriceUsd.toFixed(2)} • Venta: ${p.salePriceUsd.toFixed(2)} • Stock: {p.stock}
                        </Text>
                      </View>
                      <View style={styles.profitPill}>
                        <Text style={styles.profitPillVal}>+${profitUsd.toFixed(2)}</Text>
                        <Text style={styles.profitPillPct}>+{marginPct}%</Text>
                      </View>
                    </View>
                  );
                })
              )}
            </View>

            {lowStockItems.length > 0 && (
              <View style={[styles.card, { borderColor: VUELTO_COLORS.danger }]}>
                <Text style={[styles.cardHeader, { color: '#FCA5A5' }]}>⚠️ Stock Bajo ({lowStockItems.length})</Text>
                {lowStockItems.map((it) => (
                  <View key={it.id} style={styles.listRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemTitle}>{it.name}</Text>
                      <Text style={{ color: '#FCA5A5', fontSize: 11 }}>
                        Stock: {it.stock} (Mín: {it.minStock})
                      </Text>
                    </View>
                    {it.supplierPhone ? (
                      <TouchableOpacity
                        style={styles.badgeBtnOk}
                        onPress={() => {
                          const msg = `Hola ${it.supplier}, necesitamos reposición de ${it.name}.`;
                          Linking.openURL(`https://wa.me/${it.supplierPhone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`);
                        }}
                      >
                        <Text style={styles.badgeBtnText}>WhatsApp</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                ))}
              </View>
            )}

            <View style={styles.card}>
              <Text style={styles.cardHeader}>Ajuste Manual de Kardex</Text>
              <TextInput
                style={styles.input}
                placeholder="Código de barra o nombre del producto"
                placeholderTextColor={VUELTO_COLORS.subtle}
                value={adjustProductId}
                onChangeText={setAdjustProductId}
              />
              <TextInput
                style={styles.input}
                placeholder="Nueva cantidad contada"
                placeholderTextColor={VUELTO_COLORS.subtle}
                keyboardType="numeric"
                value={adjustQty}
                onChangeText={setAdjustQty}
              />
              <TextInput
                style={styles.input}
                placeholder="Motivo del ajuste (auditoría)"
                placeholderTextColor={VUELTO_COLORS.subtle}
                value={adjustReason}
                onChangeText={setAdjustReason}
              />
              <TouchableOpacity style={styles.primaryBtn} onPress={handleAdjustStockManual}>
                <Text style={styles.primaryBtnText}>Registrar Ajuste en Kardex</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* VENTAS */}
        {activeSection === 'SALES' && hasTenantContext && (
          <View>
            <Text style={styles.sectionTitle}>Facturas Emitidas</Text>
            {salesList.length === 0 ? (
              <View style={styles.card}>
                <Text style={styles.emptyText}>No hay facturas registradas aún.</Text>
              </View>
            ) : (
              salesList.map((s: any) => (
                <View key={s.id} style={styles.card}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ color: VUELTO_COLORS.turquoise, fontWeight: '800', fontSize: 15 }}>
                      {s.invoiceFormattedNumber || s.invoiceNumber}
                    </Text>
                    <Text style={{ color: VUELTO_COLORS.muted, fontSize: 11 }}>
                      {s.createdAt ? new Date(s.createdAt).toLocaleString('es-VE') : ''}
                    </Text>
                  </View>
                  <Text style={styles.itemSub}>Cliente: {s.customerName || 'Consumidor Final'}</Text>
                  <Text style={{ color: VUELTO_COLORS.white, fontSize: 16, fontWeight: '800', marginVertical: 4 }}>
                    ${parseFloat(s.totalAmountUsd || '0').toFixed(2)} USD ({parseFloat(s.totalAmountBs || '0').toFixed(2)} Bs)
                  </Text>
                  <TouchableOpacity
                    style={styles.secondaryBtn}
                    onPress={async () => {
                      if (!accessToken || !s.id) return;
                      await NativeShareService.shareInvoice({
                        saleId: s.id,
                        invoiceNumber: s.invoiceFormattedNumber || 'FACT',
                        businessName: user?.businessName || 'Vuelto',
                        pdfDownloadUrl: `${API_BASE_URL}/sales/${s.id}/receipt/pdf`,
                        jwtToken: accessToken,
                      });
                    }}
                  >
                    <Text style={styles.secondaryBtnText}>📲 Compartir PDF</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        )}

        {/* PROVEEDORES */}
        {activeSection === 'SUPPLIERS' && hasTenantContext && (
          <View>
            <Text style={styles.sectionTitle}>Proveedores</Text>
            <View style={styles.card}>
              <Text style={styles.cardHeader}>Nuevo Proveedor</Text>
              <View style={{ flexDirection: 'row', gap: 6, marginBottom: 10 }}>
                {(['J', 'G', 'V', 'E'] as const).map((dt) => (
                  <TouchableOpacity
                    key={dt}
                    style={[styles.chipBtn, newSupDocType === dt && styles.chipBtnActive]}
                    onPress={() => setNewSupDocType(dt)}
                  >
                    <Text style={[styles.chipText, newSupDocType === dt && styles.chipTextActive]}>{dt}</Text>
                  </TouchableOpacity>
                ))}
                <TextInput
                  style={[styles.input, { flex: 1, marginBottom: 0 }]}
                  placeholder="RIF / C.I."
                  placeholderTextColor={VUELTO_COLORS.subtle}
                  keyboardType="numeric"
                  value={newSupRif}
                  onChangeText={setNewSupRif}
                />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Razón Social"
                placeholderTextColor={VUELTO_COLORS.subtle}
                value={newSupName}
                onChangeText={setNewSupName}
              />
              <TextInput
                style={styles.input}
                placeholder="Teléfono WhatsApp"
                placeholderTextColor={VUELTO_COLORS.subtle}
                keyboardType="phone-pad"
                value={newSupPhone}
                onChangeText={setNewSupPhone}
              />
              <TouchableOpacity style={styles.primaryBtn} onPress={handleCreateSupplier}>
                <Text style={styles.primaryBtnText}>Guardar Proveedor</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardHeader}>Directorio ({suppliersList.length})</Text>
              {suppliersList.length === 0 ? (
                <Text style={styles.emptyText}>Sin proveedores registrados.</Text>
              ) : (
                suppliersList.map((sup: any) => (
                  <View key={sup.id} style={styles.listRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemTitle}>{sup.name}</Text>
                      <Text style={styles.itemSub}>
                        {sup.documentType}-{sup.documentNumber} • {sup.phone}
                      </Text>
                    </View>
                    {sup.phone ? (
                      <TouchableOpacity
                        style={styles.badgeBtnOk}
                        onPress={() => Linking.openURL(`https://wa.me/${String(sup.phone).replace(/\D/g, '')}`)}
                      >
                        <Text style={styles.badgeBtnText}>Chat</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                ))
              )}
            </View>
          </View>
        )}

        {/* PEDIDOS */}
        {activeSection === 'ORDERS' && hasTenantContext && (
          <View>
            <Text style={styles.sectionTitle}>Órdenes de Compra</Text>
            <View style={styles.card}>
              {ordersList.length === 0 ? (
                <Text style={styles.emptyText}>No hay órdenes de compra registradas.</Text>
              ) : (
                ordersList.map((ord: any) => (
                  <View key={ord.id} style={styles.listRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemTitle}>{ord.orderNumber || ord.id}</Text>
                      <Text style={styles.itemSub}>
                        Estado: {ord.status} • Total: ${parseFloat(ord.totalUsd || '0').toFixed(2)}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          </View>
        )}

        {/* COBROS */}
        {activeSection === 'DEBTS' && hasTenantContext && (
          <View>
            <Text style={styles.sectionTitle}>Cuentas por Cobrar</Text>
            <View style={styles.card}>
              {debtorsList.length === 0 ? (
                <Text style={styles.emptyText}>No hay clientes con saldo pendiente.</Text>
              ) : (
                debtorsList.map((d: any) => (
                  <View key={d.id} style={styles.listRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemTitle}>{d.name}</Text>
                      <Text style={styles.itemSub}>
                        Deuda: ${parseFloat(d.balanceDueUsd || d.balanceDue || '0').toFixed(2)} USD
                      </Text>
                    </View>
                    {d.phone ? (
                      <TouchableOpacity
                        style={styles.badgeBtnOk}
                        onPress={() => {
                          const msg = `Estimado(a) ${d.name}, le recordamos su saldo pendiente en ${user?.businessName}.`;
                          Linking.openURL(`https://wa.me/${String(d.phone).replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`);
                        }}
                      >
                        <Text style={styles.badgeBtnText}>Cobrar</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                ))
              )}
            </View>
          </View>
        )}

        {/* TASAS & FISCAL */}
        {activeSection === 'RATES' && hasTenantContext && (
          <View>
            <Text style={styles.sectionTitle}>Tasas de Cambio & Régimen Fiscal</Text>
            <View style={styles.card}>
              <Text style={styles.cardHeader}>Tasa de Cobro Activa</Text>
              {[
                { id: 'BCV', label: 'BCV Oficial', val: liveMonitorRates.bcv.toFixed(2) },
                { id: 'PARALELO', label: 'Monitor Paralelo', val: liveMonitorRates.paralelo.toFixed(2) },
                { id: 'EURO', label: 'Euro BCV', val: liveMonitorRates.euro.toFixed(2) },
                { id: 'CUSTOM', label: 'Tasa Personalizada', val: customRate },
              ].map((opt) => (
                <TouchableOpacity
                  key={opt.id}
                  style={[
                    styles.rateOption,
                    activeRateSource === opt.id && styles.rateOptionActive,
                  ]}
                  onPress={async () => {
                    setActiveRateSource(opt.id as any);
                    if (opt.id !== 'CUSTOM') {
                      try {
                        await MobileApiService.selectActiveRate(opt.id as any);
                        Alert.alert('✅ Tasa Actualizada', `Tasa activa fijada en ${opt.label}.`);
                      } catch (e: any) {
                        Alert.alert('Error', e.message);
                      }
                    }
                  }}
                >
                  <Text style={styles.itemTitle}>{opt.label}</Text>
                  <Text style={{ color: VUELTO_COLORS.turquoise, fontWeight: '800' }}>{opt.val} Bs</Text>
                </TouchableOpacity>
              ))}

              {activeRateSource === 'CUSTOM' && (
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                  <TextInput
                    style={[styles.input, { flex: 1, marginBottom: 0 }]}
                    keyboardType="numeric"
                    value={customRate}
                    onChangeText={setCustomRate}
                  />
                  <TouchableOpacity
                    style={[styles.primaryBtn, { marginBottom: 0, paddingHorizontal: 14 }]}
                    onPress={async () => {
                      try {
                        await MobileApiService.setManualRate(parseFloat(customRate) || 0);
                        Alert.alert('✅ Tasa Manual Guardada', `Tasa fijada en ${customRate} Bs.`);
                      } catch (e: any) {
                        Alert.alert('Error', e.message);
                      }
                    }}
                  >
                    <Text style={styles.primaryBtnText}>Guardar</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardHeader}>Régimen Fiscal</Text>
              <TouchableOpacity
                style={styles.rateOption}
                onPress={async () => {
                  const nextVal = !enableIva;
                  setEnableIva(nextVal);
                  await MobileApiService.updateConfig({ enableIva: nextVal }).catch(() => {});
                }}
              >
                <Text style={styles.itemTitle}>Cobro de IVA (16%)</Text>
                <Text style={{ color: enableIva ? VUELTO_COLORS.turquoise : VUELTO_COLORS.muted, fontWeight: '800' }}>
                  {enableIva ? 'ACTIVO' : 'INACTIVO'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.rateOption}
                onPress={async () => {
                  const nextVal = !enableIgtf;
                  setEnableIgtf(nextVal);
                  await MobileApiService.updateConfig({ enableIgtf: nextVal }).catch(() => {});
                }}
              >
                <Text style={styles.itemTitle}>Cobro de IGTF (3%)</Text>
                <Text style={{ color: enableIgtf ? VUELTO_COLORS.warning : VUELTO_COLORS.muted, fontWeight: '800' }}>
                  {enableIgtf ? 'ACTIVO' : 'INACTIVO'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* CAJEROS */}
        {activeSection === 'USERS' && hasTenantContext && (
          <View>
            <Text style={styles.sectionTitle}>Supervisión de Vendedores en Vivo</Text>
            <View style={styles.card}>
              {cashiersList.length === 0 ? (
                <Text style={styles.emptyText}>No hay usuarios registrados en este comercio.</Text>
              ) : (
                cashiersList.map((c: any) => (
                  <View key={c.id} style={styles.listRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemTitle}>
                        {c.username} ({c.name})
                      </Text>
                      <Text style={styles.itemSub}>
                        {c.roleId} • {c.status} • Ventas hoy: {c.salesTodayCount} (${Number(c.salesTodayUsd || 0).toFixed(2)})
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          </View>
        )}

        {/* CUENTA Y SEGURIDAD */}
        {activeSection === 'SECURITY' && (
          <View>
            <Text style={styles.sectionTitle}>Mi Cuenta & Seguridad</Text>
            <View style={styles.card}>
              <Text style={styles.cardHeader}>Cambiar Contraseña</Text>
              <TextInput
                style={styles.input}
                placeholder="Contraseña actual"
                placeholderTextColor={VUELTO_COLORS.subtle}
                secureTextEntry
                value={curPassword}
                onChangeText={setCurPassword}
              />
              <TextInput
                style={styles.input}
                placeholder="Nueva contraseña (mín. 8 caracteres, mayús/minús/núm)"
                placeholderTextColor={VUELTO_COLORS.subtle}
                secureTextEntry
                value={newPassword}
                onChangeText={setNewPassword}
              />
              <TextInput
                style={styles.input}
                placeholder="Confirmar nueva contraseña"
                placeholderTextColor={VUELTO_COLORS.subtle}
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
              <TouchableOpacity style={styles.primaryBtn} disabled={changingPwd} onPress={handleChangePassword}>
                <Text style={styles.primaryBtnText}>
                  {changingPwd ? 'Actualizando...' : 'Actualizar Contraseña'}
                </Text>
              </TouchableOpacity>
            </View>

            {onShowOnboarding && (
              <View style={styles.card}>
                <Text style={styles.cardHeader}>Ayuda e Introducción</Text>
                <TouchableOpacity style={styles.secondaryBtn} onPress={onShowOnboarding}>
                  <Text style={styles.secondaryBtnText}>❓ Ver Presentación Inicial (Onboarding)</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* MODAL CREAR TENANT */}
      <Modal visible={showAddTenantModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>👑 Registrar Nuevo Negocio</Text>
            <ScrollView style={{ maxHeight: 400 }}>
              <TextInput
                style={styles.input}
                placeholder="Razón Social *"
                placeholderTextColor={VUELTO_COLORS.subtle}
                value={newTenantBusinessName}
                onChangeText={setNewTenantBusinessName}
              />
              <TextInput
                style={styles.input}
                placeholder="Nombre Comercial"
                placeholderTextColor={VUELTO_COLORS.subtle}
                value={newTenantTradeName}
                onChangeText={setNewTenantTradeName}
              />
              <TextInput
                style={styles.input}
                placeholder="Slug (opcional, ej. bodega-sol)"
                placeholderTextColor={VUELTO_COLORS.subtle}
                autoCapitalize="none"
                value={newTenantSlug}
                onChangeText={setNewTenantSlug}
              />
              <View style={{ flexDirection: 'row', gap: 6, marginBottom: 10 }}>
                {(['J', 'V', 'G', 'E'] as const).map((dt) => (
                  <TouchableOpacity
                    key={dt}
                    style={[styles.chipBtn, newTenantDocType === dt && styles.chipBtnActive]}
                    onPress={() => setNewTenantDocType(dt)}
                  >
                    <Text style={[styles.chipText, newTenantDocType === dt && styles.chipTextActive]}>{dt}</Text>
                  </TouchableOpacity>
                ))}
                <TextInput
                  style={[styles.input, { flex: 1, marginBottom: 0 }]}
                  placeholder="RIF *"
                  placeholderTextColor={VUELTO_COLORS.subtle}
                  keyboardType="numeric"
                  value={newTenantDocNumber}
                  onChangeText={setNewTenantDocNumber}
                />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Teléfono *"
                placeholderTextColor={VUELTO_COLORS.subtle}
                keyboardType="phone-pad"
                value={newTenantPhone}
                onChangeText={setNewTenantPhone}
              />
              <TextInput
                style={styles.input}
                placeholder="Correo *"
                placeholderTextColor={VUELTO_COLORS.subtle}
                autoCapitalize="none"
                value={newTenantEmail}
                onChangeText={setNewTenantEmail}
              />
              <TextInput
                style={styles.input}
                placeholder="Usuario admin inicial (opcional)"
                placeholderTextColor={VUELTO_COLORS.subtle}
                autoCapitalize="none"
                value={newTenantAdminUser}
                onChangeText={setNewTenantAdminUser}
              />
              <TextInput
                style={styles.input}
                placeholder="Clave admin inicial (mín. 8 chars, opcional)"
                placeholderTextColor={VUELTO_COLORS.subtle}
                secureTextEntry
                value={newTenantAdminPass}
                onChangeText={setNewTenantAdminPass}
              />
              <TouchableOpacity
                style={styles.rateOption}
                onPress={() => setNewTenantIsSpecial(!newTenantIsSpecial)}
              >
                <Text style={styles.itemTitle}>Contribuyente Especial (IGTF 3%)</Text>
                <Text style={{ color: VUELTO_COLORS.turquoise, fontWeight: '800' }}>
                  {newTenantIsSpecial ? 'SÍ' : 'NO'}
                </Text>
              </TouchableOpacity>
            </ScrollView>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              <TouchableOpacity
                style={[styles.cancelModalBtn, { flex: 1 }]}
                onPress={() => setShowAddTenantModal(false)}
              >
                <Text style={styles.cancelModalBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryBtn, { flex: 1, marginBottom: 0 }]}
                onPress={handleCreateTenant}
              >
                <Text style={styles.primaryBtnText}>Crear Negocio</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ESCÁNER ADMIN */}
      <BarcodeScannerModal
        visible={showAdminScanner}
        onClose={() => setShowAdminScanner(false)}
        onScanned={handleAdminScanned}
        continuous={false}
        title={scannerMode === 'ADJUST_STOCK' ? 'Escanear para Ajustar Stock' : 'Escanear Código de Barras'}
      />

      {/* MODAL AJUSTE RÁPIDO STOCK */}
      <Modal visible={showQuickAdjustModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>📦 Ajustar Stock</Text>
            {scannedProductForAdjustment && (
              <Text style={styles.sectionDesc}>
                {scannedProductForAdjustment.name} (Actual: {scannedProductForAdjustment.stock})
              </Text>
            )}
            <TextInput
              style={[styles.input, { textAlign: 'center', fontSize: 18, fontWeight: '800' }]}
              keyboardType="numeric"
              value={quickStockAmount}
              onChangeText={setQuickStockAmount}
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity style={[styles.cancelModalBtn, { flex: 1 }]} onPress={() => setShowQuickAdjustModal(false)}>
                <Text style={styles.cancelModalBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.primaryBtn, { flex: 1, marginBottom: 0 }]} onPress={handleSaveQuickStockAdjustment}>
                <Text style={styles.primaryBtnText}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL NUEVO PRODUCTO */}
      <Modal visible={showNewProductModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>➕ Nuevo Producto</Text>
            <ScrollView style={{ maxHeight: 380 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Código de barras *"
                  placeholderTextColor={VUELTO_COLORS.subtle}
                  value={newProdBarcode}
                  onChangeText={setNewProdBarcode}
                />
                <TouchableOpacity
                  style={[styles.secondaryBtn, { marginBottom: 10, justifyContent: 'center' }]}
                  onPress={() => {
                    setScannerMode('NEW_PRODUCT_BARCODE');
                    setShowAdminScanner(true);
                  }}
                >
                  <Text style={styles.secondaryBtnText}>📷</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.input}
                placeholder="Nombre del producto *"
                placeholderTextColor={VUELTO_COLORS.subtle}
                value={newProdName}
                onChangeText={setNewProdName}
              />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Costo $"
                  placeholderTextColor={VUELTO_COLORS.subtle}
                  keyboardType="numeric"
                  value={newProdCost}
                  onChangeText={setNewProdCost}
                />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Venta $"
                  placeholderTextColor={VUELTO_COLORS.subtle}
                  keyboardType="numeric"
                  value={newProdSale}
                  onChangeText={setNewProdSale}
                />
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Stock inicial"
                  placeholderTextColor={VUELTO_COLORS.subtle}
                  keyboardType="numeric"
                  value={newProdStock}
                  onChangeText={setNewProdStock}
                />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Stock mínimo"
                  placeholderTextColor={VUELTO_COLORS.subtle}
                  keyboardType="numeric"
                  value={newProdMinStock}
                  onChangeText={setNewProdMinStock}
                />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Unidad (UNIDAD, KG, PAQUETE...)"
                placeholderTextColor={VUELTO_COLORS.subtle}
                value={newProdUnit}
                onChangeText={setNewProdUnit}
              />
            </ScrollView>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
              <TouchableOpacity style={[styles.cancelModalBtn, { flex: 1 }]} onPress={() => setShowNewProductModal(false)}>
                <Text style={styles.cancelModalBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.primaryBtn, { flex: 1, marginBottom: 0 }]} onPress={handleSaveNewAdminProduct}>
                <Text style={styles.primaryBtnText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  title: { color: VUELTO_COLORS.white, fontSize: 17, fontWeight: '800', letterSpacing: 0.6 },
  subtitle: { color: VUELTO_COLORS.muted, fontSize: 11, marginTop: 2 },
  adminPill: {
    backgroundColor: 'rgba(0, 230, 195, 0.14)',
    borderWidth: 1,
    borderColor: VUELTO_COLORS.turquoise,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  adminPillText: { color: VUELTO_COLORS.turquoise, fontSize: 9, fontWeight: '800' },
  headerRight: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  posSwitchBtn: {
    backgroundColor: VUELTO_COLORS.turquoise,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  posSwitchBtnText: { color: VUELTO_COLORS.night, fontWeight: '800', fontSize: 11 },
  logoutBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: VUELTO_COLORS.borderMuted,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  logoutBtnText: { color: VUELTO_COLORS.muted, fontWeight: '700', fontSize: 11 },

  navBarScroll: { maxHeight: 48, backgroundColor: '#08182E', borderBottomWidth: 1, borderBottomColor: VUELTO_COLORS.borderMuted },
  navBar: { flexDirection: 'row', paddingHorizontal: 10, alignItems: 'center', gap: 8, paddingVertical: 6 },
  navItem: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: VUELTO_COLORS.deep,
    borderWidth: 1,
    borderColor: VUELTO_COLORS.borderMuted,
  },
  navItemActive: { backgroundColor: VUELTO_COLORS.turquoise, borderColor: VUELTO_COLORS.turquoise },
  navText: { color: VUELTO_COLORS.muted, fontSize: 12, fontWeight: '700' },
  navTextActive: { color: VUELTO_COLORS.night, fontWeight: '800' },

  content: { flex: 1, padding: 14 },
  sectionTitle: { color: VUELTO_COLORS.white, fontSize: 18, fontWeight: '800', marginBottom: 4 },
  sectionDesc: { color: VUELTO_COLORS.muted, fontSize: 12, marginBottom: 12, lineHeight: 17 },
  kpiRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  kpiCard: {
    flex: 1,
    backgroundColor: VUELTO_COLORS.deep,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: VUELTO_COLORS.border,
  },
  kpiLabel: { color: VUELTO_COLORS.muted, fontSize: 11, fontWeight: '700' },
  kpiValue: { color: VUELTO_COLORS.white, fontSize: 20, fontWeight: '800', marginTop: 4 },

  card: {
    backgroundColor: VUELTO_COLORS.deep,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: VUELTO_COLORS.borderMuted,
    marginBottom: 14,
  },
  cardHeader: { color: VUELTO_COLORS.white, fontSize: 14, fontWeight: '800', marginBottom: 10 },
  emptyText: { color: VUELTO_COLORS.muted, fontSize: 12, textAlign: 'center', paddingVertical: 12 },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: VUELTO_COLORS.borderMuted,
    gap: 8,
  },
  itemTitle: { color: VUELTO_COLORS.white, fontSize: 13, fontWeight: '700' },
  itemSub: { color: VUELTO_COLORS.muted, fontSize: 11, marginTop: 2 },
  profitPill: {
    backgroundColor: 'rgba(0, 230, 195, 0.12)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: 'flex-end',
  },
  profitPillVal: { color: VUELTO_COLORS.turquoise, fontSize: 11, fontWeight: '800' },
  profitPillPct: { color: VUELTO_COLORS.teal, fontSize: 10, fontWeight: '700' },

  primaryBtn: {
    backgroundColor: VUELTO_COLORS.turquoise,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryBtnText: { color: VUELTO_COLORS.night, fontWeight: '800', fontSize: 13 },
  secondaryBtn: {
    backgroundColor: VUELTO_COLORS.night,
    borderWidth: 1,
    borderColor: VUELTO_COLORS.border,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  secondaryBtnText: { color: VUELTO_COLORS.turquoise, fontWeight: '800', fontSize: 12 },
  input: {
    backgroundColor: VUELTO_COLORS.night,
    borderWidth: 1,
    borderColor: VUELTO_COLORS.borderMuted,
    color: VUELTO_COLORS.white,
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    fontSize: 13,
  },
  chipBtn: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: VUELTO_COLORS.night,
    borderWidth: 1,
    borderColor: VUELTO_COLORS.borderMuted,
  },
  chipBtnActive: { backgroundColor: VUELTO_COLORS.turquoise, borderColor: VUELTO_COLORS.turquoise },
  chipText: { color: VUELTO_COLORS.muted, fontWeight: '800' },
  chipTextActive: { color: VUELTO_COLORS.night },
  badgeBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  badgeBtnOk: {
    backgroundColor: 'rgba(0, 230, 195, 0.16)',
    borderWidth: 1,
    borderColor: VUELTO_COLORS.turquoise,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  badgeBtnDanger: {
    backgroundColor: VUELTO_COLORS.dangerBg,
    borderWidth: 1,
    borderColor: VUELTO_COLORS.danger,
  },
  badgeBtnText: { color: VUELTO_COLORS.white, fontSize: 11, fontWeight: '700' },

  rateOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    backgroundColor: VUELTO_COLORS.night,
    borderWidth: 1,
    borderColor: VUELTO_COLORS.borderMuted,
    marginBottom: 8,
  },
  rateOptionActive: { borderColor: VUELTO_COLORS.turquoise, backgroundColor: 'rgba(0, 230, 195, 0.1)' },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(3, 10, 20, 0.84)',
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
  modalTitle: { color: VUELTO_COLORS.white, fontSize: 18, fontWeight: '800', marginBottom: 12 },
  cancelModalBtn: {
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: VUELTO_COLORS.night,
    borderWidth: 1,
    borderColor: VUELTO_COLORS.borderMuted,
    alignItems: 'center',
  },
  cancelModalBtnText: { color: VUELTO_COLORS.muted, fontWeight: '700' },
});

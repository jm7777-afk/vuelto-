import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { useCartStore, CartLine } from '../../stores/cart.store';
import { useAuthStore } from '../../stores/auth.store';
import { NativeShareService } from '../../services/share.service';
import { MobileApiService } from '../../services/api.service';

// Clientes registrados en el sistema para consulta por C.I.
interface CustomerEntry {
  id: string;
  name: string;
  documentType: 'V' | 'E' | 'J' | 'G';
  documentNumber: string;
  phone?: string;
  balanceDue: number;
}

const KNOWN_CUSTOMERS: CustomerEntry[] = [
  { id: 'c0', name: 'Consumidor Final', documentType: 'V', documentNumber: '00000000', phone: '', balanceDue: 0 },
  { id: 'c1', name: 'Automercado Miranda C.A.', documentType: 'J', documentNumber: '401234567', phone: '+584121112233', balanceDue: 145.50 },
  { id: 'c2', name: 'Distribuidora Los Próceres', documentType: 'J', documentNumber: '309876543', phone: '+584149998877', balanceDue: 280.00 },
  { id: 'c3', name: 'María Corina Machado', documentType: 'V', documentNumber: '14523988', phone: '+584145556677', balanceDue: 0 },
];

// Catálogo base con unidad de medida según categoría
const DEFAULT_PRODUCTS = [
  {
    id: 'prod_harina_pan',
    name: 'Harina PAN Blanca 1kg',
    barcode: '7591001001019',
    unitOfMeasure: 'paquete',
    category: 'Alimentos',
    salePriceUsd: 1.25,
    taxRate: 0.0,
    isExempt: true,
    stock: 145,
  },
  {
    id: 'prod_arroz_primor',
    name: 'Arroz Primor Grano Entero 1kg',
    barcode: '7591003003035',
    unitOfMeasure: 'kg',
    category: 'Alimentos',
    salePriceUsd: 1.50,
    taxRate: 0.0,
    isExempt: true,
    stock: 82,
  },
  {
    id: 'prod_aceite_mazeite',
    name: 'Aceite de Maíz Mazeite 1L',
    barcode: '7591004004048',
    unitOfMeasure: 'L',
    category: 'Alimentos',
    salePriceUsd: 3.80,
    taxRate: 16.0,
    isExempt: false,
    stock: 4,
  },
  {
    id: 'prod_pepsi_cola',
    name: 'Refresco Pepsi Cola 1.5L',
    barcode: '7591002002026',
    unitOfMeasure: 'botella',
    category: 'Bebidas',
    salePriceUsd: 1.90,
    taxRate: 16.0,
    isExempt: false,
    stock: 35,
  },
];

export const PosCheckoutScreen: React.FC = () => {
  const { user, toggleMode, logout } = useAuthStore();
  const {
    activeLines,
    activeCustomer,
    frozenRate,
    heldCarts,
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

  // Estados de Modales
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [showQuickCustomerModal, setShowQuickCustomerModal] = useState(false);
  const [showHeldCartsModal, setShowHeldCartsModal] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [showPostSaleModal, setShowPostSaleModal] = useState(false);
  const [confirmedInvoice, setConfirmedInvoice] = useState<any>(null);

  // Catálogo y Búsqueda
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogProducts, setCatalogProducts] = useState(DEFAULT_PRODUCTS);
  const [quickBarcodeInput, setQuickBarcodeInput] = useState('');

  // Formulario de Cliente Rápido con Búsqueda por C.I.
  const [docType, setDocType] = useState<'V' | 'E' | 'J' | 'G'>('V');
  const [docNumber, setDocNumber] = useState('');
  const [customerFirstName, setCustomerFirstName] = useState('');
  const [customerLastName, setCustomerLastName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerSearchMsg, setCustomerSearchMsg] = useState<{ type: 'success' | 'warning' | null; text: string }>({
    type: null,
    text: '',
  });

  // Selector de Vuelto y Pago
  const [paymentCurrency, setPaymentCurrency] = useState<'USD_CASH' | 'BS_PAGO_MOVIL' | 'BS_BIOPAGO'>('USD_CASH');
  const [vueltoType, setVueltoType] = useState<'WALLET_CREDIT' | 'CHANGE_VOUCHER' | 'PAGO_MOVIL' | 'CASH'>('WALLET_CREDIT');
  const [vueltoAmount, setVueltoAmount] = useState('0');

  const rate = frozenRate || 52.50;
  const isVendedor = user?.roleId === 'VENDEDOR';
  const isAdmin = user?.roleId === 'ADMIN' || user?.roleId === 'SUPER_ADMIN';

  // Intentar cargar productos desde la API en vivo
  useEffect(() => {
    async function loadLiveProducts() {
      try {
        const token = 'system_token';
        const res = await MobileApiService.getProducts(token);
        if (res && Array.isArray(res.products) && res.products.length > 0) {
          const mapped = res.products.map((p: any) => ({
            id: p.id,
            name: p.name,
            barcode: p.barcode,
            salePriceUsd: parseFloat(p.salePriceUsd) || 1.0,
            taxRate: parseFloat(p.taxRate) || 0,
            isExempt: p.isExempt ?? false,
            stock: p.stock ?? 50,
          }));
          setCatalogProducts(mapped);
        }
      } catch {
        // Mantiene DEFAULT_PRODUCTS locales
      }
    }
    loadLiveProducts();
  }, []);

  // Escaneo de código de barra con fallback inteligente por nombre / SKU
  const handleScanOrSearch = () => {
    const query = quickBarcodeInput.trim();
    if (!query) {
      Alert.alert('Escáner / Búsqueda', 'Ingrese o escanee un código de barra o nombre de producto.');
      return;
    }

    // 1. Coincidencia exacta por código de barra
    const exactBarcode = catalogProducts.find((p) => p.barcode === query);
    if (exactBarcode) {
      addProduct({
        id: exactBarcode.id,
        name: exactBarcode.name,
        barcode: exactBarcode.barcode,
        salePriceUsd: exactBarcode.salePriceUsd,
        taxRate: exactBarcode.taxRate,
        isExempt: exactBarcode.isExempt,
        unitOfMeasure: (exactBarcode as any).unitOfMeasure,
      });
      setQuickBarcodeInput('');
      Alert.alert('✅ Producto Escaneado', `${exactBarcode.name} agregado al carrito.`);
      return;
    }

    // 2. Fallback: búsqueda por SKU o coincidencia en el nombre
    const lower = query.toLowerCase();
    const matches = catalogProducts.filter(
      (p) =>
        p.barcode.includes(query) ||
        p.id.toLowerCase().includes(lower) ||
        p.name.toLowerCase().includes(lower)
    );

    if (matches.length === 1) {
      const match = matches[0];
      addProduct({
        id: match.id,
        name: match.name,
        barcode: match.barcode,
        salePriceUsd: match.salePriceUsd,
        taxRate: match.taxRate,
        isExempt: match.isExempt,
        unitOfMeasure: (match as any).unitOfMeasure,
      });
      setQuickBarcodeInput('');
      Alert.alert('🔍 Coincidencia Encontrada', `${match.name} agregado al carrito.`);
    } else if (matches.length > 1) {
      // Múltiples coincidencias: abrir catálogo pre-filtrado
      setCatalogSearch(query);
      setShowCatalogModal(true);
      setQuickBarcodeInput('');
    } else {
      Alert.alert(
        '⚠️ No Encontrado',
        `No se encontró ningún producto con código "${query}". Verifique el código o abra el catálogo manual.`
      );
    }
  };

  // Consultar Cliente Registrado por Cédula / RIF
  const handleSearchCustomerByCi = () => {
    const cleanNum = docNumber.trim();
    if (!cleanNum) {
      Alert.alert('Cédula Requerida', 'Por favor ingrese el número de cédula o RIF a consultar.');
      return;
    }

    const found = KNOWN_CUSTOMERS.find(
      (c) => c.documentType === docType && c.documentNumber === cleanNum
    );

    if (found) {
      const nameParts = found.name.split(' ');
      setCustomerFirstName(nameParts[0] || '');
      setCustomerLastName(nameParts.slice(1).join(' ') || '');
      setCustomerPhone(found.phone || '');
      setCustomerSearchMsg({
        type: 'success',
        text: `✅ Cliente registrado: ${found.name}`,
      });
    } else {
      setCustomerFirstName('');
      setCustomerLastName('');
      setCustomerPhone('');
      setCustomerSearchMsg({
        type: 'warning',
        text: `⚠️ Cédula no registrada (${docType}-${cleanNum}). Ingrese Nombre, Apellido y Teléfono para afiliar:`,
      });
    }
  };

  // Registrar cliente rápido (Nombre, Apellido, Teléfono) y asignar al carrito
  const handleSaveQuickCustomer = () => {
    const cleanNum = docNumber.trim();
    const cleanFirst = customerFirstName.trim();
    const cleanLast = customerLastName.trim();

    if (!cleanNum || !cleanFirst) {
      Alert.alert('Datos Incompletos', 'El documento y al menos el primer nombre son obligatorios.');
      return;
    }

    const fullName = cleanLast ? `${cleanFirst} ${cleanLast}` : cleanFirst;

    const newCustomer = {
      id: `c_${Date.now()}`,
      name: fullName,
      documentType: docType,
      documentNumber: cleanNum,
      phone: customerPhone.trim(),
      balanceDue: 0,
    };

    // Agregar a clientes conocidos para futuras consultas en la sesión
    KNOWN_CUSTOMERS.push(newCustomer);

    setCustomer(newCustomer);
    setShowQuickCustomerModal(false);
    setDocNumber('');
    setCustomerFirstName('');
    setCustomerLastName('');
    setCustomerPhone('');
    setCustomerSearchMsg({ type: null, text: '' });
  };

  // Agregar otra venta paralela (+ Otra Venta) sin perder la actual
  const handleCreateAnotherSale = () => {
    if (activeLines.length > 0) {
      const label = activeCustomer
        ? activeCustomer.name.split(' ')[0]
        : `Venta #${heldCarts.length + 1}`;
      const res = parkCurrentCart(label);
      if (res.success) {
        Alert.alert(
          'Venta Pausada en Fichero',
          `La venta de ${label} fue guardada en el fichero superior. Carrito listo para el nuevo cliente.`
        );
      } else {
        Alert.alert('Aviso', res.error || 'No se pudo pausar la venta.');
      }
    } else {
      clearActiveCart();
      Alert.alert('Nueva Venta', 'Venta limpia lista para registrar productos.');
    }
  };

  // Confirmar Venta Atómica con Reglas SENIAT
  const handleConfirmSale = () => {
    const totalUsd = getTotalUsd();
    // IGTF 3% solo sobre divisas en efectivo
    const igtf3 = paymentCurrency === 'USD_CASH' ? totalUsd * 0.03 : 0;
    const finalTotalUsd = totalUsd + igtf3;
    const finalTotalBs = finalTotalUsd * rate;
    const invoiceNum = `A-${Math.floor(100000 + Math.random() * 900000)}`;

    const result = {
      invoiceNumber: invoiceNum,
      customerName: activeCustomer ? activeCustomer.name : 'Consumidor Final',
      customerDoc: activeCustomer ? `${activeCustomer.documentType}-${activeCustomer.documentNumber}` : 'V-00000000',
      totalUsd: finalTotalUsd.toFixed(2),
      totalBs: finalTotalBs.toFixed(2),
      subtotalUsd: totalUsd.toFixed(2),
      igtf3Usd: igtf3.toFixed(2),
      vueltoType,
      vueltoAmount,
      rate,
    };

    setConfirmedInvoice(result);
    setShowCheckoutModal(false);
    setShowPostSaleModal(true);
    clearActiveCart();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0B3B49" />

      {/* 1. Header con Información de Rol y Tasa Oficial */}
      <View style={styles.header}>
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.title}>VUELTO POS</Text>
            {isVendedor ? (
              <View style={styles.roleBadgeVendedor}>
                <Text style={styles.roleBadgeVendedorText}>🛒 CAJERO</Text>
              </View>
            ) : (
              <View style={styles.roleBadgeAdmin}>
                <Text style={styles.roleBadgeAdminText}>👑 ADMIN</Text>
              </View>
            )}
          </View>
          <Text style={styles.subtitle}>Tasa Oficial BCV: {rate.toFixed(2)} Bs/$</Text>
        </View>

        <View style={styles.headerRight}>
          {/* Switch a Modo Administrador: SOLO visible para ADMIN */}
          {isAdmin && (
            <TouchableOpacity
              style={styles.adminSwitchButton}
              onPress={() => toggleMode('ADMIN')}
            >
              <Text style={styles.adminSwitchText}>Modo Admin</Text>
            </TouchableOpacity>
          )}

          {/* Botón Salir / Cambiar Usuario */}
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={() => {
              Alert.alert(
                'Cerrar Turno',
                '¿Deseas cerrar sesión para cambiar de usuario?',
                [
                  { text: 'Cancelar', style: 'cancel' },
                  { text: 'Cerrar Sesión', style: 'destructive', onPress: () => logout() },
                ]
              );
            }}
          >
            <Text style={styles.logoutButtonText}>Salir</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. Fichero Superior de Ventas en Espera (Cuentas Paralelas) */}
      <View style={styles.ticketsTabBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.ticketsScrollContent}
        >
          {/* Ticket Activo Actual */}
          <View style={styles.activeTicketTab}>
            <Text style={styles.activeTicketIcon}>🛒</Text>
            <View>
              <Text style={styles.activeTicketTitle}>
                {activeCustomer ? activeCustomer.name.split(' ')[0] : 'Venta Activa'}
              </Text>
              <Text style={styles.activeTicketSubtitle}>
                {activeLines.length} prod. | ${getTotalUsd().toFixed(2)}
              </Text>
            </View>
          </View>

          {/* Cuentas en Espera (Held Carts) */}
          {heldCarts.map((h) => (
            <TouchableOpacity
              key={h.id}
              style={styles.heldTicketTab}
              onPress={() => resumeHeldCart(h.id)}
            >
              <Text style={styles.heldTicketIcon}>⏸️</Text>
              <View style={{ marginRight: 6 }}>
                <Text style={styles.heldTicketTitle}>{h.label}</Text>
                <Text style={styles.heldTicketSubtitle}>
                  {h.lines.length} prod. | ${h.totalUsd.toFixed(2)}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  Alert.alert(
                    'Descartar Cuenta',
                    `¿Deseas descartar ${h.label}?`,
                    [
                      { text: 'Cancelar', style: 'cancel' },
                      {
                        text: 'Descartar',
                        style: 'destructive',
                        onPress: () => discardHeldCart(h.id),
                      },
                    ]
                  );
                }}
                style={styles.discardTabBtn}
              >
                <Text style={styles.discardTabBtnText}>✕</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ))}

          {/* Botón "+ Otra Venta" */}
          <TouchableOpacity style={styles.newTicketBtn} onPress={handleCreateAnotherSale}>
            <Text style={styles.newTicketBtnText}>➕ Otra Venta</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* 3. Barra de Escáner de Código de Barras con Fallback a Nombre / SKU */}
      <View style={styles.barcodeScannerBar}>
        <TextInput
          style={styles.barcodeInput}
          placeholder="📷 Escanear código de barra o buscar..."
          placeholderTextColor="#64748B"
          value={quickBarcodeInput}
          onChangeText={setQuickBarcodeInput}
          onSubmitEditing={handleScanOrSearch}
          returnKeyType="search"
          autoCapitalize="none"
        />
        <TouchableOpacity style={styles.barcodeScanActionBtn} onPress={handleScanOrSearch}>
          <Text style={styles.barcodeScanActionBtnText}>Escanear</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.openCatalogIconBtn}
          onPress={() => setShowCatalogModal(true)}
        >
          <Text style={styles.openCatalogIconBtnText}>🔍 Catálogo</Text>
        </TouchableOpacity>
      </View>

      {/* 4. Barra de Cliente Activo */}
      <View style={styles.customerBar}>
        <View style={{ flex: 1 }}>
          <Text style={styles.customerLabel}>Cliente Asignado:</Text>
          <Text style={styles.customerName}>
            {activeCustomer
              ? `${activeCustomer.documentType}-${activeCustomer.documentNumber} ${activeCustomer.name}`
              : 'Consumidor Final (Sin RIF)'}
          </Text>
          {activeCustomer && activeCustomer.balanceDue < 0 && (
            <Text style={styles.customerCredit}>
              Saldo a Favor (Monedero): ${Math.abs(activeCustomer.balanceDue).toFixed(2)}
            </Text>
          )}
        </View>

        <TouchableOpacity
          style={styles.quickCustomerBtn}
          onPress={() => setShowQuickCustomerModal(true)}
        >
          <Text style={styles.quickCustomerBtnText}>+ Cliente / C.I.</Text>
        </TouchableOpacity>
      </View>

      {/* 4. Lista de Ítems en Carrito */}
      <View style={styles.cartContainer}>
        {activeLines.length === 0 ? (
          <View style={styles.emptyCart}>
            <Text style={styles.emptyCartText}>
              Carrito listo para facturación.{'\n'}Agrega productos desde el catálogo o escanea con balanza.
            </Text>
            <TouchableOpacity
              style={styles.scanSimBtn}
              onPress={() => setShowCatalogModal(true)}
            >
              <Text style={styles.scanSimBtnText}>Abrir Catálogo de Productos</Text>
            </TouchableOpacity>
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
                    ${item.unitPriceUsd.toFixed(2)} USD / {item.unitOfMeasure || 'ud'} ≈ {(item.unitPriceUsd * rate).toFixed(2)} Bs
                  </Text>
                </View>

                {/* Controles de Cantidad (+ / -) */}
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

                <View style={{ alignItems: 'flex-end', minWidth: 70 }}>
                  <Text style={styles.itemTotal}>${item.totalUsd.toFixed(2)}</Text>
                  <Text style={styles.itemTotalBs}>{(item.totalUsd * rate).toFixed(2)} Bs</Text>
                </View>
              </View>
            )}
          />
        )}
      </View>

      {/* 5. Barra Inferior de Totales y Cobro */}
      <View style={styles.footer}>
        <View style={styles.totalsRow}>
          <View>
            <Text style={styles.totalUsdText}>TOTAL: ${getTotalUsd().toFixed(2)} USD</Text>
            <Text style={styles.totalBsText}>≈ {getTotalBs().toFixed(2)} Bs</Text>
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

      {/* MODAL 1: CATÁLOGO Y CONSULTA DE PRECIOS (RBAC: SIN COSTOS NI MÁRGENES) */}
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
              placeholder="Buscar por nombre o código de barra (759...)"
              placeholderTextColor="#64748B"
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
              renderItem={({ item }) => {
                const priceBs = (item.salePriceUsd * rate).toFixed(2);
                return (
                  <View style={styles.catalogItemRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.catalogItemName}>{item.name}</Text>
                      <Text style={styles.catalogItemBarcode}>
                        EAN-13: {item.barcode} • Medida: {(item as any).unitOfMeasure || 'unidad'}
                      </Text>
                      <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                        <Text style={styles.catalogItemPriceUsd}>
                          ${item.salePriceUsd.toFixed(2)} USD / {(item as any).unitOfMeasure || 'ud'}
                        </Text>
                        <Text style={styles.catalogItemPriceBs}>({priceBs} Bs)</Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={styles.addToCartBtn}
                      onPress={() => {
                        addProduct({
                          id: item.id,
                          name: item.name,
                          barcode: item.barcode,
                          salePriceUsd: item.salePriceUsd,
                          taxRate: item.taxRate,
                          isExempt: item.isExempt,
                          unitOfMeasure: (item as any).unitOfMeasure,
                        });
                        setShowCatalogModal(false);
                      }}
                    >
                      <Text style={styles.addToCartBtnText}>+ Agregar</Text>
                    </TouchableOpacity>
                  </View>
                );
              }}
            />
          </View>
        </View>
      </Modal>

      {/* MODAL 2: BÚSQUEDA POR C.I. Y REGISTRO RÁPIDO DE CLIENTE */}
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
                  <Text style={[styles.docTypeText, docType === t && styles.docTypeTextActive]}>
                    {t}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Consulta directa por Cédula / RIF */}
            <View style={styles.ciSearchRow}>
              <TextInput
                style={styles.ciInput}
                placeholder="Número de Cédula o RIF"
                placeholderTextColor="#64748B"
                keyboardType="numeric"
                value={docNumber}
                onChangeText={(val) => {
                  setDocNumber(val);
                  setCustomerSearchMsg({ type: null, text: '' });
                }}
              />
              <TouchableOpacity style={styles.ciSearchBtn} onPress={handleSearchCustomerByCi}>
                <Text style={styles.ciSearchBtnText}>🔍 Buscar C.I.</Text>
              </TouchableOpacity>
            </View>

            {/* Banner de resultado de la búsqueda */}
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

            {/* Campos separados: Nombre y Apellido */}
            <View style={styles.nameRow}>
              <TextInput
                style={[styles.input, { flex: 1, marginRight: 4 }]}
                placeholder="Nombre(s) *"
                placeholderTextColor="#64748B"
                value={customerFirstName}
                onChangeText={setCustomerFirstName}
              />
              <TextInput
                style={[styles.input, { flex: 1, marginLeft: 4 }]}
                placeholder="Apellido(s)"
                placeholderTextColor="#64748B"
                value={customerLastName}
                onChangeText={setCustomerLastName}
              />
            </View>

            {/* Teléfono WhatsApp */}
            <TextInput
              style={styles.input}
              placeholder="Teléfono WhatsApp (ej. 04141234567)"
              placeholderTextColor="#64748B"
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

              <TouchableOpacity style={styles.saveModalBtn} onPress={handleSaveQuickCustomer}>
                <Text style={styles.saveModalBtnText}>Asignar al Carrito</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL 3: CUENTAS EN ESPERA */}
      <Modal visible={showHeldCartsModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Cuentas en Espera ({heldCarts.length}/10)</Text>

            {heldCarts.length === 0 ? (
              <Text style={{ textAlign: 'center', color: '#64748B', marginVertical: 20 }}>
                No hay cuentas en espera.
              </Text>
            ) : (
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

                    <TouchableOpacity
                      style={styles.discardBtn}
                      onPress={() => discardHeldCart(item.id)}
                    >
                      <Text style={styles.discardBtnText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                )}
              />
            )}

            <TouchableOpacity
              style={[styles.cancelModalBtn, { marginTop: 15 }]}
              onPress={() => setShowHeldCartsModal(false)}
            >
              <Text style={styles.cancelModalBtnText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL 4: CONFIRMAR COBRO Y VUELTO (SENIAT) */}
      <Modal visible={showCheckoutModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Confirmar Cobro Fiscal</Text>

            <View style={styles.summaryBox}>
              <View style={styles.summaryLine}>
                <Text style={styles.summaryLabel}>Subtotal Ítems:</Text>
                <Text style={styles.summaryValue}>${getTotalUsd().toFixed(2)} USD</Text>
              </View>
              {paymentCurrency === 'USD_CASH' && (
                <View style={styles.summaryLine}>
                  <Text style={[styles.summaryLabel, { color: '#F59E0B' }]}>IGTF 3% (Efectivo Divisas):</Text>
                  <Text style={[styles.summaryValue, { color: '#F59E0B' }]}>+${(getTotalUsd() * 0.03).toFixed(2)} USD</Text>
                </View>
              )}
              <View style={[styles.summaryLine, { borderTopWidth: 1, borderTopColor: '#334155', paddingTop: 6, marginTop: 4 }]}>
                <Text style={[styles.summaryLabel, { fontWeight: 'bold' }]}>TOTAL FACTURA:</Text>
                <Text style={[styles.summaryValue, { color: '#10B981', fontWeight: 'bold', fontSize: 16 }]}>
                  ${(getTotalUsd() * (paymentCurrency === 'USD_CASH' ? 1.03 : 1)).toFixed(2)} USD
                </Text>
              </View>
              <Text style={{ textAlign: 'right', color: '#94A3B8', fontSize: 12 }}>
                ≈ {(getTotalUsd() * (paymentCurrency === 'USD_CASH' ? 1.03 : 1) * rate).toFixed(2)} Bs
              </Text>
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

            <Text style={styles.sectionHeader}>Destino del Vuelto / Cambio:</Text>
            <View style={styles.vueltoRow}>
              {[
                { type: 'WALLET_CREDIT', label: 'Monedero (Saldo)' },
                { type: 'CHANGE_VOUCHER', label: 'Vale Impreso' },
                { type: 'PAGO_MOVIL', label: 'Pago Móvil' },
                { type: 'CASH', label: 'Efectivo' },
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
                onPress={() => setShowCheckoutModal(false)}
              >
                <Text style={styles.cancelModalBtnText}>Atrás</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.saveModalBtn} onPress={handleConfirmSale}>
                <Text style={styles.saveModalBtnText}>Confirmar Venta</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL 5: POST-VENTA (IMPRIMIR / COMPARTIR WHATSAPP) */}
      <Modal visible={showPostSaleModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={[styles.modalTitle, { color: '#10B981' }]}>¡Factura Emitida con Éxito!</Text>
            <Text style={{ textAlign: 'center', color: '#CBD5E1', marginBottom: 15 }}>
              Factura SENIAT N° {confirmedInvoice?.invoiceNumber}{'\n'}
              Monto: ${confirmedInvoice?.totalUsd} USD ({confirmedInvoice?.totalBs} Bs)
            </Text>

            <TouchableOpacity
              style={styles.postSaleBtnShare}
              onPress={async () => {
                await NativeShareService.shareInvoice({
                  saleId: confirmedInvoice?.invoiceNumber || 'VUELTO-01',
                  invoiceNumber: confirmedInvoice?.invoiceNumber || 'A-000001',
                  businessName: user?.businessName || 'Bodega Central C.A.',
                  pdfDownloadUrl: `https://vuelto.onrender.com/api/v1/sales/demo/receipt/pdf`,
                  jwtToken: 'session_token',
                });
              }}
            >
              <Text style={styles.postSaleBtnShareText}>📲 Compartir por WhatsApp (Cero Costo)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.postSaleBtnPrint}
              onPress={() => {
                Alert.alert('Impresora Bluetooth', 'Enviando comando ESC/POS a impresora térmica 58mm...');
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#071F27' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#0B3B49',
    borderBottomWidth: 1,
    borderBottomColor: '#155E75',
  },
  title: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold', letterSpacing: 1 },
  subtitle: { color: '#A3E635', fontSize: 11, fontWeight: '600', marginTop: 2 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  roleBadgeVendedor: {
    backgroundColor: '#10B98122',
    borderWidth: 1,
    borderColor: '#10B98155',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  roleBadgeVendedorText: { color: '#A3E635', fontSize: 10, fontWeight: 'bold' },
  roleBadgeAdmin: {
    backgroundColor: '#0284C722',
    borderWidth: 1,
    borderColor: '#0284C755',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  roleBadgeAdminText: { color: '#38BDF8', fontSize: 10, fontWeight: 'bold' },
  adminSwitchButton: {
    backgroundColor: '#F59E0B',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  adminSwitchText: { color: '#071F27', fontSize: 12, fontWeight: 'bold' },
  logoutButton: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  logoutButtonText: { color: '#94A3B8', fontSize: 12, fontWeight: '600' },

  quickBar: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#0F172A',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  quickCatalogBtn: {
    flex: 1,
    backgroundColor: '#0284C7',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  quickCatalogBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 12 },
  heldButton: {
    backgroundColor: '#1E293B',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  heldButtonText: { color: '#F8FAFC', fontSize: 12, fontWeight: '600' },

  ticketsTabBar: {
    backgroundColor: '#0B2933',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#164E63',
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
    backgroundColor: '#0F766E',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2DD4BF',
    gap: 6,
  },
  activeTicketIcon: { fontSize: 14 },
  activeTicketTitle: { color: '#FFFFFF', fontSize: 12, fontWeight: 'bold' },
  activeTicketSubtitle: { color: '#A7F3D0', fontSize: 10 },
  heldTicketTab: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#475569',
    gap: 6,
  },
  heldTicketIcon: { fontSize: 13 },
  heldTicketTitle: { color: '#E2E8F0', fontSize: 12, fontWeight: '600' },
  heldTicketSubtitle: { color: '#94A3B8', fontSize: 10 },
  discardTabBtn: {
    backgroundColor: '#334155',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  discardTabBtnText: { color: '#F87171', fontSize: 10, fontWeight: 'bold' },
  newTicketBtn: {
    backgroundColor: '#0284C7',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  newTicketBtnText: { color: '#FFFFFF', fontSize: 11, fontWeight: 'bold' },

  barcodeScannerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#0F172A',
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  barcodeInput: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    color: '#FFFFFF',
    fontSize: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  barcodeScanActionBtn: {
    backgroundColor: '#10B981',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  barcodeScanActionBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: 'bold' },
  openCatalogIconBtn: {
    backgroundColor: '#334155',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#475569',
  },
  openCatalogIconBtnText: { color: '#E2E8F0', fontSize: 11, fontWeight: '600' },

  ciSearchRow: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  ciInput: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    color: '#FFFFFF',
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
  },
  ciSearchBtn: {
    backgroundColor: '#0284C7',
    paddingHorizontal: 14,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ciSearchBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: 'bold' },
  searchStatusBanner: {
    padding: 8,
    borderRadius: 6,
    marginBottom: 10,
  },
  searchStatusBannerSuccess: {
    backgroundColor: '#064E3B33',
    borderWidth: 1,
    borderColor: '#059669',
  },
  searchStatusBannerWarning: {
    backgroundColor: '#78350F33',
    borderWidth: 1,
    borderColor: '#D97706',
  },
  searchStatusText: { fontSize: 11, fontWeight: '600' },
  searchStatusTextSuccess: { color: '#34D399' },
  searchStatusTextWarning: { color: '#FBBF24' },
  nameRow: { flexDirection: 'row', marginBottom: 2 },

  customerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  customerLabel: { color: '#94A3B8', fontSize: 10 },
  customerName: { color: '#F8FAFC', fontSize: 13, fontWeight: '600' },
  customerCredit: { color: '#4ADE80', fontSize: 11, fontWeight: 'bold' },
  quickCustomerBtn: {
    backgroundColor: '#10B981',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  quickCustomerBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: 'bold' },

  cartContainer: { flex: 1, padding: 12 },
  emptyCart: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  emptyCartText: { color: '#64748B', textAlign: 'center', fontSize: 14, marginBottom: 16, lineHeight: 20 },
  scanSimBtn: {
    backgroundColor: '#0B3B49',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#155E75',
  },
  scanSimBtnText: { color: '#A3E635', fontSize: 13, fontWeight: 'bold' },

  cartItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  itemName: { color: '#F8FAFC', fontSize: 14, fontWeight: '600' },
  itemPrice: { color: '#94A3B8', fontSize: 11, marginTop: 2 },
  qtyControls: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 10 },
  qtyBtn: {
    backgroundColor: '#334155',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyBtnText: { color: '#F8FAFC', fontSize: 15, fontWeight: 'bold' },
  qtyText: { color: '#F8FAFC', marginHorizontal: 8, fontSize: 13, fontWeight: 'bold' },
  itemTotal: { color: '#10B981', fontSize: 14, fontWeight: 'bold' },
  itemTotalBs: { color: '#64748B', fontSize: 10 },

  footer: {
    padding: 16,
    backgroundColor: '#0F172A',
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  totalUsdText: { color: '#F8FAFC', fontSize: 18, fontWeight: 'bold' },
  totalBsText: { color: '#10B981', fontSize: 13, fontWeight: '600' },
  itemsCountBadge: {
    backgroundColor: '#1E293B',
    color: '#94A3B8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 11,
    fontWeight: 'bold',
  },

  actionButtonsRow: { flexDirection: 'row', gap: 10 },
  parkButton: {
    flex: 1,
    backgroundColor: '#334155',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  parkButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' },
  checkoutButton: {
    flex: 2,
    backgroundColor: '#10B981',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  checkoutButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' },
  disabledBtn: { opacity: 0.4 },

  // Modales
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalContentLarge: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 480,
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#F8FAFC' },
  closeModalText: { color: '#94A3B8', fontSize: 13, fontWeight: 'bold' },
  docTypeRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  docTypeChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  docTypeChipActive: { backgroundColor: '#0284C7', borderColor: '#0284C7' },
  docTypeText: { color: '#94A3B8', fontWeight: 'bold' },
  docTypeTextActive: { color: '#FFFFFF' },
  input: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    color: '#FFFFFF',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    fontSize: 13,
  },
  modalButtons: { flexDirection: 'row', gap: 10, marginTop: 12 },
  cancelModalBtn: { flex: 1, padding: 12, borderRadius: 8, backgroundColor: '#334155', alignItems: 'center' },
  cancelModalBtnText: { color: '#CBD5E1', fontWeight: 'bold' },
  saveModalBtn: { flex: 1, padding: 12, borderRadius: 8, backgroundColor: '#0284C7', alignItems: 'center' },
  saveModalBtnText: { color: '#FFFFFF', fontWeight: 'bold' },

  // Catálogo
  catalogItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  catalogItemName: { color: '#F8FAFC', fontSize: 13, fontWeight: 'bold' },
  catalogItemBarcode: { color: '#64748B', fontSize: 11, fontFamily: 'monospace' },
  catalogItemPriceUsd: { color: '#10B981', fontSize: 13, fontWeight: 'bold' },
  catalogItemPriceBs: { color: '#94A3B8', fontSize: 11 },
  addToCartBtn: {
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addToCartBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: 'bold' },

  // Cuentas en Espera
  heldCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  heldLabel: { fontSize: 13, fontWeight: 'bold', color: '#F8FAFC' },
  heldInfo: { fontSize: 11, color: '#94A3B8' },
  resumeBtn: { backgroundColor: '#10B981', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6, marginRight: 6 },
  resumeBtnText: { color: '#FFF', fontSize: 11, fontWeight: 'bold' },
  discardBtn: { backgroundColor: '#EF4444', width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  discardBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 12 },

  // Cobro
  summaryBox: {
    backgroundColor: '#0F172A',
    padding: 12,
    borderRadius: 8,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  summaryLine: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  summaryLabel: { color: '#94A3B8', fontSize: 12 },
  summaryValue: { color: '#F8FAFC', fontSize: 12 },

  sectionHeader: { fontSize: 12, fontWeight: '600', color: '#94A3B8', marginBottom: 6 },
  vueltoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
  vueltoChip: { backgroundColor: '#0F172A', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6, borderWidth: 1, borderColor: '#334155' },
  vueltoChipActive: { backgroundColor: '#10B981', borderColor: '#10B981' },
  vueltoChipText: { color: '#94A3B8', fontSize: 11, fontWeight: '600' },
  vueltoChipTextActive: { color: '#FFFFFF', fontWeight: 'bold' },

  postSaleBtnPrint: { backgroundColor: '#0284C7', padding: 14, borderRadius: 8, alignItems: 'center', marginBottom: 10 },
  postSaleBtnPrintText: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },
  postSaleBtnShare: { backgroundColor: '#10B981', padding: 14, borderRadius: 8, alignItems: 'center', marginBottom: 10 },
  postSaleBtnShareText: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },
});

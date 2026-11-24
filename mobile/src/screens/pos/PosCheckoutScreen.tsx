import React, { useState } from 'react';
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
} from 'react-native';
import { useCartStore, CartLine } from '../../stores/cart.store';
import { useAuthStore } from '../../stores/auth.store';
import { NativeShareService } from '../../services/share.service';

export const PosCheckoutScreen: React.FC = () => {
  const { user, toggleMode } = useAuthStore();
  const {
    activeLines,
    activeCustomer,
    frozenRate,
    heldCarts,
    addProduct,
    updateQuantity,
    removeLine,
    clearActiveCart,
    parkCurrentCart,
    resumeHeldCart,
    discardHeldCart,
    setCustomer,
    getTotalUsd,
    getTotalBs,
  } = useCartStore();

  // Estados de Modales
  const [showQuickCustomerModal, setShowQuickCustomerModal] = useState(false);
  const [showHeldCartsModal, setShowHeldCartsModal] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [showPostSaleModal, setShowPostSaleModal] = useState(false);
  const [confirmedInvoice, setConfirmedInvoice] = useState<any>(null);

  // Formulario de Cliente Rápido
  const [docType, setDocType] = useState<'V' | 'E' | 'J' | 'G'>('V');
  const [docNumber, setDocNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  // Selector de Vuelto
  const [vueltoType, setVueltoType] = useState<'CASH' | 'WALLET_CREDIT' | 'CHANGE_VOUCHER' | 'PAGO_MOVIL'>('WALLET_CREDIT');
  const [vueltoAmount, setVueltoAmount] = useState('0');

  const rate = frozenRate || 52.50;

  // Registrar cliente rápido desde bottom sheet sin perder el carrito
  const handleSaveQuickCustomer = () => {
    if (!docNumber || !customerName) {
      Alert.alert('Datos Incompletos', 'El documento y el nombre son obligatorios.');
      return;
    }

    setCustomer({
      id: `temp_${Date.now()}`,
      name: customerName,
      documentType: docType,
      documentNumber: docNumber,
      phone: customerPhone,
      balanceDue: 0,
    });

    setShowQuickCustomerModal(false);
    setDocNumber('');
    setCustomerName('');
    setCustomerPhone('');
  };

  // Simular confirmación de venta
  const handleConfirmSale = () => {
    const totalUsd = getTotalUsd();
    const invoiceNum = `A-${Math.floor(100000 + Math.random() * 900000)}`;

    const result = {
      invoiceNumber: invoiceNum,
      totalUsd: totalUsd.toFixed(2),
      totalBs: (totalUsd * rate).toFixed(2),
      vueltoType,
      vueltoAmount,
    };

    setConfirmedInvoice(result);
    setShowCheckoutModal(false);
    setShowPostSaleModal(true);
    clearActiveCart();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1E293B" />

      {/* 1. Header con Información y Switch de Modo */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>VUELTO POS</Text>
          <Text style={styles.subtitle}>Tasa Oficial: {rate.toFixed(2)} Bs/$</Text>
        </View>

        <View style={styles.headerRight}>
          {/* Botón de Cuentas Abiertas (Held Carts) */}
          <TouchableOpacity
            style={styles.heldButton}
            onPress={() => setShowHeldCartsModal(true)}
          >
            <Text style={styles.heldButtonText}>Cuentas ({heldCarts.length})</Text>
          </TouchableOpacity>

          {/* Switch a Modo Administrador si es ADMIN */}
          {user?.roleId === 'ADMIN' && (
            <TouchableOpacity
              style={styles.adminSwitchButton}
              onPress={() => toggleMode('ADMIN')}
            >
              <Text style={styles.adminSwitchText}>Modo Admin</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 2. Barra de Cliente */}
      <View style={styles.customerBar}>
        <View>
          <Text style={styles.customerLabel}>Cliente:</Text>
          <Text style={styles.customerName}>
            {activeCustomer ? `${activeCustomer.documentType}-${activeCustomer.documentNumber} ${activeCustomer.name}` : 'Consumidor Final'}
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
          <Text style={styles.quickCustomerBtnText}>+ Cliente</Text>
        </TouchableOpacity>
      </View>

      {/* 3. Lista de Ítems en Carrito */}
      <View style={styles.cartContainer}>
        {activeLines.length === 0 ? (
          <View style={styles.emptyCart}>
            <Text style={styles.emptyCartText}>Carrito vacío. Escanee un código de barras o agregue un producto.</Text>
            {/* Botón de prueba para simular escaneo de producto */}
            <TouchableOpacity
              style={styles.scanSimBtn}
              onPress={() =>
                addProduct({
                  id: 'prod_harina',
                  name: 'Harina Pan 1kg',
                  barcode: '7591234567894',
                  salePriceUsd: 1.20,
                  taxRate: 16.0,
                  isExempt: false,
                })
              }
            >
              <Text style={styles.scanSimBtnText}>+ Simular Escaneo (759 Harina Pan)</Text>
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
                    ${item.unitPriceUsd.toFixed(2)} c/u ({item.taxRate}% IVA)
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

                <Text style={styles.itemTotal}>${item.totalUsd.toFixed(2)}</Text>
              </View>
            )}
          />
        )}
      </View>

      {/* 4. Barra Inferior de Totales y Cobro */}
      <View style={styles.footer}>
        <View style={styles.totalsRow}>
          <Text style={styles.totalUsdText}>TOTAL: ${getTotalUsd().toFixed(2)} USD</Text>
          <Text style={styles.totalBsText}>{getTotalBs().toFixed(2)} Bs</Text>
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
            <Text style={styles.parkButtonText}>Pausar Cuenta</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.checkoutButton, activeLines.length === 0 && styles.disabledBtn]}
            disabled={activeLines.length === 0}
            onPress={() => setShowCheckoutModal(true)}
          >
            <Text style={styles.checkoutButtonText}>Cobrar</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Modal: Registro Rápido de Cliente */}
      <Modal visible={showQuickCustomerModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Registro Rápido de Cliente</Text>

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

            <TextInput
              style={styles.input}
              placeholder="Número de Cédula o RIF"
              keyboardType="numeric"
              value={docNumber}
              onChangeText={setDocNumber}
            />

            <TextInput
              style={styles.input}
              placeholder="Nombre o Razón Social"
              value={customerName}
              onChangeText={setCustomerName}
            />

            <TextInput
              style={styles.input}
              placeholder="Teléfono (ej. 04141234567)"
              keyboardType="phone-pad"
              value={customerPhone}
              onChangeText={setCustomerPhone}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelModalBtn}
                onPress={() => setShowQuickCustomerModal(false)}
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

      {/* Modal: Cuentas Abiertas (Held Carts) */}
      <Modal visible={showHeldCartsModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Cuentas Abiertas ({heldCarts.length}/10)</Text>

            {heldCarts.length === 0 ? (
              <Text style={{ textAlign: 'center', marginVertical: 20 }}>No hay cuentas en espera.</Text>
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
                      <Text style={styles.discardBtnText}>X</Text>
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

      {/* Modal: Opciones de Pago y Vuelto */}
      <Modal visible={showCheckoutModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Confirmar Cobro</Text>
            <Text style={{ fontSize: 16, textAlign: 'center', marginBottom: 15 }}>
              Total a Pagar: <Text style={{ fontWeight: 'bold' }}>${getTotalUsd().toFixed(2)} USD</Text> ({getTotalBs().toFixed(2)} Bs)
            </Text>

            <Text style={styles.sectionHeader}>Opciones para el Vuelto / Cambio:</Text>
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

      {/* Modal Post-Venta: Imprimir o Compartir por WhatsApp (Share Sheet) */}
      <Modal visible={showPostSaleModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={[styles.modalTitle, { color: '#16A34A' }]}>¡Venta Exitosa!</Text>
            <Text style={{ textAlign: 'center', marginBottom: 20 }}>
              Factura N° {confirmedInvoice?.invoiceNumber} emitida correctamente.
            </Text>

            <TouchableOpacity
              style={styles.postSaleBtnPrint}
              onPress={() => {
                Alert.alert('Impresora Térmica', 'Enviando bytecode ESC/POS a impresora Bluetooth 58mm...');
              }}
            >
              <Text style={styles.postSaleBtnPrintText}>Imprimir Ticket Térmico</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.postSaleBtnShare}
              onPress={async () => {
                // Compartir factura mediante el Share Sheet nativo del dispositivo
                await NativeShareService.shareInvoice({
                  saleId: 'mock_sale_id',
                  invoiceNumber: confirmedInvoice?.invoiceNumber || 'A-000001',
                  businessName: 'Vuelto Store',
                  pdfDownloadUrl: 'https://vuelto.ve/api/v1/sales/mock/receipt/pdf',
                  jwtToken: 'mock_jwt_token',
                });
              }}
            >
              <Text style={styles.postSaleBtnShareText}>Compartir por WhatsApp (Share Sheet)</Text>
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
  container: { flex: 1, backgroundColor: '#0F172A' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#1E293B',
  },
  title: { color: '#38BDF8', fontSize: 18, fontWeight: 'bold' },
  subtitle: { color: '#94A3B8', fontSize: 12 },
  headerRight: { flexDirection: 'row', gap: 8 },
  heldButton: {
    backgroundColor: '#334155',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  heldButtonText: { color: '#F8FAFC', fontSize: 12, fontWeight: '600' },
  adminSwitchButton: {
    backgroundColor: '#F59E0B',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  adminSwitchText: { color: '#0F172A', fontSize: 12, fontWeight: 'bold' },

  customerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#1E293B',
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  customerLabel: { color: '#94A3B8', fontSize: 10 },
  customerName: { color: '#F8FAFC', fontSize: 13, fontWeight: '600' },
  customerCredit: { color: '#4ADE80', fontSize: 11, fontWeight: 'bold' },
  quickCustomerBtn: {
    backgroundColor: '#0284C7',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  quickCustomerBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: 'bold' },

  cartContainer: { flex: 1, padding: 12 },
  emptyCart: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyCartText: { color: '#64748B', textAlign: 'center', fontSize: 14, marginBottom: 15 },
  scanSimBtn: {
    backgroundColor: '#334155',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#475569',
  },
  scanSimBtnText: { color: '#38BDF8', fontSize: 13, fontWeight: 'bold' },

  cartItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  itemName: { color: '#F8FAFC', fontSize: 14, fontWeight: '600' },
  itemPrice: { color: '#94A3B8', fontSize: 12 },
  qtyControls: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 12 },
  qtyBtn: {
    backgroundColor: '#334155',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyBtnText: { color: '#F8FAFC', fontSize: 16, fontWeight: 'bold' },
  qtyText: { color: '#F8FAFC', marginHorizontal: 10, fontSize: 14, fontWeight: 'bold' },
  itemTotal: { color: '#38BDF8', fontSize: 14, fontWeight: 'bold' },

  footer: {
    padding: 16,
    backgroundColor: '#1E293B',
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  totalUsdText: { color: '#F8FAFC', fontSize: 18, fontWeight: 'bold' },
  totalBsText: { color: '#94A3B8', fontSize: 16, fontWeight: '600' },

  actionButtonsRow: { flexDirection: 'row', gap: 10 },
  parkButton: {
    flex: 1,
    backgroundColor: '#475569',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  parkButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' },
  checkoutButton: {
    flex: 1,
    backgroundColor: '#16A34A',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  checkoutButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' },
  disabledBtn: { opacity: 0.5 },

  // Modales
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  docTypeRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  docTypeChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  docTypeChipActive: { backgroundColor: '#0284C7' },
  docTypeText: { color: '#475569', fontWeight: 'bold' },
  docTypeTextActive: { color: '#FFFFFF' },
  input: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 6,
    padding: 10,
    marginBottom: 10,
    fontSize: 14,
  },
  modalButtons: { flexDirection: 'row', gap: 10, marginTop: 10 },
  cancelModalBtn: { flex: 1, padding: 12, borderRadius: 6, backgroundColor: '#E2E8F0', alignItems: 'center' },
  cancelModalBtnText: { color: '#475569', fontWeight: 'bold' },
  saveModalBtn: { flex: 1, padding: 12, borderRadius: 6, backgroundColor: '#0284C7', alignItems: 'center' },
  saveModalBtnText: { color: '#FFFFFF', fontWeight: 'bold' },

  heldCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  heldLabel: { fontSize: 14, fontWeight: 'bold', color: '#1E293B' },
  heldInfo: { fontSize: 12, color: '#64748B' },
  resumeBtn: { backgroundColor: '#16A34A', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6, marginRight: 6 },
  resumeBtnText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  discardBtn: { backgroundColor: '#EF4444', width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  discardBtnText: { color: '#FFF', fontWeight: 'bold' },

  sectionHeader: { fontSize: 14, fontWeight: '600', color: '#334155', marginBottom: 8 },
  vueltoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 15 },
  vueltoChip: { backgroundColor: '#F1F5F9', paddingVertical: 8, paddingHorizontal: 10, borderRadius: 6 },
  vueltoChipActive: { backgroundColor: '#10B981' },
  vueltoChipText: { color: '#334155', fontSize: 12, fontWeight: '600' },
  vueltoChipTextActive: { color: '#FFFFFF' },

  postSaleBtnPrint: { backgroundColor: '#0284C7', padding: 14, borderRadius: 8, alignItems: 'center', marginBottom: 10 },
  postSaleBtnPrintText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  postSaleBtnShare: { backgroundColor: '#16A34A', padding: 14, borderRadius: 8, alignItems: 'center', marginBottom: 10 },
  postSaleBtnShareText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
});

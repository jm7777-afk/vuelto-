import React, { useState } from 'react';
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
} from 'react-native';
import { useAuthStore } from '../../stores/auth.store';

export const MobileAdminDashboard: React.FC = () => {
  const { user, toggleMode, logout } = useAuthStore();

  const [activeSection, setActiveSection] = useState<'STOCK' | 'ORDERS' | 'DEBTS' | 'SUPPLIERS' | 'SALES' | 'RATES' | 'USERS'>('STOCK');

  // Configuración de Mora Administrativa
  const [lateFeePercent, setLateFeePercent] = useState('5.0');

  // Configuración de Tasa de Cobro Activa y Régimen Fiscal
  const [activeRateSource, setActiveRateSource] = useState<'BCV' | 'PARALELO' | 'EURO' | 'CUSTOM'>('BCV');
  const [customRate, setCustomRate] = useState('58.50');
  const [enableIva, setEnableIva] = useState(true);
  const [enableIgtf, setEnableIgtf] = useState(true);
  const [globalMargin, setGlobalMargin] = useState('30');

  // Estado para ajuste rápido de stock
  const [adjustProductId, setAdjustProductId] = useState('');
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustReason, setAdjustReason] = useState('');

  // Estado para nuevo vendedor
  const [newCashierUsername, setNewCashierUsername] = useState('');
  const [newCashierName, setNewCashierName] = useState('');

  // Estado para nuevo pedido a proveedor
  const [newOrderSupName, setNewOrderSupName] = useState('Empresas Polar C.A.');
  const [newOrderSupPhone, setNewOrderSupPhone] = useState('04141234567');
  const [newOrderProdName, setNewOrderProdName] = useState('Harina PAN Blanca 1kg');
  const [newOrderQty, setNewOrderQty] = useState('50');
  const [newOrderCost, setNewOrderCost] = useState('0.95');

  // Estado para nuevo proveedor
  const [newSupName, setNewSupName] = useState('');
  const [newSupRif, setNewSupRif] = useState('');
  const [newSupPhone, setNewSupPhone] = useState('');

  // Lista de Pedidos
  const [ordersList, setOrdersList] = useState([
    {
      id: 'oc-1',
      number: 'OC-2026-0001',
      supplier: 'Empresas Polar C.A.',
      phone: '04141234567',
      totalUsd: 114.00,
      status: 'SENT_WHATSAPP',
      items: '60 unids Harina PAN + 20 unids Aceite Mazeite',
    },
  ]);

  // Lista de Proveedores
  const [suppliersList, setSuppliersList] = useState([
    { id: 's-1', name: 'Empresas Polar C.A.', rif: 'J-000413129', phone: '04141234567', creditDays: 15 },
    { id: 's-2', name: 'Pepsico Alimentos Venezuela', rif: 'J-300854128', phone: '04160001122', creditDays: 21 },
    { id: 's-3', name: 'Distribuidora Lácteos Los Andes', rif: 'G-200055441', phone: '04129876543', creditDays: 7 },
  ]);

  const handleAdjustStock = () => {
    if (!adjustProductId || !adjustQty || !adjustReason) {
      Alert.alert('Datos Incompletos', 'Indique el producto, la cantidad y el motivo del ajuste.');
      return;
    }
    Alert.alert(
      'Ajuste Registrado',
      `Se ajustó el stock a ${adjustQty} unidades. Generado movimiento de Kardex y registro en Auditoría con usuario ${user?.username}.`
    );
    setAdjustProductId('');
    setAdjustQty('');
    setAdjustReason('');
  };

  const handleCreateCashier = () => {
    if (!newCashierUsername || !newCashierName) {
      Alert.alert('Datos Incompletos', 'Indique el usuario y el nombre completo.');
      return;
    }
    Alert.alert('Cajero Creado', `Usuario "${newCashierUsername}" creado exitosamente con rol VENDEDOR.`);
    setNewCashierUsername('');
    setNewCashierName('');
  };

  const handleCreateOrder = () => {
    const qty = parseFloat(newOrderQty) || 10;
    const cost = parseFloat(newOrderCost) || 1.0;
    const total = qty * cost;
    const newOrd = {
      id: `oc-${Date.now()}`,
      number: `OC-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      supplier: newOrderSupName,
      phone: newOrderSupPhone,
      totalUsd: total,
      status: 'DRAFT',
      items: `${qty} unids x ${newOrderProdName}`,
    };
    setOrdersList([newOrd, ...ordersList]);
    Alert.alert('Orden Creada', `Orden ${newOrd.number} registrada para ${newOrd.supplier}.`);
  };

  const handleCreateSupplier = () => {
    if (!newSupName || !newSupRif || !newSupPhone) {
      Alert.alert('Datos Incompletos', 'Nombre, RIF y Teléfono son obligatorios.');
      return;
    }
    const newSup = {
      id: `sup-${Date.now()}`,
      name: newSupName,
      rif: newSupRif,
      phone: newSupPhone,
      creditDays: 15,
    };
    setSuppliersList([...suppliersList, newSup]);
    Alert.alert('Proveedor Guardado', `Proveedor "${newSup.name}" agregado.`);
    setNewSupName('');
    setNewSupRif('');
    setNewSupPhone('');
  };

  const handleWhatsAppDebtReminder = (customer: any) => {
    const surcharge = customer.isOverdue ? (customer.balanceDueUsd * (parseFloat(lateFeePercent) / 100)) : 0;
    const totalToPay = customer.balanceDueUsd + surcharge;
    const msg = `Estimado(a) ${customer.name}, le recordamos que presenta un saldo pendiente con ${user?.businessName} por $${customer.balanceDueUsd.toFixed(2)} USD.${customer.isOverdue ? ` Incluye recargo por mora del ${lateFeePercent}% ($${surcharge.toFixed(2)}). Total a cancelar: $${totalToPay.toFixed(2)} USD.` : ''} Agradecemos gestionar su pago.`;
    const cleanPhone = customer.phone.replace(/\D/g, '');
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('WhatsApp', `Mensaje generado:\n\n${msg}`);
    });
  };

  const handleWhatsAppOrder = (order: any) => {
    const msg = `*ORDEN DE COMPRA: ${order.number}*\nComercio: ${user?.businessName}\nProveedor: ${order.supplier}\n\n*Pedido:* ${order.items}\n*Total Estimado:* $${order.totalUsd.toFixed(2)} USD\n\nAgradecemos confirmación de despacho.`;
    const cleanPhone = order.phone.replace(/\D/g, '');
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('WhatsApp', msg);
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0B3B49" />

      {/* Header con Switch a Modo POS y Salir */}
      <View style={styles.header}>
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.title}>VUELTO ADMIN</Text>
            <View style={styles.adminPill}>
              <Text style={styles.adminPillText}>👑 TOTAL</Text>
            </View>
          </View>
          <Text style={styles.subtitle}>{user?.businessName} ({user?.fullName})</Text>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.posSwitchBtn}
            onPress={() => toggleMode('POS')}
          >
            <Text style={styles.posSwitchBtnText}>Ir a POS</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={() => {
              Alert.alert(
                'Cerrar Sesión',
                '¿Deseas salir del panel administrador?',
                [
                  { text: 'Cancelar', style: 'cancel' },
                  { text: 'Salir', style: 'destructive', onPress: () => logout() },
                ]
              );
            }}
          >
            <Text style={styles.logoutBtnText}>Salir</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Barra de Navegación por Pestañas */}
      <View style={styles.navBar}>
        {(['STOCK', 'ORDERS', 'DEBTS', 'SUPPLIERS', 'SALES', 'RATES', 'USERS'] as const).map((sec) => (
          <TouchableOpacity
            key={sec}
            style={[styles.navItem, activeSection === sec && styles.navItemActive]}
            onPress={() => setActiveSection(sec)}
          >
            <Text style={[styles.navText, activeSection === sec && styles.navTextActive]}>
              {sec === 'STOCK' ? 'Stock' : sec === 'ORDERS' ? 'Pedidos' : sec === 'DEBTS' ? 'Cobros' : sec === 'SUPPLIERS' ? 'Proveed.' : sec === 'SALES' ? 'Ventas' : sec === 'RATES' ? 'Tasas' : 'Cajeros'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.content}>
        {/* SECCIÓN 1: STOCK E INVENTARIO CON COSTOS Y MÁRGENES (SOLO ADMIN) */}
        {activeSection === 'STOCK' && (
          <View>
            <Text style={styles.sectionTitle}>Control de Inventario & Márgenes</Text>
            <Text style={styles.sectionDesc}>
              Visibilidad exclusiva de costos al mayor, precios de salida y cálculo de rentabilidad.
            </Text>

            {/* Resumen de Valuación */}
            <View style={styles.kpiRow}>
              <View style={styles.kpiCard}>
                <Text style={styles.kpiLabel}>Valuación Costo</Text>
                <Text style={styles.kpiValue}>$368.50</Text>
              </View>
              <View style={styles.kpiCard}>
                <Text style={styles.kpiLabel}>Margen Promedio</Text>
                <Text style={[styles.kpiValue, { color: '#10B981' }]}>+36.8%</Text>
              </View>
            </View>

            {/* Alertas de Stock Bajo con Proveedores y WhatsApp */}
            <View style={[styles.card, { borderColor: '#EF4444' }]}>
              <Text style={[styles.cardHeader, { color: '#EF4444' }]}>⚠️ Alertas de Reposición Urgente</Text>
              {[
                { name: 'Aceite de Maíz Mazeite 1L', stock: 4, min: 10, cost: 2.80, supplier: 'Alimentos Polar', phone: '04141234567' },
              ].map((it, idx) => (
                <View key={idx} style={{ marginTop: 8, padding: 10, backgroundColor: '#0F172A', borderRadius: 8 }}>
                  <Text style={{ color: '#F8FAFC', fontWeight: 'bold' }}>{it.name}</Text>
                  <Text style={{ color: '#EF4444', fontSize: 12 }}>Stock Crítico: {it.stock} unids (Mínimo: {it.min})</Text>
                  <Text style={{ color: '#94A3B8', fontSize: 11, marginTop: 2 }}>Proveedor: {it.supplier} • Costo Mayor: ${it.cost.toFixed(2)}</Text>
                  <TouchableOpacity
                    style={styles.orderWaBtn}
                    onPress={() => {
                      const msg = `Hola ${it.supplier}, necesitamos orden de reposición de 20 unids de ${it.name}. Envíenos cotización a ${user?.businessName}.`;
                      Linking.openURL(`https://wa.me/${it.phone}?text=${encodeURIComponent(msg)}`).catch(() => Alert.alert('WhatsApp', msg));
                    }}
                  >
                    <Text style={styles.orderWaBtnText}>📲 Ordenar Reposición por WhatsApp</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            {/* Ajuste de Inventario con Kardex */}
            <View style={styles.card}>
              <Text style={styles.cardHeader}>Ajuste Físico de Stock (Kardex)</Text>
              <Text style={styles.fieldLabel}>Producto o Código de Barras:</Text>
              <TextInput
                style={styles.input}
                placeholder="7591001001019 (Harina PAN)"
                placeholderTextColor="#64748B"
                value={adjustProductId}
                onChangeText={setAdjustProductId}
              />

              <Text style={styles.fieldLabel}>Nueva Cantidad Contada:</Text>
              <TextInput
                style={styles.input}
                placeholder="ej. 150"
                placeholderTextColor="#64748B"
                keyboardType="numeric"
                value={adjustQty}
                onChangeText={setAdjustQty}
              />

              <Text style={styles.fieldLabel}>Motivo del Ajuste (Auditoría SENIAT):</Text>
              <TextInput
                style={styles.input}
                placeholder="Conteo de inventario físico mensual"
                placeholderTextColor="#64748B"
                value={adjustReason}
                onChangeText={setAdjustReason}
              />

              <TouchableOpacity style={styles.primaryBtn} onPress={handleAdjustStock}>
                <Text style={styles.primaryBtnText}>Registrar Ajuste en Kardex</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* SECCIÓN 2: PEDIDOS A PROVEEDORES (PURCHASE ORDERS) */}
        {activeSection === 'ORDERS' && (
          <View>
            <Text style={styles.sectionTitle}>Órdenes de Compra a Proveedores</Text>
            <Text style={styles.sectionDesc}>
              Crea pedidos de reposición, envíalos por WhatsApp y cárgalos a stock al recibirlos.
            </Text>

            {/* Crear Pedido */}
            <View style={styles.card}>
              <Text style={styles.cardHeader}>Crear Nueva Orden de Compra</Text>
              <Text style={styles.fieldLabel}>Proveedor:</Text>
              <TextInput
                style={styles.input}
                value={newOrderSupName}
                onChangeText={setNewOrderSupName}
              />
              <Text style={styles.fieldLabel}>Teléfono WhatsApp:</Text>
              <TextInput
                style={styles.input}
                value={newOrderSupPhone}
                onChangeText={setNewOrderSupPhone}
              />
              <Text style={styles.fieldLabel}>Producto a Solicitar:</Text>
              <TextInput
                style={styles.input}
                value={newOrderProdName}
                onChangeText={setNewOrderProdName}
              />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Cantidad:</Text>
                  <TextInput
                    style={styles.input}
                    value={newOrderQty}
                    onChangeText={setNewOrderQty}
                    keyboardType="numeric"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Costo Pactado ($):</Text>
                  <TextInput
                    style={styles.input}
                    value={newOrderCost}
                    onChangeText={setNewOrderCost}
                    keyboardType="numeric"
                  />
                </View>
              </View>
              <TouchableOpacity style={styles.primaryBtn} onPress={handleCreateOrder}>
                <Text style={styles.primaryBtnText}>Guardar Orden de Compra</Text>
              </TouchableOpacity>
            </View>

            {/* Listado de Pedidos */}
            <View style={styles.card}>
              <Text style={styles.cardHeader}>Órdenes Emitidas</Text>
              {ordersList.map((ord) => (
                <View key={ord.id} style={styles.debtCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.customerName}>{ord.number}</Text>
                    <Text style={styles.customerDoc}>{ord.supplier} ({ord.items})</Text>
                    <Text style={[styles.debtAmount, { color: '#10B981' }]}>Total: ${ord.totalUsd.toFixed(2)} USD</Text>
                    <Text style={{ fontSize: 10, color: ord.status === 'RECEIVED' ? '#10B981' : '#38BDF8', fontWeight: 'bold', marginTop: 2 }}>
                      Estatus: {ord.status}
                    </Text>
                  </View>
                  <View style={{ gap: 6 }}>
                    <TouchableOpacity style={styles.waCobroBtn} onPress={() => handleWhatsAppOrder(ord)}>
                      <Text style={styles.waCobroBtnText}>📲 WhatsApp</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.waCobroBtn, { backgroundColor: '#0284C7' }]}
                      onPress={() => {
                        Alert.alert('Mercancía Recibida', `Stock de ${ord.number} ingresado a almacén.`);
                        setOrdersList(ordersList.map((o) => (o.id === ord.id ? { ...o, status: 'RECEIVED' } : o)));
                      }}
                    >
                      <Text style={styles.waCobroBtnText}>Recibir</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* SECCIÓN 3: CUENTAS POR COBRAR & MORA CONFIGURABLE */}
        {activeSection === 'DEBTS' && (
          <View>
            <Text style={styles.sectionTitle}>Cobranzas & Recargo por Mora</Text>
            <Text style={styles.sectionDesc}>
              Configura el recargo por retraso y envía recordatorios de cobro automáticos por WhatsApp.
            </Text>

            {/* Configuración de Recargo por Mora */}
            <View style={styles.card}>
              <Text style={styles.cardHeader}>Configuración de Recargo por Mora</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Text style={{ color: '#CBD5E1', fontSize: 13 }}>Recargo por retraso:</Text>
                <TextInput
                  style={[styles.input, { width: 70, marginBottom: 0, textAlign: 'center', fontWeight: 'bold', color: '#EF4444' }]}
                  value={lateFeePercent}
                  onChangeText={setLateFeePercent}
                  keyboardType="numeric"
                />
                <Text style={{ color: '#CBD5E1', fontSize: 13, fontWeight: 'bold' }}>%</Text>
              </View>
            </View>

            {/* Lista de Deudores */}
            <View style={styles.card}>
              <Text style={styles.cardHeader}>Cartera de Clientes con Saldo</Text>
              {[
                { name: 'Inversiones Los Chaguaramos C.A.', doc: 'J-309876541', phone: '04141234567', balanceDueUsd: 145.0, isOverdue: true, dueDate: '2026-11-20' },
                { name: 'Automercado San Antonio', doc: 'J-401122334', phone: '04129876543', balanceDueUsd: 82.50, isOverdue: false, dueDate: '2026-11-30' },
              ].map((c, i) => {
                const surcharge = c.isOverdue ? (c.balanceDueUsd * (parseFloat(lateFeePercent) / 100)) : 0;
                const total = c.balanceDueUsd + surcharge;

                return (
                  <View key={i} style={styles.debtCard}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.customerName}>{c.name}</Text>
                      <Text style={styles.customerDoc}>{c.doc} • Límite: {c.dueDate}</Text>
                      <Text style={[styles.debtAmount, { color: c.isOverdue ? '#EF4444' : '#F59E0B' }]}>
                        Deuda: ${c.balanceDueUsd.toFixed(2)} USD
                        {c.isOverdue && ` (+${lateFeePercent}% mora: $${total.toFixed(2)})`}
                      </Text>
                      {c.isOverdue && (
                        <Text style={{ color: '#EF4444', fontSize: 11, fontWeight: 'bold', marginTop: 2 }}>
                          ⚠️ VENCIDO (Aplica recargo configurable)
                        </Text>
                      )}
                    </View>

                    <TouchableOpacity
                      style={styles.waCobroBtn}
                      onPress={() => handleWhatsAppDebtReminder(c)}
                    >
                      <Text style={styles.waCobroBtnText}>📲 Cobrar</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* SECCIÓN 4: PROVEEDORES (CRUD) */}
        {activeSection === 'SUPPLIERS' && (
          <View>
            <Text style={styles.sectionTitle}>Directorio de Proveedores</Text>
            <Text style={styles.sectionDesc}>
              Consulta y contacta directamente a las empresas distribuidoras por WhatsApp.
            </Text>

            <View style={styles.card}>
              <Text style={styles.cardHeader}>Registrar Nuevo Proveedor</Text>
              <Text style={styles.fieldLabel}>Razón Social:</Text>
              <TextInput
                style={styles.input}
                placeholder="ej. Distribuidora El Sol C.A."
                placeholderTextColor="#64748B"
                value={newSupName}
                onChangeText={setNewSupName}
              />
              <Text style={styles.fieldLabel}>RIF:</Text>
              <TextInput
                style={styles.input}
                placeholder="J-123456789"
                placeholderTextColor="#64748B"
                value={newSupRif}
                onChangeText={setNewSupRif}
              />
              <Text style={styles.fieldLabel}>Teléfono WhatsApp:</Text>
              <TextInput
                style={styles.input}
                placeholder="04141234567"
                placeholderTextColor="#64748B"
                value={newSupPhone}
                onChangeText={setNewSupPhone}
              />
              <TouchableOpacity style={styles.primaryBtn} onPress={handleCreateSupplier}>
                <Text style={styles.primaryBtnText}>Guardar Proveedor</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardHeader}>Proveedores Activos</Text>
              {suppliersList.map((sup) => (
                <View key={sup.id} style={styles.debtCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.customerName}>{sup.name}</Text>
                    <Text style={styles.customerDoc}>RIF: {sup.rif} • Plazo: {sup.creditDays} días</Text>
                    <Text style={{ fontSize: 12, color: '#38BDF8', marginTop: 2 }}>{sup.phone}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.waCobroBtn}
                    onPress={() => {
                      const url = `https://wa.me/${sup.phone.replace(/\D/g, '')}?text=Hola+${encodeURIComponent(sup.name)}`;
                      Linking.openURL(url).catch(() => Alert.alert('WhatsApp', sup.phone));
                    }}
                  >
                    <Text style={styles.waCobroBtnText}>📲 Chat</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* SECCIÓN 5: VENTAS Y REIMPRESIÓN */}
        {activeSection === 'SALES' && (
          <View>
            <Text style={styles.sectionTitle}>Últimas Facturas Fiscales</Text>
            {[
              { invoice: 'A-00000042', customer: 'Consumidor Final', total: '$18.88', bs: '991.20 Bs', igtf: '$0.57', time: 'Hoy 18:30' },
              { invoice: 'A-00000041', customer: 'Inversiones Los Chaguaramos', total: '$45.00', bs: '2,362.50 Bs', igtf: '$1.35', time: 'Hoy 17:15' },
            ].map((s) => (
              <View key={s.invoice} style={styles.card}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text style={{ fontWeight: 'bold', color: '#38BDF8', fontSize: 15 }}>{s.invoice}</Text>
                  <Text style={{ color: '#94A3B8', fontSize: 12 }}>{s.time}</Text>
                </View>
                <Text style={{ fontSize: 13, color: '#CBD5E1' }}>Cliente: {s.customer}</Text>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#10B981', marginVertical: 4 }}>
                  {s.total} ({s.bs})
                </Text>
                <Text style={{ fontSize: 11, color: '#F59E0B' }}>IGTF 3% percibido: {s.igtf}</Text>

                <TouchableOpacity
                  style={styles.shareAgainBtn}
                  onPress={() => Alert.alert('Reenviar Factura', `Enviando factura ${s.invoice} vía WhatsApp...`)}
                >
                  <Text style={styles.shareAgainBtnText}>📲 Reenviar Factura al Cliente</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* SECCIÓN 6: TASAS, RÉGIMEN FISCAL Y CONFIGURACIÓN */}
        {activeSection === 'RATES' && (
          <View>
            <Text style={styles.sectionTitle}>Tasas de Cambio & Régimen Fiscal</Text>

            {/* Selector de Tasa de Cobro Activa */}
            <View style={styles.card}>
              <Text style={styles.cardHeader}>Tasa de Cobro Activa en Tienda</Text>
              <Text style={{ fontSize: 12, color: '#94A3B8', marginBottom: 8 }}>
                Selecciona cuál tasa de cambio se aplicará para cobrar tus productos en caja:
              </Text>

              <View style={{ gap: 6, marginBottom: 10 }}>
                {[
                  { id: 'BCV', label: 'BCV Oficial (52.50 Bs)', val: '52.50' },
                  { id: 'PARALELO', label: 'Monitor Paralelo (59.75 Bs)', val: '59.75' },
                  { id: 'EURO', label: 'Euro BCV (55.39 Bs)', val: '55.39' },
                  { id: 'CUSTOM', label: 'Tasa Personalizada', val: customRate },
                ].map((opt) => (
                  <TouchableOpacity
                    key={opt.id}
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      padding: 10,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: activeRateSource === opt.id ? '#10B981' : '#334155',
                      backgroundColor: activeRateSource === opt.id ? '#10B98122' : '#0F172A',
                    }}
                    onPress={() => {
                      setActiveRateSource(opt.id as any);
                      Alert.alert('Tasa Seleccionada', `Se cobrará a tasa ${opt.label}.`);
                    }}
                  >
                    <Text style={{ color: activeRateSource === opt.id ? '#A3E635' : '#F8FAFC', fontWeight: 'bold', fontSize: 13 }}>
                      {opt.label}
                    </Text>
                    <Text style={{ color: '#10B981', fontWeight: 'bold' }}>{opt.val} Bs</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {activeRateSource === 'CUSTOM' && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <Text style={{ color: '#CBD5E1', fontSize: 12 }}>Valor Tasa (Bs):</Text>
                  <TextInput
                    style={[styles.input, { width: 90, marginBottom: 0, color: '#10B981', fontWeight: 'bold' }]}
                    value={customRate}
                    onChangeText={setCustomRate}
                    keyboardType="numeric"
                  />
                </View>
              )}
            </View>

            {/* Régimen Fiscal Flexible (Emprendimientos / No Registrados) */}
            <View style={styles.card}>
              <Text style={styles.cardHeader}>Régimen Fiscal (Emprendimientos)</Text>
              <Text style={{ fontSize: 12, color: '#94A3B8', marginBottom: 10 }}>
                Desafilia el IVA e IGTF si eres un negocio que no está registrado ante el SENIAT.
              </Text>

              <View style={{ gap: 8 }}>
                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: 10,
                    borderRadius: 8,
                    backgroundColor: '#0F172A',
                    borderWidth: 1,
                    borderColor: '#334155',
                  }}
                  onPress={() => setEnableIva(!enableIva)}
                >
                  <View>
                    <Text style={{ color: '#F8FAFC', fontWeight: 'bold', fontSize: 13 }}>Cobro de IVA (16%)</Text>
                    <Text style={{ color: '#94A3B8', fontSize: 10 }}>{enableIva ? 'Contribuyente Formal' : '0% IVA (Emprendimiento)'}</Text>
                  </View>
                  <Text style={{ color: enableIva ? '#10B981' : '#64748B', fontWeight: 'bold', fontSize: 12 }}>
                    {enableIva ? '✓ ACTIVO' : '✕ DESAFILIADO'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: 10,
                    borderRadius: 8,
                    backgroundColor: '#0F172A',
                    borderWidth: 1,
                    borderColor: '#334155',
                  }}
                  onPress={() => setEnableIgtf(!enableIgtf)}
                >
                  <View>
                    <Text style={{ color: '#F8FAFC', fontWeight: 'bold', fontSize: 13 }}>Cobro de IGTF (3% Divisas)</Text>
                    <Text style={{ color: '#94A3B8', fontSize: 10 }}>{enableIgtf ? 'Sujeto Pasivo Especial' : '0% IGTF (Exento)'}</Text>
                  </View>
                  <Text style={{ color: enableIgtf ? '#F59E0B' : '#64748B', fontWeight: 'bold', fontSize: 12 }}>
                    {enableIgtf ? '✓ ACTIVO' : '✕ DESAFILIADO'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Margen Global de Ganancia */}
            <View style={styles.card}>
              <Text style={styles.cardHeader}>Fijar Margen de Ganancia Masivo (%)</Text>
              <Text style={{ fontSize: 12, color: '#94A3B8', marginBottom: 8 }}>
                Establece cuánto quieres ganar por producto sin tener que definirlo uno por uno:
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TextInput
                  style={[styles.input, { width: 70, marginBottom: 0, textAlign: 'center', color: '#A3E635', fontWeight: 'bold' }]}
                  value={globalMargin}
                  onChangeText={setGlobalMargin}
                  keyboardType="numeric"
                />
                <Text style={{ color: '#A3E635', fontWeight: 'bold', fontSize: 14 }}>%</Text>
                <TouchableOpacity
                  style={[styles.primaryBtn, { flex: 1 }]}
                  onPress={() => Alert.alert('Margen Aplicado', `Margen del ${globalMargin}% aplicado masivamente a todos los productos.`)}
                >
                  <Text style={styles.primaryBtnText}>⚡ Aplicar a Todos</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Copia de Seguridad / Backup JSON */}
            <View style={styles.card}>
              <Text style={styles.cardHeader}>Respaldo y Seguridad de Datos</Text>
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: '#0284C7' }]}
                onPress={() => Alert.alert('Backup Generado', 'Copia de seguridad cifrada (JSON) lista para exportar.')}
              >
                <Text style={styles.primaryBtnText}>💾 Generar Backup de la BD</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* SECCIÓN 7: GESTIÓN DE CAJEROS EN VIVO */}
        {activeSection === 'USERS' && (
          <View>
            <Text style={styles.sectionTitle}>Supervisión de Vendedores</Text>
            <Text style={styles.sectionDesc}>
              Monitorea las ventas y actividades de tus cajeros en tiempo real.
            </Text>

            <View style={styles.card}>
              <Text style={styles.cardHeader}>Cajeros Activos en Turno</Text>
              <View style={styles.cashierRow}>
                <View>
                  <Text style={{ color: '#F8FAFC', fontWeight: 'bold' }}>cajero1 (Carlos Mendoza)</Text>
                  <Text style={{ color: '#10B981', fontSize: 11 }}>● Conectado • Turno Abierto</Text>
                  <Text style={{ color: '#94A3B8', fontSize: 11, marginTop: 2 }}>Ventas: 18 facturas ($412.50 USD)</Text>
                </View>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardHeader}>Crear Nuevo Vendedor</Text>
              <Text style={styles.fieldLabel}>Usuario:</Text>
              <TextInput
                style={styles.input}
                placeholder="ej. cajero2"
                placeholderTextColor="#64748B"
                value={newCashierUsername}
                onChangeText={setNewCashierUsername}
              />

              <Text style={styles.fieldLabel}>Nombre Completo:</Text>
              <TextInput
                style={styles.input}
                placeholder="ej. Luis Ramírez"
                placeholderTextColor="#64748B"
                value={newCashierName}
                onChangeText={setNewCashierName}
              />

              <TouchableOpacity style={styles.primaryBtn} onPress={handleCreateCashier}>
                <Text style={styles.primaryBtnText}>Registrar Vendedor</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
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
  title: { color: '#F59E0B', fontSize: 18, fontWeight: 'bold' },
  subtitle: { color: '#94A3B8', fontSize: 11, marginTop: 2 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  adminPill: {
    backgroundColor: '#0284C722',
    borderWidth: 1,
    borderColor: '#0284C755',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  adminPillText: { color: '#38BDF8', fontSize: 10, fontWeight: 'bold' },
  posSwitchBtn: {
    backgroundColor: '#10B981',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  posSwitchBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: 'bold' },
  logoutBtn: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  logoutBtnText: { color: '#94A3B8', fontSize: 12, fontWeight: '600' },

  navBar: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  navItem: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 4 },
  navItemActive: { backgroundColor: '#1E293B' },
  navText: { color: '#94A3B8', fontSize: 11, fontWeight: '600' },
  navTextActive: { color: '#38BDF8', fontWeight: 'bold' },

  content: { flex: 1, padding: 14 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#F8FAFC', marginBottom: 4 },
  sectionDesc: { fontSize: 12, color: '#94A3B8', marginBottom: 14, lineHeight: 18 },

  kpiRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  kpiCard: {
    flex: 1,
    backgroundColor: '#1E293B',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  kpiLabel: { color: '#94A3B8', fontSize: 11 },
  kpiValue: { color: '#F8FAFC', fontSize: 20, fontWeight: 'bold', marginTop: 4 },

  card: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardHeader: { fontSize: 14, fontWeight: 'bold', color: '#F8FAFC', marginBottom: 10 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#CBD5E1', marginBottom: 4 },
  input: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    color: '#FFFFFF',
    padding: 10,
    fontSize: 13,
    marginBottom: 10,
  },
  primaryBtn: {
    backgroundColor: '#0284C7',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 13 },

  orderWaBtn: {
    backgroundColor: '#10B981',
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 8,
  },
  orderWaBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 12 },

  debtCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  customerName: { fontSize: 13, fontWeight: 'bold', color: '#F8FAFC' },
  customerDoc: { fontSize: 11, color: '#64748B', marginTop: 2 },
  debtAmount: { fontSize: 12, fontWeight: 'bold', marginTop: 2 },
  waCobroBtn: {
    backgroundColor: '#10B981',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  waCobroBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: 'bold' },

  shareAgainBtn: {
    backgroundColor: '#10B981',
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 8,
  },
  shareAgainBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: 'bold' },

  cashierRow: {
    padding: 10,
    backgroundColor: '#0F172A',
    borderRadius: 8,
  },
});

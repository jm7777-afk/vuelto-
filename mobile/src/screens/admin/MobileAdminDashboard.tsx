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
} from 'react-native';
import { useAuthStore } from '../../stores/auth.store.js';

export const MobileAdminDashboard: React.FC = () => {
  const { user, toggleMode } = useAuthStore();

  const [activeSection, setActiveSection] = useState<'STOCK' | 'DEBTS' | 'SALES' | 'RATES' | 'USERS'>('STOCK');

  // Estado para ajuste rápido de stock
  const [adjustProductId, setAdjustProductId] = useState('');
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustReason, setAdjustReason] = useState('');

  // Estado para nuevo vendedor
  const [newCashierUsername, setNewCashierUsername] = useState('');
  const [newCashierName, setNewCashierName] = useState('');

  const handleAdjustStock = () => {
    if (!adjustProductId || !adjustQty || !adjustReason) {
      Alert.alert('Datos Incompletos', 'Indique el producto, la cantidad y el motivo del ajuste.');
      return;
    }
    Alert.alert('Ajuste Registrado', `Se ajustó el stock a ${adjustQty} unidades. Generado movimiento de Kardex y registro en Auditoría (MOBILE_ADMIN).`);
    setAdjustProductId('');
    setAdjustQty('');
    setAdjustReason('');
  };

  const handleCreateCashier = () => {
    if (!newCashierUsername || !newCashierName) {
      Alert.alert('Datos Incompletos', 'Indique el usuario y el nombre completo.');
      return;
    }
    Alert.alert('Cajero Creado', `Usuario "${newCashierUsername}" creado con rol VENDEDOR.`);
    setNewCashierUsername('');
    setNewCashierName('');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1E293B" />

      {/* Header con Switch a Modo POS */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>VUELTO ADMIN</Text>
          <Text style={styles.subtitle}>{user?.businessName} ({user?.fullName})</Text>
        </View>

        <TouchableOpacity
          style={styles.posSwitchBtn}
          onPress={() => toggleMode('POS')}
        >
          <Text style={styles.posSwitchBtnText}>Ir a Modo POS</Text>
        </TouchableOpacity>
      </View>

      {/* Barra de Navegación por Pestañas */}
      <View style={styles.navBar}>
        {(['STOCK', 'DEBTS', 'SALES', 'RATES', 'USERS'] as const).map((sec) => (
          <TouchableOpacity
            key={sec}
            style={[styles.navItem, activeSection === sec && styles.navItemActive]}
            onPress={() => setActiveSection(sec)}
          >
            <Text style={[styles.navText, activeSection === sec && styles.navTextActive]}>
              {sec === 'STOCK' ? 'Stock' : sec === 'DEBTS' ? 'Cobranzas' : sec === 'SALES' ? 'Ventas' : sec === 'RATES' ? 'Tasas' : 'Usuarios'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.content}>
        {/* SECCIÓN 1: STOCK E INVENTARIO */}
        {activeSection === 'STOCK' && (
          <View>
            <Text style={styles.sectionTitle}>Ajuste Rápido de Stock</Text>
            <Text style={styles.sectionDesc}>
              Permite registrar entradas, salidas o ajustes físicos en depósito. Genera fila en Kardex y Auditoría obligatoria.
            </Text>

            <View style={styles.card}>
              <Text style={styles.fieldLabel}>Producto / Código de Barras:</Text>
              <TextInput
                style={styles.input}
                placeholder="ID o código de barras (ej. 7591234567894)"
                value={adjustProductId}
                onChangeText={setAdjustProductId}
              />

              <Text style={styles.fieldLabel}>Nueva Cantidad Física:</Text>
              <TextInput
                style={styles.input}
                placeholder="Cantidad contada (ej. 45)"
                keyboardType="numeric"
                value={adjustQty}
                onChangeText={setAdjustQty}
              />

              <Text style={styles.fieldLabel}>Motivo del Ajuste (Obligatorio para auditoría):</Text>
              <TextInput
                style={styles.input}
                placeholder="ej. Conteo físico de mostrador / Mercancía dañada"
                value={adjustReason}
                onChangeText={setAdjustReason}
              />

              <TouchableOpacity style={styles.primaryBtn} onPress={handleAdjustStock}>
                <Text style={styles.primaryBtnText}>Guardar Ajuste de Inventario</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.card, { borderColor: '#F59E0B' }]}>
              <Text style={[styles.cardHeader, { color: '#F59E0B' }]}>Alertas de Stock Bajo</Text>
              <Text style={styles.itemText}>- Harina Pan 1kg: 3 unidades restantes (Alerta: ≤ 5)</Text>
              <Text style={styles.itemText}>- Arroz Blanco 1kg: 2 unidades restantes (Alerta: ≤ 5)</Text>
            </View>
          </View>
        )}

        {/* SECCIÓN 2: CUENTAS POR COBRAR */}
        {activeSection === 'DEBTS' && (
          <View>
            <Text style={styles.sectionTitle}>Cuentas por Cobrar & Monederos</Text>
            <View style={styles.card}>
              <Text style={styles.cardHeader}>Clientes con Saldos</Text>
              <View style={styles.debtRow}>
                <View>
                  <Text style={styles.customerName}>Pedro Pérez (V-12345678)</Text>
                  <Text style={styles.debtAmount}>Deuda: $25.00 USD (1,312.50 Bs)</Text>
                </View>
                <TouchableOpacity
                  style={styles.actionPillBtn}
                  onPress={() => Alert.alert('Abono', 'Registrar abono a cuenta de Pedro Pérez')}
                >
                  <Text style={styles.actionPillText}>Cobrar</Text>
                </TouchableOpacity>
              </View>

              <View style={[styles.debtRow, { borderBottomWidth: 0 }]}>
                <View>
                  <Text style={styles.customerName}>María Gómez (V-19876543)</Text>
                  <Text style={[styles.debtAmount, { color: '#16A34A' }]}>Saldo a Favor (Vuelto): $6.50 USD</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* SECCIÓN 3: VENTAS Y REENVÍO */}
        {activeSection === 'SALES' && (
          <View>
            <Text style={styles.sectionTitle}>Últimas Ventas Emitidas</Text>
            {[
              { invoice: 'A-00000042', customer: 'Consumidor Final', total: '$18.88', bs: '991.20 Bs', time: 'Hoy 18:30' },
              { invoice: 'A-00000041', customer: 'Juan Silva', total: '$4.50', bs: '236.25 Bs', time: 'Hoy 17:15' },
            ].map((s) => (
              <View key={s.invoice} style={styles.card}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text style={{ fontWeight: 'bold', color: '#1E293B' }}>{s.invoice}</Text>
                  <Text style={{ color: '#64748B', fontSize: 12 }}>{s.time}</Text>
                </View>
                <Text style={{ fontSize: 14, color: '#334155' }}>Cliente: {s.customer}</Text>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#0284C7', marginVertical: 4 }}>
                  {s.total} ({s.bs})
                </Text>

                <TouchableOpacity
                  style={styles.shareAgainBtn}
                  onPress={() => Alert.alert('Reenviar Factura', 'Abriendo Share Sheet nativo del dispositivo...')}
                >
                  <Text style={styles.shareAgainBtnText}>Reenviar Factura (WhatsApp)</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* SECCIÓN 4: TASAS DE CAMBIO */}
        {activeSection === 'RATES' && (
          <View>
            <Text style={styles.sectionTitle}>Tasas de Cambio del Día</Text>
            <View style={styles.card}>
              <Text style={{ fontSize: 12, color: '#64748B' }}>Tasa Oficial (BCV):</Text>
              <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#16A34A', marginVertical: 4 }}>52.5000 Bs / USD</Text>
              <Text style={{ fontSize: 11, color: '#94A3B8' }}>Actualizado hace 22 minutos</Text>

              <TouchableOpacity
                style={[styles.primaryBtn, { marginTop: 15 }]}
                onPress={() => Alert.alert('Actualizado', 'Tasas sincronizadas con el proveedor oficial.')}
              >
                <Text style={styles.primaryBtnText}>Actualizar Tasa Ahora</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* SECCIÓN 5: USUARIOS Y CAJEROS (LIMITADO EN MÓVIL) */}
        {activeSection === 'USERS' && (
          <View>
            <Text style={styles.sectionTitle}>Gestión de Vendedores</Text>
            <Text style={styles.sectionDesc}>
              En el móvil solo se pueden crear o desactivar usuarios con rol VENDEDOR o CONSULTA.
            </Text>

            <View style={styles.card}>
              <Text style={styles.fieldLabel}>Nombre de Usuario:</Text>
              <TextInput
                style={styles.input}
                placeholder="ej. cajero2"
                value={newCashierUsername}
                onChangeText={setNewCashierUsername}
              />

              <Text style={styles.fieldLabel}>Nombre Completo:</Text>
              <TextInput
                style={styles.input}
                placeholder="ej. Carlos Mendoza"
                value={newCashierName}
                onChangeText={setNewCashierName}
              />

              <TouchableOpacity style={styles.primaryBtn} onPress={handleCreateCashier}>
                <Text style={styles.primaryBtnText}>Crear Vendedor</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#0F172A',
  },
  title: { color: '#F59E0B', fontSize: 18, fontWeight: 'bold' },
  subtitle: { color: '#94A3B8', fontSize: 12 },
  posSwitchBtn: {
    backgroundColor: '#10B981',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  posSwitchBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: 'bold' },

  navBar: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  navItem: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 4 },
  navItemActive: { backgroundColor: '#334155' },
  navText: { color: '#94A3B8', fontSize: 12, fontWeight: '600' },
  navTextActive: { color: '#F59E0B', fontWeight: 'bold' },

  content: { flex: 1, padding: 14 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#0F172A', marginBottom: 4 },
  sectionDesc: { fontSize: 13, color: '#64748B', marginBottom: 12 },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardHeader: { fontSize: 14, fontWeight: 'bold', color: '#0F172A', marginBottom: 8 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#475569', marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 6,
    padding: 10,
    fontSize: 14,
    marginBottom: 10,
  },
  primaryBtn: {
    backgroundColor: '#0284C7',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 14 },

  itemText: { fontSize: 13, color: '#334155', marginVertical: 2 },

  debtRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  customerName: { fontSize: 14, fontWeight: 'bold', color: '#1E293B' },
  debtAmount: { fontSize: 13, fontWeight: 'bold', color: '#DC2626' },
  actionPillBtn: {
    backgroundColor: '#0284C7',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  actionPillText: { color: '#FFFFFF', fontSize: 12, fontWeight: 'bold' },

  shareAgainBtn: {
    backgroundColor: '#16A34A',
    padding: 8,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 6,
  },
  shareAgainBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: 'bold' },
});

import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';

export const App = () => {
  const [activeTab, setActiveTab] = useState<'METRICS' | 'INVENTORY' | 'RECEIVABLES' | 'INTERACTIONS' | 'USERS'>('METRICS');

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#0F172A' }}>
      {/* Sidebar Lateral */}
      <aside style={{ width: '260px', backgroundColor: '#1E293B', padding: '24px 16px', borderRight: '1px solid #334155' }}>
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: 'bold', color: '#38BDF8', letterSpacing: '0.5px' }}>VUELTO</h1>
          <p style={{ fontSize: '12px', color: '#94A3B8' }}>Panel de Administración SaaS</p>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {[
            { id: 'METRICS', label: 'Dashboard & Reportes' },
            { id: 'INVENTORY', label: 'Inventario & Kardex' },
            { id: 'RECEIVABLES', label: 'Cuentas por Cobrar & Vueltos' },
            { id: 'INTERACTIONS', label: 'Contactos & CRM' },
            { id: 'USERS', label: 'Usuarios & Roles (RBAC)' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              style={{
                textAlign: 'left',
                padding: '12px 14px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: activeTab === item.id ? 'bold' : '500',
                backgroundColor: activeTab === item.id ? '#0284C7' : 'transparent',
                color: activeTab === item.id ? '#FFFFFF' : '#94A3B8',
                transition: 'background 0.2s',
              }}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div style={{ marginTop: 'auto', paddingTop: '30px', borderTop: '1px solid #334155' }}>
          <p style={{ fontSize: '11px', color: '#64748B' }}>Tasa BCV del Día:</p>
          <p style={{ fontSize: '16px', fontWeight: 'bold', color: '#10B981' }}>52.5000 Bs / USD</p>
        </div>
      </aside>

      {/* Área de Contenido Principal */}
      <main style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>
        {/* TAB 1: METRICS */}
        {activeTab === 'METRICS' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '4px' }}>Resumen de Operaciones</h2>
                <p style={{ color: '#94A3B8' }}>Métricas consolidadas de ventas, impuestos IGTF e IVA percibidos.</p>
              </div>

              {/* Botón de Exportación Fiscal SENIAT */}
              <button
                onClick={() => {
                  window.open('/api/v1/reports/sales-book/csv', '_blank');
                }}
                style={{
                  backgroundColor: '#16A34A',
                  color: '#FFFFFF',
                  padding: '10px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  fontWeight: 'bold',
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                📥 Descargar Libro de Ventas SENIAT (Excel)
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '32px' }}>
              {[
                { title: 'Ventas Totales Hoy (USD)', value: '$1,480.50', sub: '77 facturas emitidas' },
                { title: 'Ventas Totales Hoy (Bs)', value: '77,726.25 Bs', sub: 'Tasa BCV promedio' },
                { title: 'IVA Percibido (16% & 8%)', value: '$189.20', sub: '9,933.00 Bs' },
                { title: 'IGTF Percibido (3% Cash)', value: '$28.40', sub: 'Efectivo Divisas' },
              ].map((card, idx) => (
                <div key={idx} style={{ backgroundColor: '#1E293B', padding: '20px', borderRadius: '10px', border: '1px solid #334155' }}>
                  <p style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '6px' }}>{card.title}</p>
                  <p style={{ fontSize: '22px', fontWeight: 'bold', color: '#F8FAFC' }}>{card.value}</p>
                  <p style={{ fontSize: '12px', color: '#38BDF8', marginTop: '4px' }}>{card.sub}</p>
                </div>
              ))}
            </div>

            <div style={{ backgroundColor: '#1E293B', padding: '24px', borderRadius: '10px', border: '1px solid #334155' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>Últimas Facturas Fiscales Consecutivas</h3>
              <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ color: '#94A3B8', borderBottom: '1px solid #334155' }}>
                    <th style={{ padding: '10px' }}>Factura N°</th>
                    <th style={{ padding: '10px' }}>Cliente</th>
                    <th style={{ padding: '10px' }}>Total USD</th>
                    <th style={{ padding: '10px' }}>Total Bs</th>
                    <th style={{ padding: '10px' }}>Tasa BCV</th>
                    <th style={{ padding: '10px' }}>Estado Fiscal</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { num: 'A-00000042', client: 'María Rodríguez (V-15987654)', usd: '$18.88', bs: '991.20 Bs', rate: '52.5000', status: 'PENDIENTE SENIAT' },
                    { num: 'A-00000041', client: 'Juan Silva (V-12345678)', usd: '$4.50', bs: '236.25 Bs', rate: '52.5000', status: 'PENDIENTE SENIAT' },
                    { num: 'A-00000040', client: 'Consumidor Final', usd: '$12.00', bs: '630.00 Bs', rate: '52.5000', status: 'PENDIENTE SENIAT' },
                  ].map((row, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #334155' }}>
                      <td style={{ padding: '12px 10px', fontWeight: 'bold', color: '#38BDF8' }}>{row.num}</td>
                      <td style={{ padding: '12px 10px' }}>{row.client}</td>
                      <td style={{ padding: '12px 10px', fontWeight: 'bold' }}>{row.usd}</td>
                      <td style={{ padding: '12px 10px' }}>{row.bs}</td>
                      <td style={{ padding: '12px 10px' }}>{row.rate}</td>
                      <td style={{ padding: '12px 10px' }}><span style={{ backgroundColor: '#F59E0B22', color: '#F59E0B', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>{row.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: INVENTORY */}
        {activeTab === 'INVENTORY' && (
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>Control de Inventario y Almacenes</h2>
            <p style={{ color: '#94A3B8', marginBottom: '24px' }}>Catálogo con códigos de barra de fábrica (759) e internos, costo promedio ponderado y alertas de reposición.</p>

            <div style={{ backgroundColor: '#1E293B', padding: '24px', borderRadius: '10px', border: '1px solid #334155' }}>
              <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ color: '#94A3B8', borderBottom: '1px solid #334155' }}>
                    <th style={{ padding: '10px' }}>Código de Barras</th>
                    <th style={{ padding: '10px' }}>Producto</th>
                    <th style={{ padding: '10px' }}>Costo Promedio</th>
                    <th style={{ padding: '10px' }}>Precio Venta USD</th>
                    <th style={{ padding: '10px' }}>IVA</th>
                    <th style={{ padding: '10px' }}>Stock Disponible</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { barcode: '7591234567894', name: 'Harina Pan 1kg', cost: '$0.95', price: '$1.20', tax: '16%', stock: '45.000', isLow: false },
                    { barcode: '7599876543210', name: 'Arroz Blanco 1kg', cost: '$0.80', price: '$1.10', tax: '0% Exento', stock: '2.000', isLow: true },
                    { barcode: '200000000123', name: 'Queso Blanco Llanero (kg)', cost: '$3.50', price: '$4.80', tax: '0% Exento', stock: '18.500', isLow: false },
                  ].map((p, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #334155' }}>
                      <td style={{ padding: '12px 10px', fontFamily: 'monospace', color: '#38BDF8' }}>{p.barcode}</td>
                      <td style={{ padding: '12px 10px', fontWeight: 'bold' }}>{p.name}</td>
                      <td style={{ padding: '12px 10px' }}>{p.cost}</td>
                      <td style={{ padding: '12px 10px', color: '#10B981', fontWeight: 'bold' }}>{p.price}</td>
                      <td style={{ padding: '12px 10px' }}>{p.tax}</td>
                      <td style={{ padding: '12px 10px' }}>
                        <span style={{ color: p.isLow ? '#EF4444' : '#F8FAFC', fontWeight: 'bold' }}>
                          {p.stock} {p.isLow && '(Stock Bajo)'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: RECEIVABLES & VUELTOS */}
        {activeTab === 'RECEIVABLES' && (
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>Cuentas por Cobrar & Monederos de Vuelto</h2>
            <p style={{ color: '#94A3B8', marginBottom: '24px' }}>Gestión de deudas de clientes, saldos a favor (monedero) y vales de cambio emitidos.</p>

            <div style={{ backgroundColor: '#1E293B', padding: '24px', borderRadius: '10px', border: '1px solid #334155' }}>
              <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ color: '#94A3B8', borderBottom: '1px solid #334155' }}>
                    <th style={{ padding: '10px' }}>Documento</th>
                    <th style={{ padding: '10px' }}>Cliente</th>
                    <th style={{ padding: '10px' }}>Teléfono</th>
                    <th style={{ padding: '10px' }}>Saldo Deuda</th>
                    <th style={{ padding: '10px' }}>Monedero (Saldo a Favor)</th>
                    <th style={{ padding: '10px' }}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { doc: 'V-12345678', name: 'Pedro Pérez', phone: '04141234567', debt: '$25.00', wallet: '$0.00' },
                    { doc: 'V-19876543', name: 'María Gómez', phone: '04245556677', debt: '$0.00', wallet: '$6.50 USD' },
                    { doc: 'J-312456789', name: 'Distribuidora La Candelaria', phone: '02129876543', debt: '$140.00', wallet: '$0.00' },
                  ].map((c, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #334155' }}>
                      <td style={{ padding: '12px 10px', fontWeight: 'bold' }}>{c.doc}</td>
                      <td style={{ padding: '12px 10px' }}>{c.name}</td>
                      <td style={{ padding: '12px 10px' }}>{c.phone}</td>
                      <td style={{ padding: '12px 10px', color: c.debt !== '$0.00' ? '#EF4444' : '#94A3B8', fontWeight: 'bold' }}>{c.debt}</td>
                      <td style={{ padding: '12px 10px', color: c.wallet !== '$0.00' ? '#10B981' : '#94A3B8', fontWeight: 'bold' }}>{c.wallet}</td>
                      <td style={{ padding: '12px 10px' }}>
                        <button style={{ backgroundColor: '#0284C7', color: '#FFF', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Ver Historial</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: INTERACTIONS */}
        {activeTab === 'INTERACTIONS' && (
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>Historial de Interacciones & Contactos (CRM)</h2>
            <p style={{ color: '#94A3B8', marginBottom: '24px' }}>Bitácora inmutable de llamadas, visitas y seguimiento con clientes y proveedores.</p>

            <div style={{ backgroundColor: '#1E293B', padding: '24px', borderRadius: '10px', border: '1px solid #334155' }}>
              {[
                { channel: 'LLAMADA', target: 'Cliente: Pedro Pérez', date: 'Hoy 15:30', summary: 'Acordado abono de $15 para el viernes 28', user: 'Admin' },
                { channel: 'VISITA', target: 'Proveedor: Alimentos Polar', date: 'Ayer 10:00', summary: 'Revisión de lista de precios Harina Pan y arroz', user: 'Admin' },
                { channel: 'WHATSAPP', target: 'Cliente: María Gómez', date: '21 Nov 16:45', summary: 'Envío de cotización para pedido mayorista', user: 'Cajero 1' },
              ].map((item, idx) => (
                <div key={idx} style={{ padding: '14px 0', borderBottom: idx < 2 ? '1px solid #334155' : 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ backgroundColor: '#0284C722', color: '#38BDF8', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>{item.channel}</span>
                    <span style={{ fontSize: '12px', color: '#64748B' }}>{item.date} por {item.user}</span>
                  </div>
                  <p style={{ fontSize: '14px', fontWeight: 'bold', color: '#F8FAFC' }}>{item.target}</p>
                  <p style={{ fontSize: '13px', color: '#94A3B8', marginTop: '2px' }}>{item.summary}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: USERS & RBAC */}
        {activeTab === 'USERS' && (
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>Usuarios & Control de Roles (RBAC)</h2>
            <p style={{ color: '#94A3B8', marginBottom: '24px' }}>Gestión de acceso: SUPER_ADMIN, ADMIN (acceso a móvil admin), VENDEDOR (solo POS) y CONSULTA.</p>

            <div style={{ backgroundColor: '#1E293B', padding: '24px', borderRadius: '10px', border: '1px solid #334155' }}>
              <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ color: '#94A3B8', borderBottom: '1px solid #334155' }}>
                    <th style={{ padding: '10px' }}>Usuario</th>
                    <th style={{ padding: '10px' }}>Nombre</th>
                    <th style={{ padding: '10px' }}>Rol RBAC</th>
                    <th style={{ padding: '10px' }}>Acceso Móvil</th>
                    <th style={{ padding: '10px' }}>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { user: 'admin', name: 'Administrador General', role: 'ADMIN', mobile: 'Modo POS + Modo Admin', active: true },
                    { user: 'cajero1', name: 'Carlos Mendoza', role: 'VENDEDOR', mobile: 'Solo Modo POS', active: true },
                    { user: 'cajero2', name: 'Ana Rodríguez', role: 'VENDEDOR', mobile: 'Solo Modo POS', active: true },
                    { user: 'auditor', name: 'Contador Externo', role: 'CONSULTA', mobile: 'Sin acceso POS', active: true },
                  ].map((u, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #334155' }}>
                      <td style={{ padding: '12px 10px', fontWeight: 'bold' }}>{u.user}</td>
                      <td style={{ padding: '12px 10px' }}>{u.name}</td>
                      <td style={{ padding: '12px 10px', color: '#38BDF8', fontWeight: 'bold' }}>{u.role}</td>
                      <td style={{ padding: '12px 10px', color: '#94A3B8' }}>{u.mobile}</td>
                      <td style={{ padding: '12px 10px' }}>
                        <span style={{ backgroundColor: '#10B98122', color: '#10B981', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>ACTIVO</span>
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
  );
};

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(<App />);

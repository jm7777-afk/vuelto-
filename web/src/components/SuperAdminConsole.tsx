import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Building,
  Activity,
  ShieldCheck,
  KeyRound,
  Plus,
  Search,
  RefreshCw,
  LogOut,
  Eye,
  Edit3,
  Trash2,
  ToggleLeft,
  ToggleRight,
  X,
  CheckCircle,
  AlertTriangle,
  Database,
  Cpu,
  Users,
  Lock,
  Pause,
  Play,
  Menu,
  Server,
  Clock,
  Terminal,
  Copy,
  UserPlus,
} from 'lucide-react';
import type {
  UserProfile,
  TenantItem,
  TenantUserItem,
  AuditLogItem,
  SystemLogEvent,
  MonitoringSnapshot,
} from '../types';
import { apiFetch, getAccessToken, setSessionTokens } from '../services/api';

interface SuperAdminConsoleProps {
  user: UserProfile;
  bcvRate: number;
  onLogout: () => void;
  onUserUpdated: (updated: UserProfile) => void;
}

type SuperAdminTab = 'TENANTS' | 'MONITORING' | 'AUDIT' | 'SECURITY';

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  return `${m}m ${s}s`;
}

function generateStrongPassword(): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const nums = '23456789';
  const syms = '!@#$%';
  const all = upper + lower + nums + syms;
  let pwd =
    upper[Math.floor(Math.random() * upper.length)] +
    lower[Math.floor(Math.random() * lower.length)] +
    nums[Math.floor(Math.random() * nums.length)] +
    syms[Math.floor(Math.random() * syms.length)];
  for (let i = 0; i < 8; i++) {
    pwd += all[Math.floor(Math.random() * all.length)];
  }
  return pwd;
}

export const SuperAdminConsole: React.FC<SuperAdminConsoleProps> = ({
  user,
  bcvRate,
  onLogout,
  onUserUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<SuperAdminTab>('TENANTS');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Toast / Banner global
  const [banner, setBanner] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const showBanner = (type: 'success' | 'error' | 'info', text: string) => {
    setBanner({ type, text });
    setTimeout(() => setBanner((prev) => (prev?.text === text ? null : prev)), 7000);
  };

  // ==================== 1. TENANTS (CRUD REAL DESDE POSTGRESQL) ====================
  const [tenantsList, setTenantsList] = useState<TenantItem[]>([]);
  const [tenantsLoading, setTenantsLoading] = useState(false);
  const [tenantSearchQuery, setTenantSearchQuery] = useState('');
  const [tenantFilterStatus, setTenantFilterStatus] = useState<'ALL' | 'ACTIVE' | 'SUSPENDED' | 'SPECIAL'>('ALL');

  // Crear Tenant
  const [isAddTenantModalOpen, setIsAddTenantModalOpen] = useState(false);
  const [creatingTenant, setCreatingTenant] = useState(false);
  const [newTenantBusinessName, setNewTenantBusinessName] = useState('');
  const [newTenantTradeName, setNewTenantTradeName] = useState('');
  const [newTenantSlug, setNewTenantSlug] = useState('');
  const [newTenantDocType, setNewTenantDocType] = useState<'J' | 'G' | 'V' | 'E'>('J');
  const [newTenantDocNumber, setNewTenantDocNumber] = useState('');
  const [newTenantAddress, setNewTenantAddress] = useState('');
  const [newTenantPhone, setNewTenantPhone] = useState('');
  const [newTenantEmail, setNewTenantEmail] = useState('');
  const [newTenantIsSpecial, setNewTenantIsSpecial] = useState(false);
  const [newTenantPrefix, setNewTenantPrefix] = useState('200');
  const [newAdminUsername, setNewAdminUsername] = useState('');
  const [newAdminFullName, setNewAdminFullName] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState(() => generateStrongPassword());
  const [createdCredentialsBanner, setCreatedCredentialsBanner] = useState<{
    businessName: string;
    slug: string;
    username: string;
    password: string;
  } | null>(null);

  // Editar Tenant
  const [editingTenant, setEditingTenant] = useState<TenantItem | null>(null);
  const [isEditTenantModalOpen, setIsEditTenantModalOpen] = useState(false);
  const [savingEditTenant, setSavingEditTenant] = useState(false);

  // Eliminar Tenant
  const [deletingTenant, setDeletingTenant] = useState<TenantItem | null>(null);
  const [isDeleteTenantModalOpen, setIsDeleteTenantModalOpen] = useState(false);
  const [deleteConfirmSlug, setDeleteConfirmSlug] = useState('');
  const [deletingLoading, setDeletingLoading] = useState(false);

  // Detalle + Usuarios del Tenant
  const [selectedTenantDetail, setSelectedTenantDetail] = useState<TenantItem | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [newUserUsername, setNewUserUsername] = useState('');
  const [newUserFullName, setNewUserFullName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<'ADMIN' | 'VENDEDOR' | 'CONSULTA'>('VENDEDOR');
  const [newUserPassword, setNewUserPassword] = useState(() => generateStrongPassword());
  const [creatingTenantUser, setCreatingTenantUser] = useState(false);
  const [resetPwdTarget, setResetPwdTarget] = useState<TenantUserItem | null>(null);
  const [resetPwdValue, setResetPwdValue] = useState('');

  const loadTenants = useCallback(async () => {
    setTenantsLoading(true);
    try {
      const res = await apiFetch('/api/v1/tenants', {}, onLogout);
      if (res.ok) {
        const data = await res.json();
        setTenantsList(Array.isArray(data) ? data : []);
      } else {
        const err = await res.json().catch(() => ({}));
        showBanner('error', err.message || 'No se pudieron cargar los tenants');
      }
    } catch {
      showBanner('error', 'Error de conexión cargando tenants');
    } finally {
      setTenantsLoading(false);
    }
  }, [onLogout]);

  // ==================== 2. MONITOREO EN TIEMPO REAL (SSE + SNAPSHOT) ====================
  const [snapshot, setSnapshot] = useState<MonitoringSnapshot | null>(null);
  const [liveEvents, setLiveEvents] = useState<SystemLogEvent[]>([]);
  const [sseConnected, setSseConnected] = useState(false);
  const [streamPaused, setStreamPaused] = useState(false);
  const [liveFilterLevel, setLiveFilterLevel] = useState<'ALL' | 'INFO' | 'WARN' | 'ERROR'>('ALL');
  const [liveFilterCategory, setLiveFilterCategory] = useState<'ALL' | 'HTTP' | 'AUDIT' | 'SECURITY' | 'ERROR'>('ALL');
  const [liveSearch, setLiveSearch] = useState('');
  const streamPausedRef = useRef(streamPaused);
  streamPausedRef.current = streamPaused;

  const loadSnapshot = useCallback(async () => {
    try {
      const res = await apiFetch('/api/v1/super-admin/monitoring/snapshot', {}, onLogout);
      if (res.ok) {
        const data: MonitoringSnapshot = await res.json();
        setSnapshot(data);
        if (Array.isArray(data.recentEvents)) {
          setLiveEvents(data.recentEvents);
        }
      }
    } catch {
      // Silencioso en polling
    }
  }, [onLogout]);

  useEffect(() => {
    loadTenants();
    loadSnapshot();
  }, [loadTenants, loadSnapshot]);

  // Suscripción SSE en tiempo real para Monitoreo
  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;

    const es = new EventSource(`/api/v1/super-admin/monitoring/stream?token=${encodeURIComponent(token)}`);

    es.onopen = () => {
      setSseConnected(true);
    };

    es.addEventListener('snapshot', (e: MessageEvent) => {
      try {
        const data: MonitoringSnapshot = JSON.parse(e.data);
        setSnapshot(data);
        if (!streamPausedRef.current && Array.isArray(data.recentEvents)) {
          setLiveEvents(data.recentEvents);
        }
      } catch {}
    });

    es.addEventListener('telemetry', (e: MessageEvent) => {
      try {
        const data: MonitoringSnapshot = JSON.parse(e.data);
        setSnapshot(data);
      } catch {}
    });

    es.addEventListener('event', (e: MessageEvent) => {
      if (streamPausedRef.current) return;
      try {
        const evt: SystemLogEvent = JSON.parse(e.data);
        setLiveEvents((prev) => [evt, ...prev].slice(0, 250));
      } catch {}
    });

    es.onerror = () => {
      setSseConnected(false);
    };

    return () => {
      es.close();
      setSseConnected(false);
    };
  }, [user.id]);

  // ==================== 3. AUDITORÍA INMUTABLE GLOBAL (POSTGRESQL) ====================
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditPage, setAuditPage] = useState(1);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditTenantFilter, setAuditTenantFilter] = useState('');
  const [auditChannelFilter, setAuditChannelFilter] = useState('');
  const [auditResultFilter, setAuditResultFilter] = useState('');
  const [auditSearch, setAuditSearch] = useState('');
  const [selectedAuditPayload, setSelectedAuditPayload] = useState<AuditLogItem | null>(null);

  const loadAuditLogs = useCallback(async (pageToLoad = auditPage) => {
    setAuditLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(pageToLoad),
        limit: '30',
      });
      if (auditTenantFilter) params.set('tenantId', auditTenantFilter);
      if (auditChannelFilter) params.set('channel', auditChannelFilter);
      if (auditResultFilter) params.set('result', auditResultFilter);
      if (auditSearch.trim()) params.set('search', auditSearch.trim());

      const res = await apiFetch(`/api/v1/audit/logs?${params.toString()}`, {}, onLogout);
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(Array.isArray(data.logs) ? data.logs : []);
        setAuditTotal(data.total || 0);
      }
    } catch {
      showBanner('error', 'Error consultando registros de auditoría');
    } finally {
      setAuditLoading(false);
    }
  }, [auditPage, auditTenantFilter, auditChannelFilter, auditResultFilter, auditSearch, onLogout]);

  useEffect(() => {
    if (activeTab === 'AUDIT') {
      loadAuditLogs(auditPage);
    }
  }, [activeTab, auditPage, loadAuditLogs]);

  // ==================== 4. SEGURIDAD Y CAMBIO DE CONTRASEÑA SUPER ADMIN ====================
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const [twoFactorQr, setTwoFactorQr] = useState<string | null>(null);
  const [twoFactorSecret, setTwoFactorSecret] = useState<string | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [enabling2FA, setEnabling2FA] = useState(false);

  // ==================== HANDLERS CRUD TENANTS ====================
  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTenantBusinessName.trim() || !newTenantDocNumber.trim()) {
      showBanner('error', 'Razón Social y RIF son obligatorios.');
      return;
    }
    if (!newAdminUsername.trim() || newAdminPassword.length < 8) {
      showBanner('error', 'Debe definir usuario administrador y contraseña (mínimo 8 caracteres).');
      return;
    }

    setCreatingTenant(true);
    try {
      const cleanSlug = (newTenantSlug.trim() || newTenantBusinessName)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 40);

      const payload = {
        slug: cleanSlug,
        businessName: newTenantBusinessName.trim(),
        tradeName: (newTenantTradeName || newTenantBusinessName).trim(),
        documentType: newTenantDocType,
        documentNumber: newTenantDocNumber.replace(/[^0-9]/g, ''),
        fiscalAddress: newTenantAddress.trim() || 'Venezuela',
        phone: newTenantPhone.trim(),
        email: newTenantEmail.trim().toLowerCase(),
        isSpecialTaxpayer: newTenantIsSpecial,
        internalBarcodePrefix: newTenantPrefix.trim() || '200',
        adminUsername: newAdminUsername.trim().toLowerCase(),
        adminFullName: (newAdminFullName || `Administrador ${newTenantTradeName || newTenantBusinessName}`).trim(),
        adminEmail: (newAdminEmail || newTenantEmail).trim().toLowerCase(),
        adminPassword: newAdminPassword,
      };

      const res = await apiFetch('/api/v1/tenants', {
        method: 'POST',
        body: JSON.stringify(payload),
      }, onLogout);

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showBanner('error', data.message || 'No se pudo crear el comercio.');
        return;
      }

      setCreatedCredentialsBanner({
        businessName: data.businessName || payload.businessName,
        slug: data.slug || payload.slug,
        username: payload.adminUsername,
        password: payload.adminPassword,
      });

      setIsAddTenantModalOpen(false);
      setNewTenantBusinessName('');
      setNewTenantTradeName('');
      setNewTenantSlug('');
      setNewTenantDocNumber('');
      setNewTenantAddress('');
      setNewTenantPhone('');
      setNewTenantEmail('');
      setNewTenantIsSpecial(false);
      setNewAdminUsername('');
      setNewAdminFullName('');
      setNewAdminEmail('');
      setNewAdminPassword(generateStrongPassword());

      await loadTenants();
      await loadSnapshot();
      showBanner('success', `Tenant "${payload.businessName}" creado en PostgreSQL.`);
    } catch {
      showBanner('error', 'Error de red creando tenant.');
    } finally {
      setCreatingTenant(false);
    }
  };

  const handleUpdateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTenant) return;
    setSavingEditTenant(true);
    try {
      const res = await apiFetch(`/api/v1/tenants/${editingTenant.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          businessName: editingTenant.businessName,
          tradeName: editingTenant.tradeName,
          documentType: editingTenant.documentType,
          documentNumber: editingTenant.documentNumber,
          fiscalAddress: editingTenant.fiscalAddress,
          phone: editingTenant.phone,
          email: editingTenant.email,
          isSpecialTaxpayer: editingTenant.isSpecialTaxpayer,
        }),
      }, onLogout);

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        showBanner('error', err.message || 'No se pudo actualizar el tenant.');
        return;
      }

      setIsEditTenantModalOpen(false);
      setEditingTenant(null);
      await loadTenants();
      showBanner('success', 'Comercio actualizado correctamente.');
    } catch {
      showBanner('error', 'Error de red actualizando comercio.');
    } finally {
      setSavingEditTenant(false);
    }
  };

  const handleToggleTenantActive = async (tenant: TenantItem) => {
    try {
      const res = await apiFetch(`/api/v1/tenants/${tenant.id}/toggle-active`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !tenant.isActive }),
      }, onLogout);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        showBanner('error', err.message || 'No se pudo cambiar el estado.');
        return;
      }
      await loadTenants();
      await loadSnapshot();
      showBanner(
        'info',
        `Comercio "${tenant.businessName}" marcado como ${!tenant.isActive ? 'ACTIVO' : 'SUSPENDIDO'}.`
      );
    } catch {
      showBanner('error', 'Error de red cambiando estado.');
    }
  };

  const handlePermanentDeleteTenant = async () => {
    if (!deletingTenant) return;
    if (deleteConfirmSlug.trim() !== deletingTenant.slug) {
      showBanner('error', `Debes escribir exactamente el slug "${deletingTenant.slug}" para confirmar la eliminación.`);
      return;
    }

    setDeletingLoading(true);
    try {
      const res = await apiFetch(`/api/v1/tenants/${deletingTenant.id}`, {
        method: 'DELETE',
      }, onLogout);

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        showBanner('error', err.message || 'No se pudo eliminar el comercio.');
        return;
      }

      const deletedName = deletingTenant.businessName;
      setIsDeleteTenantModalOpen(false);
      setDeletingTenant(null);
      setDeleteConfirmSlug('');
      await loadTenants();
      await loadSnapshot();
      showBanner('success', `Comercio "${deletedName}" y todos sus registros fueron eliminados permanentemente.`);
    } catch {
      showBanner('error', 'Error de red eliminando tenant.');
    } finally {
      setDeletingLoading(false);
    }
  };

  const openTenantDetail = async (tenant: TenantItem) => {
    setSelectedTenantDetail(tenant);
    setIsDetailModalOpen(true);
    setDetailLoading(true);
    try {
      const res = await apiFetch(`/api/v1/tenants/${tenant.id}`, {}, onLogout);
      if (res.ok) {
        const full = await res.json();
        setSelectedTenantDetail(full);
      }
    } catch {}
    setDetailLoading(false);
  };

  const handleCreateTenantUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenantDetail) return;
    setCreatingTenantUser(true);
    try {
      const res = await apiFetch(`/api/v1/tenants/${selectedTenantDetail.id}/users`, {
        method: 'POST',
        body: JSON.stringify({
          username: newUserUsername.trim().toLowerCase(),
          fullName: newUserFullName.trim(),
          email: newUserEmail.trim().toLowerCase(),
          roleId: newUserRole,
          password: newUserPassword,
        }),
      }, onLogout);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showBanner('error', data.message || 'Error creando usuario');
        return;
      }
      showBanner('success', `Usuario @${data.username} (${data.roleId}) creado en ${selectedTenantDetail.businessName}.`);
      setNewUserUsername('');
      setNewUserFullName('');
      setNewUserEmail('');
      setNewUserPassword(generateStrongPassword());
      await openTenantDetail(selectedTenantDetail);
      await loadTenants();
    } catch {
      showBanner('error', 'Error de red creando usuario.');
    } finally {
      setCreatingTenantUser(false);
    }
  };

  const handleResetTenantUserPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenantDetail || !resetPwdTarget) return;
    try {
      const res = await apiFetch(
        `/api/v1/tenants/${selectedTenantDetail.id}/users/${resetPwdTarget.id}/reset-password`,
        {
          method: 'POST',
          body: JSON.stringify({ newPassword: resetPwdValue }),
        },
        onLogout
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showBanner('error', data.message || 'No se pudo cambiar la contraseña.');
        return;
      }
      showBanner('success', `Contraseña actualizada para @${resetPwdTarget.username}.`);
      setResetPwdTarget(null);
      setResetPwdValue('');
    } catch {
      showBanner('error', 'Error de red restableciendo contraseña.');
    }
  };

  // ==================== HANDLERS SEGURIDAD SUPER ADMIN ====================
  const pwdChecks = {
    len: newPassword.length >= 8,
    upper: /[A-Z]/.test(newPassword),
    lower: /[a-z]/.test(newPassword),
    num: /[0-9]/.test(newPassword),
    match: newPassword.length > 0 && newPassword === confirmPassword,
  };
  const pwdAllValid = Object.values(pwdChecks).every(Boolean);

  const handleChangeSuperAdminPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pwdAllValid) {
      showBanner('error', 'La nueva contraseña no cumple con todos los requisitos.');
      return;
    }

    setChangingPassword(true);
    try {
      const res = await apiFetch('/api/v1/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      }, onLogout);

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showBanner('error', data.message || 'Error al cambiar contraseña.');
        return;
      }

      if (data.tokens?.accessToken) {
        setSessionTokens(data.tokens.accessToken, data.tokens.refreshToken);
      }

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showBanner('success', 'Contraseña de Súper Administrador actualizada y sesiones previas revocadas.');
    } catch {
      showBanner('error', 'Error de red cambiando contraseña.');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleGenerate2FA = async () => {
    try {
      const res = await apiFetch('/api/v1/auth/2fa/generate', { method: 'POST' }, onLogout);
      const data = await res.json();
      if (res.ok) {
        setTwoFactorQr(data.qrCodeDataUrl);
        setTwoFactorSecret(data.secret);
      }
    } catch {
      showBanner('error', 'No se pudo generar código QR 2FA.');
    }
  };

  const handleEnable2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!twoFactorSecret || !twoFactorCode) return;
    setEnabling2FA(true);
    try {
      const res = await apiFetch('/api/v1/auth/2fa/enable', {
        method: 'POST',
        body: JSON.stringify({ secret: twoFactorSecret, code: twoFactorCode.trim() }),
      }, onLogout);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showBanner('error', data.error || data.message || 'Código TOTP inválido.');
        return;
      }
      setTwoFactorQr(null);
      setTwoFactorSecret(null);
      setTwoFactorCode('');
      onUserUpdated({ ...user, twoFactorEnabled: true });
      showBanner('success', '2FA TOTP activado correctamente para el Súper Administrador.');
    } catch {
      showBanner('error', 'Error activando 2FA.');
    } finally {
      setEnabling2FA(false);
    }
  };

  const filteredTenants = tenantsList.filter((t) => {
    const q = tenantSearchQuery.trim().toLowerCase();
    const matchesQuery =
      !q ||
      t.businessName.toLowerCase().includes(q) ||
      t.tradeName.toLowerCase().includes(q) ||
      t.documentNumber.includes(q) ||
      t.slug.toLowerCase().includes(q);
    if (!matchesQuery) return false;
    if (tenantFilterStatus === 'ACTIVE') return t.isActive;
    if (tenantFilterStatus === 'SUSPENDED') return !t.isActive;
    if (tenantFilterStatus === 'SPECIAL') return t.isSpecialTaxpayer;
    return true;
  });

  const filteredLiveEvents = liveEvents.filter((evt) => {
    if (liveFilterLevel !== 'ALL' && evt.level !== liveFilterLevel) return false;
    if (liveFilterCategory !== 'ALL' && evt.category !== liveFilterCategory) return false;
    if (liveSearch.trim()) {
      const q = liveSearch.trim().toLowerCase();
      const hay = `${evt.message} ${evt.path || ''} ${evt.action || ''} ${evt.username || ''} ${evt.reqId || ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const navItems: Array<{ id: SuperAdminTab; label: string; desc: string; icon: React.ReactNode }> = [
    { id: 'TENANTS', label: 'Gestión de Tenants', desc: 'Alta, edición y baja de comercios', icon: <Building size={18} /> },
    { id: 'MONITORING', label: 'Monitoreo en Vivo', desc: 'Telemetría y eventos en tiempo real', icon: <Activity size={18} /> },
    { id: 'AUDIT', label: 'Auditoría y Logs', desc: 'Trazabilidad inmutable del sistema', icon: <ShieldCheck size={18} /> },
    { id: 'SECURITY', label: 'Mi Cuenta & Clave', desc: 'Contraseña Súper Admin y 2FA', icon: <KeyRound size={18} /> },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: '#071F27', color: '#F8FAFC' }}>
      <style>{`
        @media (max-width: 860px) {
          .sa-sidebar { position: fixed !important; top: 0; bottom: 0; left: 0; z-index: 1000 !important; transform: translateX(-100%); transition: transform 0.25s ease !important; }
          .sa-sidebar.open { transform: translateX(0) !important; }
          .sa-mobile-bar { display: flex !important; }
          .sa-main { padding: 16px !important; }
        }
        @media (min-width: 861px) {
          .sa-mobile-bar { display: none !important; }
          .sa-backdrop { display: none !important; }
        }
      `}</style>

      {/* Cabecera Móvil */}
      <header className="sa-mobile-bar" style={{ display: 'none', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', backgroundColor: '#0B3B49', borderBottom: '1px solid #155E75', position: 'sticky', top: 0, zIndex: 500 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} style={{ background: 'none', border: 'none', color: '#F8FAFC', cursor: 'pointer' }}>
            <Menu size={22} />
          </button>
          <span style={{ fontWeight: '900', fontSize: '18px' }}>vuelto<span style={{ color: '#A3E635' }}>.</span> <span style={{ fontSize: '11px', color: '#38BDF8', fontWeight: 'bold' }}>PLATFORM</span></span>
        </div>
        <button onClick={onLogout} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}>
          <LogOut size={18} />
        </button>
      </header>

      {mobileMenuOpen && (
        <div className="sa-backdrop" onClick={() => setMobileMenuOpen(false)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 999 }} />
      )}

      <div style={{ display: 'flex', flex: 1 }}>
        {/* SIDEBAR EXCLUSIVO SÚPER ADMIN (CERO FUNCIONES DE CAJA/POS CONFUSAS) */}
        <aside className={`sa-sidebar ${mobileMenuOpen ? 'open' : ''}`} style={{ width: '285px', backgroundColor: '#0B3B49', borderRight: '1px solid #155E75', padding: '24px 16px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <img src="/vuelto-icon.jpg" alt="Vuelto" style={{ width: '40px', height: '40px', borderRadius: '10px', objectFit: 'cover' }} />
            <div>
              <h1 style={{ fontSize: '20px', fontWeight: '900', lineHeight: 1 }}>vuelto<span style={{ color: '#A3E635' }}>.</span></h1>
              <span style={{ fontSize: '10px', color: '#A3E635', fontWeight: 'bold' }}>Consola de Plataforma SaaS</span>
            </div>
          </div>

          <div style={{ padding: '8px 10px', borderRadius: '8px', backgroundColor: '#062F3B', border: '1px solid #38BDF844', marginBottom: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#38BDF8' }}>SÚPER ADMINISTRADOR</span>
              <span style={{ fontSize: '10px', color: sseConnected ? '#10B981' : '#F59E0B', fontWeight: 'bold' }}>
                {sseConnected ? '● LIVE' : '○ SYNC'}
              </span>
            </div>
            <p style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>Control global multi-tenant</p>
          </div>

          <nav style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => { setActiveTab(item.id); setMobileMenuOpen(false); }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '11px 12px',
                    borderRadius: '10px',
                    border: isActive ? '1px solid #38BDF8' : '1px solid transparent',
                    backgroundColor: isActive ? '#0284C7' : 'transparent',
                    color: isActive ? '#FFFFFF' : '#CBD5E1',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {item.icon}
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 'bold' }}>{item.label}</div>
                    <div style={{ fontSize: '10px', color: isActive ? '#E0F2FE' : '#64748B' }}>{item.desc}</div>
                  </div>
                </button>
              );
            })}
          </nav>

          {/* Info BCV y Estado DB */}
          <div style={{ backgroundColor: '#062F3B', padding: '12px', borderRadius: '10px', border: '1px solid #155E75', marginBottom: '14px', fontSize: '11px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ color: '#94A3B8' }}>Base de Datos:</span>
              <span style={{ color: snapshot?.database.status === 'connected' ? '#10B981' : '#F59E0B', fontWeight: 'bold' }}>
                {snapshot?.database.status === 'connected' ? `OK (${snapshot.database.latencyMs}ms)` : 'Verificando...'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#94A3B8' }}>BCV Referencial:</span>
              <span style={{ color: '#A3E635', fontWeight: 'bold' }}>{bcvRate.toFixed(2)} Bs/$</span>
            </div>
          </div>

          {/* Usuario y Logout */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '12px', borderTop: '1px solid #155E75' }}>
            <div>
              <p style={{ fontSize: '12px', fontWeight: 'bold', color: '#F8FAFC' }}>{user.fullName}</p>
              <p style={{ fontSize: '10px', color: '#38BDF8' }}>@{user.username} • SUPER_ADMIN</p>
            </div>
            <button onClick={onLogout} title="Cerrar sesión" style={{ background: 'none', border: '1px solid #334155', borderRadius: '8px', color: '#CBD5E1', cursor: 'pointer', padding: '6px' }}>
              <LogOut size={16} />
            </button>
          </div>
        </aside>

        {/* CONTENIDO PRINCIPAL */}
        <main className="sa-main" style={{ flex: 1, padding: '28px', overflowY: 'auto' }}>
          {banner && (
            <div
              style={{
                marginBottom: '18px',
                padding: '12px 16px',
                borderRadius: '10px',
                backgroundColor: banner.type === 'success' ? '#10B98122' : banner.type === 'error' ? '#EF444422' : '#0284C722',
                border: `1px solid ${banner.type === 'success' ? '#10B981' : banner.type === 'error' ? '#EF4444' : '#38BDF8'}`,
                color: banner.type === 'success' ? '#A3E635' : banner.type === 'error' ? '#FCA5A5' : '#BAE6FD',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '13px',
                fontWeight: '600',
              }}
            >
              <span>{banner.text}</span>
              <button onClick={() => setBanner(null)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>
                <X size={16} />
              </button>
            </div>
          )}

          {/* BANNER DE CREDENCIALES TRAS CREAR TENANT */}
          {createdCredentialsBanner && (
            <div style={{ marginBottom: '20px', padding: '16px 20px', borderRadius: '12px', backgroundColor: '#062F3B', border: '2px solid #10B981' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h4 style={{ fontSize: '15px', fontWeight: 'bold', color: '#A3E635' }}>
                    Comercio "{createdCredentialsBanner.businessName}" creado en PostgreSQL
                  </h4>
                  <p style={{ fontSize: '12px', color: '#CBD5E1', marginTop: '4px' }}>
                    Guarda o entrega estas credenciales al administrador del comercio:
                  </p>
                  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginTop: '10px', fontSize: '13px', fontFamily: 'monospace' }}>
                    <span>Slug: <strong style={{ color: '#38BDF8' }}>{createdCredentialsBanner.slug}</strong></span>
                    <span>Usuario: <strong style={{ color: '#FFFFFF' }}>{createdCredentialsBanner.username}</strong></span>
                    <span>Contraseña: <strong style={{ color: '#A3E635' }}>{createdCredentialsBanner.password}</strong></span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => {
                      navigator.clipboard?.writeText(
                        `Comercio: ${createdCredentialsBanner.businessName}\nSlug: ${createdCredentialsBanner.slug}\nUsuario: ${createdCredentialsBanner.username}\nContraseña: ${createdCredentialsBanner.password}`
                      );
                      showBanner('info', 'Credenciales copiadas al portapapeles.');
                    }}
                    style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #10B981', backgroundColor: '#10B98122', color: '#A3E635', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Copy size={13} /> Copiar
                  </button>
                  <button onClick={() => setCreatedCredentialsBanner(null)} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}>
                    <X size={18} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ==================== TAB 1: GESTIÓN DE TENANTS ==================== */}
          {activeTab === 'TENANTS' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>Gestión de Comercios (Tenants)</h2>
                  <p style={{ color: '#94A3B8', fontSize: '13px' }}>
                    Creación manual, administración de usuarios, suspensión y eliminación permanente directamente en base de datos.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={loadTenants}
                    disabled={tenantsLoading}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 14px', borderRadius: '8px', border: '1px solid #155E75', backgroundColor: '#062F3B', color: '#CBD5E1', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}
                  >
                    <RefreshCw size={14} />
                    <span>Actualizar</span>
                  </button>
                  <button
                    onClick={() => setIsAddTenantModalOpen(true)}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#10B981', color: '#071F27', padding: '10px 18px', borderRadius: '8px', border: 'none', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}
                  >
                    <Plus size={16} />
                    <span>Crear Nuevo Tenant</span>
                  </button>
                </div>
              </div>

              {/* KPIs reales */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '20px' }}>
                <div style={{ backgroundColor: '#0B3B49', padding: '16px', borderRadius: '12px', border: '1px solid #155E75' }}>
                  <span style={{ fontSize: '11px', color: '#94A3B8' }}>Total Tenants en BD</span>
                  <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#38BDF8', marginTop: '4px' }}>{tenantsList.length}</p>
                </div>
                <div style={{ backgroundColor: '#0B3B49', padding: '16px', borderRadius: '12px', border: '1px solid #155E75' }}>
                  <span style={{ fontSize: '11px', color: '#94A3B8' }}>Comercios Activos</span>
                  <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#10B981', marginTop: '4px' }}>{tenantsList.filter((t) => t.isActive).length}</p>
                </div>
                <div style={{ backgroundColor: '#0B3B49', padding: '16px', borderRadius: '12px', border: '1px solid #155E75' }}>
                  <span style={{ fontSize: '11px', color: '#94A3B8' }}>Comercios Suspendidos</span>
                  <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#EF4444', marginTop: '4px' }}>{tenantsList.filter((t) => !t.isActive).length}</p>
                </div>
                <div style={{ backgroundColor: '#0B3B49', padding: '16px', borderRadius: '12px', border: '1px solid #155E75' }}>
                  <span style={{ fontSize: '11px', color: '#94A3B8' }}>Facturación Global (BD)</span>
                  <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#A3E635', marginTop: '4px' }}>
                    ${tenantsList.reduce((acc, t) => acc + (t.totalSalesUsd || 0), 0).toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Filtros */}
              <div style={{ marginBottom: '16px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
                  <Search size={16} color="#94A3B8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="text"
                    placeholder="Buscar por Razón Social, RIF o Slug..."
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
                    { id: 'SPECIAL', label: `IGTF Especial (${tenantsList.filter((t) => t.isSpecialTaxpayer).length})` },
                  ].map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setTenantFilterStatus(f.id as any)}
                      style={{
                        padding: '8px 12px',
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

              {/* Tabla o Estado Vacío Real */}
              <div style={{ backgroundColor: '#0B3B49', borderRadius: '12px', border: '1px solid #155E75', overflowX: 'auto' }}>
                {tenantsLoading ? (
                  <div style={{ padding: '48px', textAlign: 'center', color: '#94A3B8' }}>Cargando comercios desde PostgreSQL...</div>
                ) : filteredTenants.length === 0 ? (
                  <div style={{ padding: '54px 20px', textAlign: 'center', color: '#94A3B8' }}>
                    <Building size={42} style={{ margin: '0 auto 12px auto', opacity: 0.35 }} />
                    <p style={{ fontSize: '16px', fontWeight: 'bold', color: '#E2E8F0' }}>
                      {tenantsList.length === 0
                        ? 'Base de datos limpia: 0 comercios registrados'
                        : 'Ningún comercio coincide con el filtro actual'}
                    </p>
                    <p style={{ fontSize: '12px', marginTop: '6px', marginBottom: '16px' }}>
                      {tenantsList.length === 0
                        ? 'Haz clic en "Crear Nuevo Tenant" para registrar manualmente el primer comercio y su administrador.'
                        : 'Ajusta el texto de búsqueda o los filtros superiores.'}
                    </p>
                    {tenantsList.length === 0 && (
                      <button
                        onClick={() => setIsAddTenantModalOpen(true)}
                        style={{ padding: '10px 18px', borderRadius: '8px', border: 'none', backgroundColor: '#10B981', color: '#071F27', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}
                      >
                        + Crear Primer Tenant
                      </button>
                    )}
                  </div>
                ) : (
                  <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#062F3B', color: '#94A3B8', borderBottom: '1px solid #155E75' }}>
                        <th style={{ padding: '12px 14px' }}>Comercio / Slug</th>
                        <th style={{ padding: '12px 14px' }}>RIF</th>
                        <th style={{ padding: '12px 14px' }}>Contacto</th>
                        <th style={{ padding: '12px 14px' }}>Régimen</th>
                        <th style={{ padding: '12px 14px' }}>Métricas Reales</th>
                        <th style={{ padding: '12px 14px' }}>Estado</th>
                        <th style={{ padding: '12px 14px', textAlign: 'center' }}>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTenants.map((tenant) => (
                        <tr key={tenant.id} style={{ borderBottom: '1px solid #155E7533' }}>
                          <td style={{ padding: '12px 14px' }}>
                            <p style={{ fontWeight: 'bold', color: '#FFFFFF', fontSize: '13px' }}>{tenant.businessName}</p>
                            <p style={{ fontSize: '11px', color: '#94A3B8' }}>
                              {tenant.tradeName} • <span style={{ fontFamily: 'monospace', color: '#38BDF8' }}>@{tenant.slug}</span>
                            </p>
                          </td>
                          <td style={{ padding: '12px 14px', fontWeight: 'bold', fontFamily: 'monospace', color: '#A3E635' }}>
                            {tenant.documentType}-{tenant.documentNumber}
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            <p style={{ color: '#CBD5E1', fontSize: '11px' }}>{tenant.phone}</p>
                            <p style={{ color: '#64748B', fontSize: '10px' }}>{tenant.email}</p>
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            <span style={{ padding: '2px 8px', borderRadius: '4px', backgroundColor: tenant.isSpecialTaxpayer ? '#F59E0B22' : '#10B98122', color: tenant.isSpecialTaxpayer ? '#F59E0B' : '#10B981', fontWeight: 'bold', fontSize: '10px' }}>
                              {tenant.isSpecialTaxpayer ? 'Especial (IGTF 3%)' : 'Ordinario'}
                            </span>
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            <p style={{ fontWeight: 'bold', color: '#10B981' }}>${(tenant.totalSalesUsd || 0).toFixed(2)} USD</p>
                            <p style={{ fontSize: '10px', color: '#94A3B8' }}>
                              {tenant.usersCount || 0} usuarios • {tenant.productsCount || 0} prods • {tenant.invoicesCount || 0} facts
                            </p>
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            <span style={{ padding: '3px 8px', borderRadius: '12px', backgroundColor: tenant.isActive ? '#10B98122' : '#EF444422', color: tenant.isActive ? '#10B981' : '#EF4444', fontWeight: 'bold', fontSize: '10px' }}>
                              {tenant.isActive ? '● ACTIVO' : '● SUSPENDIDO'}
                            </span>
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: '5px', justifyContent: 'center', flexWrap: 'wrap' }}>
                              <button
                                onClick={() => openTenantDetail(tenant)}
                                style={{ padding: '5px 8px', borderRadius: '6px', border: '1px solid #155E75', backgroundColor: '#062F3B', color: '#38BDF8', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                              >
                                <Eye size={12} /> <span>Usuarios / Info</span>
                              </button>
                              <button
                                onClick={() => { setEditingTenant(tenant); setIsEditTenantModalOpen(true); }}
                                style={{ padding: '5px 8px', borderRadius: '6px', border: '1px solid #155E75', backgroundColor: '#062F3B', color: '#F59E0B', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                              >
                                <Edit3 size={12} /> <span>Editar</span>
                              </button>
                              <button
                                onClick={() => handleToggleTenantActive(tenant)}
                                style={{ padding: '5px 8px', borderRadius: '6px', border: 'none', backgroundColor: tenant.isActive ? '#475569' : '#16A34A', color: '#FFFFFF', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                              >
                                {tenant.isActive ? <ToggleRight size={12} /> : <ToggleLeft size={12} />}
                                <span>{tenant.isActive ? 'Suspender' : 'Activar'}</span>
                              </button>
                              <button
                                onClick={() => {
                                  setDeletingTenant(tenant);
                                  setDeleteConfirmSlug('');
                                  setIsDeleteTenantModalOpen(true);
                                }}
                                title="Eliminar permanentemente de la BD"
                                style={{ padding: '5px 8px', borderRadius: '6px', border: 'none', backgroundColor: '#DC2626', color: '#FFFFFF', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                              >
                                <Trash2 size={12} /> <span>Eliminar</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* ==================== TAB 2: MONITOREO EN TIEMPO REAL ==================== */}
          {activeTab === 'MONITORING' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>Monitoreo del Sistema en Tiempo Real</h2>
                  <p style={{ color: '#94A3B8', fontSize: '13px' }}>
                    Telemetría en vivo vía Server-Sent Events (SSE): estado de PostgreSQL, memoria, tráfico HTTP y alertas de seguridad.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{ padding: '6px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold', backgroundColor: sseConnected ? '#10B98122' : '#F59E0B22', color: sseConnected ? '#10B981' : '#F59E0B', border: `1px solid ${sseConnected ? '#10B981' : '#F59E0B'}` }}>
                    {sseConnected ? '● STREAM SSE ACTIVO' : '○ RECONECTANDO...'}
                  </span>
                  <button
                    onClick={() => setStreamPaused(!streamPaused)}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', borderRadius: '8px', border: '1px solid #155E75', backgroundColor: '#062F3B', color: streamPaused ? '#A3E635' : '#F59E0B', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}
                  >
                    {streamPaused ? <Play size={14} /> : <Pause size={14} />}
                    <span>{streamPaused ? 'Reanudar Feed' : 'Pausar Feed'}</span>
                  </button>
                  <button
                    onClick={loadSnapshot}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', borderRadius: '8px', border: 'none', backgroundColor: '#0284C7', color: '#FFFFFF', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}
                  >
                    <RefreshCw size={14} /> <span>Actualizar</span>
                  </button>
                </div>
              </div>

              {/* Tarjetas de Telemetría */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '14px', marginBottom: '22px' }}>
                <div style={{ backgroundColor: '#0B3B49', padding: '16px', borderRadius: '12px', border: '1px solid #155E75' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94A3B8', fontSize: '11px' }}>
                    <span>Salud del Servidor</span>
                    <Server size={15} color="#10B981" />
                  </div>
                  <p style={{ fontSize: '20px', fontWeight: 'bold', color: snapshot?.system.status === 'HEALTHY' ? '#10B981' : '#EF4444', marginTop: '6px' }}>
                    {snapshot?.system.status || '...'}
                  </p>
                  <p style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>
                    Uptime: {snapshot ? formatUptime(snapshot.system.uptimeSeconds) : '...'}
                  </p>
                </div>

                <div style={{ backgroundColor: '#0B3B49', padding: '16px', borderRadius: '12px', border: '1px solid #155E75' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94A3B8', fontSize: '11px' }}>
                    <span>PostgreSQL & Pool</span>
                    <Database size={15} color="#38BDF8" />
                  </div>
                  <p style={{ fontSize: '20px', fontWeight: 'bold', color: '#38BDF8', marginTop: '6px' }}>
                    {snapshot ? `${snapshot.database.latencyMs} ms` : '...'}
                  </p>
                  <p style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>
                    Pool: {snapshot?.database.pool.active ?? 0} activas / {snapshot?.database.pool.idle ?? 0} libres
                  </p>
                </div>

                <div style={{ backgroundColor: '#0B3B49', padding: '16px', borderRadius: '12px', border: '1px solid #155E75' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94A3B8', fontSize: '11px' }}>
                    <span>Memoria Proceso Node</span>
                    <Cpu size={15} color="#A3E635" />
                  </div>
                  <p style={{ fontSize: '20px', fontWeight: 'bold', color: '#A3E635', marginTop: '6px' }}>
                    {snapshot ? `${snapshot.system.memory.heapUsedMb} MB` : '...'}
                  </p>
                  <p style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>
                    RSS Total: {snapshot?.system.memory.rssMb ?? 0} MB
                  </p>
                </div>

                <div style={{ backgroundColor: '#0B3B49', padding: '16px', borderRadius: '12px', border: '1px solid #155E75' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94A3B8', fontSize: '11px' }}>
                    <span>Tráfico HTTP (1 min)</span>
                    <Activity size={15} color="#F59E0B" />
                  </div>
                  <p style={{ fontSize: '20px', fontWeight: 'bold', color: '#FFFFFF', marginTop: '6px' }}>
                    {snapshot?.traffic.requestsPerMin ?? 0} req/min
                  </p>
                  <p style={{ fontSize: '11px', color: (snapshot?.traffic.errorsPerMin ?? 0) > 0 ? '#EF4444' : '#10B981', marginTop: '2px' }}>
                    Errores: {snapshot?.traffic.errorsPerMin ?? 0} • Avg: {snapshot?.traffic.avgLatencyMs ?? 0}ms
                  </p>
                </div>

                <div style={{ backgroundColor: '#0B3B49', padding: '16px', borderRadius: '12px', border: '1px solid #155E75' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94A3B8', fontSize: '11px' }}>
                    <span>Sesiones & Ventas Hoy</span>
                    <Users size={15} color="#10B981" />
                  </div>
                  <p style={{ fontSize: '20px', fontWeight: 'bold', color: '#10B981', marginTop: '6px' }}>
                    {snapshot?.platform.activeSessions ?? 0} sesiones
                  </p>
                  <p style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>
                    {snapshot?.platform.salesTodayCount ?? 0} ventas hoy (${(snapshot?.platform.salesTodayUsd ?? 0).toFixed(2)})
                  </p>
                </div>
              </div>

              {/* Feed en Tiempo Real */}
              <div style={{ backgroundColor: '#0B3B49', borderRadius: '12px', border: '1px solid #155E75', padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Terminal size={18} color="#38BDF8" />
                    <h3 style={{ fontSize: '15px', fontWeight: 'bold' }}>Flujo de Eventos y Logs en Vivo ({filteredLiveEvents.length})</h3>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <input
                      type="text"
                      placeholder="Filtrar ruta, acción, usuario, ReqId..."
                      value={liveSearch}
                      onChange={(e) => setLiveSearch(e.target.value)}
                      style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #155E75', backgroundColor: '#062F3B', color: '#FFFFFF', fontSize: '12px', minWidth: '200px' }}
                    />
                    <select
                      value={liveFilterCategory}
                      onChange={(e) => setLiveFilterCategory(e.target.value as any)}
                      style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #155E75', backgroundColor: '#062F3B', color: '#FFFFFF', fontSize: '12px' }}
                    >
                      <option value="ALL">Todas las Categorías</option>
                      <option value="HTTP">HTTP Requests</option>
                      <option value="AUDIT">Auditoría</option>
                      <option value="SECURITY">Seguridad</option>
                      <option value="ERROR">Errores</option>
                    </select>
                    <select
                      value={liveFilterLevel}
                      onChange={(e) => setLiveFilterLevel(e.target.value as any)}
                      style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #155E75', backgroundColor: '#062F3B', color: '#FFFFFF', fontSize: '12px' }}
                    >
                      <option value="ALL">Todos los Niveles</option>
                      <option value="INFO">INFO</option>
                      <option value="WARN">WARN</option>
                      <option value="ERROR">ERROR</option>
                    </select>
                  </div>
                </div>

                <div style={{ maxHeight: '460px', overflowY: 'auto', backgroundColor: '#061920', borderRadius: '8px', border: '1px solid #155E75', fontFamily: 'monospace', fontSize: '12px' }}>
                  {filteredLiveEvents.length === 0 ? (
                    <div style={{ padding: '32px', textAlign: 'center', color: '#64748B' }}>
                      Esperando eventos en tiempo real...
                    </div>
                  ) : (
                    filteredLiveEvents.map((evt) => {
                      const lvlColor = evt.level === 'ERROR' ? '#EF4444' : evt.level === 'WARN' ? '#F59E0B' : '#10B981';
                      const catColor = evt.category === 'SECURITY' ? '#F472B6' : evt.category === 'AUDIT' ? '#A3E635' : evt.category === 'ERROR' ? '#EF4444' : '#38BDF8';
                      return (
                        <div key={evt.id} style={{ display: 'flex', gap: '10px', padding: '8px 12px', borderBottom: '1px solid #155E7522', alignItems: 'center', flexWrap: 'wrap' }}>
                          <span style={{ color: '#64748B', fontSize: '11px', minWidth: '80px' }}>
                            {new Date(evt.timestamp).toLocaleTimeString('es-VE')}
                          </span>
                          <span style={{ padding: '1px 6px', borderRadius: '4px', backgroundColor: `${lvlColor}22`, color: lvlColor, fontWeight: 'bold', fontSize: '10px', minWidth: '46px', textAlign: 'center' }}>
                            {evt.level}
                          </span>
                          <span style={{ padding: '1px 6px', borderRadius: '4px', backgroundColor: `${catColor}22`, color: catColor, fontWeight: 'bold', fontSize: '10px', minWidth: '68px', textAlign: 'center' }}>
                            {evt.category}
                          </span>
                          <span style={{ color: '#F8FAFC', flex: 1 }}>{evt.message}</span>
                          {evt.username && <span style={{ color: '#38BDF8', fontSize: '11px' }}>@{evt.username}</span>}
                          {evt.ipAddress && <span style={{ color: '#64748B', fontSize: '10px' }}>{evt.ipAddress}</span>}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ==================== TAB 3: AUDITORÍA INMUTABLE Y LOGS ==================== */}
          {activeTab === 'AUDIT' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>Auditoría Inmutable Global (PostgreSQL)</h2>
                  <p style={{ color: '#94A3B8', fontSize: '13px' }}>
                    Registro histórico completo de accesos, seguridad, cambios de contraseña, tenants y operaciones ({auditTotal} eventos).
                  </p>
                </div>
                <button
                  onClick={() => loadAuditLogs(auditPage)}
                  disabled={auditLoading}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 14px', borderRadius: '8px', border: 'none', backgroundColor: '#0284C7', color: '#FFFFFF', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}
                >
                  <RefreshCw size={14} /> <span>Consultar BD</span>
                </button>
              </div>

              {/* Filtros de Auditoría */}
              <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  placeholder="Buscar por acción, entidad, usuario o comercio..."
                  value={auditSearch}
                  onChange={(e) => { setAuditSearch(e.target.value); setAuditPage(1); }}
                  style={{ flex: 1, minWidth: '220px', padding: '9px 12px', borderRadius: '8px', border: '1px solid #155E75', backgroundColor: '#062F3B', color: '#FFFFFF', fontSize: '13px' }}
                />
                <select
                  value={auditTenantFilter}
                  onChange={(e) => { setAuditTenantFilter(e.target.value); setAuditPage(1); }}
                  style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid #155E75', backgroundColor: '#062F3B', color: '#FFFFFF', fontSize: '12px' }}
                >
                  <option value="">Todos los Tenants + Plataforma</option>
                  {tenantsList.map((t) => (
                    <option key={t.id} value={t.id}>{t.businessName} (@{t.slug})</option>
                  ))}
                </select>
                <select
                  value={auditChannelFilter}
                  onChange={(e) => { setAuditChannelFilter(e.target.value); setAuditPage(1); }}
                  style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid #155E75', backgroundColor: '#062F3B', color: '#FFFFFF', fontSize: '12px' }}
                >
                  <option value="">Todos los Canales</option>
                  <option value="WEB_ADMIN">WEB_ADMIN</option>
                  <option value="API">API</option>
                  <option value="POS_MOBILE">POS_MOBILE</option>
                  <option value="MOBILE_ADMIN">MOBILE_ADMIN</option>
                </select>
                <select
                  value={auditResultFilter}
                  onChange={(e) => { setAuditResultFilter(e.target.value); setAuditPage(1); }}
                  style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid #155E75', backgroundColor: '#062F3B', color: '#FFFFFF', fontSize: '12px' }}
                >
                  <option value="">Todos los Resultados</option>
                  <option value="SUCCESS">SUCCESS</option>
                  <option value="REJECTED">REJECTED</option>
                  <option value="FAILED">FAILED</option>
                </select>
              </div>

              <div style={{ backgroundColor: '#0B3B49', borderRadius: '12px', border: '1px solid #155E75', overflowX: 'auto' }}>
                {auditLoading ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>Consultando tabla audit_logs...</div>
                ) : auditLogs.length === 0 ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>No hay eventos de auditoría registrados para este filtro.</div>
                ) : (
                  <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#062F3B', color: '#94A3B8', borderBottom: '1px solid #155E75' }}>
                        <th style={{ padding: '10px 12px' }}>Fecha</th>
                        <th style={{ padding: '10px 12px' }}>Ámbito / Tenant</th>
                        <th style={{ padding: '10px 12px' }}>Usuario</th>
                        <th style={{ padding: '10px 12px' }}>Acción</th>
                        <th style={{ padding: '10px 12px' }}>Entidad</th>
                        <th style={{ padding: '10px 12px' }}>Canal / IP</th>
                        <th style={{ padding: '10px 12px' }}>Resultado</th>
                        <th style={{ padding: '10px 12px', textAlign: 'center' }}>Detalle</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLogs.map((log) => (
                        <tr key={log.id} style={{ borderBottom: '1px solid #155E7533' }}>
                          <td style={{ padding: '10px 12px', color: '#94A3B8', whiteSpace: 'nowrap' }}>
                            {new Date(log.createdAt).toLocaleString('es-VE')}
                          </td>
                          <td style={{ padding: '10px 12px', color: log.tenantName ? '#F8FAFC' : '#A3E635', fontWeight: '600' }}>
                            {log.tenantName || 'Plataforma Global'}
                          </td>
                          <td style={{ padding: '10px 12px', color: '#38BDF8', fontWeight: 'bold' }}>
                            {log.username ? `@${log.username}` : 'sistema'}
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <span style={{ padding: '2px 6px', borderRadius: '4px', backgroundColor: '#062F3B', fontFamily: 'monospace', fontSize: '11px', color: '#FFFFFF' }}>
                              {log.action}
                            </span>
                          </td>
                          <td style={{ padding: '10px 12px', color: '#CBD5E1' }}>{log.entity}</td>
                          <td style={{ padding: '10px 12px', color: '#94A3B8', fontSize: '11px' }}>
                            {log.channel} {log.ipAddress ? `• ${log.ipAddress}` : ''}
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', backgroundColor: log.result === 'SUCCESS' ? '#10B98122' : '#EF444422', color: log.result === 'SUCCESS' ? '#10B981' : '#EF4444' }}>
                              {log.result}
                            </span>
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                            <button
                              onClick={() => setSelectedAuditPayload(log)}
                              style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #155E75', backgroundColor: '#062F3B', color: '#38BDF8', fontSize: '11px', cursor: 'pointer' }}
                            >
                              Ver JSON
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Paginación */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px', fontSize: '12px', color: '#94A3B8' }}>
                <span>Página {auditPage} • Total: {auditTotal} registros</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    disabled={auditPage <= 1}
                    onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
                    style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #155E75', backgroundColor: '#062F3B', color: '#FFFFFF', cursor: auditPage <= 1 ? 'not-allowed' : 'pointer', opacity: auditPage <= 1 ? 0.5 : 1 }}
                  >
                    Anterior
                  </button>
                  <button
                    disabled={auditPage * 30 >= auditTotal}
                    onClick={() => setAuditPage((p) => p + 1)}
                    style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #155E75', backgroundColor: '#062F3B', color: '#FFFFFF', cursor: auditPage * 30 >= auditTotal ? 'not-allowed' : 'pointer', opacity: auditPage * 30 >= auditTotal ? 0.5 : 1 }}
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ==================== TAB 4: MI CUENTA Y CONTRASEÑA ==================== */}
          {activeTab === 'SECURITY' && (
            <div style={{ maxWidth: '880px' }}>
              <div style={{ marginBottom: '22px' }}>
                <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>Seguridad y Cuenta del Súper Administrador</h2>
                <p style={{ color: '#94A3B8', fontSize: '13px' }}>
                  Actualiza tu contraseña maestra y protege tu acceso con autenticación de dos factores (2FA TOTP).
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
                {/* Tarjeta Cambio de Contraseña */}
                <div style={{ backgroundColor: '#0B3B49', padding: '24px', borderRadius: '14px', border: '1px solid #155E75' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                    <KeyRound size={20} color="#A3E635" />
                    <h3 style={{ fontSize: '16px', fontWeight: 'bold' }}>Cambiar Contraseña Maestra</h3>
                  </div>

                  <form onSubmit={handleChangeSuperAdminPassword} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', color: '#94A3B8', marginBottom: '4px' }}>Contraseña Actual</label>
                      <input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        required
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #155E75', backgroundColor: '#062F3B', color: '#FFFFFF', fontSize: '13px' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', color: '#94A3B8', marginBottom: '4px' }}>Nueva Contraseña</label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #155E75', backgroundColor: '#062F3B', color: '#FFFFFF', fontSize: '13px' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', color: '#94A3B8', marginBottom: '4px' }}>Confirmar Nueva Contraseña</label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #155E75', backgroundColor: '#062F3B', color: '#FFFFFF', fontSize: '13px' }}
                      />
                    </div>

                    <div style={{ backgroundColor: '#062F3B', padding: '10px 12px', borderRadius: '8px', fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ color: pwdChecks.len ? '#10B981' : '#94A3B8' }}>{pwdChecks.len ? '✓' : '○'} Mínimo 8 caracteres</span>
                      <span style={{ color: pwdChecks.upper ? '#10B981' : '#94A3B8' }}>{pwdChecks.upper ? '✓' : '○'} Al menos 1 letra mayúscula</span>
                      <span style={{ color: pwdChecks.lower ? '#10B981' : '#94A3B8' }}>{pwdChecks.lower ? '✓' : '○'} Al menos 1 letra minúscula</span>
                      <span style={{ color: pwdChecks.num ? '#10B981' : '#94A3B8' }}>{pwdChecks.num ? '✓' : '○'} Al menos 1 número</span>
                      <span style={{ color: pwdChecks.match ? '#10B981' : '#94A3B8' }}>{pwdChecks.match ? '✓' : '○'} Ambas contraseñas coinciden</span>
                    </div>

                    <button
                      type="submit"
                      disabled={changingPassword || !pwdAllValid}
                      style={{
                        padding: '12px',
                        borderRadius: '8px',
                        border: 'none',
                        backgroundColor: pwdAllValid ? '#10B981' : '#334155',
                        color: pwdAllValid ? '#071F27' : '#94A3B8',
                        fontWeight: 'bold',
                        fontSize: '13px',
                        cursor: pwdAllValid ? 'pointer' : 'not-allowed',
                      }}
                    >
                      {changingPassword ? 'Actualizando...' : 'Actualizar Contraseña Súper Admin'}
                    </button>
                  </form>
                </div>

                {/* Tarjeta Información de Cuenta y 2FA */}
                <div style={{ backgroundColor: '#0B3B49', padding: '24px', borderRadius: '14px', border: '1px solid #155E75', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Lock size={20} color="#38BDF8" />
                    <h3 style={{ fontSize: '16px', fontWeight: 'bold' }}>Identidad & 2FA TOTP</h3>
                  </div>

                  <div style={{ backgroundColor: '#062F3B', padding: '14px', borderRadius: '10px', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#94A3B8' }}>Usuario:</span>
                      <strong style={{ color: '#38BDF8' }}>@{user.username}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#94A3B8' }}>Nombre:</span>
                      <strong>{user.fullName}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#94A3B8' }}>Rol:</span>
                      <span style={{ color: '#A3E635', fontWeight: 'bold' }}>{user.roleId}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#94A3B8' }}>2FA TOTP:</span>
                      <span style={{ color: user.twoFactorEnabled ? '#10B981' : '#F59E0B', fontWeight: 'bold' }}>
                        {user.twoFactorEnabled ? 'ACTIVADO' : 'NO CONFIGURADO'}
                      </span>
                    </div>
                  </div>

                  {!user.twoFactorEnabled && !twoFactorQr && (
                    <button
                      onClick={handleGenerate2FA}
                      style={{ padding: '11px', borderRadius: '8px', border: '1px solid #38BDF8', backgroundColor: '#0284C722', color: '#38BDF8', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}
                    >
                      Configurar Autenticación 2FA (Google Authenticator)
                    </button>
                  )}

                  {twoFactorQr && (
                    <form onSubmit={handleEnable2FA} style={{ backgroundColor: '#062F3B', padding: '14px', borderRadius: '10px', border: '1px solid #10B981', textAlign: 'center' }}>
                      <p style={{ fontSize: '12px', color: '#CBD5E1', marginBottom: '10px' }}>Escanea este QR con tu app Authenticator:</p>
                      <img src={twoFactorQr} alt="QR 2FA" style={{ width: '160px', height: '160px', margin: '0 auto 10px auto', borderRadius: '8px', backgroundColor: '#FFFFFF', padding: '6px' }} />
                      <input
                        type="text"
                        maxLength={6}
                        placeholder="Código de 6 dígitos"
                        value={twoFactorCode}
                        onChange={(e) => setTwoFactorCode(e.target.value)}
                        style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #155E75', backgroundColor: '#071F27', color: '#FFFFFF', fontSize: '14px', textAlign: 'center', marginBottom: '10px' }}
                        required
                      />
                      <button
                        type="submit"
                        disabled={enabling2FA}
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: 'none', backgroundColor: '#10B981', color: '#071F27', fontWeight: 'bold', cursor: 'pointer' }}
                      >
                        {enabling2FA ? 'Verificando...' : 'Verificar y Activar 2FA'}
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ==================== MODAL: CREAR NUEVO TENANT ==================== */}
      {isAddTenantModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 1100 }}>
          <div style={{ width: '100%', maxWidth: '640px', backgroundColor: '#0B3B49', borderRadius: '18px', padding: '26px', border: '1px solid #10B981', maxHeight: '92vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 'bold' }}>Crear Nuevo Comercio (Tenant)</h3>
                <p style={{ fontSize: '11px', color: '#94A3B8' }}>Registra el comercio y su usuario administrador inicial en PostgreSQL</p>
              </div>
              <button onClick={() => setIsAddTenantModalOpen(false)} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateTenant} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: '11px', color: '#94A3B8', marginBottom: '4px' }}>Razón Social *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Inversiones Caracas C.A."
                    value={newTenantBusinessName}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewTenantBusinessName(val);
                      if (!newTenantSlug) {
                        const auto = val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30);
                        setNewAdminUsername(auto ? `admin_${auto.slice(0, 12)}` : '');
                      }
                    }}
                    style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #155E75', backgroundColor: '#062F3B', color: '#FFFFFF', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#94A3B8', marginBottom: '4px' }}>Nombre Comercial</label>
                  <input
                    type="text"
                    placeholder="Ej. Bodega Caracas"
                    value={newTenantTradeName}
                    onChange={(e) => setNewTenantTradeName(e.target.value)}
                    style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #155E75', backgroundColor: '#062F3B', color: '#FFFFFF', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#94A3B8', marginBottom: '4px' }}>Slug Identificador *</label>
                  <input
                    type="text"
                    placeholder="bodega-caracas"
                    value={newTenantSlug}
                    onChange={(e) => setNewTenantSlug(e.target.value)}
                    style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #155E75', backgroundColor: '#062F3B', color: '#38BDF8', fontSize: '13px', fontFamily: 'monospace' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#94A3B8', marginBottom: '4px' }}>RIF *</label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <select
                      value={newTenantDocType}
                      onChange={(e) => setNewTenantDocType(e.target.value as any)}
                      style={{ padding: '9px', borderRadius: '8px', border: '1px solid #155E75', backgroundColor: '#062F3B', color: '#A3E635', fontWeight: 'bold' }}
                    >
                      <option value="J">J-</option>
                      <option value="G">G-</option>
                      <option value="V">V-</option>
                      <option value="E">E-</option>
                    </select>
                    <input
                      type="text"
                      required
                      placeholder="401234567"
                      value={newTenantDocNumber}
                      onChange={(e) => setNewTenantDocNumber(e.target.value)}
                      style={{ flex: 1, padding: '9px', borderRadius: '8px', border: '1px solid #155E75', backgroundColor: '#062F3B', color: '#FFFFFF', fontSize: '13px' }}
                    />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#94A3B8', marginBottom: '4px' }}>Teléfono WhatsApp *</label>
                  <input
                    type="text"
                    required
                    placeholder="+584141234567"
                    value={newTenantPhone}
                    onChange={(e) => setNewTenantPhone(e.target.value)}
                    style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #155E75', backgroundColor: '#062F3B', color: '#FFFFFF', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#94A3B8', marginBottom: '4px' }}>Email del Comercio *</label>
                  <input
                    type="email"
                    required
                    placeholder="contacto@comercio.ve"
                    value={newTenantEmail}
                    onChange={(e) => setNewTenantEmail(e.target.value)}
                    style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #155E75', backgroundColor: '#062F3B', color: '#FFFFFF', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#94A3B8', marginBottom: '4px' }}>Prefijo Código Interno</label>
                  <input
                    type="text"
                    maxLength={5}
                    value={newTenantPrefix}
                    onChange={(e) => setNewTenantPrefix(e.target.value)}
                    style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #155E75', backgroundColor: '#062F3B', color: '#FFFFFF', fontSize: '13px' }}
                  />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: '11px', color: '#94A3B8', marginBottom: '4px' }}>Dirección Fiscal *</label>
                  <input
                    type="text"
                    required
                    placeholder="Av. Principal, Caracas"
                    value={newTenantAddress}
                    onChange={(e) => setNewTenantAddress(e.target.value)}
                    style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #155E75', backgroundColor: '#062F3B', color: '#FFFFFF', fontSize: '13px' }}
                  />
                </div>
                <div style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#062F3B', padding: '10px', borderRadius: '8px', border: '1px solid #155E75' }}>
                  <input
                    type="checkbox"
                    id="saSpecialTaxpayer"
                    checked={newTenantIsSpecial}
                    onChange={(e) => setNewTenantIsSpecial(e.target.checked)}
                  />
                  <label htmlFor="saSpecialTaxpayer" style={{ fontSize: '12px', color: '#CBD5E1', cursor: 'pointer' }}>
                    Contribuyente Especial SENIAT (habilita percepción IGTF 3% en divisas)
                  </label>
                </div>
              </div>

              {/* Credenciales del Administrador Inicial */}
              <div style={{ backgroundColor: '#062F3B', padding: '14px', borderRadius: '10px', border: '1px solid #38BDF844', marginTop: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#38BDF8' }}>Administrador Inicial del Comercio</span>
                  <button
                    type="button"
                    onClick={() => setNewAdminPassword(generateStrongPassword())}
                    style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #38BDF8', backgroundColor: 'transparent', color: '#38BDF8', fontSize: '11px', cursor: 'pointer' }}
                  >
                    Regenerar Clave
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: '#94A3B8', marginBottom: '4px' }}>Usuario Admin *</label>
                    <input
                      type="text"
                      required
                      placeholder="admin_comercio"
                      value={newAdminUsername}
                      onChange={(e) => setNewAdminUsername(e.target.value)}
                      style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #155E75', backgroundColor: '#071F27', color: '#FFFFFF', fontSize: '12px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: '#94A3B8', marginBottom: '4px' }}>Nombre Completo Admin</label>
                    <input
                      type="text"
                      placeholder="Dueño del Comercio"
                      value={newAdminFullName}
                      onChange={(e) => setNewAdminFullName(e.target.value)}
                      style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #155E75', backgroundColor: '#071F27', color: '#FFFFFF', fontSize: '12px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: '#94A3B8', marginBottom: '4px' }}>Email Admin</label>
                    <input
                      type="email"
                      placeholder="admin@comercio.ve"
                      value={newAdminEmail}
                      onChange={(e) => setNewAdminEmail(e.target.value)}
                      style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #155E75', backgroundColor: '#071F27', color: '#FFFFFF', fontSize: '12px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: '#94A3B8', marginBottom: '4px' }}>Contraseña Inicial (min 8) *</label>
                    <input
                      type="text"
                      required
                      minLength={8}
                      value={newAdminPassword}
                      onChange={(e) => setNewAdminPassword(e.target.value)}
                      style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #10B981', backgroundColor: '#071F27', color: '#A3E635', fontSize: '12px', fontFamily: 'monospace' }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setIsAddTenantModalOpen(false)}
                  style={{ flex: 1, padding: '11px', borderRadius: '8px', border: '1px solid #334155', backgroundColor: 'transparent', color: '#CBD5E1', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creatingTenant}
                  style={{ flex: 1, padding: '11px', borderRadius: '8px', border: 'none', backgroundColor: '#10B981', color: '#071F27', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  {creatingTenant ? 'Creando en BD...' : 'Crear Comercio y Administrador'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL: EDITAR TENANT ==================== */}
      {isEditTenantModalOpen && editingTenant && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 1100 }}>
          <div style={{ width: '100%', maxWidth: '560px', backgroundColor: '#0B3B49', borderRadius: '18px', padding: '24px', border: '1px solid #F59E0B' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold' }}>Editar Comercio: {editingTenant.businessName}</h3>
              <button onClick={() => setIsEditTenantModalOpen(false)} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleUpdateTenant} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#94A3B8', marginBottom: '4px' }}>Razón Social</label>
                <input
                  type="text"
                  required
                  value={editingTenant.businessName}
                  onChange={(e) => setEditingTenant({ ...editingTenant, businessName: e.target.value })}
                  style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #155E75', backgroundColor: '#062F3B', color: '#FFFFFF' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#94A3B8', marginBottom: '4px' }}>Nombre Comercial</label>
                  <input
                    type="text"
                    value={editingTenant.tradeName}
                    onChange={(e) => setEditingTenant({ ...editingTenant, tradeName: e.target.value })}
                    style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #155E75', backgroundColor: '#062F3B', color: '#FFFFFF' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#94A3B8', marginBottom: '4px' }}>Teléfono</label>
                  <input
                    type="text"
                    value={editingTenant.phone}
                    onChange={(e) => setEditingTenant({ ...editingTenant, phone: e.target.value })}
                    style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #155E75', backgroundColor: '#062F3B', color: '#FFFFFF' }}
                  />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#94A3B8', marginBottom: '4px' }}>Email</label>
                <input
                  type="email"
                  value={editingTenant.email}
                  onChange={(e) => setEditingTenant({ ...editingTenant, email: e.target.value })}
                  style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #155E75', backgroundColor: '#062F3B', color: '#FFFFFF' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#94A3B8', marginBottom: '4px' }}>Dirección Fiscal</label>
                <input
                  type="text"
                  value={editingTenant.fiscalAddress}
                  onChange={(e) => setEditingTenant({ ...editingTenant, fiscalAddress: e.target.value })}
                  style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #155E75', backgroundColor: '#062F3B', color: '#FFFFFF' }}
                />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#062F3B', padding: '10px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={editingTenant.isSpecialTaxpayer}
                  onChange={(e) => setEditingTenant({ ...editingTenant, isSpecialTaxpayer: e.target.checked })}
                />
                <span>Contribuyente Especial SENIAT (IGTF 3%)</span>
              </label>
              <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                <button type="button" onClick={() => setIsEditTenantModalOpen(false)} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #334155', backgroundColor: 'transparent', color: '#CBD5E1', cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button type="submit" disabled={savingEditTenant} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', backgroundColor: '#F59E0B', color: '#000000', fontWeight: 'bold', cursor: 'pointer' }}>
                  {savingEditTenant ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL: DETALLE Y USUARIOS DEL TENANT ==================== */}
      {isDetailModalOpen && selectedTenantDetail && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 1100 }}>
          <div style={{ width: '100%', maxWidth: '720px', backgroundColor: '#0B3B49', borderRadius: '18px', padding: '24px', border: '1px solid #38BDF8', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 'bold' }}>{selectedTenantDetail.businessName}</h3>
                <p style={{ fontSize: '12px', color: '#38BDF8', fontFamily: 'monospace' }}>
                  @{selectedTenantDetail.slug} • {selectedTenantDetail.documentType}-{selectedTenantDetail.documentNumber}
                </p>
              </div>
              <button onClick={() => { setIsDetailModalOpen(false); setResetPwdTarget(null); }} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ backgroundColor: '#062F3B', padding: '12px 14px', borderRadius: '10px', fontSize: '12px', marginBottom: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div><span style={{ color: '#94A3B8' }}>Teléfono:</span> <strong>{selectedTenantDetail.phone}</strong></div>
              <div><span style={{ color: '#94A3B8' }}>Email:</span> <strong>{selectedTenantDetail.email}</strong></div>
              <div style={{ gridColumn: 'span 2' }}><span style={{ color: '#94A3B8' }}>Dirección:</span> <strong>{selectedTenantDetail.fiscalAddress}</strong></div>
            </div>

            <h4 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>Usuarios del Comercio</h4>
            {detailLoading ? (
              <p style={{ color: '#94A3B8', fontSize: '12px', marginBottom: '14px' }}>Cargando usuarios...</p>
            ) : (
              <div style={{ backgroundColor: '#062F3B', borderRadius: '10px', border: '1px solid #155E75', overflowX: 'auto', marginBottom: '16px' }}>
                <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ color: '#94A3B8', borderBottom: '1px solid #155E75' }}>
                      <th style={{ padding: '8px 10px' }}>Usuario</th>
                      <th style={{ padding: '8px 10px' }}>Nombre</th>
                      <th style={{ padding: '8px 10px' }}>Rol</th>
                      <th style={{ padding: '8px 10px' }}>Último Acceso</th>
                      <th style={{ padding: '8px 10px', textAlign: 'center' }}>Contraseña</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedTenantDetail.users || []).length === 0 ? (
                      <tr><td colSpan={5} style={{ padding: '14px', textAlign: 'center', color: '#64748B' }}>Sin usuarios registrados aún.</td></tr>
                    ) : (
                      (selectedTenantDetail.users || []).map((u) => (
                        <tr key={u.id} style={{ borderBottom: '1px solid #155E7533' }}>
                          <td style={{ padding: '8px 10px', fontWeight: 'bold', color: '#38BDF8' }}>@{u.username}</td>
                          <td style={{ padding: '8px 10px' }}>{u.fullName}</td>
                          <td style={{ padding: '8px 10px' }}>
                            <span style={{ padding: '2px 6px', borderRadius: '4px', backgroundColor: '#0284C722', color: '#38BDF8', fontSize: '10px', fontWeight: 'bold' }}>{u.roleId}</span>
                          </td>
                          <td style={{ padding: '8px 10px', color: '#94A3B8', fontSize: '11px' }}>
                            {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('es-VE') : 'Nunca'}
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                            <button
                              onClick={() => { setResetPwdTarget(u); setResetPwdValue(generateStrongPassword()); }}
                              style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #F59E0B', backgroundColor: 'transparent', color: '#F59E0B', fontSize: '11px', cursor: 'pointer' }}
                            >
                              Cambiar Clave
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {resetPwdTarget && (
              <form onSubmit={handleResetTenantUserPassword} style={{ backgroundColor: '#071F27', padding: '12px', borderRadius: '8px', border: '1px solid #F59E0B', marginBottom: '16px', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '12px', color: '#F59E0B', fontWeight: 'bold' }}>Nueva clave para @{resetPwdTarget.username}:</span>
                <input
                  type="text"
                  required
                  minLength={8}
                  value={resetPwdValue}
                  onChange={(e) => setResetPwdValue(e.target.value)}
                  style={{ flex: 1, minWidth: '160px', padding: '7px', borderRadius: '6px', border: '1px solid #155E75', backgroundColor: '#062F3B', color: '#A3E635', fontFamily: 'monospace', fontSize: '12px' }}
                />
                <button type="submit" style={{ padding: '7px 12px', borderRadius: '6px', border: 'none', backgroundColor: '#F59E0B', color: '#000', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}>Guardar</button>
                <button type="button" onClick={() => setResetPwdTarget(null)} style={{ padding: '7px 10px', borderRadius: '6px', border: '1px solid #334155', backgroundColor: 'transparent', color: '#94A3B8', fontSize: '12px', cursor: 'pointer' }}>Cancelar</button>
              </form>
            )}

            {/* Crear Usuario en este Tenant */}
            <form onSubmit={handleCreateTenantUser} style={{ backgroundColor: '#062F3B', padding: '14px', borderRadius: '10px', border: '1px solid #155E75' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px', fontSize: '12px', fontWeight: 'bold', color: '#A3E635' }}>
                <UserPlus size={14} /> <span>Agregar Usuario al Comercio</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                <input type="text" required placeholder="Usuario (ej. cajero1)" value={newUserUsername} onChange={(e) => setNewUserUsername(e.target.value)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #155E75', backgroundColor: '#071F27', color: '#FFFFFF', fontSize: '12px' }} />
                <input type="text" required placeholder="Nombre completo" value={newUserFullName} onChange={(e) => setNewUserFullName(e.target.value)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #155E75', backgroundColor: '#071F27', color: '#FFFFFF', fontSize: '12px' }} />
                <input type="email" required placeholder="Email" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #155E75', backgroundColor: '#071F27', color: '#FFFFFF', fontSize: '12px' }} />
                <select value={newUserRole} onChange={(e) => setNewUserRole(e.target.value as any)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #155E75', backgroundColor: '#071F27', color: '#38BDF8', fontSize: '12px', fontWeight: 'bold' }}>
                  <option value="ADMIN">ADMIN (Administrador)</option>
                  <option value="VENDEDOR">VENDEDOR (Cajero POS)</option>
                  <option value="CONSULTA">CONSULTA (Auditor)</option>
                </select>
                <input type="text" required minLength={8} placeholder="Contraseña inicial" value={newUserPassword} onChange={(e) => setNewUserPassword(e.target.value)} style={{ gridColumn: 'span 2', padding: '8px', borderRadius: '6px', border: '1px solid #155E75', backgroundColor: '#071F27', color: '#A3E635', fontFamily: 'monospace', fontSize: '12px' }} />
              </div>
              <button type="submit" disabled={creatingTenantUser} style={{ width: '100%', padding: '9px', borderRadius: '8px', border: 'none', backgroundColor: '#0284C7', color: '#FFFFFF', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}>
                {creatingTenantUser ? 'Creando usuario...' : 'Crear Usuario'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL: ELIMINACIÓN PERMANENTE DE TENANT ==================== */}
      {isDeleteTenantModalOpen && deletingTenant && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 1100 }}>
          <div style={{ width: '100%', maxWidth: '460px', backgroundColor: '#0B3B49', borderRadius: '18px', padding: '24px', border: '2px solid #EF4444' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#EF4444', marginBottom: '12px' }}>
              <AlertTriangle size={24} />
              <h3 style={{ fontSize: '18px', fontWeight: 'bold' }}>Eliminar Tenant Permanentemente</h3>
            </div>
            <p style={{ fontSize: '13px', color: '#CBD5E1', lineHeight: 1.5, marginBottom: '14px' }}>
              Esta acción eliminará permanentemente de la base de datos a <strong>{deletingTenant.businessName}</strong> junto con sus usuarios, productos, facturas, inventario y clientes. El evento quedará registrado en la auditoría global.
            </p>
            <label style={{ display: 'block', fontSize: '11px', color: '#FCA5A5', marginBottom: '6px' }}>
              Escribe <strong>{deletingTenant.slug}</strong> para confirmar:
            </label>
            <input
              type="text"
              placeholder={deletingTenant.slug}
              value={deleteConfirmSlug}
              onChange={(e) => setDeleteConfirmSlug(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #EF4444', backgroundColor: '#062F3B', color: '#FFFFFF', fontFamily: 'monospace', marginBottom: '16px' }}
            />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button" onClick={() => setIsDeleteTenantModalOpen(false)} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #334155', backgroundColor: 'transparent', color: '#CBD5E1', fontWeight: 'bold', cursor: 'pointer' }}>
                Cancelar
              </button>
              <button
                type="button"
                disabled={deletingLoading || deleteConfirmSlug.trim() !== deletingTenant.slug}
                onClick={handlePermanentDeleteTenant}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: deleteConfirmSlug.trim() === deletingTenant.slug ? '#DC2626' : '#475569',
                  color: '#FFFFFF',
                  fontWeight: 'bold',
                  cursor: deleteConfirmSlug.trim() === deletingTenant.slug ? 'pointer' : 'not-allowed',
                }}
              >
                {deletingLoading ? 'Eliminando...' : 'Eliminar Definitivamente'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL: DETALLE PAYLOAD DE AUDITORÍA ==================== */}
      {selectedAuditPayload && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 1100 }}>
          <div style={{ width: '100%', maxWidth: '580px', backgroundColor: '#0B3B49', borderRadius: '16px', padding: '22px', border: '1px solid #38BDF8', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#38BDF8' }}>{selectedAuditPayload.action}</h3>
              <button onClick={() => setSelectedAuditPayload(null)} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            <pre style={{ backgroundColor: '#061920', padding: '14px', borderRadius: '8px', fontSize: '11px', color: '#A3E635', overflowX: 'auto' }}>
              {JSON.stringify(selectedAuditPayload, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

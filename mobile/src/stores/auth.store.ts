import { create } from 'zustand';

export interface MobileUserProfile {
  id: string;
  tenantId: string;
  username: string;
  fullName: string;
  roleId: 'SUPER_ADMIN' | 'ADMIN' | 'VENDEDOR' | 'CONSULTA';
  businessName: string;
}

interface AuthState {
  user: MobileUserProfile | null;
  accessToken: string | null;
  refreshToken: string | null;
  // Modo activo en la interfaz móvil
  activeMode: 'POS' | 'ADMIN';

  setAuth: (user: MobileUserProfile, accessToken: string, refreshToken: string) => void;
  logout: () => void;
  toggleMode: (mode: 'POS' | 'ADMIN') => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  activeMode: 'POS',

  setAuth: (user, accessToken, refreshToken) => {
    set({
      user,
      accessToken,
      refreshToken,
      activeMode: 'POS', // Inicia por defecto en modo POS para rápida atención
    });
  },

  logout: () => {
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      activeMode: 'POS',
    });
  },

  // Cambio de modo: Solo permitido si el usuario tiene rol ADMIN o SUPER_ADMIN
  toggleMode: (mode) => {
    const user = get().user;
    if (!user) return false;

    if (mode === 'ADMIN' && user.roleId !== 'ADMIN' && user.roleId !== 'SUPER_ADMIN') {
      // VENDEDOR tiene prohibido acceder al Modo Administrador
      return false;
    }

    set({ activeMode: mode });
    return true;
  },
}));

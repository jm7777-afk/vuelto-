import { create } from 'zustand';

export interface MobileUserProfile {
  id: string;
  tenantId: string | null;
  username: string;
  fullName: string;
  roleId: 'SUPER_ADMIN' | 'ADMIN' | 'VENDEDOR' | 'CONSULTA';
  businessName: string;
}

interface AuthState {
  user: MobileUserProfile | null;
  accessToken: string | null;
  refreshToken: string | null;
  activeMode: 'POS' | 'ADMIN';

  setAuth: (user: MobileUserProfile, accessToken: string, refreshToken: string) => void;
  updateTokens: (accessToken: string, refreshToken?: string) => void;
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
      activeMode: user.roleId === 'SUPER_ADMIN' ? 'ADMIN' : 'POS',
    });
  },

  updateTokens: (accessToken, refreshToken) => {
    set((state) => ({
      accessToken,
      refreshToken: refreshToken ?? state.refreshToken,
    }));
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
      return false;
    }

    set({ activeMode: mode });
    return true;
  },
}));

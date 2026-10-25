import { create } from "zustand";

export type Membership = {
  id: number;
  empresa_id: number;
  empresa_nombre: string;
  empresa_nit: string;
  rol: string;
};

export type MeUser = {
  id: number;
  email: string;
  full_name: string;
  is_platform_admin: boolean;
  memberships: Membership[];
  active_empresa_id: number | null;
};

type AuthState = {
  user: MeUser | null;
  activeEmpresaId: number | null;
  setUser: (user: MeUser | null) => void;
  setActiveEmpresaId: (id: number | null) => void;
};

const STORAGE_KEY = "softone_crm_empresa_id";

function readStoredEmpresaId(): number | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  activeEmpresaId: readStoredEmpresaId(),
  setUser: (user) => set({ user }),
  setActiveEmpresaId: (id) => {
    if (id) localStorage.setItem(STORAGE_KEY, String(id));
    else localStorage.removeItem(STORAGE_KEY);
    set({ activeEmpresaId: id });
  },
}));

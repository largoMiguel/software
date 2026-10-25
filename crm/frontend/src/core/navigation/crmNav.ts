import type { LucideIcon } from "lucide-react";
import {
  Building2,
  FileText,
  LayoutDashboard,
  Package,
  Receipt,
  Settings,
  Users,
} from "lucide-react";
import type { MeUser } from "@/core/auth/store";

export const ROL_LABELS: Record<string, string> = {
  owner: "Propietario",
  admin: "Administrador",
  vendedor: "Vendedor",
};

/** Texto corto para la pantalla de miembros del tenant. */
export const ROL_DESCRIPTIONS: Record<string, string> = {
  owner: "Control total. Solo hay un propietario; al asignar otro, el anterior pasa a administrador.",
  admin: "Configura la empresa e invita miembros; opera el CRM.",
  vendedor: "Clientes, cotizaciones y facturas; sin gestión de miembros.",
};

export type CrmNavItem = {
  to: string;
  label: string;
  end?: boolean;
  icon: LucideIcon;
};

export function isPlatformRoute(pathname: string): boolean {
  return pathname.startsWith("/app/platform");
}

export function isEmpresaAdminRole(rol: string | undefined): boolean {
  return rol === "owner" || rol === "admin";
}

export function activeMembership(user: MeUser | null, activeEmpresaId: number | null) {
  if (!user || !activeEmpresaId) return undefined;
  return user.memberships.find((m) => m.empresa_id === activeEmpresaId);
}

export function sidebarRoleLabel(
  user: MeUser | null,
  activeEmpresaId: number | null,
  pathname: string,
): string {
  if (isPlatformRoute(pathname)) return "Plataforma SoftOne";
  const m = activeMembership(user, activeEmpresaId);
  if (m) return ROL_LABELS[m.rol] ?? m.rol;
  if (user?.is_platform_admin) return "Plataforma SoftOne";
  return "Usuario";
}

export function platformNavItems(): CrmNavItem[] {
  return [{ to: "/app/platform/empresas", label: "Empresas clientes", end: true, icon: Building2 }];
}

export function tenantNavItems(user: MeUser | null, activeEmpresaId: number | null): CrmNavItem[] {
  if (user?.is_platform_admin && !activeEmpresaId) {
    return [];
  }
  if (user?.is_platform_admin && activeEmpresaId) {
    return [{ to: "/app/empresa", label: "Configuración empresa", end: true, icon: Settings }];
  }
  const m = activeMembership(user, activeEmpresaId);
  const admin = isEmpresaAdminRole(m?.rol);

  const items: CrmNavItem[] = [
    { to: "/app", label: "Inicio", end: true, icon: LayoutDashboard },
    { to: "/app/clientes", label: "Clientes", icon: Users },
    { to: "/app/productos", label: "Catálogo", icon: Package },
    { to: "/app/cotizaciones", label: "Cotizaciones", icon: FileText },
    { to: "/app/facturas", label: "Facturas", icon: Receipt },
  ];
  if (admin) {
    items.push({ to: "/app/empresa", label: "Empresa y miembros", icon: Settings });
  }
  return items;
}

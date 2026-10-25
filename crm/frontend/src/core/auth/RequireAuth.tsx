import { useAuth } from "@clerk/react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "@/core/auth/store";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return <div className="p-8 text-center text-slate-500">Cargando sesión…</div>;
  }
  if (!isSignedIn) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

export function RequirePlatformAdmin({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  if (!user) {
    return <div className="p-8 text-center text-slate-500">Cargando perfil…</div>;
  }
  if (!user.is_platform_admin) {
    return <Navigate to="/app" replace />;
  }
  return <>{children}</>;
}

/** Rutas operativas (clientes, facturas…) — solo usuarios del tenant, no plataforma. */
export function RequireTenantOperatorLayout() {
  const user = useAuthStore((s) => s.user);
  if (!user) {
    return <div className="p-8 text-center text-slate-500">Cargando perfil…</div>;
  }
  if (user.is_platform_admin) {
    return <Navigate to="/app/empresa" replace />;
  }
  return <Outlet />;
}

/** Rutas operativas del tenant (requieren empresa activa). */
export function RequireEmpresaLayout() {
  const user = useAuthStore((s) => s.user);
  const activeEmpresaId = useAuthStore((s) => s.activeEmpresaId);
  const location = useLocation();

  if (!user) {
    return <div className="p-8 text-center text-slate-500">Cargando perfil…</div>;
  }

  if (user.is_platform_admin && !activeEmpresaId) {
    return <Navigate to="/app/platform/empresas" replace />;
  }
  if (!activeEmpresaId && user.memberships.length > 1) {
    return <Navigate to="/seleccionar-empresa" replace />;
  }
  if (!activeEmpresaId && user.memberships.length === 0 && !user.is_platform_admin) {
    return (
      <div className="mx-auto max-w-lg p-8 text-center text-slate-600">
        Tu cuenta no tiene empresas asignadas. Contacta al administrador.
      </div>
    );
  }

  if (!activeEmpresaId && !user.is_platform_admin) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}

/** @deprecated Usar RequireEmpresaLayout en rutas anidadas. */
export function RequireEmpresa({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const activeEmpresaId = useAuthStore((s) => s.activeEmpresaId);
  const location = useLocation();

  if (!user) {
    return <div className="p-8 text-center text-slate-500">Cargando perfil…</div>;
  }
  if (
    user.is_platform_admin &&
    !activeEmpresaId &&
    location.pathname.startsWith("/app/platform")
  ) {
    return <>{children}</>;
  }
  if (user.is_platform_admin && !activeEmpresaId) {
    return <Navigate to="/app/platform/empresas" replace />;
  }
  if (!activeEmpresaId && user.memberships.length > 1) {
    return <Navigate to="/seleccionar-empresa" replace />;
  }
  if (!activeEmpresaId && user.memberships.length === 0 && !user.is_platform_admin) {
    return (
      <div className="mx-auto max-w-lg p-8 text-center text-slate-600">
        Tu cuenta no tiene empresas asignadas. Contacta al administrador.
      </div>
    );
  }
  return <>{children}</>;
}

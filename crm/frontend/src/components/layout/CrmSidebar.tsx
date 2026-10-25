import { useClerk } from "@clerk/react";
import { Building2, ChevronRight, LogOut } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useState } from "react";
import { useAuthStore } from "@/core/auth/store";
import {
  activeMembership,
  isPlatformRoute,
  platformNavItems,
  sidebarRoleLabel,
  tenantNavItems,
  type CrmNavItem,
} from "@/core/navigation/crmNav";

interface CrmSidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

function navActive(pathname: string, item: CrmNavItem): boolean {
  if (item.end) return pathname === item.to;
  return pathname === item.to || pathname.startsWith(`${item.to}/`);
}

export default function CrmSidebar({ mobileOpen = false, onMobileClose }: CrmSidebarProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const user = useAuthStore((s) => s.user);
  const activeEmpresaId = useAuthStore((s) => s.activeEmpresaId);
  const location = useLocation();
  const clerk = useClerk();

  const platformMode = isPlatformRoute(location.pathname);
  const membership = activeMembership(user, activeEmpresaId);
  const mainItems = platformMode ? platformNavItems() : tenantNavItems(user, activeEmpresaId);
  const roleLabel = sidebarRoleLabel(user, activeEmpresaId, location.pathname);
  const userInitial = (user?.full_name || user?.email || "U").charAt(0).toUpperCase();
  const headerSubtitle = platformMode
    ? "Administración SoftOne"
    : membership?.empresa_nombre ?? "Sin empresa";

  async function handleSignOut() {
    await clerk.signOut({ redirectUrl: "/login" });
  }

  function renderItem(item: CrmNavItem) {
    const Icon = item.icon;
    const active = navActive(location.pathname, item);
    return (
      <NavLink
        key={item.to}
        to={item.to}
        end={item.end}
        onClick={() => onMobileClose?.()}
        className={() =>
          `group flex items-center gap-3 rounded-[0.3rem] px-3 py-2.5 text-sm transition-all ${
            active
              ? "border-l-[3px] border-[#3eafd4] bg-[rgba(62,175,212,0.2)] pl-[calc(0.75rem-3px)] text-white"
              : "text-[rgba(255,255,255,0.6)] hover:bg-[rgba(255,255,255,0.07)] hover:text-white"
          }`
        }
      >
        <Icon className="h-5 w-5 flex-shrink-0" />
        <span
          className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${
            isExpanded || mobileOpen ? "max-w-[220px] opacity-100" : "max-w-0 opacity-0"
          }`}
        >
          {item.label}
        </span>
      </NavLink>
    );
  }

  const asideClasses = `${
    mobileOpen ? "translate-x-0" : "-translate-x-full"
  } md:translate-x-0 fixed left-0 top-0 z-40 flex min-h-0 flex-col border-r border-[#e3e6ea] bg-[#1c2536] transition-all duration-300 h-screen ${
    isExpanded || mobileOpen ? "w-64" : "w-16"
  }`;

  return (
    <aside
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
      className={asideClasses}
    >
      <div
        className={`flex flex-shrink-0 items-center border-b border-[rgba(255,255,255,0.07)] px-3 transition-all duration-300 overflow-hidden ${
          isExpanded || mobileOpen ? "h-[62px]" : "h-[52px]"
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[#3eafd4] text-xs font-bold text-white">
            CRM
          </div>
          <div
            className={`transition-all duration-300 overflow-hidden ${
              isExpanded || mobileOpen ? "w-48 opacity-100" : "w-0 opacity-0"
            }`}
          >
            <div className="text-sm font-bold text-white leading-tight whitespace-nowrap">SoftOne CRM</div>
            <div className="text-[0.62rem] text-[rgba(255,255,255,0.55)] leading-tight truncate pr-1">
              {headerSubtitle}
            </div>
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto overflow-x-hidden p-2">
          {!platformMode && user?.is_platform_admin && (
            <NavLink
              to="/app/platform/empresas"
              onClick={() => onMobileClose?.()}
              className={() =>
                `group mb-2 flex items-center gap-3 rounded-[0.3rem] border border-[rgba(62,175,212,0.35)] bg-[rgba(62,175,212,0.12)] px-3 py-2.5 text-sm text-white transition-all hover:bg-[rgba(62,175,212,0.2)]`
              }
            >
              <Building2 className="h-5 w-5 flex-shrink-0" />
              <span
                className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${
                  isExpanded || mobileOpen ? "max-w-[220px] opacity-100" : "max-w-0 opacity-0"
                }`}
              >
                Plataforma
              </span>
              {(isExpanded || mobileOpen) && <ChevronRight className="ml-auto h-4 w-4 opacity-70" />}
            </NavLink>
          )}

          {platformMode && !user?.is_platform_admin && null}

          {mainItems.map(renderItem)}
        </nav>
      </div>

      <div className="flex-shrink-0 border-t border-[rgba(255,255,255,0.07)] p-2">
        <div
          className={`flex w-full min-w-0 items-center rounded-[0.3rem] px-1 py-1 transition-colors hover:bg-[rgba(255,255,255,0.07)] ${
            isExpanded || mobileOpen ? "gap-1" : "justify-center"
          }`}
        >
          <button
            type="button"
            onClick={() => clerk.openUserProfile()}
            title={user?.full_name || "Mi cuenta"}
            className={`flex min-w-0 items-center ${isExpanded || mobileOpen ? "min-w-0 flex-1 gap-2" : ""}`}
          >
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#3eafd4] text-sm font-bold text-white">
              {userInitial}
            </div>
            {(isExpanded || mobileOpen) && (
              <div className="min-w-0 flex-1 text-left">
                <div className="text-[0.7rem] font-semibold text-white truncate">
                  {user?.full_name || user?.email || "Usuario"}
                </div>
                <div className="text-[0.65rem] text-[rgba(255,255,255,0.6)] truncate">{roleLabel}</div>
              </div>
            )}
          </button>
          {(isExpanded || mobileOpen) && (
            <button
              type="button"
              onClick={handleSignOut}
              title="Cerrar sesión"
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[0.3rem] text-[rgba(255,255,255,0.55)] transition-colors hover:bg-[rgba(255,255,255,0.1)] hover:text-white"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}

import { useAuth } from "@clerk/react";
import { useEffect } from "react";
import { fetchMe } from "@/core/api/auth";
import { registerClerkGetToken } from "@/core/auth/clerkToken";
import { useAuthStore } from "@/core/auth/store";

export default function AuthBootstrap({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const setUser = useAuthStore((s) => s.setUser);
  const setActiveEmpresaId = useAuthStore((s) => s.setActiveEmpresaId);
  const activeEmpresaId = useAuthStore((s) => s.activeEmpresaId);

  useEffect(() => {
    registerClerkGetToken(() => getToken());
  }, [getToken]);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setUser(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const me = await fetchMe();
        if (cancelled) return;
        setUser(me);
        const ids = new Set(me.memberships.map((m) => m.empresa_id));
        if (me.is_platform_admin) {
          if (activeEmpresaId && ids.has(activeEmpresaId)) {
            setActiveEmpresaId(activeEmpresaId);
          } else {
            setActiveEmpresaId(null);
          }
          return;
        }
        if (activeEmpresaId && ids.has(activeEmpresaId)) {
          setActiveEmpresaId(activeEmpresaId);
        } else if (me.memberships.length === 1) {
          setActiveEmpresaId(me.memberships[0].empresa_id);
        } else if (!activeEmpresaId && me.memberships[0]) {
          setActiveEmpresaId(me.memberships[0].empresa_id);
        }
      } catch {
        if (!cancelled) setUser(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, setUser, setActiveEmpresaId, activeEmpresaId]);

  return <>{children}</>;
}

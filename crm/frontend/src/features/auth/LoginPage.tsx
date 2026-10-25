import { SignIn, useAuth } from "@clerk/react";
import { Navigate, useSearchParams } from "react-router-dom";
import { clerkAuthAppearance } from "@/core/auth/clerkAppearance";
import { useAuthStore } from "@/core/auth/store";
import AuthShell from "@/features/auth/AuthShell";
import { SoftOneLoading } from "@/components/ui/SoftOneUi";

export default function LoginPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const user = useAuthStore((s) => s.user);
  const activeEmpresaId = useAuthStore((s) => s.activeEmpresaId);
  const [searchParams] = useSearchParams();
  const ticket = searchParams.get("__clerk_ticket");
  const status = searchParams.get("__clerk_status");

  if (ticket && status !== "sign_in" && status !== "complete") {
    return <Navigate to={`/sign-up?${searchParams.toString()}`} replace />;
  }

  if (!isLoaded) {
    return (
      <AuthShell>
        <SoftOneLoading label="Iniciando sesión…" />
      </AuthShell>
    );
  }

  if (isLoaded && isSignedIn && !user) {
    return (
      <AuthShell>
        <SoftOneLoading label="Cargando perfil…" />
      </AuthShell>
    );
  }

  if (isLoaded && isSignedIn && user) {
    const dest = user.is_platform_admin && !activeEmpresaId ? "/app/platform/empresas" : "/app";
    return <Navigate to={dest} replace />;
  }

  if (isLoaded && status === "complete") {
    return <Navigate to="/app/platform/empresas" replace />;
  }

  return (
    <AuthShell>
      <SignIn
        routing="path"
        path="/login"
        signUpUrl="/sign-up"
        appearance={clerkAuthAppearance}
      />
    </AuthShell>
  );
}

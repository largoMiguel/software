import { SignUp, useAuth } from "@clerk/react";
import { Navigate } from "react-router-dom";
import { clerkAuthAppearance } from "@/core/auth/clerkAppearance";
import AuthShell from "@/features/auth/AuthShell";
import { SoftOneLoading } from "@/components/ui/SoftOneUi";

export default function SignUpPage() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return (
      <AuthShell subtitle="Completa tu invitación">
        <SoftOneLoading label="Iniciando…" />
      </AuthShell>
    );
  }

  if (isLoaded && isSignedIn) {
    return <Navigate to="/app" replace />;
  }

  return (
    <AuthShell subtitle="Completa tu invitación para acceder al CRM">
      <SignUp routing="path" path="/sign-up" signInUrl="/login" appearance={clerkAuthAppearance} />
    </AuthShell>
  );
}

import { ClerkProvider } from "@clerk/react";
import { esES } from "@clerk/localizations";
import { ui } from "@clerk/ui";
import { useNavigate } from "react-router-dom";

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

export default function ClerkProviderWithRouter({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();

  if (!PUBLISHABLE_KEY) {
    if (import.meta.env.DEV) {
      console.warn("VITE_CLERK_PUBLISHABLE_KEY no definida");
    }
    return <>{children}</>;
  }

  return (
    <ClerkProvider
      publishableKey={PUBLISHABLE_KEY}
      ui={ui}
      localization={esES}
      signInForceRedirectUrl="/app"
      signInFallbackRedirectUrl="/app"
      signUpForceRedirectUrl="/app"
      signUpFallbackRedirectUrl="/app"
      routerPush={(to) => navigate(to)}
      routerReplace={(to) => navigate(to, { replace: true })}
    >
      {children}
    </ClerkProvider>
  );
}

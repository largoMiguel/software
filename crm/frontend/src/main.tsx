import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AuthBootstrap from "@/core/auth/AuthBootstrap";
import ClerkProviderWithRouter from "@/core/auth/ClerkProviderWithRouter";
import App from "./App";
import "@fontsource/figtree/400.css";
import "@fontsource/figtree/500.css";
import "@fontsource/figtree/600.css";
import "@fontsource/figtree/700.css";
import "./index.css";

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ClerkProviderWithRouter>
          <AuthBootstrap>
            <App />
          </AuthBootstrap>
        </ClerkProviderWithRouter>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);

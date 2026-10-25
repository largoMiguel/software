import axios, { type InternalAxiosRequestConfig } from "axios";
import { getClerkToken } from "@/core/auth/clerkToken";
import { useAuthStore } from "@/core/auth/store";

const API_URL = import.meta.env.VITE_API_URL || "/api/v1";

export const api = axios.create({
  baseURL: API_URL,
  timeout: 20_000,
});

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await getClerkToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const empresaId = useAuthStore.getState().activeEmpresaId;
  if (empresaId) {
    config.headers["X-Empresa-Id"] = String(empresaId);
  }
  return config;
});

export async function downloadPdf(path: string, filename: string) {
  const token = await getClerkToken();
  const empresaId = useAuthStore.getState().activeEmpresaId;
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (empresaId) headers["X-Empresa-Id"] = String(empresaId);
  const res = await fetch(`${API_URL}${path}`, { headers });
  if (!res.ok) throw new Error("No se pudo descargar el PDF");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

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

export async function downloadPdf(path: string, filename: string): Promise<void> {
  const token = await getClerkToken();
  const empresaId = useAuthStore.getState().activeEmpresaId;
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (empresaId) headers["X-Empresa-Id"] = String(empresaId);
  const urlPath = path.startsWith("/") ? path : `/${path}`;
  const res = await fetch(`${API_URL}${urlPath}`, { headers });
  if (!res.ok) {
    let detail = "No se pudo descargar el PDF";
    try {
      const body = await res.json();
      if (body?.detail) detail = String(body.detail);
    } catch {
      /* respuesta no JSON */
    }
    throw new Error(detail);
  }
  const blob = await res.blob();
  const type = blob.type || res.headers.get("content-type") || "";
  if (type && !type.includes("pdf") && !type.includes("octet-stream")) {
    throw new Error("El servidor no devolvió un PDF válido");
  }
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);
}

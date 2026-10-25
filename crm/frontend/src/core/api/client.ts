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

async function pdfAuthHeaders(): Promise<Record<string, string>> {
  const token = await getClerkToken();
  const empresaId = useAuthStore.getState().activeEmpresaId;
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (empresaId) headers["X-Empresa-Id"] = String(empresaId);
  return headers;
}

function normalizePdfPath(path: string): string {
  return path.startsWith("/") ? path : `/${path}`;
}

export async function fetchPdfBlob(path: string): Promise<Blob> {
  const headers = await pdfAuthHeaders();
  const res = await fetch(`${API_URL}${normalizePdfPath(path)}`, { headers });
  if (!res.ok) {
    let detail = "No se pudo obtener el PDF";
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
  return blob;
}

export async function downloadPdfFromBlob(blob: Blob, filename: string): Promise<void> {
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);
}

/** Descarga directa (sin abrir visor). */
export async function downloadPdf(path: string, filename: string): Promise<void> {
  const sep = path.includes("?") ? "&" : "?";
  const blob = await fetchPdfBlob(`${path}${sep}download=1`);
  await downloadPdfFromBlob(blob, filename);
}

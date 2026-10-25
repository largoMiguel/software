export type Paginated<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export function paginatedParams(opts: {
  page?: number;
  pageSize?: number;
  search?: string;
  extra?: Record<string, string | number | undefined>;
}) {
  const params: Record<string, string | number> = {};
  if (opts.page != null) params.page = opts.page;
  if (opts.pageSize != null) params.page_size = opts.pageSize;
  const q = opts.search?.trim();
  if (q) params.search = q;
  if (opts.extra) {
    for (const [k, v] of Object.entries(opts.extra)) {
      if (v !== undefined && v !== "") params[k] = v;
    }
  }
  return params;
}

export function formatApiError(err: unknown): string {
  if (err && typeof err === "object" && "response" in err) {
    const data = (err as { response?: { data?: unknown } }).response?.data;
    if (typeof data === "string") return data;
    if (data && typeof data === "object") {
      const parts: string[] = [];
      for (const [key, val] of Object.entries(data as Record<string, unknown>)) {
        if (key === "detail" && typeof val === "string") parts.push(val);
        else if (Array.isArray(val)) parts.push(`${key}: ${val.map(String).join(", ")}`);
        else if (typeof val === "object" && val !== null)
          parts.push(`${key}: ${JSON.stringify(val)}`);
        else if (val != null) parts.push(`${key}: ${String(val)}`);
      }
      if (parts.length) return parts.join(" · ");
    }
  }
  if (err instanceof Error) return err.message;
  return "Error desconocido";
}

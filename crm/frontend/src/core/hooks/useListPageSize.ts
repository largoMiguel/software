import { useEffect, useState } from "react";

export const PAGE_SIZE_OPTIONS = [15, 25, 50, 100] as const;
export type ListPageSize = (typeof PAGE_SIZE_OPTIONS)[number];

const STORAGE_KEY = "softone-crm-list-page-size";

export function useListPageSize(defaultSize: ListPageSize = 25) {
  const [pageSize, setPageSizeState] = useState<ListPageSize>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const n = raw ? Number(raw) : defaultSize;
      return (PAGE_SIZE_OPTIONS as readonly number[]).includes(n) ? (n as ListPageSize) : defaultSize;
    } catch {
      return defaultSize;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(pageSize));
    } catch {
      /* ignore */
    }
  }, [pageSize]);

  function setPageSize(size: ListPageSize) {
    setPageSizeState(size);
  }

  return { pageSize, setPageSize, pageSizeOptions: PAGE_SIZE_OPTIONS };
}

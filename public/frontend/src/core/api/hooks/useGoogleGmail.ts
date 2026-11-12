import { useQuery } from "@tanstack/react-query";
import { googleIntegrationApi } from "@/core/api/googleIntegration";

export function useGoogleGmailStatus(enabled = true) {
  return useQuery({
    queryKey: ["google-gmail-status"],
    queryFn: () => googleIntegrationApi.status(),
    enabled,
    staleTime: 60_000,
    retry: false,
  });
}

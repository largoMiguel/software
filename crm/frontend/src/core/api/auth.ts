import { api } from "@/core/api/client";
import type { MeUser, Membership } from "@/core/auth/store";

export async function fetchMe(): Promise<MeUser> {
  const { data } = await api.get<MeUser>("/auth/me");
  return data;
}

export async function fetchMemberships(): Promise<Membership[]> {
  const { data } = await api.get<Membership[]>("/auth/memberships/");
  return data;
}

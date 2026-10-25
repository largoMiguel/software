let getTokenFn: (() => Promise<string | null>) | null = null;

export function registerClerkGetToken(fn: () => Promise<string | null>) {
  getTokenFn = fn;
}

export async function getClerkToken(): Promise<string | null> {
  if (!getTokenFn) return null;
  return getTokenFn();
}

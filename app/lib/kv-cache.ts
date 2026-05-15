export async function getCachedOrFetch<T>(
  kv: KVNamespace,
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const cached = await kv.get(key, "json");
  if (cached !== null) return cached as T;
  const fresh = await fetcher();
  await kv.put(key, JSON.stringify(fresh), { expirationTtl: ttlSeconds });
  return fresh;
}

export function dashboardCacheKey(userId: string, period: string): string {
  return `dash:${userId}:${period}`;
}

export function categoryTotalsCacheKey(userId: string, period: string): string {
  return `cat:${userId}:${period}`;
}

export async function invalidateUserDashboard(
  kv: KVNamespace,
  userId: string,
  period: string
): Promise<void> {
  await Promise.all([
    kv.delete(dashboardCacheKey(userId, period)),
    kv.delete(categoryTotalsCacheKey(userId, period)),
  ]);
}

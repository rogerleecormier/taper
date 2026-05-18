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
  const dashboardPrefix = `${dashboardCacheKey(userId, period)}`;
  const categoryPrefix = `${categoryTotalsCacheKey(userId, period)}`;

  const [dashboardKeys, categoryKeys] = await Promise.all([
    kv.list({ prefix: dashboardPrefix }),
    kv.list({ prefix: categoryPrefix }),
  ]);

  await Promise.all([
    ...dashboardKeys.keys.map((k) => kv.delete(k.name)),
    ...categoryKeys.keys.map((k) => kv.delete(k.name)),
  ]);
}

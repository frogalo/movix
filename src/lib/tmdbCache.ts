// In-memory cache for TMDB API queries to maximize efficiency and minimize VPS external requests.
type CacheEntry = {
  data: any;
  expiresAt: number;
};

const cache = new Map<string, CacheEntry>();

export async function fetchWithCache(url: string, revalidateSeconds: number = 3600): Promise<any> {
  const now = Date.now();
  const cached = cache.get(url);

  if (cached && cached.expiresAt > now) {
    return cached.data;
  }

  // Attempt to fetch fresh data
  try {
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      cache.set(url, {
        data,
        expiresAt: now + revalidateSeconds * 1000,
      });

      // Cleanup expired items if the cache is growing large
      if (cache.size > 1000) {
        const cleanupNow = Date.now();
        for (const [key, val] of cache.entries()) {
          if (val.expiresAt < cleanupNow) {
            cache.delete(key);
          }
        }
      }

      return data;
    }
  } catch (err) {
    console.error(`[TMDB_CACHE] Fetch failed for ${url}:`, err);
  }

  // If request failed but we have expired cached data, fall back to it
  if (cached) {
    console.warn(`[TMDB_CACHE] Request failed, returning expired cached fallback for: ${url}`);
    return cached.data;
  }

  return null;
}

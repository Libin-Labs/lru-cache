import { LruCache, type LruCacheStats } from '@lp-labs/lru-cache';

const cache = new LruCache<string, number>({ maxSize: 4 });
cache.set('count', 1);
const stats: LruCacheStats = cache.stats();
// @ts-expect-error Cache values retain their generic type.
cache.set('invalid', 'not a number');
void [cache.get('count'), stats.hitRate];

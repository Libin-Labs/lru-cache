import lruCache = require('@lp-labs/lru-cache');

const cache = new lruCache.LruCache<number, string>({ maxSize: 2 });
cache.set(1, 'one');
void [cache.get(1), cache.delete(1)];

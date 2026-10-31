export type CacheEvictionReason = 'capacity' | 'expired' | 'delete' | 'clear';
export type EvictionListener<K, V> = (key: K, value: V, reason: CacheEvictionReason) => void;
export type CacheClock = () => number;

export interface LruCacheOptions<K, V> {
  maxSize: number;
  ttlMs?: number;
  clock?: CacheClock;
  onEvict?: EvictionListener<K, V>;
}

export interface LruCacheStats {
  hits: number;
  misses: number;
  evictions: number;
  size: number;
  hitRate: number;
}

interface Entry<V> {
  value: V;
  expiresAt: number;
}

export class LruCache<K, V> {
  private readonly entries = new Map<K, Entry<V>>();
  private readonly clock: CacheClock;
  private readonly ttlMs: number;
  private readonly maxSize: number;
  private readonly onEvict: EvictionListener<K, V> | undefined;
  private hits = 0;
  private misses = 0;
  private evictions = 0;

  constructor(options: LruCacheOptions<K, V>) {
    if (!Number.isInteger(options.maxSize) || options.maxSize <= 0)
      throw new RangeError('maxSize must be a positive integer');
    const ttlMs = options.ttlMs ?? Number.POSITIVE_INFINITY;
    if (options.ttlMs !== undefined && (!Number.isFinite(ttlMs) || ttlMs <= 0))
      throw new RangeError('ttlMs must be a positive finite number');
    this.maxSize = options.maxSize;
    this.ttlMs = ttlMs;
    this.clock = options.clock ?? Date.now;
    this.onEvict = options.onEvict;
  }

  get size(): number {
    this.pruneExpired();
    return this.entries.size;
  }

  get(key: K): V | undefined {
    const entry = this.entries.get(key);
    if (entry === undefined) {
      this.misses += 1;
      return undefined;
    }
    if (this.expired(entry)) {
      this.remove(key, entry, 'expired');
      this.misses += 1;
      return undefined;
    }
    this.entries.delete(key);
    this.entries.set(key, entry);
    this.hits += 1;
    return entry.value;
  }

  has(key: K): boolean {
    const entry = this.entries.get(key);
    if (entry === undefined) return false;
    if (this.expired(entry)) {
      this.remove(key, entry, 'expired');
      return false;
    }
    return true;
  }

  set(key: K, value: V): this {
    const now = this.now();
    const previous = this.entries.get(key);
    if (previous !== undefined) this.entries.delete(key);
    this.entries.set(key, {
      value,
      expiresAt:
        this.ttlMs === Number.POSITIVE_INFINITY ? Number.POSITIVE_INFINITY : now + this.ttlMs,
    });
    this.pruneExpired();
    while (this.entries.size > this.maxSize) {
      const oldest = this.entries.entries().next().value as [K, Entry<V>] | undefined;
      if (oldest === undefined) break;
      this.remove(oldest[0], oldest[1], 'capacity');
    }
    return this;
  }

  delete(key: K): boolean {
    const entry = this.entries.get(key);
    if (entry === undefined) return false;
    this.remove(key, entry, 'delete');
    return true;
  }

  clear(): void {
    for (const [key, entry] of this.entries) this.remove(key, entry, 'clear');
  }

  stats(): LruCacheStats {
    this.pruneExpired();
    const requests = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      evictions: this.evictions,
      size: this.entries.size,
      hitRate: requests === 0 ? 0 : this.hits / requests,
    };
  }

  private now(): number {
    const value = this.clock();
    if (!Number.isFinite(value)) throw new RangeError('clock must return a finite timestamp');
    return value;
  }

  private expired(entry: Entry<V>): boolean {
    return this.now() >= entry.expiresAt;
  }

  private pruneExpired(): void {
    for (const [key, entry] of this.entries) {
      if (this.expired(entry)) this.remove(key, entry, 'expired');
    }
  }

  private remove(key: K, entry: Entry<V>, reason: CacheEvictionReason): void {
    if (!this.entries.delete(key)) return;
    if (reason !== 'delete' && reason !== 'clear') this.evictions += 1;
    this.onEvict?.(key, entry.value, reason);
  }
}

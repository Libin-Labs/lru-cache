# @lp-labs/lru-cache

A bounded, typed least-recently-used cache with optional time-to-live, eviction callbacks, and statistics.

```ts
import { LruCache } from "@lp-labs/lru-cache";

const cache = new LruCache<string, { title: string }>({
  maxSize: 500,
  ttlMs: 60_000,
  onEvict: (key, _value, reason) => console.log(key, reason)
});
cache.set("home", { title: "Welcome" });
const page = cache.get("home");
```

## API

- `new LruCache<K, V>(options)` requires `{ maxSize: positive integer }`; `ttlMs` is an optional positive finite duration (default: no expiry); `clock` defaults to `Date.now`; `onEvict(key, value, reason)` is optional.
- `set(key, value)` inserts or replaces and returns the cache. Replacing refreshes recency and expiry. Capacity excess evicts least-recently-used entries.
- `get(key)` returns the value or `undefined`; successful reads promote to most-recent. Misses and expired entries return `undefined`. Since `undefined` can be a stored value, use `has` to distinguish it.
- `has(key)` checks an unexpired entry without changing recency. `delete(key)` removes and returns whether a key existed. `clear()` removes all entries. `size` first removes expired entries.
- `stats()` returns `{ hits, misses, evictions, size, hitRate }`. Hits/misses count `get` only. Evictions count TTL and capacity removals, not explicit deletion or clearing. `hitRate` is zero until a lookup has occurred.
- `CacheEvictionReason` is `"capacity" | "expired" | "delete" | "clear"`. `EvictionListener<K, V>` receives key, value, and reason. `CacheClock` returns a timestamp in milliseconds. `LruCacheOptions<K, V>` and `LruCacheStats` describe the corresponding constructor options and statistics object.

TTL expires at `now >= expiresAt`. Expiration is lazy (on lookup, `size`, or `stats`), not timer-driven. An invalid size/TTL or non-finite clock result throws `RangeError`. The cache is process-local, not synchronized, and its capacity is an entry count rather than a byte budget. Callback errors propagate after the entry has been removed.

## Compatibility and references

Targets ES2022 and has no runtime dependencies. See [LRU cache](https://en.wikipedia.org/wiki/Cache_replacement_policies#Least_recently_used_(LRU)).

## License

[MIT](./LICENSE).

## Support

If this library is useful to you, consider supporting its maintenance with a [donation via PayPal](https://www.paypal.me/LibinPrasanth).

## Author

Created by [Libin Prasanth](https://www.linkedin.com/in/libinprasanth/). Connect on LinkedIn for updates and discussion.

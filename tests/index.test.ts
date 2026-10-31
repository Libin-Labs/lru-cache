import test from 'node:test';
import assert from 'node:assert/strict';
import { LruCache } from '../src/index.js';

test('evicts least recently used and promotes on read', () => {
  const cache = new LruCache<string, number>({ maxSize: 2 });
  cache.set('a', 1).set('b', 2);
  assert.equal(cache.get('a'), 1);
  cache.set('c', 3);
  assert.equal(cache.has('b'), false);
  assert.equal(cache.get('a'), 1);
  assert.equal(cache.get('c'), 3);
  assert.deepEqual(cache.stats(), { hits: 3, misses: 0, evictions: 1, size: 2, hitRate: 1 });
});

test('updates existing keys, supports undefined values, and counts misses/hit rate', () => {
  const cache = new LruCache<string, number | undefined>({ maxSize: 1 });
  cache.set('x', 1).set('x', undefined);
  assert.equal(cache.get('x'), undefined);
  assert.equal(cache.get('missing'), undefined);
  assert.deepEqual(cache.stats(), { hits: 1, misses: 1, evictions: 0, size: 1, hitRate: 0.5 });
});

test('expires at TTL boundary and emits eviction reasons', () => {
  let now = 5;
  const evicted: string[] = [];
  const cache = new LruCache<string, number>({
    maxSize: 4,
    ttlMs: 10,
    clock: () => now,
    onEvict: (key, _value, reason) => evicted.push(`${key}:${reason}`),
  });
  cache.set('a', 1);
  now = 14;
  assert.equal(cache.get('a'), 1);
  now = 15;
  assert.equal(cache.get('a'), undefined);
  cache.set('b', 2).delete('b');
  cache.set('c', 3).clear();
  assert.deepEqual(evicted, ['a:expired', 'b:delete', 'c:clear']);
  assert.equal(cache.stats().evictions, 1);
});

test('reports capacity callbacks, lazy size cleanup, and validation errors', () => {
  let now = 0;
  const evicted: string[] = [];
  const cache = new LruCache<string, number>({
    maxSize: 1,
    ttlMs: 2,
    clock: () => now,
    onEvict: (key, _value, reason) => evicted.push(`${key}:${reason}`),
  });
  cache.set('a', 1).set('b', 2);
  assert.deepEqual(evicted, ['a:capacity']);
  now = 2;
  assert.equal(cache.size, 0);
  assert.deepEqual(evicted, ['a:capacity', 'b:expired']);
  assert.throws(() => new LruCache({ maxSize: 0 }), RangeError);
  assert.throws(() => new LruCache({ maxSize: 1, ttlMs: 0 }), RangeError);
  assert.throws(() => new LruCache({ maxSize: 1, ttlMs: Infinity }), RangeError);
  assert.throws(() => new LruCache({ maxSize: 1, clock: () => NaN }).set('x', 1), RangeError);
});

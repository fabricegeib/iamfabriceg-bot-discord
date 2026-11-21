/**
 * Cache mémoire TTL simple, sans dépendance externe.
 * Utilisé pour toutes les réponses d'APIs externes et du CMS.
 */
class Cache {
  constructor() {
    this.store = new Map();
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key, value, ttlMs = 60_000) {
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
    return value;
  }

  has(key) {
    return this.get(key) !== undefined;
  }

  delete(key) {
    return this.store.delete(key);
  }

  clear() {
    this.store.clear();
  }

  get size() {
    for (const key of [...this.store.keys()]) this.get(key); // purge des entrées expirées
    return this.store.size;
  }

  /** Retourne la valeur en cache ou exécute `loader` et met en cache son résultat. */
  async getOrSet(key, ttlMs, loader) {
    const hit = this.get(key);
    if (hit !== undefined) return hit;
    const value = await loader();
    if (value !== undefined) this.set(key, value, ttlMs);
    return value;
  }

  stats() {
    const now = Date.now();
    let valid = 0;
    let expired = 0;
    for (const entry of this.store.values()) {
      if (entry.expiresAt <= now) expired += 1;
      else valid += 1;
    }
    return { valid, expired, total: valid + expired };
  }
}

const shared = new Cache();

module.exports = { Cache, shared };

/** Cooldowns en mémoire, par utilisateur et par commande. */
class CooldownManager {
  constructor(defaultMs = 3000) {
    this.defaultMs = defaultMs;
    this.store = new Map();
  }

  check(userId, commandName, customMs) {
    const key = `${userId}:${commandName}`;
    const now = Date.now();
    const expiresAt = this.store.get(key) || 0;
    if (expiresAt > now) return expiresAt - now;
    this.store.set(key, now + (customMs ?? this.defaultMs));
    return 0;
  }

  reset(userId, commandName) {
    this.store.delete(`${userId}:${commandName}`);
  }

  clear() {
    this.store.clear();
  }
}

const shared = new CooldownManager();

module.exports = { CooldownManager, shared };

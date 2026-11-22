const { request, buildUrl } = require("./http");
const { getEnv } = require("../config/env");
const { FeatureDisabledError } = require("./errors");
const { createLogger } = require("./logger");

const log = createLogger("payload");
const FIVE_MIN = 5 * 60 * 1000;

/**
 * Client REST pour Payload CMS v3.
 * Auth : Authorization: <slug utilisateur> API-Key <clé>
 */
class PayloadClient {
  constructor({ url, authSlug = "users", apiKey = "", gamesSlug = "games" }) {
    if (!url) throw new Error("PAYLOAD_URL est requis pour PayloadClient.");
    this.baseUrl = String(url).replace(/\/+$/, "");
    this.authSlug = authSlug;
    this.apiKey = apiKey;
    this.gamesSlug = gamesSlug;
  }

  get headers() {
    return this.apiKey ? { Authorization: `${this.authSlug} API-Key ${this.apiKey}` } : {};
  }

  get isReadOnly() {
    return !this.apiKey;
  }

  async list(collection, params = {}) {
    return request(buildUrl(`${this.baseUrl}/api/${collection}`, params), {
      headers: this.headers,
      cacheTtlMs: FIVE_MIN,
    });
  }

  async find(collection, id, params = {}) {
    return request(buildUrl(`${this.baseUrl}/api/${collection}/${encodeURIComponent(id)}`, params), {
      headers: this.headers,
      cacheTtlMs: FIVE_MIN,
    });
  }

  async create(collection, data) {
    this.#requireWrite();
    return request(`${this.baseUrl}/api/${collection}`, {
      method: "POST",
      headers: { ...this.headers, "Content-Type": "application/json" },
      body: JSON.stringify(data),
      cacheTtlMs: 0,
      retries: 0,
    });
  }

  async update(collection, id, data) {
    this.#requireWrite();
    return request(`${this.baseUrl}/api/${collection}/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { ...this.headers, "Content-Type": "application/json" },
      body: JSON.stringify(data),
      cacheTtlMs: 0,
      retries: 0,
    });
  }

  async remove(collection, id) {
    this.#requireWrite();
    return request(`${this.baseUrl}/api/${collection}/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: this.headers,
      cacheTtlMs: 0,
      retries: 0,
    });
  }

  /** Appelle un custom endpoint /api/<path> exposé par le CMS. */
  async custom(path, { method = "GET", body, params = {} } = {}) {
    const url = buildUrl(`${this.baseUrl}/api/${String(path).replace(/^\/+/, "")}`, params);
    return request(url, {
      method,
      headers: {
        ...this.headers,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      cacheTtlMs: method.toUpperCase() === "GET" ? FIVE_MIN : 0,
      retries: 0,
    });
  }

  /** Lecture des jeux (mode 1 : GET + cache). */
  async getGames() {
    const data = await this.list(this.gamesSlug, { depth: 1, limit: 100, sort: "name" });
    return data?.docs || [];
  }

  /** Convertit un document Payload en entrée de catalogue utilisable par le bot. */
  mapGame(doc) {
    return {
      key: doc.key || doc.slug || String(doc.id),
      name: doc.title || doc.name || doc.slug,
      roleId: doc.discordRoleId || doc.roleId || null,
      category: doc.category || "Jeu",
      emoji: doc.emoji || "🎮",
      search: doc.search || doc.title || doc.name,
      description: doc.description,
      source: "payload",
      id: doc.id,
    };
  }

  /** Synchronise les jeux du CMS et les fusionne avec le catalogue local. */
  async syncGames(localGames = []) {
    const docs = await this.getGames();
    const remote = docs.map((doc) => this.mapGame(doc));
    const merged = new Map(localGames.map((game) => [game.key, game]));
    for (const game of remote) merged.set(game.key, { ...(merged.get(game.key) || {}), ...game });
    log.info(`${remote.length} jeu(x) synchronisé(s) depuis Payload`);
    return [...merged.values()];
  }

  /** Écriture : associe ou met à jour un profil Discord dans le CMS. */
  async upsertDiscordProfile(discordId, data = {}) {
    return this.custom("bot/profile", { method: "POST", body: { discordId, ...data } });
  }

  #requireWrite() {
    if (!this.apiKey) throw new FeatureDisabledError("L'écriture Payload", "PAYLOAD_API_KEY");
  }
}

function createPayloadClient(env = getEnv()) {
  if (!env.PAYLOAD_URL) return null;
  return new PayloadClient({
    url: env.PAYLOAD_URL,
    authSlug: env.PAYLOAD_AUTH_SLUG || "users",
    apiKey: env.PAYLOAD_API_KEY,
    gamesSlug: env.PAYLOAD_GAMES_SLUG || "games",
  });
}

function requirePayloadClient() {
  const client = createPayloadClient();
  if (!client) throw new FeatureDisabledError("Payload CMS", "PAYLOAD_URL");
  return client;
}

module.exports = { PayloadClient, createPayloadClient, requirePayloadClient };

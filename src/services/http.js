const { shared: defaultCache } = require("./cache");
const { HttpError } = require("./errors");
const { createLogger } = require("./logger");

const log = createLogger("http");

const DEFAULT_USER_AGENT = "iamfabriceg-bot-discord/1.1.0 (+https://github.com/fabricegeib/iamfabriceg-bot-discord)";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Client HTTP unique basé sur fetch : timeout, retry exponentiel et cache TTL.
 * `fetchImpl` est injectable pour les tests.
 */
async function request(url, options = {}) {
  const {
    method = "GET",
    headers: providedHeaders = {},
    body,
    timeoutMs = 8000,
    retries = 2,
    cacheTtlMs = 0,
    cache = defaultCache,
    fetchImpl = fetch,
    retryStatuses = [408, 425, 429, 500, 502, 503, 504],
  } = options;

  const headers = { "User-Agent": DEFAULT_USER_AGENT, ...providedHeaders };
  const cacheKey = `${method.toUpperCase()}:${url}:${JSON.stringify(headers)}`;
  if (method.toUpperCase() === "GET" && cacheTtlMs > 0) {
    const hit = cache.get(cacheKey);
    if (hit !== undefined) return hit;
  }

  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetchImpl(url, {
        method,
        headers,
        body,
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        const error = new HttpError(`HTTP ${response.status} sur ${url}`, {
          status: response.status,
          url,
          body: text,
        });
        if (!retryStatuses.includes(response.status) || attempt === retries) throw error;
        lastError = error;
      } else {
        const text = await response.text();
        let data;
        try {
          data = text ? JSON.parse(text) : null;
        } catch {
          data = text;
        }
        if (method.toUpperCase() === "GET" && cacheTtlMs > 0) cache.set(cacheKey, data, cacheTtlMs);
        return data;
      }
    } catch (error) {
      if (error instanceof HttpError && !retryStatuses.includes(error.status)) throw error;
      lastError = error;
      if (attempt === retries) break;
    }

    const delay = 250 * 2 ** attempt;
    log.warn(`Nouvel essai dans ${delay}ms (${attempt + 1}/${retries}) pour ${url}`);
    await sleep(delay);
  }

  throw lastError instanceof Error ? lastError : new HttpError(`Échec de la requête ${url}`);
}

/** Construit une URL avec des paramètres de requête. */
function buildUrl(base, params = {}) {
  const url = new URL(base);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  }
  return url.toString();
}

module.exports = { request, buildUrl, sleep };

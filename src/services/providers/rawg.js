const { request, buildUrl } = require("../http");
const { FeatureDisabledError, NotFoundError } = require("../errors");
const { getEnv } = require("../../config/env");

const BASE = "https://api.rawg.io/api";
const DAY = 24 * 60 * 60 * 1000;
const ATTRIBUTION = "Données : RAWG (rawg.io)";

function apiKey() {
  return getEnv().RAWG_API_KEY;
}

function requireKey() {
  const key = apiKey();
  if (!key) throw new FeatureDisabledError("RAWG", "RAWG_API_KEY");
  return key;
}

function mapGame(game) {
  return {
    id: game.id,
    slug: game.slug,
    name: game.name,
    released: game.released,
    rating: game.rating,
    metacritic: game.metacritic,
    image: game.background_image,
    genres: (game.genres || []).map((genre) => genre.name),
    platforms: (game.platforms || []).slice(0, 6).map((entry) => entry.platform.name),
    description: game.description_raw?.slice(0, 400),
    website: game.website,
    attribution: ATTRIBUTION,
  };
}

async function searchGame(name, { limit = 5 } = {}) {
  const key = requireKey();
  const data = await request(buildUrl(`${BASE}/games`, { key, search: name, page_size: limit }), {
    cacheTtlMs: DAY,
    retries: 1,
  });
  const results = (data?.results || []).map(mapGame);
  if (!results.length) throw new NotFoundError(`Aucun jeu RAWG ne correspond à « ${name} ».`);
  return results;
}

async function getGameBySlug(slug) {
  const key = requireKey();
  try {
    const data = await request(buildUrl(`${BASE}/games/${encodeURIComponent(slug)}`, { key }), { cacheTtlMs: DAY });
    return mapGame(data);
  } catch (error) {
    if (error.status === 404) throw new NotFoundError("Jeu introuvable dans RAWG.");
    throw error;
  }
}

/** Recherche le jeu du catalogue le plus proche dans RAWG. */
async function getForCatalogGame(game) {
  const results = await searchGame(game.search || game.name, { limit: 3 });
  return results[0];
}

module.exports = { searchGame, getGameBySlug, getForCatalogGame, mapGame, ATTRIBUTION, BASE };

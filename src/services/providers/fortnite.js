const { request, buildUrl } = require("../http");
const { FeatureDisabledError, HttpError, NotFoundError } = require("../errors");
const { getEnv } = require("../../config/env");

const BASE = "https://fortnite-api.com/v2";
const THIRTY_MIN = 30 * 60 * 1000;

async function getShop() {
  const data = await request(buildUrl(`${BASE}/shop`, { language: "fr" }), { cacheTtlMs: THIRTY_MIN });
  const entries = (data?.data?.entries || []).map((entry) => {
    const item = entry.items?.[0];
    const track = entry.tracks?.[0];
    const bundle = entry.bundle;
    return {
      name: bundle?.name || track?.title || item?.name || entry.devName || "Objet",
      description: item?.description || (track ? `${track.artist} · ${track.releaseYear}` : ""),
      price: entry.finalPrice,
      regularPrice: entry.regularPrice,
      image: bundle?.image || item?.images?.icon || track?.albumArt || null,
      rarity: item?.rarity?.name || "—",
      kind: bundle ? "Pack" : track ? "Musique" : item?.type?.name || "Objet",
      giftable: entry.giftable,
    };
  });

  return {
    date: data?.data?.date,
    vbuckIcon: data?.data?.vbuckIcon,
    entries: entries.filter((entry) => entry.image).slice(0, 10),
    total: entries.length,
  };
}

async function getNews(mode = "br") {
  const path = ["br", "stw", "creative"].includes(mode) ? `/news/${mode}` : "/news";
  const data = await request(buildUrl(`${BASE}${path}`, { language: "fr" }), { cacheTtlMs: THIRTY_MIN });
  const motds = data?.data?.motds || [];
  if (!motds.length) throw new NotFoundError("Aucune actualité disponible pour ce mode.");

  return {
    image: data.data.image,
    date: data.data.date,
    articles: motds.slice(0, 5).map((article) => ({
      title: article.title,
      body: article.body?.replace(/\s+/g, " ").trim(),
      image: article.image || article.tileImage,
    })),
  };
}

/**
 * Normalise une valeur de stats : l'API renvoie soit un nombre brut
 * (format actuel), soit `{ value: number }` (ancien format).
 */
function statValue(value) {
  if (typeof value === "number" || typeof value === "string") return value;
  if (value && typeof value === "object" && "value" in value) return value.value;
  return 0;
}

/**
 * Extrait le mode "global" d'une réponse fortnite-api.com.
 * Structure actuelle : `data.data.stats.all.overall` (clés `matches`, `lastModified`).
 * Ancienne structure : première entrée de `data.data.stats` (clés `matchesPlayed`).
 */
function extractOverall(payload) {
  const stats = payload?.data?.stats || {};
  const all = stats.all || Object.values(stats)[0] || {};
  return all.overall || all;
}

/**
 * Statistiques Battle Royale — nécessite FORTNITE_API_KEY.
 * `timeWindow` : "season" (par défaut) ou "lifetime".
 * Si le joueur n'a pas encore joué cette saison, on replie automatiquement sur
 * ses statistiques lifetime pour éviter un 404 opaque.
 */
async function getStats(name, accountType = "epic", timeWindow = "season") {
  const apiKey = getEnv().FORTNITE_API_KEY;
  if (!apiKey) throw new FeatureDisabledError("Les statistiques Fortnite", "FORTNITE_API_KEY");

  const window = ["season", "lifetime"].includes(timeWindow) ? timeWindow : "season";

  async function fetchStats(requestedWindow) {
    return request(buildUrl(`${BASE}/stats/br/v2`, { name, accountType, timeWindow: requestedWindow }), {
      headers: { Authorization: apiKey },
      cacheTtlMs: 15 * 60 * 1000,
    });
  }

  let data;
  let usedWindow = window;
  try {
    data = await fetchStats(window);
  } catch (error) {
    const body = typeof error.body === "string" ? error.body : JSON.stringify(error.body || "");
    const noSeasonMatch =
      window === "season" &&
      error instanceof HttpError &&
      error.status === 404 &&
      /didn'?t play any match yet/i.test(body);
    if (!noSeasonMatch) throw error;
    usedWindow = "lifetime";
    data = await fetchStats("lifetime");
  }

  if (data?.status !== 200) throw new NotFoundError(`Aucune statistique pour « ${name} ».`);

  const overall = extractOverall(data);
  return {
    name: data.data?.account?.name || data.data?.name || name,
    level: data.data?.battlePass?.level ?? data.data?.level,
    image: data.data?.image || data.data?.account?.image,
    window: usedWindow,
    fallback: usedWindow !== window,
    wins: Number(statValue(overall?.wins)) || 0,
    kills: Number(statValue(overall?.kills)) || 0,
    matches: Number(statValue(overall?.matches ?? overall?.matchesPlayed)) || 0,
    kd: Number(statValue(overall?.kd)) || 0,
    winRate: Number(statValue(overall?.winRate)) || 0,
    updated: overall?.lastModified || data.data?.stats?.updated,
  };
}

module.exports = { getShop, getNews, getStats, BASE };

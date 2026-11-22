const { request, buildUrl } = require("../http");
const { FeatureDisabledError, NotFoundError } = require("../errors");
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

/** Statistiques Battle Royale — nécessite FORTNITE_API_KEY. */
async function getStats(name, accountType = "epic", timeWindow = "season") {
  const apiKey = getEnv().FORTNITE_API_KEY;
  if (!apiKey) throw new FeatureDisabledError("Les statistiques Fortnite", "FORTNITE_API_KEY");

  const data = await request(
    buildUrl(`${BASE}/stats/br/v2`, { name, accountType, timeWindow }),
    { headers: { Authorization: apiKey }, cacheTtlMs: 15 * 60 * 1000 }
  );

  if (data?.status !== 200) throw new NotFoundError(`Aucune statistique pour « ${name} ».`);

  const stats = data.data?.stats || {};
  const firstMode = Object.values(stats)[0] || {};
  return {
    name: data.data?.name || name,
    level: data.data?.level,
    image: data.data?.image,
    wins: firstMode?.wins?.value ?? 0,
    kills: firstMode?.kills?.value ?? 0,
    matches: firstMode?.matchesPlayed?.value ?? 0,
    kd: firstMode?.kd?.value ?? 0,
    winRate: firstMode?.winRate?.value ?? 0,
    updated: data.data?.stats?.updated,
  };
}

module.exports = { getShop, getNews, getStats, BASE };

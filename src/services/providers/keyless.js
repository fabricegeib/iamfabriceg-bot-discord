const { request, buildUrl } = require("../http");
const { NotFoundError } = require("../errors");

const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;

/** FreeToGame — jeux gratuits, aucune clé requise. */
async function freeToGame({ platform = "all", category = "" } = {}) {
  const data = await request(buildUrl("https://www.freetogame.com/api/games", { platform, category }), {
    cacheTtlMs: DAY,
    retries: 1,
  });
  if (!Array.isArray(data) || !data.length) throw new NotFoundError("Aucun jeu gratuit trouvé.");
  return data.slice(0, 10).map((game) => ({
    id: game.id,
    title: game.title,
    genre: game.genre,
    platform: game.platform,
    image: game.thumbnail,
    url: game.game_url,
    description: game.short_description,
  }));
}

/** GamerPower — giveaways, aucune clé requise. */
async function giveaways({ platform = "all", limit = 6 } = {}) {
  const data = await request(buildUrl("https://www.gamerpower.com/api/giveaways", { platform, "sort-by": "date" }), {
    cacheTtlMs: HOUR,
    retries: 1,
  });
  if (!Array.isArray(data) || !data.length) throw new NotFoundError("Aucun giveaway en cours.");
  return data.slice(0, limit).map((item) => ({
    title: item.title,
    description: item.description,
    image: item.image,
    url: item.gamerpower_url,
    worth: item.worth,
    expires: item.expiration_date,
    platform: item.platforms,
  }));
}

/** CheapShark — meilleures offres Steam, aucune clé requise. */
async function cheapSharkDeals({ storeId = 1, upperPrice = 30, limit = 8 } = {}) {
  const data = await request(
    buildUrl("https://www.cheapshark.com/api/1.0/deals", {
      storeID: storeId,
      upperPrice,
      pageSize: limit,
      sortBy: "Metacritic",
      AAA: 1,
    }),
    { cacheTtlMs: HOUR, retries: 1 }
  );
  if (!Array.isArray(data) || !data.length) throw new NotFoundError("Aucune offre disponible.");
  return data.map((deal) => ({
    title: deal.title,
    salePrice: Number(deal.salePrice),
    normalPrice: Number(deal.normalPrice),
    discount: Math.round(Number(deal.savings)),
    rating: deal.steamRatingText,
    image: `https://cdn.cloudflare.steamstatic.com/steam/apps/${deal.steamAppID}/header.jpg`,
    url: `https://www.cheapshark.com/redirect?dealID=${deal.dealID}`,
  }));
}

/** Speedrun.com — records de jeux, aucune clé requise. */
async function speedrunGame(name) {
  const data = await request(buildUrl("https://www.speedrun.com/api/v1/games", { name }), {
    cacheTtlMs: DAY,
    retries: 1,
  });
  const game = data?.data?.[0];
  if (!game) throw new NotFoundError(`Aucun speedrun trouvé pour « ${name} ».`);
  return {
    name: game.names?.international,
    japanese: game.names?.japanese,
    abbreviation: game.abbreviation,
    url: game.web_link,
    image: game.assets?.["cover-large"]?.uri,
    releaseDate: game["release-date"],
  };
}

/** Open Trivia DB — questions de quiz, aucune clé requise. */
async function trivia({ amount = 5, category, difficulty } = {}) {
  const data = await request(
    buildUrl("https://opentdb.com/api.php", { amount, category, difficulty, type: "boolean" }),
    { cacheTtlMs: 0, retries: 1 }
  );
  if (data?.response_code !== 0 || !data?.results?.length) throw new NotFoundError("Aucune question disponible.");
  return data.results.map((item) => ({
    category: item.category,
    difficulty: item.difficulty,
    question: decode(item.question),
    answer: decode(item.correct_answer),
  }));
}

function decode(value) {
  return String(value)
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&eacute;/g, "é");
}

module.exports = { freeToGame, giveaways, cheapSharkDeals, speedrunGame, trivia, decode };

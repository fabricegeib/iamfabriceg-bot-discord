const { request, buildUrl } = require("../http");
const { FeatureDisabledError, NotFoundError } = require("../errors");
const { getEnv } = require("../../config/env");

const BASE = "https://api.steampowered.com";
const HOUR = 60 * 60 * 1000;
const DAY = 24 * 60 * 60 * 1000;

function requireKey() {
  const key = getEnv().STEAM_API_KEY;
  if (!key) throw new FeatureDisabledError("Steam", "STEAM_API_KEY");
  return key;
}

const isSteamId = (value) => /^\d{17}$/.test(value);

async function resolveVanityURL(vanity) {
  const data = await request(
    buildUrl(`${BASE}/ISteamUser/ResolveVanityURL/v1/`, { key: requireKey(), vanityurl: vanity }),
    { cacheTtlMs: DAY, retries: 1 }
  );
  if (data?.response?.success !== 1) throw new NotFoundError(`Profil Steam « ${vanity} » introuvable.`);
  return data.response.steamid;
}

async function getPlayerSummary(identifier) {
  const key = requireKey();
  const steamId = isSteamId(identifier) ? identifier : await resolveVanityURL(identifier);
  const data = await request(buildUrl(`${BASE}/ISteamUser/GetPlayerSummaries/v2/`, { key, steamids: steamId }), {
    cacheTtlMs: HOUR,
    retries: 1,
  });
  const player = data?.response?.players?.[0];
  if (!player) throw new NotFoundError("Profil Steam introuvable.");

  return {
    steamId: player.steamid,
    name: player.personaname,
    profileUrl: player.profileurl,
    avatar: player.avatarfull,
    status: player.personastate === 0 ? "Hors ligne" : player.personastate === 1 ? "En ligne" : "Occupé",
    country: player.loccountrycode,
    createdAt: player.timecreated ? new Date(player.timecreated * 1000).toISOString() : null,
  };
}

async function getOwnedGames(identifier, { limit = 8 } = {}) {
  const key = requireKey();
  const steamId = isSteamId(identifier) ? identifier : await resolveVanityURL(identifier);
  const data = await request(
    buildUrl(`${BASE}/IPlayerService/GetOwnedGames/v1/`, {
      key,
      steamid: steamId,
      include_appinfo: 1,
      include_played_free_games: 1,
    }),
    { cacheTtlMs: HOUR, retries: 1 }
  );
  const games = data?.response?.games || [];
  return {
    count: data?.response?.game_count ?? games.length,
    games: games
      .slice()
      .sort((a, b) => b.playtime_forever - a.playtime_forever)
      .slice(0, limit)
      .map((game) => ({
        name: game.name,
        appId: game.appid,
        image: `https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appid}/header.jpg`,
        hours: Math.round(game.playtime_forever / 60),
        url: `https://store.steampowered.com/app/${game.appid}/`,
      })),
  };
}

module.exports = { getPlayerSummary, getOwnedGames, resolveVanityURL, isSteamId, BASE };

const { request } = require("../http");
const { FeatureDisabledError, NotFoundError } = require("../errors");
const { getEnv } = require("../../config/env");

const TEN_MIN = 10 * 60 * 1000;
const REGIONS = ["euw1", "eun1", "na1", "na2", "br1", "jp1", "kr", "la1", "la2", "oc1", "tr1", "ru", "pbe1"];

function normalizeRegion(region) {
  const value = String(region || "euw1").toLowerCase().replace(/^https?:\/\//, "").replace(/\.api\.riotgames\.com.*$/, "");
  return REGIONS.includes(value) ? value : "euw1";
}

function requireKey() {
  const key = getEnv().RIOT_API_KEY;
  if (!key) throw new FeatureDisabledError("Riot", "RIOT_API_KEY");
  return key;
}

async function getSummoner(name, region = "euw1") {
  const key = requireKey();
  const platform = normalizeRegion(region);
  try {
    const data = await request(
      `https://${platform}.api.riotgames.com/lol/summoner/v4/summoners/by-name/${encodeURIComponent(name)}`,
      { headers: { "X-Riot-Token": key }, cacheTtlMs: TEN_MIN, retries: 1 }
    );
    return { id: data.id, accountId: data.accountId, puuid: data.puuid, name: data.name, level: data.summonerLevel, region: platform };
  } catch (error) {
    if (error.status === 404) throw new NotFoundError(`Invocateur « ${name} » introuvable sur ${platform}.`);
    throw error;
  }
}

async function getLeague(summonerId, region = "euw1") {
  const key = requireKey();
  const platform = normalizeRegion(region);
  const data = await request(
    `https://${platform}.api.riotgames.com/lol/league/v4/entries/by-summoner/${encodeURIComponent(summonerId)}`,
    { headers: { "X-Riot-Token": key }, cacheTtlMs: TEN_MIN, retries: 1 }
  );

  const ranked = (data || []).find((entry) => entry.queueType === "RANKED_SOLO_5x5") || data?.[0];
  if (!ranked) return null;
  return {
    queue: ranked.queueType,
    tier: ranked.tier,
    rank: ranked.rank,
    lp: ranked.leaguePoints,
    wins: ranked.wins,
    losses: ranked.losses,
    rate: Math.round((ranked.wins / (ranked.wins + ranked.losses || 1)) * 100),
  };
}

/** Profil complet : identité + classement solo/duo. */
async function getProfile(name, region = "euw1") {
  const summoner = await getSummoner(name, region);
  const league = await getLeague(summoner.id, summoner.region);
  return { ...summoner, league };
}

module.exports = { getSummoner, getLeague, getProfile, normalizeRegion, REGIONS };

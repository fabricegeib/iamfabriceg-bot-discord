const { request, buildUrl } = require("../http");
const { Cache } = require("../cache");
const { FeatureDisabledError, NotFoundError } = require("../errors");
const { getEnv } = require("../../config/env");

const tokenCache = new Cache();
const HELIX = "https://api.twitch.tv/helix";

function credentials() {
  const env = getEnv();
  if (!env.TWITCH_CLIENT_ID || !env.TWITCH_CLIENT_SECRET) {
    throw new FeatureDisabledError("Twitch", "TWITCH_CLIENT_ID/TWITCH_CLIENT_SECRET");
  }
  return { clientId: env.TWITCH_CLIENT_ID, clientSecret: env.TWITCH_CLIENT_SECRET };
}

async function getAppToken() {
  const { clientId, clientSecret } = credentials();
  return tokenCache.getOrSet("twitch:app-token", 50 * 60 * 1000, async () => {
    const data = await request(
      buildUrl("https://id.twitch.tv/oauth2/token", {
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "client_credentials",
      }),
      { method: "POST", retries: 1 }
    );
    if (!data?.access_token) throw new Error("Impossible d'obtenir le token Twitch.");
    return data.access_token;
  });
}

async function helix(pathOrUrl, params = {}) {
  const { clientId } = credentials();
  const token = await getAppToken();
  const url = pathOrUrl.startsWith("http") ? pathOrUrl : buildUrl(`${HELIX}${pathOrUrl}`, params);
  return request(url, {
    headers: { "Client-ID": clientId, Authorization: `Bearer ${token}` },
    cacheTtlMs: 60_000,
    retries: 1,
  });
}

async function getUsers(logins = []) {
  const params = new URLSearchParams();
  for (const login of logins) params.append("login", login);
  const data = await helix(`${HELIX}/users?${params.toString()}`);
  return data?.data || [];
}

async function getStream(channel) {
  const users = await getUsers([channel]);
  if (!users.length) throw new NotFoundError(`Chaîne Twitch « ${channel} » introuvable.`);
  const user = users[0];
  const data = await helix("/streams", { user_id: user.id });
  return { user, stream: data?.data?.[0] || null };
}

async function getChannelStatus(channel) {
  const { user, stream } = await getStream(channel);
  return {
    login: user.login,
    displayName: user.display_name,
    avatar: user.profile_image_url,
    live: Boolean(stream),
    title: stream?.title,
    game: stream?.game_name,
    viewers: stream?.viewer_count,
    startedAt: stream?.started_at,
    thumbnail: stream?.thumbnail_url?.replace("{width}", "1280").replace("{height}", "720"),
    url: `https://twitch.tv/${user.login}`,
  };
}

async function createSubscription(type, condition, callbackUrl) {
  const { clientId } = credentials();
  const token = await getAppToken();
  const data = await request(`${HELIX}/eventsub/subscriptions`, {
    method: "POST",
    headers: { "Client-ID": clientId, Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ type, version: "1", condition, transport: { method: "webhook", callback: callbackUrl } }),
    cacheTtlMs: 0,
    retries: 0,
  });
  return data?.data?.[0];
}

async function listSubscriptions() {
  const data = await helix("/eventsub/subscriptions");
  return data?.data || [];
}

async function deleteSubscription(id) {
  const { clientId } = credentials();
  const token = await getAppToken();
  await request(`${HELIX}/eventsub/subscriptions?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { "Client-ID": clientId, Authorization: `Bearer ${token}` },
    cacheTtlMs: 0,
    retries: 0,
  });
}

module.exports = {
  getAppToken,
  getUsers,
  getStream,
  getChannelStatus,
  createSubscription,
  listSubscriptions,
  deleteSubscription,
  HELIX,
};

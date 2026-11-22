const { getEnv } = require("../../config/env");

const pokeapi = require("./pokeapi");
const fortnite = require("./fortnite");
const rawg = require("./rawg");
const riot = require("./riot");
const steam = require("./steam");
const twitch = require("./twitch");
const keyless = require("./keyless");

/** État des intégrations pour la commande /status. */
function status() {
  const env = getEnv();
  return [
    { name: "PokéAPI", enabled: true, key: false },
    { name: "Fortnite (boutique / news)", enabled: true, key: false },
    { name: "Fortnite (stats)", enabled: Boolean(env.FORTNITE_API_KEY), key: true },
    { name: "Fortnite (STW héros)", enabled: true, key: false },
    { name: "RAWG", enabled: Boolean(env.RAWG_API_KEY), key: true },
    { name: "Riot", enabled: Boolean(env.RIOT_API_KEY), key: true },
    { name: "Steam", enabled: Boolean(env.STEAM_API_KEY), key: true },
    { name: "Twitch", enabled: Boolean(env.TWITCH_CLIENT_ID && env.TWITCH_CLIENT_SECRET), key: true },
    { name: "APIs sans clé", enabled: true, key: false },
    { name: "Payload CMS", enabled: Boolean(env.PAYLOAD_URL && env.PAYLOAD_API_KEY), key: true },
  ];
}

module.exports = { pokeapi, fortnite, rawg, riot, steam, twitch, keyless, status };

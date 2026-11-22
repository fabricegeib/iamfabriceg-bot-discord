/**
 * Catalogue unique des 17 jeux du serveur.
 * Source de vérité pour /games, les boutons de rôles et les providers.
 * Les IDs de rôles nouveaux sont résolus depuis l'environnement à l'exécution.
 */

const games = [
  {
    key: "among-us",
    name: "Among Us",
    category: "Multijoueur",
    emoji: "🔪",
    color: 0xef4444,
    roleId: null,
    search: "Among Us",
    steamAppId: 945360,
    links: { site: "https://www.innersloth.com/games/among-us/" },
  },
  {
    key: "brawlhalla",
    name: "Brawlhalla",
    category: "Combat",
    emoji: "🥊",
    color: 0x38bdf8,
    roleId: null,
    search: "Brawlhalla",
    steamAppId: 291550,
    links: { site: "https://www.brawlhalla.com/" },
  },
  {
    key: "fall-guys",
    name: "Fall Guys",
    category: "Course",
    emoji: "🫘",
    color: 0xf472b6,
    roleId: null,
    search: "Fall Guys",
    steamAppId: 1097150,
    links: { site: "https://www.fallguys.com/" },
  },
  {
    key: "ea-fc",
    name: "EA Sports FC (FIFA)",
    aliases: ["fifa", "ea fc"],
    category: "Sport",
    emoji: "⚽",
    color: 0x22c55e,
    roleId: null,
    search: "EA Sports FC",
    steamAppId: 2669320,
    links: { site: "https://www.ea.com/games/ea-sports-fc" },
  },
  {
    key: "fortnite",
    name: "Fortnite",
    category: "Battle Royale",
    emoji: "🎮",
    color: 0x8b5cf6,
    roleId: "722561307903262831",
    search: "Fortnite",
    epic: true,
    links: { site: "https://www.fortnite.com/", api: "https://fortnite-api.com/" },
  },
  {
    key: "forza-horizon-4",
    name: "Forza Horizon 4",
    category: "Course",
    emoji: "🏎️",
    color: 0x0ea5e9,
    roleId: null,
    search: "Forza Horizon 4",
    links: { site: "https://forza.net/horizon" },
  },
  {
    key: "gta-v",
    name: "Grand Theft Auto V",
    aliases: ["gta", "gta5"],
    category: "Action",
    emoji: "🚗",
    color: 0xf59e0b,
    roleId: "722565846383329282",
    search: "Grand Theft Auto V",
    steamAppId: 271590,
    links: { site: "https://www.rockstargames.com/grandtheftauto-v" },
  },
  {
    key: "league-of-legends",
    name: "League of Legends",
    aliases: ["lol"],
    category: "MOBA",
    emoji: "⚔️",
    color: 0x1d4ed8,
    roleId: null,
    search: "League of Legends",
    riot: true,
    links: { site: "https://www.leagueoflegends.com/" },
  },
  {
    key: "pokemon",
    name: "Pokémon",
    category: "RPG",
    emoji: "🔴",
    color: 0xdc2626,
    roleId: null,
    search: "Pokemon",
    links: { site: "https://www.pokemon.com/", api: "https://pokeapi.co/" },
  },
  {
    key: "prominence-poker",
    name: "Prominence Poker",
    category: "Cartes",
    emoji: "🃏",
    color: 0x64748b,
    roleId: null,
    search: "Prominence Poker",
    steamAppId: 446240,
    links: { site: "https://www.prominencepoker.com/" },
  },
  {
    key: "rainbow-six-siege",
    name: "Rainbow Six Siege",
    aliases: ["r6", "siege"],
    category: "Tir tactique",
    emoji: "🎯",
    color: 0x0f172a,
    roleId: null,
    search: "Rainbow Six Siege",
    steamAppId: 359550,
    links: { site: "https://www.ubisoft.com/game/rainbow-six/siege" },
  },
  {
    key: "red-dead-redemption-2",
    name: "Red Dead Redemption 2",
    aliases: ["rdr2"],
    category: "Action",
    emoji: "🤠",
    color: 0xb45309,
    roleId: null,
    search: "Red Dead Redemption 2",
    steamAppId: 1174180,
    links: { site: "https://www.rockstargames.com/reddeadredemption2" },
  },
  {
    key: "rocket-league",
    name: "Rocket League",
    category: "Sport",
    emoji: "🚀",
    color: 0x0284c7,
    roleId: "802663319634575362",
    search: "Rocket League",
    steamAppId: 252950,
    links: { site: "https://www.rocketleague.com/" },
  },
  {
    key: "teamfight-tactics",
    name: "Teamfight Tactics",
    aliases: ["tft"],
    category: "Stratégie",
    emoji: "♟️",
    color: 0x7c3aed,
    roleId: null,
    search: "Teamfight Tactics",
    riot: true,
    links: { site: "https://teamfighttactics.leagueoflegends.com/" },
  },
  {
    key: "valorant",
    name: "Valorant",
    category: "Tir tactique",
    emoji: "🎯",
    color: 0xff4655,
    roleId: null,
    search: "Valorant",
    riot: true,
    links: { site: "https://playvalorant.com/" },
  },
  {
    key: "aniimo",
    name: "Aniimo",
    category: "ARPG",
    emoji: "🐾",
    color: 0xf43f5e,
    roleEnv: "ROLE_ANIIMO_ID",
    roleId: null,
    search: "Aniimo",
    steamAppId: 4126040,
    added: "2026",
    links: { site: "https://www.aniimo.com/", steam: "https://store.steampowered.com/app/4126040/Aniimo/" },
  },
  {
    key: "goals",
    name: "GOALS",
    category: "Football",
    emoji: "⚽",
    color: 0x16a34a,
    roleEnv: "ROLE_GOALS_ID",
    roleId: null,
    search: "GOALS",
    added: "2026",
    links: { site: "https://www.playgoals.com/" },
  },
];

const byKey = new Map(games.map((game) => [game.key, game]));

/** Résout un jeu depuis sa clé, son nom ou un alias (insensible à la casse). */
function findGame(query) {
  if (!query) return undefined;
  const normalized = String(query)
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  return games.find((game) => {
    const candidates = [game.key, game.name, ...(game.aliases || [])];
    return candidates.some((candidate) => {
      const value = candidate
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      return value === normalized || normalized.includes(value) || value.includes(normalized);
    });
  });
}

/** Résolve l'ID de rôle d'un jeu, y compris via les variables d'environnement. */
function roleIdFor(game, env = process.env) {
  if (game.roleId) return game.roleId;
  if (game.roleEnv) return env[game.roleEnv] || null;
  return null;
}

/** Liste des jeux ayant un rôle Discord configuré. */
function gamesWithRoles(env = process.env) {
  return games.filter((game) => Boolean(roleIdFor(game, env)));
}

module.exports = { games, byKey, findGame, roleIdFor, gamesWithRoles };

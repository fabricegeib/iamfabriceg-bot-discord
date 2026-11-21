require("dotenv").config();
const { z } = require("zod");

const optional = (fallback = "") => z.string().trim().optional().default(fallback);

const schema = z.object({
  DISCORD_TOKEN: z.string().trim().min(1, "DISCORD_TOKEN est requis"),
  CLIENT_ID: z.string().trim().min(1, "CLIENT_ID est requis"),
  GUILD_ID: z.string().trim().min(1, "GUILD_ID est requis"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  WEBHOOK_SECRET: optional(),
  PUBLIC_URL: optional(),
  FORTNITE_API_KEY: optional(),
  RAWG_API_KEY: optional(),
  RIOT_API_KEY: optional(),
  STEAM_API_KEY: optional(),
  TWITCH_CLIENT_ID: optional(),
  TWITCH_CLIENT_SECRET: optional(),
  PAYLOAD_URL: optional(),
  PAYLOAD_AUTH_SLUG: optional("users"),
  PAYLOAD_GAMES_SLUG: optional("games"),
  PAYLOAD_API_KEY: optional(),
  ROLES_CHANNEL_ID: optional("652684137957818378"),
  LOG_CHANNEL_ID: optional(),
  ANNOUNCEMENT_CHANNEL_ID: optional(),
  ROLE_ANIIMO_ID: optional(),
  ROLE_GOALS_ID: optional(),
});

let cached;

/**
 * Valide et retourne la configuration. La validation est paresseuse afin que
 * les modules purement logiques puissent être importés dans les tests sans .env.
 */
function getEnv() {
  if (cached) return cached;

  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => `  - ${issue.path.join(".") || "racine"} : ${issue.message}`);
    throw new Error(`Configuration .env invalide :\n${details.join("\n")}`);
  }

  cached = parsed.data;
  return cached;
}

function has(name) {
  return Boolean(getEnv()[name]);
}

function resetEnv() {
  cached = undefined;
}

module.exports = { getEnv, has, resetEnv, schema };

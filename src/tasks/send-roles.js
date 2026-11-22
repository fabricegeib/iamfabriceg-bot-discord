const { ActionRowBuilder, ButtonBuilder, ButtonStyle, Client, Events, GatewayIntentBits } = require("discord.js");
const { getEnv } = require("../config/env");
const { gamesWithRoles, roleIdFor } = require("../config/games");
const { createLogger, setLevel } = require("../services/logger");

const log = createLogger("roles");

async function main() {
  const env = getEnv();
  setLevel(env.LOG_LEVEL);

  const client = new Client({ intents: [GatewayIntentBits.Guilds] });
  const games = gamesWithRoles(env);

  if (!games.length) {
    log.warn("Aucun rôle de jeu configuré (vérifiez .env et src/config/games.js).");
    return;
  }

  const rows = [];
  for (let index = 0; index < games.length; index += 5) {
    const row = new ActionRowBuilder();
    for (const game of games.slice(index, index + 5)) {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`role:${roleIdFor(game, env)}`)
          .setLabel(game.name)
          .setStyle(ButtonStyle.Primary)
          .setEmoji(game.emoji)
      );
    }
    rows.push(row);
  }

  client.once(Events.ClientReady, async (readyClient) => {
    try {
      const channel = await readyClient.channels.fetch(env.ROLES_CHANNEL_ID);
      if (!channel?.isTextBased()) throw new Error("Salon introuvable ou non textuel.");
      await channel.send({
        content: "🎮 Cliquez sur un bouton pour obtenir ou retirer un rôle de jeu :",
        components: rows,
      });
      log.info(`Message de rôles envoyé avec ${games.length} bouton(s).`);
    } catch (error) {
      log.error("Envoi du message de rôles impossible", error);
      process.exitCode = 1;
    } finally {
      await client.destroy();
    }
  });

  await client.login(env.DISCORD_TOKEN);
}

main().catch((error) => {
  log.error("Échec de l'envoi des rôles", error);
  process.exit(1);
});

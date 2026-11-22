const { Events } = require("discord.js");
const commandHandler = require("../../handlers/commandHandler");
const buttonHandler = require("../../handlers/buttonHandler");
const selectMenuHandler = require("../../handlers/selectMenuHandler");
const { trackUsage } = require("../../services/analytics");

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    if (interaction.isChatInputCommand()) return commandHandler(interaction);
    if (interaction.isButton()) return buttonHandler(interaction);
    if (interaction.isStringSelectMenu()) return selectMenuHandler(interaction);
    if (interaction.isAutocomplete()) {
      const command = interaction.client.commands.get(interaction.commandName);
      // Les autocomplétions sont très fréquentes : on ne retient qu'un
      // échantillon des succès, mais toutes les erreurs.
      const record = (outcome, extra = {}) => {
        if (outcome === "success" && Math.random() >= 0.1) return;
        trackUsage({
          commandName: interaction.commandName,
          userId: interaction.user?.id,
          guildId: interaction.guildId || undefined,
          channelId: interaction.channelId || undefined,
          source: "autocomplete",
          outcome,
          ...extra,
        });
      };
      if (!command?.autocomplete) {
        record("error", { errorType: "noAutocomplete" });
        return interaction.respond([]);
      }
      return Promise.resolve(command.autocomplete(interaction))
        .then(() => record("success"))
        .catch((error) => {
          record("error", { errorType: "autocomplete" });
          console.error("Erreur d'autocomplétion :", error);
          return interaction.respond([]).catch(() => undefined);
        });
    }
    return undefined;
  },
};

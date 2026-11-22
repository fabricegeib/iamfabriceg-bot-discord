const { Events } = require("discord.js");
const commandHandler = require("../../handlers/commandHandler");
const buttonHandler = require("../../handlers/buttonHandler");
const selectMenuHandler = require("../../handlers/selectMenuHandler");

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    if (interaction.isChatInputCommand()) return commandHandler(interaction);
    if (interaction.isButton()) return buttonHandler(interaction);
    if (interaction.isStringSelectMenu()) return selectMenuHandler(interaction);
    if (interaction.isAutocomplete()) {
      const command = interaction.client.commands.get(interaction.commandName);
      if (!command?.autocomplete) return interaction.respond([]);
      return Promise.resolve(command.autocomplete(interaction)).catch((error) => {
        console.error("Erreur d'autocomplétion :", error);
        return interaction.respond([]).catch(() => undefined);
      });
    }
    return undefined;
  },
};

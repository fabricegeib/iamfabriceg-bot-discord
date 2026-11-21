const { Events } = require("discord.js");
const commandHandler = require("../../handlers/commandHandler");
const selectMenuHandler = require("../../handlers/selectMenuHandler");

module.exports = {
	name: Events.InteractionCreate,
	async execute(interaction) {
		if (interaction.isChatInputCommand()) {
			await commandHandler(interaction);
		}

		if (interaction.isStringSelectMenu()) {
			await selectMenuHandler(interaction);
		}
	},
};
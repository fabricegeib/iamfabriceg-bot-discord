const { Events } = require("discord.js");

module.exports = {
	name: Events.InteractionCreate,
	async execute(interaction) {
		if (!interaction.isChatInputCommand()) return;

		const command = interaction.client.commands.get(interaction.commandName);

		if (!command) {
			console.error(`❌ Commande ${interaction.commandName} introuvable.`);
			return;
		}

		try {
			await command.execute(interaction);
			console.log(`✅ ${interaction.user.tag} a utilisé /${interaction.commandName}`);
		} catch (error) {
			console.error(`❌ Erreur lors de l'exécution de ${interaction.commandName}:`, error);

			const errorMessage = {
				content: 'Une erreur est survenue lors de l\'exécution de cette commande!',
				ephemeral: true
			};

			if (interaction.replied || interaction.deferred) {
				await interaction.followUp(errorMessage);
			} else {
				await interaction.reply(errorMessage);
			}
		}
	},
};
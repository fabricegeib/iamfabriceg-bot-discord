module.exports = async (interaction) => {
	const command = interaction.client.commands.get(interaction.commandName);

	if (!command) {
		console.error(`❌ Commande ${interaction.commandName} introuvable.`);
		return;
	}

	try {
		await command.execute(interaction);
		console.log(`✅ ${interaction.user.tag} a utilisé /${interaction.commandName}`);
	} catch (error) {
		console.error(`❌ Erreur:`, error);
		// ... gestion erreur
	}
};
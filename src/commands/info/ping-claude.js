const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('ping-claude')
		.setDescription('Répond avec Pong!'),

	async execute(interaction) {
		const sent = await interaction.reply({
			content: '🏓 Pong!',
			fetchReply: true
		});

		const latency = sent.createdTimestamp - interaction.createdTimestamp;
		await interaction.editReply(`🏓 Pong! Latence: ${latency}ms | API: ${Math.round(interaction.client.ws.ping)}ms`);
	},
};
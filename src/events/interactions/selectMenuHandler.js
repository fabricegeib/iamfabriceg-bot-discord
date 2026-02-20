const { Events } = require("discord.js");

module.exports = {
	name: Events.InteractionCreate,
	async execute(interaction) {
		if (!interaction.isStringSelectMenu()) return;

		// Gérer le menu de sélection des Pokémon
		if (interaction.customId === 'starter') {
			const selected = interaction.values[0];

			const pokemonData = {
				bulbasaur: {
					name: 'Bulbasaur',
					emoji: '🌱',
					type: 'Grass/Poison',
					number: '001',
					description: 'A strange seed was planted on its back at birth. The plant sprouts and grows with this Pokémon.'
				},
				charmander: {
					name: 'Charmander',
					emoji: '🔥',
					type: 'Fire',
					number: '004',
					description: 'Obviously prefers hot places. When it rains, steam is said to spout from the tip of its tail.'
				},
				squirtle: {
					name: 'Squirtle',
					emoji: '💧',
					type: 'Water',
					number: '007',
					description: 'After birth, its back swells and hardens into a shell. Powerfully sprays foam from its mouth.'
				}
			};

			const pokemon = pokemonData[selected];

			await interaction.reply({
				content: `${pokemon.emoji} **${pokemon.name}** #${pokemon.number}\n**Type:** ${pokemon.type}\n\n*${pokemon.description}*`,
				ephemeral: true
			});
		}
	},
};
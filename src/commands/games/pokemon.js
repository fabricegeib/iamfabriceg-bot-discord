const {
  ActionRowBuilder,
  EmbedBuilder,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} = require("discord.js");
const { pokeapi } = require("../../services/providers");
const { pokemonEmbed } = require("../../handlers/selectMenuHandler");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("pokemon")
    .setDescription("Informations sur un Pokémon")
    .setDescriptionLocalizations({ fr: "Informations sur un Pokémon" })
    .addStringOption((option) =>
      option
        .setName("nom")
        .setDescription("Nom ou numéro du Pokémon (aléatoire si omis)")
        .setDescriptionLocalizations({ fr: "Nom ou numéro du Pokémon (aléatoire si omis)" })
    ),

  cooldown: 2000,

  async execute(interaction) {
    await interaction.deferReply();
    const query = interaction.options.getString("nom");
    const pokemon = query ? await pokeapi.getPokemon(query) : await pokeapi.getRandomPokemon();

    const select = new StringSelectMenuBuilder()
      .setCustomId("pokemon:select")
      .setPlaceholder("Voir un autre Pokémon")
      .addOptions(
        ["bulbasaur", "charmander", "squirtle"].map((name) =>
          new StringSelectMenuOptionBuilder().setLabel(name).setValue(`pokemon:${name}`).setDescription(`Voir ${name}`)
        )
      );

    await interaction.editReply({
      embeds: [pokemonEmbed(pokemon, EmbedBuilder)],
      components: [new ActionRowBuilder().addComponents(select)],
    });
  },
};

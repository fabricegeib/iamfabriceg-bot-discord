const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("options-info")
    .setDescription("Renvoie la valeur saisie")
    .setDescriptionLocalizations({ fr: "Renvoie la valeur saisie" })
    .addStringOption((option) =>
      option.setName("input").setDescription("Valeur à renvoyer").setDescriptionLocalizations({ fr: "Valeur à renvoyer" })
    ),

  async execute(interaction) {
    const value = interaction.options.getString("input");
    await interaction.reply({ content: value ? `📝 ${value}` : "Aucune valeur fournie.", ephemeral: true });
  },
};

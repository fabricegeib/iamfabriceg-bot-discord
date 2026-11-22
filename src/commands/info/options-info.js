const { SlashCommandBuilder, MessageFlags } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("options-info")
    .setDescription("Echo the text you provide")
    .setDescriptionLocalizations({ fr: "Renvoie le texte saisi. Ex. : /options-info input:salut" })
    .addStringOption((option) =>
      option.setName("input").setDescription("Text to echo (e.g. salut)").setDescriptionLocalizations({ fr: "Texte à renvoyer (ex. : salut)" })
    ),

  examples: ["/options-info input:salut"],

  async execute(interaction) {
    const value = interaction.options.getString("input");
    await interaction.reply({ content: value ? `📝 ${value}` : "Aucune valeur fournie.", flags: MessageFlags.Ephemeral });
  },
};

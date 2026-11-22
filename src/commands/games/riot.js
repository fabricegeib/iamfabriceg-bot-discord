const { EmbedBuilder, SlashCommandBuilder } = require("discord.js");
const { riot } = require("../../services/providers");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("riot")
    .setDescription("Statistiques League of Legends")
    .setDescriptionLocalizations({ fr: "Statistiques League of Legends" })
    .addStringOption((option) => option.setName("invocateur").setDescription("Nom d'invocateur").setRequired(true))
    .addStringOption((option) =>
      option
        .setName("region")
        .setDescription("Région (euw1 par défaut)")
        .addChoices(
          { name: "EUW", value: "euw1" },
          { name: "EUN", value: "eun1" },
          { name: "NA", value: "na1" },
          { name: "BR", value: "br1" },
          { name: "JP", value: "jp1" },
          { name: "KR", value: "kr" }
        )
    ),

  cooldown: 4000,

  async execute(interaction) {
    await interaction.deferReply();
    const profile = await riot.getProfile(
      interaction.options.getString("invocateur"),
      interaction.options.getString("region") || "euw1"
    );
    const league = profile.league;

    const embed = new EmbedBuilder()
      .setColor(0x1d4ed8)
      .setTitle(`⚔️ ${profile.name} — niveau ${profile.level}`)
      .setDescription(`Région : ${profile.region}`)
      .addFields(
        league
          ? { name: "Classement solo/duo", value: `${league.tier} ${league.rank} · ${league.lp} LP`, inline: true }
          : { name: "Classement", value: "Non classé", inline: true },
        league
          ? { name: "Victoires / Défaites", value: `${league.wins} / ${league.losses} (${league.rate}%)`, inline: true }
          : { name: "PUUID", value: profile.puuid?.slice(0, 16) || "—", inline: true }
      )
      .setFooter({ text: "Source : Riot API" })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};

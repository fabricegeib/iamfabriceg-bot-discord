const { EmbedBuilder, SlashCommandBuilder } = require("discord.js");
const { riot } = require("../../services/providers");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("riot")
    .setDescription("Show a League of Legends profile")
    .setDescriptionLocalizations({ fr: "Affiche un profil League of Legends. Ex. : /riot invocateur:iamfabriceg" })
    .addStringOption((option) => option.setName("invocateur").setDescription("Summoner name (e.g. iamfabriceg)").setDescriptionLocalizations({ fr: "Nom d'invocateur (ex. : iamfabriceg)" }).setRequired(true))
    .addStringOption((option) =>
      option
        .setName("region")
        .setDescription("Region (default: euw1)")
        .setDescriptionLocalizations({ fr: "Région (défaut : euw1)" })
        .addChoices(
          { name: "EUW", nameLocalizations: { fr: "EUW" }, value: "euw1" },
          { name: "EUN", nameLocalizations: { fr: "EUN" }, value: "eun1" },
          { name: "NA", nameLocalizations: { fr: "NA" }, value: "na1" },
          { name: "BR", nameLocalizations: { fr: "BR" }, value: "br1" },
          { name: "JP", nameLocalizations: { fr: "JP" }, value: "jp1" },
          { name: "KR", nameLocalizations: { fr: "KR" }, value: "kr" }
        )
    ),

  cooldown: 4000,

  examples: ["/riot invocateur:iamfabriceg region:euw1"],

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

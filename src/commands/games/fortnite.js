const {
  ActionRowBuilder,
  EmbedBuilder,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} = require("discord.js");
const { fortnite } = require("../../services/providers");

const RARITY_COLORS = {
  uncommon: 0xbec0bf,
  rare: 0x0b9de0,
  epic: 0xb056e9,
  legendary: 0xe2854b,
  mythic: 0xb5a55d,
};

const CLASS_EMOJIS = {
  constructor: "🛠️",
  ninja: "🗡️",
  outlander: "⛏️",
  soldier: "🔫",
  soldoutlanderier: "🎖️",
};

const CLASS_CHOICES = [
  { name: "Constructeur", nameLocalizations: { fr: "Constructeur" }, value: "constructor" },
  { name: "Ninja", nameLocalizations: { fr: "Ninja" }, value: "ninja" },
  { name: "Explorateur (Outlander)", nameLocalizations: { fr: "Explorateur (Outlander)" }, value: "outlander" },
  { name: "Soldat", nameLocalizations: { fr: "Soldat" }, value: "soldier" },
];

function truncate(value, max = 220) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function labelFor(hero) {
  const rarity = fortnite.RARITY_LABELS[hero.rarity] || hero.rarity;
  return `${CLASS_EMOJIS[hero.class] || "🎖️"} ${hero.displayName}${rarity ? ` · ${rarity}` : ""}`.slice(0, 100);
}

/** Fiche détaillée d'un héros STW (également utilisée par le menu de sélection). */
function stwHeroEmbed(hero, EmbedBuilderClass = EmbedBuilder) {
  const rarity = fortnite.RARITY_LABELS[hero.rarity] || hero.rarity || "—";
  const embed = new EmbedBuilderClass()
    .setColor(RARITY_COLORS[hero.rarity] || 0x6272a4)
    .setTitle(`${CLASS_EMOJIS[hero.class] || "🎖️"} ${hero.displayName}`)
    .setDescription(
      [
        hero.name !== hero.displayName ? `*${hero.name}*` : "",
        hero.citation ? `« ${truncate(hero.citation, 160)} »` : "",
      ]
        .filter(Boolean)
        .join("\n") || "Fiche du héros Save the World."
    )
    .addFields(
      { name: "Classe", value: hero.className, inline: true },
      { name: "Rareté", value: rarity, inline: true }
    );

  if (hero.perk?.commander) {
    embed.addFields({
      name: `Perk commandant · ${truncate(hero.perk.commander, 60)}`,
      value: truncate(hero.perk.commanderText, 260) || "—",
    });
  } else if (hero.perk?.standard) {
    embed.addFields({
      name: `Perk · ${truncate(hero.perk.standard, 60)}`,
      value: truncate(hero.perk.standardText, 260) || "—",
    });
  }

  if (hero.classPerks.length) {
    embed.addFields({
      name: "Perks de classe",
      value: hero.classPerks
        .map((perk) => `**${truncate(perk.title, 60)}** — ${truncate(perk.text, 150)}`)
        .join("\n")
        .slice(0, 1024),
    });
  }

  if (hero.abilities.length) {
    embed.addFields({
      name: "Compétences",
      value: hero.abilities
        .map((ability) => {
          const details = [ability.cost, ability.cooldown].filter(Boolean).join(" · ");
          return `**${truncate(ability.title, 50)}**${details ? ` (${details})` : ""}`;
        })
        .join("\n")
        .slice(0, 1024),
    });
  }

  if (hero.teamPerkUnlock) {
    embed.addFields({
      name: `Bonus d'équipe · ${truncate(hero.teamPerkUnlock, 60)}`,
      value: truncate(hero.teamPerkUnlockText, 260) || "—",
    });
  }

  if (hero.image) embed.setThumbnail(hero.image);
  return embed.setFooter({ text: `Source : iamfabriceg.xyz · héros #${hero.index + 1}` });
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("fortnite")
    .setDescription("Fortnite shop, news and player stats")
    .setDescriptionLocalizations({ fr: "Boutique, actus et stats Fortnite. Ex. : /fortnite shop" })
    .addSubcommand((sub) =>
      sub.setName("shop").setDescription("Current item shop (e.g. /fortnite shop)").setDescriptionLocalizations({ fr: "Boutique actuelle (ex. : /fortnite shop)" })
    )
    .addSubcommand((sub) =>
      sub
        .setName("news")
        .setDescription("Latest game news (e.g. /fortnite news mode:br)")
        .setDescriptionLocalizations({ fr: "Actualités du jeu (ex. : /fortnite news mode:br)" })
        .addStringOption((option) =>
          option
            .setName("mode")
            .setDescription("Game mode (e.g. br)")
            .setDescriptionLocalizations({ fr: "Mode de jeu (ex. : br)" })
            .setRequired(true)
            .addChoices(
              { name: "Battle Royale", nameLocalizations: { fr: "Battle Royale" }, value: "br" },
              { name: "Save the World", nameLocalizations: { fr: "Save the World" }, value: "stw" },
              { name: "Creative", nameLocalizations: { fr: "Creative" }, value: "creative" }
            )
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("stats")
        .setDescription("Stats d'un joueur (ex. : /fortnite stats joueur:iamfabriceg)")
        .setDescriptionLocalizations({ fr: "Stats d'un joueur (ex. : /fortnite stats joueur:iamfabriceg)" })
        .addStringOption((option) =>
          option
            .setName("joueur")
            .setDescription("Pseudo du joueur (ex. : iamfabriceg)")
            .setDescriptionLocalizations({ fr: "Pseudo du joueur (ex. : iamfabriceg)" })
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName("compte")
            .setDescription("Account platform (default: Epic)")
            .setDescriptionLocalizations({ fr: "Plateforme du compte (défaut : Epic)" })
            .addChoices(
              { name: "Epic", nameLocalizations: { fr: "Epic" }, value: "epic" },
              { name: "PlayStation", nameLocalizations: { fr: "PlayStation" }, value: "psn" },
              { name: "Xbox", nameLocalizations: { fr: "Xbox" }, value: "xbl" }
            )
        )
        .addStringOption((option) =>
          option
            .setName("periode")
            .setDescription("Season or lifetime (default: season)")
            .setDescriptionLocalizations({ fr: "Saison ou total (défaut : saison, repli auto sur total)" })
            .addChoices(
              { name: "Saison en cours", nameLocalizations: { fr: "Saison en cours" }, value: "season" },
              { name: "Depuis le début (total)", nameLocalizations: { fr: "Depuis le début (total)" }, value: "lifetime" }
            )
        )
    )
    .addSubcommandGroup((group) =>
      group
        .setName("save-the-world")
        .setDescription("Save the World heroes (e.g. /fortnite save-the-world heroes)")
        .setDescriptionLocalizations({ fr: "Héros Save the World (ex. : /fortnite save-the-world heroes)" })
        .addSubcommand((sub) =>
          sub
            .setName("heroes")
            .setDescription("Search or browse Save the World heroes")
            .setDescriptionLocalizations({ fr: "Rechercher ou lister les héros Save the World" })
            .addStringOption((option) =>
              option
                .setName("nom")
                .setDescription("Hero name, with autocomplete (leave empty for the list)")
                .setDescriptionLocalizations({ fr: "Nom du héros avec autocomplétion (vide pour la liste)" })
                .setAutocomplete(true)
            )
            .addStringOption((option) =>
              option
                .setName("classe")
                .setDescription("Filter the list by class")
                .setDescriptionLocalizations({ fr: "Filtrer la liste par classe" })
                .addChoices(...CLASS_CHOICES)
            )
        )
    ),

  cooldown: 4000,

  examples: [
    "/fortnite shop",
    "/fortnite news mode:br",
    "/fortnite stats joueur:iamfabriceg periode:lifetime",
    "/fortnite save-the-world heroes nom:Controller Harper",
    "/fortnite save-the-world heroes classe:ninja",
  ],

  async autocomplete(interaction) {
    if (interaction.options.getSubcommand() !== "heroes") {
      await interaction.respond([]);
      return;
    }
    const focused = String(interaction.options.getFocused() ?? "");
    const matches = await fortnite.searchStwHeroes(focused, { limit: 25 });
    await interaction.respond(matches.map((hero) => ({ name: labelFor(hero), value: String(hero.index) })));
  },

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "heroes") {
      await interaction.deferReply();
      const query = interaction.options.getString("nom");

      if (query) {
        const hero = await fortnite.getStwHero(query);
        await interaction.editReply({ embeds: [stwHeroEmbed(hero)] });
        return;
      }

      const heroClass = interaction.options.getString("classe");
      const all = await fortnite.getStwHeroes();
      const filtered = heroClass ? all.filter((hero) => hero.class === heroClass) : all;
      const pool = filtered.slice(0, 25);
      const counts = new Map();
      for (const hero of filtered) counts.set(hero.className, (counts.get(hero.className) || 0) + 1);

      const embed = new EmbedBuilder()
        .setColor(0x8b5cf6)
        .setTitle("🦸 Héros Save the World")
        .setDescription(
          `${filtered.length} héros${heroClass ? ` · classe : **${fortnite.CLASS_LABELS[heroClass] || heroClass}**` : ""}. ` +
            `Sélectionnez un héros dans le menu ou précisez \`nom:\`.`
        )
        .addFields({
          name: "Classes",
          value: [...counts.entries()].map(([name, count]) => `${name} : ${count}`).join("\n").slice(0, 1024),
          inline: true,
        })
        .addFields({
          name: `Premiers héros (${pool.length})`,
          value: pool.map((hero) => `\`${hero.index}\` ${hero.displayName}`).join("\n").slice(0, 1024),
          inline: true,
        })
        .setFooter({ text: "Source : iamfabriceg.xyz" });

      const select = new StringSelectMenuBuilder()
        .setCustomId("stw:hero")
        .setPlaceholder("Choisir un héros")
        .addOptions(
          pool.map((hero) =>
            new StringSelectMenuOptionBuilder()
              .setLabel(hero.displayName.slice(0, 100))
              .setValue(String(hero.index))
              .setDescription(`${hero.className}${hero.rarity ? ` · ${fortnite.RARITY_LABELS[hero.rarity] || hero.rarity}` : ""}`.slice(0, 100))
          )
        );

      await interaction.editReply({
        embeds: [embed],
        components: [new ActionRowBuilder().addComponents(select)],
      });
      return;
    }

    if (subcommand === "shop") {
      await interaction.deferReply();
      const shop = await fortnite.getShop();
      const embed = new EmbedBuilder()
        .setColor(0x8b5cf6)
        .setTitle("🛒 Boutique Fortnite")
        .setDescription(`${shop.total} objets disponibles · ${shop.date ? new Date(shop.date).toLocaleDateString("fr-FR") : ""}`)
        .addFields(
          shop.entries.slice(0, 8).map((entry) => ({
            name: `${entry.emoji || "🎁"} ${entry.name} — ${entry.price} V-Bucks`,
            value: `${entry.kind}${entry.rarity !== "—" ? ` · ${entry.rarity}` : ""}`,
            inline: true,
          }))
        )
        .setFooter({ text: "Source : fortnite-api.com" });
      if (shop.entries[0]?.image) embed.setImage(shop.entries[0].image);
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    if (subcommand === "news") {
      await interaction.deferReply();
      const news = await fortnite.getNews(interaction.options.getString("mode"));
      const embeds = news.articles.slice(0, 3).map(
        (article) =>
          new EmbedBuilder()
            .setColor(0x6366f1)
            .setTitle(article.title)
            .setDescription(article.body || "")
            .setImage(article.image || null)
            .setFooter({ text: "Source : fortnite-api.com" })
      );
      await interaction.editReply({ embeds });
      return;
    }

    await interaction.deferReply();
    const stats = await fortnite.getStats(
      interaction.options.getString("joueur"),
      interaction.options.getString("compte") || "epic",
      interaction.options.getString("periode") || "season"
    );
    const periodeLabel = stats.window === "lifetime" ? "Depuis le début (total)" : "Saison en cours";
    const embed = new EmbedBuilder()
      .setColor(0x8b5cf6)
      .setTitle(`📈 Statistiques Fortnite — ${stats.name}`)
      .setDescription(
        stats.fallback
          ? "Aucune partie jouée cette saison : affichage des statistiques **depuis le début**."
          : `Période : **${periodeLabel}**.`
      )
      .addFields(
        { name: "Niveau", value: String(stats.level ?? "—"), inline: true },
        { name: "Victoires", value: String(stats.wins), inline: true },
        { name: "Éliminations", value: String(stats.kills), inline: true },
        { name: "Parties", value: String(stats.matches), inline: true },
        { name: "K/D", value: String(stats.kd), inline: true },
        { name: "Taux de victoire", value: `${stats.winRate}%`, inline: true }
      )
      .setFooter({ text: `Source : fortnite-api.com · ${periodeLabel}` });
    if (stats.image) embed.setThumbnail(stats.image);
    await interaction.editReply({ embeds: [embed] });
  },
};

module.exports.stwHeroEmbed = stwHeroEmbed;

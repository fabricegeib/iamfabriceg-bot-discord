const { EmbedBuilder, MessageFlags, SlashCommandBuilder } = require("discord.js");

const FR = (json, fallback) => json?.description_localizations?.fr || json?.description || fallback;

function formatOption(option, commandName, prefix = "") {
  const label = `${prefix}${option.name}`;
  const required = option.required ? " *obligatoire*" : "";
  return `\`${label}\` — ${FR(option, option.description || "—")}${required}`;
}

function formatCommand(command) {
  const json = command.data.toJSON();
  const lines = [`**/${json.name}** — ${FR(json, "")}`];

  for (const example of command.examples || []) {
    lines.push(`  Ex. : \`${example}\``);
  }

  for (const option of json.options || []) {
    if (option.type === 1) {
      lines.push(`  **/${json.name} ${option.name}** — ${FR(option, "")}`);
      for (const child of option.options || []) lines.push(`    ${formatOption(child, json.name, `${option.name} `)}`);
    } else {
      lines.push(`  ${formatOption(option, json.name)}`);
    }
  }

  return lines.join("\n");
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("List all commands, options and usage examples")
    .setDescriptionLocalizations({ fr: "Affiche toutes les commandes, options et exemples d'utilisation. Ex. : /help" })
    .addStringOption((option) =>
      option
        .setName("commande")
        .setDescription("Show help for one command (e.g. fortnite)")
        .setDescriptionLocalizations({ fr: "Affiche l'aide d'une commande (ex. : fortnite)" })
    ),

  examples: ["/help", "/help commande:fortnite"],

  cooldown: 2000,

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const commands = [...interaction.client.commands.values()].sort((a, b) =>
      a.data.name.localeCompare(b.data.name)
    );
    const filter = interaction.options.getString("commande")?.replace(/^\//, "").toLowerCase();
    const selected = filter ? commands.filter((command) => command.data.name === filter) : commands;

    if (!selected.length) {
      await interaction.editReply(`❌ Commande inconnue : \`${filter}\`. Utilisez \`/help\` pour la liste.`);
      return;
    }

    const chunks = [];
    let current = "";
    for (const command of selected) {
      const block = formatCommand(command);
      if (current && current.length + block.length + 2 > 3900) {
        chunks.push(current);
        current = "";
      }
      current += `${current ? "\n\n" : ""}${block}`;
    }
    if (current) chunks.push(current);

    const embeds = chunks.map(
      (chunk, index) =>
        new EmbedBuilder()
          .setColor(0x6366f1)
          .setTitle(index === 0 ? "📖 Aide — iamfabriceg Bot" : "📖 Aide (suite)")
          .setDescription(chunk)
          .setFooter({ text: `${selected.length} commande(s) · /help commande:<nom> pour le détail` })
    );

    await interaction.editReply({ embeds });
  },
};

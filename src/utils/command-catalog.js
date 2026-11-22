const path = require("node:path");

const { PermissionFlagsBits } = require("discord.js");

const { walk } = require("./loaders");

const COMMANDS_DIR = path.join(__dirname, "..", "commands");

const OPTION_TYPES = {
  1: "subcommand",
  2: "group",
  3: "string",
  4: "integer",
  5: "boolean",
  6: "user",
  7: "channel",
  8: "role",
  9: "mentionable",
  10: "number",
  11: "attachment",
};

const FR = (json, fallback = "") => json?.description_localizations?.fr || json?.description || fallback;

function permissionNames(raw) {
  const bits = BigInt(raw || 0);
  if (!bits) return [];
  return Object.entries(PermissionFlagsBits)
    .filter(([name, bit]) => name !== "All" && typeof bit === "bigint" && bit > 0n && (bits & bit) === bit)
    .map(([name]) => name);
}

function mapChoice(choice) {
  return {
    name: choice.name,
    nameFr: choice.name_localizations?.fr || choice.name,
    value: String(choice.value),
  };
}

function mapOption(option) {
  return {
    name: option.name,
    description: FR(option),
    descriptionEn: option.description || "",
    type: OPTION_TYPES[option.type] || String(option.type),
    required: Boolean(option.required),
    choices: (option.choices || []).map(mapChoice),
    minValue: option.min_value ?? null,
    maxValue: option.max_value ?? null,
    options: (option.options || []).map(mapOption),
  };
}

/**
 * Construit un catalogue sérialisable à partir des SlashCommandBuilder réels.
 * Une seule source de vérité pour /help, le front public et le CMS.
 */
function buildCommandCatalog() {
  const categoryByCommand = new Map();
  for (const file of walk(COMMANDS_DIR)) {
    const command = require(file);
    if (command?.data?.name) {
      categoryByCommand.set(command.data.name, path.basename(path.dirname(file)));
    }
  }

  const commands = [];
  for (const file of walk(COMMANDS_DIR)) {
    delete require.cache[require.resolve(file)];
    const command = require(file);
    if (!command?.data?.name || typeof command.execute !== "function") continue;

    const json = command.data.toJSON();
    const examples = Array.isArray(command.examples) ? command.examples.filter(Boolean) : [];
    const permissions = permissionNames(json.default_member_permissions);

    commands.push({
      name: json.name,
      description: FR(json),
      descriptionEn: json.description || "",
      category: categoryByCommand.get(json.name) || "divers",
      aliases: Array.isArray(command.aliases) ? command.aliases : [],
      usage: examples[0] || `/${json.name}`,
      examples,
      cooldown: Number(command.cooldown) || 0,
      permissions,
      adminOnly: permissions.includes("Administrator"),
      enabled: true,
      options: (json.options || []).map(mapOption),
    });
  }

  commands.sort((a, b) => a.name.localeCompare(b.name, "fr"));
  return {
    generatedAt: new Date().toISOString(),
    source: "src/commands/**/*.js",
    count: commands.length,
    commands,
  };
}

module.exports = { buildCommandCatalog, COMMANDS_DIR, OPTION_TYPES };

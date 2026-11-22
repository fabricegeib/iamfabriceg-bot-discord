const { createPayloadClient } = require("../services/payload");
const { FeatureDisabledError } = require("../services/errors");
const { buildCommandCatalog } = require("../utils/command-catalog");

/**
 * Synchronise le catalogue de commandes Discord dans la collection `commands`
 * de Payload. Nécessite PAYLOAD_API_KEY dans .env.
 * Les documents créés manuellement dans l'admin sont conservés.
 */
async function run() {
  const client = createPayloadClient();
  if (!client) throw new FeatureDisabledError("Payload CMS", "PAYLOAD_URL");
  if (!client.apiKey) throw new FeatureDisabledError("l'écriture des commandes CMS", "PAYLOAD_API_KEY");

  const catalog = buildCommandCatalog();
  const existing = await client.list("commands", { limit: 200, depth: 0 });
  const byName = new Map((existing?.docs || []).map((doc) => [doc.name, doc.id]));

  let created = 0;
  let updated = 0;

  for (const command of catalog.commands) {
    const data = {
      name: command.name,
      description: command.description,
      descriptionEn: command.descriptionEn,
      category: command.category,
      aliases: command.aliases,
      usage: command.usage,
      examples: command.examples.map((example) => ({ example })),
      cooldown: command.cooldown,
      permissions: command.permissions,
      enabled: command.enabled,
      adminOnly: command.adminOnly,
      options: command.options,
    };

    const id = byName.get(command.name);
    if (id) {
      await client.update("commands", id, data);
      updated += 1;
    } else {
      await client.create("commands", data);
      created += 1;
    }
  }

  console.log(`Commandes CMS synchronisées : ${created} créée(s), ${updated} mise(s) à jour.`);
  return { created, updated, total: catalog.commands.length };
}

if (require.main === module) {
  run().catch((error) => {
    console.error("Synchronisation des commandes échouée :", error.message);
    process.exitCode = 1;
  });
}

module.exports = { run };

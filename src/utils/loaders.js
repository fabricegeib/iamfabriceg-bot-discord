const fs = require("node:fs");
const path = require("node:path");
const { createLogger } = require("../services/logger");

const log = createLogger("loader");

/** Retourne tous les fichiers .js d'un dossier, récursivement (une seule passe). */
function walk(directory) {
  if (!fs.existsSync(directory)) return [];
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walk(entryPath));
    else if (entry.isFile() && entry.name.endsWith(".js")) files.push(entryPath);
  }
  return files;
}

/** Charge toutes les commandes dans une Map indexée par nom. */
function loadCommands(directory, commands = new Map()) {
  for (const file of walk(directory)) {
    delete require.cache[require.resolve(file)];
    const command = require(file);
    if (!command?.data?.name || typeof command.execute !== "function") {
      log.warn(`Commande ignorée (data/execute manquant) : ${path.relative(process.cwd(), file)}`);
      continue;
    }
    if (commands.has(command.data.name)) {
      log.warn(`Commande en doublon remplacée : ${command.data.name}`);
    }
    commands.set(command.data.name, command);
  }
  log.info(`${commands.size} commande(s) chargée(s)`);
  return commands;
}

/** Charge tous les events et les enregistre sur le client. */
function loadEvents(directory, client) {
  let count = 0;
  for (const file of walk(directory)) {
    delete require.cache[require.resolve(file)];
    const event = require(file);
    if (!event?.name || typeof event.execute !== "function") {
      log.warn(`Event ignoré (name/execute manquant) : ${path.relative(process.cwd(), file)}`);
      continue;
    }
    const listener = (...args) => {
      Promise.resolve(event.execute(...args, client)).catch((error) => {
        log.error(`Erreur dans l'event ${event.name}`, error);
      });
    };
    if (event.once) client.once(event.name, listener);
    else client.on(event.name, listener);
    count += 1;
  }
  log.info(`${count} event(s) chargé(s)`);
  return count;
}

module.exports = { walk, loadCommands, loadEvents };

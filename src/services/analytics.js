const { getEnv } = require("../config/env");
const { createLogger } = require("./logger");
const { createPayloadClient } = require("./payload");

const log = createLogger("analytics");

/**
 * Enregistrement des interactions "fire and forget" : la statistique ne doit
 * jamais bloquer ni faire échouer une commande Discord.
 */
function isEnabled() {
  try {
    return getEnv().USAGE_TELEMETRY_ENABLED !== "false";
  } catch {
    return false;
  }
}

function trackUsage(data, { client } = {}) {
  if (!isEnabled()) return;

  let payload = client;
  try {
    payload = payload || createPayloadClient();
  } catch (error) {
    log.debug(`Télémétrie désactivée : ${error.message}`);
    return;
  }
  if (!payload || payload.isReadOnly) return;

  Promise.resolve()
    .then(() => payload.recordUsage(data))
    .catch((error) => log.warn(`Statistique non enregistrée : ${error.message}`));
}

/** Lecture des statistiques pour l'admin/les commandes (erreur explicite). */
async function fetchStats(params = {}, { client } = {}) {
  const payload = client || createPayloadClient();
  if (!payload || payload.isReadOnly) return null;
  return payload.getStats(params);
}

module.exports = { isEnabled, trackUsage, fetchStats };

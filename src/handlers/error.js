const { MessageFlags } = require("discord.js");
const { FeatureDisabledError, NotFoundError, HttpError } = require("../services/errors");
const { createLogger } = require("../services/logger");

const log = createLogger("error");

const ERROR_SENT = Symbol.for("iamfabriceg.errorResponseSent");

/** Interaction expirée (> 3 s pour un ack initial, > 15 min pour un follow-up). */
function isExpiredInteraction(error) {
  return error?.code === 10062 || /unknown interaction/i.test(error?.message ?? "");
}

/** Réponse déjà acquittée : tenter un second callback initial déclenche 40060. */
function isAlreadyAcknowledged(error) {
  return (
    error?.code === 40060 ||
    error?.code === "InteractionAlreadyReplied" ||
    /already been acknowledged|already been sent or deferred/i.test(error?.message ?? "")
  );
}

/** Traduit une erreur technique en message utilisateur lisible. */
function friendlyMessage(error) {
  if (error instanceof FeatureDisabledError) return `⚙️ ${error.message}`;
  if (error instanceof NotFoundError) return `🔍 ${error.message}`;
  if (error instanceof HttpError) {
    if ([401, 403].includes(error.status)) return "🔑 La clé d'API configurée est invalide ou expirée.";
    if (error.status === 429) return "⏳ Service temporairement saturé, réessayez dans un instant.";
    return `🌐 Service momentanément indisponible (HTTP ${error.status}).`;
  }
  return "❌ Une erreur est survenue. Réessayez plus tard.";
}

/**
 * Répond sans jamais doubler une réponse déjà envoyée ou différée.
 * Une interaction expirée est silencieusement ignorée : il n'est plus possible
 * d'y répondre, et un second callback initial provoquerait une erreur 40060.
 */
async function respondError(interaction, message, { cause } = {}) {
  if (interaction[ERROR_SENT]) return false;
  interaction[ERROR_SENT] = true;

  if (!interaction.isRepliable?.()) return false;
  if (isExpiredInteraction(cause) || isAlreadyAcknowledged(cause)) return false;

  try {
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp({ content: message, flags: MessageFlags.Ephemeral });
    } else {
      await interaction.reply({ content: message, flags: MessageFlags.Ephemeral });
    }
    return true;
  } catch (error) {
    if (isExpiredInteraction(error) || isAlreadyAcknowledged(error)) {
      log.debug("Réponse d'erreur ignorée (interaction expirée ou déjà acquittée)", { code: error.code });
    } else {
      log.warn("Impossible d'envoyer le message d'erreur", error);
    }
    return false;
  }
}

module.exports = {
  friendlyMessage,
  respondError,
  isExpiredInteraction,
  isAlreadyAcknowledged,
};

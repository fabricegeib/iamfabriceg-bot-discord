const { FeatureDisabledError, NotFoundError, HttpError } = require("../services/errors");

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

/** Répond sans jamais doubler une réponse déjà envoyée ou différée. */
async function respondError(interaction, message) {
  try {
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: message, ephemeral: true });
    } else {
      await interaction.reply({ content: message, ephemeral: true });
    }
  } catch (error) {
    // Dernier recours : le message d'erreur ne doit pas provoquer une seconde erreur.
    console.error("Impossible d'envoyer le message d'erreur :", error);
  }
}

module.exports = { friendlyMessage, respondError };

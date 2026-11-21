/** Erreur HTTP renvoyée par le client HTTP commun. */
class HttpError extends Error {
  constructor(message, { status, url, body } = {}) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.url = url;
    this.body = body;
  }
}

/** Fonctionnalité désactivée car une clé d'API est absente. */
class FeatureDisabledError extends Error {
  constructor(feature, variable) {
    super(`${feature} est désactivé : la variable ${variable} n'est pas configurée.`);
    this.name = "FeatureDisabledError";
    this.feature = feature;
    this.variable = variable;
  }
}

/** Aucun résultat trouvé pour une requête utilisateur. */
class NotFoundError extends Error {
  constructor(message = "Aucun résultat trouvé.") {
    super(message);
    this.name = "NotFoundError";
  }
}

module.exports = { HttpError, FeatureDisabledError, NotFoundError };

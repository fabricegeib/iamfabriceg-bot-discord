const http = require("node:http");
const nodeCrypto = require("node:crypto");
const { createLogger } = require("./logger");
const { shared: cache } = require("./cache");

const log = createLogger("webhook");
const MAX_BODY = 1024 * 1024;

function timingSafeEqualHex(expected, received) {
  if (typeof received !== "string" || !/^[a-f0-9]+$/i.test(received)) return false;
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(received, "hex");
  return a.length === b.length && nodeCrypto.timingSafeEqual(a, b);
}

/** Vérifie une signature HMAC-SHA256 hexadécimale (Payload / générique). */
function verifySignature(secret, rawBody, signature) {
  if (!secret) return false;
  const expected = nodeCrypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  return timingSafeEqualHex(expected, signature);
}

/** Vérifie la signature Twitch EventSub : sha256(HMAC(id + timestamp + body)). */
function verifyTwitchSignature(secret, messageId, timestamp, rawBody, header) {
  if (!secret || !header || !header.startsWith("sha256=")) return false;
  const expected = nodeCrypto
    .createHmac("sha256", secret)
    .update(`${messageId}${timestamp}${rawBody}`)
    .digest("hex");
  return timingSafeEqualHex(expected, header.slice(7));
}

function readBody(req, max = MAX_BODY) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > max) {
        reject(new Error("Corps de requête trop volumineux"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function json(res, status, payload) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

/**
 * Serveur HTTP léger : healthcheck + webhooks Payload et Twitch EventSub.
 * `onEvent(type, payload)` est appelé pour chaque notification validée.
 */
function createWebhookServer({ port = 3000, secret = "", twitchSecret = "", onEvent = () => {} } = {}) {
  const startedAt = Date.now();

  async function handler(req, res) {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

    if (req.method === "GET" && url.pathname === "/healthz") {
      return json(res, 200, {
        ok: true,
        uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
        cache: cache.stats(),
        timestamp: new Date().toISOString(),
      });
    }

    if (req.method === "GET" && url.pathname === "/") {
      return json(res, 200, { service: "iamfabriceg-discord-bot", endpoints: ["/healthz", "/webhooks/payload", "/webhooks/twitch"] });
    }

    if (req.method === "POST" && url.pathname === "/webhooks/payload") {
      let raw;
      try {
        raw = await readBody(req);
      } catch (error) {
        return json(res, 413, { error: error.message });
      }

      const signature = req.headers["x-payload-signature"] || req.headers["x-webhook-signature"];
      if (secret && !verifySignature(secret, raw, signature)) {
        log.warn("Signature Payload invalide, requête rejetée");
        return json(res, 401, { error: "Signature invalide" });
      }

      try {
        const event = JSON.parse(raw);
        const type = event.event || `${event.collection || "collection"}.${event.operation || "change"}`;
        log.info(`Webhook Payload reçu : ${type}`);
        await onEvent(type, event);
        return json(res, 200, { received: true, type });
      } catch (error) {
        log.error("Erreur lors du traitement du webhook Payload", error);
        return json(res, 400, { error: "Payload invalide" });
      }
    }

    if (req.method === "POST" && url.pathname === "/webhooks/twitch") {
      let raw;
      try {
        raw = await readBody(req);
      } catch (error) {
        return json(res, 413, { error: error.message });
      }

      const messageType = req.headers["twitch-eventsub-message-type"];
      const messageId = req.headers["twitch-eventsub-message-id"];
      const timestamp = req.headers["twitch-eventsub-message-timestamp"];
      const signature = req.headers["twitch-eventsub-message-signature"];

      if (twitchSecret && !verifyTwitchSignature(twitchSecret, messageId, timestamp, raw, signature)) {
        log.warn("Signature Twitch EventSub invalide, requête rejetée");
        return json(res, 401, { error: "Signature invalide" });
      }

      try {
        const message = JSON.parse(raw);
        if (messageType === "webhook_callback_verification") {
          log.info("Vérification du callback EventSub acceptée");
          res.writeHead(200, { "Content-Type": "text/plain" });
          return res.end(message.challenge || "");
        }
        if (messageType === "notification") {
          const type = message.subscription?.type || "unknown";
          log.info(`Notification Twitch reçue : ${type}`);
          await onEvent(`twitch.${type}`, message.event);
          return json(res, 200, { received: true });
        }
        if (messageType === "revocation") {
          log.warn(`Abonnement EventSub révoqué : ${message.subscription?.type}`);
          return json(res, 200, { received: true });
        }
        return json(res, 200, { received: true });
      } catch (error) {
        log.error("Erreur lors du traitement du webhook Twitch", error);
        return json(res, 400, { error: "Message invalide" });
      }
    }

    return json(res, 404, { error: "Route inconnue" });
  }

  const server = http.createServer((req, res) => {
    handler(req, res).catch((error) => {
      log.error("Erreur serveur HTTP", error);
      json(res, 500, { error: "Erreur interne" });
    });
  });

  return {
    server,
    handler,
    start: () =>
      new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(port, () => {
          log.info(`Serveur HTTP actif sur le port ${port}`);
          resolve(server);
        });
      }),
    stop: () =>
      new Promise((resolve) => {
        if (!server.listening) return resolve();
        server.close(() => resolve());
      }),
  };
}

module.exports = { createWebhookServer, verifySignature, verifyTwitchSignature, readBody };

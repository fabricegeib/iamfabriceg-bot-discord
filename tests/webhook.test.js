const test = require("node:test");
const assert = require("node:assert/strict");
const nodeCrypto = require("node:crypto");
const { verifySignature, verifyTwitchSignature } = require("../src/services/webhook-server");

test("verifySignature accepte une signature HMAC valide", () => {
  const secret = "secret-payload";
  const body = '{"event":"game.published"}';
  const signature = nodeCrypto.createHmac("sha256", secret).update(body).digest("hex");
  assert.equal(verifySignature(secret, body, signature), true);
  assert.equal(verifySignature(secret, body, "deadbeef"), false);
  assert.equal(verifySignature("", body, signature), false);
});

test("verifyTwitchSignature valide le format id + timestamp + corps", () => {
  const secret = "twitch-secret";
  const id = "msg-id";
  const timestamp = "2026-11-21T00:00:00Z";
  const body = '{"subscription":{}}';
  const digest = nodeCrypto.createHmac("sha256", secret).update(`${id}${timestamp}${body}`).digest("hex");

  assert.equal(verifyTwitchSignature(secret, id, timestamp, body, `sha256=${digest}`), true);
  assert.equal(verifyTwitchSignature(secret, id, timestamp, body, digest), false);
  assert.equal(verifyTwitchSignature(secret, id, "autre", body, `sha256=${digest}`), false);
});

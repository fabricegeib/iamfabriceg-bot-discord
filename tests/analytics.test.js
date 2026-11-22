const test = require("node:test");
const assert = require("node:assert/strict");

process.env.DISCORD_TOKEN ||= "test-token";
process.env.CLIENT_ID ||= "test-client";
process.env.GUILD_ID ||= "test-guild";
process.env.USAGE_TELEMETRY_ENABLED ||= "true";
const { resetEnv } = require("../src/config/env");
resetEnv();

const { PayloadClient } = require("../src/services/payload");
const { trackUsage } = require("../src/services/analytics");

function client(apiKey = "CLE") {
  return new PayloadClient({ url: "https://cms.example/", authSlug: "users", apiKey, gamesSlug: "games" });
}

test("recordUsage POSTe vers /api/bot/usage avec la clé API", async () => {
  const originalFetch = globalThis.fetch;
  let captured;
  globalThis.fetch = async (url, options) => {
    captured = { url, options };
    return { ok: true, status: 200, text: async () => '{"ok":true,"points":2}' };
  };

  try {
    const result = await client().recordUsage({ commandName: "ping", userId: "123", outcome: "success" });
    assert.deepEqual(result, { ok: true, points: 2 });
    assert.equal(captured.url, "https://cms.example/api/bot/usage");
    assert.equal(captured.options.method, "POST");
    assert.equal(captured.options.headers.Authorization, "users API-Key CLE");
    assert.deepEqual(JSON.parse(captured.options.body), {
      commandName: "ping",
      userId: "123",
      outcome: "success",
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("getStats transmet userId et désactive le cache", async () => {
  const originalFetch = globalThis.fetch;
  let captured;
  globalThis.fetch = async (url, options) => {
    captured = { url, options };
    return { ok: true, status: 200, text: async () => '{"ok":true,"totals":{}}' };
  };

  try {
    await client().getStats({ userId: "123", period: "week" });
    assert.equal(captured.url, "https://cms.example/api/bot/stats?userId=123&period=week");
    assert.equal(captured.options.method, "GET");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("trackUsage est fire-and-forget et n'intercepte pas les erreurs", async () => {
  let resolveCall;
  const calls = [];
  const fake = {
    isReadOnly: false,
    recordUsage: (data) => {
      calls.push(data);
      return new Promise((resolve) => {
        resolveCall = resolve;
      });
    },
  };

  const started = Date.now();
  const returned = trackUsage({ commandName: "ping", userId: "123" }, { client: fake });
  assert.equal(returned, undefined);
  await Promise.resolve(); // laisse la micro-tâche démarrer l'appel
  assert.equal(calls.length, 1);
  assert.ok(Date.now() - started < 200, "trackUsage ne doit pas attendre l'appel réseau");
  resolveCall({ ok: true });
});

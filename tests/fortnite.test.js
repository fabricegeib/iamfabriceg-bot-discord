const test = require("node:test");
const assert = require("node:assert/strict");

const httpModule = require("../src/services/http");
const { HttpError } = require("../src/services/errors");
const fortnitePath = require.resolve("../src/services/providers/fortnite");

function loadProviderWithRequest(mock) {
  const original = httpModule.request;
  httpModule.request = mock;
  delete require.cache[fortnitePath];
  const provider = require(fortnitePath);
  httpModule.request = original;
  return provider;
}

const statsPayload = {
  status: 200,
  data: {
    name: "TestPlayer",
    stats: {
      br: {
        wins: { value: 12 },
        kills: { value: 34 },
        matchesPlayed: { value: 50 },
        kd: { value: 0.68 },
        winRate: { value: 24 },
      },
    },
  },
};

test("getStats replie sur lifetime quand la saison n'a aucune partie", async () => {
  const calls = [];
  const provider = loadProviderWithRequest(async (url) => {
    calls.push(url);
    if (url.includes("timeWindow=season")) {
      throw new HttpError("404", {
        status: 404,
        url,
        body: '{"status":404,"error":"the requested profile didnt play any match yet"}',
      });
    }
    return statsPayload;
  });

  const stats = await provider.getStats("TestPlayer");
  assert.equal(stats.window, "lifetime");
  assert.equal(stats.fallback, true);
  assert.equal(stats.wins, 12);
  assert.equal(calls.length, 2);
  assert.match(calls[0], /timeWindow=season/);
  assert.match(calls[1], /timeWindow=lifetime/);
});

test("getStats respecte une période lifetime explicite sans repli", async () => {
  const calls = [];
  const provider = loadProviderWithRequest(async (url) => {
    calls.push(url);
    return statsPayload;
  });

  const stats = await provider.getStats("TestPlayer", "epic", "lifetime");
  assert.equal(stats.window, "lifetime");
  assert.equal(stats.fallback, false);
  assert.equal(calls.length, 1);
  assert.match(calls[0], /timeWindow=lifetime/);
});

test("getStats ne replie pas sur une autre erreur 404", async () => {
  const calls = [];
  const provider = loadProviderWithRequest(async (url) => {
    calls.push(url);
    throw new HttpError("404", { status: 404, url, body: '{"error":"player not found"}' });
  });

  await assert.rejects(() => provider.getStats("Inconnu"), HttpError);
  assert.equal(calls.length, 1);
});

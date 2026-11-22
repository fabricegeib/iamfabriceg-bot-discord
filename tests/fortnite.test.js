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

// Réponse réelle de fortnite-api.com/v2/stats/br/v2 (format 2026) :
// `account.name`, `battlePass.level`, `stats.all.overall` avec des nombres bruts.
const currentApiPayload = {
  status: 200,
  data: {
    account: { id: "2b7897075f20421b81529bdc2ab742f3", name: "iamfabriceg" },
    battlePass: { level: 1, progress: 0 },
    stats: {
      all: {
        overall: {
          wins: 776,
          kills: 20640,
          matches: 12461,
          kd: 1.766,
          winRate: 6.227,
          lastModified: "2026-09-16T21:37:49Z",
        },
        solo: { wins: 147, kills: 4550, matches: 2446, kd: 1.979, winRate: 6.01 },
      },
      keyboardMouse: { overall: { wins: 4, kills: 82, matches: 53, kd: 1.673, winRate: 7.547 } },
    },
  },
};

test("getStats lit le format actuel de l'API (stats.all.overall)", async () => {
  const provider = loadProviderWithRequest(async () => currentApiPayload);

  const stats = await provider.getStats("iamfabriceg", "epic", "lifetime");

  assert.equal(stats.name, "iamfabriceg");
  assert.equal(stats.level, 1);
  assert.equal(stats.wins, 776);
  assert.equal(stats.kills, 20640);
  assert.equal(stats.matches, 12461);
  assert.equal(stats.kd, 1.766);
  assert.equal(stats.winRate, 6.227);
  assert.equal(stats.updated, "2026-09-16T21:37:49Z");
});

test("getStats replie sur lifetime puis lit le format actuel", async () => {
  const provider = loadProviderWithRequest(async (url) => {
    if (url.includes("timeWindow=season")) {
      throw new HttpError("404", {
        status: 404,
        url,
        body: '{"status":404,"error":"the requested profile didnt play any match yet"}',
      });
    }
    return currentApiPayload;
  });

  const stats = await provider.getStats("iamfabriceg");

  assert.equal(stats.window, "lifetime");
  assert.equal(stats.fallback, true);
  assert.equal(stats.wins, 776);
  assert.equal(stats.kills, 20640);
  assert.equal(stats.matches, 12461);
});

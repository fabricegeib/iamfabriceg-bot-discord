const test = require("node:test");
const assert = require("node:assert/strict");
const { PayloadClient } = require("../src/services/payload");
const { FeatureDisabledError } = require("../src/services/errors");

function client(apiKey = "CLE") {
  return new PayloadClient({ url: "https://cms.example/", authSlug: "users", apiKey, gamesSlug: "games" });
}

test("l'en-tête d'authentification respecte le format Payload", () => {
  assert.deepEqual(client().headers, { Authorization: "users API-Key CLE" });
  assert.deepEqual(client("").headers, {});
});

test("list construit l'URL /api/<collection> avec les paramètres", async () => {
  const originalFetch = globalThis.fetch;
  let captured;
  globalThis.fetch = async (url, options) => {
    captured = { url, options };
    return { ok: true, status: 200, text: async () => '{"docs":[]}' };
  };

  try {
    const docs = await client().list("games", { limit: 10, depth: 1 });
    assert.deepEqual(docs, { docs: [] });
    assert.equal(captured.url, "https://cms.example/api/games?limit=10&depth=1");
    assert.equal(captured.options.headers.Authorization, "users API-Key CLE");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("l'écriture est refusée sans clé API", async () => {
  await assert.rejects(() => client("").create("games", { title: "Test" }), FeatureDisabledError);
});

test("mapGame normalise un document Payload", () => {
  const mapped = client().mapGame({ id: 1, slug: "aniimo", title: "Aniimo", discordRoleId: "42", category: "ARPG" });
  assert.deepEqual(mapped, {
    key: "aniimo",
    name: "Aniimo",
    roleId: "42",
    category: "ARPG",
    emoji: "🎮",
    search: "Aniimo",
    description: undefined,
    source: "payload",
    id: 1,
  });
});

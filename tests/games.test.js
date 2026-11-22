const test = require("node:test");
const assert = require("node:assert/strict");
const { games, byKey, findGame, roleIdFor, gamesWithRoles } = require("../src/config/games");

test("le catalogue contient exactement 17 jeux sans doublon", () => {
  assert.equal(games.length, 17);
  assert.equal(byKey.size, 17);
  const keys = games.map((game) => game.key);
  assert.equal(new Set(keys).size, keys.length);
});

test("Aniimo et GOALS sont présents", () => {
  assert.ok(byKey.has("aniimo"));
  assert.ok(byKey.has("goals"));
  assert.equal(byKey.get("aniimo").added, "2026");
  assert.equal(byKey.get("goals").added, "2026");
});

test("findGame gère les alias, la casse et les accents", () => {
  assert.equal(findGame("lol").key, "league-of-legends");
  assert.equal(findGame("GTA").key, "gta-v");
  assert.equal(findGame("Aniimo").key, "aniimo");
  assert.equal(findGame("goals").key, "goals");
  assert.equal(findGame("teamfight tactics").key, "teamfight-tactics");
  assert.equal(findGame("inconnu"), undefined);
});

test("les rôles sont résolus depuis la config ou l'environnement", () => {
  // Env explicite : le test ne doit pas dépendre des variables du .env local.
  assert.equal(roleIdFor(byKey.get("fortnite"), {}), "722561307903262831");
  assert.equal(roleIdFor(byKey.get("aniimo"), {}), null);
  assert.equal(roleIdFor(byKey.get("aniimo"), { ROLE_ANIIMO_ID: "123" }), "123");

  const withEnv = gamesWithRoles({ ROLE_ANIIMO_ID: "111", ROLE_GOALS_ID: "222" });
  assert.ok(withEnv.some((game) => game.key === "aniimo"));
  assert.ok(withEnv.some((game) => game.key === "goals"));
  assert.ok(withEnv.some((game) => game.key === "fortnite"));
});

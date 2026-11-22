const test = require("node:test");
const assert = require("node:assert/strict");
const { Cache } = require("../src/services/cache");

test("set/get et has fonctionnent", () => {
  const cache = new Cache();
  cache.set("cle", { valeur: 1 }, 60_000);
  assert.deepEqual(cache.get("cle"), { valeur: 1 });
  assert.equal(cache.has("cle"), true);
  assert.equal(cache.has("absente"), false);
});

test("une entrée expirée est supprimée à la lecture", () => {
  const cache = new Cache();
  cache.set("cle", "v", -1);
  assert.equal(cache.get("cle"), undefined);
  assert.equal(cache.size, 0);
});

test("getOrSet ne charge qu'une fois", async () => {
  const cache = new Cache();
  let calls = 0;
  const loader = async () => {
    calls += 1;
    return calls;
  };

  assert.equal(await cache.getOrSet("k", 60_000, loader), 1);
  assert.equal(await cache.getOrSet("k", 60_000, loader), 1);
  assert.equal(calls, 1);
});

test("delete, clear et stats", () => {
  const cache = new Cache();
  cache.set("a", 1, 60_000);
  cache.set("b", 2, -1);
  assert.deepEqual(cache.stats(), { valid: 1, expired: 1, total: 2 });
  assert.equal(cache.delete("a"), true);
  cache.clear();
  assert.equal(cache.size, 0);
});

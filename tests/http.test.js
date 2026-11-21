const test = require("node:test");
const assert = require("node:assert/strict");
const { request, buildUrl } = require("../src/services/http");
const { Cache } = require("../src/services/cache");
const { HttpError } = require("../src/services/errors");

const response = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  text: async () => body,
});

test("buildUrl encode les paramètres et ignore les valeurs vides", () => {
  const url = buildUrl("https://exemple.fr/api", { q: "a b", key: "x", empty: "", none: null });
  assert.equal(url, "https://exemple.fr/api?q=a+b&key=x");
});

test("request parse le JSON et met en cache les GET", async () => {
  const cache = new Cache();
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    return response(200, '{"ok":true}');
  };

  const options = { cacheTtlMs: 60_000, cache, fetchImpl, retries: 0 };
  assert.deepEqual(await request("https://exemple.fr/a", options), { ok: true });
  assert.deepEqual(await request("https://exemple.fr/a", options), { ok: true });
  assert.equal(calls, 1);
});

test("request réessaie sur une erreur 500 puis réussit", async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    return calls === 1 ? response(500, "oops") : response(200, '{"ok":true}');
  };

  const data = await request("https://exemple.fr/retry", { fetchImpl, retries: 1, cacheTtlMs: 0 });
  assert.deepEqual(data, { ok: true });
  assert.equal(calls, 2);
});

test("request ne réessaie pas sur une erreur 404", async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    return response(404, "introuvable");
  };

  await assert.rejects(
    () => request("https://exemple.fr/404", { fetchImpl, retries: 2, cacheTtlMs: 0 }),
    (error) => error instanceof HttpError && error.status === 404
  );
  assert.equal(calls, 1);
});

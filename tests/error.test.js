const test = require("node:test");
const assert = require("node:assert/strict");
const { MessageFlags } = require("discord.js");
const { respondError, isExpiredInteraction, isAlreadyAcknowledged } = require("../src/handlers/error");

function interaction(overrides = {}) {
  const calls = { reply: [], followUp: [] };
  return {
    calls,
    isRepliable: () => true,
    replied: false,
    deferred: false,
    ...overrides,
    reply: async (payload) => {
      calls.reply.push(payload);
    },
    followUp: async (payload) => {
      calls.followUp.push(payload);
    },
  };
}

test("respondError répond une fois avec le flag Ephemeral", async () => {
  const target = interaction();
  const sent = await respondError(target, "Oups");
  assert.equal(sent, true);
  assert.equal(target.calls.reply.length, 1);
  assert.equal(target.calls.reply[0].flags, MessageFlags.Ephemeral);
});

test("respondError ne double pas une réponse", async () => {
  const target = interaction();
  await respondError(target, "Première");
  await respondError(target, "Deuxième");
  assert.equal(target.calls.reply.length, 1);
  assert.equal(target.calls.reply[0].content, "Première");
});

test("respondError ignore une interaction expirée", async () => {
  const target = interaction();
  const sent = await respondError(target, "Trop tard", { cause: { code: 10062 } });
  assert.equal(sent, false);
  assert.equal(target.calls.reply.length, 0);
  assert.equal(isExpiredInteraction({ code: 10062 }), true);
});

test("respondError ignore une interaction déjà acquittée", async () => {
  const target = interaction();
  const sent = await respondError(target, "Déjà fait", { cause: { code: 40060 } });
  assert.equal(sent, false);
  assert.equal(target.calls.reply.length, 0);
  assert.equal(isAlreadyAcknowledged({ code: 40060 }), true);
});

test("respondError utilise followUp quand la réponse est différée", async () => {
  const target = interaction({ deferred: true });
  await respondError(target, "Erreur différée");
  assert.equal(target.calls.reply.length, 0);
  assert.equal(target.calls.followUp.length, 1);
  assert.equal(target.calls.followUp[0].content, "Erreur différée");
});

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { walk, loadCommands } = require("../src/utils/loaders");

const commandsDir = path.join(__dirname, "..", "src", "commands");

test("walk parcourt les sous-dossiers de commandes une seule fois", () => {
  const files = walk(commandsDir);
  assert.ok(files.length >= 15);
  assert.equal(new Set(files).size, files.length);
  assert.ok(files.every((file) => file.endsWith(".js")));
});

test("loadCommands charge toutes les commandes avec un nom", () => {
  const commands = loadCommands(commandsDir);
  assert.ok(commands.size >= 15);
  for (const [name, command] of commands) {
    assert.equal(command.data.name, name);
    assert.equal(typeof command.execute, "function");
  }
  assert.ok(commands.has("games"));
  assert.ok(commands.has("pokemon"));
  assert.ok(commands.has("fortnite"));
});

const fs = require("node:fs");
const path = require("node:path");

const { buildCommandCatalog } = require("../utils/command-catalog");

const TARGET = path.join(__dirname, "..", "..", "cms", "src", "data", "command-catalog.json");

function main() {
  const catalog = buildCommandCatalog();
  fs.mkdirSync(path.dirname(TARGET), { recursive: true });
  fs.writeFileSync(TARGET, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
  console.log(`${catalog.count} commande(s) exportée(s) vers ${path.relative(process.cwd(), TARGET)}`);
}

main();

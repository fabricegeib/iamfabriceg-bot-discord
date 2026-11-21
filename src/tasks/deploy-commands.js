require("dotenv").config();
const { REST, Routes } = require("discord.js");
const path = require("node:path");
const fs = require("node:fs");

const commands = [];

// Fonction pour charger récursivement les commandes depuis tous les sous-dossiers
const loadCommandsRecursively = (dirPath) => {
	const entries = fs.readdirSync(dirPath, { withFileTypes: true });

	for (const entry of entries) {
		const entryPath = path.join(dirPath, entry.name);

		if (entry.isDirectory()) {
			// Si c'est un dossier, on explore récursivement
			loadCommandsRecursively(entryPath);
		} else if (entry.isFile() && entry.name.endsWith(".js")) {
			// Si c'est un fichier .js, on le charge
			const command = require(entryPath);
			if ("data" in command && "execute" in command) {
				commands.push(command.data.toJSON());
				console.log(`✅ Chargé: ${command.data.name}`);
			} else {
				console.log(`⚠️  Ignoré: ${entry.name} (manque "data" ou "execute")`);
			}
		}
	}
};

// Charger toutes les commandes depuis /commands et ses sous-dossiers
loadCommandsRecursively(path.join(__dirname, "..", "commands"));

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

(async () => {
	try {
		console.log(`⏳ Déploiement de ${commands.length} commande(s)...`);

		const data = await rest.put(
			Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
			{ body: commands }
		);

		console.log(`✅ ${data.length} commande(s) déployée(s) avec succès!`);
	} catch (error) {
		console.error("❌ Erreur lors du déploiement:", error);
	} finally {
		process.exit();
	}
})();
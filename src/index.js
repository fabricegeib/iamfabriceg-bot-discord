// const { token } = require("./config.json");
require("dotenv").config();
const fs = require("node:fs");
const path = require("node:path");
const { Client, Collection, GatewayIntentBits } = require("discord.js");

// const eventHandler = require("./handlers/eventHandler");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// client.commands = new Collection();

// const commandsPath = path.join(__dirname, "commands");
// const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith(".js"));

// for (const file of commandFiles) {
//   const filePath = path.join(commandsPath, file);
//   const command = require(filePath);
//   client.commands.set(command.data.name, command);
// }

// const eventsPath = path.join(__dirname, "events");
// const eventFiles = fs.readdirSync(eventsPath).filter((file) => file.endsWith(".js"));

// for (const file of eventFiles) {
//   const filePath = path.join(eventsPath, file);
//   const event = require(filePath);
//   if (event.once) {
//     client.once(event.name, (...args) => event.execute(...args));
//   } else {
//     client.on(event.name, (...args) => event.execute(...args));
//   }
// }

// eventHandler(client);

client.commands = new Collection();

// Function to load commands from a directory
const loadCommands = (dirPath) => {
  const commandFiles = fs.readdirSync(dirPath).filter((file) => file.endsWith(".js"));
  for (const file of commandFiles) {
    const filePath = path.join(dirPath, file);
    const command = require(filePath);
    if ("data" in command && "execute" in command) {
      client.commands.set(command.data.name, command);
    } else {
      console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
    }
  }
};

// Recursively load all commands
const loadAllCommands = (dirPath) => {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      loadAllCommands(entryPath);
    } else if (entry.isFile() && entry.name.endsWith(".js")) {
      loadCommands(dirPath);
    }
  }
};

// Load all commands from the commands directory
loadAllCommands(path.join(__dirname, "commands"));

// Function to load events from a directory
const loadEvents = (dirPath) => {
  const eventFiles = fs.readdirSync(dirPath).filter((file) => file.endsWith(".js"));
  for (const file of eventFiles) {
    const filePath = path.join(dirPath, file);
    const event = require(filePath);
    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args));
    } else {
      client.on(event.name, (...args) => event.execute(...args));
    }
  }
};

// Recursively load all events
const loadAllEvents = (dirPath) => {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      loadAllEvents(entryPath);
    } else if (entry.isFile() && entry.name.endsWith(".js")) {
      loadEvents(dirPath);
    }
  }
};

// Load all events from the events directory
loadAllEvents(path.join(__dirname, "events"));

// // Gestionnaire d'interactions pour les commandes slash
// client.on('interactionCreate', async interaction => {
//   if (!interaction.isChatInputCommand()) return;

//   const command = client.commands.get(interaction.commandName);

//   if (!command) {
//     console.error(`Commande ${interaction.commandName} introuvable.`);
//     return;
//   }

//   try {
//     await command.execute(interaction);
//   } catch (error) {
//     console.error(`Erreur lors de l'exécution de ${interaction.commandName}:`, error);

//     if (interaction.replied || interaction.deferred) {
//       await interaction.followUp({
//         content: 'Une erreur est survenue!',
//         ephemeral: true
//       });
//     } else {
//       await interaction.reply({
//         content: 'Une erreur est survenue!',
//         ephemeral: true
//       });
//     }
//   }
// });

client.login(process.env.DISCORD_TOKEN);
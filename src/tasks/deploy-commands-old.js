// require("dotenv").config();
// const { Client, Collection, GatewayIntentBits, REST, Routes } = require("discord.js");
// const path = require("node:path");
// const fs = require("node:fs");

// const client = new Client({
//   intents: [
//     GatewayIntentBits.Guilds,
//     GatewayIntentBits.GuildMembers,
//     GatewayIntentBits.GuildMessages,
//     GatewayIntentBits.MessageContent,
//   ],
// });

// client.commands = new Collection();

// const commands = [];

// // Grab all the command files from the commands directory you created earlier
// const commandFiles = fs.readdirSync(path.join(__dirname, "..", "commands")).filter((file) => file.endsWith(".js"));

// // Grab the SlashCommandBuilder#toJSON() output of each command's data for deployment
// for (const file of commandFiles) {
//   const command = require(path.join(__dirname, "..", "commands", file));
//   client.commands.set(command.data.name, command);
//   commands.push(command.data.toJSON()); // Ajoutez cette ligne pour remplir le tableau commands
// }

// // Construct and prepare an instance of the REST module
// const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

// // and deploy your commands!
// (async () => {
//   try {
//     console.log(`⏳ Started refreshing ${commands.length} (/) commands.`);

//     // The put method is used to fully refresh all commands in the guild with the current set
//     const data = await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), {
//       body: commands,
//     });

//     console.log(`✅ Successfully reloaded ${data.length} (/) commands.`);

//     // global
//     // await rest.put(
//     //   Routes.applicationCommands(clientId),
//     //   { body: commands },
//     // );
//   } catch (error) {
//     // And of course, make sure you catch and log any errors!
//     console.error(error);
//   } finally {
//     process.exit();
//   }
// })();

// client.login(process.env.DISCORD_TOKEN);

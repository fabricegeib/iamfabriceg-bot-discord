const { Events, ActivityType } = require("discord.js");
const { setInterval } = require("node:timers");

let status = [
  // {
  //   name: "iamfabriceg.xyz",
  //   type: ActivityType.Competing,
  // },
  {
    name: "dev",
    type: ActivityType.Custom,
    state: "🚧 development in progress",
  },
  {
    name: "version",
    type: ActivityType.Custom,
    state: "🗒️ Version 1.0.0",
  },
  // {
  //   name: "iamfabriceg.xyz",
  //   type: ActivityType.Listening,
  // },
  // {
  //   name: "iamfabriceg.xyz",
  //   type: ActivityType.Playing,
  // },
  {
    name: "🧑‍💻 development in progress",
    type: ActivityType.Streaming,
    url: "https://twitch.tv/iamfabriceg",
  },
  // {
  //   name: "https://www.youtube.com/watch?v=kgt9rgemH9M&ab_channel=L3scro784",
  //   type: ActivityType.Watching,
  // },
];

module.exports = {
  name: Events.ClientReady,
  once: true,
  execute(client) {
    // console.log(`✅ Ready! Logged in as ${readyClient.user.tag}`);

    setInterval(() => {
      let random = Math.floor(Math.random() * status.length);
      client.user.setActivity(status[random]);
    }, 30000);

    console.log(status);

    console.log(`✅ Ready ! Logged in as ${client.user.tag}`);
  },
};

// module.exports = async(client) => {
// 	client.user.setPresence({
//         game: {
//             name: "!skidip"
//         }
//     })
// };

// module.exports = client => {
//   console.log(`Logged in as ${client.user.tag} and I am ready!!`);
//   // console.log('I am ready!');

//   client.user.setActivity('iamfabriceg.xyz');
// }

// // v1
// module.exports = {
//   name: "ready",
//   once: true,
//   execute(client) {
//     console.log(`Ready! Logged in as ${client.user.tag}`);
//   },
// };

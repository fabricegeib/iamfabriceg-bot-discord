const { Events, ActivityType } = require("discord.js");
const { createLogger } = require("../../services/logger");

const log = createLogger("ready");

const STATUSES = [
  { name: "/games · 17 jeux", type: ActivityType.Playing },
  { name: "iamfabriceg.xyz", type: ActivityType.Watching },
  { name: "Twitch : iamfabriceg", type: ActivityType.Streaming, url: "https://twitch.tv/iamfabriceg" },
];

let timer;

module.exports = {
  name: Events.ClientReady,
  once: true,
  execute(client) {
    log.info(`Connecté en tant que ${client.user.tag} sur ${client.guilds.cache.size} serveur(s)`);

    const rotate = () => {
      const status = STATUSES[Math.floor(Math.random() * STATUSES.length)];
      client.user.setActivity(status);
    };
    rotate();
    timer = setInterval(rotate, 5 * 60 * 1000);
    timer.unref?.();

    client.once(Events.ShardDisconnect, () => {
      if (timer) clearInterval(timer);
    });
  },
};

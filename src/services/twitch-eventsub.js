const { EmbedBuilder } = require("discord.js");
const { getEnv } = require("../config/env");
const twitch = require("./providers/twitch");
const { createLogger } = require("./logger");

const log = createLogger("eventsub");

function announcementChannel(client) {
  const env = getEnv();
  const channelId = env.ANNOUNCEMENT_CHANNEL_ID || env.LOG_CHANNEL_ID || env.ROLES_CHANNEL_ID;
  if (!channelId) return null;
  return client.channels.fetch(channelId).catch(() => null);
}

/** S'abonne aux événements stream.online / stream.offline d'une chaîne. */
async function subscribeToChannel(channelLogin, callbackUrl) {
  const users = await twitch.getUsers([channelLogin]);
  if (!users.length) throw new Error(`Chaîne Twitch « ${channelLogin} » introuvable.`);
  const broadcasterUserId = users[0].id;

  const results = [];
  for (const type of ["stream.online", "stream.offline"]) {
    const sub = await twitch.createSubscription(
      type,
      { broadcaster_user_id: broadcasterUserId },
      callbackUrl
    );
    results.push(sub);
  }
  log.info(`Abonnements EventSub créés pour ${users[0].display_name}`);
  return results;
}

function liveEmbed(event) {
  return new EmbedBuilder()
    .setColor(0x9146ff)
    .setTitle(`🔴 ${event.broadcaster_user_name} est en live !`)
    .setURL(`https://twitch.tv/${event.broadcaster_user_login}`)
    .setDescription(event.title || "Nouveau direct")
    .addFields(
      { name: "Jeu", value: event.game_name || "Inconnu", inline: true },
      { name: "Début", value: event.started_at ? new Date(event.started_at).toLocaleString("fr-FR") : "—", inline: true }
    )
    .setThumbnail(`https://static-cdn.jtvnw.net/jtv_user_pictures/${event.broadcaster_user_id}-profile_image-300x300.jpeg`)
    .setTimestamp();
}

function offlineEmbed(event) {
  return new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(`⚫ ${event.broadcaster_user_name} a terminé son live`)
    .setURL(`https://twitch.tv/${event.broadcaster_user_login}`)
    .setTimestamp();
}

/** Dispatche une notification EventSub vers Discord. */
async function handleNotification(type, event, client) {
  const channel = announcementChannel(client);
  if (!channel || !channel.isTextBased()) {
    log.warn("Aucun salon d'annonce configuré, notification ignorée");
    return;
  }

  if (type === "twitch.stream.online") {
    await channel.send({ embeds: [liveEmbed(event)] });
  } else if (type === "twitch.stream.offline") {
    await channel.send({ embeds: [offlineEmbed(event)] });
  } else {
    log.debug(`Notification non gérée : ${type}`);
  }
}

module.exports = { subscribeToChannel, handleNotification, liveEmbed, offlineEmbed };

# iamfabricegBot (Bot Discord)

A discord bot for [iamfabriceg.xyz](https://iamfabriceg.xyz) made by [Fabrice Geib](https://fabricegeib.com) with [comfy.js](https://github.com/instafluff/ComfyJS) and [discord.js](https://discord.js.org/#/)

Add the bot (administrator permission) on your discord server with this [link](https://discord.com/api/oauth2/authorize?client_id=580073418968530973&permissions=8&scope=bot)

https://discord.com/oauth2/authorize?client_id=580073418968530973&permissions=8&scope=bot+applications.commands

## install

```bash
gh repo clone iamfabriceg-bot-discord
```

## deploy commands

```bash
docker exec iamfabriceg-bot-discord npm run deploy
```

## start

```bash
docker-compose up -d
```

## Commands :

```
!beep
!dice
!embed
!fn-creative
!kick (if no args)
!ping
!role
!rules-and-info
!say
!server
!twitch
!user
!user-info [arguments]
```

```
Commande chargée: beep
Commande chargée: dice
Commande chargée: embed
Commande chargée: fn-creative
Commande chargée: ping
Commande chargée: role
Commande chargée: server
Commande chargée: twitch
Commande chargée: user-info
Commande chargée: user
```

- rules-and-info ajouter reactions pour accepter et devenir membre (acces salons bases)
- roles

## Upgrade discord.js@12.5.3 to discord.js@14.6.0

```
npm list discord.js

npm uninstall discord.js

npm install discord.js @discordjs/voice
```

## Installation and start

You need a `config.json`

```
{
	"prefix": "!",
  "token": "your_token_goes_here",
  "clientId": "your_clientId_goes_here",
  "guildId": "your_guildId_goes_here"
}
```

or a `.env`

```
DISCORD_TOKEN=your_token_goes_here
```

to charge new commands `node .\deploy-commands.js`

to start `node .`

### discord.js

```
npm install discord.js
# or
yarn add discord.js
```

### NPM install

```
npm install

npm install dotenv
```

### PM2

```
npm install pm2

pm2 start app.js --watch --name app
pm2 start index.js --watch --name discord
```

## Rules

1. Be respectful to other server members (no homophobia, racism, etc).
2. No NSFW content.
3. Only help in #bot-support
4. Don't ask for bots/provide bots.

## Resources

- https://discordapp.com/developers/applications/
- https://discord.com/developers/applications
- https://discordapp.com/developers/docs/intro
- https://docs.discord.com/developers/intro

- https://discord.js.org/
- https://discordjs.guide/
- https://discordapi.com/permissions.html
- https://www.youtube.com/watch?v=fuEY1zYnOZE
- https://www.youtube.com/watch?v=UdIzwu7d9LY&t=50s

- New Application => CREATE AN APPLICATION
- Bot => Build-A-Bot => PUBLIC BOT (True)

- https://www.fortnite.com/news/fortnite-save-the-world-update-state-of-development?lang=en-US
- https://pokemongolive.com/?hl=en
- https://www.pokemon.com/us/pokedex/mew
- https://redeem.ubisoft.com/xdefiant/fr-FR
<!-- https://skidip.team -->

- https://support.discord.com/hc/fr/articles/6156116949911-B%C3%AAta-de-l-Accueil-de-Serveur
- https://discord.com/developers/docs/intro
- https://sac.epicgames.com/fr/overview
- https://www.indy.fr/prix/
- https://dev.epicgames.com/community/fortnite/getting-started/creative?lang=fr
- https://github.com/msx752/FTN-Power
- https://github.com/AnIdiotsGuide/discordjs-bot-guide/blob/master/frequently-asked-questions.md

---

## Roles

- Live

- Twitch Subscriber: Tier 3
- Twitch Subscriber: Tier 2
- Twitch Subscriber: Tier 1
- Twitch Subscriber

- FireTipR (block the add with bot)
- uTip

- jeux :
  - among us
  - brawlhalla
  - fall guys
  - fifa
  - Fortnite
  - forza horizon 4
  - Grand Thef Auto V
  - League of Legends
  - prominence poker
  - rainbow six siege
  - Red Dead Redemption 2
  - rocket league
  - Teamfight Tactics
  - Valorant

- Membres
- friends
- gaming friends

- food
- artistes
- jeux
- musique
- film serie

- clip

## Embed

```json
{
  "embeds": [
    {
      "title": "<<< {{ChannelName}} is live on Twitch!>>>",
      "url": "<<<{{ChannelUrl}}>>>",
      "description": "<<<{{Game}}>>>"
    }
  ]
}
```

```json
{
  "embeds": [
    {
      "title": "<<< {{ChannelName}} now follow you Twitch!>>>"
    }
  ]
}
```

```json
{
  "content": "{{ChannelName}} went live on Twitch",
  "embeds": [
    {
      "title": "{{ChannelUrl}}",
      "url": "{{ChannelUrl}}",
      "color": 6570404,
      "footer": {
        "text": "{{CreatedAt}}"
      },
      "image": {
        "url": "{{StreamPreview}}"
      },
      "author": {
        "name": "{{ChannelName}} is now streaming"
      },
      "fields": [
        {
          "name": "Playing",
          "value": "{{Game}}",
          "inline": true
        },
        {
          "name": "Started at (streamer timezone)",
          "value": "{{CreatedAt}}",
          "inline": true
        }
      ]
    }
  ]
}
```

---

.export FortniteGame/Content/Athena/Items/Cosmetics/LoadingScreens/LSID_053_SupplyLlama
.export FortniteGame/Content/Athena/Items/Weapons/WID_Harvest_Pickaxe_MechanicalEngineer1H

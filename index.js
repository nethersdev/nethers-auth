const {
  Client,
  GatewayIntentBits
} = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const OWNER_ROLE_ID = '1549055192903852142';

client.once('ready', () => {
  console.log(`BOT CONNECTE : ${client.user.tag}`);
});

client.on('messageCreate', message => {

  console.log(`MESSAGE RECU : ${message.content}`);

  if (message.author.bot) return;

  if (message.content === '?ping') {

    if (!message.member.roles.cache.has(OWNER_ROLE_ID)) {
      return message.reply('❌ Tu n’es pas Owner.');
    }

    message.reply('🏓 Pong Owner !');
  }
});

client.login(process.env.TOKEN);

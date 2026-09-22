const {
  Client,
  GatewayIntentBits
} = require('discord.js');
const crypto = require('crypto');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const TOKEN = process.env.TOKEN;

// Rôle Owner
const OWNER_ROLE_ID = '1549055192903852142';

// Préfixe des commandes
const PREFIX = '?';

// Stockage temporaire des clés
const keys = new Map();

function generateKey() {
  const part = () =>
    crypto.randomBytes(3).toString('hex').toUpperCase();

  return `NETHERS-${part()}-${part()}-${part()}`;
}

function hasOwnerRole(message) {
  return message.member?.roles.cache.has(OWNER_ROLE_ID);
}

client.once('ready', () => {
  console.log(`✅ Connecté en tant que ${client.user.tag}`);
  console.log('✅ Nethers Auth est en ligne');
});

client.on('messageCreate', async message => {

  // Ignore les bots
  if (message.author.bot) return;

  // Ignore les messages qui ne commencent pas par ?
  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/\s+/);

  const command = args.shift()?.toLowerCase();

  // =========================
  // PING
  // =========================

  if (command === 'ping') {
    return message.reply('🏓 Pong !');
  }

  // =========================
  // PROTECTION OWNER
  // =========================

  const ownerCommands = [
    'generate',
    'keys',
    'revoke'
  ];

  if (ownerCommands.includes(command)) {

    if (!hasOwnerRole(message)) {
      return message.reply('❌ Tu n’as pas accès à cette commande.');
    }
  }

  // =========================
  // GENERATE
  // =========================

  if (command === 'generate') {

    const duration = args[0]?.toLowerCase();

    const durations = {
      '1': {
        name: '1 jour',
        milliseconds: 24 * 60 * 60 * 1000
      },

      '7': {
        name: '7 jours',
        milliseconds: 7 * 24 * 60 * 60 * 1000
      },

      '30': {
        name: '30 jours',
        milliseconds: 30 * 24 * 60 * 60 * 1000
      },

      'lifetime': {
        name: 'Lifetime',
        milliseconds: null
      }
    };

    if (!durations[duration]) {
      return message.reply(
        '❌ Utilisation : `?generate 1`, `?generate 7`, `?generate 30` ou `?generate lifetime`'
      );
    }

    const key = generateKey();

    const information = durations[duration];

    const expiration =
      information.milliseconds === null
        ? null
        : Date.now() + information.milliseconds;

    keys.set(key, {
      key: key,
      duration: information.name,
      createdAt: Date.now(),
      expiresAt: expiration,
      redeemed: false,
      discordId: null,
      hwid: null
    });

    return message.reply(
      `🔑 **Clé générée**\n\n` +
      `\`${key}\`\n\n` +
      `⏱️ Durée : **${information.name}**`
    );
  }

  // =========================
  // KEYS
  // =========================

  if (command === 'keys') {

    if (keys.size === 0) {
      return message.reply('📋 Aucune clé générée.');
    }

    let text = '🔑 **Nethers Auth — Keys**\n\n';

    for (const data of keys.values()) {

      let status;

      if (data.redeemed) {
        status = '🟢 Redeemed';
      } else {
        status = '⚪ Disponible';
      }

      text +=
        `\`${data.key}\`\n` +
        `└ Durée : **${data.duration}**\n` +
        `└ Statut : ${status}\n\n`;
    }

    return message.reply(text);
  }

  // =========================
  // REVOKE
  // =========================

  if (command === 'revoke') {

    const key = args[0];

    if (!key) {
      return message.reply(
        '❌ Utilisation : `?revoke NETHERS-XXXX-XXXX-XXXX`'
      );
    }

    const keyData = keys.get(key);

    if (!keyData) {
      return message.reply('❌ Cette clé n’existe pas.');
    }

    keys.delete(key);

    return message.reply(
      `🗑️ La clé \`${key}\` a été révoquée.`
    );
  }

  // =========================
  // HELP
  // =========================

  if (command === 'help') {

    return message.reply(
      `**Nethers Auth**\n\n` +
      `\`?ping\` → Vérifier le bot\n` +
      `\`?help\` → Afficher l’aide\n\n` +
      `**Owner**\n` +
      `\`?generate 1\` → Clé 1 jour\n` +
      `\`?generate 7\` → Clé 7 jours\n` +
      `\`?generate 30\` → Clé 30 jours\n` +
      `\`?generate lifetime\` → Clé Lifetime\n` +
      `\`?keys\` → Voir les clés\n` +
      `\`?revoke <clé>\` → Révoquer une clé`
    );
  }
});

client.login(TOKEN);

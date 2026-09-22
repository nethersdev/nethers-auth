const { 
  Client, 
  GatewayIntentBits, 
  Partials, 
  SlashCommandBuilder, 
  REST, 
  Routes,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  PermissionFlagsBits
} = require('discord.js');
const fs = require('fs');
const path = require('path');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.DirectMessages
  ],
  partials: [Partials.Channel]
});

const KEYS_FILE = path.join(__dirname, 'keys.json');

function loadKeys() {
  if (!fs.existsSync(KEYS_FILE)) {
    fs.writeFileSync(KEYS_FILE, JSON.stringify({ keys: {}, panelMessageId: null, panelChannelId: null }, null, 2));
  }
  return JSON.parse(fs.readFileSync(KEYS_FILE, 'utf8'));
}

function saveKeys(data) {
  fs.writeFileSync(KEYS_FILE, JSON.stringify(data, null, 2));
}

function generateKey() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let key = '';
  for (let i = 0; i < 16; i++) {
    if (i > 0 && i % 4 === 0) key += '-';
    key += chars[Math.floor(Math.random() * chars.length)];
  }
  return key;
}

function parseDuration(duration) {
  if (duration === 'lifetime') return null;
  const match = duration.match(/^(\d+)([dmy])$/);
  if (!match) return null;
  
  const amount = parseInt(match[1]);
  const unit = match[2];
  const now = Date.now();
  
  if (unit === 'd') return now + amount * 24 * 60 * 60 * 1000;
  if (unit === 'm') return now + amount * 30 * 24 * 60 * 60 * 1000;
  if (unit === 'y') return now + amount * 365 * 24 * 60 * 60 * 1000;
  return null;
}

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);

  const commands = [
    new SlashCommandBuilder()
      .setName('panel')
      .setDescription('Create the control panel')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    new SlashCommandBuilder()
      .setName('deletepanel')
      .setDescription('Delete the control panel')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    new SlashCommandBuilder()
      .setName('genkey')
      .setDescription('Generate a key')
      .addStringOption(opt => 
        opt.setName('duration')
          .setDescription('Duration (1d, 7d, 1m, 1y, lifetime)')
          .setRequired(true)
          .addChoices(
            { name: '1 day', value: '1d' },
            { name: '7 days', value: '7d' },
            { name: '1 month', value: '1m' },
            { name: '1 year', value: '1y' },
            { name: 'Lifetime', value: 'lifetime' }
          )
      )
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    new SlashCommandBuilder()
      .setName('whitelist')
      .setDescription('Whitelist a user and send them a key')
      .addUserOption(opt => opt.setName('user').setDescription('User').setRequired(true))
      .addStringOption(opt => 
        opt.setName('duration')
          .setDescription('Duration')
          .setRequired(true)
          .addChoices(
            { name: '1 day', value: '1d' },
            { name: '7 days', value: '7d' },
            { name: '1 month', value: '1m' },
            { name: '1 year', value: '1y' },
            { name: 'Lifetime', value: 'lifetime' }
          )
      )
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    new SlashCommandBuilder()
      .setName('deletekey')
      .setDescription('Delete a key')
      .addStringOption(opt => opt.setName('key').setDescription('The key to delete').setRequired(true))
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  ].map(c => c.toJSON());

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  try {
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log('Slash commands registered');
  } catch (err) {
    console.error(err);
  }
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand() && !interaction.isButton()) return;

  const data = loadKeys();

  if (interaction.isChatInputCommand()) {
    
    if (interaction.commandName === 'panel') {
      const embed = new EmbedBuilder()
        .setTitle('Nethers Auth - Control Panel')
        .setDescription('Use the buttons below to manage your access.')
        .setColor(0x5865F2);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('get_script').setLabel('Get Script').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('redeem').setLabel('Redeem Key').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('reset_hwid').setLabel('Reset HWID').setStyle(ButtonStyle.Secondary)
      );

      const msg = await interaction.channel.send({ embeds: [embed], components: [row] });
      
      data.panelMessageId = msg.id;
      data.panelChannelId = interaction.channel.id;
      saveKeys(data);

      await interaction.reply({ content: 'Panel created successfully!', ephemeral: true });
    }

    if (interaction.commandName === 'deletepanel') {
      if (data.panelMessageId && data.panelChannelId) {
        try {
          const channel = await client.channels.fetch(data.panelChannelId);
          const msg = await channel.messages.fetch(data.panelMessageId);
          await msg.delete();
        } catch (e) {}
        data.panelMessageId = null;
        data.panelChannelId = null;
        saveKeys(data);
        await interaction.reply({ content: 'Panel deleted.', ephemeral: true });
      } else {
        await interaction.reply({ content: 'No panel found.', ephemeral: true });
      }
    }

    if (interaction.commandName === 'genkey') {
      const duration = interaction.options.getString('duration');
      const key = generateKey();
      const expires = parseDuration(duration);

      data.keys[key] = {
        key,
        duration,
        expires,
        userId: null,
        hwid: null,
        createdAt: Date.now()
      };
      saveKeys(data);

      await interaction.reply({ 
        content: `Key generated:\n\`\`\`${key}\`\`\`\nDuration: **${duration}**`, 
        ephemeral: true 
      });
    }

    if (interaction.commandName === 'whitelist') {
      const user = interaction.options.getUser('user');
      const duration = interaction.options.getString('duration');
      const key = generateKey();
      const expires = parseDuration(duration);

      data.keys[key] = {
        key,
        duration,
        expires,
        userId: user.id,
        hwid: null,
        createdAt: Date.now()
      };
      saveKeys(data);

      try {
        await user.send(`Here is your **Nethers Auth** key:\n\`\`\`${key}\`\`\`\nDuration: **${duration}**`);
        await interaction.reply({ content: `Key sent in DM to ${user.tag}`, ephemeral: true });
      } catch (e) {
        await interaction.reply({ content: `Could not send DM. Key: \`${key}\``, ephemeral: true });
      }
    }

    if (interaction.commandName === 'deletekey') {
      const key = interaction.options.getString('key');
      if (data.keys[key]) {
        delete data.keys[key];
        saveKeys(data);
        await interaction.reply({ content: `Key \`${key}\` has been deleted.`, ephemeral: true });
      } else {
        await interaction.reply({ content: 'Key not found.', ephemeral: true });
      }
    }
  }

  if (interaction.isButton()) {
    if (interaction.customId === 'get_script') {
      await interaction.reply({ content: 'Get Script feature coming soon.', ephemeral: true });
    }
    if (interaction.customId === 'redeem') {
      await interaction.reply({ content: 'Redeem system coming soon.', ephemeral: true });
    }
    if (interaction.customId === 'reset_hwid') {
      await interaction.reply({ content: 'Reset HWID coming soon.', ephemeral: true });
    }
  }
});

client.login(process.env.DISCORD_TOKEN);

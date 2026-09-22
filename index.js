const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  PermissionFlagsBits
} = require("discord.js");

const crypto = require("crypto");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// ===============================
// CONFIG
// ===============================

const OWNER_ROLE_ID = "1549055192903852142";
const PREFIX = "?";

// Stockage temporaire des clés
// Attention : les clés seront perdues si le bot redémarre.
// On ajoutera une vraie database ensuite.
const keys = new Map();

// ===============================
// UTILS
// ===============================

function isOwner(member) {
  return member?.roles?.cache?.has(OWNER_ROLE_ID);
}

function generateKey() {
  const part1 = crypto.randomBytes(3).toString("hex").toUpperCase();
  const part2 = crypto.randomBytes(3).toString("hex").toUpperCase();
  const part3 = crypto.randomBytes(3).toString("hex").toUpperCase();

  return `NETHERS-${part1}-${part2}-${part3}`;
}

function getExpiration(days) {
  if (days === "lifetime") {
    return null;
  }

  return Date.now() + days * 24 * 60 * 60 * 1000;
}

function formatExpiration(expiresAt) {
  if (!expiresAt) {
    return "♾️ Lifetime";
  }

  const timestamp = Math.floor(expiresAt / 1000);
  return `<t:${timestamp}:R>`;
}

// ===============================
// READY
// ===============================

client.once("ready", () => {
  console.log(`BOT CONNECTE : ${client.user.tag}`);
});

// ===============================
// PREFIX COMMANDS
// ===============================

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/\s+/);

  const command = args.shift()?.toLowerCase();

  // =============================
  // PING
  // =============================

  if (command === "ping") {
    return message.reply("🏓 Pong !");
  }

  // =============================
  // PANEL
  // =============================

  if (command === "panel") {
    if (!isOwner(message.member)) {
      return message.reply("❌ Tu n'as pas accès au panel Owner.");
    }

    const embed = new EmbedBuilder()
      .setTitle("🔐 Nethers Auth")
      .setDescription(
        "Bienvenue dans le **Nethers Auth Panel**.\n\n" +
        "Utilise les boutons ci-dessous pour gérer ton système de clés."
      )
      .addFields(
        {
          name: "🔑 Keys",
          value: "Générer, consulter et révoquer des clés.",
          inline: false
        },
        {
          name: "👑 Access",
          value: "Panel réservé au rôle Owner.",
          inline: false
        }
      )
      .setFooter({
        text: "Nethers Auth • Authentication System"
      });

    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("generate_key")
        .setLabel("Generate Key")
        .setEmoji("🔑")
        .setStyle(ButtonStyle.Success),

      new ButtonBuilder()
        .setCustomId("view_keys")
        .setLabel("View Keys")
        .setEmoji("📋")
        .setStyle(ButtonStyle.Primary),

      new ButtonBuilder()
        .setCustomId("revoke_key")
        .setLabel("Revoke Key")
        .setEmoji("🗑️")
        .setStyle(ButtonStyle.Danger)
    );

    return message.channel.send({
      embeds: [embed],
      components: [row1]
    });
  }

  // =============================
  // GENERATE
  // =============================

  if (command === "generate") {
    if (!isOwner(message.member)) {
      return message.reply("❌ Tu n'as pas la permission.");
    }

    const duration = args[0]?.toLowerCase();

    const durations = {
      "1": 1,
      "7": 7,
      "30": 30,
      "lifetime": "lifetime"
    };

    if (!duration || !durations[duration]) {
      return message.reply(
        "❌ Utilisation : `?generate 1`, `?generate 7`, `?generate 30` ou `?generate lifetime`"
      );
    }

    const key = generateKey();
    const expiresAt = getExpiration(durations[duration]);

    keys.set(key, {
      key,
      duration,
      expiresAt,
      createdAt: Date.now(),
      redeemed: false,
      userId: null
    });

    return message.reply(
      `✅ **Key générée !**\n\n` +
      `🔑 \`${key}\`\n` +
      `⏱️ Durée : **${duration === "lifetime" ? "Lifetime" : duration + " jour(s)"}**`
    );
  }

  // =============================
  // KEYS
  // =============================

  if (command === "keys") {
    if (!isOwner(message.member)) {
      return message.reply("❌ Tu n'as pas la permission.");
    }

    if (keys.size === 0) {
      return message.reply("📋 Aucune clé actuellement.");
    }

    let text = "";

    let index = 1;

    for (const [key, data] of keys) {
      text +=
        `**${index}.** \`${key}\`\n` +
        `> ⏱️ ${formatExpiration(data.expiresAt)}\n` +
        `> 📌 ${data.redeemed ? "Redeemed" : "Unused"}\n\n`;

      index++;

      // Discord limite la taille d'un message
      if (text.length > 3500) break;
    }

    const embed = new EmbedBuilder()
      .setTitle("📋 Nethers Auth — Keys")
      .setDescription(text)
      .setFooter({
        text: `${keys.size} clé(s)`
      });

    return message.reply({
      embeds: [embed]
    });
  }

  // =============================
  // REVOKE
  // =============================

  if (command === "revoke") {
    if (!isOwner(message.member)) {
      return message.reply("❌ Tu n'as pas la permission.");
    }

    const key = args[0];

    if (!key) {
      return message.reply(
        "❌ Utilisation : `?revoke NETHERS-XXXXXX-XXXXXX-XXXXXX`"
      );
    }

    if (!keys.has(key)) {
      return message.reply("❌ Cette clé n'existe pas.");
    }

    keys.delete(key);

    return message.reply(
      `🗑️ La clé \`${key}\` a été révoquée.`
    );
  }
});

// ===============================
// BUTTONS
// ===============================

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;

  // Sécurité Owner
  if (!isOwner(interaction.member)) {
    return interaction.reply({
      content: "❌ Tu n'as pas accès à ce panel.",
      ephemeral: true
    });
  }

  // =============================
  // GENERATE BUTTON
  // =============================

  if (interaction.customId === "generate_key") {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("generate_1")
        .setLabel("1 Day")
        .setStyle(ButtonStyle.Primary),

      new ButtonBuilder()
        .setCustomId("generate_7")
        .setLabel("7 Days")
        .setStyle(ButtonStyle.Primary),

      new ButtonBuilder()
        .setCustomId("generate_30")
        .setLabel("30 Days")
        .setStyle(ButtonStyle.Primary),

      new ButtonBuilder()
        .setCustomId("generate_lifetime")
        .setLabel("Lifetime")
        .setStyle(ButtonStyle.Success)
    );

    return interaction.reply({
      content: "🔑 **Choisis la durée de la clé :**",
      components: [row],
      ephemeral: true
    });
  }

  // =============================
  // GENERATE DURATIONS
  // =============================

  if (interaction.customId.startsWith("generate_")) {
    const duration = interaction.customId.replace("generate_", "");

    const days =
      duration === "lifetime"
        ? "lifetime"
        : Number(duration);

    const key = generateKey();
    const expiresAt = getExpiration(days);

    keys.set(key, {
      key,
      duration,
      expiresAt,
      createdAt: Date.now(),
      redeemed: false,
      userId: null
    });

    return interaction.update({
      content:
        `✅ **Key générée !**\n\n` +
        `🔑 \`${key}\`\n` +
        `⏱️ Durée : **${
          duration === "lifetime"
            ? "Lifetime"
            : duration + " jour(s)"
        }**`,
      components: []
    });
  }

  // =============================
  // VIEW KEYS BUTTON
  // =============================

  if (interaction.customId === "view_keys") {
    if (keys.size === 0) {
      return interaction.reply({
        content: "📋 Aucune clé actuellement.",
        ephemeral: true
      });
    }

    let text = "";
    let index = 1;

    for (const [key, data] of keys) {
      text +=
        `**${index}.** \`${key}\`\n` +
        `> ⏱️ ${formatExpiration(data.expiresAt)}\n` +
        `> 📌 ${data.redeemed ? "Redeemed" : "Unused"}\n\n`;

      index++;

      if (text.length > 3500) break;
    }

    const embed = new EmbedBuilder()
      .setTitle("📋 Nethers Auth — Keys")
      .setDescription(text)
      .setFooter({
        text: `${keys.size} clé(s)`
      });

    return interaction.reply({
      embeds: [embed],
      ephemeral: true
    });
  }

  // =============================
  // REVOKE BUTTON
  // =============================

  if (interaction.customId === "revoke_key") {
    const modal = new ModalBuilder()
      .setCustomId("revoke_modal")
      .setTitle("Revoke Nethers Key");

    const input = new TextInputBuilder()
      .setCustomId("key")
      .setLabel("Key à révoquer")
      .setPlaceholder("NETHERS-XXXXXX-XXXXXX-XXXXXX")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const row = new ActionRowBuilder().addComponents(input);

    modal.addComponents(row);

    return interaction.showModal(modal);
  }
});

// ===============================
// REVOKE MODAL
// ===============================

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isModalSubmit()) return;

  if (interaction.customId !== "revoke_modal") return;

  if (!isOwner(interaction.member)) {
    return interaction.reply({
      content: "❌ Tu n'as pas accès à cette fonction.",
      ephemeral: true
    });
  }

  const key = interaction.fields.getTextInputValue("key").trim();

  if (!keys.has(key)) {
    return interaction.reply({
      content: "❌ Cette clé n'existe pas.",
      ephemeral: true
    });
  }

  keys.delete(key);

  return interaction.reply({
    content: `🗑️ La clé \`${key}\` a été révoquée.`,
    ephemeral: true
  });
});

// ===============================
// LOGIN
// ===============================

client.login(process.env.TOKEN);

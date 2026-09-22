console.log("🚀 INDEX.JS EST BIEN LANCE");

const {
  Client,
  GatewayIntentBits
} = require("discord.js");

console.log("📦 Discord.js chargé");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

console.log("🤖 Client créé");

client.once("ready", () => {
  console.log(`✅ BOT CONNECTE : ${client.user.tag}`);
});

client.on("messageCreate", (message) => {
  console.log(`📩 MESSAGE : ${message.content}`);

  if (message.author.bot) return;

  if (message.content === "?ping") {
    message.reply("🏓 Pong !");
  }
});

console.log("🔑 Tentative de connexion...");

client.login(process.env.TOKEN)
  .then(() => {
    console.log("✅ Login réussi");
  })
  .catch((error) => {
    console.error("❌ ERREUR TOKEN / LOGIN :", error);
  });

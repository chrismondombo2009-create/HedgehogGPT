module.exports = {
  config: {
    name: "pv",
    version: "1.0",
    author: "chris st",
    countDown: 2,
    role: 2,
    description: "Le bot envoie un message privé à un utilisateur.",
    category: "admin",
    guide: {
      fr: "{pn} <uid> <message>\nExemple : {pn} 1000123456789 Bonjour, ceci est un message privé !",
      en: "{pn} <uid> <message>\nExample: {pn} 1000123456789 Hello, this is a private message!"
    }
  },

  onStart: async function({ message, args, api }) {
    if (args.length < 2) {
      return message.reply("Utilisation : pv <uid> <message>\nExemple : pv 1000123456789 Salut !");
    }
    const uid = args[0];
    const msg = args.slice(1).join(" ");

    try {
      await api.sendMessage(msg, uid);
      message.reply(`✅ Message envoyé en privé à l'ID : ${uid}`);
    } catch (e) {
      message.reply("❌ Impossible d'envoyer le message. Vérifie l'UID ou les permissions du bot.");
    }
  }
};

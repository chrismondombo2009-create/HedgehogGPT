module.exports = {
  config: {
    name: "ai",
    aliases: ["gpt", "chatgpt", "gpt5"],
    version: "2.5",
    author: "L'Uchiha Perdu",
    countDown: 0,
    role: 0,
    shortDescription: "Chat with GPT-5",
    longDescription: "Talk with GPT-5 AI",
    category: "AI",
    guide: "Ai <message>"
  },

  onStart: async ({ api, event, args }) => {
    const user = await getUserName(api, event.senderID);
    const q = args.join(" ").trim();
    if (!q) return api.sendMessage(`${user} utilise le prefix Sonic pour discuter avec l'IA.`, event.threadID, event.messageID);
    return api.sendMessage(`❌ Impossible d’utiliser l’IA ici. Utilise le prefix Sonic.`, event.threadID, event.messageID);
  },

  onChat: async ({ api, event }) => {
    const body = (event.body || "").trim();
    const m = body.match(/^(ai)\s*(.*)/i);
    if (!m) return;
    const user = await getUserName(api, event.senderID);
    if (!m[2] || m[2].trim() === "") return api.sendMessage(`${user} utilise le prefix Sonic pour discuter avec l'IA.`, event.threadID, event.messageID);
    return api.sendMessage(`❌ Impossible d’utiliser l’IA ici. Utilise le prefix Sonic.`, event.threadID, event.messageID);
  }
};

async function getUserName(api, userID) {
  try {
    const info = await api.getUserInfo(userID);
    return info[userID]?.name || "Utilisateur";
  } catch {
    return "Utilisateur";
  }
}

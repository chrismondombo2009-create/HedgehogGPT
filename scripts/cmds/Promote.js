module.exports = {
  config: {
    name: "promote",
    version: "1.1",
    author: "Brayan Ð-Grimɱ ",
    description: "Accorde la couronne d'administration à un élu.",
    usage: "[promote @mention ou uid] [TID du groupe]",
    cooldown: 30,
    permissions: [2]
  },

  onStart: async function({ api, event, args, message, threadsData }) {
    const { threadID, messageID, senderID, mentions } = event;
    const botAdmins = global.GoatBot.config.adminBot || [];

    if (!botAdmins.includes(senderID)) {
      return api.sendMessage(
        "🔒 Vous n'avez pas la permission royale pour cela.",
        threadID,
        messageID
      );
    }

    // Déterminer l'UID cible
    let targetID;
    if (Object.keys(mentions).length > 0) {
      targetID = Object.keys(mentions)[0];
    } else if (args[0]) {
      targetID = args[0];
    } else {
      targetID = senderID;
    }

    // Vérification si un TID de groupe est fourni
    const groupID = args[1] || threadID;

    try {
      const threadInfo = await api.getThreadInfo(groupID);
      const isBotAdmin = threadInfo.adminIDs.some(admin => admin.id == api.getCurrentUserID());

      if (!isBotAdmin) {
        return api.sendMessage(
          "⚠️ Le bot doit d’abord être admin dans le groupe spécifié pour accorder ce titre.",
          groupID,
          messageID
        );
      }

      // 🔍 Récupérer le nom de l’utilisateur via son UID
      const userInfo = await api.getUserInfo(targetID);
      const targetName = userInfo[targetID]?.name || "Utilisateur inconnu";

      // 👑 Promouvoir
      await api.changeAdminStatus(groupID, targetID, true);

      api.sendMessage(
        `👑 Majesté ! ${targetName} (${targetID}) vient d'être couronné(e) administrateur(trice) du royaume dans le groupe "${threadInfo.name || groupID}".\n` +
        `📝 Accordé par : BOT 🙋‍♂️`,
        groupID,
        messageID
      );

      const logThreadID = global.GoatBot.config.logGroupID;
      if (logThreadID) {
        api.sendMessage(
          `📜 Décret Royal :\n👑 ${targetName} a été promu admin par ${senderID} dans "${threadInfo.name || groupID}"`,
          logThreadID
        );
      }

    } catch (error) {
      console.error("Erreur promotion admin:", error);
      api.sendMessage(
        "❌ Une erreur est survenue pendant la cérémonie.",
        groupID,
        messageID
      );
    }
  }
};

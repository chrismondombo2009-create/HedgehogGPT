const axios = require("axios");

module.exports = {
  config: {
    name: "pdp",
    version: "1.1",
    author: "Axiomatik",
    countDown: 5,
    role: 0,
    shortDescription: "Envoie la photo de profil d'un utilisateur",
    longDescription: "Récupère la photo de profil d'un utilisateur mentionné ou via un lien. Si aucun argument, prend ta propre photo.",
    category: "utilitaires",
    guide: {
      fr: "{pn} @utilisateur\n{pn} lien_du_profil\n{pn} (sans rien pour toi-même)"
    }
  },

  onStart: async function ({ event, args, api }) {
    try {
      let uid;
      
      // Si mention
      if (Object.keys(event.mentions).length > 0) {
        uid = Object.keys(event.mentions)[0];
      }
      // Si réponse à un message
      else if (event.type === "message_reply") {
        uid = event.messageReply.senderID;
      }
      // Si lien Facebook
      else if (args[0]?.match(/facebook\.com|fb\.me|fb\.com/i)) {
        const username = args[0].split("/").filter(part => part.length > 0).pop();
        try {
          const res = await axios.get(`https://graph.facebook.com/${username}?fields=id&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`);
          uid = res.data.id;
        } catch {
          return api.sendMessage("❌ Impossible de trouver l'ID à partir du lien.", event.threadID, event.messageID);
        }
      }
      // Par défaut (soi-même)
      else {
        uid = event.senderID;
      }

      // Récupération de la photo
      const avatarUrl = `https://graph.facebook.com/${uid}/picture?width=1024&height=1024&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;
      
      const stream = await global.utils.getStreamFromURL(avatarUrl);
      return api.sendMessage({
        body: `📸 Photo de profil de l'utilisateur (ID: ${uid}) :`,
        attachment: stream
      }, event.threadID, event.messageID);
      
    } catch (err) {
      console.error(err);
      return api.sendMessage("❌ Une erreur s'est produite lors de la récupération de la photo.", event.threadID, event.messageID);
    }
  }
};

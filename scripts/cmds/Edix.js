 const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports = {
  config: {
    name: "edix",
    aliases: [],
    version: "1.4",
    author: " Chacha",
    countDown: 30,
    role: 0,
    shortDescription: "Edit or generate an image with Gemini-Edit",
    category: "𝗔𝗜",
    guide: {
      en: "Reply to an image with: edix <text> (edit image)\nJust type: edix <keyword> (generate image)",
    },
  },

  onStart: async function () {},

  onChat: async function ({ message, event, api }) {
    if (!event.body || !event.body.toLowerCase().startsWith("edix")) return;

    let prompt = event.body.substring(4).trim();
    if (!prompt) prompt = "enhance"; // par défaut

    const apiurl = "https://gemini-edit-omega.vercel.app/edit";
    api.setMessageReaction("⏳", event.messageID, () => {}, true);

    const processingMsg = await message.reply(`🎨 Processing: "${prompt}" ...`);

    try {
      let params = { prompt };

      // --- Cas 1 : reply à une image -> édition ---
      if (event.messageReply && event.messageReply.attachments && event.messageReply.attachments[0]) {
        const image = event.messageReply.attachments[0];
        if (image.type !== "photo") {
          return message.reply("❌ You must reply to a photo.");
        }
        params.imgurl = image.url;
      }

      // --- Cas 2 : pas d’image reply -> génération ---
      const res = await axios.get(apiurl, { params });

      if (!res.data || !res.data.images || !res.data.images[0]) {
        api.setMessageReaction("❌", event.messageID, () => {}, true);
        return message.reply("❌ Failed to get image.");
      }

      // Conversion base64 → Buffer
      const base64Image = res.data.images[0].replace(/^data:image\/\w+;base64,/, "");
      const imageBuffer = Buffer.from(base64Image, "base64");

      const cacheDir = path.join(__dirname, "cache");
      if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir);

      const imagePath = path.join(cacheDir, `${Date.now()}.png`);
      fs.writeFileSync(imagePath, imageBuffer);

      api.setMessageReaction("✅", event.messageID, () => {}, true);

      // Supprime le message "en cours" et envoie le résultat
      await api.unsendMessage(processingMsg.messageID);
      await message.reply(
        { body: `✅ Done! Prompt: "${prompt}"`, attachment: fs.createReadStream(imagePath) },
        event.threadID,
        () => fs.unlinkSync(imagePath),
        event.messageID
      );
    } catch (error) {
      console.error("❌ API ERROR:", error.response?.data || error.message);
      api.setMessageReaction("❌", event.messageID, () => {}, true);
      return message.reply("Error editing/generating image.");
    }
  },
};

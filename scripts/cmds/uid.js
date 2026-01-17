const { findUid } = global.utils;
const Canvas = require("canvas");
const fs = require("fs-extra");
const path = require("path");

const regExCheckURL = /^(http|https):\/\/[^ "]+$/;
const BACKGROUNDS_DIR = path.join(__dirname, "uid_backgrounds");

if (!fs.existsSync(BACKGROUNDS_DIR)) {
  fs.mkdirSync(BACKGROUNDS_DIR, { recursive: true });
}

async function getCustomBackground(threadID) {
  const bgPath = path.join(BACKGROUNDS_DIR, `${threadID}.png`);
  if (fs.existsSync(bgPath)) {
    try {
      return await Canvas.loadImage(bgPath);
    } catch {
      return null;
    }
  }
  return null;
}

async function saveCustomBackground(threadID, imageURL) {
  try {
    const bgPath = path.join(BACKGROUNDS_DIR, `${threadID}.png`);
    const image = await Canvas.loadImage(imageURL);
    const canvas = Canvas.createCanvas(1000, 600);
    const ctx = canvas.getContext('2d');
    
    const imgRatio = image.width / image.height;
    const canvasRatio = 1000 / 600;
    
    let sourceWidth, sourceHeight, sourceX, sourceY;
    
    if (imgRatio > canvasRatio) {
      sourceHeight = image.height;
      sourceWidth = sourceHeight * canvasRatio;
      sourceX = (image.width - sourceWidth) / 2;
      sourceY = 0;
    } else {
      sourceWidth = image.width;
      sourceHeight = sourceWidth / canvasRatio;
      sourceX = 0;
      sourceY = (image.height - sourceHeight) / 2;
    }
    
    ctx.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, 1000, 600);
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(0, 0, 1000, 600);
    
    const buffer = canvas.toBuffer();
    fs.writeFileSync(bgPath, buffer);
    
    return true;
  } catch (error) {
    return false;
  }
}

function resetCustomBackground(threadID) {
  const bgPath = path.join(BACKGROUNDS_DIR, `${threadID}.png`);
  if (fs.existsSync(bgPath)) {
    fs.unlinkSync(bgPath);
  }
}

async function createUidImage(userName, uid, usersData, threadID) {
  try {
    const width = 1000;
    const height = 600;
    const canvas = Canvas.createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    const customBg = await getCustomBackground(threadID);
    
    if (customBg) {
      ctx.drawImage(customBg, 0, 0, width, height);
    } else {
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, '#0a0a0a');
      gradient.addColorStop(1, '#1a1a2e');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    }
    
    let userAvatar;
    try {
      const avatarUrl = await usersData.getAvatarUrl(uid);
      userAvatar = await Canvas.loadImage(avatarUrl);
    } catch {
      return null;
    }
    
    const avatarSize = 180;
    const centerX = width / 2;
    const avatarY = 100;
    
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, avatarY + avatarSize/2, avatarSize/2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 4;
    ctx.stroke();
    
    ctx.drawImage(userAvatar, centerX - avatarSize/2, avatarY, avatarSize, avatarSize);
    ctx.restore();
    
    ctx.font = 'bold 40px Arial';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.fillText('🎯 IDENTITÉ NUMÉRIQUE 🎯', centerX, avatarY + avatarSize + 80);
    
    ctx.strokeStyle = '#4cc9f0';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(centerX - 150, avatarY + avatarSize + 90);
    ctx.lineTo(centerX + 150, avatarY + avatarSize + 90);
    ctx.stroke();
    
    ctx.font = 'bold 32px Arial';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    
    ctx.fillText(`👤 ${userName}`, centerX, avatarY + avatarSize + 140);
    ctx.fillText(`🆔 ${uid}`, centerX, avatarY + avatarSize + 190);
    
    ctx.font = 'italic 20px Arial';
    ctx.fillStyle = '#888888';
    ctx.fillText('Système UID Scan • Hedgehog', centerX, height - 30);
    
    return canvas.toBuffer();
  } catch (error) {
    return null;
  }
}

async function sendImage(api, event, imageBuffer) {
  try {
    if (!imageBuffer) return;
    
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 12);
    const fileName = `uid_${timestamp}_${random}.png`;
    const filePath = path.join(__dirname, fileName);
    
    fs.writeFileSync(filePath, imageBuffer);
    
    await new Promise((resolve, reject) => {
      api.sendMessage({
        body: "",
        attachment: fs.createReadStream(filePath)
      }, event.threadID, (err, info) => {
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch (e) {}
        
        if (err) return reject(err);
        resolve(info);
      });
    });
  } catch (error) {}
}

module.exports = {
  config: {
    name: "uid",
    version: "2.0",
    author: "L'Uchiha Perdu &  ʚʆɞ Sømå Sønïč ʚʆɞ",
    countDown: 5,
    role: 0,
    description: "Voir les UID Facebook",
    category: "info",
    guide: {
      en: `╭─⌾🌿 COMMANDES UID 🌿
│• uid → Ton UID
│• uid @tag → UID des tags
│• uid <lien> → UID du lien
│• uid fond → Set fond (reply image)
│• uid fond reset → Reset fond
╰──────────⌾`
    }
  },

  langs: {
    en: {
      syntaxError: "╭─⌾🌿 ERREUR 🌿\n│❌ Syntaxe incorrecte\n│💡 Utilise: uid @tag\n╰──────────⌾",
      linkError: "╭─⌾🌿 ERREUR LIEN 🌿\n│❌ Impossible de trouver l'UID\n│🔗 Lien: %1\n╰──────────⌾",
      backgroundSet: "╭─⌾🌿 FOND MODIFIÉ 🌿\n│✅ Fond personnalisé enregistré\n│🎨 Utilisé pour les images UID\n╰──────────⌾",
      backgroundReset: "╭─⌾🌿 FOND RÉINITIALISÉ 🌿\n│🔄 Fond remis à celui par défaut\n│⚫ Arrière-plan noir activé\n╰──────────⌾",
      backgroundError: "╭─⌾🌿 ERREUR 🌿\n│❌ Réponds à une image\n│🖼️ Envoie d'abord une photo\n╰──────────⌾"
    }
  },

  onStart: async function ({ message, event, args, getLang, usersData, api }) {
    const { threadID, messageReply, senderID } = event;
    
    if (args[0] === "fond") {
      if (args[1] === "reset") {
        resetCustomBackground(threadID);
        return message.reply(getLang("backgroundReset"));
      }
      
      if (messageReply && messageReply.attachments && messageReply.attachments[0]) {
        const attachment = messageReply.attachments[0];
        if (attachment.type === "photo" || attachment.type === "animated_image") {
          const imageURL = attachment.url;
          const success = await saveCustomBackground(threadID, imageURL);
          
          if (success) {
            return message.reply(getLang("backgroundSet"));
          }
        }
      }
      return message.reply(getLang("backgroundError"));
    }
    
    if (messageReply) {
      const targetUID = messageReply.senderID;
      const targetName = await usersData.getName(targetUID) || targetUID;
      
      const image = await createUidImage(targetName, targetUID, usersData, threadID);
      
      await message.reply(`╭─⌾🌿 UID DU MESSAGE 🌿\n│👤 ${targetName}\n│🆔 ${targetUID}\n╰──────────⌾`);
      
      if (image) {
        await sendImage(api, event, image);
      }
      return;
    }
    
    if (!args[0]) {
      const userName = await usersData.getName(senderID) || senderID;
      const image = await createUidImage(userName, senderID, usersData, threadID);
      
      await message.reply(`╭─⌾🌿 TON UID 🌿\n│👤 ${userName}\n│🆔 ${senderID}\n╰──────────⌾`);
      
      if (image) {
        await sendImage(api, event, image);
      }
      return;
    }
    
    if (args[0].match(regExCheckURL)) {
      let results = [];
      for (const link of args) {
        try {
          const uid = await findUid(link);
          const name = await usersData.getName(uid) || uid;
          results.push({ name, uid, link });
        } catch (e) {
          results.push({ error: true, link, message: e.message });
        }
      }
      
      for (const result of results) {
        if (result.error) {
          await message.reply(getLang("linkError", result.link));
        } else {
          const image = await createUidImage(result.name, result.uid, usersData, threadID);
          await message.reply(`🔗 ${result.link}\n→ \n🎯 UID: ${result.uid}\n👤 ${result.name}`);
          
          if (image) {
            await sendImage(api, event, image);
          }
        }
      }
      return;
    }
    
    const mentions = event.mentions || {};
    if (Object.keys(mentions).length > 0) {
      for (const uid in mentions) {
        const name = mentions[uid];
        const image = await createUidImage(name, uid, usersData, threadID);
        
        await message.reply(`╭─⌾🌿 UID SCANNÉ 🌿\n│👤 ${name}\n│🆔 ${uid}\n╰──────────⌾`);
        
        if (image) {
          await sendImage(api, event, image);
        }
      }
      return;
    }
    
    return message.reply(getLang("syntaxError"));
  }
};
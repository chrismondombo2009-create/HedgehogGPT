const { createCanvas, loadImage } = require("canvas");
const fs = require("fs");
const path = require("path");

function drawHeart(ctx, x, y, size, color, opacity = 1, glow = false) {
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.fillStyle = color;
  if (glow) {
    ctx.shadowBlur = 35;
    ctx.shadowColor = color;
  }
  ctx.beginPath();
  const h = size * 0.3;
  ctx.moveTo(x, y + h);
  ctx.bezierCurveTo(x, y, x - size / 2, y, x - size / 2, y + h);
  ctx.bezierCurveTo(x - size / 2, y + size / 2, x, y + size / 1.25, x, y + size);
  ctx.bezierCurveTo(x, y + size / 1.25, x + size / 2, y + size / 2, x + size / 2, y + h);
  ctx.bezierCurveTo(x + size / 2, y, x, y, x, y + h);
  ctx.fill();
  ctx.restore();
}

function drawWaveform(ctx, x, y, w, h, color, intensity) {
  ctx.save();
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.globalAlpha = 0.5;
  ctx.shadowBlur = 15;
  ctx.shadowColor = color;
  ctx.moveTo(x, y);
  for (let i = 0; i < w; i += 20) {
    const amplitude = (Math.random() - 0.5) * h * (intensity / 50);
    ctx.lineTo(x + i, y + amplitude);
    ctx.lineTo(x + i + 10, y - amplitude * 1.5);
  }
  ctx.stroke();
  ctx.restore();
}

function drawDigitalBar(ctx, x, y, w, h, percent, color) {
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x - 5, y - 5, w + 10, h + 10, 12);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 8);
  ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
  ctx.fill();
  ctx.clip();
  const barWidth = (percent / 100) * w;
  if (barWidth > 0) {
    const grad = ctx.createLinearGradient(x, y, x + barWidth, y);
    grad.addColorStop(0, color);
    grad.addColorStop(1, "#ffffff");
    ctx.shadowBlur = 25;
    ctx.shadowColor = color;
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, barWidth, h);
    ctx.strokeStyle = "rgba(0, 0, 0, 0.4)";
    ctx.lineWidth = 5;
    for (let i = 0; i < barWidth; i += 20) {
      ctx.beginPath();
      ctx.moveTo(x + i, y);
      ctx.lineTo(x + i + 10, y + h);
      ctx.stroke();
    }
  }
  ctx.restore();
}

module.exports = {
  config: {
    name: "cupidon",
    version: "12.2",
    author: "Sømå Sønïč",
    role: 0,
    shortDescription: { fr: "Cupidon Cyber Pulse - Détection Ultra-Robuste" }
  },

  onStart: async function({ message, event, api }) {
    let user2;

    // --- SYSTÈME DE DÉTECTION ROBUSTE ---
    const mentions = Object.keys(event.mentions || {});
    const replyID = event.messageReply ? event.messageReply.senderID : null;
    const args = event.body.split(/\s+/);

    if (mentions.length > 0) {
      user2 = mentions[0];
    } else if (replyID) {
      user2 = replyID;
    } else if (args.length > 1 && /^\d+$/.test(args[1])) {
      user2 = args[1];
    }

    if (!user2) return message.reply("𝗠𝗲𝗻𝘁𝗶𝗼𝗻𝗻𝗲 𝗹𝗮 𝗽𝗲𝗿𝘀𝗼𝗻𝗻𝗲 𝗼𝘂 𝗿𝗲́𝗽𝗼𝗻𝗱𝘀 𝗮̀ 𝘀𝗼𝗻 𝗺𝗲𝘀𝘀𝗮𝗴𝗲 💝");

    try {
      const user1 = event.senderID;
      const info1 = await api.getUserInfo(user1);
      const info2 = await api.getUserInfo(user2);
      
      if (!info1[user1] || !info2[user2]) throw new Error("Profil introuvable");

      const name1 = info1[user1].name.toUpperCase();
      const name2 = info2[user2].name.toUpperCase();

      const lovePercent = Math.floor(Math.random() * 101);
      const canvas = createCanvas(1200, 900);
      const ctx = canvas.getContext("2d");

      let themeColor, status;
      if (lovePercent >= 80) { themeColor = "#00ff88"; status = "OSMOSE TOTALE"; }
      else if (lovePercent >= 50) { themeColor = "#ff00ff"; status = "FRÉQUENCE STABLE"; }
      else { themeColor = "#ff4400"; status = "SIGNAL FAIBLE"; }

      ctx.fillStyle = "#030303";
      ctx.fillRect(0, 0, 1200, 900);
      const bgGrad = ctx.createRadialGradient(600, 450, 0, 600, 450, 900);
      bgGrad.addColorStop(0, "rgba(10, 30, 20, 1)");
      bgGrad.addColorStop(1, "#000000");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, 1200, 900);

      const token = "6628568379%7Cc1e620fa708a1d5696fb991c1bde5662";
      const av1 = await loadImage(`https://graph.facebook.com/${user1}/picture?width=512&height=512&access_token=${token}`);
      const av2 = await loadImage(`https://graph.facebook.com/${user2}/picture?width=512&height=512&access_token=${token}`);

      const drawAvatar = (img, x) => {
        ctx.save();
        ctx.shadowBlur = 50;
        ctx.shadowColor = themeColor;
        ctx.beginPath();
        ctx.arc(x, 320, 150, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(img, x - 150, 320 - 150, 300, 300);
        ctx.restore();
        ctx.strokeStyle = themeColor;
        ctx.lineWidth = 2;
        ctx.stroke();
      };

      drawAvatar(av1, 280);
      drawAvatar(av2, 920);
      drawHeart(ctx, 600, 280, 140, themeColor, 1, true);
      drawWaveform(ctx, 400, 780, 400, 60, themeColor, lovePercent);

      ctx.textAlign = "center";
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 120px monospace";
      ctx.fillText(`${lovePercent}%`, 600, 520);

      drawDigitalBar(ctx, 250, 560, 700, 40, lovePercent, themeColor);

      ctx.font = "bold 60px monospace";
      ctx.fillStyle = themeColor;
      ctx.letterSpacing = "10px";
      ctx.fillText(status, 600, 720);

      ctx.font = "16px monospace";
      ctx.fillStyle = "rgba(255,255,255,0.2)";
      ctx.fillText(`ANALYSE_BIO_RYTHME: RUNNING...`, 600, 860);

      const filePath = path.join(__dirname, `cupidon_v12_${Date.now()}.png`);
      fs.writeFileSync(filePath, canvas.toBuffer());

      await message.reply({
        body: `⚡ **CUPIDON** 𝗔𝗡𝗔𝗟𝗬𝗦𝗜𝗦\n────────────────\nVerdict : ${status}\nCompatibilité : ${lovePercent}%`,
        attachment: fs.createReadStream(filePath)
      });

      fs.unlinkSync(filePath);

    } catch (error) {
      console.error(error);
      message.reply("Erreur : Impossible de récupérer les profils. Réessaie en répondant au message de la personne.");
    }
  }
};
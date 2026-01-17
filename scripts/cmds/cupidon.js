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

function drawECG(ctx, x, y, w, h, color, bpm) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x, y);
  const segments = 10;
  const speed = bpm / 60;
  for (let i = 0; i < w; i += 20) {
    let dy = 0;
    if (i % 60 === 0) dy = -h * speed;
    else if (i % 60 === 10) dy = h * 0.5;
    ctx.lineTo(x + i, y + dy);
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
  }
  ctx.restore();
}

module.exports = {
  config: {
    name: "cupidon",
    version: "13.0",
    author: "Sømå Sønïč x Gemini",
    role: 0,
    category: "game",
    shortDescription: { fr: "Analyse cybernétique de compatibilité amoureuse" }
  },

  onStart: async function({ message, event, api }) {
    const { threadID, senderID, body } = event;
    const mentions = event.mentions || {};
    
    let user2;
    const mentionKeys = Object.keys(mentions);
    
    if (mentionKeys.length > 0) {
      user2 = mentionKeys[0];
    } else if (event.messageReply) {
      user2 = event.messageReply.senderID;
    } else if (body && body.match(/\d{8,}/)) {
      user2 = body.match(/\d{8,}/)[0];
    } else {
      const threadInfo = await api.getThreadInfo(threadID);
      const members = threadInfo.participantIDs.filter(id => id !== senderID);
      if (members.length === 0) {
        return message.reply("𝗠𝗲𝗻𝘁𝗶𝗼𝗻𝗻𝗲 𝗹𝗮 𝗽𝗲𝗿𝘀𝗼𝗻𝗻𝗲 𝗼𝘂 𝗿𝗲́𝗽𝗼𝗻𝗱𝘀 𝗮̀ 𝘀𝗼𝗻 𝗺𝗲𝘀𝘀𝗮𝗴𝗲 💝");
      }
      user2 = members[Math.floor(Math.random() * members.length)];
      await message.reply("🔍 Aucun signal cible... Scan du réseau pour trouver un partenaire aléatoire...");
    }

    try {
      const info1 = await api.getUserInfo(senderID);
      const info2 = await api.getUserInfo(user2);
      
      const lovePercent = Math.floor(Math.random() * 101);
      const bpm = 60 + Math.floor((lovePercent / 100) * 100);

      let themeColor, status;
      if (lovePercent >= 85) { themeColor = "#00ff88"; status = "FUSION QUANTIQUE"; }
      else if (lovePercent >= 60) { themeColor = "#ff00ff"; status = "SURCHAUFFE CIRCUIT"; }
      else if (lovePercent >= 30) { themeColor = "#00ccff"; status = "RÉSEAU SÉCURISÉ"; }
      else { themeColor = "#ff4400"; status = "SYSTÈME INCOMPATIBLE"; }

      const canvas = createCanvas(1200, 900);
      const ctx = canvas.getContext("2d");

      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, 1200, 900);
      
      ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
      for(let i=0; i<1200; i+=50) { ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i,900); ctx.stroke(); }
      for(let i=0; i<900; i+=50) { ctx.beginPath(); ctx.moveTo(0,i); ctx.lineTo(1200,i); ctx.stroke(); }

      const token = "6628568379%7Cc1e620fa708a1d5696fb991c1bde5662";
      const av1 = await loadImage(`https://graph.facebook.com/${senderID}/picture?width=512&height=512&access_token=${token}`);
      const av2 = await loadImage(`https://graph.facebook.com/${user2}/picture?width=512&height=512&access_token=${token}`);

      const drawAvatar = (img, x) => {
        ctx.save();
        ctx.shadowBlur = 40; ctx.shadowColor = themeColor;
        ctx.beginPath(); ctx.arc(x, 320, 150, 0, Math.PI * 2); ctx.clip();
        ctx.drawImage(img, x - 150, 320 - 150, 300, 300);
        ctx.restore();
        ctx.strokeStyle = themeColor; ctx.lineWidth = 5; ctx.stroke();
      };

      drawAvatar(av1, 280);
      drawAvatar(av2, 920);

      drawHeart(ctx, 600, 280, 140, themeColor, 1, true);
      drawECG(ctx, 400, 750, 400, 50, themeColor, bpm);

      ctx.textAlign = "center";
      ctx.fillStyle = "#fff";
      ctx.font = "bold 130px monospace";
      ctx.fillText(`${lovePercent}%`, 600, 520);
      
      ctx.font = "bold 40px monospace";
      ctx.fillText(`${bpm} BPM`, 600, 810);

      drawDigitalBar(ctx, 250, 560, 700, 40, lovePercent, themeColor);

      ctx.font = "bold 60px monospace";
      ctx.fillStyle = themeColor;
      ctx.fillText(status, 600, 700);

      ctx.textAlign = "left";
      ctx.font = "14px monospace";
      ctx.fillStyle = themeColor;
      ctx.fillText(`> USER1_HASH: ${senderID.substring(0,10)}...`, 50, 830);
      ctx.fillText(`> USER2_HASH: ${user2.substring(0,10)}...`, 50, 850);
      ctx.fillText(`> SYNC_STATUS: OK`, 50, 870);
      
      ctx.textAlign = "right";
      ctx.fillText(`OS_VER: 13.0_PULSE`, 1150, 850);
      ctx.fillText(`ENCRYPTION: AES-256`, 1150, 870);

      const filePath = path.join(__dirname, `cupidon_${Date.now()}.png`);
      fs.writeFileSync(filePath, canvas.toBuffer());

      await message.reply({
        body: `💘 **CUPIDON PULSE V13**\n━━━━━━━━━━━━━━━\n👤 **Cible** : ${info2[user2].name}\n📈 **Compatibilité** : ${lovePercent}%\n💓 **Rythme** : ${bpm} BPM\n🛡️ **Verdict** : ${status}`,
        attachment: fs.createReadStream(filePath)
      });

      fs.unlinkSync(filePath);
    } catch (e) {
      console.error(e);
      message.reply("❌ Erreur de synchronisation des données biométriques.");
    }
  }
};
const { createCanvas, loadImage } = require("canvas");
const fs = require("fs");
const path = require("path");

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawHeart(ctx, x, y, size, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.shadowBlur = 20;
  ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
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

module.exports = {
  config: {
    name: "cupidon",
    version: "5.0",
    author: "Sømå Sønïč",
    role: 0,
    shortDescription: { en: "🖤💘 Cupidon Ultra-Réaliste" },
    guide: { en: "{p}cupidon @tag" },
  },

  onStart: async function({ message, event, api }) {
    const mentions = Object.keys(event.mentions);
    if (!mentions.length) return message.reply("𝗠𝗲𝗻𝘁𝗶𝗼𝗻𝗻𝗲 𝗹𝗮 𝗽𝗲𝗿𝘀𝗼𝗻𝗻𝗲 💝");

    try {
      const user1 = event.senderID;
      const user2 = mentions[0];

      const info1 = await api.getUserInfo(user1);
      const info2 = await api.getUserInfo(user2);
      const name1 = info1[user1].name.toUpperCase();
      const name2 = info2[user2].name.toUpperCase();

      const lovePercent = Math.floor(Math.random() * 101);
      const canvas = createCanvas(1200, 650);
      const ctx = canvas.getContext("2d");

      const mainGrad = ctx.createLinearGradient(0, 0, 0, 650);
      mainGrad.addColorStop(0, "#0a0a0b");
      mainGrad.addColorStop(0.5, "#160a0a");
      mainGrad.addColorStop(1, "#050505");
      ctx.fillStyle = mainGrad;
      ctx.fillRect(0, 0, 1200, 650);

      const vignette = ctx.createRadialGradient(600, 325, 100, 600, 325, 700);
      vignette.addColorStop(0, "rgba(0,0,0,0)");
      vignette.addColorStop(1, "rgba(0,0,0,0.8)");
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, 1200, 650);

      const token = "6628568379%7Cc1e620fa708a1d5696fb991c1bde5662";
      const av1 = await loadImage(`https://graph.facebook.com/${user1}/picture?width=512&height=512&access_token=${token}`);
      const av2 = await loadImage(`https://graph.facebook.com/${user2}/picture?width=512&height=512&access_token=${token}`);

      const renderProfile = (img, x, themeColor) => {
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, 280, 145, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.05)";
        ctx.fill();

        ctx.beginPath();
        ctx.arc(x, 280, 135, 0, Math.PI * 2);
        ctx.lineWidth = 2;
        ctx.strokeStyle = themeColor;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(x, 280, 125, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(img, x - 125, 280 - 125, 250, 250);
        
        const overlay = ctx.createLinearGradient(x, 155, x, 405);
        overlay.addColorStop(0, "rgba(0,0,0,0.2)");
        overlay.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = overlay;
        ctx.fill();
        ctx.restore();
      };

      renderProfile(av1, 300, "#6b0f0f");
      renderProfile(av2, 900, "#d4af37");

      const centerX = 600, centerY = 280;
      
      ctx.beginPath();
      ctx.arc(centerX, centerY, 90, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255,255,255,0.05)";
      ctx.lineWidth = 10;
      ctx.stroke();

      const angle = (lovePercent / 100) * (Math.PI * 2);
      ctx.beginPath();
      ctx.arc(centerX, centerY, 90, -Math.PI/2, -Math.PI/2 + angle);
      ctx.strokeStyle = lovePercent > 70 ? "#d4af37" : "#8b0000";
      ctx.lineWidth = 12;
      ctx.lineCap = "round";
      ctx.stroke();

      drawHeart(ctx, centerX, centerY - 20, 45, lovePercent > 70 ? "#d4af37" : "#8b0000");

      ctx.textAlign = "center";
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 55px sans-serif";
      ctx.shadowBlur = 10;
      ctx.shadowColor = "rgba(0,0,0,0.5)";
      ctx.fillText(`${lovePercent}%`, centerX, centerY + 30);

      ctx.font = "28px sans-serif";
      ctx.letterSpacing = "4px";
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      ctx.fillText(name1, 300, 480);
      ctx.fillText(name2, 900, 480);

      const barW = 500, barH = 4, barX = 350, barY = 550;
      ctx.fillStyle = "rgba(255,255,255,0.1)";
      ctx.fillRect(barX, barY, barW, barH);
      ctx.fillStyle = "#d4af37";
      ctx.fillRect(barX, barY, (lovePercent/100) * barW, barH);

      const status = lovePercent > 85 ? "DESTINÉS" : lovePercent > 50 ? "PASSIONNÉS" : "ÉPHÉMÈRE";
      ctx.font = "bold 20px sans-serif";
      ctx.letterSpacing = "8px";
      ctx.fillStyle = "#d4af37";
      ctx.fillText(status, centerX, 600);

      const filePath = path.join(__dirname, `cupidon_realiste_${Date.now()}.png`);
      fs.writeFileSync(filePath, canvas.toBuffer());

      await message.reply({
        body: `🌑 𝗖𝗨𝗣𝗜𝗗𝗢𝗡 𝗧𝗘𝗦𝗧 🌕 \n────────────────\n📍| 𝗣𝗥𝗢𝗕𝗔𝗕𝗜𝗟𝗜𝗧𝗬 : ${lovePercent}%\n👥| 𝗘́𝘁𝗮𝘁 : ${status}`,
        attachment: fs.createReadStream(filePath)
      });
      
      fs.unlinkSync(filePath);

    } catch (error) {
      console.error(error);
      message.reply("Une erreur technique est survenue.");
    }
  }
};
const fs = require("fs");
const { createCanvas, loadImage } = require("canvas");
const axios = require("axios");

module.exports = {
  config: {
    name: "balance",
    aliases: ["bal"],
    version: "1.3",
    author: "NTKhang,updated by Itachi Soma",
    countDown: 5,
    role: 0,
    description: {
      vi: "xem số tiền hiện có của bạn hoặc người được tag",
      en: "view your money or the money of the tagged person"
    },
    category: "economy",
    guide: {
      vi: "   {pn}: xem số tiền của bạn"
        + "\n   {pn} <@tag>: xem số tiền của người được tag",
      en: "   {pn}: view your money"
        + "\n   {pn} <@tag>: view the money of the tagged person"
    }
  },

  langs: {
    vi: {
      money: "Bạn đang có %1$",
      moneyOf: "%1 đang có %2$"
    },
    en: {
      money: "You have %1$",
      moneyOf: "%1 has %2$"
    }
  },

  onStart: async function ({ message, usersData, event, getLang, api }) {
    const API_URL = "https://bank-save-production.up.railway.app/api/bank";
    
    function formatNumber(num) {
      if (num >= 1000000000000) {
        return (num / 1000000000000).toFixed(1).replace(/\.0$/, '') + 'T';
      }
      if (num >= 1000000000) {
        return (num / 1000000000).toFixed(1).replace(/\.0$/, '') + 'B';
      }
      if (num >= 1000000) {
        return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
      }
      if (num >= 1000) {
        return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
      }
      return num.toString();
    }

    async function getUserBankData(userId) {
      try {
        const response = await axios.get(`${API_URL}/${userId}`);
        if (response.data.success) return response.data.data;
      } catch (error) {
        console.error("API Error:", error);
      }
      return { bank: 0, card: null };
    }

    async function generateBalanceCard(userInfo, bankData, cashMoney) {
      const canvas = createCanvas(800, 400);
      const ctx = canvas.getContext("2d");
      
      const gradient = ctx.createLinearGradient(0, 0, 800, 400);
      gradient.addColorStop(0, "#0a0a1a");
      gradient.addColorStop(0.3, "#1a1a3e");
      gradient.addColorStop(0.7, "#16213e");
      gradient.addColorStop(1, "#0f3460");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 800, 400);
      
      ctx.strokeStyle = "#d4af37";
      ctx.lineWidth = 4;
      ctx.strokeRect(8, 8, 784, 384);
      
      ctx.fillStyle = "#d4af37";
      ctx.font = "bold 24px 'Courier New'";
      ctx.fillText("UCHIWA BANK", 30, 55);
      ctx.font = "12px 'Courier New'";
      ctx.fillStyle = "#aaa";
      ctx.fillText("PREMIUM CARD", 30, 75);
      
      ctx.fillStyle = "#d4af37";
      ctx.fillRect(720, 30, 50, 35);
      ctx.fillStyle = "#b8960c";
      ctx.fillRect(724, 34, 42, 27);
      
      ctx.fillStyle = "#2c2c2c";
      ctx.fillRect(10, 90, 780, 6);
      
      ctx.fillStyle = "rgba(255, 255, 255, 0.03)";
      ctx.fillRect(20, 110, 340, 260);
      
      ctx.beginPath();
      ctx.arc(190, 200, 70, 0, Math.PI * 2);
      ctx.strokeStyle = "#d4af37";
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = "#d4af37";
      ctx.font = "bold 12px 'Courier New'";
      ctx.fillText("PROFIL", 155, 290);
      
      try {
        const avatarUrl = userInfo.thumbSrc || userInfo.profileUrl || `https://graph.facebook.com/${userInfo.userID}/picture?width=200&height=200`;
        const avatar = await loadImage(avatarUrl);
        ctx.save();
        ctx.beginPath();
        ctx.arc(190, 200, 65, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatar, 125, 135, 130, 130);
        ctx.restore();
        ctx.beginPath();
        ctx.arc(190, 200, 65, 0, Math.PI * 2);
        ctx.strokeStyle = "#d4af37";
        ctx.lineWidth = 3;
        ctx.stroke();
      } catch (error) {
        ctx.fillStyle = "#fff";
        ctx.font = "bold 14px 'Courier New'";
        ctx.fillText("👤", 180, 210);
      }
      
      ctx.fillStyle = "#fff";
      ctx.font = "bold 16px 'Courier New'";
      const displayName = userInfo.name.length > 20 ? userInfo.name.substring(0, 18) + "..." : userInfo.name;
      ctx.fillText(displayName, 30, 320);
      ctx.fillStyle = "#aaa";
      ctx.font = "12px 'Courier New'";
      ctx.fillText("TITULAIRE", 30, 340);
      
      ctx.fillStyle = "#fff";
      ctx.font = "bold 12px 'Courier New'";
      ctx.fillText(`ID: ${userInfo.userID}`, 30, 365);
      
      ctx.fillStyle = "#d4af37";
      ctx.font = "bold 18px 'Courier New'";
      ctx.fillText("INFORMATIONS BANCAIRES", 390, 140);
      
      ctx.fillStyle = "#fff";
      ctx.font = "bold 14px 'Courier New'";
      ctx.fillText("N° Carte:", 390, 180);
      const cardNumber = bankData.card?.cardNumber || "**** **** **** ****";
      ctx.fillStyle = "#e0e0e0";
      ctx.font = "18px 'Courier New'";
      ctx.fillText(cardNumber, 520, 180);
      
      ctx.fillStyle = "#fff";
      ctx.font = "bold 14px 'Courier New'";
      ctx.fillText("Expiration:", 390, 215);
      const cardExpiry = bankData.card?.cardExpiry || "**/**";
      ctx.fillStyle = "#e0e0e0";
      ctx.fillText(cardExpiry, 520, 215);
      
      ctx.fillStyle = "#fff";
      ctx.font = "bold 14px 'Courier New'";
      ctx.fillText("CVV:", 390, 250);
      ctx.fillStyle = "#e0e0e0";
      ctx.fillText("***", 520, 250);
      
      ctx.fillStyle = "#fff";
      ctx.font = "bold 14px 'Courier New'";
      ctx.fillText("Solde Bancaire:", 390, 285);
      const bankBalance = bankData.bank || 0;
      ctx.fillStyle = "#00ff88";
      ctx.font = "bold 18px 'Courier New'";
      ctx.fillText(`${formatNumber(bankBalance)}$`, 560, 285);
      
      ctx.fillStyle = "#fff";
      ctx.font = "bold 14px 'Courier New'";
      ctx.fillText("Argent Liquide:", 390, 320);
      ctx.fillStyle = "#ffd700";
      ctx.font = "bold 18px 'Courier New'";
      ctx.fillText(`${formatNumber(cashMoney)}$`, 560, 320);
      
      ctx.fillStyle = "#fff";
      ctx.font = "bold 14px 'Courier New'";
      ctx.fillText("Total:", 390, 355);
      const totalMoney = bankBalance + cashMoney;
      ctx.fillStyle = "#d4af37";
      ctx.font = "bold 20px 'Courier New'";
      ctx.fillText(`${formatNumber(totalMoney)}$`, 560, 355);
      
      const date = new Date();
      const dateStr = `${date.getDate()}/${date.getMonth()+1}/${date.getFullYear()}`;
      ctx.fillStyle = "#666";
      ctx.font = "10px 'Courier New'";
      ctx.fillText(dateStr, 30, 385);
      
      ctx.fillStyle = "#d4af37";
      ctx.font = "bold 12px 'Courier New'";
      ctx.fillText("💰", 750, 385);
      
      return canvas.toBuffer();
    }

    if (Object.keys(event.mentions).length > 0) {
      const uids = Object.keys(event.mentions);
      for (const uid of uids) {
        const userMoney = await usersData.get(uid, "money");
        const userInfo = await api.getUserInfo(uid);
        const bankData = await getUserBankData(uid);
        const username = userInfo[uid]?.name || event.mentions[uid].replace("@", "");
        
        const img = await generateBalanceCard(
          { userID: uid, name: username, thumbSrc: userInfo[uid]?.thumbSrc },
          bankData,
          userMoney
        );
        
        const imgPath = `./balance_${uid}.png`;
        fs.writeFileSync(imgPath, img);
        
        const textMsg = getLang("moneyOf", username, formatNumber(userMoney));
        await message.reply({
          body: textMsg,
          attachment: fs.createReadStream(imgPath)
        });
        
        fs.unlinkSync(imgPath);
      }
      return;
    }
    
    const uid = event.senderID;
    const userMoney = await usersData.get(uid, "money");
    const userInfo = await api.getUserInfo(uid);
    const bankData = await getUserBankData(uid);
    const username = userInfo[uid]?.name || "Utilisateur";
    
    const img = await generateBalanceCard(
      { userID: uid, name: username, thumbSrc: userInfo[uid]?.thumbSrc },
      bankData,
      userMoney
    );
    
    const imgPath = `./balance_${uid}.png`;
    fs.writeFileSync(imgPath, img);
    
    const textMsg = getLang("money", formatNumber(userMoney));
    await message.reply({
      body: textMsg,
      attachment: fs.createReadStream(imgPath)
    });
    
    fs.unlinkSync(imgPath);
  }
};
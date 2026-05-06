const fs = require("fs");
const { createCanvas, loadImage } = require("canvas");
const axios = require("axios");

const CASH_API_URL = "https://cash-api-five.vercel.app/api/cash";
const BANK_API_URL = "https://bank-save-production.up.railway.app/api/bank";
const CONVERT_API_URL = "https://numbers-conversion.vercel.app/api/parse";

function toBigInt(value) {
  if (typeof value === 'bigint') return value;
  if (value === undefined || value === null) return 0n;
  try {
    return BigInt(String(value));
  } catch {
    return 0n;
  }
}

function formatBigInt(num) {
  if (num === 0n) return "0";
  const suffixes = ["", "k", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No", "Dc"];
  let i = 0;
  let scaled = num;
  const thousand = 1000n;
  while (scaled >= thousand && i < suffixes.length - 1) {
    scaled = scaled / thousand;
    i++;
  }
  const integerPart = scaled;
  const remainder = (num % (thousand ** BigInt(i))) / (thousand ** BigInt(i - 1));
  if (remainder > 0n) {
    return `${integerPart}.${remainder}${suffixes[i]}`;
  }
  return `${integerPart}${suffixes[i]}`;
}

async function formatNumberWithAPI(num) {
  try {
    const response = await axios.get(`${CONVERT_API_URL}?number=${num.toString()}`);
    if (response.data && response.data.success) return response.data.formatted;
  } catch (error) {
    console.error("Convert API Error:", error.message);
  }
  return formatBigInt(toBigInt(num));
}

module.exports = {
  config: {
    name: "balance",
    aliases: ["bal"],
    version: "2.4",
    author: "NTKhang, updated by Itachi Soma",
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

  onStart: async function ({ message, event, getLang, api, usersData }) {

    async function getUsername(uid) {
      try {
        const info = await api.getUserInfo(uid);
        const name = info?.name || info?.[uid]?.name;
        if (name && name !== uid && name !== "Facebook User" && !name.startsWith("User_")) {
          return name;
        }
      } catch (e) {}
      try {
        const localName = await usersData.getName(uid);
        if (localName && localName !== uid && localName !== "Facebook User") {
          return localName;
        }
      } catch (e) {}
      return `User_${String(uid).slice(-5)}`;
    }

    async function getUserCash(userId) {
      try {
        const response = await axios.get(`${CASH_API_URL}/${userId}`);
        if (response.data.success) {
          const cashStr = response.data.data.cash; 
          return toBigInt(cashStr);
        }
      } catch (error) {
        console.error("Cash API Error:", error.message);
      }
      return 0n;
    }

    async function getUserBankData(userId) {
      try {
        const response = await axios.get(`${BANK_API_URL}/${userId}`);
        if (response.data.success) {
          const bankStr = response.data.data.bank; // string
          return {
            bank: toBigInt(bankStr || "0"),
            card: response.data.data.card || null
          };
        }
      } catch (error) {
        console.error("Bank API Error:", error.message);
      }
      return { bank: 0n, card: null };
    }

    async function generateBalanceCard(userInfo, bankData, cashMoney) {
      const canvas = createCanvas(540, 340);
      const ctx = canvas.getContext("2d");

      const gradient = ctx.createLinearGradient(0, 0, 540, 340);
      gradient.addColorStop(0, "#0a0a1a");
      gradient.addColorStop(0.3, "#1a1a2e");
      gradient.addColorStop(0.7, "#16213e");
      gradient.addColorStop(1, "#0f3460");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 540, 340);

      ctx.strokeStyle = "#d4af37";
      ctx.lineWidth = 3;
      ctx.strokeRect(6, 6, 528, 328);

      ctx.fillStyle = "#d4af37";
      ctx.font = "bold 22px 'Courier New'";
      ctx.fillText("UCHIWA BANK", 25, 55);
      ctx.font = "11px 'Courier New'";
      ctx.fillStyle = "#aaa";
      ctx.fillText("PREMIUM CARD", 25, 75);

      // Avatar
      try {
        const avatarUrl = userInfo.thumbSrc || `https://graph.facebook.com/${userInfo.userID}/picture?width=100&height=100`;
        const avatar = await loadImage(avatarUrl);
        ctx.save();
        ctx.beginPath();
        ctx.arc(470, 48, 28, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatar, 442, 20, 56, 56);
        ctx.restore();
        ctx.beginPath();
        ctx.arc(470, 48, 28, 0, Math.PI * 2);
        ctx.strokeStyle = "#d4af37";
        ctx.lineWidth = 2;
        ctx.stroke();
      } catch (error) {
        ctx.fillStyle = "#d4af37";
        ctx.beginPath();
        ctx.moveTo(455, 30);
        ctx.lineTo(485, 30);
        ctx.quadraticCurveTo(495, 30, 495, 40);
        ctx.quadraticCurveTo(495, 66, 470, 72);
        ctx.quadraticCurveTo(445, 66, 445, 40);
        ctx.quadraticCurveTo(445, 30, 455, 30);
        ctx.fill();
      }

      ctx.fillStyle = "#d4af37";
      ctx.fillRect(25, 95, 50, 40);

      const cardNumberStr = bankData.card?.cardNumber || "4532 **** **** 5772";
      ctx.fillStyle = "#e0e0e0";
      ctx.font = "22px 'Courier New'";
      ctx.fillText(cardNumberStr, 90, 125);

      ctx.fillStyle = "#aaa";
      ctx.font = "11px 'Courier New'";
      ctx.fillText("VALID THRU", 25, 160);
      ctx.fillStyle = "#e0e0e0";
      ctx.font = "16px 'Courier New'";
      const cardExpiry = bankData.card?.cardExpiry || "**/**";
      ctx.fillText(cardExpiry, 120, 160);

      ctx.fillStyle = "#d4af37";
      ctx.font = "bold 18px 'Courier New'";
      ctx.fillText("CARTE BANCAIRE", 210, 165);

      ctx.fillStyle = "#aaa";
      ctx.font = "11px 'Courier New'";
      ctx.fillText("CVV", 430, 160);
      ctx.fillText("2002", 430, 180);

      const cardHolder = userInfo.name.length > 20 ? userInfo.name.substring(0, 18) + "..." : userInfo.name;
      ctx.fillStyle = "#e0e0e0";
      ctx.font = "bold 16px 'Courier New'";
      ctx.fillText(cardHolder.toUpperCase(), 25, 210);

      ctx.fillStyle = "#aaa";
      ctx.font = "11px 'Courier New'";
      ctx.fillText("TITULAIRE", 25, 230);

      ctx.fillStyle = "#e0e0e0";
      ctx.font = "12px 'Courier New'";
      ctx.fillText(`ID: ${userInfo.userID}`, 25, 255);

      ctx.fillStyle = "#d4af37";
      ctx.font = "bold 14px 'Courier New'";
      ctx.fillText("SOLDES", 290, 230);

      const bankBalance = bankData.bank;
      const formattedBank = await formatNumberWithAPI(bankBalance);
      const formattedCash = await formatNumberWithAPI(cashMoney);
      const formattedTotal = await formatNumberWithAPI(bankBalance + cashMoney);

      ctx.fillStyle = "#00ff88";
      ctx.font = "bold 14px 'Courier New'";
      ctx.fillText(`Bancaire`, 290, 262);
      ctx.fillStyle = "#00ff88";
      ctx.fillText(`${formattedBank}$`, 450, 262);

      ctx.fillStyle = "#ffd700";
      ctx.font = "bold 14px 'Courier New'";
      ctx.fillText(`Liquide`, 290, 290);
      ctx.fillStyle = "#ffd700";
      ctx.fillText(`${formattedCash}$`, 450, 290);

      ctx.fillStyle = "#d4af37";
      ctx.font = "bold 14px 'Courier New'";
      ctx.fillText(`Total`, 290, 320);
      ctx.fillStyle = "#d4af37";
      ctx.fillText(`${formattedTotal}$`, 450, 320);

      const date = new Date();
      const dateStr = `${date.getDate()}/${date.getMonth()+1}/${date.getFullYear()}`;
      ctx.fillStyle = "#666";
      ctx.font = "9px 'Courier New'";
      ctx.fillText(dateStr, 450, 328);

      return canvas.toBuffer();
    }

    if (Object.keys(event.mentions).length > 0) {
      const uids = Object.keys(event.mentions);
      for (const uid of uids) {
        const userMoney = await getUserCash(uid);
        const bankData = await getUserBankData(uid);
        const username = await getUsername(uid);

        let userInfoRaw = {};
        try {
          userInfoRaw = await api.getUserInfo(uid);
        } catch(e) {}
        const thumbSrc = userInfoRaw?.[uid]?.thumbSrc || userInfoRaw?.thumbSrc;

        const img = await generateBalanceCard(
          { userID: uid, name: username, thumbSrc },
          bankData,
          userMoney
        );

        const imgPath = `./balance_${uid}.png`;
        fs.writeFileSync(imgPath, img);

        const formattedMoney = await formatNumberWithAPI(userMoney);
        await message.reply({
          body: getLang("moneyOf", username, formattedMoney),
          attachment: fs.createReadStream(imgPath)
        });

        fs.unlinkSync(imgPath);
      }
      return;
    }

    const uid = event.senderID;
    const userMoney = await getUserCash(uid);
    const bankData = await getUserBankData(uid);
    const username = await getUsername(uid);

    let userInfoRaw = {};
    try {
      userInfoRaw = await api.getUserInfo(uid);
    } catch(e) {}
    const thumbSrc = userInfoRaw?.[uid]?.thumbSrc || userInfoRaw?.thumbSrc;

    const img = await generateBalanceCard(
      { userID: uid, name: username, thumbSrc },
      bankData,
      userMoney
    );

    const imgPath = `./balance_${uid}.png`;
    fs.writeFileSync(imgPath, img);

    const formattedMoney = await formatNumberWithAPI(userMoney);
    await message.reply({
      body: getLang("money", formattedMoney),
      attachment: fs.createReadStream(imgPath)
    });

    fs.unlinkSync(imgPath);
  }
};
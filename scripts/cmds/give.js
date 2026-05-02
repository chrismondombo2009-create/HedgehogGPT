const fs = require("fs");
const { createCanvas, loadImage } = require("canvas");
const axios = require("axios");

const CONVERT_API_URL = "https://numbers-conversion.vercel.app/api/parse";
const CASH_API_URL = "https://cash-api-five.vercel.app/api/cash";

async function getUserCash(userId) {
    try {
        const response = await axios.get(`${CASH_API_URL}/${userId}`);
        if (response.data.success) return response.data.data.cash;
    } catch (error) {
        console.error("Cash API Error:", error.message);
    }
    return 0;
}

async function updateUserCash(userId, amount) {
    try {
        if (amount >= 0) {
            await axios.post(`${CASH_API_URL}/${userId}/add`, { amount });
        } else {
            await axios.post(`${CASH_API_URL}/${userId}/subtract`, { amount: Math.abs(amount) });
        }
    } catch (error) {
        console.error("Cash API Update Error:", error.message);
    }
}

module.exports = {
    config: {
        name: "give",
        version: "3.1",
        author: "Itachi Soma",
        countDown: 5,
        role: 0,
        category: "economy"
    },

    onStart: async function ({ args, message, event, api }) {
        const { senderID, messageReply } = event;

        let targetID;
        let targetName;

        if (messageReply) {
            targetID = messageReply.senderID;
            const targetInfo = await api.getUserInfo(targetID);
            targetName = targetInfo[targetID]?.name || "cet utilisateur";
        } else if (Object.keys(event.mentions).length > 0) {
            targetID = Object.keys(event.mentions)[0];
            targetName = event.mentions[targetID];
        } else {
            return message.reply(
`❌ 𝐂𝐨𝐦𝐦𝐞𝐧𝐭 𝐝𝐨𝐧𝐧𝐞𝐫 ?
━━━━━━━━━━━━━━━━
📝 2 𝐟𝐚ç𝐨𝐧𝐬 :

💬 !give @user 5000
   → Mentionne la personne

💬 !give 5000 (en répondant)
   → Réponds à son message
━━━━━━━━━━━━━━━━
📝 Exemples :
1k = 1 000
2.5k = 2 500
1M = 1 000 000
1B = 1 000 000 000
1T = 1 000 000 000 000
all = tout ton argent`
            );
        }

        if (targetID === senderID) {
            return message.reply(`❌ 𝐓𝐮 𝐧𝐞 𝐩𝐞𝐮𝐱 𝐩𝐚𝐬 𝐭𝐞 𝐝𝐨𝐧𝐧𝐞𝐫 𝐚̀ 𝐭𝐨𝐢-𝐦𝐞̂𝐦𝐞`);
        }

        if (!args[0]) {
            return message.reply(`❌ 𝐌𝐨𝐧𝐭𝐚𝐧𝐭 𝐦𝐚𝐧𝐪𝐮𝐚𝐧𝐭`);
        }

        const senderMoney = await getUserCash(senderID);
        const targetMoney = await getUserCash(targetID);

        let amountInput = args[0].toLowerCase();
        let amount;

        if (amountInput === "all") {
            amount = senderMoney;
        } else {
            const parsed = await parseAmountWithAPI(amountInput);
            if (parsed === null || isNaN(parsed)) {
                return message.reply(`❌ 𝐌𝐨𝐧𝐭𝐚𝐧𝐭 𝐢𝐧𝐯𝐚𝐥𝐢𝐝𝐞`);
            }
            amount = parsed;
        }

        if (isNaN(amount) || amount <= 0) {
            return message.reply(`❌ 𝐌𝐨𝐧𝐭𝐚𝐧𝐭 𝐢𝐧𝐯𝐚𝐥𝐢𝐝𝐞`);
        }

        if (amount > senderMoney) {
            return message.reply(
`❌ 𝐅𝐨𝐧𝐝𝐬 𝐢𝐧𝐬𝐮𝐟𝐟𝐢𝐬𝐚𝐧𝐭𝐬
━━━━━━━━━━━━━━━━
💰 𝐓𝐨𝐧 𝐬𝐨𝐥𝐝𝐞 : ${formatNumber(senderMoney)}$
🎁 𝐌𝐨𝐧𝐭𝐚𝐧𝐭 : ${formatNumber(amount)}$`
            );
        }

        await updateUserCash(senderID, -amount);
        await updateUserCash(targetID, amount);

        const newSenderMoney = await getUserCash(senderID);
        const formattedAmount = formatNumber(amount);

        const icons = ["🎁", "💝", "💸", "🤝", "🎉", "💎", "✨", "🌟"];
        const randomIcon = icons[Math.floor(Math.random() * icons.length)];

        const senderInfo = await api.getUserInfo(senderID);
        const senderName = senderInfo[senderID].name;

        const targetInfo = await api.getUserInfo(targetID);
        const targetRealName = targetInfo[targetID].name;

        await message.reply(
`${randomIcon} 𝐓𝐑𝐀𝐍𝐒𝐅𝐄𝐑𝐓 𝐑𝐄́𝐔𝐒𝐒𝐈 ${randomIcon}
━━━━━━━━━━━━━━━━
💸 ${formattedAmount}$ → ${targetName}
━━━━━━━━━━━━━━━━
💰 𝐍𝐨𝐮𝐯𝐞𝐚𝐮 𝐬𝐨𝐥𝐝𝐞 : ${formatNumber(newSenderMoney)}$`
        );

        try {
            const senderAvatarUrl = senderInfo[senderID].thumbSrc || `https://graph.facebook.com/${senderID}/picture?width=200&height=200`;
            const targetAvatarUrl = targetInfo[targetID].thumbSrc || `https://graph.facebook.com/${targetID}/picture?width=200&height=200`;
            
            const transferImage = await generateTransferImage(
                senderName,
                targetRealName,
                formattedAmount,
                randomIcon,
                senderAvatarUrl,
                targetAvatarUrl
            );
            const imgPath = `./transfer_${senderID}_${targetID}.png`;
            fs.writeFileSync(imgPath, transferImage);
            await message.reply({
                body: "💳 𝐑𝐞𝐜̧𝐮 𝐝𝐮 𝐭𝐫𝐚𝐧𝐬𝐟𝐞𝐫𝐭 :",
                attachment: fs.createReadStream(imgPath)
            });
            fs.unlinkSync(imgPath);
        } catch (error) {
            console.error("Erreur generation image:", error);
        }
    }
};

async function parseAmountWithAPI(input) {
    try {
        const response = await axios.get(`${CONVERT_API_URL}?input=${encodeURIComponent(input)}`);
        if (response.data.success && typeof response.data.result === 'number') {
            return response.data.result;
        }
    } catch (error) {
        console.error("API conversion échouée, utilisation du parseur local:", error.message);
    }
    
    const str = input.toString().toLowerCase().replace(/\s/g, '');
    const suffixes = {
        'k': 1000n,
        'm': 1000000n,
        'b': 1000000000n,
        't': 1000000000000n,
        'q': 1000000000000000n,
        'Q': 1000000000000000000n,
        's': 1000000000000000000000n,
        'S': 1000000000000000000000000n,
        'o': 1000000000000000000000000000n,
        'n': 1000000000000000000000000000000n,
        'd': 1000000000000000000000000000000000n
    };
    
    const match = str.match(/^(\d+(?:\.\d+)?)([a-z]+)?$/i);
    if (!match) return null;
    
    let value = match[1].includes('.') ? parseFloat(match[1]) : parseInt(match[1]);
    const suffix = (match[2] || '').toLowerCase();
    
    if (isNaN(value)) return null;
    
    let result;
    if (suffixes[suffix]) {
        result = BigInt(Math.floor(value)) * suffixes[suffix];
    } else {
        result = BigInt(Math.floor(value));
    }
    
    return Number(result);
}

function formatNumber(num) {
    if (num === null || num === undefined || isNaN(num)) return "0";
    const suffixes = [
        { value: 1e33, suffix: 'd' }, { value: 1e30, suffix: 'n' }, { value: 1e27, suffix: 'o' },
        { value: 1e24, suffix: 'S' }, { value: 1e21, suffix: 's' }, { value: 1e18, suffix: 'Q' },
        { value: 1e15, suffix: 'q' }, { value: 1e12, suffix: 't' }, { value: 1e9, suffix: 'b' },
        { value: 1e6, suffix: 'm' }, { value: 1e3, suffix: 'k' }
    ];
    const absNum = Math.abs(num);
    const sign = num < 0 ? "-" : "";
    for (const s of suffixes) {
        if (absNum >= s.value) {
            return sign + (absNum / s.value).toFixed(1).replace(/\.0$/, '') + s.suffix;
        }
    }
    return sign + absNum.toString();
}

async function generateTransferImage(senderName, receiverName, amount, icon, senderAvatarUrl, targetAvatarUrl) {
    const canvas = createCanvas(900, 500);
    const ctx = canvas.getContext("2d");

    const gradient = ctx.createLinearGradient(0, 0, 900, 500);
    gradient.addColorStop(0, "#1a1a2e");
    gradient.addColorStop(0.5, "#16213e");
    gradient.addColorStop(1, "#0f3460");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 900, 500);

    ctx.strokeStyle = "#d4af37";
    ctx.lineWidth = 4;
    ctx.strokeRect(10, 10, 880, 480);

    ctx.fillStyle = "#d4af37";
    ctx.font = "bold 22px 'Courier New'";
    ctx.fillText("UCHIWA BANK", 30, 55);
    ctx.font = "10px 'Courier New'";
    ctx.fillStyle = "#aaa";
    ctx.fillText("PREMIUM TRANSFER", 30, 75);

    ctx.fillStyle = "#d4af37";
    ctx.fillRect(780, 30, 50, 35);
    ctx.fillStyle = "#b8960c";
    ctx.fillRect(784, 34, 42, 27);

    ctx.fillStyle = "#ffd700";
    ctx.font = "bold 24px 'Courier New'";
    ctx.fillText("TRANSFERT", 370, 55);

    async function drawAvatar(x, y, radius, avatarUrl) {
        try {
            const avatar = await loadImage(avatarUrl);
            ctx.save();
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(avatar, x - radius, y - radius, radius * 2, radius * 2);
            ctx.restore();
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.strokeStyle = "#d4af37";
            ctx.lineWidth = 3;
            ctx.stroke();
        } catch (error) {
            ctx.fillStyle = "#fff";
            ctx.font = "bold 30px 'Courier New'";
            ctx.fillText("👤", x - 20, y + 10);
        }
    }

    await drawAvatar(180, 200, 65, senderAvatarUrl);
    await drawAvatar(720, 200, 65, targetAvatarUrl);

    const senderNameShort = senderName.length > 15 ? senderName.substring(0, 12) + "..." : senderName;
    const receiverNameShort = receiverName.length > 15 ? receiverName.substring(0, 12) + "..." : receiverName;

    ctx.fillStyle = "#fff";
    ctx.font = "bold 16px 'Courier New'";
    ctx.textAlign = "center";
    ctx.fillText(senderNameShort.toUpperCase(), 180, 290);
    ctx.fillText(receiverNameShort.toUpperCase(), 720, 290);

    ctx.fillStyle = "#aaa";
    ctx.font = "11px 'Courier New'";
    ctx.fillText("EXPEDITEUR", 180, 310);
    ctx.fillText("DESTINATAIRE", 720, 310);
    ctx.textAlign = "left";

    ctx.beginPath();
    ctx.moveTo(280, 200);
    ctx.lineTo(620, 200);
    ctx.strokeStyle = "#d4af37";
    ctx.lineWidth = 6;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(620, 200);
    ctx.lineTo(590, 180);
    ctx.lineTo(590, 220);
    ctx.closePath();
    ctx.fillStyle = "#d4af37";
    ctx.fill();

    ctx.fillStyle = "#88ff88";
    ctx.font = "bold 22px 'Courier New'";
    ctx.textAlign = "center";
    ctx.fillText(`${amount} $`, 450, 260);
    ctx.textAlign = "left";

    ctx.font = "bold 36px 'Courier New'";
    ctx.fillStyle = "#d4af37";
    ctx.textAlign = "center";
    ctx.fillText(icon, 450, 340);
    ctx.textAlign = "left";

    ctx.fillStyle = "#00ff88";
    ctx.font = "bold 13px 'Courier New'";
    ctx.textAlign = "center";
    ctx.fillText("TRANSFERT REUSSI ✓", 450, 420);
    ctx.textAlign = "left";

    const date = new Date();
    const dateStr = `${date.getDate()}/${date.getMonth()+1}/${date.getFullYear()} - ${date.getHours()}:${date.getMinutes()}`;
    ctx.fillStyle = "#666";
    ctx.font = "10px 'Courier New'";
    ctx.fillText(dateStr, 720, 470);

    ctx.fillStyle = "#fff";
    ctx.font = "20px 'Courier New'";
    ctx.fillText("📡", 840, 450);

    return canvas.toBuffer();
}
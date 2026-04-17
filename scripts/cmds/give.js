const fs = require("fs");
const { createCanvas, loadImage } = require("canvas");

module.exports = {
    config: {
        name: "give",
        version: "2.0",
        author: "Itachi Soma",
        countDown: 5,
        role: 0,
        category: "economy"
    },

    onStart: async function ({ args, message, event, api, usersData }) {
        const { senderID, messageReply } = event;
        
        let targetID;
        let targetName;

        if (messageReply) {
            targetID = messageReply.senderID;
            const targetUserData = await usersData.get(targetID);
            targetName = targetUserData.name || "cet utilisateur";
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

        const senderData = await usersData.get(senderID);
        const targetData = await usersData.get(targetID);
        
        let amount = args[0].toLowerCase();
        
        if (amount === "all") {
            amount = senderData.money;
        } else {
            const parsed = parseAmount(amount);
            if (parsed === null) {
                return message.reply(`❌ 𝐌𝐨𝐧𝐭𝐚𝐧𝐭 𝐢𝐧𝐯𝐚𝐥𝐢𝐝𝐞`);
            }
            amount = parseInt(parsed);
        }
        
        if (isNaN(amount) || amount <= 0) {
            return message.reply(`❌ 𝐌𝐨𝐧𝐭𝐚𝐧𝐭 𝐢𝐧𝐯𝐚𝐥𝐢𝐝𝐞`);
        }
        
        if (amount > senderData.money) {
            return message.reply(
`❌ 𝐅𝐨𝐧𝐝𝐬 𝐢𝐧𝐬𝐮𝐟𝐟𝐢𝐬𝐚𝐧𝐭𝐬
━━━━━━━━━━━━━━━━
💰 𝐓𝐨𝐧 𝐬𝐨𝐥𝐝𝐞 : ${formatNumber(senderData.money)}$
🎁 𝐌𝐨𝐧𝐭𝐚𝐧𝐭 : ${formatNumber(amount)}$`
            );
        }

        await usersData.set(senderID, { money: senderData.money - amount });
        await usersData.set(targetID, { money: targetData.money + amount });
        
        const newSenderData = await usersData.get(senderID);
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
💰 𝐍𝐨𝐮𝐯𝐞𝐚𝐮 𝐬𝐨𝐥𝐝𝐞 : ${formatNumber(newSenderData.money)}$`
        );

        try {
            const transferImage = await generateTransferImage(senderName, targetRealName, formattedAmount, randomIcon);
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

function parseAmount(input) {
    const str = input.toString().toLowerCase().replace(/\s/g, '');
    
    if (str === "all" || str === "tout") return null;
    
    const suffixes = {
        'k': 1000n,
        'm': 1000000n,
        'b': 1000000000n,
        't': 1000000000000n,
        'q': 1000000000000000n,
        'qd': 1000000000000000000n,
        'qt': 1000000000000000000000n
    };
    
    let match = str.match(/^(\d+(?:\.\d+)?)([a-z]+)?$/i);
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
    
    return result.toString();
}

function formatNumber(num) {
    const numStr = num.toString();
    const numValue = parseFloat(numStr);
    
    if (numValue >= 1000000000000) {
        return (numValue / 1000000000000).toFixed(1).replace(/\.0$/, '') + 'T';
    }
    if (numValue >= 1000000000) {
        return (numValue / 1000000000).toFixed(1).replace(/\.0$/, '') + 'B';
    }
    if (numValue >= 1000000) {
        return (numValue / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    }
    if (numValue >= 1000) {
        return (numValue / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    }
    return numStr;
}

async function generateTransferImage(senderName, receiverName, amount, icon) {
    const canvas = createCanvas(800, 500);
    const ctx = canvas.getContext("2d");

    const gradient = ctx.createLinearGradient(0, 0, 800, 500);
    gradient.addColorStop(0, "#1a1a2e");
    gradient.addColorStop(0.5, "#16213e");
    gradient.addColorStop(1, "#0f3460");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 800, 500);

    ctx.strokeStyle = "#d4af37";
    ctx.lineWidth = 3;
    ctx.strokeRect(10, 10, 780, 480);

    ctx.fillStyle = "#d4af37";
    ctx.font = "bold 20px 'Courier New'";
    ctx.fillText("UCHIWA BANK", 30, 55);
    ctx.font = "9px 'Courier New'";
    ctx.fillStyle = "#aaa";
    ctx.fillText("PREMIUM TRANSFER", 30, 75);

    ctx.fillStyle = "#d4af37";
    ctx.fillRect(680, 35, 45, 30);
    ctx.fillStyle = "#b8960c";
    ctx.fillRect(684, 39, 37, 22);

    ctx.fillStyle = "#ffd700";
    ctx.font = "bold 24px 'Courier New'";
    ctx.fillText("TRANSFERT", 330, 55);

    const senderNameShort = senderName.length > 15 ? senderName.substring(0, 12) + "..." : senderName;
    const receiverNameShort = receiverName.length > 15 ? receiverName.substring(0, 12) + "..." : receiverName;

    ctx.fillStyle = "#fff";
    ctx.font = "bold 14px 'Courier New'";
    ctx.fillText(senderNameShort.toUpperCase(), 130, 180);
    ctx.fillText(receiverNameShort.toUpperCase(), 530, 180);

    ctx.fillStyle = "#aaa";
    ctx.font = "10px 'Courier New'";
    ctx.fillText("EXPEDITEUR", 130, 200);
    ctx.fillText("DESTINATAIRE", 530, 200);

    ctx.fillStyle = "#88ff88";
    ctx.font = "bold 16px 'Courier New'";
    ctx.fillText(`${amount} $`, 370, 280);

    ctx.fillStyle = "#d4af37";
    ctx.font = "bold 30px 'Courier New'";
    ctx.fillText(icon, 370, 350);

    ctx.fillStyle = "#00ff88";
    ctx.font = "bold 12px 'Courier New'";
    ctx.fillText("TRANSFERT REUSSI ✓", 340, 420);

    for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(370 + i * 20, 230);
        ctx.lineTo(390 + i * 20, 245);
        ctx.lineTo(370 + i * 20, 260);
        ctx.fillStyle = "#d4af37";
        ctx.fill();
    }

    const date = new Date();
    const dateStr = `${date.getDate()}/${date.getMonth()+1}/${date.getFullYear()} - ${date.getHours()}:${date.getMinutes()}`;
    ctx.fillStyle = "#666";
    ctx.font = "9px 'Courier New'";
    ctx.fillText(dateStr, 620, 470);

    ctx.fillStyle = "#fff";
    ctx.font = "20px 'Courier New'";
    ctx.fillText("📡", 740, 450);

    return canvas.toBuffer();
    }

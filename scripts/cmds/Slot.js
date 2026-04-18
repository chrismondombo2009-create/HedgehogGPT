const fs = require("fs");
const { createCanvas } = require("canvas");

module.exports = {
    config: {
        name: "slot",
        version: "2.0",
        author: "Itachi Soma",
        countDown: 3,
        role: 0,
        category: "fun",
        shortDescription: {
            en: "Slot machine game"
        },
        longDescription: {
            en: "Play slot machine with your money! Jackpot x10, x5, x3, x2"
        }
    },

    onStart: async function ({ args, message, event, api, usersData }) {
        const { senderID } = event;
        const userData = await usersData.get(senderID);
        const amount = parseAmountWithSuffix(args[0]);
        
        const bankPath = "./bank.json";
        let bankData = {};
        
        if (fs.existsSync(bankPath)) {
            bankData = JSON.parse(fs.readFileSync(bankPath, "utf8"));
        }
        
        const userBank = bankData[senderID] || { bank: 0, imageMode: true };
        const userInfo = await api.getUserInfo(senderID);
        const username = userInfo[senderID].name;
        
        function parseAmountWithSuffix(input) {
            if (!input) return NaN;
            const str = input.toString().toLowerCase().replace(/\s/g, '');
            
            const suffixes = {
                'k': 1000,
                'm': 1000000,
                'b': 1000000000,
                't': 1000000000000,
                'q': 1000000000000000
            };
            
            const match = str.match(/^(\d+(?:\.\d+)?)([kmbtq]?)$/i);
            if (!match) return parseFloat(str);
            
            let value = parseFloat(match[1]);
            const suffix = match[2].toLowerCase();
            
            if (isNaN(value)) return NaN;
            
            if (suffixes[suffix]) {
                value *= suffixes[suffix];
            }
            
            return Math.floor(value);
        }
        
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
        
        async function generateSlotCard(username, amount, win, winAmount, newBalance, slots, multiplier) {
            const canvas = createCanvas(600, 420);
            const ctx = canvas.getContext("2d");
            
            const gradient = ctx.createLinearGradient(0, 0, 600, 420);
            gradient.addColorStop(0, "#1a1a2e");
            gradient.addColorStop(0.5, "#16213e");
            gradient.addColorStop(1, "#0f3460");
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, 600, 420);
            
            ctx.strokeStyle = "#d4af37";
            ctx.lineWidth = 3;
            ctx.strokeRect(10, 10, 580, 400);
            
            ctx.fillStyle = "#d4af37";
            ctx.font = "bold 20px 'Courier New'";
            ctx.fillText("UCHIWA SLOT", 30, 55);
            ctx.font = "10px 'Courier New'";
            ctx.fillStyle = "#aaa";
            ctx.fillText("MACHINE A SOUS", 30, 75);
            
            ctx.fillStyle = "#d4af37";
            ctx.fillRect(480, 35, 45, 30);
            ctx.fillStyle = "#b8960c";
            ctx.fillRect(484, 39, 37, 22);
            
            const cardHolder = username.toUpperCase().substring(0, 18);
            ctx.fillStyle = "#fff";
            ctx.font = "bold 12px 'Courier New'";
            ctx.fillText(cardHolder, 30, 110);
            ctx.fillStyle = "#aaa";
            ctx.font = "9px 'Courier New'";
            ctx.fillText("PLAYER", 30, 125);
            
            ctx.fillStyle = "#ffd700";
            ctx.font = "bold 16px 'Courier New'";
            ctx.fillText("RESULTAT", 380, 110);
            
            ctx.font = "48px 'Segoe UI Emoji'";
            ctx.fillStyle = "#fff";
            ctx.fillText(slots[0], 380, 180);
            ctx.fillText(slots[1], 440, 180);
            ctx.fillText(slots[2], 500, 180);
            
            ctx.fillStyle = "#88ff88";
            ctx.font = "bold 14px 'Courier New'";
            ctx.fillText(`MULTIPLICATEUR: x${multiplier}`, 380, 240);
            
            ctx.fillStyle = "#d4af37";
            ctx.font = "bold 28px 'Courier New'";
            ctx.fillText(`${formatNumber(newBalance)}$`, 30, 315);
            ctx.fillStyle = "#aaa";
            ctx.font = "10px 'Courier New'";
            ctx.fillText("NEW BALANCE", 30, 340);
            
            if (win) {
                ctx.fillStyle = "#00ff88";
                ctx.font = "bold 16px 'Courier New'";
                ctx.fillText(`GAIN: +${formatNumber(winAmount)}$`, 380, 290);
            } else {
                ctx.fillStyle = "#ff4444";
                ctx.font = "bold 16px 'Courier New'";
                ctx.fillText(`PERTE: -${formatNumber(amount)}$`, 380, 290);
            }
            
            ctx.fillStyle = "#d4af37";
            ctx.font = "bold 14px 'Courier New'";
            ctx.fillText("🎰", 540, 100);
            
            ctx.fillStyle = "#aaa";
            ctx.fillRect(560, 380, 20, 15);
            
            const date = new Date();
            const dateStr = `${date.getDate()}/${date.getMonth()+1}/${date.getFullYear()}`;
            ctx.fillStyle = "#666";
            ctx.font = "9px 'Courier New'";
            ctx.fillText(dateStr, 30, 395);
            
            return canvas.toBuffer();
        }
        
        if (isNaN(amount) || amount <= 0) {
            return message.reply(`❌ 𝐌𝐨𝐧𝐭𝐚𝐧𝐭 𝐢𝐧𝐯𝐚𝐥𝐢𝐝𝐞\n━━━━━━━━━━━━━━━━\n📝 𝐔𝐭𝐢𝐥𝐢𝐬𝐚𝐭𝐢𝐨𝐧 : ${global.utils.getPrefix(event.threadID)}𝐬𝐥𝐨𝐭 <𝐦𝐨𝐧𝐭𝐚𝐧𝐭>\n💳 𝐄𝐱𝐞𝐦𝐩𝐥𝐞 : ${global.utils.getPrefix(event.threadID)}𝐬𝐥𝐨𝐭 𝟓𝟎𝐤`);
        }
        
        if (amount > userData.money) {
            return message.reply(`❌ 𝐅𝐨𝐧𝐝𝐬 𝐢𝐧𝐬𝐮𝐟𝐟𝐢𝐬𝐚𝐧𝐭𝐬\n━━━━━━━━━━━━━━━━\n💰 𝐓𝐨𝐧 𝐬𝐨𝐥𝐝𝐞 : ${formatNumber(userData.money)}$\n🎰 𝐌𝐨𝐧𝐭𝐚𝐧𝐭 : ${formatNumber(amount)}$`);
        }
        
        const slots = ["🤍", "🖤", "💚", "🖤", "🤍", "💚", "💚", "🖤", "🤍"];
        const slot1 = slots[Math.floor(Math.random() * slots.length)];
        const slot2 = slots[Math.floor(Math.random() * slots.length)];
        const slot3 = slots[Math.floor(Math.random() * slots.length)];
        
        const result = calculateWinnings(slot1, slot2, slot3, amount);
        const win = result.win;
        const winAmount = result.winAmount;
        const multiplier = result.multiplier;
        
        await usersData.set(senderID, { money: userData.money + winAmount });
        const newUserData = await usersData.get(senderID);
        const newBalance = newUserData.money;
        
        let resultText = "";
        let resultMsg = "";
        
        if (win) {
            resultText = `🎉 𝐕𝐈𝐂𝐓𝐎𝐈𝐑𝐄 ! 🎉\n✨ 𝐆𝐚𝐢𝐧 : +${formatNumber(winAmount)}$ (𝐱${multiplier})\n💰 𝐍𝐨𝐮𝐯𝐞𝐚𝐮 𝐬𝐨𝐥𝐝𝐞 : ${formatNumber(newBalance)}$`;
            resultMsg = `🎉 𝐕𝐈𝐂𝐓𝐎𝐈𝐑𝐄 ! 🎉\n━━━━━━━━━━━━━━━━\n✨ 𝐆𝐚𝐢𝐧 : +${formatNumber(winAmount)}$ (𝐱${multiplier})\n💰 𝐍𝐨𝐮𝐯𝐞𝐚𝐮 𝐬𝐨𝐥𝐝𝐞 : ${formatNumber(newBalance)}$`;
        } else {
            resultText = `💀 𝐏𝐄𝐑𝐃𝐔 ... 💀\n📉 𝐏𝐞𝐫𝐭𝐞 : -${formatNumber(amount)}$\n💰 𝐍𝐨𝐮𝐯𝐞𝐚𝐮 𝐬𝐨𝐥𝐝𝐞 : ${formatNumber(newBalance)}$`;
            resultMsg = `💀 𝐏𝐄𝐑𝐃𝐔 ... 💀\n━━━━━━━━━━━━━━━━\n📉 𝐏𝐞𝐫𝐭𝐞 : -${formatNumber(amount)}$\n💰 𝐍𝐨𝐮𝐯𝐞𝐚𝐮 𝐬𝐨𝐥𝐝𝐞 : ${formatNumber(newBalance)}$`;
        }
        
        await message.reply(
`🎰 𝐒𝐋𝐎𝐓 𝐌𝐀𝐂𝐇𝐈𝐍𝐄 🎰
━━━━━━━━━━━━━━━━
🎲 [ ${slot1} | ${slot2} | ${slot3} ]
━━━━━━━━━━━━━━━━
💰 𝐌𝐢𝐬𝐞 : ${formatNumber(amount)}$
━━━━━━━━━━━━━━━━
${resultMsg}
━━━━━━━━━━━━━━━━`
        );
        
        if (userBank.imageMode !== false) {
            try {
                const cardImage = await generateSlotCard(username, amount, win, winAmount, newBalance, [slot1, slot2, slot3], multiplier);
                const imgPath = `./slot_card_${senderID}.png`;
                fs.writeFileSync(imgPath, cardImage);
                await message.reply({
                    body: "💳 𝐑𝐞𝐜𝐚𝐩𝐢𝐭𝐮𝐥𝐚𝐭𝐢𝐟 𝐬𝐮𝐫 𝐯𝐨𝐭𝐫𝐞 𝐜𝐚𝐫𝐭𝐞 𝐛𝐚𝐧𝐜𝐚𝐢𝐫𝐞 :",
                    attachment: fs.createReadStream(imgPath)
                });
                fs.unlinkSync(imgPath);
            } catch (error) {
                console.error("Erreur generation carte:", error);
            }
        }
    }
};

function calculateWinnings(slot1, slot2, slot3, betAmount) {
    if (slot1 === "🤍" && slot2 === "🤍" && slot3 === "🤍") {
        return { win: true, winAmount: betAmount * 10, multiplier: 10 };
    } else if (slot1 === "🖤" && slot2 === "🖤" && slot3 === "🖤") {
        return { win: true, winAmount: betAmount * 5, multiplier: 5 };
    } else if (slot1 === slot2 && slot2 === slot3) {
        return { win: true, winAmount: betAmount * 3, multiplier: 3 };
    } else if (slot1 === slot2 || slot1 === slot3 || slot2 === slot3) {
        return { win: true, winAmount: betAmount * 2, multiplier: 2 };
    } else {
        return { win: false, winAmount: -betAmount, multiplier: 0 };
    }
}
module.exports = {
    config: {
        name: "give",
        version: "2.0",
        author: "Itachi Soma",
        countDown: 5,
        role: 0,
        category: "economy"
    },

    onStart: async function ({ args, message, event, usersData }) {
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
            amount = parsed;
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
        
        return message.reply(
`${randomIcon} 𝐓𝐑𝐀𝐍𝐒𝐅𝐄𝐑𝐓 𝐑𝐄́𝐔𝐒𝐒𝐈 ${randomIcon}
━━━━━━━━━━━━━━━━
💸 ${formattedAmount}$ → ${targetName}
━━━━━━━━━━━━━━━━
💰 𝐍𝐨𝐮𝐯𝐞𝐚𝐮 𝐬𝐨𝐥𝐝𝐞 : ${formatNumber(newSenderData.money)}$`
        );
    }
};

function parseAmount(input) {
    const str = input.toString().toLowerCase();
    
    if (str === "all") return null;
    
    const match = str.match(/^(\d+(?:\.\d+)?)([km]?)$/i);
    if (!match) return null;
    
    let value = parseFloat(match[1]);
    const suffix = match[2].toLowerCase();
    
    if (isNaN(value)) return null;
    
    if (suffix === 'k') {
        value *= 1000;
    } else if (suffix === 'm') {
        value *= 1000000;
    }
    
    if (!Number.isInteger(value)) {
        if (suffix === 'k') {
            value = Math.floor(value);
        } else {
            return null;
        }
    }
    
    return Math.floor(value);
}

function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    }
    return num.toString();
}
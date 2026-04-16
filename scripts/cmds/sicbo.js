const fs = require("fs");
const path = require("path");

const balancePath = path.join(__dirname, "sicbo_balances.json");
let balances = {};

if (fs.existsSync(balancePath)) {
    balances = JSON.parse(fs.readFileSync(balancePath));
}

function saveBalances() {
    fs.writeFileSync(balancePath, JSON.stringify(balances, null, 2));
}

function getBalance(userId) {
    if (!balances[userId]) {
        balances[userId] = 1000;
        saveBalances();
    }
    return balances[userId];
}

function updateBalance(userId, amount) {
    balances[userId] = (balances[userId] || 1000) + amount;
    saveBalances();
}

function rollDice() {
    return [Math.floor(Math.random() * 6) + 1, Math.floor(Math.random() * 6) + 1, Math.floor(Math.random() * 6) + 1];
}

function getDiceEmoji(value) {
    const emojis = { 1: "⚀", 2: "⚁", 3: "⚂", 4: "⚃", 5: "⚄", 6: "⚅" };
    return emojis[value];
}

function evaluateBet(betType, betValue, dice) {
    const sum = dice[0] + dice[1] + dice[2];
    const isTriple = dice[0] === dice[1] && dice[1] === dice[2];
    
    switch(betType) {
        case "petit":
            if (!isTriple && sum >= 4 && sum <= 10) return true;
            return false;
        case "grand":
            if (!isTriple && sum >= 11 && sum <= 17) return true;
            return false;
        case "total":
            return sum === betValue;
        case "triple":
            if (isTriple && (betValue === "any" || dice[0] === betValue)) return true;
            return false;
        case "double":
            if (!isTriple) {
                const counts = {};
                dice.forEach(d => counts[d] = (counts[d] || 0) + 1);
                return Object.values(counts).some(c => c >= 2) && (betValue === "any" || counts[betValue] >= 2);
            }
            return false;
        case "simple":
            return dice.includes(betValue);
        case "combinaison":
            const [num1, num2] = betValue;
            return dice.includes(num1) && dice.includes(num2);
        default:
            return false;
    }
}

function getPayout(betType, betValue, dice) {
    const sum = dice[0] + dice[1] + dice[2];
    
    const payouts = {
        petit: 1,
        grand: 1,
        total: { 4: 60, 5: 30, 6: 18, 7: 12, 8: 8, 9: 7, 10: 6, 11: 6, 12: 7, 13: 8, 14: 12, 15: 18, 16: 30, 17: 60 },
        triple_any: 30,
        triple_specific: 180,
        double_any: 10,
        double_specific: 11,
        simple: 1,
        combinaison: 6
    };
    
    if (betType === "total") return payouts.total[sum] || 0;
    if (betType === "triple") {
        if (betValue === "any") return payouts.triple_any;
        return payouts.triple_specific;
    }
    if (betType === "double") {
        if (betValue === "any") return payouts.double_any;
        return payouts.double_specific;
    }
    if (betType === "simple") return payouts.simple;
    if (betType === "combinaison") return payouts.combinaison;
    return payouts[betType] || 0;
}

module.exports = {
    config: {
        name: "sicbo",
        version: "1.0",
        author: "Itachi Soma",
        countDown: 3,
        role: 0,
        category: "fun"
    },

    onStart: async function ({ api, event, args, message }) {
        const senderId = event.senderID;
        const subCommand = args[0];

        if (!subCommand || subCommand === "help") {
            return message.reply(
`𝐒𝐈𝐂 𝐁𝐎 - 𝐋𝐄 𝐉𝐄𝐔 𝐃𝐄𝐒 𝟑 𝐃𝐄́𝐒
━━━━━━━━━━━━━━━━\n⚙️𝐂𝐨𝐦𝐦𝐚𝐧𝐝𝐞𝐬⚙️\n\n🎲 𝐬𝐢𝐜𝐛𝐨 𝐛𝐚𝐥𝐚𝐧𝐜𝐞
   → Voir ton solde

🎲 𝐬𝐢𝐜𝐛𝐨 𝐩𝐞𝐭𝐢𝐭 <𝐦𝐨𝐧𝐭𝐚𝐧𝐭>
   → Total 4-10 (hors triple)
   → Gain x2

🎲 𝐬𝐢𝐜𝐛𝐨 𝐠𝐫𝐚𝐧𝐝 <𝐦𝐨𝐧𝐭𝐚𝐧𝐭>
   → Total 11-17 (hors triple)
   → Gain x2

🎲 𝐬𝐢𝐜𝐛𝐨 𝐭𝐨𝐭𝐚𝐥 <𝐦𝐨𝐧𝐭𝐚𝐧𝐭> <𝟒-𝟏𝟕>
   → Somme exacte des dés
   → Gain x6 à x60

🎲 𝐬𝐢𝐜𝐛𝐨 𝐭𝐫𝐢𝐩𝐥𝐞 <𝐦𝐨𝐧𝐭𝐚𝐧𝐭> [𝟏-𝟔/𝐚𝐧𝐲]
   → 3 dés identiques
   → Gain x30 (any) ou x180 (spécifique)

🎲 𝐬𝐢𝐜𝐛𝐨 𝐝𝐨𝐮𝐛𝐥𝐞 <𝐦𝐨𝐧𝐭𝐚𝐧𝐭> [𝟏-𝟔/𝐚𝐧𝐲]
   → Au moins 2 dés identiques
   → Gain x10 (any) ou x11 (spécifique)

🎲 𝐬𝐢𝐜𝐛𝐨 𝐬𝐢𝐦𝐩𝐥𝐞 <𝐦𝐨𝐧𝐭𝐚𝐧𝐭> <𝟏-𝟔>
   → Un dé montre ce numéro
   → Gain x2

🎲 𝐬𝐢𝐜𝐛𝐨 𝐜𝐨𝐦𝐛𝐨 <𝐦𝐨𝐧𝐭𝐚𝐧𝐭> <𝟏-𝟔> <𝟏-𝟔>
   → Les 2 numéros sortent
   → Gain x7

🎲 𝐬𝐢𝐜𝐛𝐨 𝐛𝐨𝐧𝐮𝐬
   → +200💎 par jour\n━━━━━━━━━━━━━━━━\n📋| 𝐓𝐨𝐧 𝐬𝐨𝐥𝐝𝐞 : ${getBalance(senderId)}💲\n━━━━━━━━━━━━━━━━`
            );
        }

        if (subCommand === "balance" || subCommand === "solde") {
            return message.reply(`𝐂𝐚𝐩𝐢𝐭𝐚𝐥 𝐚𝐜𝐭𝐮𝐞𝐥 \n━━━━━━━━━━━━━━━━\n💰 ${getBalance(senderId)} 💲`);
        }

        if (subCommand === "bonus") {
            const lastBonus = balances[senderId]?.lastBonus || 0;
            const now = Date.now();
            const dayMs = 86400000;
            
            if (now - lastBonus < dayMs) {
                const remaining = Math.ceil((dayMs - (now - lastBonus)) / 3600000);
                return message.reply(`𝐁𝐨𝐧𝐮𝐬 𝐝𝐞́𝐣𝐚̀ 𝐫𝐞𝐜̧𝐮 !\n⏳ Prochain bonus dans ${remaining}h`);
            }
            
            updateBalance(senderId, 200);
            balances[senderId].lastBonus = now;
            saveBalances();
            return message.reply(`🎁 𝐁𝐨𝐧𝐮𝐬 𝐪𝐮𝐨𝐭𝐢𝐝𝐢𝐞𝐧 !\n━━━━━━━━━━━━━━━━\n✨ +200💲\n💰 Nouveau solde : ${getBalance(senderId)} 💲`);
        }

        const betType = subCommand;
        const amount = parseInt(args[1]);
        
        if (isNaN(amount) || amount <= 0) {
            return message.reply(`❌ 𝐌𝐨𝐧𝐭𝐚𝐧𝐭 𝐢𝐧𝐯𝐚𝐥𝐢𝐝𝐞\n\nUtilise : sicbo ${betType} <montant> [paramètres]`);
        }
        
        const balance = getBalance(senderId);
        if (amount > balance) {
            return message.reply(`❌ 𝐅𝐨𝐧𝐝𝐬 𝐢𝐧𝐬𝐮𝐟𝐟𝐢𝐬𝐚𝐧𝐭𝐬\n━━━━━━━━━━━━━━━━\n💰 Ton solde : ${balance}💲\n🎲 Montant demandé : ${amount}💲`);
        }

        let betValue = null;
        let validTypes = ["petit", "grand", "total", "triple", "double", "simple", "combo"];
        
        if (!validTypes.includes(betType)) {
            return message.reply(`❌ 𝐓𝐲𝐩𝐞 𝐝𝐞 𝐩𝐚𝐫𝐢 𝐢𝐧𝐜𝐨𝐧𝐧𝐮\n\n➜ sicbo help pour voir la liste`);
        }

        if (betType === "total") {
            betValue = parseInt(args[2]);
            if (isNaN(betValue) || betValue < 4 || betValue > 17) {
                return message.reply(`❌ 𝐓𝐨𝐭𝐚𝐥 𝐢𝐧𝐯𝐚𝐥𝐢𝐝𝐞\n\n➜ Choisis un nombre entre 4 et 17`);
            }
        }
        
        if (betType === "triple" || betType === "double") {
            betValue = args[2] || "any";
            if (betValue !== "any" && (parseInt(betValue) < 1 || parseInt(betValue) > 6)) {
                return message.reply(`❌ 𝐕𝐚𝐥𝐞𝐮𝐫 𝐢𝐧𝐯𝐚𝐥𝐢𝐝𝐞\n\n➜ Choisis un chiffre entre 1-6 ou "any"`);
            }
            if (betValue !== "any") betValue = parseInt(betValue);
        }
        
        if (betType === "simple") {
            betValue = parseInt(args[2]);
            if (isNaN(betValue) || betValue < 1 || betValue > 6) {
                return message.reply(`❌ 𝐕𝐚𝐥𝐞𝐮𝐫 𝐢𝐧𝐯𝐚𝐥𝐢𝐝𝐞\n\n➜ Choisis un chiffre entre 1 et 6`);
            }
        }
        
        if (betType === "combo") {
            const num1 = parseInt(args[2]);
            const num2 = parseInt(args[3]);
            if (isNaN(num1) || isNaN(num2) || num1 < 1 || num1 > 6 || num2 < 1 || num2 > 6) {
                return message.reply(`❌ 𝐂𝐨𝐦𝐛𝐢𝐧𝐚𝐢𝐬𝐨𝐧 𝐢𝐧𝐯𝐚𝐥𝐢𝐝𝐞\n\n➜ Utilise : sicbo combo <montant> <1-6> <1-6>`);
            }
            betValue = [num1, num2];
        }

        updateBalance(senderId, -amount);
        
        const dice = rollDice();
        const diceDisplay = dice.map(d => getDiceEmoji(d)).join(" ");
        const sum = dice[0] + dice[1] + dice[2];
        const isTriple = dice[0] === dice[1] && dice[1] === dice[2];
        
        const win = evaluateBet(betType, betValue, dice);
        const payout = win ? getPayout(betType, betValue, dice) : 0;
        const winAmount = win ? amount * payout : 0;
        
        if (win) {
            updateBalance(senderId, winAmount);
        }
        
        const newBalance = getBalance(senderId);
        
        let betDisplay = "";
        if (betType === "total") betDisplay = `Total = ${betValue}`;
        else if (betType === "triple") betDisplay = `Triple ${betValue === "any" ? "quelconque" : `de ${betValue}`}`;
        else if (betType === "double") betDisplay = `Double ${betValue === "any" ? "quelconque" : `de ${betValue}`}`;
        else if (betType === "simple") betDisplay = `Numéro ${betValue}`;
        else if (betType === "combo") betDisplay = `Combinaison ${betValue[0]}+${betValue[1]}`;
        else betDisplay = betType === "petit" ? "Petit (4-10)" : "Grand (11-17)";
        
        let resultMsg = "";
        if (win) {
            resultMsg = `🎉 𝐕𝐈𝐂𝐓𝐎𝐈𝐑𝐄 ! 🎉\n━━━━━━━━━━━━━━━━\n✨ Gain : +${winAmount} 💎 (x${payout})\n💰 Nouveau solde : ${newBalance} 💎`;
        } else {
            resultMsg = `💀 𝐏𝐄𝐑𝐃𝐔 ... 💀\n━━━━━━━━━━━━━━━━\n📉 Perte : -${amount} 💎\n💰 Nouveau solde : ${newBalance} 💎`;
        }
        
        let tripleInfo = "";
        if (isTriple) {
            tripleInfo = `\n━━━━━━━━━━━━━━━━\n🎲 𝐓𝐑𝐈𝐏𝐋𝐄 ! ${dice[0]} ${dice[0]} ${dice[0]}`;
        }
        
        return message.reply(
`☘️𝐒𝐈𝐂 𝐁𝐎 - 𝐑𝐄́𝐒𝐔𝐋𝐓𝐀𝐓☘️\n━━━━━━━━━━━━━━━━\n🎲| 𝐋𝐚𝐧𝐜𝐞𝐫 : ${diceDisplay}\n📊| 𝐓𝐨𝐭𝐚𝐥 : ${sum}${tripleInfo}\n━━━━━━━━━━━━━━━━\n📋|  𝐓𝐨𝐧 𝐩𝐚𝐫𝐢 : ${betDisplay}\n💰| 𝐌𝐢𝐬𝐞 : ${amount}💲\n━━━━━━━━━━━━━━━━\n${resultMsg}\n━━━━━━━━━━━━━━━━`
        );
    }
};
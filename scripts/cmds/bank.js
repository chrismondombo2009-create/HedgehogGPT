const fs = require("fs");
const { createCanvas } = require("canvas");

// Configuration de l'API
const API_URL = "https://bank-save-production.up.railway.app/api/bank";

module.exports = {
    config: {
        name: "bank",
        description: "Depot ou retrait d'argent de la banque",
        guide: {
            vi: "",
            en: "Bank:\nDeposit - Withdraw - Balance - Interest - Transfer - Richest - Card - Image - Lottery - Parrainage"
        },
        category: "game",
        countDown: 1,
        role: 0,
        author: "Itachi Soma"
    },
    onStart: async function ({ args, message, event, api, usersData }) {
        const { getPrefix } = global.utils;
        const p = getPrefix(event.threadID);
        const userMoney = await usersData.get(event.senderID, "money");
        const user = parseInt(event.senderID);
        const info = await api.getUserInfo(user);
        const username = info[user].name;
        
        // Fonctions pour appeler l'API
        async function apiCall(endpoint, method = "GET", body = null) {
            const options = {
                method: method,
                headers: { "Content-Type": "application/json" }
            };
            if (body) options.body = JSON.stringify(body);
            
            const response = await fetch(`${API_URL}${endpoint}`, options);
            return await response.json();
        }
        
        async function getUserBankData(userId) {
            const result = await apiCall(`/${userId}`);
            if (result.success) return result.data;
            return { bank: 0, lastInterestClaimed: Date.now() };
        }
        
        async function updateUserBankData(userId, amount, cvv, type) {
            if (type === "deposit") {
                return await apiCall(`/${userId}/deposit`, "POST", { amount, cvv });
            } else if (type === "withdraw") {
                return await apiCall(`/${userId}/withdraw`, "POST", { amount, cvv });
            }
            return null;
        }
        
        async function createUserCard(userId) {
            return await apiCall(`/${userId}/card`, "POST");
        }
        
        async function getInterest(userId) {
            return await apiCall(`/${userId}/interest`, "POST");
        }
        
        async function getTopUsers() {
            return await apiCall(`/top`);
        }
        
        async function playLottery(userId, ticketPrice) {
            return await apiCall(`/${userId}/lottery`, "POST", { ticketPrice });
        }
        
        async function createParrainCode(userId) {
            return await apiCall(`/${userId}/parrain/create`, "POST");
        }
        
        async function useParrainCode(userId, code) {
            return await apiCall(`/${userId}/parrain/use`, "POST", { code });
        }
        
        let bankData = await getUserBankData(user);
        let imageMode = bankData.imageMode !== undefined ? bankData.imageMode : true;
        
        const command = args[0]?.toLowerCase();
        
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
        
        async function generateBankCard(title, balance, messageText, username, cvv = null) {
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
            
            ctx.fillStyle = "rgba(255,255,255,0.05)";
            ctx.fillRect(0, 0, 300, 200);
            
            ctx.fillStyle = "#d4af37";
            ctx.fillRect(440, 40, 50, 35);
            ctx.fillStyle = "#b8960c";
            ctx.fillRect(445, 45, 40, 25);
            
            ctx.fillStyle = "#a0860a";
            for(let i = 0; i < 3; i++) {
                ctx.fillRect(450 + i*10, 50, 3, 15);
            }
            
            ctx.fillStyle = "#2c2c2c";
            ctx.fillRect(10, 50, 580, 8);
            
            ctx.fillStyle = "#d4af37";
            ctx.font = "bold 20px 'Courier New'";
            ctx.fillText("UCHIWA BANK", 30, 95);
            ctx.font = "10px 'Courier New'";
            ctx.fillStyle = "#aaa";
            ctx.fillText("PREMIUM CARD", 30, 115);
            
            ctx.fillStyle = "#e0e0e0";
            ctx.font = "22px 'Courier New'";
            let cardNumber = bankData?.cardNumber || "**** **** **** " + Math.floor(Math.random() * 9000 + 1000);
            ctx.fillText(cardNumber, 30, 165);
            
            if (bankData?.cardExpiry) {
                ctx.fillStyle = "#fff";
                ctx.font = "14px 'Courier New'";
                ctx.fillText(bankData.cardExpiry, 120, 200);
            } else {
                const expiry = new Date();
                expiry.setFullYear(expiry.getFullYear() + 3);
                const expiryStr = `${expiry.getMonth()+1}/${expiry.getFullYear().toString().slice(-2)}`;
                ctx.fillStyle = "#fff";
                ctx.font = "14px 'Courier New'";
                ctx.fillText(expiryStr, 120, 200);
            }
            
            ctx.font = "12px 'Courier New'";
            ctx.fillStyle = "#ccc";
            ctx.fillText("VALID THRU", 30, 200);
            
            ctx.fillStyle = "#d4af37";
            ctx.font = "bold 16px 'Courier New'";
            ctx.fillText(title.toUpperCase(), 380, 210);
            
            const cardHolder = username.toUpperCase().substring(0, 20);
            ctx.fillStyle = "#fff";
            ctx.font = "bold 14px 'Courier New'";
            ctx.fillText(cardHolder, 30, 250);
            ctx.fillStyle = "#aaa";
            ctx.font = "10px 'Courier New'";
            ctx.fillText("CARDHOLDER", 30, 265);
            
            ctx.fillStyle = "#d4af37";
            ctx.font = "bold 28px 'Courier New'";
            ctx.fillText(balance, 30, 315);
            ctx.fillStyle = "#aaa";
            ctx.font = "10px 'Courier New'";
            ctx.fillText("CURRENT BALANCE", 30, 335);
            
            ctx.fillStyle = "#88ff88";
            ctx.font = "12px 'Courier New'";
            const lines = messageText.split('\n');
            let y = 300;
            for (let i = 0; i < Math.min(lines.length, 3); i++) {
                ctx.fillStyle = i === 0 ? "#88ff88" : "#ccc";
                ctx.fillText(lines[i], 350, y);
                y += 20;
            }
            
            ctx.fillStyle = "#d4af37";
            ctx.font = "bold 14px 'Courier New'";
            if (cvv) {
                ctx.fillText(cvv, 540, 100);
            } else if (bankData?.cardCvv) {
                ctx.fillText("***", 540, 100);
            } else {
                ctx.fillText("***", 540, 100);
            }
            
            ctx.fillStyle = "#aaa";
            ctx.fillRect(560, 380, 20, 15);
            
            const date = new Date();
            const dateStr = `${date.getDate()}/${date.getMonth()+1}/${date.getFullYear()}`;
            ctx.fillStyle = "#666";
            ctx.font = "9px 'Courier New'";
            ctx.fillText(dateStr, 30, 395);
            
            return canvas.toBuffer();
        }
        
        async function generateLotteryCard(username, ticketPrice, win, winAmount, numbers, drawnNumbers, matchCount) {
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
            ctx.fillText("UCHIWA LOTTERY", 30, 55);
            ctx.font = "10px 'Courier New'";
            ctx.fillStyle = "#aaa";
            ctx.fillText("LUCKY DRAW", 30, 75);
            
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
            ctx.font = "bold 18px 'Courier New'";
            ctx.fillText("NUMEROS TIRES", 380, 110);
            
            ctx.fillStyle = "#fff";
            ctx.font = "24px 'Courier New'";
            ctx.fillText(numbers.join(" - "), 380, 150);
            
            ctx.fillStyle = "#ffd700";
            ctx.font = "bold 18px 'Courier New'";
            ctx.fillText("RESULTAT", 380, 200);
            
            ctx.fillStyle = "#fff";
            ctx.font = "24px 'Courier New'";
            ctx.fillText(drawnNumbers.join(" - "), 380, 240);
            
            ctx.fillStyle = "#88ff88";
            ctx.font = "bold 14px 'Courier New'";
            ctx.fillText(`NOMBRES CORRESPONDANTS: ${matchCount}`, 380, 290);
            
            ctx.fillStyle = "#d4af37";
            ctx.font = "bold 28px 'Courier New'";
            ctx.fillText(`${formatNumber(bankData?.bank || 0)}$`, 30, 315);
            ctx.fillStyle = "#aaa";
            ctx.font = "10px 'Courier New'";
            ctx.fillText("NEW BALANCE", 30, 340);
            
            if (win) {
                ctx.fillStyle = "#00ff88";
                ctx.font = "bold 16px 'Courier New'";
                ctx.fillText(`GAIN: +${formatNumber(winAmount)}$`, 380, 340);
            } else {
                ctx.fillStyle = "#ff4444";
                ctx.font = "bold 16px 'Courier New'";
                ctx.fillText(`PERTE: -${formatNumber(ticketPrice)}$`, 380, 340);
            }
            
            ctx.fillStyle = "#d4af37";
            ctx.font = "bold 14px 'Courier New'";
            ctx.fillText("🎲", 540, 100);
            
            ctx.fillStyle = "#aaa";
            ctx.fillRect(560, 380, 20, 15);
            
            const date = new Date();
            const dateStr = `${date.getDate()}/${date.getMonth()+1}/${date.getFullYear()}`;
            ctx.fillStyle = "#666";
            ctx.font = "9px 'Courier New'";
            ctx.fillText(dateStr, 30, 395);
            
            return canvas.toBuffer();
        }
        
        async function generateParrainCard(username, code, count, gains, type) {
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
            ctx.fillText("UCHIWA PARRAINAGE", 30, 55);
            ctx.font = "10px 'Courier New'";
            ctx.fillStyle = "#aaa";
            ctx.fillText("REFERRAL PROGRAM", 30, 75);
            
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
            ctx.font = "bold 18px 'Courier New'";
            
            if (type === "create") {
                ctx.fillText("CODE CREE", 380, 110);
                ctx.fillStyle = "#fff";
                ctx.font = "24px 'Courier New'";
                ctx.fillText(code, 380, 160);
                ctx.fillStyle = "#88ff88";
                ctx.font = "14px 'Courier New'";
                ctx.fillText("Partagez ce code a vos amis !", 380, 210);
            } else if (type === "stats") {
                ctx.fillText("STATISTIQUES", 380, 110);
                ctx.fillStyle = "#fff";
                ctx.font = "16px 'Courier New'";
                ctx.fillText(`Code: ${code}`, 380, 160);
                ctx.fillText(`Parraines: ${count}`, 380, 190);
                ctx.fillText(`Gains: ${formatNumber(gains)}$`, 380, 220);
            } else if (type === "use") {
                ctx.fillText("CODE UTILISE", 380, 110);
                ctx.fillStyle = "#fff";
                ctx.font = "20px 'Courier New'";
                ctx.fillText(code, 380, 160);
                ctx.fillStyle = "#88ff88";
                ctx.font = "14px 'Courier New'";
                ctx.fillText(`Bonus recu: +10000$`, 380, 210);
            }
            
            ctx.fillStyle = "#d4af37";
            ctx.font = "bold 28px 'Courier New'";
            ctx.fillText(`${formatNumber(bankData?.bank || 0)}$`, 30, 315);
            ctx.fillStyle = "#aaa";
            ctx.font = "10px 'Courier New'";
            ctx.fillText("NEW BALANCE", 30, 340);
            
            ctx.fillStyle = "#d4af37";
            ctx.font = "bold 14px 'Courier New'";
            ctx.fillText("🤝", 540, 100);
            
            ctx.fillStyle = "#aaa";
            ctx.fillRect(560, 380, 20, 15);
            
            const date = new Date();
            const dateStr = `${date.getDate()}/${date.getMonth()+1}/${date.getFullYear()}`;
            ctx.fillStyle = "#666";
            ctx.font = "9px 'Courier New'";
            ctx.fillText(dateStr, 30, 395);
            
            return canvas.toBuffer();
        }
        
        if (command === "image") {
            const subCommand = args[1]?.toLowerCase();
            if (subCommand === "on") {
                imageMode = true;
                return message.reply(`🖼️ 𝐌𝐎𝐃𝐄 𝐂𝐀𝐑𝐓𝐄 𝐁𝐀𝐍𝐂𝐀𝐈𝐑𝐄 𝐀𝐂𝐓𝐈𝐕𝐄\n━━━━━━━━━━━━━━━━\n✅ 𝐋𝐞𝐬 𝐜𝐨𝐦𝐦𝐚𝐧𝐝𝐞𝐬 𝐛𝐚𝐧𝐜𝐚𝐢𝐫𝐞𝐬 𝐬'𝐚𝐟𝐟𝐢𝐜𝐡𝐞𝐫𝐨𝐧𝐭 𝐚𝐯𝐞𝐜 𝐝𝐞𝐬 𝐜𝐚𝐫𝐭𝐞𝐬 𝐛𝐚𝐧𝐜𝐚𝐢𝐫𝐞𝐬.`);
            } else if (subCommand === "off") {
                imageMode = false;
                return message.reply(`📝 𝐌𝐎𝐃𝐄 𝐓𝐄𝐗𝐓𝐄 𝐀𝐂𝐓𝐈𝐕𝐄\n━━━━━━━━━━━━━━━━\n✅ 𝐋𝐞𝐬 𝐜𝐨𝐦𝐦𝐚𝐧𝐝𝐞𝐬 𝐛𝐚𝐧𝐜𝐚𝐢𝐫𝐞𝐬 𝐬'𝐚𝐟𝐟𝐢𝐜𝐡𝐞𝐫𝐨𝐧𝐭 𝐝𝐞́𝐬𝐨𝐫𝐦𝐚𝐢𝐬 𝐮𝐧𝐢𝐪𝐮𝐞𝐦𝐞𝐧𝐭 𝐞𝐧 𝐭𝐞𝐱𝐭𝐞.`);
            } else {
                const currentMode = imageMode ? "𝐂𝐀𝐑𝐓𝐄 🏦" : "𝐓𝐄𝐗𝐓𝐄 📝";
                return message.reply(`🖼️ 𝐂𝐎𝐍𝐅𝐈𝐆𝐔𝐑𝐀𝐓𝐈𝐎𝐍 𝐂𝐀𝐑𝐓𝐄\n━━━━━━━━━━━━━━━━\n📌 𝐌𝐨𝐝𝐞 𝐚𝐜𝐭𝐮𝐞𝐥 : ${currentMode}\n━━━━━━━━━━━━━━━━\n📝 ${p}𝐛𝐚𝐧𝐤 𝐢𝐦𝐚𝐠𝐞 𝐨𝐧 → 𝐌𝐨𝐝𝐞 𝐜𝐚𝐫𝐭𝐞 𝐛𝐚𝐧𝐜𝐚𝐢𝐫𝐞\n📝 ${p}𝐛𝐚𝐧𝐤 𝐢𝐦𝐚𝐠𝐞 𝐨𝐟𝐟 → 𝐌𝐨𝐝𝐞 𝐭𝐞𝐱𝐭𝐞`);
            }
        }
        
        if (command === "card") {
            const result = await createUserCard(user);
            if (result.success) {
                bankData = result.data;
                const cardMsg = `💳 𝐕𝐎𝐓𝐑𝐄 𝐂𝐀𝐑𝐓𝐄 𝐁𝐀𝐍𝐂𝐀𝐈𝐑𝐄\n━━━━━━━━━━━━━━━━\n🏦 𝐍° 𝐜𝐚𝐫𝐭𝐞 : ${bankData.cardNumber}\n📅 𝐄𝐱𝐩𝐢𝐫𝐚𝐭𝐢𝐨𝐧 : ${bankData.cardExpiry}\n🔐 𝐂𝐕𝐕 : ${bankData.cardCvv}\n━━━━━━━━━━━━━━━━\n💳 𝐔𝐭𝐢𝐥𝐢𝐬𝐞𝐳 𝐜𝐞𝐭𝐭𝐞 𝐜𝐚𝐫𝐭𝐞 𝐩𝐨𝐮𝐫 𝐯𝐨𝐬 𝐭𝐫𝐚𝐧𝐬𝐚𝐜𝐭𝐢𝐨𝐧𝐬 !`;
                
                if (imageMode !== false) {
                    const img = await generateBankCard("MY CARD", `${formatNumber(bankData.bank)}$`, cardMsg, username, bankData.cardCvv);
                    const imgPath = `./bank_card_${user}.png`;
                    fs.writeFileSync(imgPath, img);
                    await message.reply({ body: cardMsg, attachment: fs.createReadStream(imgPath) });
                    fs.unlinkSync(imgPath);
                } else {
                    return message.reply(cardMsg);
                }
            } else {
                return message.reply(`❌ 𝐄𝐫𝐫𝐞𝐮𝐫 𝐥𝐨𝐫𝐬 𝐝𝐞 𝐥𝐚 𝐜𝐫𝐞𝐚𝐭𝐢𝐨𝐧 𝐝𝐞 𝐥𝐚 𝐜𝐚𝐫𝐭𝐞.`);
            }
        }
        
        if (command === "lottery") {
            const subLottery = args[1]?.toLowerCase();
            const ticketPrice = parseAmountWithSuffix(args[2]);
            
            if (!subLottery || subLottery === "help") {
                return message.reply(`🎲 𝐋𝐎𝐓𝐓𝐄𝐑𝐘 𝐂𝐎𝐌𝐌𝐀𝐍𝐃𝐄𝐒\n━━━━━━━━━━━━━━━━\n📝 ${p}𝐛𝐚𝐧𝐤 𝐥𝐨𝐭𝐭𝐞𝐫𝐲 𝐩𝐥𝐚𝐲 <𝐦𝐨𝐧𝐭𝐚𝐧𝐭> → Acheter un ticket\n📊 ${p}𝐛𝐚𝐧𝐤 𝐥𝐨𝐭𝐭𝐞𝐫𝐲 𝐬𝐭𝐚𝐭𝐬 → Voir vos stats loterie\n🏆 ${p}𝐛𝐚𝐧𝐤 𝐥𝐨𝐭𝐭𝐞𝐫𝐲 𝐣𝐚𝐜𝐤𝐩𝐨𝐭 → Voir le jackpot\n━━━━━━━━━━━━━━━━\n🎁 Gains possibles: x2, x5, x10, x100, JACKPOT`);
            }
            
            if (subLottery === "play") {
                if (!ticketPrice || isNaN(ticketPrice) || ticketPrice <= 0) {
                    return message.reply(`❌ 𝐌𝐨𝐧𝐭𝐚𝐧𝐭 𝐢𝐧𝐯𝐚𝐥𝐢𝐝𝐞\n━━━━━━━━━━━━━━━━\n📝 ${p}𝐛𝐚𝐧𝐤 𝐥𝐨𝐭𝐭𝐞𝐫𝐲 𝐩𝐥𝐚𝐲 𝟓𝟎𝐤`);
                }
                
                if (ticketPrice > userMoney) {
                    return message.reply(`❌ 𝐅𝐨𝐧𝐝𝐬 𝐢𝐧𝐬𝐮𝐟𝐟𝐢𝐬𝐚𝐧𝐭𝐬\n💰 𝐓𝐨𝐧 𝐬𝐨𝐥𝐝𝐞 : ${formatNumber(userMoney)}$`);
                }
                
                const result = await playLottery(user, ticketPrice);
                
                if (!result.success) {
                    return message.reply(`❌ ${result.error}`);
                }
                
                await usersData.set(event.senderID, { money: userMoney - ticketPrice });
                
                if (result.win) {
                    bankData.bank = result.newBalance;
                    const winText = `🎉 𝐕𝐈𝐂𝐓𝐎𝐈𝐑𝐄 𝐀 𝐋𝐀 𝐋𝐎𝐓𝐓𝐄𝐑𝐈𝐄 !\n━━━━━━━━━━━━━━━━\n🔢 𝐕𝐨𝐬 𝐧𝐮𝐦𝐞́𝐫𝐨𝐬 : ${result.userNumbers.join(" - ")}\n🎲 𝐍𝐮𝐦𝐞́𝐫𝐨𝐬 𝐭𝐢𝐫𝐞́𝐬 : ${result.drawnNumbers.join(" - ")}\n✅ 𝐂𝐨𝐫𝐫𝐞𝐬𝐩𝐨𝐧𝐝𝐚𝐧𝐜𝐞𝐬 : ${result.matchCount}/3\n━━━━━━━━━━━━━━━━\n✨ 𝐆𝐚𝐢𝐧 : +${formatNumber(result.winAmount)}$ (x${result.multiplier})\n💰 𝐍𝐨𝐮𝐯𝐞𝐚𝐮 𝐬𝐨𝐥𝐝𝐞 : ${formatNumber(result.newBalance)}$`;
                    
                    if (imageMode !== false) {
                        const img = await generateLotteryCard(username, ticketPrice, true, result.winAmount, result.userNumbers, result.drawnNumbers, result.matchCount);
                        const imgPath = `./bank_lottery_${user}.png`;
                        fs.writeFileSync(imgPath, img);
                        await message.reply({ body: winText, attachment: fs.createReadStream(imgPath) });
                        fs.unlinkSync(imgPath);
                    } else {
                        return message.reply(winText);
                    }
                } else {
                    const loseText = `💀 𝐏𝐄𝐑𝐃𝐔 𝐀 𝐋𝐀 𝐋𝐎𝐓𝐓𝐄𝐑𝐈𝐄\n━━━━━━━━━━━━━━━━\n🔢 𝐕𝐨𝐬 𝐧𝐮𝐦𝐞́𝐫𝐨𝐬 : ${result.userNumbers.join(" - ")}\n🎲 𝐍𝐮𝐦𝐞́𝐫𝐨𝐬 𝐭𝐢𝐫𝐞́𝐬 : ${result.drawnNumbers.join(" - ")}\n✅ 𝐂𝐨𝐫𝐫𝐞𝐬𝐩𝐨𝐧𝐝𝐚𝐧𝐜𝐞𝐬 : ${result.matchCount}/3\n━━━━━━━━━━━━━━━━\n📉 𝐏𝐞𝐫𝐭𝐞 : -${formatNumber(ticketPrice)}$\n💰 𝐍𝐨𝐮𝐯𝐞𝐚𝐮 𝐬𝐨𝐥𝐝𝐞 : ${formatNumber(userMoney - ticketPrice)}$`;
                    
                    if (imageMode !== false) {
                        const img = await generateLotteryCard(username, ticketPrice, false, 0, result.userNumbers, result.drawnNumbers, result.matchCount);
                        const imgPath = `./bank_lottery_${user}.png`;
                        fs.writeFileSync(imgPath, img);
                        await message.reply({ body: loseText, attachment: fs.createReadStream(imgPath) });
                        fs.unlinkSync(imgPath);
                    } else {
                        return message.reply(loseText);
                    }
                }
            }
            
            if (subLottery === "stats") {
                const statsText = `📊 𝐒𝐓𝐀𝐓𝐒 𝐋𝐎𝐓𝐓𝐄𝐑𝐈𝐄\n━━━━━━━━━━━━━━━━\n🎫 𝐓𝐢𝐜𝐤𝐞𝐭𝐬 𝐚𝐜𝐡𝐞𝐭𝐞́𝐬 : ${bankData.lotteryTicket || 0}\n🏆 𝐕𝐢𝐜𝐭𝐨𝐢𝐫𝐞𝐬 : ${bankData.lotteryWon || 0}`;
                return message.reply(statsText);
            }
        }
        
        if (command === "parrainage" || command === "parrain") {
            const subParrain = args[1]?.toLowerCase();
            
            if (!subParrain || subParrain === "help") {
                return message.reply(`🎁 𝐏𝐀𝐑𝐑𝐀𝐈𝐍𝐀𝐆𝐄\n━━━━━━━━━━━━━━━━\n📝 ${p}𝐛𝐚𝐧𝐤 𝐩𝐚𝐫𝐫𝐚𝐢𝐧𝐚𝐠𝐞 𝐜𝐫𝐞𝐞𝐫 → Creer votre code\n📝 ${p}𝐛𝐚𝐧𝐤 𝐩𝐚𝐫𝐫𝐚𝐢𝐧𝐚𝐠𝐞 𝐮𝐭𝐢𝐥𝐢𝐬𝐞𝐫 <𝐜𝐨𝐝𝐞> → Utiliser un code\n📊 ${p}𝐛𝐚𝐧𝐤 𝐩𝐚𝐫𝐫𝐚𝐢𝐧𝐚𝐠𝐞 𝐬𝐭𝐚𝐭𝐬 → Vos statistiques\n🏆 ${p}𝐛𝐚𝐧𝐤 𝐩𝐚𝐫𝐫𝐚𝐢𝐧𝐚𝐠𝐞 𝐭𝐨𝐩 → Classement\n━━━━━━━━━━━━━━━━\n🎁 Bonus parraine: +10000$ | Bonus parrain: +5000$`);
            }
            
            if (subParrain === "creer" || subParrain === "generate") {
                const result = await createParrainCode(user);
                if (result.success) {
                    const createText = `🎁 𝐂𝐎𝐃𝐄 𝐂𝐑𝐄𝐄\n━━━━━━━━━━━━━━━━\n🔑 ${result.code}\n━━━━━━━━━━━━━━━━\n📝 Partagez ce code a vos amis !`;
                    
                    if (imageMode !== false) {
                        const img = await generateParrainCard(username, result.code, 0, 0, "create");
                        const imgPath = `./bank_parrain_${user}.png`;
                        fs.writeFileSync(imgPath, img);
                        await message.reply({ body: createText, attachment: fs.createReadStream(imgPath) });
                        fs.unlinkSync(imgPath);
                    } else {
                        return message.reply(createText);
                    }
                } else {
                    return message.reply(`❌ ${result.error}`);
                }
            }
            
            if (subParrain === "utiliser" || subParrain === "use") {
                const codeUtilise = args[2];
                if (!codeUtilise) {
                    return message.reply(`❌ 𝐕𝐞𝐮𝐢𝐥𝐥𝐞𝐳 𝐟𝐨𝐮𝐫𝐧𝐢𝐫 𝐮𝐧 𝐜𝐨𝐝𝐞\n📝 ${p}𝐛𝐚𝐧𝐤 𝐩𝐚𝐫𝐫𝐚𝐢𝐧𝐚𝐠𝐞 𝐮𝐭𝐢𝐥𝐢𝐬𝐞𝐫 <𝐜𝐨𝐝𝐞>`);
                }
                
                const result = await useParrainCode(user, codeUtilise);
                
                if (result.success) {
                    bankData.bank += result.bonus;
                    const useText = `🎉 𝐏𝐀𝐑𝐑𝐀𝐈𝐍𝐀𝐆𝐄 𝐑𝐄𝐔𝐒𝐒𝐈\n━━━━━━━━━━━━━━━━\n🔑 Code: ${codeUtilise}\n🎁 Bonus: +10000$\n💰 Nouveau solde: ${formatNumber(bankData.bank)}$`;
                    
                    if (imageMode !== false) {
                        const img = await generateParrainCard(username, codeUtilise, 0, 0, "use");
                        const imgPath = `./bank_parrain_use_${user}.png`;
                        fs.writeFileSync(imgPath, img);
                        await message.reply({ body: useText, attachment: fs.createReadStream(imgPath) });
                        fs.unlinkSync(imgPath);
                    } else {
                        return message.reply(useText);
                    }
                } else {
                    return message.reply(`❌ ${result.error}`);
                }
            }
        }
        
        switch (command) {
            case "deposit":
                const depositAmount = parseAmountWithSuffix(args[1]);
                
                if (!depositAmount || isNaN(depositAmount) || depositAmount <= 0) {
                    return message.reply(`❌ 𝐌𝐨𝐧𝐭𝐚𝐧𝐭 𝐢𝐧𝐯𝐚𝐥𝐢𝐝𝐞\n━━━━━━━━━━━━━━━━\n📝 𝐔𝐭𝐢𝐥𝐢𝐬𝐚𝐭𝐢𝐨𝐧 : ${p}𝐛𝐚𝐧𝐤 𝐝𝐞𝐩𝐨𝐬𝐢𝐭 <𝐦𝐨𝐧𝐭𝐚𝐧𝐭>\n💳 𝐄𝐱𝐞𝐦𝐩𝐥𝐞 : ${p}𝐛𝐚𝐧𝐤 𝐝𝐞𝐩𝐨𝐬𝐢𝐭 𝟓𝟎𝐤`);
                }
                
                if (!bankData.cardCreated) {
                    return message.reply(`❌ 𝐕𝐨𝐮𝐬 𝐝𝐞𝐯𝐞𝐳 𝐝'𝐚𝐛𝐨𝐫𝐝 𝐜𝐫𝐞́𝐞𝐫 𝐮𝐧𝐞 𝐜𝐚𝐫𝐭𝐞 𝐛𝐚𝐧𝐜𝐚𝐢𝐫𝐞\n━━━━━━━━━━━━━━━━\n📝 𝐔𝐭𝐢𝐥𝐢𝐬𝐞𝐳 : ${p}𝐛𝐚𝐧𝐤 𝐜𝐚𝐫𝐝`);
                }
                
                const depositResult = await updateUserBankData(user, depositAmount, null, "deposit");
                
                if (depositResult.success) {
                    bankData = depositResult.data;
                    const depositText = `✅ 𝐃𝐞́𝐩𝐨̂𝐭 𝐝𝐞 ${formatNumber(depositAmount)}$ 𝐞𝐟𝐟𝐞𝐜𝐭𝐮𝐞́ !\n💰 𝐍𝐨𝐮𝐯𝐞𝐚𝐮 𝐬𝐨𝐥𝐝𝐞 : ${formatNumber(bankData.bank)}$`;
                    return message.reply(depositText);
                } else {
                    return message.reply(`❌ ${depositResult.error}`);
                }
                
            case "withdraw":
                const withdrawAmount = parseAmountWithSuffix(args[1]);
                
                if (!withdrawAmount || isNaN(withdrawAmount) || withdrawAmount <= 0) {
                    return message.reply(`❌ 𝐌𝐨𝐧𝐭𝐚𝐧𝐭 𝐢𝐧𝐯𝐚𝐥𝐢𝐝𝐞\n━━━━━━━━━━━━━━━━\n📝 𝐔𝐭𝐢𝐥𝐢𝐬𝐚𝐭𝐢𝐨𝐧 : ${p}𝐛𝐚𝐧𝐤 𝐰𝐢𝐭𝐡𝐝𝐫𝐚𝐰 <𝐦𝐨𝐧𝐭𝐚𝐧𝐭>\n💳 𝐄𝐱𝐞𝐦𝐩𝐥𝐞 : ${p}𝐛𝐚𝐧𝐤 𝐰𝐢𝐭𝐡𝐝𝐫𝐚𝐰 𝟓𝟎𝐤`);
                }
                
                if (!bankData.cardCreated) {
                    return message.reply(`❌ 𝐕𝐨𝐮𝐬 𝐝𝐞𝐯𝐞𝐳 𝐝'𝐚𝐛𝐨𝐫𝐝 𝐜𝐫𝐞́𝐞𝐫 𝐮𝐧𝐞 𝐜𝐚𝐫𝐭𝐞 𝐛𝐚𝐧𝐜𝐚𝐢𝐫𝐞\n━━━━━━━━━━━━━━━━\n📝 𝐔𝐭𝐢𝐥𝐢𝐬𝐞𝐳 : ${p}𝐛𝐚𝐧𝐤 𝐜𝐚𝐫𝐝`);
                }
                
                const currentBalance = bankData.bank || 0;
                
                if (withdrawAmount > currentBalance) {
                    return message.reply(`❌ 𝐒𝐨𝐥𝐝𝐞 𝐢𝐧𝐬𝐮𝐟𝐟𝐢𝐬𝐚𝐧𝐭\n━━━━━━━━━━━━━━━━\n💰 𝐒𝐨𝐥𝐝𝐞 𝐛𝐚𝐧𝐜𝐚𝐢𝐫𝐞 : ${formatNumber(currentBalance)}$\n🎲 𝐌𝐨𝐧𝐭𝐚𝐧𝐭 : ${formatNumber(withdrawAmount)}$`);
                }
                
                const withdrawResult = await updateUserBankData(user, withdrawAmount, null, "withdraw");
                
                if (withdrawResult.success) {
                    bankData = withdrawResult.data;
                    const withdrawText = `💸 𝐑𝐞𝐭𝐫𝐚𝐢𝐭 𝐝𝐞 ${formatNumber(withdrawAmount)}$ 𝐞𝐟𝐟𝐞𝐜𝐭𝐮𝐞́ !\n💰 𝐍𝐨𝐮𝐯𝐞𝐚𝐮 𝐬𝐨𝐥𝐝𝐞 : ${formatNumber(bankData.bank)}$`;
                    return message.reply(withdrawText);
                } else {
                    return message.reply(`❌ ${withdrawResult.error}`);
                }
                
            case "balance":
            case "show":
                const bankBalance = bankData.bank || 0;
                const balMsg = `💰 𝐒𝐨𝐥𝐝𝐞 𝐝𝐢𝐬𝐩𝐨𝐧𝐢𝐛𝐥𝐞`;
                const balText = `📋 𝐕𝐨𝐭𝐫𝐞 𝐬𝐨𝐥𝐝𝐞 𝐛𝐚𝐧𝐜𝐚𝐢𝐫𝐞 : ${formatNumber(bankBalance)}$`;
                
                if (imageMode !== false) {
                    const img = await generateBankCard("BALANCE", `${formatNumber(bankBalance)}$`, balMsg, username);
                    const imgPath = `./bank_balance_${user}.png`;
                    fs.writeFileSync(imgPath, img);
                    await message.reply({ body: balText, attachment: fs.createReadStream(imgPath) });
                    fs.unlinkSync(imgPath);
                } else {
                    return message.reply(balText);
                }
                break;
                
            case "interest":
                if (bankData.bank <= 0) {
                    return message.reply(`❌ 𝐕𝐨𝐮𝐬 𝐧'𝐚𝐯𝐞𝐳 𝐚𝐮𝐜𝐮𝐧 𝐚𝐫𝐠𝐞𝐧𝐭 𝐞𝐧 𝐛𝐚𝐧𝐪𝐮𝐞 𝐩𝐨𝐮𝐫 𝐠𝐞𝐧𝐞𝐫𝐞𝐫 𝐝𝐞𝐬 𝐢𝐧𝐭𝐞𝐫𝐞̂𝐭𝐬.`);
                }
                
                const interestResult = await getInterest(user);
                
                if (interestResult.success) {
                    bankData = interestResult.data;
                    const interestText = `📈 𝐈𝐧𝐭𝐞́𝐫𝐞̂𝐭𝐬 𝐜𝐫𝐞́𝐝𝐢𝐭𝐞́𝐬 : ${formatNumber(Math.floor(interestResult.interestEarned))}$\n💰 𝐍𝐨𝐮𝐯𝐞𝐚𝐮 𝐬𝐨𝐥𝐝𝐞 : ${formatNumber(Math.floor(bankData.bank))}$`;
                    
                    if (imageMode !== false) {
                        const interestMsg = `+ ${formatNumber(Math.floor(interestResult.interestEarned))}$ (𝐢𝐧𝐭𝐞́𝐫𝐞̂𝐭𝐬)`;
                        const img = await generateBankCard("INTEREST", `${formatNumber(Math.floor(bankData.bank))}$`, interestMsg, username);
                        const imgPath = `./bank_interest_${user}.png`;
                        fs.writeFileSync(imgPath, img);
                        await message.reply({ body: interestText, attachment: fs.createReadStream(imgPath) });
                        fs.unlinkSync(imgPath);
                    } else {
                        return message.reply(interestText);
                    }
                } else {
                    return message.reply(`❌ ${interestResult.error}`);
                }
                break;
                
            case "top":
            case "richest":
                const topResult = await getTopUsers();
                if (topResult.success) {
                    const output = topResult.data.map((user, index) => {
                        return `[${index + 1}. ${user.userId}] - ${formatNumber(user.bank || 0)}$`;
                    }).join('\n');
                    return message.reply(`👑 𝐂𝐋𝐀𝐒𝐒𝐄𝐌𝐄𝐍𝐓 𝐃𝐄𝐒 𝐏𝐋𝐔𝐒 𝐑𝐈𝐂𝐇𝐄𝐒 👑\n━━━━━━━━━━━━━━━━\n${output || "Aucun utilisateur"}`);
                }
                break;
                
            default:
                return message.reply(`==[🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊 🏦]==\n━━━━━━━━━━━━━━━\n📲 𝐂𝐨𝐦𝐦𝐚𝐧𝐝𝐞𝐬 𝐝𝐢𝐬𝐩𝐨𝐧𝐢𝐛𝐥𝐞𝐬 :\n✰ ${p}𝐛𝐚𝐧𝐤 𝐝𝐞𝐩𝐨𝐬𝐢𝐭 (𝐦𝐨𝐧𝐭𝐚𝐧𝐭)\n✰ ${p}𝐛𝐚𝐧𝐤 𝐰𝐢𝐭𝐡𝐝𝐫𝐚𝐰 (𝐦𝐨𝐧𝐭𝐚𝐧𝐭)\n✰ ${p}𝐛𝐚𝐧𝐤 𝐛𝐚𝐥𝐚𝐧𝐜𝐞\n✰ ${p}𝐛𝐚𝐧𝐤 𝐢𝐧𝐭𝐞𝐫𝐞𝐬𝐭\n✰ ${p}𝐛𝐚𝐧𝐤 𝐭𝐨𝐩\n✰ ${p}𝐛𝐚𝐧𝐤 𝐜𝐚𝐫𝐝\n✰ ${p}𝐛𝐚𝐧𝐤 𝐥𝐨𝐭𝐭𝐞𝐫𝐲\n✰ ${p}𝐛𝐚𝐧𝐤 𝐩𝐚𝐫𝐫𝐚𝐢𝐧𝐚𝐠𝐞\n✰ ${p}𝐛𝐚𝐧𝐤 𝐢𝐦𝐚𝐠𝐞 𝐨𝐧/𝐨𝐟𝐟\n━━━━━━━━━━━━━━━━`);
        }
    }
};
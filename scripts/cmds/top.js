const fs = require("fs");
const { createCanvas } = require("canvas");
const axios = require("axios");

const CASH_API_URL = "https://cash-api-five.vercel.app/api/cash";
const CONVERT_API_URL = "https://numbers-conversion.vercel.app/api/format";

function toBold(text) {
    const boldMap = {
        'A': '𝐀', 'B': '𝐁', 'C': '𝐂', 'D': '𝐃', 'E': '𝐄', 'F': '𝐅',
        'G': '𝐆', 'H': '𝐇', 'I': '𝐈', 'J': '𝐉', 'K': '𝐊', 'L': '𝐋',
        'M': '𝐌', 'N': '𝐍', 'O': '𝐎', 'P': '𝐏', 'Q': '𝐐', 'R': '𝐑',
        'S': '𝐒', 'T': '𝐓', 'U': '𝐔', 'V': '𝐕', 'W': '𝐖', 'X': '𝐗',
        'Y': '𝐘', 'Z': '𝐙',
        'a': '𝐚', 'b': '𝐛', 'c': '𝐜', 'd': '𝐝', 'e': '𝐞', 'f': '𝐟',
        'g': '𝐠', 'h': '𝐡', 'i': '𝐢', 'j': '𝐣', 'k': '𝐤', 'l': '𝐥',
        'm': '𝐦', 'n': '𝐧', 'o': '𝐨', 'p': '𝐩', 'q': '𝐪', 'r': '𝐫',
        's': '𝐬', 't': '𝐭', 'u': '𝐮', 'v': '𝐯', 'w': '𝐰', 'x': '𝐱',
        'y': '𝐲', 'z': '𝐳',
        '0': '𝟎', '1': '𝟏', '2': '𝟐', '3': '𝟑', '4': '𝟒', '5': '𝟓',
        '6': '𝟔', '7': '𝟕', '8': '𝟖', '9': '𝟗'
    };
    return text.split('').map(char => boldMap[char] || char).join('');
}

async function getAllUsersCash() {
    try {
        const response = await axios.get(`${CASH_API_URL}/top?limit=50`);
        if (response.data && response.data.success && Array.isArray(response.data.data)) {
            return response.data.data;
        }
    } catch (error) {
        console.error("Cash API Error:", error.message);
    }
    return [];
}

async function formatNumberWithAPI(num) {
    try {
        const response = await axios.get(`${CONVERT_API_URL}?number=${num}`);
        if (response.data && response.data.success) return response.data.formatted;
    } catch (error) {}
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

async function generateTopImage(users, page, totalPages) {
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
    ctx.font = "bold 22px 'Courier New'";
    ctx.fillText("UCHIWA BANK", 30, 55);
    ctx.font = "11px 'Courier New'";
    ctx.fillStyle = "#aaa";
    ctx.fillText("PREMIUM CLASSEMENT", 30, 75);

    ctx.fillStyle = "#ffd700";
    ctx.font = "bold 20px 'Courier New'";
    ctx.fillText("TOP 50 - LES PLUS RICHES", 150, 55);

    ctx.fillStyle = "#d4af37";
    ctx.fillRect(480, 35, 45, 30);
    ctx.fillStyle = "#b8960c";
    ctx.fillRect(484, 39, 37, 22);

    ctx.fillStyle = "#fff";
    ctx.font = "bold 13px 'Courier New'";
    ctx.fillText("RANG", 30, 115);
    ctx.fillText("NOM", 100, 115);
    ctx.textAlign = "right";
    ctx.fillText("MONTANT", 560, 115);
    ctx.textAlign = "left";

    ctx.fillStyle = "#2c2c2c";
    ctx.fillRect(20, 125, 560, 2);

    let y = 145;
    for (let i = 0; i < users.length; i++) {
        const user = users[i];
        const rank = (page - 1) * 10 + i + 1;
        const name = user.name || `User_${String(user.userId).slice(-5)}`;
        const cash = user.formattedCash || formatNumber(user.cash || 0);

        if (rank === 1) ctx.fillStyle = "#ffd700";
        else if (rank === 2) ctx.fillStyle = "#c0c0c0";
        else if (rank === 3) ctx.fillStyle = "#cd7f32";
        else ctx.fillStyle = "#fff";

        ctx.font = "bold 13px 'Courier New'";
        ctx.fillText(`${rank}.`, 30, y);
        ctx.fillText(name, 100, y);
        ctx.textAlign = "right";
        ctx.fillText(`${cash}$`, 560, y);
        ctx.textAlign = "left";

        y += 25;
        if (y > 380) break;
    }

    ctx.fillStyle = "#aaa";
    ctx.font = "10px 'Courier New'";
    ctx.fillText(`Page ${page}/${totalPages}`, 30, 400);

    const date = new Date();
    const dateStr = `${date.getDate()}/${date.getMonth()+1}/${date.getFullYear()}`;
    ctx.fillStyle = "#666";
    ctx.font = "9px 'Courier New'";
    ctx.fillText(dateStr, 500, 400);

    return canvas.toBuffer();
}

module.exports = {
    config: {
        name: "top",
        version: "6.0",
        author: "Itachi Soma",
        role: 0,
        shortDescription: { en: "Top richest users" },
        longDescription: { en: "Displays the top 50 richest users with real names" },
        category: "group",
        guide: { en: "{pn} [page]" }
    },

    onStart: async function ({ api, args, message, event, usersData }) {
        const allUsers = await getAllUsersCash();

        if (allUsers.length === 0) {
            return message.reply(toBold("❌ Aucune donnée trouvée."));
        }

        let page = args[0] ? parseInt(args[0]) : 1;
        const usersPerPage = 10;
        const totalPages = Math.ceil(Math.min(allUsers.length, 50) / usersPerPage);

        if (page < 1 || page > totalPages) {
            return message.reply(toBold(`❌ Page invalide. Il y a ${totalPages} pages disponibles.`));
        }

        const startIndex = (page - 1) * usersPerPage;
        const endIndex = startIndex + usersPerPage;
        let usersOnPage = allUsers.slice(startIndex, endIndex);

        const enrichedUsers = [];
        for (const user of usersOnPage) {
            let name = null;

            // 1. Essayer getUserInfo (endpoint Messenger, notre fix)
            try {
                const info = await api.getUserInfo(user.userId);
                if (info && info.name && info.name !== user.userId && !info.name.startsWith("User_")) {
                    name = info.name;
                }
            } catch (e) {}

            // 2. Fallback : base locale usersData
            if (!name) {
                try {
                    const localName = await usersData.getName(user.userId);
                    if (localName && localName !== user.userId && localName !== "Facebook User") {
                        name = localName;
                    }
                } catch (e) {}
            }

            // 3. Dernier recours : ID tronqué
            if (!name) name = `User_${String(user.userId).slice(-5)}`;

            const formattedCash = await formatNumberWithAPI(user.cash || 0);
            enrichedUsers.push({
                ...user,
                name: toBold(name),
                formattedCash
            });
        }

        let textMsg = toBold("📝 TOP 50 - LES PLUS RICHES") + `\n━━━━━━━━━━━━━━━━━━\n`;
        enrichedUsers.forEach((user, index) => {
            const rank = startIndex + index + 1;
            const prefix = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : "▸";
            textMsg += `${prefix} ${rank}. ${user.name}: ${user.formattedCash}$\n`;
        });
        textMsg += `━━━━━━━━━━━━━━━━━━\n${toBold(`📜 Page ${page}/${totalPages}`)}`;

        await message.reply(textMsg);

        try {
            const img = await generateTopImage(enrichedUsers, page, totalPages);
            const imgPath = `./top_${Date.now()}.png`;
            fs.writeFileSync(imgPath, img);
            await message.reply({
                body: toBold("💳 Carte du classement :"),
                attachment: fs.createReadStream(imgPath)
            });
            fs.unlinkSync(imgPath);
        } catch (error) {
            console.error("Erreur génération image:", error);
        }
    }
};
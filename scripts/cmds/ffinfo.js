const axios = require("axios");
const Canvas = require("canvas");
const fs = require("fs-extra");
const path = require("path");

const SERVER_URL = "https://fadil-ffinfo.vercel.app";

module.exports = {
  config: {
    name: "ffinfo",
    aliases: ["ff", "uid"],
    version: "Ultimate",
    role: 0,
    shortDescription: { en: "FF Full Stats", fr: "Stats Complètes FF" },
    longDescription: { en: "Complete profile + enhanced canvas", fr: "Profil complet avec canvas avancé" },
    guide: { en: "{p}ffinfo <uid>", fr: "{p}ffinfo <uid>" },
    author: "L'Uchiha Perdu",
    category: "game"
  },

  onStart: async ({ api, event, args }) => {
    const { threadID, messageID } = event;
    const uid = args[0];

    if (!uid) return api.sendMessage("⚠️ UID manquant", threadID, messageID);

    let statusMessageID;

    api.sendMessage("⏳ 𝐈𝐧𝐢𝐭𝐢𝐚𝐥𝐢𝐬𝐚𝐭𝐢𝐨𝐧...", threadID, async (err, info) => {
        if (err) return;
        statusMessageID = info.messageID;

        try {
            api.editMessage("📡 𝐒𝐜𝐚𝐧 𝐝𝐞𝐬 𝐬𝐞𝐫𝐯𝐞𝐮𝐫𝐬...", statusMessageID);
            const { data: res } = await axios.get(`${SERVER_URL}/api/player/${uid}`);
            
            api.editMessage(`💾 𝐃𝐨𝐧𝐧𝐞́𝐞𝐬 𝐓𝐫𝐨𝐮𝐯𝐞́𝐞𝐬 (${res.region})...`, statusMessageID);
            api.editMessage(`⚡ 𝐑𝐞𝐦𝐢𝐬𝐞 𝐞𝐧 𝐜𝐨𝐡𝐞́𝐫𝐞𝐧𝐜𝐞...`, statusMessageID);

            let cleanBuffer;
            try {
                cleanBuffer = (await axios.get(`${SERVER_URL}/api/image/clean/${uid}`, { responseType: 'arraybuffer' })).data;
            } catch (imgErr) {
                const backupUrl = `http://profile.thug4ff.com/api/profile?uid=${uid}`;
                cleanBuffer = (await axios.get(backupUrl, { responseType: 'arraybuffer' })).data;
            }

            api.editMessage(`🎨 𝐆𝐞́𝐧𝐞́𝐫𝐚𝐭𝐢𝐨𝐧 𝐂𝐚𝐫𝐭𝐞...`, statusMessageID);
            
            const playerData = res.data;
            const canvasBuffer = await drawCard(playerData, cleanBuffer, res.region);

            const b = playerData.basicinfo;
            const c = playerData.clanbasicinfo || {};
            const s = playerData.socialinfo || {};
            const p = playerData.petinfo || {};
            const cr = playerData.creditscoreinfo || {};
            const ach = playerData.achievements || {};
            const wpn = playerData.weapon_stats || {};
            const char = playerData.character_stats || {};

            const createDt = new Date(parseInt(b.createat) * 1000).toLocaleDateString("fr-FR");
            const lastLg = new Date(parseInt(b.lastloginat) * 1000).toLocaleString("fr-FR");
            
            const totalMatches = ach.total_matches || 1;
            const winRate = ((ach.top1 || 0) / totalMatches * 100).toFixed(1);
            const maxSurvival = ach.longest_survival || 0;
            const survivalMin = Math.floor(maxSurvival / 60);
            const survivalSec = maxSurvival % 60;

            const finalMsg = 
`🦅 𝐅𝐑𝐄𝐄 𝐅𝐈𝐑𝐄 𝐏𝐑𝐎𝐅𝐈𝐋𝐄 🦅
━━━━━━━━━━━━━━━
👤 𝐍𝐨𝐦: ${b.nickname}
🆔 𝐔𝐈𝐃: ${b.accountid}
🌍 𝐑𝐞́𝐠𝐢𝐨𝐧: ${res.region}
⭐ 𝐋𝐯𝐥: ${b.level} (${b.exp})
👍 𝐋𝐢𝐤𝐞𝐬: ${b.liked}
🛡️ 𝐒𝐜𝐨𝐫𝐞: ${cr.creditscore || "N/A"}

🏰 𝐆𝐮𝐢𝐥𝐝𝐞: ${c.clanname || "Aucune"} (Niv.${c.clanlevel || 0})
👑 𝐂𝐡𝐞𝐟: ${c.captainnickname || c.captainid || "N/A"}

⚔️ 𝐊/𝐃: ${ach.kd_ratio || "N/A"}
🏆 𝐖𝐢𝐧𝐑𝐚𝐭𝐞: ${winRate}%
🔫 𝐀𝐫𝐦𝐞: ${wpn.favorite_weapon || "N/A"}
👤 𝐏𝐞𝐫𝐬𝐨: ${char.favorite_character || "N/A"}
🎯 𝐇𝐞𝐚𝐝𝐬𝐡𝐨𝐭: ${ach.headshot_rate || 0}%
⏱️ 𝐒𝐮𝐫𝐯𝐢𝐞: ${survivalMin}m${survivalSec}s

🏅 𝐁𝐑: ${b.rankingpoints} | 🔫 𝐂𝐒: ${b.csrankingpoints}
🔥 𝐁𝐚𝐝𝐠𝐞𝐬: ${b.badgecnt}

🐾 𝐏𝐞𝐭: ${p.id ? p.name + " Lv." + p.level : "Aucun"}
📅 𝐂𝐫𝐞́𝐚𝐭𝐢𝐨𝐧: ${createDt}
🕒 𝐋𝐨𝐠𝐢𝐧: ${lastLg}
📝 𝐁𝐢𝐨: ${s.signature || "Pas de bio"}
━━━━━━━━━━━━━━━`;

            const cleanPath = path.join(__dirname, `clean_${uid}.png`);
            const cardPath = path.join(__dirname, `card_${uid}.png`);
            fs.writeFileSync(cleanPath, cleanBuffer);
            fs.writeFileSync(cardPath, canvasBuffer);

            api.sendMessage(finalMsg, threadID, async (err) => {
                if (err) return;
                
                await api.sendMessage({
                    body: "👤 𝐀𝐯𝐚𝐭𝐚𝐫 𝐍𝐞𝐭 :",
                    attachment: fs.createReadStream(cleanPath)
                }, threadID);

                await api.sendMessage({
                    body: "💳 𝐅𝐢𝐜𝐡𝐞 𝐎𝐟𝐟𝐢𝐜𝐢𝐞𝐥𝐥𝐞 :",
                    attachment: fs.createReadStream(cardPath)
                }, threadID, () => {
                    fs.unlinkSync(cleanPath);
                    fs.unlinkSync(cardPath);
                    api.deleteMessage(statusMessageID);
                });
            });

        } catch (e) {
            if (e.response && e.response.status === 404) {
                api.editMessage("❌ 𝐉𝐨𝐮𝐞𝐮𝐫 𝐢𝐧𝐭𝐫𝐨𝐮𝐯𝐚𝐛𝐥𝐞.", statusMessageID);
            } else {
                api.editMessage("❌ 𝐄𝐫𝐫𝐞𝐮𝐫 𝐭𝐞𝐜𝐡𝐧𝐢𝐪𝐮𝐞.", statusMessageID);
            }
        }
    });
  }
};

async function drawCard(data, imgBuf, region) {
    const W = 800, H = 1400;
    const canvas = Canvas.createCanvas(W, H);
    const ctx = canvas.getContext("2d");
    const b = data.basicinfo;
    const ach = data.achievements || {};
    const wpn = data.weapon_stats || {};
    const char = data.character_stats || {};

    const grd = ctx.createLinearGradient(0, 0, 0, H);
    grd.addColorStop(0, "#0F2027");
    grd.addColorStop(0.5, "#203A43");
    grd.addColorStop(1, "#2C5364");
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = "rgba(0, 229, 255, 0.1)";
    for (let i = 0; i < 20; i++) {
        const x = Math.random() * W;
        const y = Math.random() * H;
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fill();
    }

    try {
        const img = await Canvas.loadImage(imgBuf);
        const sc = 1.7;
        const oW = img.width * sc, oH = img.height * sc;
        ctx.drawImage(img, (W - oW) / 2, 50, oW, oH);
        
        ctx.strokeStyle = "#00E5FF";
        ctx.lineWidth = 4;
        ctx.strokeRect((W - oW) / 2 - 2, 50 - 2, oW + 4, oH + 4);
    } catch (e) {}

    const pY = H - 550;
    ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
    ctx.fillRect(0, pY, W, 550);
    ctx.fillStyle = "#00E5FF";
    ctx.fillRect(0, pY, W, 4);

    const cX = W / 2;
    let tY = pY + 80;

    ctx.textAlign = "center";
    ctx.fillStyle = "#FFF";
    ctx.font = "bold 70px 'Arial Black'";
    ctx.fillText(b.nickname.toUpperCase(), cX, tY);

    tY += 50;
    ctx.fillStyle = "#CCC";
    ctx.font = "28px Arial";
    ctx.fillText(`${b.accountid}  •  ${region}  •  Lv.${b.level}`, cX, tY);

    tY += 80;
    const bw = 200, gap = 40;
    const sx = (W - (bw * 3 + gap * 2)) / 2;

    ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
    ctx.shadowBlur = 10;
    
    drawStat(ctx, sx, tY, "BR RANK", b.rankingpoints, "#F1C40F");
    drawStat(ctx, sx + bw + gap, tY, "CS RANK", b.csrankingpoints, "#00E5FF");
    drawStat(ctx, sx + (bw + gap) * 2, tY, "BADGES", b.badgecnt, "#E74C3C");
    
    ctx.shadowBlur = 0;

    tY += 120;
    ctx.font = "bold 24px Arial";
    ctx.fillStyle = "#AAA";
    ctx.textAlign = "left";
    
    ctx.fillText(`⚔️ K/D: ${ach.kd_ratio || "N/A"}`, 50, tY);
    ctx.fillText(`🏆 Win Rate: ${((ach.top1 || 0) / (ach.total_matches || 1) * 100).toFixed(1)}%`, 300, tY);
    ctx.fillText(`🎯 HS: ${ach.headshot_rate || 0}%`, 550, tY);
    
    tY += 40;
    ctx.fillText(`🔫 ${wpn.favorite_weapon?.substring(0, 12) || "N/A"}`, 50, tY);
    ctx.fillText(`👤 ${char.favorite_character || "N/A"}`, 300, tY);
    
    const maxSurvival = ach.longest_survival || 0;
    const min = Math.floor(maxSurvival / 60);
    const sec = maxSurvival % 60;
    ctx.fillText(`⏱️ ${min}m${sec}s`, 550, tY);
    
    tY += 40;
    ctx.fillText(`🔥 Top 1: ${ach.top1 || 0}`, 50, tY);
    ctx.fillText(`💀 Matches: ${ach.total_matches || 0}`, 300, tY);
    ctx.fillText(`⚡ Avg DMG: ${ach.avg_damage || 0}`, 550, tY);

    const clanName = data.clanbasicinfo?.clanname;
    if (clanName) {
        tY += 60;
        ctx.textAlign = "center";
        ctx.fillStyle = "#FFD700";
        ctx.font = "bold 26px Arial";
        ctx.fillText(`🏰 ${clanName}`, cX, tY);
        ctx.fillStyle = "#AAA";
        ctx.font = "20px Arial";
        ctx.fillText(`Level ${data.clanbasicinfo?.clanlevel || 0} • ${data.clanbasicinfo?.membercnt || 0}/${data.clanbasicinfo?.maxmembercnt || 0} members`, cX, tY + 30);
    }

    ctx.fillStyle = "#00E5FF";
    ctx.font = "18px Arial";
    ctx.textAlign = "center";
    ctx.fillText("FreeFire Inspector • L'Uchiha Perdu", cX, H - 20);

    return canvas.toBuffer();
}

function drawStat(ctx, x, y, t, v, c) {
    ctx.textAlign = "center";
    ctx.fillStyle = c;
    ctx.font = "bold 24px Arial";
    ctx.fillText(t, x + 100, y);
    ctx.fillStyle = "#FFF";
    ctx.font = "bold 50px Arial";
    ctx.fillText(v, x + 100, y + 60);
    
    ctx.fillStyle = c + "40";
    ctx.beginPath();
    ctx.arc(x + 100, y - 10, 60, 0, Math.PI * 2);
    ctx.fill();
}
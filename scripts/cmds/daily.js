const moment = require("moment-timezone");
const fs = require("fs");
const { createCanvas, loadImage } = require("canvas");
const axios = require("axios");

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
        await axios.post(`${CASH_API_URL}/${userId}/add`, { amount });
    } catch (error) {
        console.error("Cash API Update Error:", error.message);
    }
}

function formatNumber(num) {
    if (num === null || num === undefined || isNaN(num)) return "0";
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

async function generateDailyCard(userInfo, amount, dayName) {
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

    ctx.fillStyle = "#e0e0e0";
    ctx.font = "22px 'Courier New'";
    ctx.fillText("4532 **** **** 5772", 90, 125);

    ctx.fillStyle = "#aaa";
    ctx.font = "11px 'Courier New'";
    ctx.fillText("VALID THRU", 25, 160);
    ctx.fillStyle = "#e0e0e0";
    ctx.font = "16px 'Courier New'";
    ctx.fillText("12/28", 120, 160);

    ctx.fillStyle = "#ffd700";
    ctx.font = "bold 16px 'Courier New'";
    ctx.fillText("RECOMPENSE QUOTIDIENNE", 200, 165);

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

    ctx.fillStyle = "#00ff88";
    ctx.font = "bold 20px 'Courier New'";
    ctx.fillText(`${dayName}`, 25, 295);

    ctx.fillStyle = "#ffd700";
    ctx.font = "bold 22px 'Courier New'";
    ctx.fillText(`+ ${formatNumber(amount)}$`, 25, 325);

    const date = new Date();
    const dateStr = `${date.getDate()}/${date.getMonth()+1}/${date.getFullYear()}`;
    ctx.fillStyle = "#666";
    ctx.font = "9px 'Courier New'";
    ctx.fillText(dateStr, 450, 328);

    return canvas.toBuffer();
}

module.exports = {
    config: {
        name: "daily",
        version: "2.0",
        author: "NTKhang, updated byItachi Soma",
        countDown: 5,
        role: 0,
        description: {
            vi: "Nhận quà hàng ngày",
            en: "Receive daily gift"
        },
        category: "economy",
        guide: {
            vi: "   {pn}: Nhận quà hàng ngày"
                + "\n   {pn} info: Xem thông tin quà hàng ngày",
            en: "   {pn}"
                + "\n   {pn} info: View daily gift information"
        },
        envConfig: {
            rewardFirstDay: {
                coin: 20000,
                exp: 100
            }
        }
    },

    langs: {
        vi: {
            monday: "Thứ 2",
            tuesday: "Thứ 3",
            wednesday: "Thứ 4",
            thursday: "Thứ 5",
            friday: "Thứ 6",
            saturday: "Thứ 7",
            sunday: "Chủ nhật",
            alreadyReceived: "Bạn đã nhận quà rồi",
            received: "Bạn đã nhận được %1 coin và %2 exp"
        },
        en: {
            monday: "Monday",
            tuesday: "Tuesday",
            wednesday: "Wednesday",
            thursday: "Thursday",
            friday: "Friday",
            saturday: "Saturday",
            sunday: "Sunday",
            alreadyReceived: "You have already received the gift",
            received: "You have received %1$ and %2 exp"
        }
    },

    onStart: async function ({ args, message, event, envCommands, usersData, commandName, getLang, api }) {
        const reward = envCommands[commandName].rewardFirstDay;
        if (args[0] == "info") {
            let msg = "";
            for (let i = 1; i < 8; i++) {
                const getCoin = Math.floor(reward.coin * (1 + 20 / 100) ** ((i == 0 ? 7 : i) - 1));
                const getExp = Math.floor(reward.exp * (1 + 20 / 100) ** ((i == 0 ? 7 : i) - 1));
                const day = i == 7 ? getLang("sunday") :
                    i == 6 ? getLang("saturday") :
                        i == 5 ? getLang("friday") :
                            i == 4 ? getLang("thursday") :
                                i == 3 ? getLang("wednesday") :
                                    i == 2 ? getLang("tuesday") :
                                        getLang("monday");
                msg += `${day}: ${getCoin} coin, ${getExp} exp\n`;
            }
            return message.reply(msg);
        }

        const dateTime = moment.tz("Asia/Ho_Chi_Minh").format("DD/MM/YYYY");
        const date = new Date();
        const currentDay = date.getDay();
        const { senderID } = event;

        const userData = await usersData.get(senderID);
        if (userData.data.lastTimeGetReward === dateTime)
            return message.reply(getLang("alreadyReceived"));

        const getCoin = Math.floor(reward.coin * (1 + 20 / 100) ** ((currentDay == 0 ? 7 : currentDay) - 1));
        const getExp = Math.floor(reward.exp * (1 + 20 / 100) ** ((currentDay == 0 ? 7 : currentDay) - 1));
        userData.data.lastTimeGetReward = dateTime;
        await usersData.set(senderID, {
            exp: userData.exp + getExp,
            data: userData.data
        });

        await updateUserCash(senderID, getCoin);
        const newCash = await getUserCash(senderID);

        const dayName = currentDay == 0 ? getLang("sunday") :
            currentDay == 1 ? getLang("monday") :
                currentDay == 2 ? getLang("tuesday") :
                    currentDay == 3 ? getLang("wednesday") :
                        currentDay == 4 ? getLang("thursday") :
                            currentDay == 5 ? getLang("friday") :
                                getLang("saturday");

        message.reply(getLang("received", getCoin, getExp));

        try {
            const userInfo = await api.getUserInfo(senderID);
            const cardImage = await generateDailyCard(
                { userID: senderID, name: userInfo[senderID].name, thumbSrc: userInfo[senderID]?.thumbSrc },
                getCoin,
                dayName
            );
            const imgPath = `./daily_${senderID}.png`;
            fs.writeFileSync(imgPath, cardImage);
            await message.reply({
                body: `💳 𝐑𝐞𝐜𝐨𝐦𝐩𝐞𝐧𝐬𝐞 𝐐𝐮𝐨𝐭𝐢𝐝𝐢𝐞𝐧𝐧𝐞`,
                attachment: fs.createReadStream(imgPath)
            });
            fs.unlinkSync(imgPath);
        } catch (error) {
            console.error("Erreur generation carte:", error);
        }
    }
};
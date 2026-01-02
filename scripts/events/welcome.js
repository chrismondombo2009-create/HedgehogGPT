const { getTime, drive } = global.utils;
const Canvas = require("canvas");
const fs = require("fs-extra");
const path = require("path");

const BOT_ID = global.botID;
const ADMIN1_ID = "100083846212138";
const ADMIN2_ID = "61578433048588";
const ADMIN1_NAME = "Walter O'Brien";
const ADMIN2_NAME = "ʚʆɞ Sømå Sønïč ʚʆɞ";

module.exports = {
    config: { name: "welcome", version: "2.0", author: "System", category: "events" },

    langs: {
        en: {
            session1: "morning", session2: "noon", session3: "afternoon", session4: "evening",
            welcomeMessage: "𝐓𝐡𝐚𝐧𝐤 𝐲𝐨𝐮 𝐟𝐨𝐫 𝐢𝐧𝐯𝐢𝐭𝐢𝐧𝐠 𝐦𝐞 𝐭𝐨 𝐭𝐡𝐞 𝐠𝐫𝐨𝐮𝐩!\n─────⊱◈☘️◈⊰─────\n𝐁𝐨𝐭 𝐏𝐫𝐞𝐟𝐢𝐱: 〖%1〗\n─────⊱◈☘️◈⊰─────\n𝐄𝐧𝐭𝐞𝐫 %1help 𝐭𝐨 𝐬𝐞𝐞 𝐚𝐥𝐥 𝐜𝐨𝐦𝐦𝐚𝐧𝐝𝐬",
            multiple1: "you", multiple2: "you guys",
            defaultWelcomeMessage: `𝙃𝙀𝙇𝙇𝙊 {userName}\n─────⊱◈☘️◈⊰─────\n𝙂𝙍𝙊𝙐𝙋 𝙉𝘼𝙈𝙀: {boxName}\n─────⊱◈☘️◈⊰─────`
        }
    },

    onStart: async ({ threadsData, message, event, api, getLang }) => {
        if (event.logMessageType == "log:subscribe") return async function () {
            const hours = getTime("HH");
            const { threadID } = event;
            const { nickNameBot } = global.GoatBot.config;
            const prefix = global.utils.getPrefix(threadID);
            const dataAddedParticipants = event.logMessageData.addedParticipants;

            if (dataAddedParticipants.some((item) => item.userFbId == api.getCurrentUserID())) {
                if (nickNameBot) api.changeNickname(nickNameBot, threadID, api.getCurrentUserID());
                const thankText = getLang("welcomeMessage", prefix);
                const thankImage = await this.createBotWelcomeCanvas(api);
                const imagePath = path.join(__dirname, `bot_welcome_${Date.now()}.png`);
                fs.writeFileSync(imagePath, thankImage);
                await message.send(thankText);
                await message.send({ attachment: fs.createReadStream(imagePath) });
                fs.unlinkSync(imagePath);
                return;
            }

            if (!global.temp.welcomeEvent[threadID]) global.temp.welcomeEvent[threadID] = { joinTimeout: null, dataAddedParticipants: [] };
            global.temp.welcomeEvent[threadID].dataAddedParticipants.push(...dataAddedParticipants);
            clearTimeout(global.temp.welcomeEvent[threadID].joinTimeout);

            global.temp.welcomeEvent[threadID].joinTimeout = setTimeout(async function () {
                const threadData = await threadsData.get(threadID);
                if (threadData.settings.sendWelcomeMessage == false) return;
                const dataAddedParticipants = global.temp.welcomeEvent[threadID].dataAddedParticipants;
                const dataBanned = threadData.data.banned_ban || [];
                const threadName = threadData.threadName;
                const userName = [], mentions = [];
                let multiple = false;
                if (dataAddedParticipants.length > 1) multiple = true;

                for (const user of dataAddedParticipants) {
                    if (dataBanned.some((item) => item.id == user.userFbId)) continue;
                    userName.push(user.fullName);
                    mentions.push({ tag: user.fullName, id: user.userFbId });
                }

                if (userName.length == 0) return;
                let { welcomeMessage = getLang("defaultWelcomeMessage") } = threadData.data;
                const form = { mentions: welcomeMessage.match(/\{userNameTag\}/g) ? mentions : null };
                welcomeMessage = welcomeMessage
                    .replace(/\{userName\}|\{userNameTag\}/g, userName.join(", "))
                    .replace(/\{boxName\}|\{threadName\}/g, threadName)
                    .replace(/\{multiple\}/g, multiple ? getLang("multiple2") : getLang("multiple1"))
                    .replace(/\{session\}/g,
                        hours <= 10 ? getLang("session1") :
                        hours <= 12 ? getLang("session2") :
                        hours <= 18 ? getLang("session3") : getLang("session4")
                    );

                form.body = welcomeMessage;

                const threadInfo = await api.getThreadInfo(threadID);
                const userID = dataAddedParticipants[0].userFbId;
                const userAvatar = await this.getUserAvatar(api, userID);
                const groupAvatar = await this.getGroupAvatar(api, threadID);
                const position = threadInfo.participantIDs.length;

                const welcomeImage = await this.createUserWelcomeCanvas(
                    userName[0],
                    userAvatar,
                    threadName,
                    groupAvatar,
                    position
                );

                const imagePath = path.join(__dirname, `welcome_${userID}_${Date.now()}.png`);
                fs.writeFileSync(imagePath, welcomeImage);

                await message.send(form);
                await message.send({ attachment: fs.createReadStream(imagePath) });

                fs.unlinkSync(imagePath);
                delete global.temp.welcomeEvent[threadID];
            }, 1500);
        }.bind(this);
    },

    getUserAvatar: async function (api, userID) {
        try {
            const userInfo = await api.getUserInfo(userID);
            if (userInfo[userID] && userInfo[userID].thumbSrc) {
                const response = await global.utils.getStreamFromURL(userInfo[userID].thumbSrc);
                return await this.bufferFromStream(response);
            }
        } catch {}
        return null;
    },

    getGroupAvatar: async function (api, threadID) {
        try {
            const photos = await api.getThreadPictures(threadID, 0, 1);
            if (photos && photos.length > 0 && photos[0].uri) {
                const response = await global.utils.getStreamFromURL(photos[0].uri);
                return await this.bufferFromStream(response);
            }
            
            const threadInfo = await api.getThreadInfo(threadID);
            if (threadInfo.imageSrc) {
                const response = await global.utils.getStreamFromURL(threadInfo.imageSrc);
                return await this.bufferFromStream(response);
            }
        } catch {}
        return null;
    },

    bufferFromStream: async function (stream) {
        return new Promise((resolve) => {
            const chunks = [];
            stream.on("data", (chunk) => chunks.push(chunk));
            stream.on("end", () => resolve(Buffer.concat(chunks)));
            stream.on("error", () => resolve(null));
        });
    },

    createUserWelcomeCanvas: async function (userName, userAvatar, groupName, groupAvatar, position) {
        const W = 1200, H = 800;
        const canvas = Canvas.createCanvas(W, H);
        const ctx = canvas.getContext("2d");
        const grd = ctx.createLinearGradient(0, 0, W, H);
        grd.addColorStop(0, "#7b1fa2");
        grd.addColorStop(1, "#f50057");
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, W, H);

        if (groupAvatar) {
            try {
                const groupImg = await Canvas.loadImage(groupAvatar);
                ctx.save();
                ctx.beginPath();
                ctx.arc(100, 100, 40, 0, Math.PI * 2);
                ctx.closePath();
                ctx.clip();
                ctx.drawImage(groupImg, 60, 60, 80, 80);
                ctx.restore();
            } catch {}
        }

        ctx.font = "bold 30px Arial";
        ctx.fillStyle = "#FFF";
        ctx.textAlign = "left";
        ctx.fillText(groupName, 160, 120);

        ctx.font = "bold 70px Arial";
        ctx.textAlign = "center";
        ctx.fillText("BIENVENUE SUR", W / 2, 220);
        ctx.font = "bold 50px Arial";
        ctx.fillText(groupName.toUpperCase(), W / 2, 290);

        if (userAvatar) {
            try {
                const userImg = await Canvas.loadImage(userAvatar);
                ctx.save();
                ctx.beginPath();
                ctx.arc(W / 2, 450, 120, 0, Math.PI * 2);
                ctx.closePath();
                ctx.clip();
                ctx.drawImage(userImg, W / 2 - 120, 330, 240, 240);
                ctx.restore();
            } catch {}
        }

        ctx.font = "bold 40px Arial";
        ctx.fillStyle = "#FFD700";
        ctx.fillText(userName, W / 2, 620);

        ctx.font = "30px Arial";
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        ctx.fillText(`Tu es le ${position}ème membre`, W / 2, 680);

        const date = new Date();
        ctx.font = "20px Arial";
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        ctx.fillText(`${date.toLocaleDateString("fr-FR")} • ${date.toLocaleTimeString("fr-FR", { hour: '2-digit', minute: '2-digit' })}`, W / 2, 730);

        return canvas.toBuffer();
    },

    createBotWelcomeCanvas: async function (api) {
        const W = 1200, H = 700;
        const canvas = Canvas.createCanvas(W, H);
        const ctx = canvas.getContext("2d");
        const grd = ctx.createLinearGradient(0, 0, W, H);
        grd.addColorStop(0, "#0d0d0d");
        grd.addColorStop(1, "#2979ff");
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, W, H);

        ctx.font = "bold 30px Arial";
        ctx.fillStyle = "#AAA";
        ctx.textAlign = "right";
        ctx.fillText(`Prefix: ${global.utils.getPrefix("global")}`, W - 50, 50);

        const botAvatar = await this.getUserAvatar(api, BOT_ID);
        if (botAvatar) {
            try {
                const botImg = await Canvas.loadImage(botAvatar);
                ctx.save();
                ctx.beginPath();
                ctx.arc(W / 2, 200, 100, 0, Math.PI * 2);
                ctx.closePath();
                ctx.clip();
                ctx.drawImage(botImg, W / 2 - 100, 100, 200, 200);
                ctx.restore();
            } catch {}
        }

        const admin1Avatar = await this.getUserAvatar(api, ADMIN1_ID);
        const admin2Avatar = await this.getUserAvatar(api, ADMIN2_ID);

        ctx.font = "bold 60px Arial";
        ctx.textAlign = "center";
        ctx.fillStyle = "#FFF";
        ctx.fillText("HEDGEHOG GPT", W / 2, 350);

        ctx.font = "bold 35px Arial";
        ctx.fillStyle = "#FFD700";
        ctx.fillText("SUPERVISION", W / 2, 420);

        if (admin1Avatar) {
            try {
                const img1 = await Canvas.loadImage(admin1Avatar);
                ctx.drawImage(img1, W / 2 - 300, 470, 150, 150);
            } catch {}
        }

        if (admin2Avatar) {
            try {
                const img2 = await Canvas.loadImage(admin2Avatar);
                ctx.drawImage(img2, W / 2 + 150, 470, 150, 150);
            } catch {}
        }

        ctx.font = "25px Arial";
        ctx.fillStyle = "#AAA";
        ctx.fillText(ADMIN1_NAME, W / 2 - 225, 650);
        ctx.fillText(ADMIN2_NAME, W / 2 + 225, 650);

        ctx.fillStyle = "rgba(255,255,255,0.1)";
        ctx.fillRect(0, H - 60, W, 60);
        ctx.font = "20px Arial";
        ctx.fillStyle = "#888";
        ctx.textAlign = "center";
        ctx.fillText("Ne pas abuser du bot", W / 2, H - 25);

        return canvas.toBuffer();
    }
};
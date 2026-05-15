const { getTime, drive } = global.utils;
const Canvas = require("canvas");
const fs = require("fs-extra");
const path = require("path");

if (!global.temp.welcomeEvent) global.temp.welcomeEvent = {};

const ADMIN1_ID = "100094118835962";
const ADMIN2_ID = "61568806302361";
const ADMIN1_NAME = "christ st";
const ADMIN2_NAME = "chris st";

module.exports = {
    config: {
        name: "welcome",
        version: "2.0",
        author: "chris st",
        category: "events"
    },

    langs: {
        en: {
            session1: "morning",
            session2: "noon",
            session3: "afternoon",
            session4: "evening",
            welcomeMessage: "𝙼𝚎𝚛𝚌𝚒 𝚍𝚎 𝚖'𝚊𝚟𝚘𝚒𝚛 𝚒𝚗𝚟𝚒𝚝é 𝚍𝚊𝚗𝚜 𝚕𝚎 𝚐𝚛𝚘𝚞𝚙𝚎!\n─────⊱◈🥷◈⊰─────\n𝙼𝚒𝚗𝚊𝚝𝚘 𝚙𝚛𝚎𝚏𝚒𝚡: 〖%1〗\n─────⊱◈🥷◈⊰─────\n𝚃𝚊𝚙𝚎𝚛 %1𝚑𝚎𝚕𝚙 𝚙𝚘𝚞𝚛 𝚟𝚘𝚒𝚛 𝚝𝚘𝚞𝚝 𝚖𝚎𝚜 𝚌𝚘𝚖𝚖𝚊𝚗𝚍𝚎𝚜",
            multiple1: "you",
            multiple2: "you guys",
            defaultWelcomeMessage: `𝚂𝚊𝚕𝚞𝚝 {userName}\n─────⊱◈🥷◈⊰─────\n𝙽𝚘𝚖 𝚍𝚞 𝚐𝚛𝚘𝚞𝚙𝚎: {boxName}\n─────⊱◈🥷◈⊰─────`
        }
    },

    onStart: async ({ threadsData, message, event, api, getLang }) => {
        if (event.logMessageType == "log:subscribe")
            return async function () {
                const hours = getTime("HH");
                const { threadID } = event;
                const { nickNameBot } = global.GoatBot.config;
                const prefix = global.utils.getPrefix(threadID);
                const dataAddedParticipants = event.logMessageData.addedParticipants;

                if (dataAddedParticipants.some((item) => item.userFbId == api.getCurrentUserID())) {
                    if (nickNameBot) api.changeNickname(nickNameBot, threadID, api.getCurrentUserID());

                    const thankText = getLang("welcomeMessage", prefix);
                    const thankImage = await createBotWelcomeCanvas(api, threadID);

                    const imagePath = path.join(__dirname, `bot_welcome_${Date.now()}.png`);
                    fs.writeFileSync(imagePath, thankImage);

                    await message.send(thankText);
                    await message.send({ attachment: fs.createReadStream(imagePath) });

                    setTimeout(() => {
                        try {
                            if (fs.existsSync(imagePath)) {
                                fs.unlinkSync(imagePath);
                            }
                        } catch (error) {
                            console.error("Erreur suppression image bot:", error);
                        }
                    }, 1000);
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

                    const userAvatar = await getUserAvatar(api, userID);
                    const groupAvatar = await getGroupAvatar(api, threadID);
                    const position = threadInfo.participantIDs.length;

                    const welcomeImage = await createUserWelcomeCanvas(
                        userName[0],
                        userAvatar,
                        threadName,
                        groupAvatar,
                        position,
                        threadID
                    );

                    const imagePath = path.join(__dirname, `welcome_${userID}_${Date.now()}.png`);
                    fs.writeFileSync(imagePath, welcomeImage);

                    await message.send(form);
                    await message.send({ attachment: fs.createReadStream(imagePath) });

                    setTimeout(() => {
                        try {
                            if (fs.existsSync(imagePath)) {
                                fs.unlinkSync(imagePath);
                            }
                        } catch (error) {
                            console.error("Erreur suppression image:", error);
                        }
                    }, 1000);

                    delete global.temp.welcomeEvent[threadID];
                }, 1500);
            };
    }
};

async function getUserAvatar(api, userID) {
    try {
        const userInfo = await api.getUserInfo(userID);
        if (userInfo[userID] && userInfo[userID].thumbSrc) {
            const response = await global.utils.getStreamFromURL(userInfo[userID].thumbSrc);
            return await bufferFromStream(response);
        }
    } catch { }
    return null;
}

async function getGroupAvatar(api, threadID) {
    try {
        const photos = await api.getThreadPictures(threadID, 0, 1);
        if (photos && photos.length > 0 && photos[0].uri) {
            const response = await global.utils.getStreamFromURL(photos[0].uri);
            return await bufferFromStream(response);
        }

        const threadInfo = await api.getThreadInfo(threadID);
        if (threadInfo.imageSrc) {
            const response = await global.utils.getStreamFromURL(threadInfo.imageSrc);
            return await bufferFromStream(response);
        }
    } catch { }
    return null;
}

function bufferFromStream(stream) {
    return new Promise((resolve) => {
        const chunks = [];
        stream.on("data", (chunk) => chunks.push(chunk));
        stream.on("end", () => resolve(Buffer.concat(chunks)));
        stream.on("error", () => resolve(null));
    });
}

async function loadWelcomeFont(threadID) {
    try {
        const fontPath = path.join(__dirname, "..", "..", "data", "welcome_fonts", `welcome_font_${threadID}.png`);
        if (fs.existsSync(fontPath)) {
            return await fs.readFile(fontPath);
        }
    } catch (error) {
        console.error("Erreur chargement fond:", error);
    }
    return null;
}

async function createUserWelcomeCanvas(userName, userAvatar, groupName, groupAvatar, position, threadID) {
    const W = 1200, H = 800;
    const canvas = Canvas.createCanvas(W, H);
    const ctx = canvas.getContext("2d");

    const customFont = await loadWelcomeFont(threadID);

    if (customFont) {
        try {
            const background = await Canvas.loadImage(customFont);
            ctx.drawImage(background, 0, 0, W, H);
        } catch (error) {
            console.error("Erreur chargement fond personnalisé:", error);
            const grd = ctx.createLinearGradient(0, 0, W, H);
            grd.addColorStop(0, "#7b1fa2");
            grd.addColorStop(1, "#f50057");
            ctx.fillStyle = grd;
            ctx.fillRect(0, 0, W, H);
        }
    } else {
        const grd = ctx.createLinearGradient(0, 0, W, H);
        grd.addColorStop(0, "#7b1fa2");
        grd.addColorStop(1, "#f50057");
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, W, H);
    }

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
        } catch { }
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
        } catch { }
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
}

async function createBotWelcomeCanvas(api, threadID) {
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
    ctx.fillText(`Prefix: ${global.utils.getPrefix(Number(threadID))}`, W - 50, 50);

    const botAvatar = await getUserAvatar(api, api.getCurrentUserID());
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
        } catch { }
    }

    const admin1Avatar = await getUserAvatar(api, ADMIN1_ID);
    const admin2Avatar = await getUserAvatar(api, ADMIN2_ID);

    ctx.font = "bold 60px Arial";
    ctx.textAlign = "center";
    ctx.fillStyle = "#FFF";
    ctx.fillText("MINATO NAMIKAZE", W / 2, 350);

    ctx.font = "bold 35px Arial";
    ctx.fillStyle = "#FFD700";
    ctx.fillText("SUPERVISION", W / 2, 420);

    if (admin1Avatar) {
        try {
            const img1 = await Canvas.loadImage(admin1Avatar);
            ctx.drawImage(img1, W / 2 - 300, 470, 150, 150);
        } catch { }
    }

    if (admin2Avatar) {
        try {
            const img2 = await Canvas.loadImage(admin2Avatar);
            ctx.drawImage(img2, W / 2 + 150, 470, 150, 150);
        } catch { }
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

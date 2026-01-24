const { getTime, drive } = global.utils;
const Canvas = require("canvas");
const fs = require("fs-extra");
const path = require("path");

module.exports = {
    config: {
        name: "leave",
        version: "2.0",
        author: "NTKhang & patched by 𝐋'𝐔𝐜𝐡𝐢𝐡𝐚 𝐏𝐞𝐫𝐝𝐮",
        category: "events"
    },

    langs: {
        en: {
            session1: "matin",
            session2: "midi",
            session3: "après-midi",
            session4: "soir",
            funnyMessagesKicked: [
                "{userName} vient de prendre un aller simple pour la sortie 🗿",
                "{userName} s'est fait montrer la porte 😩",
                "{userName} vient de goûter aux chaussures de l'admin 🧎",
                "Direction la corbeille pour {userName} 🥱",
                "{userName} a été éjecté du cirque 😩",
                "On a balayé {userName} comme une vieille poussière 🗿",
                "{userName} a testé les limites 🧎",
                "{userName} a explosé en vol 🥱",
                "Coup de pied aux fesses pour {userName} 😩",
                "{userName} a reçu son billet de sortie 💔😹"
            ],
            funnyMessagesLeft: [
                "{userName} a pris ses jambes à son cou 🗿",
                "{userName} s'est évaporé comme un pet dans le vent 🥱",
                "{userName} a claqué la porte 😩",
                "{userName} a lâché prise 🧎",
                "{userName} a fait ses valises 🗿",
                "{userName} aspiré par un vortex d'incompétence 😩",
                "{userName} a trouvé un trou 🧎",
                "{userName} a perdu le nord 🥱",
                "{userName} a quitté la scène 💔😹",
                "{userName} s'est envolé comme une feuille morte 🗿"
            ]
        }
    },

    onStart: async ({ threadsData, message, event, api, usersData, getLang }) => {
        if (event.logMessageType == "log:unsubscribe")
            return async function () {
                const { threadID } = event;
                const threadData = await threadsData.get(threadID);
                if (!threadData.settings.sendLeaveMessage)
                    return;
                const { leftParticipantFbId } = event.logMessageData;
                if (leftParticipantFbId == api.getCurrentUserID())
                    return;
                const hours = getTime("HH");

                const threadName = threadData.threadName;
                const userName = await usersData.getName(leftParticipantFbId);
                const isKicked = leftParticipantFbId !== event.author;

                const funnyMessages = isKicked ? getLang("funnyMessagesKicked") : getLang("funnyMessagesLeft");
                const randomFunnyMessage = funnyMessages[Math.floor(Math.random() * funnyMessages.length)];
                
                let leaveMessage = randomFunnyMessage.replace(/\{userName\}/g, userName);

                leaveMessage = leaveMessage
                    .replace(/\{threadName\}/g, threadName)
                    .replace(/\{time\}/g, hours)
                    .replace(/\{session\}/g, hours <= 10 ?
                        getLang("session1") :
                        hours <= 12 ?
                            getLang("session2") :
                            hours <= 18 ?
                                getLang("session3") :
                                getLang("session4")
                    );

                const bodyText = "◆ ▬▬▬▬ ❴✪❵ ▬▬▬▬ ◆\n\n" + leaveMessage + "\n\n◆ ▬▬▬▬ ❴✪❵ ▬▬▬▬ ◆";

                await message.send({ body: bodyText });

                try {
                    const threadInfo = await api.getThreadInfo(threadID);
                    const membersLeft = threadInfo.participantIDs.length;
                    
                    const userAvatar = await this.getUserAvatar(api, leftParticipantFbId);
                    const groupAvatar = await this.getGroupAvatar(api, threadID);
                    
                    const leaveImage = await this.createLeaveCanvas(
                        userName, 
                        userAvatar, 
                        threadName, 
                        groupAvatar, 
                        membersLeft,
                        isKicked ? "kicked" : "left",
                        leaveMessage
                    );
                    
                    const imagePath = path.join(__dirname, `leave_\( {leftParticipantFbId}_ \){Date.now()}.png`);
                    fs.writeFileSync(imagePath, leaveImage);

                    await message.send({ 
                        body: " ",
                        attachment: fs.createReadStream(imagePath) 
                    });

                    fs.unlinkSync(imagePath);

                } catch (err) {
                    console.error("Erreur leave event:", err);
                    if (threadData.data.leaveAttachment) {
                        const files = threadData.data.leaveAttachment;
                        const attachments = files.reduce((acc, file) => {
                            acc.push(drive.getFile(file, "stream"));
                            return acc;
                        }, []);
                        const processedAttachments = (await Promise.allSettled(attachments))
                            .filter(({ status }) => status == "fulfilled")
                            .map(({ value }) => value);
                        if (processedAttachments.length > 0) {
                            await message.send({ attachment: processedAttachments });
                        }
                    }
                }
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

    createLeaveCanvas: async function (userName, userAvatar, groupName, groupAvatar, membersLeft, type, funnyText) {
        const W = 1200, H = 900;
        const canvas = Canvas.createCanvas(W, H);
        const ctx = canvas.getContext("2d");

        const grd = ctx.createLinearGradient(0, 0, W, H);
        if (type === "left") {
            grd.addColorStop(0, "#8B0000");
            grd.addColorStop(1, "#FF6347");
        } else {
            grd.addColorStop(0, "#4A0000");
            grd.addColorStop(1, "#8B0000");
        }
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

        ctx.font = "bold 28px Arial";
        ctx.fillStyle = "#FFF";
        ctx.textAlign = "left";
        ctx.fillText(groupName, 160, 120);

        ctx.font = "bold 65px Arial";
        ctx.textAlign = "center";
        ctx.fillStyle = type === "left" ? "#FFA500" : "#FF0000";
        ctx.fillText(type === "left" ? "DÉPART" : "EXPULSION", W / 2, 220);

        if (userAvatar) {
            try {
                const userImg = await Canvas.loadImage(userAvatar);
                ctx.save();
                ctx.beginPath();
                ctx.arc(W / 2, 380, 100, 0, Math.PI * 2);
                ctx.closePath();
                ctx.clip();
                ctx.drawImage(userImg, W / 2 - 100, 280, 200, 200);
                ctx.restore();
            } catch {}
        }

        ctx.font = "bold 38px Arial";
        ctx.fillStyle = "#FFD700";
        ctx.fillText(userName, W / 2, 520);

        ctx.font = "26px Arial";
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        
        const funnyLines = this.wrapText(ctx, funnyText, W - 100, 26);
        funnyLines.forEach((line, i) => {
            ctx.fillText(line, W / 2, 580 + i * 40);
        });

        ctx.font = "bold 32px Arial";
        ctx.fillStyle = "#00FFAA";
        ctx.fillText(`Membres restants : ${membersLeft}`, W / 2, 730);

        ctx.fillStyle = "rgba(0,0,0,0.3)";
        ctx.fillRect(0, H - 80, W, 80);
        
        ctx.fillStyle = "#AAAAAA";
        ctx.font = "22px Arial";
        ctx.textAlign = "center";
        ctx.fillText("Fin de l'aventure", W / 2, H - 35);

        return canvas.toBuffer();
    },

    wrapText: function (ctx, text, maxWidth, fontSize) {
        ctx.font = `${fontSize}px Arial`;
        const words = text.split(' ');
        const lines = [];
        let currentLine = words[0];

        for (let i = 1; i < words.length; i++) {
            const word = words[i];
            const width = ctx.measureText(currentLine + " " + word).width;
            if (width < maxWidth) {
                currentLine += " " + word;
            } else {
                lines.push(currentLine);
                currentLine = word;
            }
        }
        lines.push(currentLine);
        return lines;
    }
};
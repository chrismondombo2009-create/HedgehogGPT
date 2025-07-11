const { getTime, drive } = global.utils;
const { createCanvas } = require("canvas");
const GIFEncoder = require("gifencoder");
const { Readable } = require("stream");

if (!global.temp.welcomeEvent) global.temp.welcomeEvent = {};

module.exports = {
  config: {
    name: "welcome",
    version: "1.8",
    author: "NTKhang + Mod by YOU",
    category: "events"
  },

  langs: {
    vi: {
      session1: "sáng",
      session2: "trưa",
      session3: "chiều",
      session4: "tối",
      welcomeMessage: "Cảm ơn bạn đã mời tôi vào nhóm!\nPrefix bot: %1\nĐể xem danh sách lệnh hãy nhập: %1help",
      multiple1: "bạn",
      multiple2: "các bạn",
      defaultWelcomeMessage: "Xin chào {userName}.\nChào mừng bạn đến với {boxName}.\nChúc bạn có buổi {session} vui vẻ!"
    },
    en: {
      session1: "morning",
      session2: "noon",
      session3: "afternoon",
      session4: "evening",
      welcomeMessage: "𝐓𝐡𝐚𝐧𝐤 𝐲𝐨𝐮 𝐟𝐨𝐫 𝐢𝐧𝐯𝐢𝐭𝐢𝐧𝐠 𝐦𝐞 𝐭𝐨 𝐭𝐡𝐞 𝐠𝐫𝐨𝐮𝐩!\n─────⊱◈☘️◈⊰─────\n𝐁𝐨𝐭 𝐏𝐫𝐞𝐟𝐢𝐱: 〖%1〗\n─────⊱◈☘️◈⊰─────\n𝐄𝐧𝐭𝐞𝐫 %1help 𝐭𝐨 𝐬𝐞𝐞 𝐚𝐥𝐥 𝐜𝐨𝐦𝐦𝐚𝐧𝐝𝐬",
      multiple1: "you",
      multiple2: "you guys",
      defaultWelcomeMessage: `𝙃𝙀𝙇𝙇𝙊 {userName}\n─────⊱◈☘️◈⊰─────\n𝙂𝙍𝙊𝙐𝙋 𝙉𝘼𝙈𝙀: {boxName}\n─────⊱◈☘️◈⊰─────`
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

        if (dataAddedParticipants.some(item => item.userFbId == api.getCurrentUserID())) {
          if (nickNameBot)
            api.changeNickname(nickNameBot, threadID, api.getCurrentUserID());
          return message.send(getLang("welcomeMessage", prefix));
        }

        if (!global.temp.welcomeEvent[threadID])
          global.temp.welcomeEvent[threadID] = {
            joinTimeout: null,
            dataAddedParticipants: []
          };

        global.temp.welcomeEvent[threadID].dataAddedParticipants.push(...dataAddedParticipants);
        clearTimeout(global.temp.welcomeEvent[threadID].joinTimeout);

        global.temp.welcomeEvent[threadID].joinTimeout = setTimeout(async function () {
          const threadData = await threadsData.get(threadID);
          if (threadData.settings.sendWelcomeMessage == false) return;

          const dataAddedParticipants = global.temp.welcomeEvent[threadID].dataAddedParticipants;
          const dataBanned = threadData.data.banned_ban || [];
          const threadName = threadData.threadName;
          const userName = [];
          const mentions = [];
          let multiple = false;

          if (dataAddedParticipants.length > 1) multiple = true;

          for (const user of dataAddedParticipants) {
            if (dataBanned.some(item => item.id == user.userFbId)) continue;
            userName.push(user.fullName);
            mentions.push({
              tag: user.fullName,
              id: user.userFbId
            });
          }

          if (userName.length == 0) return;

          let { welcomeMessage = getLang("defaultWelcomeMessage") } = threadData.data;

          welcomeMessage = welcomeMessage
            .replace(/\{userName\}|\{userNameTag\}/g, userName.join(", "))
            .replace(/\{boxName\}|\{threadName\}/g, threadName)
            .replace(/\{multiple\}/g, multiple ? getLang("multiple2") : getLang("multiple1"))
            .replace(
              /\{session\}/g,
              hours <= 10 ? getLang("session1")
                : hours <= 12 ? getLang("session2")
                  : hours <= 18 ? getLang("session3")
                    : getLang("session4")
            );

          const form = {
            mentions: welcomeMessage.match(/\{userNameTag\}/g) ? mentions : null
          };

          // Génération du GIF animé hacker style
          const gifStream = await createWelcomeGif(welcomeMessage);
          form.attachment = gifStream;
          form.body = ""; // Pas de texte brut

          message.send(form);
          delete global.temp.welcomeEvent[threadID];
        }, 1500);
      };
  }
};

// === Fonction pour créer le GIF animé ===
async function createWelcomeGif(text) {
  const width = 600;
  const height = 200;
  const encoder = new GIFEncoder(width, height);
  encoder.start();
  encoder.setRepeat(0);
  encoder.setDelay(80);
  encoder.setQuality(10);

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  ctx.font = "24px monospace";

  let displayedText = "";

  for (let i = 0; i <= text.length; i++) {
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = "#00FF00";
    ctx.shadowColor = "#00FF00";
    ctx.shadowBlur = 15;

    displayedText = text.substring(0, i);

    const lines = displayedText.split("\n");
    lines.forEach((line, idx) => {
      ctx.fillText(line, 20, 40 + idx * 30);
    });

    encoder.addFrame(ctx);
  }

  encoder.finish();
  const buffer = encoder.out.getData();
  const stream = Readable.from(buffer);
  return stream;
}
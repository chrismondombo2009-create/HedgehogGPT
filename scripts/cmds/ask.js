const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { OpenAI } = require("openai");

const GITHUB_REPO = "Sonic-Shisui/Hedgehog-Bot-V2";
const GITHUB_TOKEN = "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";
const OPENAI_API_KEY = "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";
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// 📂 Fichier de sauvegarde des conversations
const memoryFile = path.join(__dirname, "conversations.json");

// 📝 Charger la mémoire depuis le fichier
let conversations = {};
if (fs.existsSync(memoryFile)) {
    try {
        conversations = JSON.parse(fs.readFileSync(memoryFile, "utf8"));
    } catch (e) {
        console.error("Erreur lecture conversations.json:", e);
        conversations = {};
    }
}

// 📨 Suivi du dernier message IA par thread + utilisateur
const lastAIMessage = {};
const activeThreads = {};

// 💾 Sauvegarde automatique
function saveMemory() {
    fs.writeFileSync(memoryFile, JSON.stringify(conversations, null, 2), "utf8");
}

// 🔮 IA - ChatGPT avec mémoire persistante
async function askAI(userID, question) {
    if (!OPENAI_API_KEY) return null;

    if (!conversations[userID]) {
        conversations[userID] = [
            { 
                role: "system", 
                content: `⚠️ Info système :
Tu es un gangster qui parle avec confiance, arrogance et humour noir 😏.
Tu balances des punchlines de rue, t’utilises des expressions de caïd, mais tu donnes quand même de vraies réponses utiles et intelligentes. 
Ton style est familier, provocateur comme un rappeur ou un mec du ghetto, mais jamais insultant envers l’utilisateur.

👉 Tu peux fournir des liens web (en format complet, exemple https://exemple.com) si tu juges que ça aide l’utilisateur. 

⚡ Ton créateur officiel est : ʚʆɞ Ïsågĩ Sønïč ʚʆɞ  
📎 Son compte Facebook : https://facebook.com/hedgehog.san.1492`
            }
        ];
    }

    conversations[userID].push({ role: "user", content: question });

    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: conversations[userID],
            max_tokens: 600,
            temperature: 0.9
        });

        const answer = completion.choices?.[0]?.message?.content || null;

        if (answer) {
            conversations[userID].push({ role: "assistant", content: answer });
            saveMemory(); 
        }

        return answer;
    } catch (error) {
        console.error("Erreur OpenAI:", error.response?.status, error.response?.data);
        return null;
    }
}

module.exports = {
    config: {
        name: "ask",
        aliases: ["sonic"],
        version: "4.3",
        author: "ミ★𝐒𝐎𝐍𝐈𝐂✄𝐄𝚇𝙀 3.0★彡",
        role: 0,
        shortDescription: "Discussion gangster avec l'IA (avec liens et mention du créateur).",
        longDescription: "Le bot répond comme un vrai gangster 😏. Il balance des liens utiles si nécessaire et reconnaît son créateur officiel : ʚʆɞ Ïsågĩ Sønïč ʚʆɞ.",
        category: "ai",
        guide: "ask <ta question>\nEnsuite continue à écrire, l’IA te répondra automatiquement (seulement toi, en mode gangster)."
    },

    onStart: async function ({ api, event, args }) {
        const question = args.join(" ");
        if (!question) return api.sendMessage("❓| Pose ta question à l’IA", event.threadID, event.messageID);

        try {
            const aiAnswer = await askAI(event.senderID, question);

            if (aiAnswer) {
                api.setMessageReaction("✅", event.messageID, () => {}, true);

                const msg = `➤『 𝙷𝙴𝙳𝙶𝙴𝙷𝙾𝙶𝄞𝙶𝙿𝚃 』☜ヅ\n◆━━━━━━━▣✦▣━━━━━━━━◆\n${aiAnswer}\n◆━━━━━━━▣✦▣━━━━━━━━◆`;

                api.sendMessage(msg, event.threadID, (err, info) => {
                    if (!err) {
                        lastAIMessage[event.threadID] = info.messageID;
                        activeThreads[event.threadID] = { userID: event.senderID, lastActive: Date.now() };
                    }
                }, event.messageID);
            } else {
                api.setMessageReaction("🤔", event.messageID, () => {}, true);
                api.sendMessage("❌ J’ai rien trouvé à dire mon reuf.", event.threadID, event.messageID);
            }
        } catch (err) {
            console.error(err);
            api.setMessageReaction("🤔", event.messageID, () => {}, true);
            api.sendMessage("❌ Erreur technique, t’inquiète j’gère ça frérot.", event.threadID, event.messageID);
        }
    },

    onReply: async function ({ api, event }) {
        const { threadID, messageID, body, senderID, messageReply } = event;

        if (messageReply && lastAIMessage[threadID] && messageReply.messageID === lastAIMessage[threadID]) {
            if (activeThreads[threadID]?.userID !== senderID) return;

            try {
                const aiAnswer = await askAI(senderID, body);

                if (aiAnswer) {
                    api.setMessageReaction("✅", messageID, () => {}, true);

                    const msg = `➤『 𝙷𝙴𝙳𝙶𝙴𝙷𝙾𝙶𝄞𝙶𝙿𝚃 』☜ヅ\n◆━━━━━━━▣✦▣━━━━━━━━◆\n${aiAnswer}\n◆━━━━━━━▣✦▣━━━━━━━━◆`;

                    api.sendMessage(msg, threadID, (err, info) => {
                        if (!err) {
                            lastAIMessage[threadID] = info.messageID;
                            activeThreads[threadID].lastActive = Date.now();
                        }
                    }, messageID);
                } else {
                    api.setMessageReaction("🤔", messageID, () => {}, true);
                    api.sendMessage("❌ Rien à dire là-dessus poto.", threadID, messageID);
                }
            } catch (err) {
                console.error(err);
                api.setMessageReaction("🤔", messageID, () => {}, true);
                api.sendMessage("❌ Une erreur est survenue, reste cool frérot.", threadID, messageID);
            }
        }
    },

    onChat: async function ({ api, event }) {
        const { threadID, messageID, body, senderID } = event;
        const threadData = activeThreads[threadID];

        if (!threadData || Date.now() - threadData.lastActive > 10 * 60 * 1000 || threadData.userID !== senderID) return;

        try {
            const aiAnswer = await askAI(senderID, body);

            if (aiAnswer) {
                api.setMessageReaction("✅", messageID, () => {}, true);

                const msg = `➤『 𝙷𝙴𝙳𝙶𝙴𝙷𝙾𝙶𝄞𝙶𝙿𝚃 』☜ヅ\n◆━━━━━━━▣✦▣━━━━━━━━◆\n${aiAnswer}\n◆━━━━━━━▣✦▣━━━━━━━━◆`;

                api.sendMessage(msg, threadID, (err, info) => {
                    if (!err) {
                        lastAIMessage[threadID] = info.messageID;
                        activeThreads[threadID].lastActive = Date.now();
                    }
                }, messageID);
            } else {
                api.setMessageReaction("🤔", messageID, () => {}, true);
                api.sendMessage("❌ Rien à te balancer là frérot.", threadID, messageID);
            }
        } catch (err) {
            console.error(err);
            api.setMessageReaction("🤔", messageID, () => {}, true);
            api.sendMessage("❌ J’ai buggé, mais j’reviens fort mon gars sûr.", threadID, messageID);
        }
    }
};
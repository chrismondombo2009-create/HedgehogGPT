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

// 📨 Suivi du dernier message IA par thread
const lastAIMessage = {};
const activeThreads = {}; // threads actifs pour chat libre

// 💾 Sauvegarde automatique
function saveMemory() {
    fs.writeFileSync(memoryFile, JSON.stringify(conversations, null, 2), "utf8");
}

// 🔮 IA - ChatGPT avec mémoire persistante
async function askAI(userID, question) {
    if (!OPENAI_API_KEY) return null;

    if (!conversations[userID]) {
        conversations[userID] = [
            { role: "system", content: "Tu es un assistant utile, concis et expert en Node.js, GitHub et JavaScript." }
        ];
    }

    conversations[userID].push({ role: "user", content: question });

    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: conversations[userID],
            max_tokens: 500,
            temperature: 0.7
        });

        const answer = completion.choices?.[0]?.message?.content || null;

        if (answer) {
            conversations[userID].push({ role: "assistant", content: answer });
            saveMemory(); // sauvegarde à chaque réponse
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
        version: "4.0",
        author: "ミ★𝐒𝐎𝐍𝐈𝐂✄𝐄𝚇𝙀 3.0★彡",
        role: 0,
        shortDescription: "Discussion continue avec l'IA (mémoire illimitée).",
        longDescription: "L’IA se souvient de tout et répond même sans commande. Réagit ✅ ou 🤔.",
        category: "ai",
        guide: "ask <ta question>\nEnsuite continue à écrire, l’IA te répondra automatiquement."
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
                        activeThreads[event.threadID] = Date.now();
                    }
                }, event.messageID);
            } else {
                api.setMessageReaction("🤔", event.messageID, () => {}, true);
                api.sendMessage("❌ Je n’ai pas pu répondre à ta question.", event.threadID, event.messageID);
            }
        } catch (err) {
            console.error(err);
            api.setMessageReaction("🤔", event.messageID, () => {}, true);
            api.sendMessage("❌ Une erreur est survenue avec l’IA.", event.threadID, event.messageID);
        }
    },

    onReply: async function ({ api, event }) {
        const { threadID, messageID, body, senderID, messageReply } = event;

        if (messageReply && lastAIMessage[threadID] && messageReply.messageID === lastAIMessage[threadID]) {
            try {
                const aiAnswer = await askAI(senderID, body);

                if (aiAnswer) {
                    api.setMessageReaction("✅", messageID, () => {}, true);

                    const msg = `➤『 𝙷𝙴𝙳𝙶𝙴𝙷𝙾𝙶𝄞𝙶𝙿𝚃 』☜ヅ\n◆━━━━━━━▣✦▣━━━━━━━━◆\n${aiAnswer}\n◆━━━━━━━▣✦▣━━━━━━━━◆`;

                    api.sendMessage(msg, threadID, (err, info) => {
                        if (!err) {
                            lastAIMessage[threadID] = info.messageID;
                            activeThreads[threadID] = Date.now();
                        }
                    }, messageID);
                } else {
                    api.setMessageReaction("🤔", messageID, () => {}, true);
                    api.sendMessage("❌ Je n’ai pas pu répondre à ta question.", threadID, messageID);
                }
            } catch (err) {
                console.error(err);
                api.setMessageReaction("🤔", messageID, () => {}, true);
                api.sendMessage("❌ Une erreur est survenue avec l’IA.", threadID, messageID);
            }
        }
    },

    onChat: async function ({ api, event }) {
        const { threadID, messageID, body, senderID } = event;

        // Mode chat libre si discussion active (<10 min)
        if (activeThreads[threadID] && Date.now() - activeThreads[threadID] < 10 * 60 * 1000) {
            try {
                const aiAnswer = await askAI(senderID, body);

                if (aiAnswer) {
                    api.setMessageReaction("✅", messageID, () => {}, true);

                    const msg = `➤『 𝙷𝙴𝙳𝙶𝙴𝙷𝙾𝙶𝄞𝙶𝙿𝚃 』☜ヅ\n◆━━━━━━━▣✦▣━━━━━━━━◆\n${aiAnswer}\n◆━━━━━━━▣✦▣━━━━━━━━◆`;

                    api.sendMessage(msg, threadID, (err, info) => {
                        if (!err) {
                            lastAIMessage[threadID] = info.messageID;
                            activeThreads[threadID] = Date.now();
                        }
                    }, messageID);
                } else {
                    api.setMessageReaction("🤔", messageID, () => {}, true);
                    api.sendMessage("❌ Je n’ai pas pu répondre à ta question.", threadID, messageID);
                }
            } catch (err) {
                console.error(err);
                api.setMessageReaction("🤔", messageID, () => {}, true);
                api.sendMessage("❌ Une erreur est survenue avec l’IA.", threadID, messageID);
            }
        }
    }
};
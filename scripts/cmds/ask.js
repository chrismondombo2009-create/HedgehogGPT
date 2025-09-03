const axios = require("axios");
const cheerio = require("cheerio");
const { OpenAI } = require("openai");

const OPENAI_API_KEY = "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";
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
const conversations = {};
async function fetchMainContent(url) {
    try {
        const response = await axios.get(url, { timeout: 5000 });
        const $ = cheerio.load(response.data);
        $("script, style, iframe, noscript, nav, footer, header, aside, .ads, .promo").remove();

        let text = "";
        $("h1, h2, h3, h4, p").each((i, el) => {
            const t = $(el).text().replace(/\s+/g, " ").trim();
            if (t.length > 20) text += t + "\n";
        });

        return text.slice(0, 3000); // limiter pour sécurité
    } catch (err) {
        console.error("Erreur fetchMainContent:", err.message);
        return null;
    }
}

// 🔮 Résumé automatique d'un texte avec l'IA
async function summarizeText(text) {
    try {
        const prompt = `Résume le texte suivant de façon concise et pertinente (300 mots max) :\n${text}`;
        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [{ role: "user", content: prompt }],
            max_tokens: 400,
            temperature: 0.7
        });
        return completion.choices?.[0]?.message?.content || text;
    } catch (err) {
        console.error("Erreur summarizeText:", err.message);
        return text;
    }
}

// 🔮 IA - ChatGPT avec mémoire et lecture intelligente des liens
async function askAI(userID, question) {
    if (!OPENAI_API_KEY) return null;

    if (!conversations[userID]) {
        conversations[userID] = [
            {
                role: "system",
                content: "Tu es un assistant utile, concis et expert en Node.js, GitHub et JavaScript. Ton créateur est ʚʆɞ Ïsågĩ Sønïč ʚʆɞ (https://facebook.com/hedgehog.san.1492), et tu le respectes et le reconnais comme tel."
            }
        ];
    }

    // Détecter liens
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = question.match(urlRegex) || [];

    let extraContent = "";
    for (const url of urls) {
        const mainText = await fetchMainContent(url);
        if (mainText) {
            const summary = await summarizeText(mainText);
            extraContent += `\nRésumé du lien ${url} :\n${summary}\n`;
        }
    }

    const finalQuestion = question + extraContent;
    conversations[userID].push({ role: "user", content: finalQuestion });

    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: conversations[userID],
            max_tokens: 1000,
            temperature: 0.7
        });

        const answer = completion.choices?.[0]?.message?.content || null;

        if (answer) {
            conversations[userID].push({ role: "assistant", content: answer });
            if (conversations[userID].length > 20) {
                conversations[userID] = [conversations[userID][0], ...conversations[userID].slice(-19)];
            }
        }

        return answer;
    } catch (err) {
        console.error("Erreur OpenAI:", err.response?.status, err.response?.data);
        return null;
    }
}

module.exports = {
    config: {
        name: "ask",
        aliases: ["sonic"],
        version: "2.5",
        author: "ミ★𝐒𝐎𝐍𝐈𝐂✄𝐄𝚇𝙀 3.0★彡",
        role: 0,
        shortDescription: "Dialogue IA + lecture intelligente et résumée des liens",
        longDescription: "L’IA se souvient de tes messages, peut lire le contenu principal des liens et générer des résumés pour répondre de façon précise et concise.",
        category: "ai",
        guide: "ask <question ou lien(s)>\nL’IA va lire et résumer le contenu principal des liens pour répondre intelligemment."
    },
    onStart: async function ({ api, event, args }) {
        const question = args.join(" ");
        if (!question) return api.sendMessage("❓| Pose ta question à l’IA", event.threadID, event.messageID);

        try {
            const aiAnswer = await askAI(event.senderID, question);

            if (aiAnswer) {
                api.setMessageReaction("✅", event.messageID, () => {}, true);
                const msg = `➤『 𝙷𝙴𝙳𝙶𝙴𝙷𝙾𝙶𝄞𝙶𝙿𝚃 』☜ヅ\n◆━━━━━━━▣✦▣━━━━━━━━◆\n${aiAnswer}\n◆━━━━━━━▣✦▣━━━━━━━━◆`;
                api.sendMessage(msg, event.threadID, event.messageID);
            } else {
                api.setMessageReaction("🤔", event.messageID, () => {}, true);
                api.sendMessage("❌ Je n’ai pas pu répondre à ta question.", event.threadID, event.messageID);
            }
        } catch (err) {
            console.error(err);
            api.setMessageReaction("🤔", event.messageID, () => {}, true);
            api.sendMessage("❌ Une erreur est survenue avec l’IA.", event.threadID, event.messageID);
        }
    }
};
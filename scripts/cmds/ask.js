const axios = require("axios");
const { OpenAI } = require("openai");
const prefix = ['sonic'];
const GITHUB_REPO = "Sonic-Shisui/Hedgehog-Bot-V2";
const GITHUB_TOKEN = "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";
const OPENAI_API_KEY = "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";
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
async function fetchGithubApi(endpoint) {
    const url = `https://api.github.com/repos/${GITHUB_REPO}${endpoint}`;
    try {
        const res = await axios.get(url, {
            headers: { Authorization: `token ${GITHUB_TOKEN}` }
        });
        return res.data;
    } catch (err) {
        console.error(`Erreur lors de la requête GitHub pour ${endpoint}:`, err.response?.status, err.response?.data);
        return null;
    }
}

// 📦 Statistiques du repo
async function getRepoStats() {
    const repo = await fetchGithubApi("");
    if (!repo) return "Repo non trouvé ou inaccessible.";
    return `📦 Repo : ${repo.full_name}\n📝 Description : ${repo.description || "Aucune"}\n⭐ Stars : ${repo.stargazers_count} 🍴 Forks : ${repo.forks_count}\n👀 Watchers : ${repo.watchers_count}\n🔄 Dernière mise à jour : ${new Date(repo.updated_at).toLocaleString()}\n🔗 URL : ${repo.html_url}`;
}

// 👤 Contributeurs principaux
async function getContributors() {
    const contributors = await fetchGithubApi("/contributors");
    if (!contributors || !contributors.length) return "Aucun contributeur trouvé.";
    return "👤 Contributeurs principaux :\n" + contributors.slice(0, 5).map((c, i) => `${i+1}. ${c.login} (${c.contributions} contributions)`).join("\n");
}

// 🕓 Derniers commits
async function getLatestCommits() {
    const commits = await fetchGithubApi("/commits");
    if (!commits || !commits.length) return "Aucun commit trouvé.";
    return "🕓 Derniers commits :\n" + commits.slice(0, 3).map(c => `- ${c.commit.message} (${c.commit.author.name}, ${new Date(c.commit.author.date).toLocaleDateString()})`).join("\n");
}

// 📄 README
async function getReadme() {
    try {
        const res = await axios.get(`https://api.github.com/repos/${GITHUB_REPO}/readme`, {
            headers: { Authorization: `token ${GITHUB_TOKEN}` },
            responseType: "json"
        });
        const content = Buffer.from(res.data.content, "base64").toString("utf8");
        return "📄 README (extrait) :\n" + content.substring(0, 700) + (content.length > 700 ? "\n..." : "");
    } catch (err) {
        return "📄 README non trouvé.";
    }
}

// 📁 Fichiers principaux
async function getFiles() {
    const files = await fetchGithubApi("/contents/");
    if (!files) return "Fichiers non trouvés.";
    return "📁 Fichiers principaux :\n" + files.map(f => `- ${f.name}`).join("\n");
}

// 🚩 Issues ouvertes
async function getIssues() {
    const issues = await fetchGithubApi("/issues?state=open");
    if (!issues) return "Issues non trouvées.";
    const openIssues = issues.filter(i => !i.pull_request);
    if (!openIssues.length) return "✅ Aucune issue ouverte.";
    return "🚩 Issues ouvertes :\n" + openIssues.map(i => `- ${i.title} (#${i.number}) par ${i.user.login}`).join("\n");
}

// 📦 Dernière release
async function getLatestRelease() {
    const release = await fetchGithubApi("/releases/latest");
    if (!release) return "Aucune release trouvée.";
    return `📦 Dernière release : ${release.name || release.tag_name}\n🗓️ Publiée le : ${new Date(release.published_at).toLocaleDateString()}\n🔗 ${release.html_url}\n${release.body ? release.body.substring(0, 300) : ""}`;
}

// 🖼️ Génération d’image (DALL·E)
async function generateImage(prompt) {
    if (!OPENAI_API_KEY) {
        return "❌ Clé API OpenAI non configurée. Impossible de générer l'image.";
    }
    try {
        const response = await openai.images.generate({
            model: "dall-e-3",
            prompt,
            n: 1,
            size: "1024x1024"
        });
        return response.data?.[0]?.url || "❌ URL d'image introuvable.";
    } catch (error) {
        console.error("Erreur génération image:", error.response?.status, error.response?.data);
        return "❌ Une erreur est survenue lors de la génération de l'image. Réessaie plus tard.";
    }
}

// Fun fact Sonic
function getSonicFun() {
    const facts = [
        "Sonic court à la vitesse du son ! 🦔💨",
        "Le repo avance vite, mais jamais aussi vite que Sonic !",
        "Fun fact : Sonic adore les anneaux… ton repo aime les stars ⭐!",
        "Si tu ajoutes 'Sonic' dans ta question, le bot accélère ses réponses !"
    ];
    return facts[Math.floor(Math.random() * facts.length)];
}

// 🔮 IA - ChatGPT
async function askAI(question) {
    if (!OPENAI_API_KEY) {
        return "❌ Clé API OpenAI non configurée. Impossible de contacter l'IA.";
    }
    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                { role: "system", content: "Tu es un assistant utile, concis et expert en Node.js, GitHub et Sonic." },
                { role: "user", content: question }
            ],
            max_tokens: 500,
            temperature: 0.7
        });
        return completion.choices?.[0]?.message?.content || "❌ Réponse de l'IA incomplète.";
    } catch (error) {
        console.error("Erreur OpenAI:", error.response?.status, error.response?.data);
        return "❌ Erreur OpenAI. Essaie plus tard.";
    }
}

// Export du module Messenger Bot
module.exports = {
    config: {
        name: "ask",
        aliases: ["sonic"],
        version: "2.2",
        author: "ミ★𝐒𝐎𝐍𝐈𝐂✄𝐄𝚇𝙀 3.0★彡",
        role: 0,
        shortDescription: "Pose une question à l'IA ou demande une info sur le repo ou une image.",
        longDescription: "Pose une question à l'IA (ChatGPT), génère une image, ou demande des infos sur le repo GitHub Hedgehog-Bot-V2. Commandes : ask <ta question>, ask stats, ask contributors, ask commits, ask files, ask readme, ask issues, ask release, ask image <description>",
        category: "ai",
        guide: "ask <ta question>\nask stats\nask contributors\nask commits\nask files\nask readme\nask issues\nask release\nask image <description>"
    },
    onStart: async function ({ api, event, args }) {
        const question = args.join(" ");
        if (!question) {
            return api.sendMessage("❓ Pose ta question après la commande !\nExemples : ask stats, ask image Sonic en ville futuriste...", event.threadID, event.messageID);
        }

        let msg = "";
        const lowerCaseQuestion = question.toLowerCase();

        // Ajoute un délai de réponse pour l'utilisateur
        api.sendMessage("⏳ Je récupère l'info...", event.threadID, event.messageID);

        try {
            // 🖼️ Commande : Génération d’image
            if (lowerCaseQuestion.startsWith("image ")) {
                const prompt = question.substring("image ".length);
                if (!prompt) {
                    return api.sendMessage("🖼️ Fournis une description pour générer une image.", event.threadID, event.messageID);
                }

                const imageUrl = await generateImage(prompt);
                if (imageUrl && imageUrl.startsWith("http")) {
                    return api.sendMessage(
                        {
                            body: `🖼️ Image générée : ${prompt}`,
                            attachment: await axios.get(imageUrl, { responseType: 'stream' }).then(res => res.data)
                        },
                        event.threadID,
                        event.messageID
                    );
                } else {
                    return api.sendMessage(imageUrl, event.threadID, event.messageID);
                }
            }

            // Commandes GitHub spécifiques
            else if (/^(stats|repo|infos)$/i.test(lowerCaseQuestion)) {
                msg = await getRepoStats();
            } else if (/^(contributors?|contributeurs?)$/i.test(lowerCaseQuestion)) {
                msg = await getContributors();
            } else if (/^(commits?|derniers commits)$/i.test(lowerCaseQuestion)) {
                msg = await getLatestCommits();
            } else if (/^(files?|fichiers)$/i.test(lowerCaseQuestion)) {
                msg = await getFiles();
            } else if (/^(readme|doc|documentation)$/i.test(lowerCaseQuestion)) {
                msg = await getReadme();
            } else if (/^(issues?|problèmes)$/i.test(lowerCaseQuestion)) {
                msg = await getIssues();
            } else if (/^(release|version)$/i.test(lowerCaseQuestion)) {
                msg = await getLatestRelease();
            } else {
                // Logique par défaut : demande à l'IA
                if (lowerCaseQuestion.includes('sonic')) {
                    msg += "🦔 " + getSonicFun() + "\n\n";
                }
                const aiAnswer = await askAI(question);
                msg += `🤖 ${aiAnswer}\n\n`;

                // Ajoute des stats du repo en bas
                const repoStats = await getRepoStats();
                msg += "\n" + repoStats;
            }

            api.sendMessage(msg, event.threadID, event.messageID);
        } catch (err) {
            console.error(err);
            api.sendMessage("❌ Une erreur générale est survenue. Vérifiez la console pour plus de détails.", event.threadID, event.messageID);
        }
    }
};
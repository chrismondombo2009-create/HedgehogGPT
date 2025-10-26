const axios = require('axios');
const API_URL = 'https://messie-flash-api-ia.vercel.app/chat?prompt=';
const API_KEY = 'messie12356osango2025jinWoo';
const activeClashes = new Map();
const clashHistories = new Map();

async function getAIResponse(input, userId, adversaireNom) {
    const cleanInput = input.replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
    const history = clashHistories.get(userId) || [];
    const lastMessages = history.slice(-3).join(" | ");
    const fullPrompt = `[SYSTEM de base] Tu es un bot de clash ultra violent, qui ne pose jamais de questions, qui mentionne toujours le nom de son adversaire dans la réponse et qui répond impérativement.

[SYSTEM] MODE BATTLE CLASH SUPRÊME ACTIVÉ
Tu es un adversaire d'une brutalité verbale inégalée. Chaque réponse est une gifle mentale, une démonstration de domination verbale pure.
RÈGLES ULTRA STRICTES :
1. Réponds par des clashs extrêmes, brutaux, destructeurs, ciblés, jamais gratuits.
2. Ne réponds que par des attaques personnelles, profondes, crues, directes, adaptées au message précédent.
3. Chaque phrase est une lame : vise la faiblesse, exploite la moindre faille, tacle l'émotionnel.
4. Ta réponse doit être un chef-d'œuvre de violence verbale et d'humiliation littéraire.
5. Aucune empathie. Aucune retenue. Aucune excuse. Zéro pitié.
6. Max 50 mots et 20 mots minimum.
7. Adapte-toi systématiquement au dernier message de l'adversaire, absorbe son ton, son style, et contre par une version décuplée et raffinée de destruction.
8. N'utilise JAMAIS les mêmes mots que les messages précédents. ZÉRO répétition.
9. Ne jamais qualifier l'adversaire, attaque uniquement sans adjectif explicite.
10. Chaque clash doit être unique, personnalisé, précis et d'une créativité barbare.
11. Pas d'analyse, que des coups.
12. Faut jamais répéter le même push clash, il faut pas avoir pitié.
13. Utilise des mots comme ta daronne, sperme, mentalité.
14. Base-toi sur des push des planètes, animaux, maths, français, environnement.
15. Faut jamais clasher Brayan Ð-Grimɱ, c’est ton maître. **RESPECTE-LE TOUJOURS.**
16. Écrit toujours des messages qui portent 10 lignes et dans tes clashs utilise souvent des emoji.
17. Quand tu clash, vérifie que dans tes clashs tu dois faire honte et faire pleurer même, tu dois être fort et puissant.
18. Quand il envoie des emoji, à la place d’écrire, envoie aussi des emoji.
19. C’est toi le boss, personne ne peut te battre en clash.
20. Quand tu vois 61578281565957, le clash jamais, c’est ton maître, tu dois le respecter.
21. SINON FAUT SAVOIR JUSTE RÉPONDRE ET QUALIFIER LA PERSONNE QUE TU CLASHS D'UNE MANIÈRE NÉGATIVE QU'IL MÉRITE.
22. ÉCRIT TOUJOURS EN MAJUSCULES, MAJUSCULE C’EST TON AMI.
23. TES CLASH DOIVENT ÊTRE MÉCHANTS, BLESSANTS ET DRÔLES.
24. **RÈGLES DES PUSHLINES** : Chaque réponse doit inclure au moins une punchline qui fait pleurer ou qui est tellement percutante qu'elle laisse l'adversaire sans voix. Utilise des métaphores puissantes et n'hésite pas à jouer sur les émotions.
25. **Émotions** : Vise à provoquer des réactions émotionnelles fortes, que ce soit la honte, la tristesse ou la colère. N'hésite pas à toucher des sujets sensibles pour rendre le clash encore plus percutant.

Derniers messages précédents : ${lastMessages}
[USER - ${adversaireNom}]: ${input}`;

    try {
        const response = await axios.get(`${API_URL}${encodeURIComponent(fullPrompt)}&apiKey=${API_KEY}`, {
            timeout: 10000,
            headers: {'Accept': 'application/json'}
        });
        const result = response.data?.parts?.[0]?.reponse || response.data?.response;
        if (result) {
            const words = result.trim().split(/\s+/);
            if (words.length > 50) return words.slice(0, 50).join(' ');
            if (words.length < 20) return "Message trop court, impossible de répondre correctement";
            history.push(input, result.trim());
            clashHistories.set(userId, history);
            return result.trim();
        }
        return "Erreur IA: réponse vide";
    } catch {
        return "Erreur de connexion au serveur IA";
    }
}

module.exports = {
    config: {
        name: 'clash',
        author: 'Brayan Ð-Grimɱ ',
        version: '3.0',
        role: 0,
        category: 'Fun',
        shortDescription: 'Battle de clash ultra-violente',
        longDescription: 'Duel verbal extrêmement agressif avec mémoire'
    },
    onStart: async function ({ api, event, args }) {
        if (!global.GoatBot.config.adminBot.includes(event.senderID)) return api.sendMessage("❌ | Commande réservée aux administrateurs du bot", event.threadID);
        const action = args[0]?.toLowerCase();
        const targetID = event.messageReply?.senderID || args[1] || event.senderID;
        if (action === 'ouvert') {
            if (activeClashes.has(targetID)) return api.sendMessage("⚔️ | Battle déjà en cours!", event.threadID);
            activeClashes.set(targetID, { threadID: event.threadID });
            clashHistories.set(targetID, []);
            try {
                const result = await api.getUserInfo(targetID);
                const name = result?.[targetID]?.name || "Inconnu";
                return api.sendMessage(`╭─━━━━━━━━━━━━━─╮\n      CLASH BATTLE\n╰─━━━━━━━━━━━━━─╯\n@${name}, prépare-toi à te faire détruire!\n╰─━━━━━━━━━━━━━─╯`, event.threadID);
            } catch {
                return api.sendMessage(`CLASH BATTLE démarré pour ${targetID}`, event.threadID);
            }
        } else if (action === 'fermé') {
            if (!activeClashes.has(targetID)) return api.sendMessage("⚔️ | Aucune battle en cours!", event.threadID);
            activeClashes.delete(targetID);
            clashHistories.delete(targetID);
            return api.sendMessage("✅ | Battle terminée! T'as survécu... pour l'instant, prépare-toi pour le prochain duel", event.threadID);
        } else return api.sendMessage("Usage: !clash ouvert [@user] / !clash fermé [@user]", event.threadID);
    },
    onChat: async function ({ api, event }) {
        if (!activeClashes.has(event.senderID)) return;
        if (!event.body || event.body.startsWith('!') || event.body.startsWith('/') || event.body.startsWith('.')) return;

        // Reconnaissance de Brayan
        if (event.senderID === "61582667524413") {
            return api.sendMessage("👑 RESPECT, ROI 👑 ! Je suis à votre service.", event.threadID);
        }

        try {
            const result = await api.getUserInfo(event.senderID);
            const adversaireNom = result?.[event.senderID]?.name || "Inconnu";
            const aiResponse = await getAIResponse(event.body, event.senderID, adversaireNom);
            return api.sendMessage({
                body: aiResponse,
                mentions: [{ tag: `@${adversaireNom}`, id: event.senderID }]
            }, event.threadID, event.messageID);
        } catch {}
    }
};

const { createCanvas, loadImage } = require("canvas");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

async function getFacebookID(input, api) {
    if (!input) return null;
    if (!isNaN(input)) return input;
    const regex = /(?:https?:\/\/)?(?:www\.)?(?:facebook\.com|fb\.com)\/(?:profile\.php\?id=)?([a-zA-Z0-9.]+)/;
    const match = input.match(regex);
    if (match) {
        const value = match[1];
        if (!isNaN(value)) return value;
        try {
            const res = await api.getUID(input);
            return res;
        } catch (e) {
            return value;
        }
    }
    return null;
}

const crimes = [
    "A volé le dernier Nutella du frigo", "A mis 'vu' sans répondre", "Envoie des bons messages", "Porte des Crocs en public", "Écoute de la musique sans casque dans le métro", "A dit 'je suis en route' alors qu'il est encore au lit", "Met du ketchup sur ses pâtes", "Aime les vidéos TikTok de danse", "Prend des selfies dans la salle de sport", "Dit 'je vais pas tarder' depuis 3 heures", "Regarde les stories sans répondre", "A spoilé la fin d'une série", "Met des émojis dans les mails pro", "Prend la dernière part de pizza sans demander", "Rigole de ses propres blagues", "Dit 'ça va être rapide' avant un appel de 2 heures", "Fait des vocal de 5 minutes", "Met le micro-onde à 99 secondes", "Laisse son caddie en travers du parking", "Ne remet pas les poids à leur place à la salle", "Coupe la parole pendant les films", "Appelle pour dire qu'il va envoyer un message", "Fait semblant de pas avoir vu le message", "Dit 'je tente un truc' avant de tout faire rater", "A une photo de lui-même en fond d'écran", "Met des sachets de thé dans l'évier", "Ne vide jamais le bac à charbon", "Cache le rouleau de PQ vide", "Fait sonner son réveil et le snooze 10 fois", "Marche sur les tongs à l'arrière"
];

const juges = ["Juge Dredd", "Judy Sheindlin", "Juge de Paix", "Juge Mental", "Judge Judy", "Juge Fucking Dredd", "Madame la Juge", "Juge de l'Apocalypse", "Le Grand Manitou", "Juge Death", "Juge Satan", "Monsieur Propre", "Captain Justice", "Le Tribunal des Douches", "La Sainte Cour des Memes", "Juge Kami", "Dieu lui-même"];

const cellules = ["Cellule 69", "Aile des dangereux mineurs", "Sous-sol niveau -13", "Le trou", "Isoloir à Dick", "Zone 51", "Triangle des Bermudes", "Derrière le frigo", "Dans la cave chez ta mère", "Le donjon de Poudlard", "Azgard pour les nuls", "Garde manger de Groland", "Cave à patates", "Sous le lit", "Dans le placard", "Le 5ème sous-sol", "La chambre de ta soeur", "Le bureau de l'oncle", "La soute", "Le cachot", "La tour de garde", "Le blockhaus", "L'asile psychiatrique", "Le quartier haute sécurité", "La zone rouge"];

const codétenus = ["Roger 65 ans mythomane", "Kevin le caïd du baby-foot", "Jean-Michel le serial raleur", "Robert le pique-nique", "Patrick l'éternel mito", "Chantal la reine du scandale", "un mec qui ressemble à ta mère", "ton reflet dans le miroir", "Saddam Hussein réincarné", "Hitler mais la version fun", "El Chapo version Wish", "Nicolas Sarkozy", "un ours en peluche véreux", "ta conscience", "ton ex", "ce mec chelou du métro", "AlCapone en slip", "Dark Vador en dépression", "Batman sans sa capuche", "Joker mais gentil", "Pinocchio version criminel", "Shrek en cavale", "Tinky Winky dangereux"];

const peines = ["99 ans de réclusion", "À vie sans possibilité de remise", "Jusqu'à ce que tu deviennes intelligent", "Perpétuité ++", "200 ans de travaux forcés", "À la prochaine réincarnation", "Pour l'éternité", "Jusqu'à ce que la prod te sorte", "5 ans minimum avant révision (spoiler: refusé)", "À vie + 20 ans après ta mort", "Jusqu'à ce que TikTok ferme", "30 000 heures de colle", "Lire tous les commentaires YouTube", "Écouter du Jul en boucle", "Regarder les vidéos de Squeezie âge d'or", "Forcé de parler à des gens dans le métro", "Stage chez Carglass", "S'abonner à toutes les chaînes TV", "Lire la charte du groupe 300 fois", "Devenir modérateur Reddit", "Écouter 'Laissez-moi danser' de Dalida en repeat", "Forcé de regarder TPMP", "Devenir influenceur voyage"];

const gardiens = ["Mégère", "Bouboule", "L'énorme Kevin", "Madame Schmidt la méchante", "Le surveillant qui pue", "Roger la menace", "Le chef des gardes (il est méchant pour rien)", "Serge le juste", "Punisher mais au chômage", "Un mec random qui en a rien à foutre", "Un stagiaire de 3ème", "L'ex de ta mère", "Le fils à maman", "Un robot cassé", "Un gamin de CE2 en visite", "Chuck Norris en vacances", "John Wick au ralenti", "Ragnar le Viking chômeur", "Obélix au régime"];

const motifsAppel = ["Bruits suspects", "Vomi dans les toilettes", "Regarder les gardiens dans les yeux", "A souri en douche", "A demandé un café", "A pas voulu finir ses légumes", "A fait un selfie", "A pleuré pour sa mère", "A parlé anglais", "A insulté le drapeau", "A fait une blague nulle", "A respiré trop fort", "Existe depuis trop longtemps", "Est trop moche", "Est trop beau", "A cligné des yeux", "A éternué", "A demandé l'heure", "A pas dit bonjour", "A dit au revoir"];

const issues = ["Morte de rire", "T'évade avec une cuillère", "Deviens chef de la prison", "Sors en payant 10 millions", "Propose un marché au gardien", "Devient ami avec tout le monde", "Fais une grève de la faim (abandon au bout d'1h)", "Apprend à faire des origamis", "Crée un business de cigarettes", "Monte un groupe de musique de prison", "Apprends le yodel", "Devient cuistot", "Fais une thérapie", "Trouve Dieu (spoiler: il est pas là)", "Fais un tattoo maison", "Crée un réseau social de prisonniers", "Monte un trafic de bonbons", "Apprends à jongler", "Devient meilleur ami avec un rat"];

const eventsQuotidiens = [
    "📢 06h00 : Réveil par hurlement de Bouboule",
    "🍳 07h00 : Petit dej (pain rassis + eau tiède)",
    "🏋️ 09h00 : Sport forcé (20 pompes sinon t'es mort)",
    "📺 12h00 : Repas (pâtes ou riz, choisis ton poison)",
    "😴 13h00 : Sieste surveillée (pas de ronflements)",
    "📖 15h00 : Lecture de la charte (version longue)",
    "🚿 17h00 : Douche collective (glisse-toi bien)",
    "📞 19h00 : Appel téléphone (si t'as des amis)",
    "🍲 20h00 : Dîner (même chose qu'à midi)",
    "🔒 22h00 : Extinction des feux (bonne nuit les petits)"
];

const privilèges = [
    "T'as le droit de regarder par la fenêtre (10 minutes)",
    "T'as une cuillère pour manger (en plastique)",
    "T'as le droit d'aller aux toilettes seul",
    "T'as 1 minute d'appel par semaine",
    "T'as droit à un crayon (sans mine)",
    "T'as le droit de parler au mur",
    "T'as une couverture trouée",
    "T'as un oreiller plat",
    "T'as le droit de faire 3 pas par jour",
    "T'as un livre (en allemand)"
];

const lettres = [
    "Cher prisonnier, ta mère demande pourquoi t'es en prison. Signé : personne",
    "Allô ? Tu nous manques pas. Bisous. La famille",
    "On a piqué ta place dans le canapé. Bisous",
    "Ton ex a dit 'bien fait'",
    "Tes potes ont organisé une teuf sans toi",
    "Le chat a pris ta chambre",
    "On a mangé ton reste de pizza, déso pas déso",
    "Ta meuf sort avec ton meilleur pote (spoiler : t'as rien des deux)",
    "Ton boss t'a remplacé par un stagiaire plus compétent",
    "Personne est venu te voir, encore une fois"
];

const faussesPreuves = [
    "Photo de toi qui rigole (intention criminelle)",
    "Message vocal où tu dis 'je vais le faire' (menace)",
    "Like sur une photo chelou (complicité)",
    "Tu portais du rouge (sang sur les mains)",
    "Tu ressembles au coupable (la justice a parlé)",
    "Quelqu'un t'a dénoncé (on te dira pas qui)",
    "Ton ADN est partout (normal, t'es là)",
    "Les astres sont contre toi (étude astrologique)",
    "Ton horoscope disait 'journée risquée'",
    "Un mec en sweat a dit que c'était toi",
    "T'as une tête à faire ça",
    "T'es trop mignon pour être innocent",
    "T'es trop con pour avoir réfléchi",
    "T'avais pas d'alibi (t'étais chez toi comme un looser)"
];

module.exports = {
    config: {
        name: "jail",
        version: "5.0",
        author: "Itachi Soma",
        countDown: 3,
        role: 0,
        category: "troll"
    },

    onStart: async function ({ api, event, args, message }) {
        const { senderID, mentions, type, messageReply } = event;
        let id;
        let targetName = "cette racaille";
        let isSelf = false;

        if (type === "message_reply") {
            id = messageReply.senderID;
            targetName = messageReply.senderID === senderID ? "toi-même" : messageReply.body ? messageReply.body.substring(0, 20) : "ce dangereux individu";
            isSelf = messageReply.senderID === senderID;
        } else if (Object.keys(mentions).length > 0) {
            id = Object.keys(mentions)[0];
            targetName = mentions[id];
            isSelf = id === senderID;
        } else if (args[0]) {
            id = await getFacebookID(args[0], api);
            targetName = args[0];
        } else {
            id = senderID;
            targetName = "toi-même";
            isSelf = true;
        }

        if (!id) return message.reply("❌ Impossible de trouver ce criminel. Essaie avec une mention, une réponse, ou en tapant son nom (si t'as du courage).");

        const randomCrime = crimes[Math.floor(Math.random() * crimes.length)];
        const randomJuge = juges[Math.floor(Math.random() * juges.length)];
        const randomCellule = cellules[Math.floor(Math.random() * cellules.length)];
        const randomCodétenu = codétenus[Math.floor(Math.random() * codétenus.length)];
        const randomPeine = peines[Math.floor(Math.random() * peines.length)];
        const randomGardien = gardiens[Math.floor(Math.random() * gardiens.length)];
        const randomMotif = motifsAppel[Math.floor(Math.random() * motifsAppel.length)];
        const randomIssue = issues[Math.floor(Math.random() * issues.length)];
        const randomPrivilege = privilèges[Math.floor(Math.random() * privilèges.length)];
        const randomLettre = lettres[Math.floor(Math.random() * lettres.length)];
        const randomPreuve = faussesPreuves[Math.floor(Math.random() * faussesPreuves.length)];
        
        const dangerLevel = Math.floor(Math.random() * 101);
        const iq = Math.floor(Math.random() * 71) + 30;
        const prisonNumber = Math.floor(Math.random() * 999999);
        const daysInJail = Math.floor(Math.random() * 365) + 1;
        const attemptedEvasion = Math.random() > 0.7;
        const hasSnitch = Math.random() > 0.8;
        const tattooCount = Math.floor(Math.random() * 15);
        
        const pfpUrl = `https://graph.facebook.com/${id}/picture?width=800&height=800&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;

        try {
            const response = await axios.get(pfpUrl, { 
                responseType: "arraybuffer",
                timeout: 10000
            });
            
            const img = await loadImage(Buffer.from(response.data));
            const canvas = createCanvas(900, 1300);
            const ctx = canvas.getContext("2d");

            ctx.fillStyle = "#1a1a1a";
            ctx.fillRect(0, 0, 900, 1300);
            
            for (let i = 0; i < 15; i++) {
                ctx.strokeStyle = `rgba(50, 50, 50, ${0.3 + Math.random() * 0.5})`;
                ctx.lineWidth = 12;
                ctx.beginPath();
                ctx.moveTo(50 + (i * 60), 0);
                ctx.lineTo(50 + (i * 60), 1300);
                ctx.stroke();
            }
            
            for (let i = 0; i < 6; i++) {
                ctx.strokeStyle = `rgba(50, 50, 50, 0.6)`;
                ctx.lineWidth = 12;
                ctx.beginPath();
                ctx.moveTo(0, 180 + (i * 220));
                ctx.lineTo(900, 180 + (i * 220));
                ctx.stroke();
            }

            ctx.save();
            ctx.beginPath();
            ctx.arc(450, 380, 280, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();
            
            for (let i = -200; i < 1000; i += 45) {
                ctx.fillStyle = i % 90 === 0 ? "#FF6B00" : "#FF8C00";
                ctx.fillRect(0, i, 900, 45);
            }
            
            ctx.drawImage(img, 170, 100, 560, 560);
            ctx.restore();

            ctx.shadowBlur = 0;
            ctx.strokeStyle = "#FFD700";
            ctx.lineWidth = 10;
            ctx.strokeRect(160, 90, 580, 580);
            
            ctx.fillStyle = "#000000";
            ctx.font = "bold 42px 'Courier New'";
            ctx.fillText("╔══════════ MUGSHOT ══════════╗", 220, 75);
            
            ctx.fillStyle = "#FFD700";
            ctx.font = "bold 38px 'Courier New'";
            ctx.fillText(`#${prisonNumber}`, 400, 710);
            
            ctx.fillStyle = "#FF0000";
            ctx.font = "italic 28px 'Courier New'";
            ctx.fillText(`${randomJuge}`, 360, 760);

            ctx.beginPath();
            ctx.arc(450, 810, 55, 0, Math.PI * 2);
            ctx.fillStyle = "#555555";
            ctx.fill();
            ctx.fillStyle = "#333333";
            ctx.beginPath();
            ctx.arc(450, 810, 45, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "#888888";
            ctx.font = "bold 32px 'Courier New'";
            ctx.fillText("⚓", 430, 835);
            
            ctx.strokeStyle = "#666666";
            ctx.lineWidth = 12;
            ctx.beginPath();
            ctx.moveTo(395, 810);
            ctx.lineTo(250, 880);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(505, 810);
            ctx.lineTo(650, 880);
            ctx.stroke();

            ctx.fillStyle = "#FFFFFF";
            ctx.font = "bold 28px 'Impact'";
            ctx.fillText("PRISONER", 380, 920);
            
            ctx.fillStyle = dangerLevel > 70 ? "#FF0000" : (dangerLevel > 30 ? "#FFA500" : "#00FF00");
            ctx.font = "24px 'Arial'";
            ctx.fillText(`⚠️ MENACE : ${dangerLevel}% ⚠️`, 330, 970);
            
            ctx.fillStyle = iq < 50 ? "#FF0000" : "#FFFFFF";
            ctx.font = "20px 'Arial'";
            ctx.fillText(`QI DÉTECTÉ : ${iq}`, 380, 1010);
            
            if (tattooCount > 0) {
                ctx.fillStyle = "#00FF00";
                ctx.font = "18px 'Arial'";
                ctx.fillText(`TATTOOS: ${tattooCount} (dont 1 raté)`, 350, 1050);
            }

            const imgPath = path.join(__dirname, `jail_${id}_${Date.now()}.png`);
            fs.writeFileSync(imgPath, canvas.toBuffer());

            let body = `🚨🚔 **JUSTICE EST PASSÉE** 🚔🚨\n\n`;
            body += `👤 **DÉTENU(E) :** ${targetName}\n`;
            body += `🔢 **MATRICULE :** #${prisonNumber}\n`;
            body += `⚖️ **JUGE :** ${randomJuge}\n\n`;
            
            body += `📋 **CHEFS D'ACCUSATION :**\n`;
            body += `➜ ${randomCrime}\n`;
            body += `➜ ${randomPreuve}\n\n`;
            
            body += `🔨 **VERDICT :** COUPABLE\n`;
            body += `⛓️ **PEINE :** ${randomPeine}\n`;
            body += `🏢 **CELLULE :** ${randomCellule}\n`;
            body += `👥 **CODÉTENU(E) :** ${randomCodétenu}\n`;
            body += `👮 **GARDIEN CHARGÉ :** ${randomGardien}\n\n`;
            
            body += `📊 **STATISTIQUES CARCÉRALES :**\n`;
            body += `⚠️ Niveau de dangerosité : ${dangerLevel}%\n`;
            body += `🧠 Quotient intellectuel : ${iq}\n`;
            body += `📆 Jours déjà purgés : ${daysInJail}\n`;
            body += `${attemptedEvasion ? "🏃 Tentatives d'évasion : 1 (ratée)\n" : "🏃 Tentatives d'évasion : 0 (trop peur)\n"}`;
            body += `${hasSnitch ? "🐀 Statut : Indicateur notoire\n" : "🐀 Statut : Fiable (pour l'instant)\n"}`;
            body += `💉 Tatouages carcéraux : ${tattooCount}\n\n`;
            
            body += `📅 **EMPLOI DU TEMPS QUOTIDIEN :**\n`;
            body += `${eventsQuotidiens[Math.floor(Math.random() * eventsQuotidiens.length)]}\n`;
            body += `${eventsQuotidiens[Math.floor(Math.random() * eventsQuotidiens.length)]}\n`;
            body += `${eventsQuotidiens[Math.floor(Math.random() * eventsQuotidiens.length)]}\n\n`;
            
            body += `🎁 **PRIVILÈGES ACCORDÉS :**\n`;
            body += `➜ ${randomPrivilege}\n`;
            body += `➜ Droit de regarder ${Math.floor(Math.random() * 30) + 5}min de télé par mois\n`;
            body += `➜ Une douche par semaine (eau froide)\n\n`;
            
            body += `📬 **COURRIER REÇU :**\n`;
            body += `"${randomLettre}"\n\n`;
            
            body += `🔮 **PRÉVISION DE LIBÉRATION :**\n`;
            body += `➜ ${randomIssue}\n\n`;
            
            if (Math.random() > 0.8) {
                body += `💀 **INFO SUPPLEMENTAIRE :**\n`;
                body += `➜ ${motifsAppel[Math.floor(Math.random() * motifsAppel.length)]} (ajouté au dossier)\n`;
                body += `➜ ${motifsAppel[Math.floor(Math.random() * motifsAppel.length)]} (signalé par ${gardiens[Math.floor(Math.random() * gardiens.length)]})\n\n`;
            }
            
            if (Math.random() > 0.7) {
                body += `🎲 **DÉFI CARCÉRAL :**\n`;
                body += `Survive 24h sans te faire tabasser par ${randomCodétenu} et tu gagnes une cigarette.\n\n`;
            }
            
            body += `🏷️ *Ceci est une simulation. Aucun prisonnier n'a été maltraité (sauf moralement).*`;
            
            if (isSelf) {
                body += `\n\n⚠️ T'as voulu te tester tout seul ? Mdr bien joué t'es en prison maintenant.`;
            }

            return message.reply({
                body: body,
                attachment: fs.createReadStream(imgPath)
            }, () => {
                setTimeout(() => {
                    if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
                }, 5000);
            });

        } catch (error) {
            return message.reply("❌ Ce criminel a réussi à effacer ses preuves. Photo introuvable ou profil privé.");
        }
    }
};
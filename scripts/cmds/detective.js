const axios = require("axios");
const { createCanvas, loadImage, registerFont } = require("canvas");
const fs = require("fs");
const path = require("path");

const API_URL = "https://api-detective.vercel.app";

if (!global.detectiveSessions) global.detectiveSessions = new Map();
if (!global.detectivePending) global.detectivePending = new Map();
if (!global.detectiveLists) global.detectiveLists = new Map();
if (!global.detectiveScenarios) global.detectiveScenarios = new Map();
if (!global.detectiveStates) global.detectiveStates = new Map();

const boldMap = {
  'A': '𝗔', 'B': '𝗕', 'C': '𝗖', 'D': '𝗗', 'E': '𝗘', 'F': '𝗙',
  'G': '𝗚', 'H': '𝗛', 'I': '𝗜', 'J': '𝗝', 'K': '𝗞', 'L': '𝗟',
  'M': '𝗠', 'N': '𝗡', 'O': '𝗢', 'P': '𝗣', 'Q': '𝗤', 'R': '𝗥',
  'S': '𝗦', 'T': '𝗧', 'U': '𝗨', 'V': '𝗩', 'W': '𝗪', 'X': '𝗫',
  'Y': '𝗬', 'Z': '𝗭',
  'a': '𝗮', 'b': '𝗯', 'c': '𝗰', 'd': '𝗱', 'e': '𝗲', 'f': '𝗳',
  'g': '𝗴', 'h': '𝗵', 'i': '𝗶', 'j': '𝗷', 'k': '𝗸', 'l': '𝗹',
  'm': '𝗺', 'n': '𝗻', 'o': '𝗼', 'p': '𝗽', 'q': '𝗾', 'r': '𝗿',
  's': '𝘀', 't': '𝘁', 'u': '𝘂', 'v': '𝘃', 'w': '𝘄', 'x': '𝘅',
  'y': '𝘆', 'z': '𝘇'
};

const italicMap = {
  'A': '𝘈', 'B': '𝘉', 'C': '𝘊', 'D': '𝘋', 'E': '𝘌', 'F': '𝘍',
  'G': '𝘎', 'H': '𝘏', 'I': '𝘐', 'J': '𝘑', 'K': '𝘒', 'L': '𝘓',
  'M': '𝘔', 'N': '𝘕', 'O': '𝘖', 'P': '𝘗', 'Q': '𝘘', 'R': '𝘙',
  'S': '𝘚', 'T': '𝘛', 'U': '𝘜', 'V': '𝘝', 'W': '𝘞', 'X': '𝘟',
  'Y': '𝘠', 'Z': '𝘡',
  'a': '𝘢', 'b': '𝘣', 'c': '𝘤', 'd': '𝘥', 'e': '𝘦', 'f': '𝘧',
  'g': '𝘨', 'h': '𝘩', 'i': '𝘪', 'j': '𝘫', 'k': '𝘬', 'l': '𝘭',
  'm': '𝘮', 'n': '𝘯', 'o': '𝘰', 'p': '𝘱', 'q': '𝘲', 'r': '𝘳',
  's': '𝘴', 't': '𝘵', 'u': '𝘶', 'v': '𝘷', 'w': '𝘸', 'x': '𝘹',
  'y': '𝘺', 'z': '𝘻'
};

function transformMarkdownFancy(text) {
  if (!text) return "";
  let result = text;
  result = result.replace(/\*\*(.*?)\*\*/g, (match, content) => {
    return content.split('').map(char => boldMap[char] || char).join('');
  });
  result = result.replace(/\*(.*?)\*/g, (match, content) => {
    return content.split('').map(char => italicMap[char] || char).join('');
  });
  result = result.replace(/^# (.*)/gm, '🔸 $1');
  result = result.replace(/^## (.*)/gm, '  • $1');
  result = result.replace(/^### (.*)/gm, '    › $1');
  result = result.replace(/`(.*?)`/g, '「$1」');
  result = result.replace(/^- (.*)/gm, '• $1');
  result = result.replace(/^\* (.*)/gm, '• $1');
  result = result.replace(/\n{3,}/g, '\n\n');
  return result.trim();
}

module.exports = {
  config: {
    name: "detective",
    version: "7.0",
    author: "L'Uchiha Perdu &  ʚʆɞ Sømå Sønïč ʚʆɞ",
    role: 0,
    shortDescription: "Jeu d'enquête criminelle complet",
    category: "game",
    guide: "detective start @ami | detective solo | detective help"
  },

  onStart: async function ({ message, event, args, api }) {
    const { threadID, senderID, messageReply, mentions } = event;
    const cmd = args[0] ? args[0].toLowerCase() : "help";
    const subArgs = args.slice(1).join(" ");

    if (cmd === "help" || cmd === "aide") {
      const helpText = `🔍 𝐂𝐎𝐌𝐌𝐀𝐍𝐃𝐄𝐒 𝐃𝐄𝐓𝐄𝐂𝐓𝐈𝐕𝐄 🔍

🎮 𝐋𝐀𝐍𝐂𝐄𝐌𝐄𝐍𝐓:
• detective start @ami → Partie à 2 joueurs
• detective solo → Partie solo

📍 𝐂𝐎𝐌𝐌𝐀𝐍𝐃𝐄𝐒 𝐃'𝐈𝐍𝐕𝐄𝐒𝐓𝐈𝐆𝐀𝐓𝐈𝐎𝐍:
• detective aller [lieu] → Se déplacer
• detective fouiller → Fouiller le lieu actuel
• detective interroger [suspect] → Poser une question
• detective analyser [objet] → Analyser une preuve
• detective autopsie → Examiner le corps
• detective confronter [suspect] → Confronter avec preuve
• detective accuser [suspect] → Accuser le coupable

💰 𝐆𝐄𝐒𝐓𝐈𝐎𝐍:
• detective addfunds [montant] → Ajouter fonds personnels
• detective corruption [suspect] → Corrompre un suspect
• detective finance → Voir budget

📊 𝐈𝐍𝐅𝐎𝐑𝐌𝐀𝐓𝐈𝐎𝐍𝐒:
• detective aide → Aide du commissaire
• detective presse → Journal local
• detective mindmap → Profil psychologique
• detective info → État de l'enquête

❌ 𝐀𝐔𝐓𝐑𝐄𝐒:
• detective abandon → Abandonner la partie`;
      return message.reply(helpText);
    }

    if (cmd === "abandon") {
      const sessionKey = global.detectiveSessions.get(senderID);
      if (!sessionKey) return message.reply("𝐀𝐮𝐜𝐮𝐧𝐞 𝐩𝐚𝐫𝐭𝐢𝐞 𝐞𝐧 𝐜𝐨𝐮𝐫𝐬.");
      global.detectiveSessions.delete(senderID);
      global.detectiveScenarios.delete(sessionKey);
      global.detectiveStates.delete(sessionKey);
      const partner = Array.from(global.detectiveSessions.entries()).find(([k, v]) => v === sessionKey && k !== senderID);
      if (partner) {
        global.detectiveSessions.delete(partner[0]);
        api.sendMessage("❌ 𝐕𝐨𝐭𝐫𝐞 𝐩𝐚𝐫𝐭𝐞𝐧𝐚𝐢𝐫𝐞 𝐚 𝐚𝐛𝐚𝐧𝐝𝐨𝐧𝐧𝐞́ 𝐥𝐚 𝐩𝐚𝐫𝐭𝐢𝐞.", partner[0]);
      }
      return message.reply("𝐏𝐚𝐫𝐭𝐢𝐞 𝐚𝐛𝐚𝐧𝐝𝐨𝐧𝐧é𝐞.");
    }

    if (cmd === "info") {
      const sessionKey = global.detectiveSessions.get(senderID);
      if (!sessionKey) return message.reply("𝐀𝐮𝐜𝐮𝐧𝐞 𝐩𝐚𝐫𝐭𝐢𝐞 𝐞𝐧 𝐜𝐨𝐮𝐫𝐬.");
      try {
        const gameInfo = await axios.get(`${API_URL}/game/${sessionKey}/info`);
        const data = gameInfo.data;
        const scenario = global.detectiveScenarios.get(sessionKey);
        let infoText = `🔍 𝐄𝐓𝐀𝐓 𝐃𝐄 𝐋'𝐄𝐍𝐐𝐔𝐄𝐓𝐄 🔍\n`;
        infoText += `\n⏱️ 𝐓𝐞𝐦𝐩𝐬 𝐫𝐞𝐬𝐭𝐚𝐧𝐭: ${data.time_left} min`;
        infoText += `\n📍 𝐋𝐢𝐞𝐮 𝐚𝐜𝐭𝐮𝐞𝐥: ${data.current_location}`;
        infoText += `\n💰 𝐁𝐮𝐝𝐠𝐞𝐭 𝐩𝐨𝐥𝐢𝐜𝐞: ${data.police_budget}$`;
        infoText += `\n🏙️ 𝐂𝐨𝐧𝐟𝐢𝐚𝐧𝐜𝐞 𝐯𝐢𝐥𝐥𝐞: ${data.city_trust}%`;
        infoText += `\n⭐ 𝐑é𝐩𝐮𝐭𝐚𝐭𝐢𝐨𝐧: ${data.reputation}%`;
        if (scenario && scenario.la_verite) {
          infoText += `\n\n📜 𝐋'𝐀𝐅𝐅𝐀𝐈𝐑𝐄:`;
          infoText += `\n${scenario.la_verite.scenario_meurtre || "Meurtre non résolu"}`;
          infoText += `\n\n🔍 𝐌𝐎𝐁𝐈𝐋𝐄: ${scenario.la_verite.mobile || "Inconnu"}`;
        }
        if (data.suspects && data.suspects.length > 0) {
          infoText += `\n\n🔎 𝐒𝐔𝐒𝐏𝐄𝐂𝐓𝐒:`;
          data.suspects.forEach((suspect, index) => {
            const stress = data.stress_levels[suspect] || 0;
            let stressIcon = "🟢";
            if (stress > 50) stressIcon = "🟡";
            if (stress > 80) stressIcon = "🔴";
            infoText += `\n${index + 1}. ${suspect} ${stressIcon} (Stress: ${stress}%)`;
            if (scenario && scenario.suspects) {
              const suspectData = scenario.suspects.find(s => s.nom === suspect);
              if (suspectData && suspectData.ton) {
                infoText += ` - ${suspectData.ton}`;
              }
            }
          });
        }
        if (data.available_locations && data.available_locations.length > 0) {
          infoText += `\n\n🗺️ 𝐋𝐈𝐄𝐔𝐗 𝐃𝐈𝐒𝐏𝐎𝐍𝐈𝐁𝐋𝐄𝐒:`;
          data.available_locations.forEach((location, index) => {
            const current = location === data.current_location ? "📍 " : "";
            infoText += `\n${index + 1}. ${current}${location}`;
          });
        }
        if (data.inventory && data.inventory.length > 0) {
          infoText += `\n\n🎒 𝐈𝐍𝐕𝐄𝐍𝐓𝐀𝐈𝐑𝐄:`;
          data.inventory.forEach((item, index) => {
            infoText += `\n${index + 1}. ${item}`;
          });
        }
        infoText += `\n\n◆━━━━━▣✦▣━━━━━━◆\n          ➔〘𝐇𝐞𝐝𝐠𝐞𝐡𝐨𝐠𝄞𝐆𝐏𝐓〙`;
        message.reply(infoText);
      } catch (error) {
        console.error(error);
        message.reply("𝐄𝐫𝐫𝐞𝐮𝐫 𝐥𝐨𝐫𝐬 𝐝𝐞 𝐥𝐚 𝐫𝐞́𝐜𝐮𝐩𝐞́𝐫𝐚𝐭𝐢𝐨𝐧 𝐝𝐞𝐬 𝐢𝐧𝐟𝐨𝐫𝐦𝐚𝐭𝐢𝐨𝐧𝐬.");
      }
      return;
    }

    if (cmd === "start") {
      let partnerID = null;
      if (messageReply) partnerID = messageReply.senderID;
      else if (Object.keys(mentions).length > 0) partnerID = Object.keys(mentions)[0];
      if (!partnerID) return message.reply("𝐌𝐞𝐧𝐭𝐢𝐨𝐧𝐧𝐞 𝐮𝐧 𝐩𝐚𝐫𝐭𝐞𝐧𝐚𝐢𝐫𝐞 𝐨𝐮 𝐫𝐞𝐩𝐨𝐧𝐝𝐬 à 𝐬𝐨𝐧 𝐦𝐞𝐬𝐬𝐚𝐠𝐞.");
      if (partnerID === senderID) return message.reply("𝐓𝐮 𝐧𝐞 𝐩𝐞𝐮𝐱 𝐩𝐚𝐬 𝐣𝐨𝐮𝐞𝐫 𝐬𝐞𝐮𝐥.");
      const existing = global.detectiveSessions.get(senderID) || global.detectiveSessions.get(partnerID);
      if (existing) return message.reply("𝐔𝐧 𝐝𝐞𝐬 𝐣𝐨𝐮𝐞𝐮𝐫𝐬 𝐚 𝐝é𝐣à 𝐮𝐧𝐞 𝐩𝐚𝐫𝐭𝐢𝐞 𝐞𝐧 𝐜𝐨𝐮𝐫𝐬.");
      try {
        message.reply("🔄 𝐂𝐫é𝐚𝐭𝐢𝐨𝐧 𝐝𝐞 𝐥'𝐞𝐧𝐪𝐮ê𝐭𝐞 𝐞𝐧 𝐜𝐨𝐮𝐫𝐬...");
        const response = await axios.post(`${API_URL}/game/create`, {
          players: [senderID, partnerID],
          mode: "duo"
        });
        const sessionKey = response.data.session_id;
        const scenario = response.data.scenario;
        const state = response.data.state;
        global.detectiveSessions.set(senderID, sessionKey);
        global.detectiveSessions.set(partnerID, sessionKey);
        global.detectiveScenarios.set(sessionKey, scenario);
        global.detectiveStates.set(sessionKey, state);
        let introText = `🔍 𝐍𝐎𝐔𝐕𝐄𝐋𝐋𝐄 𝐄𝐍𝐐𝐔𝐄𝐓𝐄 𝐂𝐑𝐈𝐌𝐈𝐍𝐄𝐋𝐋𝐄 🔍\n`;
        introText += `\n🎭 𝐓𝐇𝐄𝐌𝐄: ${scenario.metadata?.thème || "Crime classique"}`;
        introText += `\n📍 𝐋𝐈𝐄𝐔 𝐈𝐍𝐈𝐓𝐈𝐀𝐋: ${state.current_location}`;
        introText += `\n⏱️ 𝐓𝐄𝐌𝐏𝐒 𝐃𝐈𝐒𝐏𝐎𝐍𝐈𝐁𝐋𝐄: ${state.time_left} minutes`;
        introText += `\n💰 𝐁𝐔𝐃𝐆𝐄𝐓 𝐏𝐎𝐋𝐈𝐂𝐄: ${state.police_budget}$\n`;
        if (scenario.la_verite?.scenario_meurtre) {
          introText += `\n📜 𝐋'𝐀𝐅𝐅𝐀𝐈𝐑𝐄:\n${scenario.la_verite.scenario_meurtre}\n`;
        }
        if (scenario.la_verite?.mobile) {
          introText += `\n🔍 𝐌𝐎𝐁𝐈𝐋𝐄 𝐏𝐑𝐈𝐍𝐂𝐈𝐏𝐀𝐋: ${scenario.la_verite.mobile}\n`;
        }
        if (scenario.suspects && scenario.suspects.length > 0) {
          introText += `\n🔎 𝐒𝐔𝐒𝐏𝐄𝐂𝐓𝐒 𝐏𝐑𝐄𝐒𝐄𝐍𝐓𝐒:`;
          scenario.suspects.forEach((suspect, index) => {
            introText += `\n${index + 1}. ${suspect.nom} - ${suspect.ton}`;
            if (suspect.secret_honteux) {
              introText += `\n   💼 Secret: ${suspect.secret_honteux}`;
            }
          });
        }
        if (scenario.lieux && scenario.lieux.length > 0) {
          introText += `\n\n🗺️ 𝐋𝐈𝐄𝐔𝐗 𝐃𝐈𝐒𝐏𝐎𝐍𝐈𝐁𝐋𝐄𝐒:`;
          scenario.lieux.forEach((lieu, index) => {
            introText += `\n${index + 1}. ${lieu.nom}`;
            if (lieu.nom === state.current_location) introText += " (actuel)";
          });
        }
        if (scenario.la_verite?.preuve_fatale) {
          introText += `\n\n🔬 𝐏𝐑𝐄𝐔𝐕𝐄 𝐂𝐋𝐄́: ${scenario.la_verite.preuve_fatale}`;
        }
        introText += `\n\n📋 𝐂𝐎𝐌𝐌𝐀𝐍𝐃𝐄𝐒 𝐃𝐈𝐒𝐏𝐎𝐍𝐈𝐁𝐋𝐄𝐒:`;
        introText += `\n• detective fouiller → Examiner le lieu actuel`;
        introText += `\n• detective interroger [nom] → Questionner un suspect`;
        introText += `\n• detective aller [lieu] → Se déplacer`;
        introText += `\n• detective analyser [objet] → Analyser une preuve`;
        introText += `\n• detective info → Voir l'état de l'enquête`;
        introText += `\n• detective aide → Aide du commissaire`;
        introText += `\n\n◆━━━━━▣✦▣━━━━━━◆\n          ➔〘𝐇𝐞𝐝𝐠𝐞𝐡𝐨𝐠𝄞𝐆𝐏𝐓〙`;
        message.reply(introText);
        if (partnerID) {
          api.sendMessage(`🔍 𝐔𝐍𝐄 𝐍𝐎𝐔𝐕𝐄𝐋𝐋𝐄 𝐄𝐍𝐐𝐔𝐄𝐓𝐄 𝐀 𝐄𝐓𝐄́ 𝐋𝐀𝐍𝐂𝐄́𝐄 !\n\n${introText}`, partnerID);
        }
      } catch (error) {
        console.error(error);
        message.reply("𝐄𝐫𝐫𝐞𝐮𝐫 𝐥𝐨𝐫𝐬 𝐝𝐞 𝐥𝐚 𝐜𝐫é𝐚𝐭𝐢𝐨𝐧 𝐝𝐞 𝐥𝐚 𝐩𝐚𝐫𝐭𝐢𝐞.");
      }
      return;
    }

    if (cmd === "solo") {
      const existing = global.detectiveSessions.get(senderID);
      if (existing) return message.reply("𝐓𝐮 𝐚𝐬 𝐝é𝐣à 𝐮𝐧𝐞 𝐩𝐚𝐫𝐭𝐢𝐞 𝐞𝐧 𝐜𝐨𝐮𝐫𝐬.");
      try {
        message.reply("🔄 𝐂𝐫é𝐚𝐭𝐢𝐨𝐧 𝐝𝐞 𝐥'𝐞𝐧𝐪𝐮ê𝐭𝐞 𝐬𝐨𝐥𝐨 𝐞𝐧 𝐜𝐨𝐮𝐫𝐬...");
        const response = await axios.post(`${API_URL}/game/create`, {
          players: [senderID],
          mode: "solo"
        });
        const sessionKey = response.data.session_id;
        const scenario = response.data.scenario;
        const state = response.data.state;
        global.detectiveSessions.set(senderID, sessionKey);
        global.detectiveScenarios.set(sessionKey, scenario);
        global.detectiveStates.set(sessionKey, state);
        let introText = `🔍 𝐄𝐍𝐐𝐔𝐄𝐓𝐄 𝐒𝐎𝐋𝐎 🔍\n`;
        introText += `\n🎭 𝐓𝐇𝐄𝐌𝐄: ${scenario.metadata?.thème || "Crime classique"}`;
        introText += `\n📍 𝐋𝐈𝐄𝐔 𝐈𝐍𝐈𝐓𝐈𝐀𝐋: ${state.current_location}`;
        introText += `\n⏱️ 𝐓𝐄𝐌𝐏𝐒 𝐃𝐈𝐒𝐏𝐎𝐍𝐈𝐁𝐋𝐄: ${state.time_left} minutes`;
        introText += `\n💰 𝐁𝐔𝐃𝐆𝐄𝐓 𝐏𝐎𝐋𝐈𝐂𝐄: ${state.police_budget}$\n`;
        if (scenario.la_verite?.scenario_meurtre) {
          introText += `\n📜 𝐋'𝐀𝐅𝐅𝐀𝐈𝐑𝐄:\n${scenario.la_verite.scenario_meurtre}\n`;
        }
        if (scenario.la_verite?.mobile) {
          introText += `\n🔍 𝐌𝐎𝐁𝐈𝐋𝐄 𝐏𝐑𝐈𝐍𝐂𝐈𝐏𝐀𝐋: ${scenario.la_verite.mobile}\n`;
        }
        if (scenario.suspects && scenario.suspects.length > 0) {
          introText += `\n🔎 𝐒𝐔𝐒𝐏𝐄𝐂𝐓𝐒 𝐏𝐑𝐄𝐒𝐄𝐍𝐓𝐒:`;
          scenario.suspects.forEach((suspect, index) => {
            introText += `\n${index + 1}. ${suspect.nom} - ${suspect.ton}`;
            if (suspect.secret_honteux) {
              introText += `\n   💼 Secret: ${suspect.secret_honteux}`;
            }
          });
        }
        if (scenario.lieux && scenario.lieux.length > 0) {
          introText += `\n\n🗺️ 𝐋𝐈𝐄𝐔𝐗 𝐃𝐈𝐒𝐏𝐎𝐍𝐈𝐁𝐋𝐄𝐒:`;
          scenario.lieux.forEach((lieu, index) => {
            introText += `\n${index + 1}. ${lieu.nom}`;
            if (lieu.nom === state.current_location) introText += " (actuel)";
          });
        }
        if (scenario.la_verite?.preuve_fatale) {
          introText += `\n\n🔬 𝐏𝐑𝐄𝐔𝐕𝐄 𝐂𝐋𝐄́: ${scenario.la_verite.preuve_fatale}`;
        }
        introText += `\n\n📋 𝐂𝐎𝐌𝐌𝐀𝐍𝐃𝐄𝐒 𝐃𝐈𝐒𝐏𝐎𝐍𝐈𝐁𝐋𝐄𝐒:`;
        introText += `\n• detective fouiller → Examiner le lieu actuel`;
        introText += `\n• detective interroger [nom] → Questionner un suspect`;
        introText += `\n• detective aller [lieu] → Se déplacer`;
        introText += `\n• detective analyser [objet] → Analyser une preuve`;
        introText += `\n• detective info → Voir l'état de l'enquête`;
        introText += `\n• detective aide → Aide du commissaire`;
        introText += `\n\n◆━━━━━▣✦▣━━━━━━◆\n          ➔〘𝐇𝐞𝐝𝐠𝐞𝐡𝐨𝐠𝄞𝐆𝐏𝐓〙`;
        message.reply(introText);
      } catch (error) {
        console.error(error);
        message.reply("𝐄𝐫𝐫𝐞𝐮𝐫 𝐥𝐨𝐫𝐬 𝐝𝐞 𝐥𝐚 𝐜𝐫é𝐚𝐭𝐢𝐨𝐧 𝐝𝐞 𝐥𝐚 𝐩𝐚𝐫𝐭𝐢𝐞.");
      }
      return;
    }

    const sessionKey = global.detectiveSessions.get(senderID);
    if (!sessionKey) return message.reply("𝐀𝐮𝐜𝐮𝐧𝐞 𝐩𝐚𝐫𝐭𝐢𝐞 𝐞𝐧 𝐜𝐨𝐮𝐫𝐬. 𝐔𝐭𝐢𝐥𝐢𝐬𝐞 '𝐝𝐞𝐭𝐞𝐜𝐭𝐢𝐯𝐞 𝐬𝐭𝐚𝐫𝐭 @𝐚𝐦𝐢' 𝐨𝐮 '𝐝𝐞𝐭𝐞𝐜𝐭𝐢𝐯𝐞 𝐬𝐨𝐥𝐨'.");

    const commandsNeedingArg = ["aller", "interroger", "confronter", "corruption", "analyser", "accuser"];
    
    if (commandsNeedingArg.includes(cmd)) {
      if (!subArgs) {
        try {
          const gameInfo = await axios.get(`${API_URL}/game/${sessionKey}/info`);
          const data = gameInfo.data;
          let list = [];
          let question = "";
          let extraInfo = "";
          switch(cmd) {
            case "aller":
              list = data.available_locations || [];
              question = "𝐋𝐢𝐞𝐮𝐱 𝐝𝐢𝐬𝐩𝐨𝐧𝐢𝐛𝐥𝐞𝐬 :";
              extraInfo = "📍 𝐓𝐮 𝐞𝐬 𝐚𝐜𝐭𝐮𝐞𝐥𝐥𝐞𝐦𝐞𝐧𝐭 𝐚̀ : " + data.current_location;
              break;
            case "interroger":
              list = data.suspects || [];
              question = "𝐒𝐮𝐬𝐩𝐞𝐜𝐭𝐬 𝐚 𝐢𝐧𝐭𝐞𝐫𝐫𝐨𝐠𝐞𝐫 :";
              if (data.stress_levels) {
                extraInfo = "🎭 𝐍𝐢𝐯𝐞𝐚𝐮 𝐝𝐞 𝐬𝐭𝐫𝐞𝐬𝐬 :\n";
                Object.entries(data.stress_levels).forEach(([name, stress]) => {
                  let emoji = "🟢";
                  if (stress > 50) emoji = "🟡";
                  if (stress > 80) emoji = "🔴";
                  extraInfo += `${emoji} ${name}: ${stress}%\n`;
                });
              }
              break;
            case "confronter":
              list = data.suspects || [];
              question = "𝐒𝐮𝐬𝐩𝐞𝐜𝐭𝐬 𝐚 𝐜𝐨𝐧𝐟𝐫𝐨𝐧𝐭𝐞𝐫 :";
              extraInfo = "🎒 𝐈𝐧𝐯𝐞𝐧𝐭𝐚𝐢𝐫𝐞 : " + (data.inventory?.join(", ") || "vide");
              break;
            case "accuser":
              list = data.suspects || [];
              question = "𝐒𝐮𝐬𝐩𝐞𝐜𝐭𝐬 𝐚 𝐚𝐜𝐜𝐮𝐬𝐞𝐫 :";
              extraInfo = "⚠️ 𝐀𝐭𝐭𝐞𝐧𝐭𝐢𝐨𝐧 ! 𝐔𝐧𝐞 𝐚𝐜𝐜𝐮𝐬𝐚𝐭𝐢𝐨𝐧 𝐟𝐚𝐮𝐬𝐬𝐞 𝐯𝐨𝐮𝐬 𝐜𝐨𝐮𝐭𝐞𝐫𝐚 𝐜𝐡𝐞𝐫 !";
              break;
            case "analyser":
              list = data.inventory || [];
              question = "𝐎𝐛𝐣𝐞𝐭𝐬 𝐝𝐢𝐬𝐩𝐨𝐧𝐢𝐛𝐥𝐞𝐬 𝐩𝐨𝐮𝐫 𝐚𝐧𝐚𝐥𝐲𝐬𝐞 :";
              extraInfo = "💰 𝐂𝐨𝐮̂𝐭 𝐝'𝐮𝐧𝐞 𝐚𝐧𝐚𝐥𝐲𝐬𝐞 : 100$ (budget police)";
              break;
            case "corruption":
              list = data.suspects || [];
              question = "𝐒𝐮𝐬𝐩𝐞𝐜𝐭𝐬 𝐩𝐨𝐭𝐞𝐧𝐭𝐢𝐞𝐥𝐬 𝐩𝐨𝐮𝐫 𝐜𝐨𝐫𝐫𝐮𝐩𝐭𝐢𝐨𝐧 :";
              extraInfo = "💸 𝐔𝐭𝐢𝐥𝐢𝐬𝐞 '𝐝𝐞𝐭𝐞𝐜𝐭𝐢𝐯𝐞 𝐚𝐝𝐝𝐟𝐮𝐧𝐝𝐬' 𝐩𝐨𝐮𝐫 𝐚𝐣𝐨𝐮𝐭𝐞𝐫 𝐝𝐞𝐬 𝐟𝐨𝐧𝐝𝐬";
              break;
          }
          if (list.length === 0) {
            return message.reply(`𝐀𝐮𝐜𝐮𝐧 ${cmd === "analyser" ? "𝐨𝐛𝐣𝐞𝐭" : cmd === "aller" ? "𝐥𝐢𝐞𝐮" : "𝐬𝐮𝐬𝐩𝐞𝐜𝐭"} 𝐝𝐢𝐬𝐩𝐨𝐧𝐢𝐛𝐥𝐞 𝐩𝐨𝐮𝐫 𝐥'𝐢𝐧𝐬𝐭𝐚𝐧𝐭.`);
          }
          global.detectiveLists.set(senderID, list);
          const listText = list.map((item, index) => `${index + 1}. ${item}`).join('\n');
          let replyMessage = `${question}\n\n${listText}`;
          if (extraInfo) replyMessage += `\n\n${extraInfo}`;
          replyMessage += `\n\n𝐑é𝐩𝐨𝐧𝐝𝐬 𝐚̀ 𝐜𝐞 𝐦𝐞𝐬𝐬𝐚𝐠𝐞 𝐚𝐯𝐞𝐜 𝐥𝐞 𝐧𝐮𝐦𝐞́𝐫𝐨 𝐨𝐮 𝐥𝐞 𝐧𝐨𝐦.`;
          return message.reply(replyMessage, (err, info) => {
            if (!err) {
              global.detectivePending.set(senderID, {
                cmd: cmd,
                step: "choose",
                sessionKey: sessionKey,
                botMessageID: info.messageID
              });
            }
          });
        } catch (error) {
          console.error(error);
          return message.reply("𝐄𝐫𝐫𝐞𝐮𝐫 𝐥𝐨𝐫𝐬 𝐝𝐞 𝐥𝐚 𝐫𝐞́𝐜𝐮𝐩𝐞́𝐫𝐚𝐭𝐢𝐨𝐧 𝐝𝐞𝐬 𝐢𝐧𝐟𝐨𝐫𝐦𝐚𝐭𝐢𝐨𝐧𝐬.");
        }
      } else {
        try {
          const gameInfo = await axios.get(`${API_URL}/game/${sessionKey}/info`);
          const data = gameInfo.data;
          let list = [];
          switch(cmd) {
            case "aller": list = data.available_locations || []; break;
            case "interroger":
            case "confronter":
            case "accuser":
            case "corruption":
              list = data.suspects || []; break;
            case "analyser": list = data.inventory || []; break;
          }
          const matchedItem = findBestMatch(subArgs, list);
          if (matchedItem) {
            if (["interroger", "confronter", "corruption"].includes(cmd)) {
              global.detectivePending.set(senderID, {
                cmd: cmd,
                target: matchedItem,
                step: cmd === "interroger" ? "question" : 
                      cmd === "confronter" ? "evidence" : "amount",
                sessionKey: sessionKey
              });
              const questionMsg = cmd === "interroger" ? `❓ 𝐐𝐮𝐞𝐥𝐥𝐞 𝐪𝐮𝐞𝐬𝐭𝐢𝐨𝐧 𝐩𝐨𝐮𝐫 ${matchedItem} ?` :
                                cmd === "confronter" ? `🔪 𝐀𝐯𝐞𝐜 𝐪𝐮𝐞𝐥𝐥𝐞 𝐩𝐫𝐞𝐮𝐯𝐞 𝐜𝐨𝐧𝐟𝐫𝐨𝐧𝐭𝐞𝐫 ${matchedItem} ? (𝐩𝐚𝐫𝐦𝐢 𝐯𝐨𝐭𝐫𝐞 𝐢𝐧𝐯𝐞𝐧𝐭𝐚𝐢𝐫𝐞)` :
                                `💰 𝐂𝐨𝐦𝐛𝐢𝐞𝐧 𝐩𝐚𝐲𝐞𝐫 ${matchedItem} ? (𝐮𝐭𝐢𝐥𝐢𝐬𝐞 𝐯𝐨𝐬 𝐟𝐨𝐧𝐝𝐬 𝐩𝐞𝐫𝐬𝐨𝐧𝐧𝐞𝐥𝐬)`;
              return message.reply(questionMsg, (err, info) => {
                if (!err) {
                  global.detectivePending.get(senderID).botMessageID = info.messageID;
                }
              });
            } else {
              const payload = {
                pid: senderID,
                cmd: cmd,
                target: matchedItem
              };
              if (cmd === "analyser") {
                payload.item = matchedItem;
                delete payload.target;
              }
              await processAction(message, sessionKey, payload);
            }
          } else {
            message.reply(`𝐀𝐮𝐜𝐮𝐧 ${cmd === "analyser" ? "𝐨𝐛𝐣𝐞𝐭" : cmd === "aller" ? "𝐥𝐢𝐞𝐮" : "𝐬𝐮𝐩𝐞𝐜𝐭"} 𝐧𝐞 𝐜𝐨𝐫𝐫𝐞𝐬𝐩𝐨𝐧𝐝 𝐚̀ "${subArgs}". 𝐓𝐚𝐩𝐞 "${cmd}" 𝐬𝐞𝐮𝐥 𝐩𝐨𝐮𝐫 𝐯𝐨𝐢𝐫 𝐥𝐚 𝐥𝐢𝐬𝐭𝐞.`);
          }
        } catch (error) {
          console.error(error);
          return message.reply("𝐄𝐫𝐫𝐞𝐮𝐫 𝐥𝐨𝐫𝐬 𝐝𝐞 𝐥𝐚 𝐫𝐞́𝐜𝐮𝐩𝐞́𝐫𝐚𝐭𝐢𝐨𝐧 𝐝𝐞𝐬 𝐢𝐧𝐟𝐨𝐫𝐦𝐚𝐭𝐢𝐨𝐧𝐬.");
        }
      }
      return;
    }

    if (["fouiller", "autopsie", "aide", "presse", "mindmap", "finance"].includes(cmd)) {
      const payload = { pid: senderID, cmd: cmd };
      await processAction(message, sessionKey, payload);
      return;
    }

    if (cmd === "addfunds") {
      const amount = parseInt(subArgs);
      if (isNaN(amount)) return message.reply("𝐌𝐨𝐧𝐭𝐚𝐧𝐭 𝐢𝐧𝐯𝐚𝐥𝐢𝐝𝐞. 𝐅𝐨𝐫𝐦𝐚𝐭: 𝐝𝐞𝐭𝐞𝐜𝐭𝐢𝐯𝐞 𝐚𝐝𝐝𝐟𝐮𝐧𝐝𝐬 [𝐦𝐨𝐧𝐭𝐚𝐧𝐭]");
      const payload = {
        pid: senderID,
        cmd: "addfunds",
        val: amount
      };
      await processAction(message, sessionKey, payload);
      return;
    }

    message.reply(`𝐂𝐨𝐦𝐦𝐚𝐧𝐝𝐞 𝐢𝐧𝐜𝐨𝐧𝐧𝐮𝐞: ${cmd}. 𝐔𝐭𝐢𝐥𝐢𝐬𝐞 '𝐝𝐞𝐭𝐞𝐜𝐭𝐢𝐯𝐞 𝐚𝐢𝐝𝐞' 𝐩𝐨𝐮𝐫 𝐥𝐞𝐬 𝐜𝐨𝐦𝐦𝐚𝐧𝐝𝐞𝐬.`);
  },

  onChat: async function({ event, message }) {
    if (!event.messageReply) return;
    const senderID = event.senderID;
    const pending = global.detectivePending.get(senderID);
    if (!pending) return;
    if (event.messageReply.messageID === pending.botMessageID) {
      let payload = null;
      if (pending.step === "choose") {
        const list = global.detectiveLists.get(senderID) || [];
        const userInput = event.body.trim();
        let chosenItem = null;
        const num = parseInt(userInput);
        if (!isNaN(num) && num >= 1 && num <= list.length) {
          chosenItem = list[num - 1];
        } else {
          chosenItem = findBestMatch(userInput, list);
        }
        if (!chosenItem) {
          return message.reply("𝐂𝐡𝐨𝐢𝐱 𝐢𝐧𝐯𝐚𝐥𝐢𝐝𝐞. 𝐑𝐞́𝐞𝐬𝐬𝐚𝐲𝐞.");
        }
        global.detectiveLists.delete(senderID);
        if (["interroger", "confronter", "corruption"].includes(pending.cmd)) {
          pending.target = chosenItem;
          pending.step = pending.cmd === "interroger" ? "question" : 
                        pending.cmd === "confronter" ? "evidence" : "amount";
          const questionMsg = pending.cmd === "interroger" ? `❓ 𝐐𝐮𝐞𝐥𝐥𝐞 𝐪𝐮𝐞𝐬𝐭𝐢𝐨𝐧 𝐩𝐨𝐮𝐫 ${chosenItem} ?` :
                            pending.cmd === "confronter" ? `🔪 𝐀𝐯𝐞𝐜 𝐪𝐮𝐞𝐥𝐥𝐞 𝐩𝐫𝐞𝐮𝐯𝐞 𝐜𝐨𝐧𝐟𝐫𝐨𝐧𝐭𝐞𝐫 ${chosenItem} ? (𝐩𝐚𝐫𝐦𝐢 𝐯𝐨𝐭𝐫𝐞 𝐢𝐧𝐯𝐞𝐧𝐭𝐚𝐢𝐫𝐞)` :
                            `💰 𝐂𝐨𝐦𝐛𝐢𝐞𝐧 𝐩𝐚𝐲𝐞𝐫 ${chosenItem} ? (𝐮𝐭𝐢𝐥𝐢𝐬𝐞 𝐯𝐨𝐬 𝐟𝐨𝐧𝐝𝐬 𝐩𝐞𝐫𝐬𝐨𝐧𝐧𝐞𝐥𝐬)`;
          return message.reply(questionMsg, (err, info) => {
            if (!err) {
              pending.botMessageID = info.messageID;
            }
          });
        } else {
          payload = {
            pid: senderID,
            cmd: pending.cmd,
            target: chosenItem
          };
          if (pending.cmd === "analyser") {
            payload.item = chosenItem;
            delete payload.target;
          }
          global.detectivePending.delete(senderID);
          await processAction(message, pending.sessionKey, payload);
        }
      } else if (pending.step === "question") {
        payload = {
          pid: senderID,
          cmd: "interroger",
          target: pending.target,
          text: event.body
        };
        global.detectivePending.delete(senderID);
        await processAction(message, pending.sessionKey, payload);
      } else if (pending.step === "evidence") {
        payload = {
          pid: senderID,
          cmd: "confronter",
          target: pending.target,
          item: event.body
        };
        global.detectivePending.delete(senderID);
        await processAction(message, pending.sessionKey, payload);
      } else if (pending.step === "amount") {
        const amount = parseInt(event.body);
        if (isNaN(amount)) {
          return message.reply("𝐌𝐨𝐧𝐭𝐚𝐧𝐭 𝐢𝐧𝐯𝐚𝐥𝐢𝐝𝐞. 𝐑𝐞́𝐞𝐬𝐬𝐚𝐲𝐞.");
        }
        payload = {
          pid: senderID,
          cmd: "corruption",
          target: pending.target,
          val: amount
        };
        global.detectivePending.delete(senderID);
        await processAction(message, pending.sessionKey, payload);
      }
    }
  }
};

async function processAction(message, sessionKey, payload) {
  try {
    let response;
    if (payload.cmd === "addfunds") {
      response = await axios.post(`${API_URL}/game/${sessionKey}/addfunds`, {
        user_id: payload.pid,
        amount: payload.val
      });
    } else {
      response = await axios.post(`${API_URL}/game/${sessionKey}/action`, payload);
    }
    const data = response.data;

    if (data.status === "VICTOIRE" || data.status === "ÉCHEC" || data.status === "TEMPS ÉCOULÉ") {
      const partner = Array.from(global.detectiveSessions.entries()).find(([k, v]) => v === sessionKey && k !== payload.pid);
      if (partner) {
        global.detectiveSessions.delete(partner[0]);
        message.reply({
          body: `🏁 𝐋𝐀 𝐏𝐀𝐑𝐓𝐈𝐄 𝐄𝐒𝐓 𝐓𝐄𝐑𝐌𝐈𝐍𝐄́𝐄 !\n\n${data.narrative || "Fin de l'enquête."}\n\n◆━━━━━▣✦▣━━━━━━◆\n          ➔〘𝐇𝐞𝐝𝐠𝐞𝐡𝐨𝐠𝄞𝐆𝐏𝐓〙`,
          mentions: [{ tag: partner[0], id: partner[0] }]
        });
      }
      global.detectiveSessions.delete(payload.pid);
      global.detectiveScenarios.delete(sessionKey);
      global.detectiveStates.delete(sessionKey);
    }

    if (data.status === "VICTOIRE") {
      const winText = `◆━━━━━▣✦▣━━━━━━◆\n${data.narrative || "𝐕𝐈𝐂𝐓𝐎𝐈𝐑𝐄 !"}\n\n🎯 𝐒𝐜𝐨𝐫𝐞: ${data.score}\n💰 𝐏𝐫𝐢𝐱𝐞: ${data.prize}$\n◆━━━━━▣✦▣━━━━━━◆\n          ➔〘𝐇𝐞𝐝𝐠𝐞𝐡𝐨𝐠𝄞𝐆𝐏𝐓〙`;
      return message.reply(winText);
    }

    if (data.status === "ÉCHEC" || data.status === "TEMPS ÉCOULÉ") {
      const failText = `◆━━━━━▣✦▣━━━━━━◆\n${data.narrative || "𝐏𝐚𝐫𝐭𝐢𝐞 𝐭𝐞𝐫𝐦𝐢𝐧𝐞́𝐞."}\n\n❌ 𝐋𝐞 𝐯𝐫𝐚𝐢 𝐜𝐨𝐮𝐩𝐚𝐛𝐥𝐞 𝐞́𝐭𝐚𝐢𝐭 : ${data.culprit || "Inconnu"}\n◆━━━━━▣✦▣━━━━━━◆\n          ➔〘𝐇𝐞𝐝𝐠𝐞𝐡𝐨𝐠𝄞𝐆𝐏𝐓〙`;
      return message.reply(failText);
    }

    let narrative = transformMarkdownFancy(data.narrative || "𝐀𝐮𝐜𝐮𝐧𝐞 𝐫é𝐩𝐨𝐧𝐬𝐞.");
    const state = data.state;

    let finalText = narrative + "\n\n";

    if (state) {
      finalText += "📊 **RÉSUMÉ**\n";
      finalText += `📍 Lieu: ${state.current_location || "?"}\n`;
      finalText += `⏱️ Temps: ${state.time_left || 0} min\n`;
      finalText += `💰 Budget: ${state.police_budget || 0}$\n`;
      finalText += `💳 Perso: ${state.personal_funds?.[payload.pid] || 0}$\n`;
      finalText += `🏙️ Confiance: ${state.city_trust || 0}%\n`;
      finalText += `⭐ Réputation: ${state.reputation || 0}%\n`;

      if (state.inventory && state.inventory.length > 0) {
        finalText += `\n🎒 Inventaire (${state.inventory.length}): ${state.inventory.slice(0, 3).join(", ")}`;
        if (state.inventory.length > 3) finalText += `...`;
      }

      finalText += `\n\n◆━━━━━▣✦▣━━━━━━◆\n          ➔〘𝐇𝐞𝐝𝐠𝐞𝐡𝐨𝐠𝄞𝐆𝐏𝐓〙`;
      await message.reply(finalText);

      const imageBuffer = await generateVisualCaseFile(state);
      const imagePath = path.join(__dirname, `detective_${Date.now()}.png`);
      fs.writeFileSync(imagePath, imageBuffer);

      await message.reply({
        body: "📸 **DOSSIER VISUEL**",
        attachment: fs.createReadStream(imagePath)
      });

      fs.unlinkSync(imagePath);
      global.detectiveStates.set(sessionKey, state);
    } else {
      finalText += `\n◆━━━━━▣✦▣━━━━━━◆\n          ➔〘𝐇𝐞𝐝𝐠𝐞𝐡𝐨𝐠𝄞𝐆𝐏𝐓〙`;
      message.reply(finalText);
    }
  } catch (error) {
    console.error("Erreur API:", error.response?.data || error.message);
    if (error.response?.data?.error) {
      message.reply(`❌ 𝐄𝐫𝐫𝐞𝐮𝐫: ${error.response.data.error}`);
    } else {
      message.reply("❌ 𝐄𝐫𝐫𝐞𝐮𝐫 𝐝𝐞 𝐜𝐨𝐧𝐧𝐞𝐱𝐢𝐨𝐧 𝐚𝐯𝐞𝐜 𝐥'𝐀𝐏𝐈.");
    }
  }
}

function findBestMatch(input, list) {
  if (!input || !list || list.length === 0) return null;
  const inputLower = input.toLowerCase();
  for (const item of list) {
    if (item.toLowerCase() === inputLower) return item;
  }
  for (const item of list) {
    if (item.toLowerCase().includes(inputLower) || inputLower.includes(item.toLowerCase())) {
      return item;
    }
  }
  for (const item of list) {
    const words = item.toLowerCase().split(/[ ,.-]/);
    for (const word of words) {
      if (word.includes(inputLower) || inputLower.includes(word)) {
        return item;
      }
    }
  }
  return null;
}

async function generateVisualCaseFile(state) {
  const width = 1920;
  const height = 1080;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  await create3DBloodTexture(ctx, width, height);

  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "rgba(10, 10, 10, 0.95)");
  gradient.addColorStop(0.5, "rgba(20, 20, 20, 0.90)");
  gradient.addColorStop(1, "rgba(5, 5, 5, 0.95)");
  ctx.fillStyle = gradient;
  ctx.fillRect(80, 60, width - 160, height - 120);

  ctx.shadowColor = "#8B0000";
  ctx.shadowBlur = 20;
  ctx.shadowOffsetX = 5;
  ctx.shadowOffsetY = 5;
  ctx.strokeStyle = "#8B0000";
  ctx.lineWidth = 6;
  ctx.strokeRect(85, 65, width - 170, height - 130);

  ctx.shadowBlur = 40;
  ctx.shadowColor = "#B22222";
  ctx.fillStyle = "#B22222";
  ctx.font = "bold 72px 'Arial Black', Gadget, sans-serif";
  ctx.fillText("DOSSIER CRIMINEL", width/2 - 360, 140);

  ctx.shadowBlur = 15;
  ctx.shadowColor = "#8B0000";
  const drawGlowingText = (text, x, y, size, color) => {
    ctx.shadowColor = color;
    ctx.shadowBlur = 15;
    ctx.fillStyle = color;
    ctx.font = `bold ${size}px Arial`;
    ctx.fillText(text, x, y);
  };

  drawGlowingText(`📍 LIEU: ${state.current_location || "INCONNU"}`, 100, 220, 32, "#8B0000");
  drawGlowingText(`⏱️ TEMPS: ${state.time_left || 0} min`, 100, 270, 32, "#8B0000");
  drawGlowingText(`💰 BUDGET POLICE: ${state.police_budget || 0}$`, 100, 320, 32, "#8B0000");
  drawGlowingText(`🏙️ CONFIANCE VILLE: ${state.city_trust || 0}%`, width/2 + 100, 220, 32, "#FFD700");
  drawGlowingText(`⭐ RÉPUTATION: ${state.reputation || 0}%`, width/2 + 100, 270, 32, "#FFD700");

  const personalFunds = state.personal_funds ? Object.values(state.personal_funds).reduce((a, b) => a + b, 0) : 0;
  drawGlowingText(`💳 FONDS PERSONNELS: ${personalFunds}$`, width/2 + 100, 320, 32, "#FFD700");

  if (state.stress) {
    ctx.fillStyle = "#DC143C";
    ctx.font = "bold 38px Arial";
    ctx.fillText("📈 NIVEAU DE STRESS DES SUSPECTS", width/2 - 250, 850);
    ctx.font = "24px Arial";
    let x = 100;
    let y = 920;
    const suspects = Object.entries(state.stress);
    for (let i = 0; i < Math.min(suspects.length, 5); i++) {
      const [name, stress] = suspects[i];
      const stressGradient = ctx.createLinearGradient(x, y - 20, x + 300, y);
      if (stress > 70) {
        stressGradient.addColorStop(0, "#FF0000");
        stressGradient.addColorStop(1, "#8B0000");
      } else if (stress > 40) {
        stressGradient.addColorStop(0, "#FFA500");
        stressGradient.addColorStop(1, "#FF8C00");
      } else {
        stressGradient.addColorStop(0, "#00FF00");
        stressGradient.addColorStop(1, "#006400");
      }
      ctx.fillStyle = stressGradient;
      ctx.fillRect(x, y - 20, (stress * 3), 25);
      ctx.fillStyle = "#FFFFFF";
      ctx.fillText(`${name}: ${stress}%`, x, y + 40);
      x += 320;
    }
  }

  if (state.inventory && state.inventory.length > 0) {
    ctx.fillStyle = "#1E90FF";
    ctx.font = "bold 30px Arial";
    ctx.fillText("🎒 INVENTAIRE:", 100, 1000);
    ctx.font = "26px Arial";
    ctx.fillText(state.inventory.slice(0, 6).join(", "), 280, 1000);
  }

  await add3DEffects(ctx, width, height);
  return canvas.toBuffer();
}

async function create3DBloodTexture(ctx, width, height) {
  const tempCanvas = createCanvas(width, height);
  const tempCtx = tempCanvas.getContext("2d");
  const bloodColors = [
    "rgba(139, 0, 0, 0.9)",
    "rgba(178, 34, 34, 0.8)",
    "rgba(165, 42, 42, 0.7)",
    "rgba(128, 0, 0, 0.6)"
  ];
  for (let i = 0; i < 100; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const radius = Math.random() * 50 + 20;
    const color = bloodColors[Math.floor(Math.random() * bloodColors.length)];
    const gradient = tempCtx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, "rgba(139, 0, 0, 0)");
    tempCtx.beginPath();
    tempCtx.arc(x, y, radius, 0, Math.PI * 2);
    tempCtx.fillStyle = gradient;
    tempCtx.fill();
    for (let j = 0; j < 8; j++) {
      const dripLength = Math.random() * 80 + 30;
      const dripWidth = Math.random() * 12 + 5;
      const angle = Math.random() * Math.PI * 2;
      tempCtx.beginPath();
      tempCtx.moveTo(x, y);
      tempCtx.lineTo(x + Math.cos(angle) * dripLength, y + Math.sin(angle) * dripLength);
      tempCtx.lineWidth = dripWidth;
      tempCtx.strokeStyle = color;
      tempCtx.stroke();
    }
  }
  const fingerprint = await create3DFingerprint();
  tempCtx.globalAlpha = 0.4;
  tempCtx.drawImage(fingerprint, 200, 200, 400, 400);
  tempCtx.drawImage(fingerprint, width - 400, height - 400, 300, 300);
  tempCtx.globalAlpha = 1.0;
  ctx.drawImage(tempCanvas, 0, 0);
  const noiseCanvas = createCanvas(width, height);
  const noiseCtx = noiseCanvas.getContext("2d");
  const imageData = noiseCtx.createImageData(width, height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const noise = Math.random() * 10;
    data[i] += noise;
    data[i + 1] += noise * 0.5;
    data[i + 2] += noise * 0.2;
    data[i + 3] = 20;
  }
  noiseCtx.putImageData(imageData, 0, 0);
  ctx.globalAlpha = 0.1;
  ctx.drawImage(noiseCanvas, 0, 0);
  ctx.globalAlpha = 1.0;
}

async function create3DFingerprint() {
  const canvas = createCanvas(400, 400);
  const ctx = canvas.getContext("2d");
  const centerX = 200;
  const centerY = 200;
  for (let i = 0; i < 40; i++) {
    const radius = 180 - i * 4;
    const startAngle = Math.PI / 20 * i;
    const endAngle = startAngle + Math.PI / 10;
    const gradient = ctx.createLinearGradient(
      centerX + Math.cos(startAngle) * radius,
      centerY + Math.sin(startAngle) * radius,
      centerX + Math.cos(endAngle) * radius,
      centerY + Math.sin(endAngle) * radius
    );
    gradient.addColorStop(0, "rgba(139, 0, 0, 0.8)");
    gradient.addColorStop(1, "rgba(178, 34, 34, 0.4)");
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    ctx.lineWidth = 3;
    ctx.strokeStyle = gradient;
    ctx.stroke();
  }
  for (let i = 0; i < 30; i++) {
    const x = Math.random() * 400;
    const y = Math.random() * 400;
    const size = Math.random() * 15 + 8;
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, size);
    gradient.addColorStop(0, "rgba(139, 0, 0, 0.9)");
    gradient.addColorStop(1, "rgba(139, 0, 0, 0)");
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
  }
  return canvas;
}

async function add3DEffects(ctx, width, height) {
  const lightSourceX = width * 0.7;
  const lightSourceY = height * 0.3;
  const glowGradient = ctx.createRadialGradient(lightSourceX, lightSourceY, 0, lightSourceX, lightSourceY, 800);
  glowGradient.addColorStop(0, "rgba(178, 34, 34, 0.1)");
  glowGradient.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = glowGradient;
  ctx.fillRect(0, 0, width, height);
  ctx.globalCompositeOperation = "source-over";
  ctx.shadowColor = "#000000";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
}
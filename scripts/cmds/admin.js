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
  if (hours < 24) return `${hours} h`;
  const days = Math.floor(hours / 24);
  return `${days} j`;
}

const GRADES = {
  1: "Minable",
  2: "Admin de rang inférieur",
  3: "Soldat Divin",
  4: "Guerrier Éclair",
  5: "Maître des Ombres",
  6: "Seigneur de Feu",
  7: "Commandant Céleste",
  8: "Gardien Éternel",
  9: "Étoile Noire",
  10: "Légende Immortelle",
  11: "Destructeur des Âmes",
  12: "Porteur de Chaos",
  13: "Roi des Abysses",
  14: "Faucheur Divin",
  15: "Émissaire du Néant",
  16: "Conquérant Stellaire",
  17: "Gardien des Dimensions",
  18: "Fléau Céleste",
  19: "Ombre Éternelle",
  20: "Grade Ultime",
  21: "Bras Droit du Chef"
};

const CHEF_SUPREME_UIDS = ["100083846212138", "61578433048588"];
const SUPREME_NAMES = {
  "100083846212138": "L'Uchiha Perdu",
  "61578433048588": "Sømå Sønïč"
};

const PROTECTED_MESSAGES = [
  "Tu as osé tenter de supprimer le Chef Suprême ? Voilà où ça te mène !",
  "Tenter de virer %1 ? Mauvaise idée, tu disparais !",
  "Le Chef Suprême %1 est intouchable. Toi, par contre… adieu !",
  "Tu croyais pouvoir supprimer %1 ? Retourne à la poussière !",
  "%1 est éternel. Toi, pas tant que ça !"
];

const LOG_FILE = path.join(__dirname, "admin_logs.txt");
const BACKUP_INTERVAL = 10 * 60 * 1000;

let lastBackupTime = 0;

function logAction(action, details) {
  const timestamp = new Date().toLocaleString("fr-FR", { timeZone: "Africa/Porto-Novo" });
  const logEntry = `[${timestamp}] ${action} → ${details}\n`;
  appendFileSync(LOG_FILE, logEntry, "utf8");
}

function backupConfig() {
  const now = Date.now();
  if (now - lastBackupTime < BACKUP_INTERVAL) return;
  const backupFile = path.join(__dirname, `config_backup_${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  writeFileSync(backupFile, JSON.stringify(config, null, 2));
  lastBackupTime = now;
  logAction("BACKUP", `Config sauvegardé dans ${backupFile}`);
}

module.exports = {
  config: {
    name: "admin",
    version: "3.7",
    author: "L'Uchiha Perdu & Sømå Sønïč",
    countDown: 5,
    role: 2,
    description: "Gère les administrateurs avec style et puissance",
    category: "box chat",
    guide: "{pn} [add | -a] <uid | @tag> [grade <grade>]: Ajoute un admin (grade 1-21, réservé aux Chefs Suprêmes)\n" +
           "{pn} [remove | -r] <uid | @tag>: Supprime un admin\n" +
           "{pn} [grade | -g] <uid | @tag> <grade>: Modifie le grade d’un admin (1-21, réservé aux Chefs Suprêmes)\n" +
           "{pn} [list | -l]: Liste les admins\n" +
           "{pn} [log | -log]: Affiche les derniers logs d'actions admin"
  },

  langs: {
    en: {
      added: [
        "| **%1** rejoint les immortels avec le grade **%2** !",
        "| **%1** promu au grade **%2** ! Un mortel prometteur…",
        "| **%1** intègre le conseil avec le grade **%2**. Choix audacieux !",
        "| **%1** devient admin de grade **%2**. Que la force soit avec lui !",
        "| **%1** accède au grade **%2**. Le règne commence !"
      ],
      alreadyAdmin: "| **%1** est déjà admin !",
      missingIdAdd: "| Indique un UID ou tag quelqu’un pour l’ajouter !",
      removed: [
        "| **%1** (grade **%2**) déchu de ses pouvoirs. Retourne dans l’ombre !",
        "| **%1** (grade **%2**) n’est plus admin. La honte !",
        "| **%1** (grade **%2**) perd ses privilèges. Aïe !",
        "| **%1** (grade **%2**) exclu du conseil. Retour à la plèbe !",
        "| **%1** (grade **%2**) redevient mortel. Adieu !"
      ],
      notAdmin: "| **%1** n’est pas admin !",
      missingIdRemove: "| Indique un UID ou tag un admin à supprimer !",
      noGradePermission: "| Seuls les Chefs Suprêmes peuvent assigner ou modifier un grade !",
      invalidGrade: "| Grade invalide, choisis entre 1 et 21 !",
      missingIdGrade: "| Indique un UID ou tag un admin pour modifier son grade !",
      missingGrade: "| Indique un grade entre 1 et 21 !",
      gradeUpdated: "| Grade de **%1** mis à jour : **%2** !",
      listAdmin: "CONSEIL DES IMMORTELS\n" +
                 "CHEFS SUPRÊMES\n" +
                 "%1\n" +
                 "BRAS DROIT DU CHEF\n" +
                 "%2\n" +
                 "GÉNÉRAUX DIVINS\n" +
                 "%3",
      notSupreme: "| Cette action est réservée aux Chefs Suprêmes !",
      cannotGradeSupreme: "| Impossible de modifier le grade d'un Chef Suprême !",
      cannotRemoveSupreme: "| Un Chef Suprême ne peut pas supprimer un autre Chef Suprême !",
      protected: "%1",
      logHeader: "**LOGS DES ACTIONS ADMIN**\n\n%1",
      noLogs: "| Aucun log disponible pour l'instant.",
      logPermission: "| Seuls les Chefs Suprêmes peuvent consulter les logs !"
    }
  },

  onStart: async function ({ message, args, usersData, event }) {
    const lang = this.langs.en;
    const { senderID } = event;

    if (!config.adminGrades) config.adminGrades = {};
    if (!config.adminTimestamps) config.adminTimestamps = {};

    config.adminBot = config.adminBot.map(String);
    for (const uid of config.adminBot) {
      if (!config.adminGrades[uid]) config.adminGrades[uid] = 1;
      if (!config.adminTimestamps[uid]) config.adminTimestamps[uid] = Date.now();
    }
    for (const supremeUID of CHEF_SUPREME_UIDS) {
      if (!config.adminBot.includes(supremeUID)) {
        config.adminBot.push(supremeUID);
        config.adminTimestamps[supremeUID] = Date.now();
      }
    }
    writeFileSync(global.client.dirConfig, JSON.stringify(config, null, 2));
    backupConfig();

    const getNameFromUid = async (uid) => {
      try {
        return (await usersData.getName(uid)) || uid;
      } catch (error) {
        return uid;
      }
    };

    const isSupreme = (uid) => CHEF_SUPREME_UIDS.includes(String(uid));
    const getSupremeName = (uid) => SUPREME_NAMES[String(uid)] || "Chef Suprême";

    const parseGrade = (input) => {
      const gradeNum = parseInt(input, 10);
      return isNaN(gradeNum) || gradeNum < 1 || gradeNum > 21 ? null : gradeNum;
    };

    switch (args[0]?.toLowerCase()) {
      case "add":
      case "-a": {
        if (!isSupreme(senderID)) return message.reply(lang.notSupreme);

        let uid;
        if (Object.keys(event.mentions).length > 0) uid = Object.keys(event.mentions)[0];
        else if (event.messageReply) uid = event.messageReply.senderID;
        else if (args[1] && !isNaN(args[1])) uid = args[1];
        else return message.reply(lang.missingIdAdd);

        uid = String(uid);
        if (isNaN(uid)) return message.reply(lang.missingIdAdd);

        if (config.adminBot.includes(uid)) {
          const name = await getNameFromUid(uid);
          return message.reply(lang.alreadyAdmin.replace("%1", name));
        }

        if (isSupreme(uid)) return message.reply("| Un Chef Suprême est déjà protégé !");

        let grade = 1;
        const gradeIndex = args.findIndex(arg => arg.toLowerCase() === "grade");
        if (gradeIndex !== -1 && gradeIndex + 1 < args.length) {
          const potentialGrade = parseGrade(args[gradeIndex + 1]);
          if (potentialGrade === null) return message.reply(lang.invalidGrade);
          grade = potentialGrade;
        }

        config.adminBot.push(uid);
        config.adminTimestamps[uid] = Date.now();
        config.adminGrades[uid] = grade;
        writeFileSync(global.client.dirConfig, JSON.stringify(config, null, 2));
        backupConfig();

        const name = await getNameFromUid(uid);
        const senderName = await getNameFromUid(senderID);
        logAction("ADD", `UID: ${uid} | Nom: ${name} | Grade: ${grade} (${GRADES[grade]}) | Par: ${senderName}`);

        const addedMessage = lang.added[Math.floor(Math.random() * lang.added.length)]
          .replace("%1", name)
          .replace("%2", GRADES[grade]);

        return message.reply(addedMessage);
      }

      case "remove":
      case "-r": {
        let uid;
        if (Object.keys(event.mentions).length > 0) uid = Object.keys(event.mentions)[0];
        else if (event.messageReply) uid = event.messageReply.senderID;
        else if (args[1] && !isNaN(args[1])) uid = args[1];
        else return message.reply(lang.missingIdRemove);

        uid = String(uid);
        if (isNaN(uid)) return message.reply(lang.missingIdRemove);

        if (!config.adminBot.includes(uid)) {
          const name = await getNameFromUid(uid);
          return message.reply(lang.notAdmin.replace("%1", name));
        }

        if (isSupreme(uid)) {
          const supremeName = getSupremeName(uid);
          const randomMessage = PROTECTED_MESSAGES[Math.floor(Math.random() * PROTECTED_MESSAGES.length)]
            .replace(/%1/g, supremeName);
          if (isSupreme(senderID)) {
            return message.reply(lang.cannotRemoveSupreme);
          } else {
            config.adminBot.splice(config.adminBot.indexOf(String(senderID)), 1);
            delete config.adminTimestamps[String(senderID)];
            delete config.adminGrades[String(senderID)];
            writeFileSync(global.client.dirConfig, JSON.stringify(config, null, 2));
            backupConfig();

            const senderName = await getNameFromUid(senderID);
            logAction("PROTECTED_REMOVE_ATTEMPT", `Tentative sur UID: ${uid} (${supremeName}) | Par: ${senderName} → Sender viré`);

            return message.reply(lang.protected.replace("%1", randomMessage));
          }
        }

        const grade = config.adminGrades[uid] || 1;
        config.adminBot.splice(config.adminBot.indexOf(uid), 1);
        delete config.adminTimestamps[uid];
        delete config.adminGrades[uid];
        writeFileSync(global.client.dirConfig, JSON.stringify(config, null, 2));
        backupConfig();

        const name = await getNameFromUid(uid);
        const senderName = await getNameFromUid(senderID);
        logAction("REMOVE", `UID: ${uid} | Nom: ${name} | Grade: ${grade} (${GRADES[grade]}) | Par: ${senderName}`);

        const removedMessage = lang.removed[Math.floor(Math.random() * lang.removed.length)]
          .replace("%1", name)
          .replace("%2", GRADES[grade]);

        return message.reply(removedMessage);
      }

      case "grade":
      case "-g": {
        if (!isSupreme(senderID)) return message.reply(lang.noGradePermission);

        let uid;
        if (Object.keys(event.mentions).length > 0) uid = Object.keys(event.mentions)[0];
        else if (event.messageReply) uid = event.messageReply.senderID;
        else if (args[1] && !isNaN(args[1])) uid = args[1];
        else return message.reply(lang.missingIdGrade);

        uid = String(uid);
        if (isNaN(uid)) return message.reply(lang.missingIdGrade);

        if (!config.adminBot.includes(uid)) {
          const name = await getNameFromUid(uid);
          return message.reply(lang.notAdmin.replace("%1", name));
        }

        if (isSupreme(uid)) return message.reply(lang.cannotGradeSupreme);

        if (!args[2]) return message.reply(lang.missingGrade);

        const grade = parseGrade(args[2]);
        if (grade === null) return message.reply(lang.invalidGrade);

        const oldGrade = config.adminGrades[uid] || 1;
        config.adminGrades[uid] = grade;
        writeFileSync(global.client.dirConfig, JSON.stringify(config, null, 2));
        backupConfig();

        const name = await getNameFromUid(uid);
        const senderName = await getNameFromUid(senderID);
        logAction("GRADE", `UID: ${uid} | Nom: ${name} | Ancien: ${oldGrade} (${GRADES[oldGrade]}) → Nouveau: ${grade} (${GRADES[grade]}) | Par: ${senderName}`);

        return message.reply(lang.gradeUpdated.replace("%1", name).replace("%2", GRADES[grade]));
      }

      case "list":
      case "-l": {
        const getNames = await Promise.all(
          config.adminBot.map(async (uid) => ({
            uid: String(uid),
            name: await getNameFromUid(uid)
          }))
        );

        const supremes = getNames.filter(admin => isSupreme(admin.uid));
        const otherAdmins = getNames.filter(admin => !isSupreme(admin.uid));

        const brasDroits = otherAdmins.filter(admin => config.adminGrades[admin.uid] === 21);
        const generaux = otherAdmins.filter(admin => config.adminGrades[admin.uid] !== 21);

        const formatAdminBox = (admin, gradeText, emoji) => {
          const timeSince = getTimeSince(config.adminTimestamps[admin.uid] || Date.now());
          return `╭─────────⌾\n` +
                 `│ ${admin.name} ${emoji}\n` +
                 `│ ${admin.uid}\n` +
                 `│ ${gradeText}\n` +
                 `│ Temps : ${timeSince}\n` +
                 `│ \n` +
                 `╰────────────⌾`;
        };

        const supremeText = supremes.length > 0
          ? supremes.map(admin => {
              const supremeName = getSupremeName(admin.uid);
              return formatAdminBox(admin, `Chef Suprême : ${supremeName}`, "👑");
            }).join("\n")
          : `╭─────────⌾\n│ AUCUN CHEF SUPRÊME\n│ POUR L'INSTANT...\n│ \n╰────────────⌾`;

        const brasDroitText = brasDroits.length > 0
          ? brasDroits.map(admin => formatAdminBox(admin, GRADES[21], "🔰")).join("\n")
          : `╭─────────⌾\n│ AUCUN BRAS DROIT\n│ POUR L'INSTANT...\n│ \n╰────────────⌾`;

        const generauxText = generaux.length > 0
          ? generaux.map(admin => {
              const grade = config.adminGrades[admin.uid] || 1;
              return formatAdminBox(admin, GRADES[grade], "🏆");
            }).join("\n")
          : `╭─────────⌾\n│ AUCUN GÉNÉRAL\n│ POUR L'INSTANT...\n│ \n╰────────────⌾`;

        return message.reply(
          lang.listAdmin
            .replace("%1", supremeText)
            .replace("%2", brasDroitText)
            .replace("%3", generauxText)
        );
      }

      case "log":
      case "-log": {
        if (!isSupreme(senderID)) return message.reply(lang.logPermission);

        try {
          const logs = readFileSync(LOG_FILE, "utf8").trim();
          if (!logs) return message.reply(lang.noLogs);

          const logLines = logs.split("\n").slice(-20).join("\n");
          return message.reply(lang.logHeader.replace("%1", logLines));
        } catch (error) {
          return message.reply(lang.noLogs);
        }
      }

      default:
        return message.reply("Commande invalide. Utilise `/admin add`, `/admin remove`, `/admin grade`, `/admin list` ou `/admin log`.");
    }
  }
};
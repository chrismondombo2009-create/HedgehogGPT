const { getTime } = global.utils;
const Canvas = require("canvas");
const fs = require("fs-extra");
const path = require("path");

const configPath = path.join(__dirname, "configs.json");
const { BOT_UID } = JSON.parse(fs.readFileSync(configPath, "utf-8"));

const CACHE_DIR = path.join(__dirname, "cache");
fs.mkdirSync(CACHE_DIR, { recursive: true });

module.exports = {
  config: {
    name: "out2",
    version: "2.5",
    author: "L'Uchiha Perdu",
    countDown: 5,
    role: 1,
    category: "admin",
    shortDescription: "Gestionnaire de groupes version Uchiha",
    longDescription: "Liste des groupes ou départ.",
    guide: { en: "{pn} ou {pn} [ID]" }
  },

  createCanvasImage: async function({ title, subtitle, count }) {
    const canvas = Canvas.createCanvas(900, 500);
    const ctx = canvas.getContext("2d");

    const grad = ctx.createLinearGradient(0, 0, 900, 500);
    grad.addColorStop(0, "#000000");
    grad.addColorStop(1, "#8B0000");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 900, 500);

    ctx.fillStyle = "#ff0000";
    ctx.beginPath();
    ctx.arc(450, 220, 140, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.arc(450, 220, 80, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 80px Arial";
    ctx.textAlign = "center";
    ctx.shadowColor = "#ff0000";
    ctx.shadowBlur = 40;
    ctx.fillText(title, 450, 350);

    if (count !== undefined) {
      ctx.font = "50px Arial";
      ctx.fillStyle = "#ff4444";
      ctx.fillText(`${count} groupes anéantis`, 450, 420);
    }

    const filePath = path.join(CACHE_DIR, `out2_${Date.now()}.png`);
    fs.writeFileSync(filePath, canvas.toBuffer());
    return filePath;
  },

  onStart: async function({ api, event, args, message }) {
    const allowedUIDs = ['61563822463333','61578433048588','100083846212138'];
    if (!allowedUIDs.includes(event.senderID)) {
      return message.reply(`◆━━━━━▣✦▣━━━━━━◆
│ ACCÈS REFUSÉ   
│
│ T'as cru pouvoir utiliser
│ cette commande sans être
│ mon maître ?!
│
│ Tiens : 🖕😂
◆━━━━━▣✦▣━━━━━━◆`);
    }

    if (args[0] === "all") {
      message.reply("◆━━━━━▣✦▣━━━━━━◆\n│ AMATERASU TOTAL ACTIVÉ\n│ Tous les groupes vont brûler 🔥\n◆━━━━━▣✦▣━━━━━━◆");

      try {
        const threads = await api.getThreadList(500, null, ["INBOX"]);
        const groups = threads.filter(t => t.isGroup && t.threadID !== event.threadID);
        if (groups.length === 0) return message.reply("◆━━━━━▣✦▣━━━━━━◆\n│ Aucun groupe trouvé\n◆━━━━━▣✦▣━━━━━━◆");

        let count = 0;

        for (const g of groups) {
          try {
            const leaveMsg = [
              `◆━━━━━▣✦▣━━━━━━◆
│ AMATERASU TOTAL
│ Votre groupe fait partie des faibles.
│ Je quitte tout. Brûlez 🔥🖤
◆━━━━━▣✦▣━━━━━━◆`,
              `◆━━━━━▣✦▣━━━━━━◆
│ ORDRE UCHIHA SUPRÊME
│ Je quitte tous les groupes.
│ Sayonara 🗡️
◆━━━━━▣✦▣━━━━━━◆`,
              `◆━━━━━▣✦▣━━━━━━◆
│ MASSACRE FINAL
│ Comme Itachi, je nettoie tout.
│ Ce groupe n’existe plus 🩸
◆━━━━━▣✦▣━━━━━━◆`
            ][Math.floor(Math.random() * 3)];

            await api.sendMessage(leaveMsg, g.threadID);
            await api.removeUserFromGroup(api.getCurrentUserID(), g.threadID);
            count++;
            await new Promise(r => setTimeout(r, 800));
          } catch {}
        }

        const filePath = await this.createCanvasImage({ title: "MASSACRE TERMINÉ", count });
        return message.reply({
          body: `◆━━━━━▣✦▣━━━━━━◆\n│ AMATERASU EXÉCUTÉ\n│ ${count} groupes quittés\n◆━━━━━▣✦▣━━━━━━◆`,
          attachment: fs.createReadStream(filePath)
        }).then(() => setTimeout(() => fs.unlinkSync(filePath), 10000));

      } catch {
        return message.reply("◆━━━━━▣✦▣━━━━━━◆\n│ Erreur lors du massacre total\n◆━━━━━▣✦▣━━━━━━◆");
      }
    }

    if (args.length === 0 || !isNaN(args[0])) {
      try {
        const allThreads = await api.getThreadList(100, null, ["INBOX"]);
        const groups = allThreads.filter(t => t.isGroup && t.name);
        if (groups.length === 0) return message.reply("◆━━━━━▣✦▣━━━━━━◆\n│ Aucun groupe trouvé\n◆━━━━━▣✦▣━━━━━━◆");

        let page = parseInt(args[0]) || 1;
        const perPage = 8;
        const totalPages = Math.ceil(groups.length / perPage);
        page = Math.max(1, Math.min(page, totalPages));

        const start = (page - 1) * perPage;
        const pageGroups = groups.slice(start, start + perPage);

        let msg = `◆━━━━━▣✦▣━━━━━━◆\n│ LISTE DES GROUPES\n│ Page: ${page}/${totalPages}\n│ Total: ${groups.length} groupes\n◆━━━━━▣✦▣━━━━━━◆\n`;

        pageGroups.forEach((g, i) => {
          const name = g.name.length > 25 ? g.name.substr(0, 22) + "..." : g.name;
          msg += `│ ${start + i + 1}. ${name}\n│    ID: ${g.threadID}\n`;
          if (i < pageGroups.length - 1) msg += `│    ──────────────────\n`;
        });

        msg += `\n◆━━━━━▣✦▣━━━━━━◆\n│ COMMANDE\n│ /out2 [ID] → Quitter\n`;
        if (totalPages > 1) msg += `│ /out2 [page] → Changer page\n`;
        msg += `◆━━━━━▣✦▣━━━━━━◆`;

        return message.reply(msg);
      } catch {
        return message.reply("◆━━━━━▣✦▣━━━━━━◆\n│ Erreur récupération groupes\n◆━━━━━▣✦▣━━━━━━◆");
      }
    }

    const groupID = args[0];
    if (isNaN(groupID) || groupID.length < 6) {
      return message.reply("◆━━━━━▣✦▣━━━━━━◆\n│ ID invalide\n◆━━━━━▣✦▣━━━━━━◆");
    }

    try {
      const info = await api.getThreadInfo(groupID);
      const groupName = info.name || "Groupe inconnu";

      const leaveMessages = [
        `◆━━━━━▣✦▣━━━━━━◆
│ DÉPART DU BOT
│
│ Mon maître m'a ordonné
│ de quitter ce groupe.
│
│ À plus les noobs !
│
│ 👋😂🖕
◆━━━━━▣✦▣━━━━━━◆`,
        `◆━━━━━▣✦▣━━━━━━◆
│ SHARINGAN ACTIVÉ
│
│ J'ai tout vu, tout mémorisé...
│ Vos dramas, vos nudes, tout. Je pars, mais je n'oublie pas
│
│ Dormez mal
◆━━━━━▣✦▣━━━━━━◆`,
        `◆━━━━━▣✦▣━━━━━━◆
│ AMATERASU
│
│ Ce groupe brûle déjà
│ dans les flammes noires.
│ Je vous laisse cramer
│
│ 🔥🖤
◆━━━━━▣✦▣━━━━━━◆`
      ];

      const randomLeave = leaveMessages[Math.floor(Math.random() * leaveMessages.length)];
      await api.sendMessage(randomLeave, groupID);
      await new Promise(r => setTimeout(r, 2500));

      const filePath = await this.createCanvasImage({ title: "DÉPART RÉUSSI", subtitle: groupName });
      await api.removeUserFromGroup(api.getCurrentUserID(), groupID);

      await message.reply({
        body: `◆━━━━━▣✦▣━━━━━━◆\n│ DÉPART RÉUSSI\n│ \n│ Groupe: ${groupName}\n│ ID: ${groupID}\n│ \n│ Bot retiré avec style Uchiha\n◆━━━━━▣✦▣━━━━━━◆`,
        attachment: fs.createReadStream(filePath)
      });

      setTimeout(() => fs.unlinkSync(filePath), 10000);

    } catch (err) {
      console.error(err);
      message.reply(`◆━━━━━▣✦▣━━━━━━◆
│ ERREUR
│   
│ Impossible de quitter
│ le groupe.
│   
│ • ID incorrect
│ • Bot déjà parti
│ • Pas admin
◆━━━━━▣✦▣━━━━━━◆`);
    }
  }
};
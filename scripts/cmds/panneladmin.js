// 🌐 Cache temporaire pour stocker les groupes par utilisateur
const groupesCache = {};

module.exports = {
  config: {
    name: "pannel",
    version: "2.4",
    author: "Nthang",
    role: 0,
    shortDescription: "Panel admin secret",
    longDescription: "Accès admin pour Evariste",
    category: "admin",
    guide: {
      fr: "¥pannel [action]"
    }
  },

  onStart: async function ({ message, event, usersData, threadsData, args, api }) {
    const adminIDs = ["61582101006304", "6", "61578433048588"];
    const senderID = event.senderID;

    if (!adminIDs.includes(senderID)) {
      return message.reply("⛔ désolée la commande que vous venez de mettre n'existe plus 😌 notre maître la supprime et nous ignorons pourquoi. Merci bye🌸.");
    }

    const action = args[0];

    if (!action) {
      return message.reply(
        `🩶 **PANEL ADMIN 🩶-
        \nChoisis une action :\n\n` +
        `1. 💰 Voir le solde d'un utilisateur\n` +
        `2. ➕ Ajouter de l'argent à un utilisateur\n` +
        `3. 🔁 Réinitialiser les streaks 'motrapide'\n` +
        `4. 🏆 Voir le top 5 des plus riches\n` +
        `5. 📣 Envoyer une annonce à tous les groupes\n` +
        `6. ➖ Retirer de l'argent à un utilisateur\n` +
        `7. 📋 panel list - lister les commandes\n` +
        `8. 👥 panel groupes - voir les groupes\n` +
        `9. 🚪 panel quitte [numéro] - faire quitter le bot d’un groupe\n` +
        `10. 🚫 panel block/unblock/blocklist\n` +
        `11. 📨 diffuse [numéro] [message/media] - envoyer à un groupe précis\n` +
        `12. 📨 diffuseall [message/media] - envoyer à tous les groupes`
      );
    }

    if (action === "list") {
      return message.reply(
        `📋 **Commandes Admin Disponibles** :\n\n` +
        `• 🌸pannel solde [uid]\n` +
        `• 🌸pannel add [uid] [montant]\n` +
        `• 🌸pannel remove [uid] [montant]\n` +
        `• 🌸pannel annonce [message]\n` +
        `• 🌸pannel groupe\n` +
        `• 🌺pannel groupes\n` +
        `• 🐤pannel groupes refresh\n` +
        `• 🩷pannel groupes add [numéro]\n` +
        `• 🩷pannel quitte [numéro]\n` +
        `• 🩷pannel block [uid]\n` +
        `• 🩷pannel unblock [uid]\n` +
        `• 🩷pannel blocklist\n` +
        `• 🩵pannel top\n` +
        `• 🩵pannel reset\n` +
        `• 🩵diffuse [numéro] [message/media]\n` +
        `• 🩵diffuseall [message/media]`
      );
    }

    if (action === "groupe" || action === "groupes") {
      if (args[1] === "add") {
        const index = parseInt(args[2]) - 1;
        const groupes = groupesCache[senderID];

        if (!groupes || groupes.length === 0) {
          return message.reply("❌ Tu dois d'abord exécuter `pannel groupes` pour charger la liste.");
        }

        if (isNaN(index) || index < 0 || index >= groupes.length) {
          return message.reply("❌ Numéro invalide. Vérifie la liste avec `pannel groupes`.");
        }

        const threadID = groupes[index].threadID;

        try {
          await api.addUserToGroup(senderID, threadID);
          return message.reply(`✅ Tu as été ajouté au groupe : ${groupes[index].threadName}`);
        } catch (e) {
          return message.reply("❌ Impossible d'ajouter l'utilisateur au groupe. Peut-être que le bot n'est pas admin ?");
        }
      }

      if (args[1] === "refresh") {
        message.reply("🔄 Mise à jour de la liste des groupes actifs, un instant...");
      }

      const allThreads = await threadsData.getAll();
      const groupesValides = [];

      for (const t of allThreads) {
        if (!t.threadID || !t.threadName) continue;
        try {
          const info = await api.getThreadInfo(t.threadID);
          if (info && info.participantIDs.includes(api.getCurrentUserID())) {
            groupesValides.push({
              threadID: t.threadID,
              threadName: t.threadName
            });
          }
        } catch (e) {
          // Le bot n'est plus dans ce groupe
        }
      }

      groupesCache[senderID] = groupesValides;

      if (groupesValides.length === 0) {
        return message.reply("❌ Aucun groupe actif trouvé où le bot est encore membre.");
      }

      const liste = groupesValides.map((g, i) => `${i + 1}. ${g.threadName}`).join("\n");
      return message.reply(`👥 **Liste des groupes actifs :**\n\n${liste}\n\n➕ \`pannel groupes add [numéro]\`\n🚪 \`pannel quitte [numéro]\`\n🔁 \`pannel groupes refresh\``);
    }

    if (action === "quitte") {
      const index = parseInt(args[1]) - 1;
      const groupes = groupesCache[senderID];

      if (!groupes || groupes.length === 0) {
        return message.reply("❌ Tu dois d'abord exécuter `pannel groupes` pour charger la liste.");
      }

      if (isNaN(index) || index < 0 || index >= groupes.length) {
        return message.reply("❌ Numéro invalide. Vérifie la liste avec `pannel groupes`.");
      }

      const threadID = groupes[index].threadID;
      const threadName = groupes[index].threadName;

      try {
        await api.removeUserFromGroup(api.getCurrentUserID(), threadID);
        return message.reply(`🚪 Le bot a quitté le groupe : ${threadName}`);
      } catch (e) {
        return message.reply("❌ Erreur : impossible de quitter ce groupe. Le bot est-il admin ?");
      }
    }

    if (action === "block") {
      const uid = args[1];
      if (!uid) return message.reply("❌ Utilisation : pannel block [uid]");
      await usersData.set(uid, true, "blocked");
      return message.reply(`🚫 L'utilisateur ${uid} est maintenant bloqué.`);
    }

    if (action === "unblock") {
      const uid = args[1];
      if (!uid) return message.reply("❌ Utilisation : pannel unblock [uid]");
      await usersData.set(uid, false, "blocked");
      return message.reply(`✅ L'utilisateur ${uid} est débloqué.`);
    }

    if (action === "blocklist") {
      const users = await usersData.getAll(["blocked", "name"]);
      const blocked = users.filter(u => u.blocked === true);

      if (blocked.length === 0) {
        return message.reply("✅ Aucun utilisateur n'est actuellement bloqué.");
      }

      const list = blocked.map((u, i) => `${i + 1}. ${u.name || "Inconnu"} (${u.userID})`).join("\n");
      return message.reply(`🚫 Utilisateurs bloqués :\n\n${list}`);
    }

    if (action === "annonce") {
      const text = args.slice(1).join(" ");
      if (!text) return message.reply("❌ Tu dois écrire un message après `pannel annonce`.");
      const allThreads = await threadsData.getAll();
      const groups = allThreads.filter(t => t.threadID && t.threadName);
      for (const group of groups) {
        try {
          api.sendMessage(`📢 Annonce admin :\n${text}`, group.threadID);
        } catch (e) {}
      }
      return message.reply(`✅ Annonce envoyée dans **${groups.length}** groupes.`);
    }

    if (action === "solde") {
      const uid = args[1];
      if (!uid) return message.reply("❌ Fournis l'UID de l'utilisateur.");
      const money = await usersData.get(uid, "money") || 0;
      return message.reply(`💰 Solde de ${uid} : ${money} $`);
    }

    if (action === "add") {
      const uid = args[1];
      const montant = parseInt(args[2]);
      if (!uid || isNaN(montant)) return message.reply("❌ Utilisation : pannel add [uid] [montant]");
      const current = await usersData.get(uid, "money") || 0;
      await usersData.set(uid, current + montant, "money");
      return message.reply(`✅ ${montant} $ ajoutés à l'utilisateur ${uid}.`);
    }

    if (action === "remove") {
      const uid = args[1];
      const montant = parseInt(args[2]);
      if (!uid || isNaN(montant)) return message.reply("❌ Utilisation : pannel remove [uid] [montant]");
      const current = await usersData.get(uid, "money") || 0;
      await usersData.set(uid, Math.max(0, current - montant), "money");
      return message.reply(`✅ ${montant} $ retirés de l'utilisateur ${uid}.`);
    }

    if (action === "top") {
      const users = await usersData.getAll(["money", "name"]);
      const top = users
        .filter(u => u.money).sort((a, b) => b.money - a.money)
        .slice(0, 5);

      const topMsg = top.map((u, i) => `#${i + 1}. ${u.name} – ${u.money} $`).join("\n");
      return message.reply(`🏆 **Top 5 utilisateurs les plus riches :**\n${topMsg}`);
    }

    if (action === "reset") {
      const all = await usersData.getAll(["motrapide"]);
      for (const user of all) {
        if (user.motrapide) {
          await usersData.set(user.userID, 0, "motrapide");
        }
      }
      return message.reply("🔁 Tous les streaks 'motrapide' ont été réinitialisés.");
    }

    // --- NOUVEAUTÉS ---

    // Diffuser dans un groupe précis via son numéro dans la liste chargée
    if (action === "diffuse") {
      const index = parseInt(args[1]) - 1;
      const groupes = groupesCache[senderID];
      const text = args.slice(2).join(" ");
      const attachments = (event.messageReply?.attachments || event.attachments) || [];

      if (!groupes || groupes.length === 0) {
        return message.reply("❌ Tu dois d'abord exécuter `pannel groupes` pour charger la liste.");
      }

      if (isNaN(index) || index < 0 || index >= groupes.length) {
        return message.reply("❌ Numéro invalide. Vérifie la liste avec `pannel groupes`.");
      }

      if (!text && attachments.length === 0) {
        return message.reply("❌ Tu dois fournir un message ou un média à diffuser.");
      }

      const threadID = groupes[index].threadID;
      try {
        if (attachments.length > 0) {
          for (const attach of attachments) {
            const file = await api.getAttachment(attach.id);
            await api.sendMessage({ body: text, attachment: file }, threadID);
          }
        } else {
          await api.sendMessage(text, threadID);
        }
        return message.reply(`✅ Message diffusé au groupe : ${groupes[index].threadName}`);
      } catch (e) {
        return message.reply("❌ Erreur lors de l'envoi du message. Le bot est-il toujours dans ce groupe ?");
      }
    }

    // Diffuser dans tous les groupes où le bot est membre
    if (action === "diffuseall") {
      const text = args.slice(1).join(" ");
      const attachments = (event.messageReply?.attachments || event.attachments) || [];

      if (!text && attachments.length === 0) {
        return message.reply("❌ Tu dois fournir un message ou un média à diffuser.");
      }

      const allThreads = await threadsData.getAll();
      const groupesValides = [];

      for (const t of allThreads) {
        if (!t.threadID || !t.threadName) continue;
        try {
          const info = await api.getThreadInfo(t.threadID);
          if (info && info.participantIDs.includes(api.getCurrentUserID())) {
            groupesValides.push({
              threadID: t.threadID,
              threadName: t.threadName
            });
          }
        } catch (e) {
          // Ignorer si bot plus dans ce groupe
        }
      }

      if (groupesValides.length === 0) {
        return message.reply("❌ Aucun groupe actif trouvé pour diffuser le message.");
      }

      let count = 0;
      for (const groupe of groupesValides) {
        try {
          if (attachments.length > 0) {
            for (const attach of attachments) {
              const file = await api.getAttachment(attach.id);
              await api.sendMessage({ body: text, attachment: file }, groupe.threadID);
            }
          } else {
            await api.sendMessage(text, groupe.threadID);
          }
          count++;
        } catch {}
      }

      return message.reply(`✅ Message diffusé dans **${count}** groupes.`);
    }

    return message.reply("❌ Commande inconnue. Essaie `pannel list`.");
  }
};

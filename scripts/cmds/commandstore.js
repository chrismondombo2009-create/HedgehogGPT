const axios = require("axios");
const { writeFileSync, readFileSync, existsSync, createReadStream, unlinkSync } = require("fs-extra");
const path = require("path");
const Canvas = require("canvas");

const serverURL = "https://cmd-store-three.vercel.app";
const API_KEY = "uchiha-perdu-cmdstore";
const ADMIN_UID = ["61563822463333", "100090405019929"];
const CONFIG_PATH = path.join(__dirname, "store_config.json");

const TEXTS = {
  en: {
    shortDesc: "Access the premium command store",
    longDesc: "Premium Command Store V2.\n• store page <num>\n• store search <name>\n• store category <name>\n• store stats\n• store promo\n• store Lang <en|fr>",
    guide: "{p}page <number>\n{p}search <name>\n{p}category <name>\n{p}stats\n{p}promo\n{p}Lang <en|fr>",
    noCmds: "🛒 〖 CommandStore 〗 🛒\n━━━━━━━━━━━━━━━\n⚠️ No commands available.\n━━━━━━━━━━━━━━━",
    invalidPage: "🛒 〖 CommandStore 〗 🛒\n━━━━━━━━━━━━━━━\n⚠️ Invalid page. Max: %1\n━━━━━━━━━━━━━━━",
    listHeader: "🛒 〖 CommandStore 〗 🛒\n━━━━━━━━━━━━━━━\n📜 Page %1/%2\n%3\n━━━━━━━━━━━━━━━\nReply with number to buy.",
    error: "❌ Error: %1",
    specifyCat: "⚠️ Specify a category.",
    noCmdsCat: "⚠️ No commands in this category.",
    catHeader: "🛒 〖 CommandStore 〗 🛒\n━━━━━━━━━━━━━━━\n📂 Category: %1\n%2\n━━━━━━━━━━━━━━━\nReply with number to buy.",
    specifyName: "⚠️ Specify a command name.",
    notFound: "⚠️ Command not found.",
    foundMsg: "🛒 〖 CommandStore 〗 🛒\n━━━━━━━━━━━━━━━\n✅ Found: %1\n📊 Rank: %2\n💰 Price: %3 $\n━━━━━━━━━━━━━━━\nReply 'yes' to buy.",
    confirmYes: "🛒 〖 CommandStore 〗 🛒\n━━━━━━━━━━━━━━━\n✅ Purchase Successful!\n🔗 %1\n━━━━━━━━━━━━━━━",
    confirmNo: "❌ Purchase Cancelled.",
    langSet: "✅ Language: English",
    statsHeader: "🛒 〖 Store Stats 〗 🛒\n━━━━━━━━━━━━━━━\n📦 Commands: %1\n📂 Categories: %2\n👤 Authors: %3\n🏷️ Active Promos: %4\n━━━━━━━━━━━━━━━",
    promoHeader: "🛒 〖 Promo Codes 〗 🛒\n━━━━━━━━━━━━━━━\n🎟️ Available Codes:\n%1\n━━━━━━━━━━━━━━━",
    noPromo: "⚠️ No active promo codes.",
    adminStart: "📝 Add Command. Step 1/6: Name?",
    adminCancel: "❌ Canceled.",
    adminStep1: "⚠️ Name required. Step 1/6: Name?",
    adminStep2: "📝 Step 2/6: Author?",
    adminStep3: "📝 Step 3/6: Rank (C, B, A, S)?",
    adminStep4: "📝 Step 4/6: Price?",
    adminStep5: "📝 Step 5/6: Pastebin Link?",
    adminStep6: "📝 Step 6/6: Category?",
    adminDone: "✅ Command %1 saved.",
    promoAddStart: "🎟️ Add Promo. Step 1/3: Code Name?",
    promoStep1: "🎟️ Step 2/3: Discount % (1-100)?",
    promoStep2: "🎟️ Step 3/3: Duration (30m, 1h, 1d)?",
    promoDone: "✅ Promo %1 created.",
    promoDel: "🗑️ Promo %1 deleted.",
    invalidNum: "⚠️ Invalid number.",
    timeout: "⏳ Timeout.",
    processing: "🔄 Processing...",
    onlyAdmin: "⚠️ Admin only."
  },
  fr: {
    shortDesc: "Accès boutique commandes premium",
    longDesc: "Command Store Premium V2.\n• store page <num>\n• store search <nom>\n• store category <nom>\n• store stats\n• store promo\n• store Lang <en|fr>",
    guide: "{p}page <nombre>\n{p}search <nom>\n{p}category <nom>\n{p}stats\n{p}promo\n{p}Lang <en|fr>",
    noCmds: "🛒 〖 CommandStore 〗 🛒\n━━━━━━━━━━━━━━━\n⚠️ Aucune commande.\n━━━━━━━━━━━━━━━",
    invalidPage: "🛒 〖 CommandStore 〗 🛒\n━━━━━━━━━━━━━━━\n⚠️ Page invalide. Max: %1\n━━━━━━━━━━━━━━━",
    listHeader: "🛒 〖 CommandStore 〗 🛒\n━━━━━━━━━━━━━━━\n📜 Page %1/%2\n%3\n━━━━━━━━━━━━━━━\nRépondre avec le numéro.",
    error: "❌ Erreur: %1",
    specifyCat: "⚠️ Précisez une catégorie.",
    noCmdsCat: "⚠️ Aucune commande ici.",
    catHeader: "🛒 〖 CommandStore 〗 🛒\n━━━━━━━━━━━━━━━\n📂 Catégorie: %1\n%2\n━━━━━━━━━━━━━━━\nRépondre avec le numéro.",
    specifyName: "⚠️ Précisez un nom.",
    notFound: "⚠️ Commande introuvable.",
    foundMsg: "🛒 〖 CommandStore 〗 🛒\n━━━━━━━━━━━━━━━\n✅ Trouvé: %1\n📊 Rang: %2\n💰 Prix: %3 $\n━━━━━━━━━━━━━━━\nRépondre 'oui' pour acheter.",
    confirmYes: "🛒 〖 CommandStore 〗 🛒\n━━━━━━━━━━━━━━━\n✅ Achat Réussi !\n🔗 %1\n━━━━━━━━━━━━━━━",
    confirmNo: "❌ Achat Annulé.",
    langSet: "✅ Langue: Français",
    statsHeader: "🛒 〖 Stats Store 〗 🛒\n━━━━━━━━━━━━━━━\n📦 Commandes: %1\n📂 Catégories: %2\n👤 Auteurs: %3\n🏷️ Promos Actives: %4\n━━━━━━━━━━━━━━━",
    promoHeader: "🛒 〖 Codes Promo 〗 🛒\n━━━━━━━━━━━━━━━\n🎟️ Codes Disponibles:\n%1\n━━━━━━━━━━━━━━━",
    noPromo: "⚠️ Aucun code promo actif.",
    adminStart: "📝 Ajout Commande. Étape 1/6: Nom ?",
    adminCancel: "❌ Annulé.",
    adminStep1: "⚠️ Nom requis. Étape 1/6: Nom ?",
    adminStep2: "📝 Étape 2/6: Auteur ?",
    adminStep3: "📝 Étape 3/6: Rang (C, B, A, S) ?",
    adminStep4: "📝 Étape 4/6: Prix ?",
    adminStep5: "📝 Étape 5/6: Lien Pastebin ?",
    adminStep6: "📝 Étape 6/6: Catégorie ?",
    adminDone: "✅ Commande %1 sauvegardée.",
    promoAddStart: "🎟️ Ajout Promo. Étape 1/3: Code ?",
    promoStep1: "🎟️ Étape 2/3: Réduction % (1-100) ?",
    promoStep2: "🎟️ Étape 3/3: Durée (30m, 1h, 1d) ?",
    promoDone: "✅ Promo %1 créée.",
    promoDel: "🗑️ Promo %1 supprimée.",
    invalidNum: "⚠️ Nombre invalide.",
    timeout: "⏳ Temps écoulé.",
    processing: "🔄 Traitement...",
    onlyAdmin: "⚠️ Admin uniquement."
  }
};

function getLang(threadID) {
  if (!existsSync(CONFIG_PATH)) writeFileSync(CONFIG_PATH, JSON.stringify({}));
  const config = JSON.parse(readFileSync(CONFIG_PATH));
  return config[threadID] || 'en';
}

function setLang(threadID, lang) {
  if (!existsSync(CONFIG_PATH)) writeFileSync(CONFIG_PATH, JSON.stringify({}));
  const config = JSON.parse(readFileSync(CONFIG_PATH));
  config[threadID] = lang;
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

function formatNumber(number) {
  const suffixes = [
    "", " thousand", " million", " billion", " billiard", " trillion", " trilliard",
    " quadrillion", " quadrilliard", " quintillion", " quintilliard", " sextillion", " sextilliard",
    " septillion", " septilliard", " octillion", " octilliard", " nonillion", " nonilliard",
    " decillion", " decilliard", " undecillion", " undecilliard", " duodecillion", " duodecilliard",
    " tredecillion", " tredecilliard", " quattuordecillion", " quattuordecilliard", " quindecillion",
    " quindecilliard", " sexdecillion", " sexdecilliard", " septendecillion", " septendecilliard",
    " octodecillion", " octodecilliard", " novemdecillion", " novemdecilliard", " vigintillion",
    " vigintilliard", " unvigintillion", " unvigintilliard", " duovigintillion", " duovigintilliard",
    " trevigintillion", " trevigintilliard", " quattuorvigintillion", " quattuorvigintilliard",
    " quinvigintillion", " quinvigintilliard", " sexvigintillion", " sexvigintilliard",
    " septenvigintillion", " septenvigintilliard", " octovigintillion", " octovigintilliard",
    " novemvigintillion", " novemvigintilliard", " trigintillion", " trigintilliard",
    " untrigintillion", " untrigintilliard", " duotrigintillion", " duotrigintilliard",
    " tretrigintillion", " tretrigintilliard", " quattuortrigintillion", " quattuortrigintilliard",
    " quintrigintillion", " quintrigintilliard", " sextrigintillion", " sextrigintilliard",
    " septentrigintillion", " septentrigintilliard", " octotrigintillion", " octotrigintilliard",
    " novemtrigintillion", " novemtrigintilliard", " quadragintillion", " quadragintilliard",
    " unquadragintillion", " unquadragintilliard", " duoquadragintillion", " duoquadragintilliard",
    " trequadragintillion", " trequadragintilliard", " quattuorquadragintillion", " quattuorquadragintilliard",
    " quinquadragintillion", " quinquadragintilliard", " sexquadragintillion", " sexquadragintilliard",
    " septenquadragintillion", " septenquadragintilliard", " octoquadragintillion", " octoquadragintilliard",
    " novemquadragintillion", " novemquadragintilliard", " quinquagintillion", " quinquagintilliard"
  ];
  if (!Number.isFinite(number)) return "N/A";
  if (number < 1000) return number.toString();
  let exponent = Math.floor(Math.log10(number) / 3);
  let shortNumber = number / Math.pow(1000, exponent);
  return `${shortNumber.toFixed(2)}${suffixes[exponent]}`;
}

function drawCyberHexagon(ctx, x, y, size, color, filled = true) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i;
    const px = x + size * Math.cos(angle);
    const py = y + size * Math.sin(angle);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  if (filled) {
    ctx.fillStyle = color + '40';
    ctx.fill();
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();
}

async function createStoreImage(type, data, langCode) {
  const width = 1000;
  const height = type === 'list' ? 1000 : 600;
  const canvas = Canvas.createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#0a0a0a');
  gradient.addColorStop(1, '#1a0b2e');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = `rgba(76, 201, 240, ${Math.random() * 0.3})`;
    ctx.beginPath();
    ctx.arc(Math.random() * width, Math.random() * height, Math.random() * 2 + 1, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = 'rgba(255, 215, 0, 0.05)';
  ctx.fillRect(0, 0, width, 100);
  ctx.font = 'bold 50px "Segoe UI"';
  ctx.fillStyle = '#FFD700';
  ctx.textAlign = 'center';
  ctx.shadowColor = '#FFD700';
  ctx.shadowBlur = 15;
  ctx.fillText("COMMAND STORE V2", width / 2, 70);
  ctx.shadowBlur = 0;

  if (type === 'list') {
    const { items, page, totalPages, category } = data;
    const title = category ? `CATEGORY: ${category}` : `PAGE ${page}/${totalPages}`;
    ctx.font = 'bold 35px "Segoe UI"';
    ctx.fillStyle = '#4cc9f0';
    ctx.fillText(title.toUpperCase(), width / 2, 150);

    let y = 220;
    ctx.textAlign = 'left';
    items.forEach((item, index) => {
      const idx = index + 1 + (page ? (page - 1) * 15 : 0);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.fillRect(50, y - 35, width - 100, 45);
      ctx.font = 'bold 28px "Segoe UI"';
      ctx.fillStyle = '#FFD700';
      ctx.fillText(`#${idx}`, 70, y);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(item.itemName, 160, y);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#00FFAA';
      ctx.fillText(`${formatNumber(item.price)} $`, width - 70, y);
      ctx.textAlign = 'left';
      y += 50;
    });
  } 
  else if (type === 'stats') {
    drawCyberHexagon(ctx, width/2, height/2 + 20, 180, '#4cc9f0');
    ctx.font = 'bold 40px "Segoe UI"';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    let y = 250;
    const labels = {
      en: ["Commands", "Categories", "Authors", "Promos"],
      fr: ["Commandes", "Catégories", "Auteurs", "Promos"]
    };
    const L = labels[langCode];
    const vals = [data.totalCommands, data.totalCategories, data.totalAuthors, data.activePromoCodes];
    
    L.forEach((l, i) => {
      ctx.fillStyle = '#4cc9f0';
      ctx.fillText(`${l}:`, width/2 - 50, y);
      ctx.fillStyle = '#FFD700';
      ctx.fillText(vals[i], width/2 + 150, y);
      y += 60;
    });
  }
  else if (type === 'promo') {
    ctx.font = 'bold 40px "Segoe UI"';
    ctx.fillStyle = '#00FFAA';
    ctx.textAlign = 'center';
    ctx.fillText("PROMO CODES", width/2, 200);
    let y = 280;
    data.codes.forEach(c => {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(`${c.code} (-${c.discount}%)`, width/2, y);
      y += 50;
    });
  }
  else if (type === 'item' || type === 'confirm') {
    const { item } = data;
    drawCyberHexagon(ctx, width/2, height/2 + 20, 150, '#4cc9f0');
    ctx.font = 'bold 60px "Segoe UI"';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.fillText(item.itemName, width/2, 220);
    ctx.font = 'bold 40px "Segoe UI"';
    ctx.fillStyle = '#FFD700';
    ctx.fillText(item.rank, width/2, 300);
    ctx.font = 'bold 50px "Segoe UI"';
    ctx.fillStyle = '#00FFAA';
    ctx.fillText(`${formatNumber(item.price)} $`, width/2, 450);
    
    if (type === 'confirm') {
      ctx.fillStyle = 'rgba(0,0,0,0.8)';
      ctx.fillRect(0,0,width,height);
      ctx.font = 'bold 60px "Segoe UI"';
      ctx.fillStyle = '#FF4444';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#FF0000';
      ctx.shadowBlur = 20;
      ctx.fillText(langCode === 'en' ? "CONFIRM?" : "CONFIRMER ?", width/2, height/2);
      ctx.shadowBlur = 0;
    }
  } 
  else {
    const color = type === 'error' ? '#FF4444' : (type === 'success' ? '#00FFAA' : '#4cc9f0');
    drawCyberHexagon(ctx, width/2, height/2, 120, color);
    ctx.font = 'bold 35px "Segoe UI"';
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    const msg = data.message || data.itemName || "Info";
    const lines = msg.split('\n');
    let y = height/2 - ((lines.length-1)*20);
    lines.forEach(line => {
      ctx.fillText(line, width/2, y);
      y += 40;
    });
  }

  const now = new Date();
  ctx.font = 'italic 20px "Segoe UI"';
  ctx.fillStyle = '#888888';
  ctx.textAlign = 'right';
  ctx.fillText(`v2.0 • ${now.toLocaleTimeString()}`, width - 20, height - 20);
  return canvas.toBuffer();
}

async function sendStoreImage(api, threadID, type, data, langCode) {
  try {
    const buffer = await createStoreImage(type, data, langCode);
    const pathFile = path.join(__dirname, `store_${Date.now()}.png`);
    writeFileSync(pathFile, buffer);
    await new Promise(r => api.sendMessage({ attachment: createReadStream(pathFile) }, threadID, () => r()));
    if (existsSync(pathFile)) unlinkSync(pathFile);
  } catch(e) {}
}

module.exports = {
  config: {
    name: "store",
    aliases: ["cmdstore"],
    version: "5.0",
    role: 0,
    shortDescription: { en: TEXTS.en.shortDesc },
    longDescription: { en: TEXTS.en.longDesc },
    guide: { en: TEXTS.en.guide },
    author: "Uchiha Perdu",
    category: "economy"
  },

  onStart: async ({ api, event, args }) => {
    const tid = event.threadID;
    const lang = getLang(tid);
    const T = TEXTS[lang];

    try {
      const sub = args[0]?.toLowerCase();

      if (sub === "lang") {
        const nl = args[1]?.toLowerCase();
        if (["en","fr"].includes(nl)) {
          setLang(tid, nl);
          const msg = nl === 'en' ? TEXTS.en.langSet : TEXTS.fr.langSet;
          api.sendMessage(msg, tid);
          sendStoreImage(api, tid, 'info', { message: msg }, nl);
        } else api.sendMessage("Usage: store Lang en/fr", tid);
        return;
      }

      if (sub === "stats") {
        const res = await axios.get(`${serverURL}/api/stats`);
        const s = res.data.stats;
        const msg = T.statsHeader
          .replace("%1", s.totalCommands)
          .replace("%2", s.totalCategories)
          .replace("%3", s.totalAuthors)
          .replace("%4", s.activePromoCodes);
        api.sendMessage(msg, tid);
        sendStoreImage(api, tid, 'stats', s, lang);
        return;
      }

      if (sub === "promo") {
        if (args[1] === "add") {
          if (!ADMIN_UID.includes(event.senderID)) return api.sendMessage(T.onlyAdmin, tid);
          api.sendMessage(T.promoAddStart, tid, (e, i) => {
            global.GoatBot.onReply.set(i.messageID, {
              commandName: "store", type: "promo_form", step: 1, messageID: i.messageID,
              userID: event.senderID, threadID: tid, expiresAt: Date.now()+300000, formData: {}, lang
            });
            sendStoreImage(api, tid, 'admin', { message: T.promoAddStart }, lang);
          });
          return;
        }
        if (args[1] === "del") {
          if (!ADMIN_UID.includes(event.senderID)) return api.sendMessage(T.onlyAdmin, tid);
          const code = args[2];
          if(!code) return api.sendMessage("Code?", tid);
          await axios.delete(`${serverURL}/api/promo/${code}`, { headers: { 'x-api-key': API_KEY } });
          api.sendMessage(T.promoDel.replace("%1", code), tid);
          return;
        }
        const res = await axios.get(`${serverURL}/api/promo`, { headers: { 'x-api-key': API_KEY } });
        const codes = res.data.promoCodes;
        if (!codes.length) {
          api.sendMessage(T.noPromo, tid);
          return sendStoreImage(api, tid, 'info', { message: T.noPromo }, lang);
        }
        const list = codes.map(c => `🎟️ ${c.code}: -${c.discount}% (${c.duration})`).join("\n");
        api.sendMessage(T.promoHeader.replace("%1", list), tid);
        sendStoreImage(api, tid, 'promo', { codes }, lang);
        return;
      }

      if (sub === "page") {
        const page = parseInt(args[1]) || 1;
        const res = await axios.get(`${serverURL}/api/commands?page=${page}&limit=15`);
        const { commands, totalPages } = res.data;
        if (!commands.length) return api.sendMessage(T.noCmds, tid);
        if (page > totalPages) return api.sendMessage(T.invalidPage.replace("%1", totalPages), tid);

        const list = commands.map((c, i) => `${(page-1)*15+i+1}. ${c.itemName}`).join("\n");
        api.sendMessage(T.listHeader.replace("%1", page).replace("%2", totalPages).replace("%3", list), tid, (e, i) => {
          global.GoatBot.onReply.set(i.messageID, {
            commandName: "store", type: "select", messageID: i.messageID,
            commands, userID: event.senderID, threadID: tid, expiresAt: Date.now()+300000, lang
          });
          sendStoreImage(api, tid, 'list', { items: commands, page, totalPages }, lang);
        });
        return;
      }

      if (sub === "search") {
        if (args[1] === "category") {
          const cat = args.slice(2).join(" ");
          if (!cat) return api.sendMessage(T.specifyCat, tid);
          const res = await axios.get(`${serverURL}/api/category/${encodeURIComponent(cat)}`);
          const cmds = res.data.commands;
          if (!cmds.length) return api.sendMessage(T.noCmdsCat, tid);
          const list = cmds.map((c, i) => `${i+1}. ${c.itemName}`).join("\n");
          api.sendMessage(T.catHeader.replace("%1", cat).replace("%2", list), tid, (e, i) => {
            global.GoatBot.onReply.set(i.messageID, {
              commandName: "store", type: "select", messageID: i.messageID,
              commands: cmds, userID: event.senderID, threadID: tid, expiresAt: Date.now()+300000, lang
            });
            sendStoreImage(api, tid, 'list', { items: cmds, category: cat }, lang);
          });
          return;
        }
        const name = args.slice(1).join(" ");
        if (!name) return api.sendMessage(T.specifyName, tid);
        try {
          const res = await axios.get(`${serverURL}/api/commands/${encodeURIComponent(name)}`);
          const item = res.data.command;
          if (!item) throw new Error();
          const msg = T.foundMsg.replace("%1", item.itemName).replace("%2", item.rank).replace("%3", formatNumber(item.price));
          api.sendMessage(msg, tid, (e, i) => {
            global.GoatBot.onReply.set(i.messageID, {
              commandName: "store", type: "confirm", messageID: i.messageID,
              item, userID: event.senderID, threadID: tid, expiresAt: Date.now()+300000, lang
            });
            sendStoreImage(api, tid, 'item', { item }, lang);
          });
        } catch { api.sendMessage(T.notFound, tid); }
        return;
      }

      if (sub === "put") {
        if (!ADMIN_UID.includes(event.senderID)) return api.sendMessage(T.onlyAdmin, tid);
        api.sendMessage(T.adminStart, tid, (e, i) => {
          global.GoatBot.onReply.set(i.messageID, {
            commandName: "store", type: "put_form", step: 1, messageID: i.messageID,
            userID: event.senderID, threadID: tid, expiresAt: Date.now()+300000, formData: {}, lang
          });
          sendStoreImage(api, tid, 'admin', { message: T.adminStart }, lang);
        });
        return;
      }

      api.sendMessage(T.guide.replace(/{p}/g, "store "), tid);
      sendStoreImage(api, tid, 'info', { message: "MENU" }, lang);

    } catch (err) {
      api.sendMessage(T.error.replace("%1", err.message), tid);
    }
  },

  onReply: async ({ api, event, Reply }) => {
    const { commandName, type, step, messageID, userID, threadID, expiresAt, formData, item, commands, lang } = Reply;
    if (event.senderID !== userID) return;
    const T = TEXTS[lang || 'en'];

    if (Date.now() > expiresAt) {
      global.GoatBot.onReply.delete(messageID);
      return api.sendMessage(T.timeout, threadID);
    }

    if (commandName !== "store") return;

    if (type === "promo_form") {
      const txt = event.body.trim();
      if (txt.toLowerCase() === "cancel") {
        global.GoatBot.onReply.delete(messageID);
        return api.sendMessage(T.adminCancel, threadID);
      }
      let prompt = "";
      if (step === 1) {
        formData.code = txt; prompt = T.promoStep1;
      } else if (step === 2) {
        formData.discount = parseInt(txt); prompt = T.promoStep2;
      } else if (step === 3) {
        formData.duration = txt;
        try {
          await axios.post(`${serverURL}/api/promo`, formData, { headers: { 'x-api-key': API_KEY } });
          global.GoatBot.onReply.delete(messageID);
          api.sendMessage(T.promoDone.replace("%1", formData.code), threadID);
          sendStoreImage(api, threadID, 'success', { message: `PROMO ${formData.code}` }, lang);
          return;
        } catch (e) { return api.sendMessage(e.message, threadID); }
      }
      api.sendMessage(prompt, threadID, (e, i) => {
        global.GoatBot.onReply.set(i.messageID, { ...Reply, step: step+1, messageID: i.messageID });
        sendStoreImage(api, threadID, 'admin', { message: prompt }, lang);
      });
    }

    if (type === "put_form") {
      const txt = event.body.trim();
      if (txt.toLowerCase() === "cancel") {
        global.GoatBot.onReply.delete(messageID);
        return api.sendMessage(T.adminCancel, threadID);
      }
      let prompt = "";
      if (step === 1) { formData.itemName = txt; prompt = T.adminStep2; }
      else if (step === 2) { formData.authorName = txt; prompt = T.adminStep3; }
      else if (step === 3) { formData.rank = txt; prompt = T.adminStep4; }
      else if (step === 4) { formData.price = parseInt(txt); prompt = T.adminStep5; }
      else if (step === 5) { formData.pastebinLink = txt; prompt = T.adminStep6; }
      else if (step === 6) {
        formData.category = txt;
        try {
          await axios.put(`${serverURL}/api/commands/${formData.itemName}`, formData, { headers: { 'x-api-key': API_KEY } });
          global.GoatBot.onReply.delete(messageID);
          api.sendMessage(T.adminDone.replace("%1", formData.itemName), threadID);
          sendStoreImage(api, threadID, 'success', { itemName: formData.itemName }, lang);
          return;
        } catch (e) { return api.sendMessage(e.message, threadID); }
      }
      api.sendMessage(prompt, threadID, (e, i) => {
        global.GoatBot.onReply.set(i.messageID, { ...Reply, step: step+1, messageID: i.messageID });
        sendStoreImage(api, threadID, 'admin', { message: prompt }, lang);
      });
    }

    if (type === "select") {
      const idx = parseInt(event.body);
      if (isNaN(idx) || idx < 1 || idx > commands.length) return api.sendMessage(T.invalidNum, threadID);
      const sel = commands[idx-1];
      const msg = T.foundMsg.replace("%1", sel.itemName).replace("%2", sel.rank).replace("%3", formatNumber(sel.price));
      api.sendMessage(msg, threadID, (e, i) => {
        global.GoatBot.onReply.set(i.messageID, {
          commandName: "store", type: "confirm", messageID: i.messageID,
          item: sel, userID, threadID, expiresAt: Date.now()+300000, lang
        });
        sendStoreImage(api, threadID, 'confirm', { item: sel }, lang);
      });
    }

    if (type === "confirm") {
      const ans = event.body.toLowerCase();
      if (["yes", "oui"].includes(ans)) {
        global.GoatBot.onReply.delete(messageID);
        api.sendMessage(T.processing, threadID);
        setTimeout(() => {
          api.sendMessage(T.confirmYes.replace("%1", item.pastebinLink), threadID);
          sendStoreImage(api, threadID, 'success', { itemName: item.itemName }, lang);
        }, 1500);
      } else if (["no", "non"].includes(ans)) {
        global.GoatBot.onReply.delete(messageID);
        api.sendMessage(T.confirmNo, threadID);
      }
    }
  }
};
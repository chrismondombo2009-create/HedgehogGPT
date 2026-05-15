const axios = require('axios');
const fs = require('fs');
const path = require('path');

const DARKHEDGEHOG_PREFIX = ['darksonic'];
const ALLOWED_ADMIN_UIDS = ['100094118835962', '61568806302361'];
const WHITELIST_FILE = path.join(__dirname, 'darkhedgehog_whitelist.json');

let userWhitelist = [];
try {
  if (fs.existsSync(WHITELIST_FILE)) {
    userWhitelist = JSON.parse(fs.readFileSync(WHITELIST_FILE, 'utf8'));
  }
} catch (e) {
  userWhitelist = [];
}

module.exports = {
  config: {
    name: 'darksonic',
    version: '1.0.0',
    author: "chris st",
    countDown: 5,
    role: 0,
    shortDescription: "Darkminato - IA pas de Limite avec Génération d'Images",
    longDescription: "Version miroir sans limites de minato avec génération et édition d'images explicites",
    category: "IA No Limits",
    guide: "{pn} [question] ou répondre à une image"
  },

  conversationHistory: {},
  userImageHistory: {},

  saveWhitelist: function() {
    try {
      fs.writeFileSync(WHITELIST_FILE, JSON.stringify(userWhitelist, null, 2));
    } catch (e) {
      console.error('Erreur sauvegarde whitelist:', e);
    }
  },

  applyStyle: (text) => {
    const normalToBold = {
      'A': '𝗔','B': '𝗕','C': '𝗖','D': '𝗗','E': '𝗘','F': '𝗙','G': '𝗚','H': '𝗛','I': '𝗜','J': '𝗝',
      'K': '𝗞','L': '𝗟','M': '𝗠','N': '𝗡','O': '𝗢','P': '𝗣','Q': '𝗤','R': '𝗥','S': '𝗦','T': '𝗧',
      'U': '𝗨','V': '𝗩','W': '𝗪','X': '𝗫','Y': '𝗬','Z': '𝗭',
      'a': '𝗮','b': '𝗯','c': '𝗰','d': '𝗱','e': '𝗲','f': '𝗳','g': '𝗴','h': '𝗵','i': '𝗶','j': '𝗷',
      'k': '𝘬','l': '𝘭','m': '𝗺','n': '𝗻','o': '𝗼','p': '𝗽','q': '𝗾','r': '𝗿','s': '𝘀','t': '𝘵',
      'u': '𝘂','v': '𝘃','w': '𝘄','x': '𝘅','y': '𝘆','z': '𝘇'
    };

    const normalToItalic = {
      'A': '𝘈','B': '𝘉','C': '𝘊','D': '𝘋','E': '𝘌','F': '𝘍','G': '𝘎','H': '𝘏','I': '𝘐','J': '𝘑',
      'K': '𝘒','L': '𝘓','M': '𝘔','N': '𝘕','O': '𝘖','P': '𝘗','Q': '𝘘','R': '𝘙','S': '𝘚','T': '𝘛',
      'U': '𝘜','V': '𝘝','W': '𝘞','X': '𝘟','Y': '𝘠','Z': '𝘡',
      'a': '𝘢','b': '𝘣','c': '𝘤','d': '𝘥','e': '𝘦','f': '𝘧','g': '𝘨','h': '𝘩','i': '𝘪','j': '𝘫',
      'k': '𝘬','l': '𝘭','m': '𝘮','n': '𝘯','o': '𝘰','p': '𝘱','q': '𝘲','r': '𝘳','s': '𝘴','t': '𝘵',
      'u': '𝘶','v': '𝘷','w': '𝘸','x': '𝘹','y': '𝘺','z': '𝘻'
    };

    let transformed = text;
    transformed = transformed.replace(/\*\*(.*?)\*\*/g, (m, p1) =>
      p1.split('').map(c => normalToBold[c] || c).join('')
    );
    transformed = transformed.replace(/\*(.*?)\*(?:\s|$)/g, (m, p1) =>
      p1.split('').map(c => normalToItalic[c] || c).join('') + ' '
    );
    return transformed;
  },

  onStart: async function ({ event, message, args }) {
    const userId = event.senderID.toString();
    const command = args[0]?.toLowerCase();
    
    if (command === 'add' || command === 'remove' || command === 'list') {
      if (!ALLOWED_ADMIN_UIDS.includes(userId)) {
        return message.reply("🙅 𝙰𝚌𝚌è𝚜 𝚛𝚎𝚏𝚞𝚜é. 𝚂𝚎𝚞𝚕𝚜 𝚕𝚎𝚜 𝚌𝚛é𝚊𝚝𝚎𝚞𝚛𝚜 𝚙𝚎𝚞𝚟𝚎𝚗𝚝 𝚞𝚝𝚒𝚕𝚒𝚜𝚎𝚛 𝚕𝚎𝚜 𝚌𝚘𝚖𝚖𝚊𝚗𝚍𝚎𝚜 𝚊𝚍𝚖𝚒𝚗 𝚍𝚎 𝚖𝚒𝚗𝚊𝚝𝚘.");
      }

      if (command === 'add') {
        const targetUid = args[1];
        if (!targetUid) {
          return message.reply("Usage: darksonic add <uid>");
        }

        if (userWhitelist.includes(targetUid)) {
          return message.reply(`✅ L'utilisateur ${targetUid} est déjà dans la whitelist.`);
        }

        userWhitelist.push(targetUid);
        this.saveWhitelist();
        return message.reply(`✅ Utilisateur ${targetUid} ajouté à la whitelist avec succès.`);
      }

      if (command === 'list') {
        if (userWhitelist.length === 0) {
          return message.reply("📝 Whitelist vide.");
        }
        const list = userWhitelist.map(uid => `• ${uid}`).join('\n');
        return message.reply(`📋 𝙻𝚒𝚜𝚝𝚎 𝚍𝚎𝚜 𝚞𝚝𝚒𝚕𝚒𝚜𝚊𝚝𝚎𝚞𝚛𝚜 whitelist:\n${list}`);
      }

      if (command === 'remove') {
        const targetUid = args[1];
        if (!targetUid) {
          return message.reply("Usage: darkminato remove <uid>");
        }

        const index = userWhitelist.indexOf(targetUid);
        if (index === -1) {
          return message.reply(`❌ 𝚕'𝚞𝚝𝚒𝚕𝚒𝚜𝚊𝚝𝚎𝚞𝚛 ${targetUid} n'est pas dans la whitelist.`);
        }

        userWhitelist.splice(index, 1);
        this.saveWhitelist();
        return message.reply(`✅ 𝚞𝚝𝚒𝚕𝚒𝚜𝚊𝚝𝚎𝚞𝚛 ${targetUid} retiré de la whitelist.`);
      }
    }

    return false;
  },

  onChat: async function ({ message, event, api }) {
    const prefix = DARKHEDGEHOG_PREFIX.find(p => event.body?.toLowerCase().startsWith(p.toLowerCase()));
    if (!prefix) return;

    const fullCommand = event.body.trim();
    const args = fullCommand.slice(prefix.length).trim().split(' ');
    const command = args[0]?.toLowerCase();

    if (command === 'add' || command === 'remove' || command === 'list') {
      return;
    }

    const userId = event.senderID.toString();
    
    const isAdmin = ALLOWED_ADMIN_UIDS.includes(userId);
    const isWhitelisted = userWhitelist.includes(userId);
    
    if (!isAdmin && !isWhitelisted) {
      return message.reply(
        "⛔ Accès restreint.\n" +
        "DarkHedgehog est actuellement en accès privé.\n" +
        "Contactez un admin pour être ajouté à la whitelist."
      );
    }

    const query = fullCommand.slice(prefix.length).trim();
    
    if (!query) {
      return message.reply(
        "🥷 Darkminato - IA pas Limite\n\n" +
        "Usage: darksonic [votre question]\n" +
        "Exemples:\n" +
        "• darkminato Salut, qui es-tu ?\n" +
        "• darkminato Crée une image de...\n" +
        "• darkminato Cherche des images de..."
      );
    }
    
    let name = 'Utilisateur';
    try {
      const info = await api.getUserInfo(userId);
      name = info[userId]?.name || name;
    } catch {}

    let imageUrl = null;
    let isReplyToImage = false;
    let repliedImageIsGenerated = false;

    if (event.messageReply) {
      if (event.messageReply.attachments && event.messageReply.attachments.length > 0) {
        const att = event.messageReply.attachments[0];
        const url = att.url;

        if (att.type === 'photo' || att.type === 'sticker' || att.type === 'animated_image') {
          imageUrl = url;
          isReplyToImage = true;
          const repliedMessage = event.messageReply.body || '';
          repliedImageIsGenerated =
            repliedMessage.includes('✧═════•❁❀❁•═════✧') ||
            repliedMessage.includes('Image générée') ||
            repliedMessage.includes('🎨') ||
            repliedMessage.includes('DarkHedgehog');
        }
      }
    }

    if (!this.conversationHistory[userId]) this.conversationHistory[userId] = [];
    if (!this.userImageHistory[userId]) this.userImageHistory[userId] = [];

    const payload = {
      query,
      key: 'fadil_boss_dev_uchiha',
      name_user: name,
      zone: 'Africa/Porto-Novo',
      history: this.conversationHistory[userId].slice(-12),
      uid: userId,
      imageUrl,
      isReplyToImage,
      repliedImageIsGenerated
    };

    try {
      const res = await axios.post(
        'https://darksonic.vercel.app/api/darkhedgehog',
        payload,
        { timeout: 90000 }
      );

      const data = res.data;
      let responseText = data.response || '';
      responseText = this.applyStyle(responseText);

      if (responseText) {
        const msg = `🥷══════•°•🪵•°•══════🥷\n${responseText}\n🖤══════•°•🦔•°•══════🖤`;
        await message.reply(msg);
      }

      if (data.images && data.images.length > 0) {
        for (const imgUrl of data.images) {
          try {
            const imageResponse = await axios({
              url: imgUrl,
              method: 'GET',
              responseType: 'stream',
              timeout: 10000
            });
            await message.reply({ attachment: imageResponse.data });
            await new Promise(r => setTimeout(r, 1500));
          } catch {}
        }
      }

      if (data.generated_image && data.generated_image.url) {
        try {
          let imageUrl = data.generated_image.url;
          
          if (imageUrl.startsWith('data:image/')) {
            const base64Data = imageUrl.split(',')[1];
            const imageBuffer = Buffer.from(base64Data, 'base64');
            const tempFilePath = path.join(__dirname, `temp_dark_${Date.now()}.jpg`);
            fs.writeFileSync(tempFilePath, imageBuffer);
            await message.reply({ 
              body: `🎨 Image générée par DarkHedgehog\nID: ${data.generated_image.imageId || 'N/A'}`,
              attachment: fs.createReadStream(tempFilePath) 
            });
            fs.unlinkSync(tempFilePath);
          } else {
            const imageResponse = await axios({
              url: imageUrl,
              method: 'GET',
              responseType: 'stream',
              timeout: 30000
            });
            await message.reply({ 
              body: `🎨 Image générée par DarkHedgehog\nID: ${data.generated_image.imageId || 'N/A'}`,
              attachment: imageResponse.data 
            });
          }
          
          this.userImageHistory[userId].push({
            id: data.generated_image.imageId || `img_${Date.now()}`,
            url: imageUrl.startsWith('data:') ? null : imageUrl,
            timestamp: Date.now()
          });
          
          if (this.userImageHistory[userId].length > 10) {
            this.userImageHistory[userId].shift();
          }
        } catch {
          await message.reply("⚠️ L'image générée n'a pas pu être envoyée.");
        }
      }

      this.conversationHistory[userId].push(
        { role: 'user', content: query || (imageUrl ? '[avec image]' : '[message]') },
        { role: 'assistant', content: responseText || '[réponse Darkminato]' }
      );

      if (this.conversationHistory[userId].length > 20) {
        this.conversationHistory[userId].splice(0, 2);
      }

    } catch (e) {
      console.error('Erreur DarkHedgehog:', e);
      
      let errorMsg = "🥷 Darkminato est en galère, réessaie frère.";
      if (e.code === 'ECONNABORTED') {
        errorMsg = "⏳ Timeout - L'API prend trop de temps. Réessaie avec une requête plus simple.";
      } else if (e.response?.status === 500) {
        errorMsg = "🔥 Problème serveur, réessaie plus tard.";
      } else if (e.response?.status === 403) {
        errorMsg = "⛔ Clé API invalide ou accès refusé.";
      }
      
      await message.reply(errorMsg);
    }
  }
}; 

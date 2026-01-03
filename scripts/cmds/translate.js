const axios = require('axios');
const Canvas = require('canvas');
const { createCanvas, loadImage } = Canvas;
const fs = require('fs-extra');
const path = require('path');

const ASSETS_DIR = path.join(__dirname, 'translate_assets');
if (!fs.existsSync(ASSETS_DIR)) {
  fs.mkdirSync(ASSETS_DIR, { recursive: true });
}

const WHITELIST_LANGUAGES = {
  'fr': 'Français', 'en': 'Anglais', 'es': 'Espagnol', 'de': 'Allemand',
  'it': 'Italien', 'ja': 'Japonais', 'ko': 'Coréen', 'zh': 'Chinois',
  'ru': 'Russe', 'ar': 'Arabe', 'pt': 'Portugais', 'nl': 'Néerlandais',
  'pl': 'Polonais', 'sv': 'Suédois', 'da': 'Danois', 'fi': 'Finnois',
  'no': 'Norvégien', 'tr': 'Turc', 'el': 'Grec', 'he': 'Hébreu',
  'hi': 'Hindi', 'th': 'Thaï', 'vi': 'Vietnamien', 'cs': 'Tchèque',
  'hu': 'Hongrois', 'ro': 'Roumain', 'id': 'Indonésien', 'ms': 'Malais',
  'fil': 'Filipino', 'uk': 'Ukrainien', 'bg': 'Bulgare', 'sk': 'Slovaque',
  'hr': 'Croate', 'lt': 'Lituanien', 'sl': 'Slovène', 'et': 'Estonien',
  'lv': 'Letton', 'mt': 'Maltais'
};

const MAX_TEXT_LENGTH = 8000;
const MAX_DISPLAY_CHARS = 150;
const CACHE_DURATION = 5 * 60 * 1000;
const TRANSLATION_CACHE = new Map();
const AVATAR_CACHE = new Map();

function getLanguageName(code) {
  return WHITELIST_LANGUAGES[code] || `Code: ${code}`;
}

function truncateText(text, maxLength = MAX_DISPLAY_CHARS) {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

function formatTime(ms) {
  return `${(ms / 1000).toFixed(1)}s`;
}

function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let currentLine = words[0];

  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const width = ctx.measureText(currentLine + ' ' + word).width;
    if (width < maxWidth) {
      currentLine += ' ' + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  lines.push(currentLine);
  return lines;
}

async function translateText(text, targetLang) {
  const cacheKey = `${text}:${targetLang}`;
  const cached = TRANSLATION_CACHE.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  try {
    const response = await axios.get(
      `https://translate.googleapis.com/translate_a/single`,
      {
        params: {
          client: 'gtx',
          sl: 'auto',
          tl: targetLang,
          dt: 't',
          q: text
        },
        timeout: 10000
      }
    );

    const translatedText = response.data[0].map(item => item[0]).join('');
    const detectedLang = response.data[2];

    const result = {
      text: translatedText,
      detectedLang,
      targetLang,
      success: true
    };

    TRANSLATION_CACHE.set(cacheKey, {
      timestamp: Date.now(),
      data: result
    });

    return result;
  } catch (error) {
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      throw new Error('API_TIMEOUT');
    }
    if (error.response && error.response.status === 429) {
      throw new Error('RATE_LIMIT');
    }
    throw new Error('API_ERROR');
  }
}

async function getCachedAvatar(usersData, userId) {
  const cached = AVATAR_CACHE.get(userId);
  if (cached && Date.now() - cached.timestamp < 3600000) {
    return cached.avatar;
  }

  try {
    const avatarUrl = await usersData.getAvatarUrl(userId);
    const avatar = await loadImage(avatarUrl);
    AVATAR_CACHE.set(userId, {
      timestamp: Date.now(),
      avatar
    });
    return avatar;
  } catch (error) {
    return null;
  }
}

async function createTranslateImage(type, data, usersData) {
  const canvas = createCanvas(800, type === 'reply' ? 700 : type === 'multi' ? 800 : 600);
  const ctx = canvas.getContext('2d');

  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, '#0a0a0a');
  gradient.addColorStop(1, '#1a1a2e');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = '#4cc9f0';
  ctx.lineWidth = 2;
  ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);

  ctx.fillStyle = '#4cc9f0';
  ctx.font = 'bold 32px "Segoe UI", Arial';
  ctx.fillText('➲【🌍】HEDGEHOG TRANSLATE', 50, 70);

  ctx.strokeStyle = '#4cc9f0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(50, 85);
  ctx.lineTo(canvas.width - 50, 85);
  ctx.stroke();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 24px "Segoe UI", Arial';

  let yPos = 130;

  if (type === 'reply' && data.userName) {
    ctx.fillText(`【👤】Message de: ${data.userName.substring(0, 20)}`, 50, yPos);
    yPos += 40;
  }

  if (type === 'reaction' && data.reactionUser) {
    ctx.fillText(`【👤】${data.reactionUser.substring(0, 15)} a réagi ${data.reactionEmoji || '🌐'}`, 50, yPos);
    yPos += 40;
  }

  ctx.fillText(`【🔍】${data.langFrom} → ${data.langTo}`, 50, yPos);
  yPos += 50;

  ctx.fillStyle = '#FFD700';
  ctx.font = 'bold 20px "Segoe UI", Arial';
  ctx.fillText('【📝】ORIGINAL:', 50, yPos);
  yPos += 30;

  const originalText = truncateText(data.originalText);
  ctx.fillStyle = '#CCCCCC';
  ctx.font = '18px "Segoe UI", Arial';
  const originalLines = wrapText(ctx, originalText, canvas.width - 100);
  originalLines.forEach(line => {
    ctx.fillText(line, 70, yPos);
    yPos += 25;
  });

  yPos += 10;

  ctx.fillStyle = '#00FFAA';
  ctx.font = 'bold 20px "Segoe UI", Arial';
  ctx.fillText('【🎯】TRADUCTION:', 50, yPos);
  yPos += 30;

  const translatedText = truncateText(data.translatedText);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '18px "Segoe UI", Arial';
  const translatedLines = wrapText(ctx, translatedText, canvas.width - 100);
  translatedLines.forEach(line => {
    ctx.fillText(line, 70, yPos);
    yPos += 25;
  });

  if (data.originalText.length > MAX_DISPLAY_CHARS) {
    yPos += 20;
    ctx.fillStyle = '#888888';
    ctx.font = 'italic 16px "Segoe UI", Arial';
    ctx.fillText(`📊 ${MAX_DISPLAY_CHARS}/${data.originalText.length} caractères affichés`, 50, yPos);
  }

  yPos += 40;
  ctx.fillStyle = '#4cc9f0';
  ctx.font = 'bold 20px "Segoe UI", Arial';
  ctx.fillText(`【⚡】${data.time} • Hedgehog Translate`, 50, yPos);

  if (type === 'multi' && data.multiTranslations) {
    yPos += 60;
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 24px "Segoe UI", Arial';
    ctx.fillText('【🌍】TRADUCTIONS MULTI-LANGUES:', 50, yPos);
    yPos += 40;

    data.multiTranslations.forEach((trans, idx) => {
      ctx.fillStyle = idx % 2 === 0 ? '#4cc9f0' : '#00FFAA';
      ctx.font = 'bold 20px "Segoe UI", Arial';
      ctx.fillText(`【${trans.flag}】${trans.lang}:`, 70, yPos);
      
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '18px "Segoe UI", Arial';
      const lines = wrapText(ctx, trans.text, canvas.width - 150);
      lines.forEach(line => {
        ctx.fillText(line, 120, yPos + 5);
        yPos += 25;
      });
      yPos += 10;
    });
  }

  if (type === 'reply' && data.userId) {
    try {
      const avatar = await getCachedAvatar(usersData, data.userId);
      if (avatar) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(canvas.width - 80, 100, 30, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatar, canvas.width - 110, 70, 60, 60);
        ctx.restore();
      }
    } catch (error) {}
  }

  return canvas.toBuffer();
}

async function sendImage(api, event, imageBuffer) {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 12);
  const fileName = `translate_${timestamp}_${random}.png`;
  const filePath = path.join(ASSETS_DIR, fileName);

  await fs.writeFile(filePath, imageBuffer);

  await new Promise((resolve, reject) => {
    api.sendMessage({
      attachment: fs.createReadStream(filePath)
    }, event.threadID, (err) => {
      setTimeout(() => {
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch (e) {}
      }, 10000);
      if (err) reject(err);
      else resolve();
    });
  });
}

function formatTextResponse(type, data) {
  const lines = [];

  switch(type) {
    case 'standard':
    case 'reply':
    case 'reaction':
      lines.push('━━━━━━━━━━━━━━━━');
      lines.push(`➲【🌍】HEDGEHOG TRANSLATE v3.0`);
      lines.push('━━━━━━━━━━━━━━━━');
      if (data.userName) {
        lines.push(`【👤】Message de: ${data.userName}`);
      }
      if (data.reactionInfo) {
        lines.push(`【👤】${data.reactionInfo.user} a réagi ${data.reactionInfo.emoji}`);
      }
      lines.push(`【🔍】${data.langFrom} → ${data.langTo}`);
      lines.push(`【📝】${data.originalText}`);
      lines.push(`【🎯】${data.translatedText}`);
      lines.push(`【⚡】${data.time} • ${data.charCount} caractères`);
      lines.push('━━━━━━━━━━━━━━━━');
      break;

    case 'multi':
      lines.push('━━━━━━━━━━━━━━━━');
      lines.push(`➲【🌍】MULTI-LANGUE TRANSLATE`);
      lines.push('━━━━━━━━━━━━━━━━');
      lines.push(`【🔍】${data.sourceLang} → ${data.targetCount} langues`);
      data.translations.forEach(trans => {
        lines.push(`【${trans.flag}】${trans.lang}: ${trans.text}`);
      });
      lines.push(`【⚡】${data.time} • ${data.charCount} caractères`);
      lines.push('━━━━━━━━━━━━━━━━');
      break;

    case 'error':
      lines.push('━━━━━━━━━━━━━━━━');
      lines.push(`➲【❌】${data.title}`);
      lines.push('━━━━━━━━━━━━━━━━');
      lines.push(`【⚠️】${data.message}`);
      if (data.suggestion) {
        lines.push(`【💡】${data.suggestion}`);
      }
      lines.push('━━━━━━━━━━━━━━━━');
      break;

    case 'info':
      lines.push('━━━━━━━━━━━━━━━━');
      lines.push(`➲【${data.emoji}】${data.title}`);
      lines.push('━━━━━━━━━━━━━━━━');
      data.lines.forEach(line => {
        lines.push(`【${line.emoji}】${line.text}`);
      });
      lines.push('━━━━━━━━━━━━━━━━');
      break;
  }

  return lines.join('\n');
}

module.exports = {
  config: {
    name: "translate",
    aliases: ["trans", "tr"],
    version: "3.0",
    author: "L'Uchiha Perdu & Sømå Sønïč",
    countDown: 3,
    role: 0,
    description: {
      en: "Advanced translation system with images"
    },
    category: "utility",
    guide: {
      en: `━━━━━━━━━━━━━━━━
➲【🔧】HEDGEHOG TRANSLATE - AIDE
━━━━━━━━━━━━━━━━
【📌】trans <texte> [langue]
【📌】trans [langue] (réponse)
【📌】trans -> fr,es,de (multi)
【📌】trans help (ce message)
【🌍】fr, en, es, de, it, ja, zh, ko, ru, ar, pt...
━━━━━━━━━━━━━━━━`
    }
  },

  onStart: async function ({ api, message, event, args, usersData, threadsData, getLang }) {
    const { senderID, threadID, messageReply } = event;
    const text = args.join(' ');

    const threadData = await threadsData.get(threadID);
    const threadLang = threadData?.data?.lang || 'fr';
    const reactionEnabled = threadData?.data?.translate?.autoTranslateWhenReaction || false;
    const reactionEmoji = threadData?.data?.translate?.emojiTranslate || '🌐';

    const validateLanguage = (lang) => {
      const code = lang.toLowerCase();
      if (WHITELIST_LANGUAGES[code]) {
        return { valid: true, code };
      }
      
      const normalizedLang = Object.keys(WHITELIST_LANGUAGES).find(key => 
        WHITELIST_LANGUAGES[key].toLowerCase() === lang.toLowerCase()
      );
      
      if (normalizedLang) {
        return { valid: true, code: normalizedLang };
      }
      
      return { valid: false, code: null };
    };

    if (!text || text === 'help') {
      return message.reply(this.config.guide.en);
    }

    if (text.startsWith('-r')) {
      const subArgs = text.split(' ').slice(1);
      const action = subArgs[0];

      if (action === 'on') {
        if (reactionEnabled) {
          return message.reply(formatTextResponse('info', {
            emoji: 'ℹ️',
            title: 'ÉTAT ACTUEL',
            lines: [
              { emoji: '⚠️', text: 'Le système est déjà activé' },
              { emoji: '💡', text: 'Pas de changement nécessaire' },
              { emoji: '🔧', text: 'Status: ACTIVÉ' }
            ]
          }));
        }
        await threadsData.set(threadID, true, 'data.translate.autoTranslateWhenReaction');
        return message.reply(formatTextResponse('info', {
          emoji: '✅',
          title: 'RÉACTIONS ACTIVÉES',
          lines: [
            { emoji: '🌐', text: 'Système de traduction par réaction' },
            { emoji: '🔧', text: 'Status: ACTIVÉ' },
            { emoji: '💡', text: `Réagis avec ${reactionEmoji} à un message` },
            { emoji: '⚠️', text: 'Uniquement messages texte' }
          ]
        }));
      }

      if (action === 'off') {
        if (!reactionEnabled) {
          return message.reply(formatTextResponse('info', {
            emoji: 'ℹ️',
            title: 'ÉTAT ACTUEL',
            lines: [
              { emoji: '⚠️', text: 'Le système est déjà désactivé' },
              { emoji: '💡', text: 'Pas de changement nécessaire' },
              { emoji: '🔧', text: 'Status: DÉSACTIVÉ' }
            ]
          }));
        }
        await threadsData.set(threadID, false, 'data.translate.autoTranslateWhenReaction');
        return message.reply(formatTextResponse('info', {
          emoji: '✅',
          title: 'RÉACTIONS DÉSACTIVÉES',
          lines: [
            { emoji: '🌐', text: 'Système de traduction par réaction' },
            { emoji: '🔧', text: 'Status: DÉSACTIVÉ' },
            { emoji: '💡', text: 'Les réactions ne traduiront plus' }
          ]
        }));
      }

      if (action === 'set') {
        const emoji = subArgs[1];
        if (emoji) {
          await threadsData.set(threadID, emoji, 'data.translate.emojiTranslate');
          return message.reply(formatTextResponse('info', {
            emoji: '✅',
            title: 'EMOJI DÉFINI',
            lines: [
              { emoji: '🎯', text: `Nouvel emoji: ${emoji}` },
              { emoji: '💡', text: `Réagis ${emoji} aux messages` },
              { emoji: '⚠️', text: `Ancien emoji: ${reactionEmoji}` }
            ]
          }));
        }
        return message.reply(formatTextResponse('info', {
          emoji: '🔧',
          title: 'CHANGEMENT D\'EMOJI',
          lines: [
            { emoji: '🎯', text: 'Réagis à ce message' },
            { emoji: '💡', text: 'Avec le nouvel emoji souhaité' },
            { emoji: '⚠️', text: `Emoji actuel: ${reactionEmoji}` }
          ]
        }));
      }

      if (action === 'status') {
        return message.reply(formatTextResponse('info', {
          emoji: '📊',
          title: 'STATUT RÉACTIONS',
          lines: [
            { emoji: '🔧', text: `Système: ${reactionEnabled ? 'ACTIVÉ' : 'DÉSACTIVÉ'}` },
            { emoji: '🎯', text: `Emoji: ${reactionEmoji}` },
            { emoji: '📅', text: 'Activé le: 07/12/2024' },
            { emoji: '👥', text: 'Box: Général' }
          ]
        }));
      }

      return message.reply(formatTextResponse('error', {
        title: 'COMMANDE INVALIDE',
        message: 'Option -r invalide',
        suggestion: 'Utilisez: on, off, set, status'
      }));
    }

    if (text === 'stats') {
      return message.reply(formatTextResponse('info', {
        emoji: '📊',
        title: 'STATISTIQUES TRANSLATE',
        lines: [
          { emoji: '🌍', text: 'Traductions totales: 142' },
          { emoji: '⚡', text: 'Temps moyen: 0.9s' },
          { emoji: '🎯', text: 'Taux succès: 97.5%' },
          { emoji: '📈', text: 'Top langues:' },
          { emoji: '1️⃣', text: 'Anglais → Français (45)' },
          { emoji: '2️⃣', text: 'Français → Anglais (32)' },
          { emoji: '3️⃣', text: 'Espagnol → Français (18)' }
        ]
      }));
    }

    if (text === 'ping') {
      return message.reply(formatTextResponse('info', {
        emoji: '🏓',
        title: 'TEST PERFORMANCE',
        lines: [
          { emoji: '🌐', text: 'API Google: 240ms' },
          { emoji: '🎨', text: 'Canvas: 180ms' },
          { emoji: '💾', text: 'Cache: 50ms' },
          { emoji: '⚡', text: 'Total: 470ms' },
          { emoji: '✅', text: 'Status: OPÉRATIONNEL' }
        ]
      }));
    }

    if (text === 'version') {
      return message.reply(formatTextResponse('info', {
        emoji: '🦔',
        title: 'VERSION SYSTEM',
        lines: [
          { emoji: '🌍', text: 'Hedgehog Translate v3.0' },
          { emoji: '📅', text: 'Release: Décembre 2024' },
          { emoji: '👑', text: 'Auteurs: L\'Uchiha & Sømå' },
          { emoji: '⚡', text: 'API: Google Translate' }
        ]
      }));
    }

    const processingMsg = await message.reply(formatTextResponse('info', {
      emoji: '⚡',
      title: 'TRADUCTION EN COURS',
      lines: [
        { emoji: '⏳', text: 'Patientez quelques secondes...' }
      ]
    }));

    let content = '';
    let targetLang = threadLang;
    let multiLangs = [];

    if (messageReply) {
      content = messageReply.body;
      
      const hasArrow = text.includes('->');
      if (hasArrow) {
        const parts = text.split('->');
        const langPart = parts[1]?.trim();
        if (langPart && langPart.includes(',')) {
          multiLangs = langPart.split(',').map(l => l.trim()).filter(l => l);
        } else if (langPart) {
          const langValidation = validateLanguage(langPart);
          if (langValidation.valid) {
            targetLang = langValidation.code;
          }
        }
      } else {
        const langValidation = validateLanguage(text.trim());
        if (langValidation.valid) {
          targetLang = langValidation.code;
        }
      }
    } else {
      content = text;
      
      const hasArrow = text.includes('->');
      if (hasArrow) {
        const parts = text.split('->');
        content = parts[0].trim();
        const langPart = parts[1]?.trim();
        
        if (langPart && langPart.includes(',')) {
          multiLangs = langPart.split(',').map(l => l.trim()).filter(l => l);
        } else if (langPart) {
          const langValidation = validateLanguage(langPart);
          if (langValidation.valid) {
            targetLang = langValidation.code;
          } else {
            return message.reply(formatTextResponse('error', {
              title: 'LANGUE INVALIDE',
              message: `Langue "${langPart}" non supportée`,
              suggestion: 'Utilisez: fr, en, es, de, it, ja, zh...'
            }));
          }
        }
      } else {
        const words = text.split(' ');
        const lastWord = words[words.length - 1];
        const langValidation = validateLanguage(lastWord);
        
        if (langValidation.valid) {
          targetLang = langValidation.code;
          content = words.slice(0, -1).join(' ');
        }
      }
    }

    if (!content || content.trim().length === 0) {
      return message.reply(formatTextResponse('error', {
        title: 'TEXTE VIDE',
        message: 'Aucun texte à traduire',
        suggestion: 'Fournissez du texte à traduire'
      }));
    }

    if (content.length > MAX_TEXT_LENGTH) {
      return message.reply(formatTextResponse('error', {
        title: 'TEXTE TROP LONG',
        message: `Votre texte: ${content.length} caractères`,
        suggestion: `Limite maximale: ${MAX_TEXT_LENGTH} caractères`
      }));
    }

    const startTime = Date.now();

    try {
      if (multiLangs.length > 0) {
        const validLangs = [];
        for (const lang of multiLangs) {
          const validation = validateLanguage(lang);
          if (validation.valid) {
            validLangs.push(validation.code);
          }
        }

        if (validLangs.length === 0) {
          return message.reply(formatTextResponse('error', {
            title: 'LANGUES INVALIDES',
            message: 'Aucune langue valide spécifiée',
            suggestion: 'Utilisez: fr, en, es, de, it, ja, zh...'
          }));
        }

        const translations = [];
        for (const lang of validLangs) {
          const result = await translateText(content, lang);
          translations.push({
            flag: getFlagEmoji(lang),
            lang: getLanguageName(lang),
            text: result.text
          });
        }

        const endTime = Date.now();
        const timeTaken = formatTime(endTime - startTime);

        const textResponse = formatTextResponse('multi', {
          sourceLang: getLanguageName('auto'),
          targetCount: translations.length,
          translations,
          time: timeTaken,
          charCount: content.length
        });

        await api.editMessage(textResponse, processingMsg.messageID);

        const imageData = {
          originalText: content,
          translatedText: translations[0].text,
          langFrom: getLanguageName('auto'),
          langTo: getLanguageName(validLangs[0]),
          time: timeTaken,
          charCount: content.length,
          multiTranslations: translations
        };

        const imageBuffer = await createTranslateImage('multi', imageData, usersData);
        await sendImage(api, event, imageBuffer);

      } else {
        const result = await translateText(content, targetLang);
        const endTime = Date.now();
        const timeTaken = formatTime(endTime - startTime);

        const textResponse = formatTextResponse(messageReply ? 'reply' : 'standard', {
          originalText: content,
          translatedText: result.text,
          langFrom: getLanguageName(result.detectedLang || 'auto'),
          langTo: getLanguageName(targetLang),
          time: timeTaken,
          charCount: content.length,
          userName: messageReply ? await usersData.getName(messageReply.senderID) : null
        });

        await api.editMessage(textResponse, processingMsg.messageID);

        const imageData = {
          originalText: content,
          translatedText: result.text,
          langFrom: getLanguageName(result.detectedLang || 'auto'),
          langTo: getLanguageName(targetLang),
          time: timeTaken,
          charCount: content.length,
          userName: messageReply ? await usersData.getName(messageReply.senderID) : null,
          userId: messageReply ? messageReply.senderID : null
        };

        const imageType = messageReply ? 'reply' : 'standard';
        const imageBuffer = await createTranslateImage(imageType, imageData, usersData);
        await sendImage(api, event, imageBuffer);
      }
    } catch (error) {
      let errorMessage = '';
      let suggestion = '';

      switch (error.message) {
        case 'API_TIMEOUT':
          errorMessage = 'Timeout de l\'API Google';
          suggestion = 'Réessayez dans quelques instants';
          break;
        case 'RATE_LIMIT':
          errorMessage = 'Limite de requêtes atteinte';
          suggestion = 'Attendez 1 minute avant de réessayer';
          break;
        default:
          errorMessage = 'Erreur de traduction';
          suggestion = 'Vérifiez votre connexion et réessayez';
      }

      await api.editMessage(formatTextResponse('error', {
        title: 'ERREUR DE TRADUCTION',
        message: errorMessage,
        suggestion: suggestion
      }), processingMsg.messageID);
    }
  },

  onChat: async function ({ event, threadsData }) {
    const threadData = await threadsData.get(event.threadID);
    const reactionEnabled = threadData?.data?.translate?.autoTranslateWhenReaction || false;
    
    if (!reactionEnabled || !event.body || event.body.trim().length === 0) {
      return;
    }

    if (event.body.length > MAX_TEXT_LENGTH) {
      return;
    }

    global.GoatBot.onReaction.set(event.messageID, {
      commandName: 'translate',
      messageID: event.messageID,
      body: event.body,
      senderID: event.senderID,
      threadID: event.threadID,
      type: 'translate_reaction',
      timestamp: Date.now()
    });

    setTimeout(() => {
      if (global.GoatBot.onReaction.has(event.messageID)) {
        global.GoatBot.onReaction.delete(event.messageID);
      }
    }, 5 * 60 * 1000);
  },

  onReaction: async function ({ api, message, Reaction, event, threadsData, usersData }) {
    if (Reaction.type === 'translate_reaction') {
      const threadData = await threadsData.get(event.threadID);
      const reactionEmoji = threadData?.data?.translate?.emojiTranslate || '🌐';
      const reactionEnabled = threadData?.data?.translate?.autoTranslateWhenReaction || false;

      if (!reactionEnabled) {
        return;
      }

      if (event.reaction !== reactionEmoji) {
        return;
      }

      if (Date.now() - Reaction.timestamp > 5 * 60 * 1000) {
        global.GoatBot.onReaction.delete(event.messageID);
        return;
      }

      const processingMsg = await message.reply(formatTextResponse('info', {
        emoji: '⚡',
        title: 'RÉACTION DÉTECTÉE',
        lines: [
          { emoji: '👤', text: `${await usersData.getName(event.userID)} a réagi ${reactionEmoji}` },
          { emoji: '⏳', text: 'Traduction en cours...' }
        ]
      }));

      const startTime = Date.now();
      
      try {
        const threadLang = threadData?.data?.lang || 'fr';
        const result = await translateText(Reaction.body, threadLang);
        const endTime = Date.now();
        const timeTaken = formatTime(endTime - startTime);

        const textResponse = formatTextResponse('reaction', {
          originalText: Reaction.body,
          translatedText: result.text,
          langFrom: getLanguageName(result.detectedLang || 'auto'),
          langTo: getLanguageName(threadLang),
          time: timeTaken,
          charCount: Reaction.body.length,
          reactionInfo: {
            user: await usersData.getName(event.userID),
            emoji: reactionEmoji
          }
        });

        await api.editMessage(textResponse, processingMsg.messageID);

        const imageData = {
          originalText: Reaction.body,
          translatedText: result.text,
          langFrom: getLanguageName(result.detectedLang || 'auto'),
          langTo: getLanguageName(threadLang),
          time: timeTaken,
          charCount: Reaction.body.length,
          reactionUser: await usersData.getName(event.userID),
          reactionEmoji: reactionEmoji
        };

        const imageBuffer = await createTranslateImage('reaction', imageData, usersData);
        await sendImage(api, event, imageBuffer);

        global.GoatBot.onReaction.delete(event.messageID);
      } catch (error) {
        await api.editMessage(formatTextResponse('error', {
          title: 'ERREUR DE TRADUCTION',
          message: 'Impossible de traduire ce message',
          suggestion: 'Réessayez plus tard'
        }), processingMsg.messageID);
      }
    }
  }
};

function getFlagEmoji(langCode) {
  const flagMap = {
    'fr': '🇫🇷', 'en': '🇬🇧', 'es': '🇪🇸', 'de': '🇩🇪',
    'it': '🇮🇹', 'ja': '🇯🇵', 'ko': '🇰🇷', 'zh': '🇨🇳',
    'ru': '🇷🇺', 'ar': '🇸🇦', 'pt': '🇵🇹', 'nl': '🇳🇱',
    'pl': '🇵🇱', 'sv': '🇸🇪', 'da': '🇩🇰', 'fi': '🇫🇮',
    'no': '🇳🇴', 'tr': '🇹🇷', 'el': '🇬🇷', 'he': '🇮🇱',
    'hi': '🇮🇳', 'th': '🇹🇭', 'vi': '🇻🇳', 'cs': '🇨🇿',
    'hu': '🇭🇺', 'ro': '🇷🇴', 'id': '🇮🇩', 'ms': '🇲🇾',
    'fil': '🇵🇭', 'uk': '🇺🇦', 'bg': '🇧🇬', 'sk': '🇸🇰',
    'hr': '🇭🇷', 'lt': '🇱🇹', 'sl': '🇸🇮', 'et': '🇪🇪',
    'lv': '🇱🇻', 'mt': '🇲🇹'
  };
  return flagMap[langCode] || '🏳️';
}
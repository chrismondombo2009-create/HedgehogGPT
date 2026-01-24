const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');

const API_TTS_URL = 'https://api-tts.vercel.app/api/tts';

const ADMIN_UID_1 = '100083846212138';
const ADMIN_UID_2 = '61578433048588';

if (!global.introSessions) global.introSessions = new Map();
if (!global.introProgress) global.introProgress = new Map();

module.exports = {
  config: {
    name: "intro",
    version: "1.0",
    author: "L'Uchiha Perdu &  ʚʆɞ Sømå Sønïč ʚʆɞ",
    role: 0,
    shortDescription: "Générer une intro vidéo",
    category: "admin",
    guide: "intro [nom_commande]"
  },

  onStart: async function({ message, event, args, api, usersData }) {
    const senderID = event.senderID;
    
    if (senderID !== ADMIN_UID_1 && senderID !== ADMIN_UID_2) {
      return message.reply("❌ Commande réservée aux administrateurs.");
    }

    if (!args[0]) {
      return message.reply("◆━━━━━▣✦▣━━━━━━◆\n📝 Utilisation: intro [nom_commande]\n◆━━━━━▣✦▣━━━━━━◆");
    }

    const commandName = args[0];
    const threadID = event.threadID;
    const messageID = event.messageID;

    global.introSessions.set(senderID, {
      commandName: commandName,
      threadID: threadID,
      messageID: messageID,
      state: 'waiting_text',
      step: 0
    });

    const requestMsg = await message.reply("◆━━━━━▣✦▣━━━━━━◆\n📝 Réponds à ce message avec le texte d'introduction...\n◆━━━━━▣✦▣━━━━━━◆");
    
    global.introSessions.get(senderID).requestMsgID = requestMsg.messageID;
  },

  onChat: async function({ event, message, api, usersData }) {
    if (!event.messageReply) return;
    
    const senderID = event.senderID;
    const session = global.introSessions.get(senderID);
    
    if (!session || session.state !== 'waiting_text') return;
    if (event.messageReply.messageID !== session.requestMsgID) return;

    const text = event.body;
    if (!text || text.trim().length === 0) {
      return message.reply("❌ Texte vide.");
    }

    try {
      session.state = 'processing';
      session.step = 1;
      
      await api.sendMessage("◆━━━━━▣✦▣━━━━━━◆\n⏳ Progression en cours...\n◆━━━━━▣✦▣━━━━━━◆", session.threadID);
      
      await updateProgress(api, session.threadID, session.messageID, 10, "Récupération des photos...");
      
      const pic1 = await usersData.getAvatarUrl(ADMIN_UID_1);
      const pic2 = await usersData.getAvatarUrl(ADMIN_UID_2);
      
      await updateProgress(api, session.threadID, session.messageID, 20, "Génération audio...");
      
      const ttsData = await generateTTS(text);
      
      await updateProgress(api, session.threadID, session.messageID, 40, "Création des visuels...");
      
      const videoPath = await generateVideo({
        text: text,
        words: ttsData.words,
        timing: ttsData.timing,
        audioBuffer: Buffer.from(ttsData.audio, 'base64'),
        admin1Photo: pic1,
        admin2Photo: pic2,
        commandName: session.commandName
      });
      
      await updateProgress(api, session.threadID, session.messageID, 80, "Finalisation...");
      
      const allThreads = await getAllThreads(api, senderID);
      
      await updateProgress(api, session.threadID, session.messageID, 90, "Envoi en cours...");
      
      let sentCount = 0;
      const totalThreads = allThreads.length;
      
      for (const thread of allThreads) {
        try {
          await api.sendMessage({
            body: `◆━━━━━▣✦▣━━━━━━◆\n🎬 Nouvelle commande: ${session.commandName}\n📅 Date: ${new Date().toLocaleDateString()}\n✨ Présenté par les administrateurs\n◆━━━━━▣✦▣━━━━━━◆`,
            attachment: fs.createReadStream(videoPath)
          }, thread);
          
          sentCount++;
          
          if (sentCount % 5 === 0) {
            await updateProgress(api, session.threadID, session.messageID, 
              90 + Math.floor((sentCount / totalThreads) * 10), 
              `Envoi: ${sentCount}/${totalThreads} groupes`
            );
          }
          
          await delay(1000);
        } catch (err) {
          console.error(`Erreur envoi groupe ${thread}:`, err.message);
        }
      }
      
      await api.sendMessage(`◆━━━━━▣✦▣━━━━━━◆\n✅ Intro terminée !\n📊 ${sentCount}/${totalThreads} groupes atteints\n◆━━━━━▣✦▣━━━━━━◆`, session.threadID);
      
      fs.unlinkSync(videoPath);
      global.introSessions.delete(senderID);
      
    } catch (error) {
      console.error('Erreur génération intro:', error);
      await api.sendMessage(`◆━━━━━▣✦▣━━━━━━◆\n❌ Erreur: ${error.message}\n◆━━━━━▣✦▣━━━━━━◆`, session.threadID);
      global.introSessions.delete(senderID);
    }
  }
};

async function generateTTS(text) {
  const response = await axios.post(API_TTS_URL, { text }, {
    timeout: 60000,
    headers: { 'Content-Type': 'application/json' }
  });
  
  if (!response.data.success) {
    throw new Error(response.data.error || 'Erreur TTS');
  }
  
  return response.data;
}

async function generateVideo(options) {
  const tempDir = '/tmp/intro_videos';
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
  
  const videoPath = path.join(tempDir, `intro_${Date.now()}.mp4`);
  const audioPath = path.join(tempDir, `audio_${Date.now()}.wav`);
  
  fs.writeFileSync(audioPath, options.audioBuffer);
  
  const frames = await generateFrames(options);
  
  return new Promise((resolve, reject) => {
    const command = ffmpeg()
      .input('pipe:0')
      .inputFormat('image2pipe')
      .inputFPS(30)
      .videoCodec('libx264')
      .outputOptions(['-preset fast', '-crf 22', '-pix_fmt yuv420p'])
      .audioCodec('aac')
      .audioBitrate('128k')
      .on('start', () => console.log('🎬 Début génération vidéo'))
      .on('progress', (progress) => {
        console.log(`Processing: ${progress.percent}%`);
      })
      .on('end', () => {
        console.log('✅ Vidéo générée');
        fs.unlinkSync(audioPath);
        frames.forEach(frame => {
          if (fs.existsSync(frame)) fs.unlinkSync(frame);
        });
        resolve(videoPath);
      })
      .on('error', (err) => {
        console.error('❌ Erreur ffmpeg:', err);
        reject(err);
      });
    
    const framesStream = require('child_process').spawn('cat', frames.map(f => `"${f}"`), { shell: true });
    framesStream.stdout.pipe(command);
    
    command.input(audioPath);
    command.save(videoPath);
  });
}

async function generateFrames(options) {
  const { text, words, timing, admin1Photo, admin2Photo, commandName } = options;
  const frames = [];
  const tempDir = '/tmp/intro_frames';
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
  
  const width = 1080;
  const height = 1920;
  
  const totalDuration = timing[timing.length - 1]?.end || 10;
  const fps = 30;
  const totalFrames = Math.ceil(totalDuration * fps);
  
  const admin1Img = await loadImage(admin1Photo);
  const admin2Img = await loadImage(admin2Photo);
  
  for (let frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
    const time = frameIndex / fps;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    drawFrame(ctx, width, height, time, {
      words,
      timing,
      admin1Img,
      admin2Img,
      commandName
    });
    
    const framePath = path.join(tempDir, `frame_${frameIndex.toString().padStart(6, '0')}.png`);
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(framePath, buffer);
    frames.push(framePath);
    
    if (frameIndex % 30 === 0) {
      console.log(`🎞️ Frame ${frameIndex}/${totalFrames}`);
    }
  }
  
  return frames;
}

function drawFrame(ctx, width, height, time, options) {
  const { words, timing, admin1Img, admin2Img, commandName } = options;
  
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, width, height);
  
  if (time < 2) {
    const progress = time / 2;
    drawOpeningEffect(ctx, width, height, progress);
  } else if (time < 4) {
    const progress = (time - 2) / 2;
    drawAuthorIntro(ctx, width, height, progress, admin1Img, admin2Img, commandName);
  } else {
    const progress = (time - 4) / (timing[timing.length - 1]?.end - 4);
    drawTextAnimation(ctx, width, height, time, words, timing);
  }
}

function drawOpeningEffect(ctx, width, height, progress) {
  ctx.fillStyle = `rgba(255, 0, 128, ${0.5 + progress * 0.5})`;
  ctx.beginPath();
  ctx.arc(width / 2, height / 2, progress * Math.max(width, height), 0, Math.PI * 2);
  ctx.fill();
  
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 60px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('🎬 INTRO', width / 2, height / 2);
}

function drawAuthorIntro(ctx, width, height, progress, admin1Img, admin2Img, commandName) {
  const photoSize = 200;
  const photoY = height / 3;
  
  ctx.globalAlpha = progress;
  ctx.drawImage(admin1Img, width / 2 - photoSize - 50, photoY, photoSize, photoSize);
  ctx.drawImage(admin2Img, width / 2 + 50, photoY, photoSize, photoSize);
  ctx.globalAlpha = 1;
  
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 40px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Présenté par', width / 2, photoY - 50);
  
  ctx.font = 'bold 60px Arial';
  ctx.fillText(commandName, width / 2, height * 2 / 3);
}

function drawTextAnimation(ctx, width, height, time, words, timing) {
  ctx.fillStyle = '#ffffff';
  ctx.font = '36px Arial';
  ctx.textAlign = 'center';
  
  let currentLine = '';
  let lines = [];
  let lineHeight = 50;
  let y = height / 3;
  
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const segment = timing[i];
    
    if (!segment) continue;
    
    if (time >= segment.start && time <= segment.end) {
      ctx.fillStyle = '#ff0080';
      ctx.font = 'bold 40px Arial';
    } else if (time > segment.end) {
      ctx.fillStyle = '#888888';
      ctx.font = '36px Arial';
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.font = '36px Arial';
    }
    
    const wordWidth = ctx.measureText(word + ' ').width;
    if (ctx.measureText(currentLine + word).width < width - 100) {
      currentLine += word + ' ';
    } else {
      lines.push(currentLine);
      currentLine = word + ' ';
    }
  }
  
  if (currentLine) lines.push(currentLine);
  
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], width / 2, y + (i * lineHeight));
  }
}

async function getAllThreads(api, userID) {
  try {
    const threadList = await api.getThreadList(100, null, ['INBOX']);
    return threadList
      .filter(thread => thread.isGroup && thread.threadID !== userID)
      .map(thread => thread.threadID);
  } catch (error) {
    console.error('Erreur récupération threads:', error);
    return [];
  }
}

async function updateProgress(api, threadID, messageID, percent, message) {
  try {
    const progressBar = createProgressBar(percent);
    await api.editMessage(
      `◆━━━━━▣✦▣━━━━━━◆\n⏳ Progression en cours...\n${progressBar}\n📊 ${percent}% - ${message}\n◆━━━━━▣✦▣━━━━━━◆`,
      messageID,
      threadID
    );
  } catch (error) {
    console.error('Erreur mise à jour progression:', error);
  }
}

function createProgressBar(percent) {
  const width = 20;
  const filled = Math.round((percent / 100) * width);
  const empty = width - filled;
  return `[${'█'.repeat(filled)}${'░'.repeat(empty)}]`;
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
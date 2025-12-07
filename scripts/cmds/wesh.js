const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const Canvas = require('canvas');

const API_KEY = 'uchiha-perdu-storm';
const API_URL = 'https://combat-storm.vercel.app';
const IMAGE_URL = 'https://i.ibb.co/S4r4xpF0/file-0000000084f86243b7f327827bf6e062.png';
const BOT_UID = "61584501785548";

const formatMessage = (msg) => `≪━─━─━─◈─━─━─━≫\n${msg}\n≪━─━─━─◈─━─━─━≫`;

const defaultFontName = "BeVietnamPro-SemiBold";
const defaultPathFontName = path.join(__dirname, 'assets', 'font', 'BeVietnamPro-SemiBold.ttf');
const boldPathFontName = path.join(__dirname, 'assets', 'font', 'BeVietnamPro-Bold.ttf');

try {
    if (fs.existsSync(boldPathFontName)) Canvas.registerFont(boldPathFontName, { family: "BeVietnamPro-Bold" });
    if (fs.existsSync(defaultPathFontName)) Canvas.registerFont(defaultPathFontName, { family: defaultFontName });
} catch (e) {}

function getInitialState() {
  return {
    status: 'idle',
    players: {},
    lastTime: Date.now(),
    history: [],
    characters: {},
    charInfo: {},
    stats: {},
    processing: false,
    isAI: false,
    aiDifficulty: 'normal',
    currentTurn: null,
    tournament: {
        active: false,
        id: null,
        matches: [],
        readyStatus: {},
        currentMatchID: null,
        round: 1
    }
  };
}

function extractJSON(input) {
  if (!input) return null;
  let str = typeof input === 'string' ? input : JSON.stringify(input);
  try { return JSON.parse(str); } 
  catch { const match = str.match(/\{[\s\S]*\}/); return match ? JSON.parse(match[0]) : null; }
}

async function apiPost(url, data, headers = {}, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await axios.post(url, data, { headers, timeout: 60000 });
      if (response.status === 200) return response;
      throw new Error(`Status: ${response.status}`);
    } catch (err) {
      if (err.response && err.response.data) throw err;
      if (i === retries - 1) throw err;
      await new Promise(r => setTimeout(r, 2000));
    }
  }
}

async function getAvatar(usersData, uid) {
    try {
        if (uid === 'IA' || uid === BOT_UID) {
            try { return await Canvas.loadImage(await usersData.getAvatarUrl(BOT_UID)); } 
            catch { return null; }
        }
        const url = await usersData.getAvatarUrl(uid);
        return await Canvas.loadImage(url);
    } catch { return null; }
}

async function drawVS(p1, p2, usersData) {
    const width = 800;
    const height = 400;
    const canvas = Canvas.createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    const grd = ctx.createLinearGradient(0, 0, width, height);
    grd.addColorStop(0, '#200122');
    grd.addColorStop(1, '#6f0000');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, width, height);

    ctx.font = '100px Arial';
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.textAlign = 'center';
    ctx.fillText("VS", width / 2, height / 2 + 35);

    const img1 = await getAvatar(usersData, p1.uid);
    if (img1) {
        ctx.save(); ctx.beginPath(); ctx.arc(150, 200, 100, 0, Math.PI * 2);
        ctx.lineWidth = 5; ctx.strokeStyle = '#00ccff'; ctx.stroke();
        ctx.clip(); ctx.drawImage(img1, 50, 100, 200, 200); ctx.restore();
    }
    const img2 = await getAvatar(usersData, p2.uid);
    if (img2) {
        ctx.save(); ctx.beginPath(); ctx.arc(650, 200, 100, 0, Math.PI * 2);
        ctx.lineWidth = 5; ctx.strokeStyle = '#ff3300'; ctx.stroke();
        ctx.clip(); ctx.drawImage(img2, 550, 100, 200, 200); ctx.restore();
    }
    
    ctx.font = 'bold 30px Arial'; ctx.fillStyle = '#fff';
    ctx.fillText(p1.name.substring(0, 12), 150, 350);
    ctx.fillText(p2.name.substring(0, 12), 650, 350);

    const tmp = path.join(__dirname, 'cache', `vs_${Date.now()}.png`);
    await fs.writeFile(tmp, canvas.toBuffer());
    return fs.createReadStream(tmp);
}

async function drawParticipants(players, usersData) {
    const cols = 4;
    const rows = Math.ceil(players.length / cols);
    const width = 800;
    const height = 100 + (rows * 180);
    const canvas = Canvas.createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, width, height);
    
    ctx.font = 'bold 40px Arial';
    ctx.fillStyle = '#FFD700';
    ctx.textAlign = 'center';
    ctx.fillText(`PARTICIPANTS (${players.length}/16)`, width / 2, 60);

    let x = 100, y = 180;
    for (let i = 0; i < players.length; i++) {
        const p = players[i];
        const img = await getAvatar(usersData, p.uid);
        
        ctx.save();
        ctx.beginPath(); ctx.arc(x, y, 60, 0, Math.PI * 2);
        ctx.fillStyle = '#333'; ctx.fill();
        ctx.lineWidth = 3; ctx.strokeStyle = '#fff'; ctx.stroke();
        if (img) {
            ctx.clip(); ctx.drawImage(img, x-60, y-60, 120, 120);
        }
        ctx.restore();

        ctx.font = '20px Arial'; ctx.fillStyle = '#fff';
        ctx.fillText(p.name.substring(0, 10), x, y + 90);

        x += 200;
        if ((i + 1) % cols === 0) { x = 100; y += 180; }
    }
    const tmp = path.join(__dirname, 'cache', `part_${Date.now()}.png`);
    await fs.writeFile(tmp, canvas.toBuffer());
    return fs.createReadStream(tmp);
}

async function drawBracket(matches, round, usersData) {
    const matchWidth = 350;
    const matchHeight = 100;
    const gapY = 40;
    const groupGapY = 80;
    const totalPairs = Math.ceil(matches.length / 2);
    const contentHeight = (matches.length * matchHeight) + (matches.length * gapY) + (totalPairs * groupGapY);
    const height = Math.max(600, contentHeight + 200);
    const width = 1000;

    const canvas = Canvas.createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    const grd = ctx.createLinearGradient(0, 0, width, height);
    grd.addColorStop(0, '#141E30'); grd.addColorStop(1, '#243B55');
    ctx.fillStyle = grd; ctx.fillRect(0, 0, width, height);

    ctx.font = "bold 60px Arial"; ctx.fillStyle = '#FFD700'; ctx.textAlign = "center";
    ctx.fillText(`BRACKET - ROUND ${round}`, width / 2, 80);

    let currentY = 150;

    for (let i = 0; i < matches.length; i += 2) {
        const m1 = matches[i];
        const m2 = matches[i+1];

        const y1 = currentY;
        await drawMatchBox(ctx, m1, 50, y1, matchWidth, matchHeight, usersData);
        
        let y2 = y1 + matchHeight + gapY;
        if (m2) {
            await drawMatchBox(ctx, m2, 50, y2, matchWidth, matchHeight, usersData);
        }

        ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 4; ctx.beginPath();
        const connectorX = 50 + matchWidth;
        const connectorY1 = y1 + (matchHeight / 2);
        ctx.moveTo(connectorX, connectorY1); ctx.lineTo(connectorX + 50, connectorY1);

        if (m2) {
            const connectorY2 = y2 + (matchHeight / 2);
            ctx.moveTo(connectorX, connectorY2); ctx.lineTo(connectorX + 50, connectorY2);
            ctx.moveTo(connectorX + 50, connectorY1); ctx.lineTo(connectorX + 50, connectorY2);
            const midY = (connectorY1 + connectorY2) / 2;
            ctx.moveTo(connectorX + 50, midY); ctx.lineTo(connectorX + 100, midY);
            
            ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.strokeStyle = '#555'; ctx.lineWidth = 2;
            ctx.fillRect(connectorX + 100, midY - 25, 50, 50); ctx.strokeRect(connectorX + 100, midY - 25, 50, 50);
            ctx.font = '20px Arial'; ctx.fillStyle='#888'; ctx.textAlign='center';
            ctx.fillText("?", connectorX + 125, midY + 8);
        }
        ctx.stroke();
        currentY = y2 + matchHeight + groupGapY;
    }
    const tmp = path.join(__dirname, 'cache', `tree_${Date.now()}.png`);
    await fs.writeFile(tmp, canvas.toBuffer());
    return fs.createReadStream(tmp);
}

async function drawMatchBox(ctx, match, x, y, w, h, usersData) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = match.winner ? '#FFD700' : '#FFF'; ctx.lineWidth = match.winner ? 3 : 1;
    ctx.strokeRect(x, y, w, h);
    ctx.beginPath(); ctx.moveTo(x, y + h/2); ctx.lineTo(x + w, y + h/2); ctx.strokeStyle = '#555'; ctx.stroke();

    ctx.font = 'bold 20px Arial'; ctx.textAlign = 'left';
    ctx.fillStyle = (match.winner && match.winner === match.player1.uid) ? '#FFD700' : '#FFF';
    ctx.fillText(match.player1.name.substring(0,15), x + 60, y + 35);
    const img1 = await getAvatar(usersData, match.player1.uid);
    if(img1) ctx.drawImage(img1, x + 5, y + 5, 40, 40);

    if (match.player2) {
        ctx.fillStyle = (match.winner && match.winner === match.player2.uid) ? '#FFD700' : '#FFF';
        ctx.fillText(match.player2.name.substring(0,15), x + 60, y + 35 + h/2);
        const img2 = await getAvatar(usersData, match.player2.uid);
        if(img2) ctx.drawImage(img2, x + 5, y + 5 + h/2, 40, 40);
    } else {
        ctx.fillStyle = '#888'; ctx.fillText("BYE", x + 60, y + 35 + h/2);
    }
}

async function drawWinnerCard(winnerName, winnerUID, usersData) {
    const width = 1000;
    const height = 500;
    const canvas = Canvas.createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    const grd = ctx.createLinearGradient(0, 0, width, height);
    grd.addColorStop(0, '#1a1a1a'); grd.addColorStop(0.5, '#000000'); grd.addColorStop(1, '#1a1a1a');
    ctx.fillStyle = grd; ctx.fillRect(0, 0, width, height);

    ctx.globalAlpha = 0.2; ctx.fillStyle = '#FFD700'; ctx.beginPath();
    ctx.arc(width / 2, height / 2, 250, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1.0;

    ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 8; ctx.strokeRect(10, 10, width - 20, height - 20);

    ctx.font = 'bold 80px Arial'; ctx.fillStyle = '#FFD700'; ctx.textAlign = 'center';
    ctx.shadowColor = "rgba(255, 215, 0, 0.8)"; ctx.shadowBlur = 15;
    ctx.fillText("VICTOIRE", width / 2, 100); ctx.shadowBlur = 0;

    if (winnerUID && winnerUID !== 'IA') {
        try {
            const avatarUrl = await usersData.getAvatarUrl(winnerUID);
            const avatar = await Canvas.loadImage(avatarUrl);
            ctx.save(); ctx.beginPath(); ctx.arc(width / 2, height / 2, 110, 0, Math.PI * 2); 
            ctx.fillStyle = '#FFD700'; ctx.fill();
            ctx.beginPath(); ctx.arc(width / 2, height / 2, 105, 0, Math.PI * 2);
            ctx.clip(); ctx.drawImage(avatar, width / 2 - 105, height / 2 - 105, 210, 210); ctx.restore();
        } catch (e) {}
    } else {
        ctx.fillStyle = '#FF0000'; ctx.font = 'bold 100px Arial'; ctx.fillText("🤖", width / 2, height / 2 + 30);
    }

    ctx.font = 'bold 50px Arial'; ctx.fillStyle = '#FFFFFF'; ctx.textAlign = 'center';
    ctx.fillText(winnerName.toUpperCase(), width / 2, 430);

    const tmpPath = path.join(__dirname, 'cache', `winner_${Date.now()}.png`);
    await fs.writeFile(tmpPath, canvas.toBuffer());
    return fs.createReadStream(tmpPath);
}

module.exports = {
  config: {
    name: 'uchiha-storm',
    version: '14.0.0',
    author: 'L\'Uchiha Perdu',
    countDown: 5,
    role: 0,
    shortDescription: { en: 'Jeu de combat textuel multivers' },
    description: { en: 'Jeu de combat géré par IA arbitre.' },
    category: 'Game',
    guide: { en: '{pn} menu' }
  },

  onStart: async function ({ api, event, message, usersData, args }) {
    const { threadID, senderID } = event;
    const prefix = global.GoatBot?.config?.prefix || '!';
    let userData = await usersData.get(senderID) || {};
    const senderName = userData.name || 'Utilisateur';
    const stateDir = path.join(__dirname, 'cache');
    await fs.ensureDir(stateDir);
    const stateFile = path.join(stateDir, `uchiha_storm_state_${threadID}.json`);
    const menuImgPath = path.join(stateDir, 'menu_uchiha.png');
    
    let state = getInitialState();
    if (await fs.pathExists(stateFile)) {
      try { state = JSON.parse(await fs.readFile(stateFile)); } 
      catch { state = getInitialState(); await fs.writeFile(stateFile, JSON.stringify(state, null, 2)); }
    } else { await fs.writeFile(stateFile, JSON.stringify(state, null, 2)); }

    const command = args[0]?.toLowerCase() || '';

    if (state.status !== 'idle' && Date.now() - (state.lastTime || 0) > 300000) {
      state = getInitialState();
      await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
    }

    if (!command || command === 'menu') {
      let attachment;
      try {
          if (!await fs.pathExists(menuImgPath)) {
              const response = await axios.get(IMAGE_URL, { responseType: 'arraybuffer' });
              await fs.writeFile(menuImgPath, response.data);
          }
          attachment = fs.createReadStream(menuImgPath);
      } catch (e) {}

      await message.reply({
        body: formatMessage(`Bienvenue à Uchiha Storm, ${senderName} !\n\nTapez "${prefix}${this.config.name} menu"`),
        attachment
      });
      return;
    }

    if (command === 'menu') {
      await message.reply(formatMessage(
        `Menu Uchiha Storm :\n\n` +
        `start : Lancer un combat\n` +
        `start ia [difficulty] : Combat contre IA\n` +
        `tournament create : Créer un tournoi\n` +
        `tournament join [ID] : Rejoindre\n` +
        `tournament start [ID] : Démarrer un tournoi\n` +
        `stop : Arrêter la partie`
      ));
      return;
    }

    if (command === 'stop') {
      if (state.status !== 'idle') {
        await message.reply(formatMessage(`Partie arrêtée par ${senderName} !`));
        state = getInitialState();
        await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
        await fs.unlink(stateFile).catch(() => {});
      } else {
        await message.reply(formatMessage("Aucune partie en cours."));
      }
      return;
    }

    if (command === 'start') {
      state = getInitialState();
      state.players.player1 = { uid: senderID, name: senderName };
      
      const mentions = event.mentions || {};
      if (Object.keys(mentions).includes(BOT_UID)) {
          args[1] = 'ia'; args[2] = 'normal';
      }

      if (args[1] === 'ia') {
        const difficulty = args[2]?.toLowerCase() || 'normal';
        state.players.player2 = { uid: 'IA', name: 'IA Adversaire' };
        state.status = 'choosing_char1';
        state.isAI = true;
        state.aiDifficulty = difficulty;
        state.lastTime = Date.now();
        await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
        const vsImg = await drawVS(state.players.player1, { uid: BOT_UID, name: 'IA' }, usersData);
        await message.reply({ 
            body: formatMessage(`MODE IA (${difficulty}) !\n\n${senderName}, choisissez votre personnage.`),
            attachment: vsImg 
        });
        return;
      } else {
        state.status = 'waiting_opponent';
        state.isAI = false;
        state.lastTime = Date.now();
        await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
        await message.reply(formatMessage(
          `${senderName} a lancé un combat !\n\n` +
          `Pour rejoindre :\n- Envoyez "join"\n- Ou taggez un adversaire\n- Ou envoyez son ID`
        ));
        return;
      }
    }

    if (command === 'tournament') {
      if (args[1] === 'create') {
        const res = await apiPost(`${API_URL}/tournament/create`, { creatorUID: senderID, creatorName: senderName }, { 'x-api-key': API_KEY });
        await message.reply(formatMessage(`Tournoi créé !\n\nID: ${res.data.tournamentID}\nRejoindre: ${prefix}${this.config.name} tournament join ${res.data.tournamentID}`));
        return;
      }

      if (args[1] === 'join' && args[2]) {
        try {
          const res = await apiPost(`${API_URL}/tournament/join`, { tournamentID: args[2], uid: senderID, name: senderName }, { 'x-api-key': API_KEY });
          const players = res.data.players;
          if (players.length > 16) return message.reply(formatMessage("Tournoi complet (16 max)."));
          
          const partImg = await drawParticipants(players, usersData);
          await message.reply({ 
              body: formatMessage(`Vous avez rejoint !\n\nParticipants (${players.length})`), 
              attachment: partImg 
          });
        } catch (err) {
          await message.reply(formatMessage(`Erreur inscription`));
        }
        return;
      }

      if (args[1] === 'start' && args[2]) {
        try {
          const res = await apiPost(`${API_URL}/tournament/start`, { tournamentID: args[2] }, { 'x-api-key': API_KEY });
          const brackets = res.data.brackets;
          const round = res.data.round || 1;
          state = getInitialState();
          state.tournament = { active: true, id: args[2], matches: brackets, round: round, readyStatus: {} };
          state.status = 'tournament_lobby';
          await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
          const bracketImage = await drawBracket(brackets, round, usersData);
          let msg = `🏆 Tournoi démarré (Round ${round}) !\n\n`;
          brackets.forEach(m => msg += `${m.player1.name} vs ${m.player2 ? m.player2.name : 'BYE'}\n`);
          msg += `\nLes combattants, envoyez "prêt" !`;
          await message.reply({ body: formatMessage(msg), attachment: bracketImage });
        } catch (err) {
            if (err.response?.data?.error === 'Nombre impair') return message.reply(formatMessage(`Impossible : Nombre impair.`));
            await message.reply(formatMessage(`Erreur démarrage tournoi.`));
        }
        return;
      }
    }
    await message.reply(formatMessage(`Commande inconnue. Tapez "${prefix}${this.config.name} menu"`));
  },

  onChat: async function ({ event, api, message, usersData }) {
    if (!event.body) return;
    const { body, senderID, threadID, mentions } = event;
    const txt = body.toLowerCase().trim();
    const stateDir = path.join(__dirname, 'cache');
    const stateFile = path.join(stateDir, `uchiha_storm_state_${threadID}.json`);
    
    if (!await fs.pathExists(stateFile)) return;
    let state = JSON.parse(await fs.readFile(stateFile));

    if (state.status === 'idle') return;

    if (Date.now() - (state.lastTime || 0) > 300000) {
      const winner = state.currentTurn === 'player1' ? (state.players.player2?.name || 'Joueur 2') : (state.players.player1?.name || 'Joueur 1');
      await message.reply(formatMessage(`Temps écoulé !\n\n${winner} gagne par forfait !`));
      if (state.tournament?.active && state.tournament?.currentMatchID) {
          const winnerUID = winner === state.players.player1.name ? state.players.player1.uid : state.players.player2.uid;
          await processTournamentMatchEnd(state, winner, winnerUID, threadID, message, usersData, stateFile);
          return;
      }
      state = getInitialState();
      await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
      await fs.unlink(stateFile).catch(() => {});
      return;
    }

    if (['stop', 'forfait', 'fin'].includes(txt)) {
      const winner = senderID === state.players.player1.uid ? (state.players.player2?.name || 'Joueur 2') : (state.players.player1?.name || 'Joueur 1');
      await message.reply(formatMessage(`${userData.name || 'Joueur'} abandonne !\n\n${winner} gagne par forfait !`));
      if (state.tournament?.active && state.tournament?.currentMatchID) {
          const winnerUID = winner === state.players.player1.name ? state.players.player1.uid : state.players.player2.uid;
          await processTournamentMatchEnd(state, winner, winnerUID, threadID, message, usersData, stateFile);
          return;
      }
      state = getInitialState();
      await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
      await fs.unlink(stateFile).catch(() => {});
      return;
    }

    if (state.tournament?.active && txt === 'prêt') {
        if (state.status !== 'tournament_lobby' && state.status !== 'idle') {
            return message.reply(formatMessage(`Un combat est déjà en cours !\nAttendez la fin du match actuel.`));
        }
        const matches = state.tournament.matches;
        const matchIndex = matches.findIndex(m => (m.player1.uid === senderID || m.player2.uid === senderID) && !m.winner);
        if (matchIndex === -1) return; 
        state.tournament.readyStatus[senderID] = true;
        const match = matches[matchIndex];
        const p1Ready = state.tournament.readyStatus[match.player1.uid];
        const p2Ready = state.tournament.readyStatus[match.player2.uid];
        if (p1Ready && p2Ready) {
            await message.reply(formatMessage(`🔴 MATCH LANCÉ : ${match.player1.name} VS ${match.player2.name} !\n\n${match.player1.name}, choisissez votre personnage.`));
            const tBackup = { ...state.tournament };
            state = getInitialState();
            state.tournament = tBackup; 
            state.tournament.currentMatchID = match.matchID;
            state.players.player1 = match.player1;
            state.players.player2 = match.player2;
            state.status = 'choosing_char1';
            state.currentTurn = 'player1';
            state.lastTime = Date.now();
        } else {
             await message.reply(formatMessage(`${userData.name || 'Joueur'} est prêt ! En attente de l'adversaire...`));
        }
        await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
        return;
    }

    if (txt === 'join' && state.status === 'waiting_opponent') {
      if (state.players.player1.uid === senderID) return message.reply(formatMessage("Vous ne pouvez pas jouer contre vous-même."));
      let userData = await usersData.get(senderID) || {};
      state.players.player2 = { uid: senderID, name: userData.name || 'Utilisateur' };
      state.status = 'choosing_char1';
      state.lastTime = Date.now();
      await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
      const vsImg = await drawVS(state.players.player1, state.players.player2, usersData);
      await message.reply({ 
          body: formatMessage(`${userData.name} a rejoint !\n\nJoueur 1 (${state.players.player1.name}), choisissez un personnage.`), 
          attachment: vsImg 
      });
      return;
    }

    const playerUIDs = [state.players.player1?.uid, state.players.player2?.uid].filter(Boolean);
    if (!playerUIDs.includes(senderID)) return;

    if (state.status === 'waiting_opponent' && senderID === state.players.player1.uid) {
      let opponentUID = Object.keys(mentions)[0] || txt.replace(/\D/g, '');
      if (!opponentUID || opponentUID === senderID) return message.reply(formatMessage(`UID invalide.`));
      try {
        const oppData = await usersData.get(opponentUID) || {};
        state.players.player2 = { uid: opponentUID, name: oppData.name || 'Utilisateur' };
        state.status = 'choosing_char1';
        state.lastTime = Date.now();
        await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
        const vsImg = await drawVS(state.players.player1, state.players.player2, usersData);
        await message.reply({ 
            body: formatMessage(`Combat : Joueur 1 (${state.players.player1.name}) vs Joueur 2 (${state.players.player2.name})\n\nJoueur 1, choisissez un personnage.`),
            attachment: vsImg 
        });
      } catch {
        await message.reply(formatMessage('Utilisateur non trouvé.'));
      }
      return;
    }

    if (state.processing) return;

    if ((state.status === 'choosing_char1' && senderID === state.players.player1.uid) || (state.status === 'choosing_char2' && senderID === state.players.player2.uid)) {
      state.processing = true;
      await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
      const char = body.trim();
      const isP1 = senderID === state.players.player1.uid;
      try {
        const res = await apiPost(`${API_URL}/character`, { character: char }, { 'x-api-key': API_KEY });
        let charData = extractJSON(res.data) || res.data;
        if (!charData?.valid) {
          state.processing = false;
          await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
          return message.reply(formatMessage(`Personnage invalide, suggestion: ${charData.suggested_char || 'réessayez.'}`));
        }
        if (isP1) {
            state.characters.player1 = char;
            state.charInfo.player1 = charData;
            state.status = 'choosing_char2';
        } else {
            state.characters.player2 = char;
            state.charInfo.player2 = charData;
        }
        state.lastTime = Date.now();
        await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
        
        if (isP1 && state.isAI) {
          await generateIaCharacter(state, stateFile, message, userData.name, threadID);
        } else if (isP1) {
          await message.reply(formatMessage(`Joueur 1 a choisi ${char} !\n\nJoueur 2 (${state.players.player2.name}), choisissez votre personnage.`));
        } else {
          await initCombat(state, stateFile, message, threadID);
        }
      } catch (err) {
        state = getInitialState();
        await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
        await message.reply(formatMessage(`Erreur API. Reset.`));
        await fs.unlink(stateFile).catch(() => {});
      } finally {
        if (state.status !== 'idle') {
            state.processing = false;
            await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
        }
      }
      return;
    }

    const isPlayerTurn = state.status === 'combat' || state.status === 'riposte';
    const isCorrectPlayer = state.currentTurn && state.players[state.currentTurn]?.uid === senderID;

    if (isPlayerTurn && isCorrectPlayer) {
      state.processing = true;
      await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
      try {
        await handleAction(event, api, state, stateFile, state.status === 'riposte', threadID, message, usersData);
        if (state.status !== 'idle' && state.currentTurn === 'player2' && state.isAI) {
          await iaTurn(api, state, stateFile, threadID, message, usersData);
        }
      } finally {
        if (state.status !== 'idle') {
            state.processing = false;
            await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
        }
      }
      return;
    }
  }
};

async function generateIaCharacter(state, stateFile, message, senderName, threadID) {
  try {
    const res = await apiPost(`${API_URL}/character`, { character: 'generate_for_ai', opponent_char: state.characters.player1, opponent_power_level: state.charInfo.player1.power_level, aiDifficulty: state.aiDifficulty }, { 'x-api-key': API_KEY });
    let charData = extractJSON(res.data) || res.data;
    state.characters.player2 = charData.suggested_char;
    state.charInfo.player2 = charData;
    await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
    await message.reply(formatMessage(`L'IA a choisi ${charData.suggested_char} !\n\nLe combat commence ! À vous, ${senderName}.`));
    await initCombat(state, stateFile, message, threadID);
  } catch {
    state.status = 'idle';
    await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
    await message.reply(formatMessage(`Erreur génération IA.`));
  }
}

async function initCombat(state, stateFile, message, threadID) {
  state.stats = { player1: initStats(state.charInfo.player1), player2: initStats(state.charInfo.player2) };
  try {
    const preRes = await apiPost(`${API_URL}/pre-combat-check`, { char1: state.characters.player1, char2: state.characters.player2, info1: state.charInfo.player1, info2: state.charInfo.player2, player1_name: state.players.player1.name, player2_name: state.players.player2.name }, { 'x-api-key': API_KEY });
    const preResult = extractJSON(preRes.data) || { decision: "normal_combat" };
    if (preResult.decision === "instant_one_shot") {
      const winnerName = state.players[preResult.winner].name;
      await message.reply(formatMessage(`${preResult.description}\n\nONE-SHOT INSTANTANÉ !\n${winnerName} anéantit l'adversaire !\nRaison : ${preResult.one_shot_reason}`));
      const winnerCard = await drawWinnerCard(winnerName, state.players[preResult.winner].uid, {}); 
      await message.reply({ attachment: winnerCard });
      await saveCombat(state, winnerName, threadID);
      
      const tBackup = state.tournament?.active ? state.tournament : null;
      state = getInitialState();
      if(tBackup) state.tournament = tBackup;
      await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
      
      if (!tBackup) await fs.unlink(stateFile).catch(() => {});
      return;
    }
  } catch (err) {}
  await message.reply(formatMessage(`Le combat commence ! À vous, ${state.players.player1.name}.`));
  state.status = 'combat';
  state.currentTurn = 'player1';
  state.lastTime = Date.now();
  state.processing = false;
  await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
}

async function iaTurn(api, state, stateFile, threadID, message, usersData) {
  state.processing = true;
  await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
  try {
    const res = await apiPost(`${API_URL}/combat`, { player1: state.players.player1, player2: state.players.player2, char1: state.characters.player1, char2: state.characters.player2, stats: state.stats, history: state.history, action: 'IA_TURN', isRiposte: false, privilegedUID: state.players.player1.uid, isAI: true, currentTurn: 'player2', aiDifficulty: state.aiDifficulty }, { 'x-api-key': API_KEY });
    const result = res.data;
    if (result.decision === 'ignore_message') return;
    state.stats = result.stats || state.stats;
    state.history.push({ action: `IA: ${result.taunt || 'Action IA'}`, result });
    const pv1 = state.stats.player1?.pv ?? 100;
    const pv2 = state.stats.player2?.pv ?? 100;
    const display = `${result.description}\n\nPV restants :\n- ${state.players.player1.name}: ${pv1} PV\n- IA: ${pv2} PV\n\nEffets: ${result.impact?.effets_speciaux?.join(', ') || 'Aucun'}`;
    await message.reply(formatMessage(display));

    if (result.decision === 'one_shot' || result.decision === 'combat_termine') {
      const winner = result.decision === 'one_shot' ? (result.winner === 'player1' ? state.players.player1.name : 'IA') : (pv1 > 0 ? state.players.player1.name : 'IA');
      const winnerUID = winner === state.players.player1.name ? state.players.player1.uid : 'IA';
      await message.reply(formatMessage(`Combat terminé !${result.decision === 'one_shot' ? ` ONE-SHOT! ${result.one_shot_reason}` : ''}`));
      const winnerCard = await drawWinnerCard(winner, winnerUID, usersData);
      await message.reply({ attachment: winnerCard });
      await saveCombat(state, winner, threadID);
      
      const cleanState = getInitialState();
      await fs.writeFile(stateFile, JSON.stringify(cleanState, null, 2));
      await fs.unlink(stateFile).catch(() => {});
      state.status = 'idle';
      return;
    }
    state.status = result.decision === 'attente_riposte' ? 'riposte' : 'combat';
    state.currentTurn = 'player1';
    await message.reply(formatMessage(`À vous maintenant !`));
  } finally {
    if (state.status !== 'idle') {
        state.processing = false;
        state.lastTime = Date.now();
        await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
    }
  }
}

function initStats(info = {}) {
  return { pv: 100, endurance: 100, ...(info.resource_name && info.resource_name !== 'none' ? { [info.resource_name]: 100 } : {}) };
}

async function handleAction(event, api, state, stateFile, isRiposte, threadID, message, usersData) {
  const { body, senderID } = event;
  const action = body.trim();
  let retries = 3;
  let res;
  while (retries > 0) {
    try {
      res = await apiPost(`${API_URL}/combat`, { player1: state.players.player1, player2: state.players.player2, char1: state.characters.player1, char2: state.characters.player2, stats: state.stats, history: state.history, action, isRiposte, privilegedUID: senderID, isAI: state.isAI, currentTurn: state.currentTurn, aiDifficulty: state.aiDifficulty }, { 'x-api-key': API_KEY });    
      break;
    } catch (err) {
      retries--;
      if (retries === 0) {
        state.status = 'idle';
        await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
        await message.reply(formatMessage(`Erreur API. Combat annulé.`));
        await fs.unlink(stateFile).catch(() => {});
        return;
      }
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  const result = res.data;
  if (result.decision === 'ignore_message') return;

  state.stats = result.stats || state.stats;
  state.history.push({ action: isRiposte ? `Riposte: ${action}` : action, result });
  const p1Name = state.players.player1.name;
  const p2Name = state.players.player2.name;
  const pv1 = state.stats.player1?.pv ?? 100;
  const pv2 = state.stats.player2?.pv ?? 100;
  const display = `${result.description}\n\nPV restants :\n- ${p1Name}: ${pv1} PV\n- ${p2Name}: ${pv2} PV\n\nEffets: ${result.impact?.effets_speciaux?.join(', ') || 'Aucun'}`;
  await message.reply(formatMessage(display));

  if (result.decision === 'one_shot' || result.decision === 'combat_termine') {
    const winnerName = result.decision === 'one_shot' ? (result.winner === 'player1' ? p1Name : p2Name) : (pv1 > 0 ? p1Name : p2Name);
    const winnerUID = result.decision === 'one_shot' ? (result.winner === 'player1' ? state.players.player1.uid : state.players.player2.uid) : (pv1 > 0 ? state.players.player1.uid : state.players.player2.uid);
    
    await message.reply(formatMessage(`Combat terminé !${result.decision === 'one_shot' ? ` ONE-SHOT! ${result.one_shot_reason}` : ''}\nVainqueur : ${winnerName}`));
    const winnerCard = await drawWinnerCard(winnerName, winnerUID, usersData);
    await message.reply({ attachment: winnerCard });
    await saveCombat(state, winnerName, threadID);

    if (state.tournament?.active && state.tournament?.currentMatchID) {
        await processTournamentMatchEnd(state, winnerName, winnerUID, threadID, message, usersData, stateFile);
        return; 
    }
    
    state = getInitialState();
    await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
    await fs.unlink(stateFile).catch(() => {});
    return;
  }

  if (result.decision === 'attente_riposte') {
    state.status = 'riposte';
    state.currentTurn = state.currentTurn === 'player1' ? 'player2' : 'player1';
    await message.reply(formatMessage(`${state.players[state.currentTurn].name}, ripostez !\nOptions: ${result.possible_actions.join(', ')}`));
  } else {
    state.status = 'combat';
    state.currentTurn = state.currentTurn === 'player1' ? 'player2' : 'player1';
    await message.reply(formatMessage(`${state.players[state.currentTurn].name}, à vous !`));
  }
  state.lastTime = Date.now();
  await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
}

async function processTournamentMatchEnd(state, winnerName, winnerUID, threadID, message, usersData, stateFile) {
    const upRes = await apiPost(`${API_URL}/tournament/update`, { tournamentID: state.tournament.id, matchID: state.tournament.currentMatchID, winnerUID: winnerUID }, { 'x-api-key': API_KEY });
    
    const nextTournamentState = {
        active: true,
        id: state.tournament.id,
        matches: upRes.data.brackets,
        round: upRes.data.round,
        readyStatus: {},
        currentMatchID: null
    };

    if (upRes.data.status === 'finished') {
         await message.reply(formatMessage(`🎉 LE TOURNOI EST TERMINÉ !\nLE GRAND VAINQUEUR EST : ${winnerName.toUpperCase()} !`));
         state = getInitialState(); 
         await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
         await fs.unlink(stateFile).catch(() => {});
    } else if (upRes.data.status === 'next_round') {
         const bracketImage = await drawBracket(nextTournamentState.matches, nextTournamentState.round, usersData);
         await message.reply({ 
             body: formatMessage(`TOUS LES MATCHS SONT FINIS !\nLancement du ROUND ${nextTournamentState.round} !\n\nSurvivants, envoyez "prêt" !`), 
             attachment: bracketImage 
         });
         state = getInitialState();
         state.tournament = nextTournamentState;
         state.status = 'tournament_lobby';
         await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
    } else {
         const bracketImage = await drawBracket(upRes.data.brackets, state.tournament.round, usersData);
         await message.reply({ body: formatMessage(`Match terminé ! En attente des autres combats...`), attachment: bracketImage });
         state = getInitialState();
         state.tournament = nextTournamentState; 
         state.tournament.readyStatus = state.tournament.readyStatus || {}; 
         state.status = 'tournament_lobby';
         await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
    }
}

async function saveCombat(state, winner, threadID) {
  try {
    await apiPost(`${API_URL}/save-combat`, { threadID, players: state.players, characters: state.characters, charInfo: state.charInfo, history: state.history, winner, status: 'finished' }, { 'x-api-key': API_KEY });
  } catch (err) {}
}
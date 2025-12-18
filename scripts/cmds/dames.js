const fetch = require('node-fetch');
const fs = require('fs-extra');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');

const STATS_FILE = path.join(__dirname, 'dames_stats.json');
const ASSETS_DIR = path.join(__dirname, 'dames_assets');

const configPath = path.join(__dirname, "config.json");
const { BOT_UID } = JSON.parse(fs.readFileSync(configPath, "utf-8"));
const BOT_NAME = "Hedgehog GPT";

const damierGames = {};
const tournaments = {};
const imageModeByThread = {};
const playerCache = new Map();

const EMPTY = "🟩";
const PION_B = "⚪";
const PION_N = "⚫";
const DAME_B = "🔵";
const DAME_N = "🔴";

const DAMES_API_URL = "https://dames-api.vercel.app";

if (!fs.existsSync(ASSETS_DIR)) {
  fs.mkdirSync(ASSETS_DIR, { recursive: true });
}

function loadStats() {
  try {
    if (fs.existsSync(STATS_FILE)) {
      return JSON.parse(fs.readFileSync(STATS_FILE, 'utf8') || '{}');
    }
  } catch (e) {
    return {};
  }
  return {};
}

let playerStats = loadStats();

function saveStats() {
  try {
    fs.writeFileSync(STATS_FILE, JSON.stringify(playerStats, null, 2));
  } catch (e) {}
}

function ensurePlayerStats(id) {
  if (!playerStats[id]) playerStats[id] = { wins: 0, losses: 0, draws: 0, played: 0 };
}

function createDamierBoard() {
  const board = Array.from({ length: 8 }, () => Array(8).fill(EMPTY));
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 8; j++) {
      if ((i + j) % 2 === 1) board[i][j] = PION_N;
    }
  }
  for (let i = 5; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      if ((i + j) % 2 === 1) board[i][j] = PION_B;
    }
  }
  return board;
}

function displayDamier(board) {
  let s = "  a b c d e f g h\n";
  for (let i = 0; i < 8; i++) {
    s += (8 - i) + " ";
    for (let j = 0; j < 8; j++) {
      s += board[i][j] + " ";
    }
    s += "\n";
  }
  return s;
}

function parseDamierMove(move) {
  const regex = /^([a-h][1-8])\s+([a-h][1-8])$/i;
  const match = move.match(regex);
  if (!match) return null;
  const pos = (p) => {
    p = p.toLowerCase();
    const file = p.charCodeAt(0) - 97; // a->0
    const rank = Number(p[1]); // '1'..'8'
    return [8 - rank, file];
  };
  return [pos(match[1]), pos(match[2])];
}

function isInside(x, y) {
  return x >= 0 && x < 8 && y >= 0 && y < 8;
}

function hasPieces(board, pion, dame) {
  return board.flat().some(cell => cell === pion || cell === dame);
}

function isValidMoveDamier(board, from, to, player) {
  const [fx, fy] = from, [tx, ty] = to;
  if (!isInside(fx, fy) || !isInside(tx, ty)) return false;
  const piece = board[fx][fy];
  if (!piece || board[tx][ty] !== EMPTY) return false;

  // PION BLANC (monte vers le haut : fx decreases)
  if (piece === PION_B) {
    if (fx - tx === 1 && Math.abs(ty - fy) === 1) return true;
    if (fx - tx === 2 && Math.abs(ty - fy) === 2) {
      const midX = fx - 1;
      const midY = fy + (ty - fy) / 2;
      if (!Number.isInteger(midY)) return false;
      if (board[midX][midY] === PION_N || board[midX][midY] === DAME_N) return "prise";
    }
  }
  // PION NOIR (descend : tx greater)
  if (piece === PION_N) {
    if (tx - fx === 1 && Math.abs(ty - fy) === 1) return true;
    if (tx - fx === 2 && Math.abs(ty - fy) === 2) {
      const midX = fx + 1;
      const midY = fy + (ty - fy) / 2;
      if (!Number.isInteger(midY)) return false;
      if (board[midX][midY] === PION_B || board[midX][midY] === DAME_B) return "prise";
    }
  }
  // DAME BLANCHE
  if (piece === DAME_B) {
    if (Math.abs(fx - tx) === Math.abs(fy - ty)) {
      const dx = tx > fx ? 1 : -1, dy = ty > fy ? 1 : -1;
      let x = fx + dx, y = fy + dy, found = false;
      while (x !== tx && y !== ty) {
        if (board[x][y] === PION_N || board[x][y] === DAME_N) {
          if (found) return false;
          found = true;
        } else if (board[x][y] !== EMPTY) return false;
        x += dx; y += dy;
      }
      return found ? "prise" : true;
    }
  }
  // DAME NOIRE
  if (piece === DAME_N) {
    if (Math.abs(fx - tx) === Math.abs(fy - ty)) {
      const dx = tx > fx ? 1 : -1, dy = ty > fy ? 1 : -1;
      let x = fx + dx, y = fy + dy, found = false;
      while (x !== tx && y !== ty) {
        if (board[x][y] === PION_B || board[x][y] === DAME_B) {
          if (found) return false;
          found = true;
        } else if (board[x][y] !== EMPTY) return false;
        x += dx; y += dy;
      }
      return found ? "prise" : true;
    }
  }
  return false;
}

function checkPromotion(board) {
  for (let j = 0; j < 8; j++) {
    if (board[0][j] === PION_B) board[0][j] = DAME_B;
    if (board[7][j] === PION_N) board[7][j] = DAME_N;
  }
}

function getLocalLegalMoves(board, player) {
  const moves = [];
  const myPion = player === 0 ? PION_B : PION_N;
  const myDame = player === 0 ? DAME_B : DAME_N;
  for (let fx = 0; fx < 8; fx++) {
    for (let fy = 0; fy < 8; fy++) {
      if ([myPion, myDame].includes(board[fx][fy])) {
        for (let tx = 0; tx < 8; tx++) {
          for (let ty = 0; ty < 8; ty++) {
            if ((fx !== tx || fy !== ty)) {
              const valid = isValidMoveDamier(board, [fx, fy], [tx, ty], player === 0 ? "blanc" : "noir");
              if (valid) moves.push([[fx, fy], [tx, ty]]);
            }
          }
        }
      }
    }
  }
  return moves;
}

async function getAllLegalMoves(board, player) {
  const playerColor = player === 0 ? "blanc" : "noir";
  try {
    const response = await fetch(`${DAMES_API_URL}/moves`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ board: board, player: playerColor })
    });
    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    const apiMoves = await response.json();
    if (Array.isArray(apiMoves) && apiMoves.every(m =>
      Array.isArray(m) && m.length === 2 &&
      Array.isArray(m[0]) && m[0].length === 2 &&
      Array.isArray(m[1]) && m[1].length === 2
    )) {
      return apiMoves;
    } else {
      return getLocalLegalMoves(board, player);
    }
  } catch (error) {
    return getLocalLegalMoves(board, player);
  }
}

async function getPlayerInfo(uid, usersData) {
  if (uid === 'AI') {
    try {
      const avatarUrl = await usersData.getAvatarUrl(BOT_UID);
      const avatar = await loadImage(avatarUrl);
      return { avatar, name: BOT_NAME, uid: 'AI' };
    } catch {
      return { avatar: null, name: BOT_NAME, uid: 'AI' };
    }
  }
  const numericUid = Number(uid);
  if (isNaN(numericUid)) {
    return { avatar: null, name: `Joueur ${uid}`, uid };
  }
  if (playerCache.has(numericUid)) return playerCache.get(numericUid);
  try {
    const avatarUrl = await usersData.getAvatarUrl(numericUid);
    const avatar = avatarUrl ? await loadImage(avatarUrl) : null;
    const name = (await usersData.getName(numericUid)) || `Joueur ${numericUid}`;
    const info = { avatar, name, uid: numericUid };
    playerCache.set(numericUid, info);
    setTimeout(() => playerCache.delete(numericUid), 300000);
    return info;
  } catch (error) {
    const info = { avatar: null, name: `Joueur ${numericUid}`, uid: numericUid };
    playerCache.set(numericUid, info);
    return info;
  }
}

async function generateBoardImage(board, currentPlayer, players, usersData, gameType = "normal") {
  try {
    const canvasWidth = 1400;
    const canvasHeight = 1200;
    const canvas = createCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createLinearGradient(0, 0, canvasWidth, canvasHeight);
    gradient.addColorStop(0, '#1a0a0a');
    gradient.addColorStop(1, '#2a1a1e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    if (gameType === "tournament") {
      ctx.fillStyle = 'rgba(255, 215, 0, 0.1)';
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      ctx.font = 'bold 45px Arial';
      ctx.fillStyle = '#FFD700';
      ctx.textAlign = 'center';
      ctx.fillText('◆━━━━━▣✦▣━━━━━━◆', canvasWidth/2, 60);
      ctx.fillText('🏆 TOURNOI DAMES 🏆', canvasWidth/2, 120);
      ctx.fillText('◆━━━━━▣✦▣━━━━━━◆', canvasWidth/2, 180);
    }

    const playerInfos = await Promise.all(players.map(p => getPlayerInfo(p.id, usersData)));

    const boardSize = 640;
    const cellSize = boardSize / 8;
    const boardX = canvasWidth/2 - boardSize/2;
    const boardY = 250;

    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        ctx.fillStyle = (i + j) % 2 === 0 ? '#e8d4b0' : '#8b4513';
        ctx.fillRect(boardX + j * cellSize, boardY + i * cellSize, cellSize, cellSize);
      }
    }

    ctx.font = 'bold 60px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        const piece = board[i][j];
        const x = boardX + j * cellSize + cellSize/2;
        const y = boardY + i * cellSize + cellSize/2;
        if (piece !== EMPTY) {
          ctx.fillText(piece, x, y);
        }
      }
    }

    ctx.font = 'bold 28px Arial';
    ctx.fillStyle = '#FFFFFF';
    for (let i = 0; i < 8; i++) {
      ctx.fillText(String.fromCharCode(97 + i), boardX + i * cellSize + cellSize/2, boardY - 20);
      ctx.fillText(8 - i, boardX - 30, boardY + i * cellSize + cellSize/2);
    }

    const avatarSize = 120;
    const infoWidth = 350;

    for (let i = 0; i < 2; i++) {
      const player = playerInfos[i];
      const playerData = players[i];
      const isCurrent = currentPlayer && String(currentPlayer.id) === String(playerData.id);
      const panelX = i === 0 ? 100 : canvasWidth - infoWidth - 100;
      const panelY = 950;
      const panelHeight = 200;
      
      ctx.fillStyle = isCurrent ? 'rgba(76, 201, 240, 0.15)' : 'rgba(255, 255, 255, 0.05)';
      ctx.fillRect(panelX, panelY, infoWidth, panelHeight);
      ctx.strokeStyle = isCurrent ? '#4cc9f0' : 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 4;
      ctx.strokeRect(panelX, panelY, infoWidth, panelHeight);
      
      if (player.avatar) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(panelX + infoWidth/2, panelY + 60, avatarSize/2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(player.avatar, panelX + infoWidth/2 - avatarSize/2, panelY + 60 - avatarSize/2, avatarSize, avatarSize);
        ctx.restore();
        ctx.strokeStyle = playerData.color === 'blanc' ? '#FFFFFF' : '#000000';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(panelX + infoWidth/2, panelY + 60, avatarSize/2, 0, Math.PI * 2);
        ctx.stroke();
      }
      
      ctx.font = 'bold 28px Arial';
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.fillText(player.name.substring(0, 20), panelX + infoWidth/2, panelY + 150);
      
      ctx.font = 'bold 40px Arial';
      ctx.fillStyle = playerData.color === 'blanc' ? '#FFFFFF' : '#FFD700';
      ctx.fillText(playerData.color === 'blanc' ? '⚪' : '⚫', panelX + infoWidth/2, panelY + 180);
      
      if (isCurrent) {
        ctx.font = 'bold 24px Arial';
        ctx.fillStyle = '#4cc9f0';
        ctx.fillText('⬅︎ TOUR ACTUEL', panelX + infoWidth/2, panelY + 220);
      }
    }

    return canvas.toBuffer();
  } catch (error) {
    return null;
  }
}

async function generateStatsImage(playerStatsData, playerId, usersData) {
  try {
    const playerInfo = await getPlayerInfo(playerId, usersData);
    const stats = playerStatsData[playerId] || { wins: 0, losses: 0, draws: 0, played: 0 };
    const winRate = stats.played > 0 ? Math.round((stats.wins / stats.played) * 100) : 0;

    const canvas = createCanvas(1400, 900);
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createLinearGradient(0, 0, 1400, 900);
    gradient.addColorStop(0, '#1a0a0a');
    gradient.addColorStop(1, '#2a1a1e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1400, 900);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(50, 50, 1300, 800);

    ctx.font = 'bold 55px Arial';
    ctx.fillStyle = '#FFD700';
    ctx.textAlign = 'center';
    ctx.fillText('◆━━━━━▣✦▣━━━━━━◆', 700, 60);
    ctx.fillText('📊 STATISTIQUES DAMES', 700, 130);
    ctx.fillText('◆━━━━━▣✦▣━━━━━━◆', 700, 200);

    if (playerInfo.avatar) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(700, 350, 100, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(playerInfo.avatar, 600, 250, 200, 200);
      ctx.restore();
    }

    ctx.font = 'bold 42px Arial';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.fillText(playerInfo.name, 700, 500);

    const statsLeft = 200;
    const statsTop = 580;

    ctx.font = 'bold 36px Arial';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'left';

    ctx.fillText(`🏆 Victoires: ${stats.wins}`, statsLeft, statsTop);
    ctx.fillText(`💀 Défaites: ${stats.losses}`, statsLeft, statsTop + 60);
    ctx.fillText(`🤝 Nuls: ${stats.draws}`, statsLeft, statsTop + 120);
    ctx.fillText(`🎮 Parties: ${stats.played}`, statsLeft, statsTop + 180);

    ctx.textAlign = 'right';
    ctx.fillStyle = winRate >= 50 ? '#00ff00' : winRate >= 30 ? '#ffff00' : '#ff6b6b';
    ctx.font = 'bold 42px Arial';
    ctx.fillText(`📈 Ratio: ${winRate}%`, 1200, statsTop);

    const barWidth = 600;
    const barHeight = 35;
    const barY = statsTop;
    const barX = 700;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fillRect(barX, barY, barWidth, barHeight * 4);

    if (stats.played > 0) {
      ctx.fillStyle = '#00ff00';
      const winsWidth = (stats.wins / stats.played) * barWidth;
      ctx.fillRect(barX, barY, winsWidth, barHeight);

      ctx.fillStyle = '#ff6b6b';
      const lossesWidth = (stats.losses / stats.played) * barWidth;
      ctx.fillRect(barX, barY + barHeight, lossesWidth, barHeight);

      ctx.fillStyle = '#ffff00';
      const drawsWidth = (stats.draws / stats.played) * barWidth;
      ctx.fillRect(barX, barY + (barHeight * 2), drawsWidth, barHeight);
    }

    ctx.font = 'bold 24px Arial';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'left';
    ctx.fillText('Victoires', barX + 10, barY + 25);
    ctx.fillText('Défaites', barX + 10, barY + barHeight + 25);
    ctx.fillText('Nuls', barX + 10, barY + (barHeight * 2) + 25);

    ctx.font = 'italic 28px Arial';
    ctx.fillStyle = '#888888';
    ctx.textAlign = 'center';
    ctx.fillText('Hedgehog GPT • Système Dames Ultimate', 700, 860);

    return canvas.toBuffer();
  } catch (error) {
    return null;
  }
}

async function sendImage(api, threadID, imageBuffer, text = "") {
  try {
    if (!imageBuffer) return;
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 12);
    const fileName = `dames_${timestamp}_${random}.png`;
    const filePath = path.join(ASSETS_DIR, fileName);
    await fs.writeFile(filePath, imageBuffer);
    await new Promise((resolve, reject) => {
      api.sendMessage({
        body: text,
        attachment: fs.createReadStream(filePath)
      }, threadID, (err) => {
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch (e) {}
        if (err) return reject(err);
        resolve();
      });
    });
  } catch (error) {}
}

async function botPlay(game, api, threadID, usersData) {
  const board = game.board;
  const moves = await getAllLegalMoves(board, 1);

  if (moves.length === 0) {
    game.inProgress = false;
    const winner = game.players[0];
    const loser = game.players[1];

    ensurePlayerStats(winner.id);
    ensurePlayerStats(loser.id);
    playerStats[winner.id].wins++;
    playerStats[winner.id].played++;
    playerStats[loser.id].losses++;
    playerStats[loser.id].played++;
    saveStats();

    if (game.imageMode) {
      const endImage = await generateBoardImage(board, winner, game.players, usersData);
      if (endImage) await sendImage(api, threadID, endImage, `🎉| ${winner.name} remporte la partie !`);
    } else {
      await api.sendMessage(
        `${displayDamier(board)}\n\n🎉| ${winner.name} remporte la partie !`,
        threadID
      );
    }
    delete damierGames[threadID];
    return;
  }

  let botMove = moves.find(([from, to]) => isValidMoveDamier(board, from, to, "noir") === "prise");
  if (!botMove) botMove = moves[0];

  const [[fx, fy], [tx, ty]] = botMove;
  const piece = board[fx][fy];
  board[tx][ty] = piece;
  board[fx][fy] = EMPTY;
  // si prise, supprimer la pièce au milieu
  if (Math.abs(fx - tx) === 2 && Math.abs(fy - ty) === 2) {
    const midX = Math.floor((fx + tx) / 2);
    const midY = Math.floor((fy + ty) / 2);
    board[midX][midY] = EMPTY;
  }
  checkPromotion(board);

  const hasBlanc = hasPieces(board, PION_B, DAME_B);
  const hasNoir = hasPieces(board, PION_N, DAME_N);
  if (!hasBlanc || !hasNoir) {
    game.inProgress = false;
    const winner = hasBlanc ? game.players[0] : game.players[1];
    const loser = hasBlanc ? game.players[1] : game.players[0];

    ensurePlayerStats(winner.id);
    ensurePlayerStats(loser.id);
    playerStats[winner.id].wins++;
    playerStats[winner.id].played++;
    playerStats[loser.id].losses++;
    playerStats[loser.id].played++;
    saveStats();

    if (game.imageMode) {
      const endImage = await generateBoardImage(board, winner, game.players, usersData);
      if (endImage) await sendImage(api, threadID, endImage, `🎉| ${winner.name} remporte la partie !`);
    } else {
      await api.sendMessage(
        `${displayDamier(board)}\n\n🎉| ${winner.name} remporte la partie !`,
        threadID
      );
    }
    delete damierGames[threadID];
    return;
  }

  game.turn = 0;

  if (game.imageMode) {
    const boardImage = await generateBoardImage(board, game.players[0], game.players, usersData);
    if (boardImage) await sendImage(api, threadID, boardImage, `C'est votre tour !🔄`);
  } else {
    await api.sendMessage(
      `${displayDamier(board)}\n\nC'est votre tour !🔄`,
      threadID
    );
  }
}

/* ------- Helpers pour créer/démarrer une partie ------- */
async function startGameWithAI(api, threadID, starterId, usersData) {
  const board = createDamierBoard();
  const starterName = (await usersData.getName(starterId)) || `Joueur ${starterId}`;
  const game = {
    board,
    players: [
      { id: starterId, name: starterName, color: 'blanc' },
      { id: 'AI', name: BOT_NAME, color: 'noir' }
    ],
    turn: 0,
    inProgress: true,
    imageMode: imageModeByThread[threadID] || false
  };
  damierGames[threadID] = game;
  ensurePlayerStats(starterId);
  if (game.imageMode) {
    const img = await generateBoardImage(board, game.players[0], game.players, usersData);
    if (img) return sendImage(api, threadID, img, `🔰| Partie vs IA démarrée ! Vous êtes ⚪ (blanc).`);
  }
  return api.sendMessage(`🔰| Partie vs IA démarrée !\n\n${displayDamier(board)}\n\nVous êtes ⚪ (blanc).`, threadID);
}

async function startGameWithFriend(api, threadID, starterId, friendId, usersData) {
  if (String(starterId) === String(friendId)) {
    return api.sendMessage(`❌| Vous ne pouvez pas jouer contre vous-même.`, threadID);
  }
  const board = createDamierBoard();
  const starterName = (await usersData.getName(starterId)) || `Joueur ${starterId}`;
  const friendName = (await usersData.getName(friendId)) || `Joueur ${friendId}`;
  const game = {
    board,
    players: [
      { id: starterId, name: starterName, color: 'blanc' },
      { id: friendId, name: friendName, color: 'noir' }
    ],
    turn: 0,
    inProgress: true,
    imageMode: imageModeByThread[threadID] || false
  };
  damierGames[threadID] = game;
  ensurePlayerStats(starterId);
  ensurePlayerStats(friendId);
  if (game.imageMode) {
    const img = await generateBoardImage(board, game.players[0], game.players, usersData);
    if (img) return sendImage(api, threadID, img, `🔰| Partie démarrée entre ${starterName} (⚪) et ${friendName} (⚫).`);
  }
  return api.sendMessage(`🔰| Partie démarrée entre ${starterName} (⚪) et ${friendName} (⚫).\n\n${displayDamier(board)}`, threadID);
}

/* ------- Export main module ------- */
module.exports = {
  config: {
    name: "dames",
    aliases: ["damiers", "checkers"],
    version: "2.0",
    author: "ʚʆɞ Sømå Sønïč ʚʆɞ & L'Uchiha Perdu",
    category: "game",
    shortDescription: "Jeu de dames Ultimate avec tournois, IA et mode image",
    longDescription: "Jeu de dames avec mode IA, mode multijoueur, statistiques, mode image et tournois",
    guide: {
      en: "{pn} @ami | {pn} ia | {pn} stats | {pn} image on/off | {pn} tournoi | {pn} help"
    }
  },

  onStart: async function ({ api, event, args, usersData }) {
    const threadID = event.threadID;
    const senderID = event.senderID;

    ensurePlayerStats(senderID);

    if (!args || args.length === 0) {
      return api.sendMessage(
        `👋| Bienvenu au jeu de Dames Ultimate !\n` +
        `\n🎮 Pour commencer une partie :\n` +
        `  •  Contre le bot : \`dames ia\` ou \`dames HedgehogGPT\`\n` +
        `  •  Contre un ami : \`dames @nom_de_l_ami\`\n` +
        `\n📊 Fonctionnalités :\n` +
        `  •  Voir vos stats : \`dames stats\`\n` +
        `  •  Mode image : \`dames image on/off\`\n` +
        `  •  Tournoi : \`dames tournoi join|leave|start\`\n` +
        `  •  Aide complète : \`dames help\`\n` +
        `\n━━━━━━━━❪❐❫━━━━━━━━\n` +
        `Amusez-vous bien ! 🎲`,
        threadID,
        event.messageID
      );
    }

    const command = (args[0] || '').toLowerCase();
    const arg1 = (args[1] || '').toLowerCase();

    /* ----- Mode image on/off ----- */
    if (command === 'image') {
      if (arg1 === 'on') {
        imageModeByThread[threadID] = true;
        return api.sendMessage(
          `◆━━━━━▣✦▣━━━━━━◆\n` +
          `🎨 MODE IMAGE ACTIVÉ\n\n` +
          `Les parties seront affichées en mode visuel.\n` +
          `Pour désactiver : \`dames image off\`\n` +
          `◆━━━━━▣✦▣━━━━━━◆`, 
          threadID 
        );
      } else if (arg1 === 'off') {
        imageModeByThread[threadID] = false;
        return api.sendMessage(
          `◆━━━━━▣✦▣━━━━━━◆\n` +
          `🔧 Mode image désactivé.\n` +
          `◆━━━━━▣✦▣━━━━━━◆`,
          threadID
        );
      }
      return api.sendMessage(`❓| Utilisation: \`dames image on\` ou \`dames image off\``, threadID);
    }

    /* ----- Help ----- */
    if (command === 'help') {
      return api.sendMessage(
        "📜| Aide pour le jeu de Dames\n\n" +
        "◆━━━━━▣✦▣━━━━━━◆\n" +
        "Commandes disponibles :\n\n" +
        "• dames @ami       → Démarrer une partie contre un ami\n" +
        "• dames ia         → Démarrer une partie contre l'IA\n" +
        "• dames image on   → Afficher les parties en image\n" +
        "• dames image off  → Mode texte pour les parties\n" +
        "• dames stats      → Voir vos statistiques\n" +
        "• dames move a3 b4 → Jouer un coup (format: lettre+chiffre lettre+chiffre)\n" +
        "• dames abandon    → Abandonner la partie en cours\n" +
        "• dames tournoi join|leave|start → Gestion simple de tournoi\n\n" +
        "Pendant une partie, envoyez `dames move a3 b4` pour jouer. Les positions utilisent a-h et 1-8.\n" +
        "◆━━━━━▣✦▣━━━━━━◆",
        threadID,
        event.messageID
      );
    }

    /* ----- Stats ----- */
    if (command === 'stats') {
      const targetId = senderID;
      ensurePlayerStats(targetId);
      if (imageModeByThread[threadID]) {
        const img = await generateStatsImage(playerStats, targetId, usersData);
        if (img) {
          await sendImage(api, threadID, img, `📊| Statistiques`);
          return;
        }
      }
      // fallback texte
      const stats = playerStats[targetId] || { wins: 0, losses: 0, draws: 0, played: 0 };
      const winRate = stats.played > 0 ? Math.round((stats.wins / stats.played) * 100) : 0;
      const name = await usersData.getName(targetId) || `Joueur ${targetId}`;
      return api.sendMessage(
        `📊| Statistiques de ${name}\n\n🏆 Victoires: ${stats.wins}\n💀 Défaites: ${stats.losses}\n🤝 Nuls: ${stats.draws}\n🎮 Parties: ${stats.played}\n📈 Ratio: ${winRate}%`,
        threadID
      );
    }

    /* ----- Start vs IA or vs friend ----- */
    if (command === 'ia' || (args[0] && args[0].toLowerCase() === 'hedgehoggpt')) {
      return startGameWithAI(api, threadID, senderID, usersData);
    }

    // démarrer contre ami : si mention present
    if ((args[0] && args[0].startsWith('@')) || (event.mentions && Object.keys(event.mentions).length > 0)) {
      let friendId = null;
      if (event.mentions && Object.keys(event.mentions).length > 0) {
        friendId = Object.keys(event.mentions)[0];
      } else {
        // si args[0] forme "@123456789"
        const raw = args[0];
        friendId = raw.replace('@', '');
      }
      if (friendId) {
        return startGameWithFriend(api, threadID, senderID, friendId, usersData);
      }
    }

    /* ----- Abandon ----- */
    if (command === 'abandon') {
      const game = damierGames[threadID];
      if (!game || !game.inProgress) return api.sendMessage(`ℹ️| Aucune partie en cours.`, threadID);
      const player = game.players.find(p => String(p.id) === String(senderID));
      if (!player) return api.sendMessage(`❌| Vous ne participez pas à cette partie.`, threadID);
      const opponent = game.players.find(p => String(p.id) !== String(senderID));
      // update stats
      ensurePlayerStats(senderID);
      ensurePlayerStats(opponent.id);
      playerStats[senderID].losses++;
      playerStats[senderID].played++;
      playerStats[opponent.id].wins++;
      playerStats[opponent.id].played++;
      saveStats();
      delete damierGames[threadID];
      return api.sendMessage(`🏳️| ${player.name} a abandonné. ${opponent.name} remporte la partie.`, threadID);
    }

    /* ----- Tournoi simple: join / leave / start ----- */
    if (command === 'tournoi' || command === 'tournoi' || command === 'tournoi' ) {
      const sub = (args[1] || '').toLowerCase();
      if (!tournaments[threadID]) tournaments[threadID] = { participants: [], started: false };
      const tour = tournaments[threadID];
      if (sub === 'join') {
        if (tour.started) return api.sendMessage(`❌| Le tournoi a déjà commencé.`, threadID);
        if (tour.participants.includes(senderID)) return api.sendMessage(`ℹ️| Vous êtes déjà inscrit au tournoi.`, threadID);
        tour.participants.push(senderID);
        return api.sendMessage(`✅| Inscrit au tournoi. Participants: ${tour.participants.length}`, threadID);
      } else if (sub === 'leave') {
        if (tour.started) return api.sendMessage(`❌| Le tournoi a déjà commencé.`, threadID);
        tour.participants = tour.participants.filter(p => String(p) !== String(senderID));
        return api.sendMessage(`✅| Vous avez quitté le tournoi. Participants: ${tour.participants.length}`, threadID);
      } else if (sub === 'start') {
        if (tour.started) return api.sendMessage(`❌| Tournoi déjà lancé.`, threadID);
        if (tour.participants.length < 2) return api.sendMessage(`❌| Il faut au moins 2 participants pour démarrer.`, threadID);
        tour.started = true;
        // simple pairing : on lance une partie entre le premier et le second (exemple)
        const p1 = tour.participants[0];
        const p2 = tour.participants[1];
        await startGameWithFriend(api, threadID, p1, p2, usersData);
        return api.sendMessage(`🏁| Tournoi démarré! Première partie: ${p1} vs ${p2}`, threadID);
      } else {
        return api.sendMessage(`❓| Utilisation: \`dames tournoi join|leave|start\``, threadID);
      }
    }

    if (command === 'move' && args.length >= 3) {
      const possibleMove = `${args[1]} ${args[2]}`;
      const parsed = parseDamierMove(possibleMove);
      if (parsed) {
        const game = damierGames[threadID];
        if (!game || !game.inProgress) return api.sendMessage(`ℹ️| Aucune partie en cours. Démarrez une partie avec 'dames ia' ou 'dames @ami'.`, threadID);
        const current = game.players[game.turn];
        if (String(current.id) !== String(senderID)) return api.sendMessage(`⏳| Ce n'est pas votre tour.`, threadID);
        const [from, to] = parsed;
        const valid = isValidMoveDamier(game.board, from, to, current.color);
        if (!valid) return api.sendMessage(`❌| Coup invalide. Réessayez.`, threadID);
        const piece = game.board[from[0]][from[1]];
        game.board[to[0]][to[1]] = piece;
        game.board[from[0]][from[1]] = EMPTY;
        if (valid === 'prise') {
          const midX = Math.floor((from[0] + to[0]) / 2);
          const midY = Math.floor((from[1] + to[1]) / 2);
          game.board[midX][midY] = EMPTY;
        }
        checkPromotion(game.board);
        const hasBlanc = hasPieces(game.board, PION_B, DAME_B);
        const hasNoir = hasPieces(game.board, PION_N, DAME_N);
        if (!hasBlanc || !hasNoir) {
          game.inProgress = false;
          const winner = hasBlanc ? game.players.find(p => p.color === 'blanc') : game.players.find(p => p.color === 'noir');
          const loser = game.players.find(p => p.id !== winner.id);
          ensurePlayerStats(winner.id);
          ensurePlayerStats(loser.id);
          playerStats[winner.id].wins++;
          playerStats[winner.id].played++;
          playerStats[loser.id].losses++;
          playerStats[loser.id].played++;
          saveStats();
          delete damierGames[threadID];
          if (game.imageMode) {
            const img = await generateBoardImage(game.board, winner, game.players, usersData);
            if (img) {
              await sendImage(api, threadID, img, `🎉| ${winner.name} remporte la partie !`);
              return;
            }
          }
          return api.sendMessage(`${displayDamier(game.board)}\n\n🎉| ${winner.name} remporte la partie !`, threadID);
        }
        game.turn = (game.turn + 1) % 2;
        if (game.players[game.turn].id === 'AI') {
          await botPlay(game, api, threadID, usersData);
          return;
        } else {
          if (game.imageMode) {
            const img = await generateBoardImage(game.board, game.players[game.turn], game.players, usersData);
            if (img) {
              await sendImage(api, threadID, img, `🔄| C'est au tour de ${game.players[game.turn].name}`);
              return;
            }
          }
          return api.sendMessage(`${displayDamier(game.board)}\n\n🔄| C'est au tour de ${game.players[game.turn].name}`, threadID);
        }
      }
      return api.sendMessage(`❌| Format invalide. Utilisez: dames move a3 b4`, threadID);
    }

    if (args.length === 2) {
      const possibleMove = `${args[0]} ${args[1]}`;
      const parsed = parseDamierMove(possibleMove);
      if (parsed) {
        const game = damierGames[threadID];
        if (!game || !game.inProgress) return api.sendMessage(`ℹ️| Aucune partie en cours. Démarrez une partie avec 'dames ia' ou 'dames @ami'.`, threadID);
        const current = game.players[game.turn];
        if (String(current.id) !== String(senderID)) return api.sendMessage(`⏳| Ce n'est pas votre tour.`, threadID);
        const [from, to] = parsed;
        const valid = isValidMoveDamier(game.board, from, to, current.color);
        if (!valid) return api.sendMessage(`❌| Coup invalide. Réessayez.`, threadID);
        const piece = game.board[from[0]][from[1]];
        game.board[to[0]][to[1]] = piece;
        game.board[from[0]][from[1]] = EMPTY;
        if (valid === 'prise') {
          const midX = Math.floor((from[0] + to[0]) / 2);
          const midY = Math.floor((from[1] + to[1]) / 2);
          game.board[midX][midY] = EMPTY;
        }
        checkPromotion(game.board);
        const hasBlanc = hasPieces(game.board, PION_B, DAME_B);
        const hasNoir = hasPieces(game.board, PION_N, DAME_N);
        if (!hasBlanc || !hasNoir) {
          game.inProgress = false;
          const winner = hasBlanc ? game.players.find(p => p.color === 'blanc') : game.players.find(p => p.color === 'noir');
          const loser = game.players.find(p => p.id !== winner.id);
          ensurePlayerStats(winner.id);
          ensurePlayerStats(loser.id);
          playerStats[winner.id].wins++;
          playerStats[winner.id].played++;
          playerStats[loser.id].losses++;
          playerStats[loser.id].played++;
          saveStats();
          delete damierGames[threadID];
          if (game.imageMode) {
            const img = await generateBoardImage(game.board, winner, game.players, usersData);
            if (img) {
              await sendImage(api, threadID, img, `🎉| ${winner.name} remporte la partie !`);
              return;
            }
          }
          return api.sendMessage(`${displayDamier(game.board)}\n\n🎉| ${winner.name} remporte la partie !`, threadID);
        }
        game.turn = (game.turn + 1) % 2;
        if (game.players[game.turn].id === 'AI') {
          await botPlay(game, api, threadID, usersData);
          return;
        } else {
          if (game.imageMode) {
            const img = await generateBoardImage(game.board, game.players[game.turn], game.players, usersData);
            if (img) {
              await sendImage(api, threadID, img, `🔄| C'est au tour de ${game.players[game.turn].name}`);
              return;
            }
          }
          return api.sendMessage(`${displayDamier(game.board)}\n\n🔄| C'est au tour de ${game.players[game.turn].name}`, threadID);
        }
      }
    }

    return api.sendMessage(`❓| Commande inconnue. Utilisez 'dames help' pour la liste des commandes.`, threadID);
  }
};
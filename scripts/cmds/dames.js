const fetch = require('node-fetch');
const fs = require('fs-extra');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');

const STATS_FILE = path.join(__dirname, 'dames_stats.json');
const ASSETS_DIR = path.join(__dirname, 'dames_assets');
const GAMES_BACKUP_FILE = path.join(__dirname, 'dames_games_backup.json');
const CONFIG_FILE = path.join(__dirname, 'dames_config.json');

const configPath = path.join(__dirname, "configs.json");
const BOT_UID = global.botID
const BOT_NAME = "Hedgehog GPT";

const damierGames = {};
const tournaments = {};
const imageModeByThread = {};
const playerCache = new Map();
const gameTimers = {};
const moveHistory = {};

const EMPTY = "🟩";
const PION_B = "⚪";
const PION_N = "⚫";
const DAME_B = "🔵";
const DAME_N = "🔴";

const DAMES_API_URL = "https://dames-api.vercel.app";

if (!fs.existsSync(ASSETS_DIR)) {
  fs.mkdirSync(ASSETS_DIR, { recursive: true });
}

let config = {
  moveTimeLimit: 120,
  spectatorMode: false,
  defaultDifficulty: "medium",
  language: "fr",
  eloKFactor: 32
};

if (fs.existsSync(CONFIG_FILE)) {
  try {
    const savedConfig = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    config = { ...config, ...savedConfig };
  } catch(e) {}
}

const translations = {
  fr: {
    welcome: "👋| Bienvenu au jeu de Dames Ultimate !",
    vsAI: "🔰| Partie vs IA démarrée ! Vous êtes ⚪ (blanc).",
    vsFriend: "🔰| Partie démarrée entre {p1} (⚪) et {p2} (⚫).",
    yourTurn: "🔄| C'est votre tour !",
    turn: "🔄| C'est au tour de {player}",
    invalidMove: "❌| Coup invalide. Réessayez.",
    notYourTurn: "⏳| Ce n'est pas votre tour.",
    noGame: "ℹ️| Aucune partie en cours.",
    notParticipant: "❌| Vous ne participez pas à cette partie.",
    abandoned: "🏳️| {player} a abandonné. {winner} remporte la partie.",
    winner: "🎉| {winner} remporte la partie !",
    timeOut: "⏰| Temps écoulé ! {player} perd la partie.",
    capture: "🎯| Prise !",
    promotion: "⭐| Félicitations ! Votre pion est devenu une dame !",
    stats: "📊| Statistiques de {name}\n\n🏆 Victoires: {wins}\n💀 Défaites: {losses}\n🤝 Nuls: {draws}\n🎮 Parties: {played}\n📈 Ratio: {ratio}%\n⭐ ELO: {elo}",
    tournamentJoin: "✅| Inscrit au tournoi. Participants: {count}",
    tournamentLeave: "✅| Vous avez quitté le tournoi. Participants: {count}",
    tournamentStart: "🏁| Tournoi démarré! Première partie: {p1} vs {p2}",
    tournamentNotEnough: "❌| Il faut au moins 2 participants pour démarrer.",
    tournamentAlreadyStarted: "❌| Le tournoi a déjà commencé.",
    imageModeOn: "🎨 MODE IMAGE ACTIVÉ\n\nLes parties seront affichées en mode visuel.",
    imageModeOff: "🔧 Mode image désactivé.",
    help: "📜| Aide pour le jeu de Dames\n\n◆━━━━━▣✦▣━━━━━━◆\nCommandes disponibles :\n\n• dames @ami → Démarrer une partie contre un ami\n• dames ia → Démarrer une partie contre l'IA\n• dames image on/off → Mode image\n• dames stats → Voir vos statistiques\n• dames move a3 b4 → Jouer un coup\n• dames abandon → Abandonner\n• dames tournoi join/leave/start → Tournoi\n• dames spectate on/off → Mode spectateur\n• dames difficulty easy/medium/hard → Difficulté IA\n• dames history → Voir historique des coups\n• dames elo → Voir classement ELO\n• dames save/load → Sauvegarder/charger partie\n• dames undo → Annuler dernier coup\n◆━━━━━▣✦▣━━━━━━◆"
  },
  en: {
    welcome: "👋| Welcome to Ultimate Checkers Game!",
    vsAI: "🔰| Game vs AI started! You are ⚪ (white).",
    vsFriend: "🔰| Game started between {p1} (⚪) and {p2} (⚫).",
    yourTurn: "🔄| Your turn!",
    turn: "🔄| {player}'s turn",
    invalidMove: "❌| Invalid move. Try again.",
    notYourTurn: "⏳| It's not your turn.",
    noGame: "ℹ️| No game in progress.",
    notParticipant: "❌| You are not in this game.",
    abandoned: "🏳️| {player} abandoned. {winner} wins the game.",
    winner: "🎉| {winner} wins the game!",
    timeOut: "⏰| Time's up! {player} loses the game.",
    capture: "🎯| Capture!",
    promotion: "⭐| Congratulations! Your pawn became a king!",
    stats: "📊| Statistics for {name}\n\n🏆 Wins: {wins}\n💀 Losses: {losses}\n🤝 Draws: {draws}\n🎮 Games: {played}\n📈 Ratio: {ratio}%\n⭐ ELO: {elo}",
    tournamentJoin: "✅| Registered for tournament. Participants: {count}",
    tournamentLeave: "✅| You left the tournament. Participants: {count}",
    tournamentStart: "🏁| Tournament started! First game: {p1} vs {p2}",
    tournamentNotEnough: "❌| Need at least 2 participants to start.",
    tournamentAlreadyStarted: "❌| Tournament already started.",
    imageModeOn: "🎨 IMAGE MODE ACTIVATED\n\nGames will be displayed visually.",
    imageModeOff: "🔧 Image mode disabled.",
    help: "📜| Checkers Game Help\n\n◆━━━━━▣✦▣━━━━━━◆\nCommands:\n\n• dames @friend → Start game vs friend\n• dames ia → Start game vs AI\n• dames image on/off → Image mode\n• dames stats → View your stats\n• dames move a3 b4 → Make a move\n• dames abandon → Abandon game\n• dames tournoi join/leave/start → Tournament\n• dames spectate on/off → Spectator mode\n• dames difficulty easy/medium/hard → AI difficulty\n• dames history → Move history\n• dames elo → ELO ranking\n• dames save/load → Save/load game\n• dames undo → Undo last move\n◆━━━━━▣✦▣━━━━━━◆"
  }
};

function loadStats() {
  try {
    if (fs.existsSync(STATS_FILE)) {
      return JSON.parse(fs.readFileSync(STATS_FILE, 'utf8') || '{}');
    }
  } catch (e) {}
  return {};
}

let playerStats = loadStats();

function saveStats() {
  try {
    fs.writeFileSync(STATS_FILE, JSON.stringify(playerStats, null, 2));
  } catch(e) {}
}

function loadGamesBackup() {
  try {
    if (fs.existsSync(GAMES_BACKUP_FILE)) {
      const backup = JSON.parse(fs.readFileSync(GAMES_BACKUP_FILE, 'utf8'));
      Object.assign(damierGames, backup.games || {});
      Object.assign(tournaments, backup.tournaments || {});
    }
  } catch(e) {}
}

function saveGamesBackup() {
  try {
    const backup = {
      games: damierGames,
      tournaments: tournaments,
      timestamp: Date.now()
    };
    fs.writeFileSync(GAMES_BACKUP_FILE, JSON.stringify(backup, null, 2));
  } catch(e) {}
}

function ensurePlayerStats(id) {
  if (!playerStats[id]) {
    playerStats[id] = { 
      wins: 0, 
      losses: 0, 
      draws: 0, 
      played: 0,
      elo: 1200,
      bestWinStreak: 0,
      currentWinStreak: 0,
      totalCaptures: 0,
      averageGameTime: 0,
      totalGameTime: 0
    };
  }
}

function calculateEloChange(winnerElo, loserElo, isDraw = false) {
  const K = config.eloKFactor;
  const expectedWinner = 1 / (1 + Math.pow(10, (loserElo - winnerElo) / 400));
  const expectedLoser = 1 / (1 + Math.pow(10, (winnerElo - loserElo) / 400));
  
  if (isDraw) {
    return {
      winnerChange: Math.round(K * (0.5 - expectedWinner)),
      loserChange: Math.round(K * (0.5 - expectedLoser))
    };
  } else {
    return {
      winnerChange: Math.round(K * (1 - expectedWinner)),
      loserChange: Math.round(K * (0 - expectedLoser))
    };
  }
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
    const file = p.charCodeAt(0) - 97;
    const rank = Number(p[1]);
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

function getAllCaptureMoves(board, from, playerColor) {
  const [fx, fy] = from;
  const piece = board[fx][fy];
  if (!piece) return [];
  
  const captures = [];
  const directions = [[-1,-1], [-1,1], [1,-1], [1,1]];
  
  for (const [dx, dy] of directions) {
    let captureX = fx + dx;
    let captureY = fy + dy;
    let landingX = fx + (dx * 2);
    let landingY = fy + (dy * 2);
    
    if (isInside(landingX, landingY) && board[landingX][landingY] === EMPTY) {
      const targetPiece = board[captureX][captureY];
      if (targetPiece !== EMPTY) {
        if (playerColor === 'blanc' && (targetPiece === PION_N || targetPiece === DAME_N)) {
          captures.push([[fx, fy], [landingX, landingY], [captureX, captureY]]);
        } else if (playerColor === 'noir' && (targetPiece === PION_B || targetPiece === DAME_B)) {
          captures.push([[fx, fy], [landingX, landingY], [captureX, captureY]]);
        }
      }
    }
  }
  
  if (piece === DAME_B || piece === DAME_N) {
    for (const [dx, dy] of directions) {
      let step = 1;
      while (true) {
        const captureX = fx + (dx * step);
        const captureY = fy + (dy * step);
        const landingX = fx + (dx * (step + 1));
        const landingY = fy + (dy * (step + 1));
        
        if (!isInside(captureX, captureY) || !isInside(landingX, landingY)) break;
        if (board[landingX][landingY] !== EMPTY) break;
        
        const targetPiece = board[captureX][captureY];
        if (targetPiece !== EMPTY) {
          if (playerColor === 'blanc' && (targetPiece === PION_N || targetPiece === DAME_N)) {
            captures.push([[fx, fy], [landingX, landingY], [captureX, captureY]]);
            break;
          } else if (playerColor === 'noir' && (targetPiece === PION_B || targetPiece === DAME_B)) {
            captures.push([[fx, fy], [landingX, landingY], [captureX, captureY]]);
            break;
          }
        }
        step++;
      }
    }
  }
  
  return captures;
}

function hasMandatoryCapture(board, playerColor) {
  const myPion = playerColor === 'blanc' ? PION_B : PION_N;
  const myDame = playerColor === 'blanc' ? DAME_B : DAME_N;
  
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      if (board[i][j] === myPion || board[i][j] === myDame) {
        const captures = getAllCaptureMoves(board, [i, j], playerColor);
        if (captures.length > 0) return true;
      }
    }
  }
  return false;
}

function isValidMoveDamier(board, from, to, playerColor) {
  const [fx, fy] = from, [tx, ty] = to;
  if (!isInside(fx, fy) || !isInside(tx, ty)) return false;
  const piece = board[fx][fy];
  if (!piece || board[tx][ty] !== EMPTY) return false;
  
  const mandatoryCapture = hasMandatoryCapture(board, playerColor);
  
  if (piece === PION_B) {
    if (fx - tx === 1 && Math.abs(ty - fy) === 1 && !mandatoryCapture) return true;
    if (fx - tx === 2 && Math.abs(ty - fy) === 2) {
      const midX = fx - 1;
      const midY = fy + (ty - fy) / 2;
      if (!Number.isInteger(midY)) return false;
      if (board[midX][midY] === PION_N || board[midX][midY] === DAME_N) return "prise";
    }
  }
  
  if (piece === PION_N) {
    if (tx - fx === 1 && Math.abs(ty - fy) === 1 && !mandatoryCapture) return true;
    if (tx - fx === 2 && Math.abs(ty - fy) === 2) {
      const midX = fx + 1;
      const midY = fy + (ty - fy) / 2;
      if (!Number.isInteger(midY)) return false;
      if (board[midX][midY] === PION_B || board[midX][midY] === DAME_B) return "prise";
    }
  }
  
  if (piece === DAME_B || piece === DAME_N) {
    if (Math.abs(fx - tx) === Math.abs(fy - ty)) {
      const dx = tx > fx ? 1 : -1, dy = ty > fy ? 1 : -1;
      let x = fx + dx, y = fy + dy;
      let captured = null;
      let captureCount = 0;
      
      while (x !== tx && y !== ty) {
        if (board[x][y] !== EMPTY) {
          if (captureCount > 0) return false;
          const isEnemy = (piece === DAME_B && (board[x][y] === PION_N || board[x][y] === DAME_N)) ||
                         (piece === DAME_N && (board[x][y] === PION_B || board[x][y] === DAME_B));
          if (isEnemy) {
            captured = [x, y];
            captureCount++;
          } else {
            return false;
          }
        }
        x += dx; y += dy;
      }
      
      if (captureCount === 1) return "prise";
      if (captureCount === 0 && !mandatoryCapture) return true;
    }
  }
  return false;
}

function checkPromotion(board, lastMove) {
  let promoted = false;
  for (let j = 0; j < 8; j++) {
    if (board[0][j] === PION_B) {
      board[0][j] = DAME_B;
      promoted = true;
    }
    if (board[7][j] === PION_N) {
      board[7][j] = DAME_N;
      promoted = true;
    }
  }
  return promoted;
}

function getLocalLegalMoves(board, player) {
  const moves = [];
  const myPion = player === 0 ? PION_B : PION_N;
  const myDame = player === 0 ? DAME_B : DAME_N;
  const playerColor = player === 0 ? "blanc" : "noir";
  const mandatoryCapture = hasMandatoryCapture(board, playerColor);
  
  for (let fx = 0; fx < 8; fx++) {
    for (let fy = 0; fy < 8; fy++) {
      if ([myPion, myDame].includes(board[fx][fy])) {
        for (let tx = 0; tx < 8; tx++) {
          for (let ty = 0; ty < 8; ty++) {
            if (fx !== tx || fy !== ty) {
              const valid = isValidMoveDamier(board, [fx, fy], [tx, ty], playerColor);
              if (valid) {
                if (mandatoryCapture && valid !== "prise") continue;
                moves.push([[fx, fy], [tx, ty]]);
              }
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

function evaluateBoard(board) {
  let score = 0;
  const pieceValues = {
    [PION_B]: 10,
    [PION_N]: -10,
    [DAME_B]: 30,
    [DAME_N]: -30
  };
  
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      const piece = board[i][j];
      if (pieceValues[piece]) {
        score += pieceValues[piece];
        if ((piece === PION_B && i === 0) || (piece === PION_N && i === 7)) {
          score += 5;
        }
      }
    }
  }
  return score;
}

async function getBestMove(board, player, depth, difficulty) {
  const moves = await getAllLegalMoves(board, player);
  if (moves.length === 0) return null;
  
  if (difficulty === "easy") {
    return moves[Math.floor(Math.random() * moves.length)];
  }
  
  let bestScore = player === 1 ? Infinity : -Infinity;
  let bestMove = moves[0];
  
  for (const move of moves) {
    const testBoard = JSON.parse(JSON.stringify(board));
    const [[fx, fy], [tx, ty]] = move;
    const piece = testBoard[fx][fy];
    testBoard[tx][ty] = piece;
    testBoard[fx][fy] = EMPTY;
    
    if (Math.abs(fx - tx) === 2 && Math.abs(fy - ty) === 2) {
      const midX = Math.floor((fx + tx) / 2);
      const midY = Math.floor((fy + ty) / 2);
      testBoard[midX][midY] = EMPTY;
    }
    checkPromotion(testBoard);
    
    let score = evaluateBoard(testBoard);
    
    if (difficulty === "hard" && depth < 1) {
      const nextMoves = await getAllLegalMoves(testBoard, player === 0 ? 1 : 0);
      for (const nextMove of nextMoves) {
        const deeperBoard = JSON.parse(JSON.stringify(testBoard));
        const [[nfx, nfy], [ntx, nty]] = nextMove;
        const npiece = deeperBoard[nfx][nfy];
        deeperBoard[ntx][nty] = npiece;
        deeperBoard[nfx][nfy] = EMPTY;
        if (Math.abs(nfx - ntx) === 2 && Math.abs(nfy - nty) === 2) {
          const nmidX = Math.floor((nfx + ntx) / 2);
          const nmidY = Math.floor((nfy + nty) / 2);
          deeperBoard[nmidX][nmidY] = EMPTY;
        }
        score += evaluateBoard(deeperBoard) * 0.3;
      }
    }
    
    if (player === 1) {
      if (score < bestScore) {
        bestScore = score;
        bestMove = move;
      }
    } else {
      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }
  }
  
  return bestMove;
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
  
  function extractFacebookId(input) {
    if (/^\d+$/.test(input)) return input;
    const patterns = [
      /facebook\.com\/(?:profile\.php\?id=)(\d+)/i,
      /facebook\.com\/([^\/\?]+)(?:\?|$)/i,
      /fb\.com\/([^\/\?]+)(?:\?|$)/i,
      /facebook\.com\/photo\.php\?fbid=(\d+)/i,
      /fb\.watch\/([a-zA-Z0-9]+)/i
    ];
    for (const pattern of patterns) {
      const match = input.match(pattern);
      if (match) return match[1];
    }
    return null;
  }
  
  let extractedUid = extractFacebookId(String(uid));
  if (!extractedUid) return { avatar: null, name: `Joueur ${uid}`, uid };
  
  if (isNaN(extractedUid)) {
    try {
      const userId = await usersData.getUID(extractedUid);
      if (userId) extractedUid = userId;
    } catch (error) {
      return { avatar: null, name: `@${extractedUid}`, uid: extractedUid };
    }
  }
  
  const numericUid = Number(extractedUid);
  if (isNaN(numericUid)) {
    return { avatar: null, name: `Joueur ${extractedUid}`, uid: extractedUid };
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

async function generateBoardImage(board, currentPlayer, players, usersData, gameType = "normal", possibleMoves = null, selectedPiece = null) {
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
        let isSelected = selectedPiece && selectedPiece[0] === i && selectedPiece[1] === j;
        let isPossible = possibleMoves && possibleMoves.some(m => m[1][0] === i && m[1][1] === j);
        
        if (isSelected) {
          ctx.fillStyle = 'rgba(255, 255, 0, 0.5)';
        } else if (isPossible) {
          ctx.fillStyle = 'rgba(0, 255, 0, 0.3)';
        } else {
          ctx.fillStyle = (i + j) % 2 === 0 ? '#e8d4b0' : '#8b4513';
        }
        ctx.fillRect(boardX + j * cellSize, boardY + i * cellSize, cellSize, cellSize);
        
        if (isPossible) {
          ctx.strokeStyle = '#00ff00';
          ctx.lineWidth = 3;
          ctx.strokeRect(boardX + j * cellSize, boardY + i * cellSize, cellSize, cellSize);
        }
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
      
      const stats = playerStats[playerData.id];
      if (stats) {
        ctx.font = '18px Arial';
        ctx.fillStyle = '#FFD700';
        ctx.fillText(`ELO: ${stats.elo}`, panelX + 10, panelY + 190);
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
    const stats = playerStatsData[playerId] || { wins: 0, losses: 0, draws: 0, played: 0, elo: 1200 };
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
    ctx.fillText(`⭐ ELO: ${stats.elo}`, statsLeft, statsTop + 240);
    
    if (stats.bestWinStreak) {
      ctx.fillText(`🔥 Best Streak: ${stats.bestWinStreak}`, statsLeft, statsTop + 300);
    }

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

function getTranslation(key, lang = "fr", replacements = {}) {
  let text = translations[lang]?.[key] || translations.fr[key] || key;
  for (const [k, v] of Object.entries(replacements)) {
    text = text.replace(`{${k}}`, v);
  }
  return text;
}

function clearGameTimer(threadID) {
  if (gameTimers[threadID]) {
    clearTimeout(gameTimers[threadID]);
    delete gameTimers[threadID];
  }
}

function startGameTimer(api, threadID, game, usersData) {
  clearGameTimer(threadID);
  gameTimers[threadID] = setTimeout(async () => {
    const currentGame = damierGames[threadID];
    if (!currentGame || !currentGame.inProgress) return;
    
    const currentPlayer = currentGame.players[currentGame.turn];
    const lang = config.language;
    
    ensurePlayerStats(currentPlayer.id);
    ensurePlayerStats(currentGame.players[1 - currentGame.turn].id);
    
    playerStats[currentPlayer.id].losses++;
    playerStats[currentPlayer.id].played++;
    playerStats[currentGame.players[1 - currentGame.turn].id].wins++;
    playerStats[currentGame.players[1 - currentGame.turn].id].played++;
    
    const eloChanges = calculateEloChange(
      playerStats[currentGame.players[1 - currentGame.turn].id].elo,
      playerStats[currentPlayer.id].elo
    );
    playerStats[currentGame.players[1 - currentGame.turn].id].elo += eloChanges.winnerChange;
    playerStats[currentPlayer.id].elo += eloChanges.loserChange;
    
    saveStats();
    
    delete damierGames[threadID];
    clearGameTimer(threadID);
    
    api.sendMessage(
      getTranslation("timeOut", lang, { player: currentPlayer.name }),
      threadID
    );
  }, config.moveTimeLimit * 1000);
}

async function executeMove(api, threadID, game, from, to, isCapture, usersData) {
  const [fx, fy] = from;
  const [tx, ty] = to;
  const piece = game.board[fx][fy];
  
  game.board[tx][ty] = piece;
  game.board[fx][fy] = EMPTY;
  
  if (isCapture) {
    const midX = Math.floor((fx + tx) / 2);
    const midY = Math.floor((fy + ty) / 2);
    if (game.board[midX][midY] !== EMPTY) {
      game.board[midX][midY] = EMPTY;
      const currentPlayer = game.players[game.turn];
      if (currentPlayer.id !== 'AI') {
        ensurePlayerStats(currentPlayer.id);
        playerStats[currentPlayer.id].totalCaptures = (playerStats[currentPlayer.id].totalCaptures || 0) + 1;
        saveStats();
      }
    }
    
    const additionalCaptures = getAllCaptureMoves(game.board, [tx, ty], game.players[game.turn].color);
    if (additionalCaptures.length > 0) {
      return { moveComplete: false, additionalCaptures };
    }
  }
  
  const promoted = checkPromotion(game.board);
  if (promoted) {
    const lang = config.language;
    api.sendMessage(getTranslation("promotion", lang), threadID);
  }
  
  return { moveComplete: true, promoted };
}

function recordMoveHistory(game, from, to, player) {
  if (!game.moveHistory) game.moveHistory = [];
  game.moveHistory.push({
    from,
    to,
    player: player.name,
    timestamp: Date.now(),
    boardState: JSON.parse(JSON.stringify(game.board))
  });
  if (game.moveHistory.length > 50) game.moveHistory.shift();
}

function undoLastMove(game) {
  if (!game.moveHistory || game.moveHistory.length === 0) return null;
  const lastMove = game.moveHistory.pop();
  game.board = lastMove.boardState;
  game.turn = game.players.findIndex(p => p.id === lastMove.player.id);
  return lastMove;
}

async function endGame(api, threadID, game, winner, usersData, isDraw = false) {
  game.inProgress = false;
  clearGameTimer(threadID);
  
  const loser = game.players.find(p => p.id !== winner.id);
  
  ensurePlayerStats(winner.id);
  ensurePlayerStats(loser.id);
  
  if (isDraw) {
    playerStats[winner.id].draws++;
    playerStats[loser.id].draws++;
    playerStats[winner.id].played++;
    playerStats[loser.id].played++;
    
    const eloChanges = calculateEloChange(
      playerStats[winner.id].elo,
      playerStats[loser.id].elo,
      true
    );
    playerStats[winner.id].elo += eloChanges.winnerChange;
    playerStats[loser.id].elo += eloChanges.loserChange;
  } else {
    playerStats[winner.id].wins++;
    playerStats[winner.id].played++;
    playerStats[winner.id].currentWinStreak = (playerStats[winner.id].currentWinStreak || 0) + 1;
    if (playerStats[winner.id].currentWinStreak > (playerStats[winner.id].bestWinStreak || 0)) {
      playerStats[winner.id].bestWinStreak = playerStats[winner.id].currentWinStreak;
    }
    
    playerStats[loser.id].losses++;
    playerStats[loser.id].played++;
    playerStats[loser.id].currentWinStreak = 0;
    
    const eloChanges = calculateEloChange(
      playerStats[winner.id].elo,
      playerStats[loser.id].elo
    );
    playerStats[winner.id].elo += eloChanges.winnerChange;
    playerStats[loser.id].elo += eloChanges.loserChange;
  }
  
  saveStats();
  
  const lang = config.language;
  
  if (game.imageMode) {
    const endImage = await generateBoardImage(game.board, winner, game.players, usersData);
    if (endImage) {
      await sendImage(api, threadID, endImage, getTranslation("winner", lang, { winner: winner.name }));
    }
  } else {
    await api.sendMessage(
      `${displayDamier(game.board)}\n\n${getTranslation("winner", lang, { winner: winner.name })}`,
      threadID
    );
  }
  
  delete damierGames[threadID];
  if (moveHistory[threadID]) delete moveHistory[threadID];
}

async function botPlay(game, api, threadID, usersData) {
  const board = game.board;
  const difficulty = game.difficulty || config.defaultDifficulty;
  const bestMove = await getBestMove(board, 1, difficulty === "hard" ? 2 : 1, difficulty);
  
  if (!bestMove) {
    await endGame(api, threadID, game, game.players[0], usersData);
    return;
  }
  
  const [[fx, fy], [tx, ty]] = bestMove;
  const isCapture = Math.abs(fx - tx) === 2 && Math.abs(fy - ty) === 2;
  
  recordMoveHistory(game, [fx, fy], [tx, ty], game.players[1]);
  
  const result = await executeMove(api, threadID, game, [fx, fy], [tx, ty], isCapture, usersData);
  
  if (!result.moveComplete && result.additionalCaptures) {
    const [[, landingPos]] = result.additionalCaptures[0];
    const [lx, ly] = landingPos;
    const secondCapture = Math.abs(tx - lx) === 2 && Math.abs(ty - ly) === 2;
    recordMoveHistory(game, [tx, ty], [lx, ly], game.players[1]);
    await executeMove(api, threadID, game, [tx, ty], [lx, ly], secondCapture, usersData);
  }
  
  const hasBlanc = hasPieces(game.board, PION_B, DAME_B);
  const hasNoir = hasPieces(game.board, PION_N, DAME_N);
  
  if (!hasBlanc || !hasNoir) {
    const winner = hasBlanc ? game.players[0] : game.players[1];
    await endGame(api, threadID, game, winner, usersData);
    return;
  }
  
  game.turn = 0;
  startGameTimer(api, threadID, game, usersData);
  
  const lang = config.language;
  
  if (game.imageMode) {
    const boardImage = await generateBoardImage(game.board, game.players[0], game.players, usersData);
    if (boardImage) {
      await sendImage(api, threadID, boardImage, getTranslation("yourTurn", lang));
    }
  } else {
    await api.sendMessage(
      `${displayDamier(game.board)}\n\n${getTranslation("yourTurn", lang)}`,
      threadID
    );
  }
}

async function startGameWithAI(api, threadID, starterId, usersData, difficulty = null) {
  const board = createDamierBoard();
  const starterName = (await usersData.getName(starterId)) || `Joueur ${starterId}`;
  const lang = config.language;
  const gameDifficulty = difficulty || config.defaultDifficulty;
  
  const game = {
    board,
    players: [
      { id: starterId, name: starterName, color: 'blanc' },
      { id: 'AI', name: BOT_NAME, color: 'noir' }
    ],
    turn: 0,
    inProgress: true,
    imageMode: imageModeByThread[threadID] || false,
    difficulty: gameDifficulty,
    startTime: Date.now(),
    moveHistory: []
  };
  
  damierGames[threadID] = game;
  ensurePlayerStats(starterId);
  startGameTimer(api, threadID, game, usersData);
  saveGamesBackup();
  
  if (game.imageMode) {
    const img = await generateBoardImage(board, game.players[0], game.players, usersData);
    if (img) return sendImage(api, threadID, img, getTranslation("vsAI", lang));
  }
  return api.sendMessage(`${getTranslation("vsAI", lang)}\n\n${displayDamier(board)}`, threadID);
}

async function startGameWithFriend(api, threadID, starterId, friendInput, usersData) {
  if (String(starterId) === String(friendInput)) {
    return api.sendMessage(`❌| Vous ne pouvez pas jouer contre vous-même.`, threadID);
  }
  
  function extractFacebookId(input) {
    if (/^\d+$/.test(input)) return input;
    const patterns = [
      /facebook\.com\/(?:profile\.php\?id=)(\d+)/i,
      /facebook\.com\/([^\/\?]+)(?:\?|$)/i,
      /fb\.com\/([^\/\?]+)(?:\?|$)/i,
      /facebook\.com\/photo\.php\?fbid=(\d+)/i,
      /fb\.watch\/([a-zA-Z0-9]+)/i
    ];
    for (const pattern of patterns) {
      const match = input.match(pattern);
      if (match) return match[1];
    }
    return null;
  }
  
  let friendId = friendInput;
  
  if (friendInput.includes('facebook.com') || friendInput.includes('fb.com')) {
    const extracted = extractFacebookId(friendInput);
    if (extracted) {
      friendId = extracted;
    } else {
      return api.sendMessage(`❌| Impossible d'extraire l'ID utilisateur depuis ce lien Facebook.`, threadID);
    }
  }
  
  if (isNaN(friendId) && !friendId.match(/^\d+$/)) {
    try {
      const uid = await usersData.getUID(friendId);
      if (uid) {
        friendId = uid;
      } else {
        return api.sendMessage(`❌| Utilisateur non trouvé: ${friendInput}.`, threadID);
      }
    } catch (error) {
      return api.sendMessage(`❌| Impossible de trouver l'utilisateur: ${friendInput}.`, threadID);
    }
  }
  
  const board = createDamierBoard();
  const starterName = (await usersData.getName(starterId)) || `Joueur ${starterId}`;
  const friendName = (await usersData.getName(friendId)) || `Joueur ${friendId}`;
  const lang = config.language;
  
  const game = {
    board,
    players: [
      { id: starterId, name: starterName, color: 'blanc' },
      { id: friendId, name: friendName, color: 'noir' }
    ],
    turn: 0,
    inProgress: true,
    imageMode: imageModeByThread[threadID] || false,
    startTime: Date.now(),
    moveHistory: [],
    spectators: new Set()
  };
  
  damierGames[threadID] = game;
  ensurePlayerStats(starterId);
  ensurePlayerStats(friendId);
  startGameTimer(api, threadID, game, usersData);
  saveGamesBackup();
  
  const message = getTranslation("vsFriend", lang, { p1: starterName, p2: friendName });
  
  if (game.imageMode) {
    const img = await generateBoardImage(board, game.players[0], game.players, usersData);
    if (img) return sendImage(api, threadID, img, message);
  }
  return api.sendMessage(`${message}\n\n${displayDamier(board)}`, threadID);
}

module.exports = {
  config: {
    name: "dames",
    aliases: ["damiers", "checkers"],
    version: "3.0",
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
    const lang = config.language;

    ensurePlayerStats(senderID);
    loadGamesBackup();

    if (!args || args.length === 0) {
      return api.sendMessage(getTranslation("welcome", lang), threadID, event.messageID);
    }

    const command = (args[0] || '').toLowerCase();
    const arg1 = (args[1] || '').toLowerCase();

    if (command === 'image') {
      if (arg1 === 'on') {
        imageModeByThread[threadID] = true;
        return api.sendMessage(getTranslation("imageModeOn", lang), threadID);
      } else if (arg1 === 'off') {
        imageModeByThread[threadID] = false;
        return api.sendMessage(getTranslation("imageModeOff", lang), threadID);
      }
      return api.sendMessage(`❓| Utilisation: \`dames image on\` ou \`dames image off\``, threadID);
    }

    if (command === 'help') {
      return api.sendMessage(getTranslation("help", lang), threadID, event.messageID);
    }

    if (command === 'difficulty') {
      if (arg1 === 'easy') {
        config.defaultDifficulty = "easy";
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
        return api.sendMessage(`🎮| Difficulté réglée sur: FACILE (l'IA joue aléatoirement)`, threadID);
      } else if (arg1 === 'medium') {
        config.defaultDifficulty = "medium";
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
        return api.sendMessage(`🎮| Difficulté réglée sur: MOYENNE`, threadID);
      } else if (arg1 === 'hard') {
        config.defaultDifficulty = "hard";
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
        return api.sendMessage(`🎮| Difficulté réglée sur: DIFFICILE (l'IA anticipe vos coups)`, threadID);
      }
      return api.sendMessage(`❓| Difficultés disponibles: easy, medium, hard`, threadID);
    }

    if (command === 'spectate') {
      const game = damierGames[threadID];
      if (!game || !game.inProgress) return api.sendMessage(`ℹ️| Aucune partie en cours à observer.`, threadID);
      
      if (arg1 === 'on') {
        if (!game.spectators) game.spectators = new Set();
        game.spectators.add(senderID);
        return api.sendMessage(`👁️| Vous observez maintenant la partie.`, threadID);
      } else if (arg1 === 'off') {
        if (game.spectators) game.spectators.delete(senderID);
        return api.sendMessage(`👁️| Vous ne observez plus la partie.`, threadID);
      }
      return api.sendMessage(`❓| Utilisation: \`dames spectate on/off\``, threadID);
    }

    if (command === 'history') {
      const game = damierGames[threadID];
      if (!game || !game.moveHistory || game.moveHistory.length === 0) {
        return api.sendMessage(`ℹ️| Aucun historique de coups disponible.`, threadID);
      }
      
      let historyText = `📜| Historique des coups (${game.moveHistory.length} coups):\n\n`;
      game.moveHistory.forEach((move, idx) => {
        const fromFile = String.fromCharCode(97 + move.from[1]) + (8 - move.from[0]);
        const toFile = String.fromCharCode(97 + move.to[1]) + (8 - move.to[0]);
        historyText += `${idx + 1}. ${move.player} : ${fromFile} → ${toFile}\n`;
      });
      
      return api.sendMessage(historyText, threadID);
    }

    if (command === 'undo') {
      const game = damierGames[threadID];
      if (!game || !game.inProgress) return api.sendMessage(`ℹ️| Aucune partie en cours.`, threadID);
      
      const currentPlayer = game.players[game.turn];
      if (String(currentPlayer.id) !== String(senderID)) {
        return api.sendMessage(getTranslation("notYourTurn", lang), threadID);
      }
      
      const lastMove = undoLastMove(game);
      if (!lastMove) {
        return api.sendMessage(`❌| Aucun coup à annuler.`, threadID);
      }
      
      clearGameTimer(threadID);
      startGameTimer(api, threadID, game, usersData);
      
      api.sendMessage(`↩️| ${currentPlayer.name} a annulé le dernier coup.`, threadID);
      
      if (game.imageMode) {
        const img = await generateBoardImage(game.board, game.players[game.turn], game.players, usersData);
        if (img) await sendImage(api, threadID, img, getTranslation("yourTurn", lang));
      } else {
        api.sendMessage(`${displayDamier(game.board)}\n\n${getTranslation("yourTurn", lang)}`, threadID);
      }
      return;
    }

    if (command === 'save') {
      const game = damierGames[threadID];
      if (!game || !game.inProgress) return api.sendMessage(`ℹ️| Aucune partie en cours à sauvegarder.`, threadID);
      
      saveGamesBackup();
      return api.sendMessage(`💾| Partie sauvegardée avec succès !`, threadID);
    }

    if (command === 'load') {
      loadGamesBackup();
      if (damierGames[threadID] && damierGames[threadID].inProgress) {
        const game = damierGames[threadID];
        clearGameTimer(threadID);
        startGameTimer(api, threadID, game, usersData);
        
        if (game.imageMode) {
          const img = await generateBoardImage(game.board, game.players[game.turn], game.players, usersData);
          if (img) await sendImage(api, threadID, img, `🔄| Partie chargée ! ${getTranslation("turn", lang, { player: game.players[game.turn].name })}`);
        } else {
          api.sendMessage(`🔄| Partie chargée !\n\n${displayDamier(game.board)}\n\n${getTranslation("turn", lang, { player: game.players[game.turn].name })}`, threadID);
        }
      } else {
        api.sendMessage(`ℹ️| Aucune partie sauvegardée trouvée.`, threadID);
      }
      return;
    }

    if (command === 'elo') {
      let ranking = Object.entries(playerStats)
        .map(([id, stats]) => ({ id, name: id, elo: stats.elo || 1200, wins: stats.wins || 0 }))
        .sort((a, b) => b.elo - a.elo)
        .slice(0, 10);
      
      let rankingText = `🏆| CLASSEMENT ELO TOP 10:\n\n`;
      for (let i = 0; i < ranking.length; i++) {
        const player = ranking[i];
        let playerName = player.name;
        if (player.id !== 'AI' && !isNaN(player.id)) {
          try {
            playerName = await usersData.getName(player.id) || `Joueur ${player.id}`;
          } catch(e) {}
        }
        rankingText += `${i+1}. ${playerName.substring(0, 20)} - ${player.elo} ELO (${player.wins} victoires)\n`;
      }
      
      return api.sendMessage(rankingText, threadID);
    }

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
      
      const stats = playerStats[targetId];
      const winRate = stats.played > 0 ? Math.round((stats.wins / stats.played) * 100) : 0;
      const name = await usersData.getName(targetId) || `Joueur ${targetId}`;
      
      return api.sendMessage(
        getTranslation("stats", lang, {
          name: name,
          wins: stats.wins,
          losses: stats.losses,
          draws: stats.draws,
          played: stats.played,
          ratio: winRate,
          elo: stats.elo || 1200
        }),
        threadID
      );
    }

    if (command === 'ia' || (args[0] && args[0].toLowerCase() === 'hedgehoggpt')) {
      let difficulty = args[1] ? args[1].toLowerCase() : null;
      if (difficulty && ['easy', 'medium', 'hard'].includes(difficulty)) {
        return startGameWithAI(api, threadID, senderID, usersData, difficulty);
      }
      return startGameWithAI(api, threadID, senderID, usersData);
    }

    function extractFacebookId(input) {
      if (/^\d+$/.test(input)) return input;
      const patterns = [
        /facebook\.com\/(?:profile\.php\?id=)(\d+)/i,
        /facebook\.com\/([^\/\?]+)(?:\?|$)/i,
        /fb\.com\/([^\/\?]+)(?:\?|$)/i,
        /facebook\.com\/photo\.php\?fbid=(\d+)/i,
        /fb\.watch\/([a-zA-Z0-9]+)/i
      ];
      for (const pattern of patterns) {
        const match = input.match(pattern);
        if (match) return match[1];
      }
      return null;
    }

    if ((args[0] && args[0].startsWith('@')) || 
        (event.mentions && Object.keys(event.mentions).length > 0) ||
        (args[0] && (args[0].match(/^\d+$/) || args[0].includes('facebook.com') || args[0].includes('fb.com')))) {
      
      let friendId = null;
      
      if (event.mentions && Object.keys(event.mentions).length > 0) {
        friendId = Object.keys(event.mentions)[0];
      } else {
        const raw = args[0];
        if (raw.match(/^\d+$/)) {
          friendId = raw;
        } else if (raw.includes('facebook.com') || raw.includes('fb.com')) {
          const extracted = extractFacebookId(raw);
          if (extracted) {
            friendId = extracted;
          } else {
            return api.sendMessage(`❌| Format de lien Facebook invalide.`, threadID);
          }
        } else if (raw.startsWith('@')) {
          friendId = raw.replace('@', '');
        } else {
          return api.sendMessage(`❌| Format invalide. Utilisez @mention, ID numérique, ou lien Facebook.`, threadID);
        }
      }
      
      if (friendId) {
        return startGameWithFriend(api, threadID, senderID, friendId, usersData);
      }
    }

    if (command === 'abandon') {
      const game = damierGames[threadID];
      if (!game || !game.inProgress) return api.sendMessage(getTranslation("noGame", lang), threadID);
      const player = game.players.find(p => String(p.id) === String(senderID));
      if (!player) return api.sendMessage(getTranslation("notParticipant", lang), threadID);
      const opponent = game.players.find(p => String(p.id) !== String(senderID));
      
      await endGame(api, threadID, game, opponent, usersData);
      return api.sendMessage(getTranslation("abandoned", lang, { player: player.name, winner: opponent.name }), threadID);
    }

    if (command === 'tournoi') {
      const sub = (args[1] || '').toLowerCase();
      if (!tournaments[threadID]) tournaments[threadID] = { participants: [], started: false };
      const tour = tournaments[threadID];
      
      if (sub === 'join') {
        if (tour.started) return api.sendMessage(getTranslation("tournamentAlreadyStarted", lang), threadID);
        if (tour.participants.includes(senderID)) return api.sendMessage(`ℹ️| Vous êtes déjà inscrit au tournoi.`, threadID);
        tour.participants.push(senderID);
        return api.sendMessage(getTranslation("tournamentJoin", lang, { count: tour.participants.length }), threadID);
      } else if (sub === 'leave') {
        if (tour.started) return api.sendMessage(getTranslation("tournamentAlreadyStarted", lang), threadID);
        tour.participants = tour.participants.filter(p => String(p) !== String(senderID));
        return api.sendMessage(getTranslation("tournamentLeave", lang, { count: tour.participants.length }), threadID);
      } else if (sub === 'start') {
        if (tour.started) return api.sendMessage(`❌| Tournoi déjà lancé.`, threadID);
        if (tour.participants.length < 2) return api.sendMessage(getTranslation("tournamentNotEnough", lang), threadID);
        tour.started = true;
        const p1 = tour.participants[0];
        const p2 = tour.participants[1];
        await startGameWithFriend(api, threadID, p1, p2, usersData);
        return api.sendMessage(getTranslation("tournamentStart", lang, { p1: p1, p2: p2 }), threadID);
      } else {
        return api.sendMessage(`❓| Utilisation: \`dames tournoi join|leave|start\``, threadID);
      }
    }

    if (command === 'move' && args.length >= 3) {
      const possibleMove = `${args[1]} ${args[2]}`;
      const parsed = parseDamierMove(possibleMove);
      
      if (parsed) {
        const game = damierGames[threadID];
        if (!game || !game.inProgress) return api.sendMessage(getTranslation("noGame", lang), threadID);
        
        const current = game.players[game.turn];
        if (String(current.id) !== String(senderID)) return api.sendMessage(getTranslation("notYourTurn", lang), threadID);
        
        const [from, to] = parsed;
        const valid = isValidMoveDamier(game.board, from, to, current.color);
        
        if (!valid) return api.sendMessage(getTranslation("invalidMove", lang), threadID);
        
        const isCapture = valid === 'prise';
        recordMoveHistory(game, from, to, current);
        
        const result = await executeMove(api, threadID, game, from, to, isCapture, usersData);
        
        if (!result.moveComplete && result.additionalCaptures) {
          const [firstCapture] = result.additionalCaptures;
          const [[, landingPos]] = firstCapture;
          const [lx, ly] = landingPos;
          const secondCapture = Math.abs(to[0] - lx) === 2 && Math.abs(to[1] - ly) === 2;
          recordMoveHistory(game, to, [lx, ly], current);
          await executeMove(api, threadID, game, to, [lx, ly], secondCapture, usersData);
          api.sendMessage(getTranslation("capture", lang), threadID);
        }
        
        if (result.promoted) {
          api.sendMessage(getTranslation("promotion", lang), threadID);
        }
        
        const hasBlanc = hasPieces(game.board, PION_B, DAME_B);
        const hasNoir = hasPieces(game.board, PION_N, DAME_N);
        
        if (!hasBlanc || !hasNoir) {
          const winner = hasBlanc ? game.players.find(p => p.color === 'blanc') : game.players.find(p => p.color === 'noir');
          await endGame(api, threadID, game, winner, usersData);
          return;
        }
        
        game.turn = (game.turn + 1) % 2;
        clearGameTimer(threadID);
        startGameTimer(api, threadID, game, usersData);
        
        if (game.players[game.turn].id === 'AI') {
          await botPlay(game, api, threadID, usersData);
          return;
        } else {
          if (game.imageMode) {
            const img = await generateBoardImage(game.board, game.players[game.turn], game.players, usersData);
            if (img) {
              await sendImage(api, threadID, img, getTranslation("turn", lang, { player: game.players[game.turn].name }));
              return;
            }
          }
          return api.sendMessage(`${displayDamier(game.board)}\n\n${getTranslation("turn", lang, { player: game.players[game.turn].name })}`, threadID);
        }
      }
      return api.sendMessage(`❌| Format invalide. Utilisez: dames move a3 b4`, threadID);
    }

    if (args.length === 2) {
      const possibleMove = `${args[0]} ${args[1]}`;
      const parsed = parseDamierMove(possibleMove);
      
      if (parsed) {
        const game = damierGames[threadID];
        if (!game || !game.inProgress) return api.sendMessage(getTranslation("noGame", lang), threadID);
        
        const current = game.players[game.turn];
        if (String(current.id) !== String(senderID)) return api.sendMessage(getTranslation("notYourTurn", lang), threadID);
        
        const [from, to] = parsed;
        const valid = isValidMoveDamier(game.board, from, to, current.color);
        
        if (!valid) return api.sendMessage(getTranslation("invalidMove", lang), threadID);
        
        const isCapture = valid === 'prise';
        recordMoveHistory(game, from, to, current);
        
        const result = await executeMove(api, threadID, game, from, to, isCapture, usersData);
        
        if (!result.moveComplete && result.additionalCaptures) {
          const [firstCapture] = result.additionalCaptures;
          const [[, landingPos]] = firstCapture;
          const [lx, ly] = landingPos;
          const secondCapture = Math.abs(to[0] - lx) === 2 && Math.abs(to[1] - ly) === 2;
          recordMoveHistory(game, to, [lx, ly], current);
          await executeMove(api, threadID, game, to, [lx, ly], secondCapture, usersData);
          api.sendMessage(getTranslation("capture", lang), threadID);
        }
        
        if (result.promoted) {
          api.sendMessage(getTranslation("promotion", lang), threadID);
        }
        
        const hasBlanc = hasPieces(game.board, PION_B, DAME_B);
        const hasNoir = hasPieces(game.board, PION_N, DAME_N);
        
        if (!hasBlanc || !hasNoir) {
          const winner = hasBlanc ? game.players.find(p => p.color === 'blanc') : game.players.find(p => p.color === 'noir');
          await endGame(api, threadID, game, winner, usersData);
          return;
        }
        
        game.turn = (game.turn + 1) % 2;
        clearGameTimer(threadID);
        startGameTimer(api, threadID, game, usersData);
        
        if (game.players[game.turn].id === 'AI') {
          await botPlay(game, api, threadID, usersData);
          return;
        } else {
          if (game.imageMode) {
            const img = await generateBoardImage(game.board, game.players[game.turn], game.players, usersData);
            if (img) {
              await sendImage(api, threadID, img, getTranslation("turn", lang, { player: game.players[game.turn].name }));
              return;
            }
          }
          return api.sendMessage(`${displayDamier(game.board)}\n\n${getTranslation("turn", lang, { player: game.players[game.turn].name })}`, threadID);
        }
      }
    }

    return api.sendMessage(`❓| Commande inconnue. Utilisez 'dames help' pour la liste des commandes.`, threadID);
  }
};

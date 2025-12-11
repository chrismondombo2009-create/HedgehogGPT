const fs = require('fs-extra');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');

const STATS_FILE = path.join(__dirname, 'tictactoe_stats.json');
const ASSETS_DIR = path.join(__dirname, 'tictactoe_assets');
const BOT_UID = "61584915780524";
const BOT_NAME = "Hedgehog GPT";

let games = {};
let tournaments = {};
let playerStats = loadStats();
const playerCache = new Map();
const imageModeByThread = {};

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

function saveStats() {
try {
fs.writeFileSync(STATS_FILE, JSON.stringify(playerStats, null, 2));
} catch (e) {}
}

function ensurePlayerStats(id) {
if (!playerStats[id]) playerStats[id] = { wins: 0, losses: 0, draws: 0, played: 0 };
}

function checkWinner(board) {
const winPatterns = [
[0,1,2],[3,4,5],[6,7,8],
[0,3,6],[1,4,7],[2,5,8],
[0,4,8],[2,4,6]
];
for (const [a,b,c] of winPatterns) {
if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
}
return null;
}

function isBoardFull(board) {
return board.every(cell => cell !== null);
}

function displayBoard(board) {
const symbols = { '❌': '❌', '⭕': '⭕', null: '⬜' };
let display = '';
for (let i = 0; i < 9; i++) {
display += symbols[board[i]] || '⬜';
display += (i + 1) % 3 === 0 ? '\n' : ' ';
}
return display;
}

function shuffleArray(array) {
for (let i = array.length - 1; i > 0; i--) {
const j = Math.floor(Math.random() * (i + 1));
[array[i], array[j]] = [array[j], array[i]];
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
return { avatar: null, name: Joueur ${uid}, uid };
}

if (playerCache.has(numericUid)) return playerCache.get(numericUid);

try {
const avatarUrl = await usersData.getAvatarUrl(numericUid);
const avatar = await loadImage(avatarUrl);
const name = await usersData.getName(numericUid) || Joueur ${numericUid};

code
Code
download
content_copy
expand_less
const info = { avatar, name, uid: numericUid };
playerCache.set(numericUid, info);
setTimeout(() => playerCache.delete(numericUid), 300000);

return info;

} catch (error) {
const info = { avatar: null, name: Joueur ${numericUid}, uid: numericUid };
playerCache.set(numericUid, info);
return info;
}
}

function resetGame(gameID, player1, player2, opts = {}) {
const imageMode = opts.imageMode !== undefined ? opts.imageMode : imageModeByThread[opts.threadID] || false;

games[gameID] = {
board: Array(9).fill(null),
players: [
{ id: player1.id, name: player1.name || Joueur ${player1.id}, symbol: "❌" },
{ id: player2.id, name: player2.name || Joueur ${player2.id}, symbol: "⭕" }
],
currentPlayerIndex: 0,
inProgress: true,
isMathChallenge: false,
threadID: opts.threadID || player1.threadID || null,
isTournamentGame: !!opts.isTournamentGame,
tournamentID: opts.tournamentID || null,
matchIndex: opts.matchIndex != null ? opts.matchIndex : null,
isAI: !!opts.isAI,
aiDifficulty: opts.aiDifficulty || 'normal',
imageMode: imageMode
};
}

async function generateBoardImage(board, currentPlayer, players, usersData, gameType = "normal") {
try {
const canvasWidth = 1400;
const canvasHeight = 1000;
const canvas = createCanvas(canvasWidth, canvasHeight);
const ctx = canvas.getContext('2d');

code
Code
download
content_copy
expand_less
const gradient = ctx.createLinearGradient(0, 0, canvasWidth, canvasHeight);
gradient.addColorStop(0, '#0a0a0a');
gradient.addColorStop(1, '#1a1a2e');
ctx.fillStyle = gradient;
ctx.fillRect(0, 0, canvasWidth, canvasHeight);

if (gameType === "tournament") {
  ctx.fillStyle = 'rgba(255, 215, 0, 0.1)';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  
  ctx.font = 'bold 45px Arial';
  ctx.fillStyle = '#FFD700';
  ctx.textAlign = 'center';
  ctx.fillText('◆━━━━━▣✦▣━━━━━━◆', canvasWidth/2, 60);
  ctx.fillText('🏆 TOURNOI 🏆', canvasWidth/2, 120);
  ctx.fillText('◆━━━━━▣✦▣━━━━━━◆', canvasWidth/2, 180);
}

const playerInfos = await Promise.all(players.map(p => getPlayerInfo(p.id, usersData)));

const boardSize = 600;
const boardX = canvasWidth/2 - boardSize/2;
const boardY = 250;

ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
ctx.fillRect(boardX - 20, boardY - 20, boardSize + 40, boardSize + 40);

ctx.strokeStyle = '#4cc9f0';
ctx.lineWidth = 8;

for (let i = 1; i <= 2; i++) {
  ctx.beginPath();
  ctx.moveTo(boardX + (boardSize/3)*i, boardY);
  ctx.lineTo(boardX + (boardSize/3)*i, boardY + boardSize);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(boardX, boardY + (boardSize/3)*i);
  ctx.lineTo(boardX + boardSize, boardY + (boardSize/3)*i);
  ctx.stroke();
}

ctx.font = 'bold 100px Arial';
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';

for (let i = 0; i < 9; i++) {
  const row = Math.floor(i / 3);
  const col = i % 3;
  const x = boardX + (col * (boardSize/3)) + (boardSize/6);
  const y = boardY + (row * (boardSize/3)) + (boardSize/6);

  if (board[i] === '❌') {
    ctx.fillStyle = '#ff6b6b';
    ctx.fillText('❌', x, y);
  } else if (board[i] === '⭕') {
    ctx.fillStyle = '#4ecdc4';
    ctx.fillText('⭕', x, y);
  } else {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.font = 'bold 35px Arial';
    ctx.fillText((i + 1).toString(), x, y);
    ctx.font = 'bold 100px Arial';
  }
}

const avatarSize = 120;
const infoWidth = 350;

for (let i = 0; i < 2; i++) {
  const player = playerInfos[i];
  const playerData = players[i];
  const isCurrent = currentPlayer && currentPlayer.id === playerData.id;
  
  const panelX = i === 0 ? 100 : canvasWidth - infoWidth - 100;
  const panelY = 250;
  const panelHeight = 450;
  
  ctx.fillStyle = isCurrent ? 'rgba(76, 201, 240, 0.15)' : 'rgba(255, 255, 255, 0.05)';
  ctx.fillRect(panelX, panelY, infoWidth, panelHeight);
  
  ctx.strokeStyle = isCurrent ? '#4cc9f0' : 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 4;
  ctx.strokeRect(panelX, panelY, infoWidth, panelHeight);
  
  if (player.avatar) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(panelX + infoWidth/2, panelY + 100, avatarSize/2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(player.avatar, panelX + infoWidth/2 - avatarSize/2, panelY + 100 - avatarSize/2, avatarSize, avatarSize);
    ctx.restore();
    
    ctx.strokeStyle = playerData.symbol === '❌' ? '#ff6b6b' : '#4ecdc4';
    ctx.lineWidth = 6;
    ctx.stroke();
  }
  
  ctx.font = 'bold 32px Arial';
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.fillText(player.name.substring(0, 25), panelX + infoWidth/2, panelY + 250);
  
  ctx.font = 'bold 50px Arial';
  ctx.fillStyle = playerData.symbol === '❌' ? '#ff6b6b' : '#4ecdc4';
  ctx.fillText(playerData.symbol, panelX + infoWidth/2, panelY + 320);
  
  if (isCurrent) {
    ctx.font = 'bold 28px Arial';
    ctx.fillStyle = '#4cc9f0';
    ctx.fillText('⬅︎ TOUR ACTUEL', panelX + infoWidth/2, panelY + 380);
  }
}

if (currentPlayer) {
  ctx.font = 'bold 40px Arial';
  ctx.fillStyle = currentPlayer.symbol === '❌' ? '#ff6b6b' : '#4ecdc4';
  ctx.textAlign = 'center';
  ctx.fillText('➲', canvasWidth/2, boardY + boardSize + 100);
  ctx.fillText(`Tour de : ${currentPlayer.name}`, canvasWidth/2, boardY + boardSize + 160);
}

const availableMoves = board.map((cell, idx) => cell === null ? idx + 1 : null).filter(x => x !== null);
ctx.font = 'bold 28px Arial';
ctx.fillStyle = '#888888';
ctx.fillText(`Cases disponibles: ${availableMoves.join(', ')}`, canvasWidth/2, boardY + boardSize + 220);

return canvas.toBuffer();

} catch (error) {
return null;
}
}

async function generateEndGameImage(board, winner, players, usersData, isDraw = false) {
try {
const canvasWidth = 1400;
const canvasHeight = 1000;
const canvas = createCanvas(canvasWidth, canvasHeight);
const ctx = canvas.getContext('2d');

code
Code
download
content_copy
expand_less
const gradient = ctx.createLinearGradient(0, 0, canvasWidth, canvasHeight);
gradient.addColorStop(0, '#0a0a0a');
gradient.addColorStop(1, '#1a1a2e');
ctx.fillStyle = gradient;
ctx.fillRect(0, 0, canvasWidth, canvasHeight);

const playerInfos = await Promise.all(players.map(p => getPlayerInfo(p.id, usersData)));

const boardSize = 500;
const boardX = canvasWidth/2 - boardSize/2;
const boardY = 150;

ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
ctx.fillRect(boardX - 20, boardY - 20, boardSize + 40, boardSize + 40);

ctx.strokeStyle = '#4cc9f0';
ctx.lineWidth = 8;

for (let i = 1; i <= 2; i++) {
  ctx.beginPath();
  ctx.moveTo(boardX + (boardSize/3)*i, boardY);
  ctx.lineTo(boardX + (boardSize/3)*i, boardY + boardSize);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(boardX, boardY + (boardSize/3)*i);
  ctx.lineTo(boardX + boardSize, boardY + (boardSize/3)*i);
  ctx.stroke();
}

ctx.font = 'bold 80px Arial';
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';

for (let i = 0; i < 9; i++) {
  const row = Math.floor(i / 3);
  const col = i % 3;
  const x = boardX + (col * (boardSize/3)) + (boardSize/6);
  const y = boardY + (row * (boardSize/3)) + (boardSize/6);

  if (board[i] === '❌') {
    ctx.fillStyle = '#ff6b6b';
    ctx.fillText('❌', x, y);
  } else if (board[i] === '⭕') {
    ctx.fillStyle = '#4ecdc4';
    ctx.fillText('⭕', x, y);
  } else {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.font = 'bold 30px Arial';
    ctx.fillText((i + 1).toString(), x, y);
    ctx.font = 'bold 80px Arial';
  }
}

const avatarSize = 120;
const infoWidth = 300;

for (let i = 0; i < 2; i++) {
  const player = playerInfos[i];
  const playerData = players[i];
  const isWinner = winner && winner.id === playerData.id;
  
  const panelX = i === 0 ? 100 : canvasWidth - infoWidth - 100;
  const panelY = 700;
  const panelHeight = 200;
  
  ctx.fillStyle = isWinner ? 'rgba(255, 215, 0, 0.2)' : 'rgba(255, 255, 255, 0.05)';
  ctx.fillRect(panelX, panelY, infoWidth, panelHeight);
  
  ctx.strokeStyle = isWinner ? '#FFD700' : 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 4;
  ctx.strokeRect(panelX, panelY, infoWidth, panelHeight);
  
  if (player.avatar) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(panelX + infoWidth/2, panelY + 50, avatarSize/2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(player.avatar, panelX + infoWidth/2 - avatarSize/2, panelY + 50 - avatarSize/2, avatarSize, avatarSize);
    ctx.restore();
    
    ctx.strokeStyle = playerData.symbol === '❌' ? '#ff6b6b' : '#4ecdc4';
    ctx.lineWidth = 4;
    ctx.stroke();
  }
  
  ctx.font = 'bold 28px Arial';
  ctx.fillStyle = isWinner ? '#FFD700' : '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.fillText(player.name.substring(0, 20), panelX + infoWidth/2, panelY + 150);
  
  ctx.font = 'bold 40px Arial';
  ctx.fillStyle = playerData.symbol === '❌' ? '#ff6b6b' : '#4ecdc4';
  ctx.fillText(playerData.symbol, panelX + infoWidth/2, panelY + 180);
  
  if (isWinner) {
    ctx.font = 'bold 24px Arial';
    ctx.fillStyle = '#FFD700';
    ctx.fillText('🏆 GAGNANT', panelX + infoWidth/2, panelY + 220);
  }
}

ctx.font = 'bold 60px Arial';
ctx.fillStyle = isDraw ? '#4cc9f0' : '#FFD700';
ctx.textAlign = 'center';

if (isDraw) {
  ctx.fillText('◆━━━━━▣✦▣━━━━━━◆', canvasWidth/2, 650);
  ctx.fillText('🤝 MATCH NUL 🤝', canvasWidth/2, 720);
  ctx.fillText('◆━━━━━▣✦▣━━━━━━◆', canvasWidth/2, 790);
} else if (winner) {
  ctx.fillText('◆━━━━━▣✦▣━━━━━━◆', canvasWidth/2, 650);
  ctx.fillText(`🎉 ${winner.name} A GAGNÉ ! 🏆`, canvasWidth/2, 720);
  ctx.fillText('◆━━━━━▣✦▣━━━━━━◆', canvasWidth/2, 790);
}

ctx.font = 'italic 28px Arial';
ctx.fillStyle = '#888888';
ctx.fillText('☞【𝐻𝑒𝑑𝑔𝑒ℎ𝑜𝑔𝄞𝙂𝙋𝙏】', canvasWidth/2, 950);

return canvas.toBuffer();

} catch (error) {
return null;
}
}

async function generateTournamentBracketImage(tournament, usersData) {
try {
const playerCount = tournament.players.length;
const width = 2000;
const height = 1600;

code
Code
download
content_copy
expand_less
const canvas = createCanvas(width, height);
const ctx = canvas.getContext('2d');

const gradient = ctx.createLinearGradient(0, 0, width, height);
gradient.addColorStop(0, '#0a0a0a');
gradient.addColorStop(1, '#1a1a2e');
ctx.fillStyle = gradient;
ctx.fillRect(0, 0, width, height);

ctx.font = 'bold 60px Arial';
ctx.fillStyle = '#4cc9f0';
ctx.textAlign = 'center';
ctx.fillText('🏆 BRACKET TOURNOI 🏆', width/2, 80);

ctx.font = 'bold 30px Arial';
ctx.fillStyle = '#FFFFFF';
ctx.fillText(`Statut: ${getTournamentStatus(tournament)}`, width/2, 140);

if (tournament.status === 'registration') {
  ctx.font = 'bold 50px Arial';
  ctx.fillStyle = '#FFD700';
  ctx.fillText(`EN ATTENTE DE JOUEURS`, width/2, height/2 - 100);
  
  const needed = tournament.requiredPlayers - playerCount;
  ctx.font = 'bold 40px Arial';
  ctx.fillStyle = '#888888';
  ctx.fillText(`Inscrits: ${playerCount} / ${tournament.requiredPlayers}`, width/2, height/2);
  ctx.fillText(`(Manque ${needed})`, width/2, height/2 + 60);

  let yList = height/2 + 150;
  ctx.font = '28px Arial';
  ctx.fillStyle = '#FFFFFF';
  tournament.players.forEach((p, i) => {
    ctx.fillText(`${i+1}. ${p.name}`, width/2, yList + (i * 40));
  });
  return canvas.toBuffer();
}

const roundCount = tournament.rounds.length;
const columnWidth = (width - 200) / roundCount;
const startX = 100;

const positions = {}; 

for (let r = 0; r < roundCount; r++) {
  const round = tournament.rounds[r];
  const matchCount = round.matches.length;
  const x = startX + (r * columnWidth);
  
  ctx.font = 'bold 32px Arial';
  ctx.fillStyle = r === tournament.currentRoundIndex ? '#FFD700' : '#4cc9f0';
  ctx.textAlign = 'center';
  ctx.fillText(round.name.toUpperCase(), x + 150, 200);

  positions[r] = [];

  for (let m = 0; m < matchCount; m++) {
    const match = round.matches[m];
    let y;

    if (r === 0) {
      const totalHeight = height - 300;
      const spacing = totalHeight / matchCount;
      y = 300 + (m * spacing) + (spacing/2) - 60;
    } else {
      const parent1 = positions[r-1][m*2];
      const parent2 = positions[r-1][m*2+1];
      if (parent1 && parent2) {
        y = (parent1.y + parent2.y) / 2;
      } else {
         y = 300 + (m * 200);
      }
    }
    
    positions[r].push({x, y});

    const p1 = tournament.players.find(p => p.id === match.player1);
    const p2 = tournament.players.find(p => p.id === match.player2);
    
    const p1Name = p1 ? p1.name.substring(0, 15) : '???';
    const p2Name = p2 ? p2.name.substring(0, 15) : '???';

    const boxWidth = 280;
    const boxHeight = 100;

    if (r > 0) {
      const parent1 = positions[r-1][m*2];
      const parent2 = positions[r-1][m*2+1];
      ctx.strokeStyle = '#4cc9f0';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(parent1.x + boxWidth, parent1.y + boxHeight/2);
      ctx.lineTo(x, y + boxHeight/2);
      ctx.moveTo(parent2.x + boxWidth, parent2.y + boxHeight/2);
      ctx.lineTo(x, y + boxHeight/2);
      ctx.stroke();
    }

    ctx.fillStyle = match.completed ? '#16213e' : '#1a1a2e';
    ctx.fillRect(x, y, boxWidth, boxHeight);
    ctx.lineWidth = 3;
    ctx.strokeStyle = match.completed ? (match.winner ? '#00ff00' : '#ffff00') : '#4cc9f0';
    ctx.strokeRect(x, y, boxWidth, boxHeight);

    ctx.font = 'bold 20px Arial';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    
    ctx.fillStyle = match.winner === match.player1 ? '#00ff00' : '#ffffff';
    ctx.fillText(p1Name, x + 10, y + 35);
    ctx.fillStyle = match.winner === match.player2 ? '#00ff00' : '#ffffff';
    ctx.fillText(p2Name, x + 10, y + 80);

    if (match.completed && match.winner) {
       ctx.font = '20px Arial';
       ctx.fillStyle = '#FFD700';
       ctx.fillText('👑', x + 240, match.winner === match.player1 ? y+35 : y+80);
    }
  }
}

if (tournament.winner) {
  const winnerName = tournament.players.find(p => p.id === tournament.winner)?.name || 'Champion';
  ctx.font = 'bold 60px Arial';
  ctx.fillStyle = '#FFD700';
  ctx.textAlign = 'center';
  ctx.fillText(`👑 ${winnerName} 👑`, width/2, height - 80);
}

return canvas.toBuffer();

} catch (error) {
return null;
}
}

function getTournamentStatus(tournament) {
switch(tournament.status) {
case 'registration': return 'INSCRIPTION';
case 'in_progress': return 'EN COURS';
case 'completed': return 'TERMINÉ';
default: return 'INCONNU';
}
}

async function generateStatsImage(playerStatsData, playerId, usersData) {
try {
const playerInfo = await getPlayerInfo(playerId, usersData);
const stats = playerStatsData[playerId] || { wins: 0, losses: 0, draws: 0, played: 0 };
const winRate = stats.played > 0 ? Math.round((stats.wins / stats.played) * 100) : 0;

code
Code
download
content_copy
expand_less
const canvas = createCanvas(1400, 900);
const ctx = canvas.getContext('2d');

const gradient = ctx.createLinearGradient(0, 0, 1400, 900);
gradient.addColorStop(0, '#0a0a0a');
gradient.addColorStop(1, '#1a1a2e');
ctx.fillStyle = gradient;
ctx.fillRect(0, 0, 1400, 900);

ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
ctx.fillRect(50, 50, 1300, 800);

ctx.font = 'bold 55px Arial';
ctx.fillStyle = '#4cc9f0';
ctx.textAlign = 'center';
ctx.fillText('◆━━━━━▣✦▣━━━━━━◆', 700, 60);
ctx.fillText('📊 STATISTIQUES MORPION', 700, 130);
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
ctx.fillText('☞【𝐻𝑒𝑑𝑔𝑒ℎ𝑜𝑔𝄞𝙂𝙋𝙏】 • Système TicTacToe Ultimate', 700, 860);

return canvas.toBuffer();

} catch (error) {
return null;
}
}

async function generateHelpImage() {
try {
const canvas = createCanvas(1400, 1000);
const ctx = canvas.getContext('2d');

code
Code
download
content_copy
expand_less
const gradient = ctx.createLinearGradient(0, 0, 1400, 1000);
gradient.addColorStop(0, '#0a0a0a');
gradient.addColorStop(1, '#1a1a2e');
ctx.fillStyle = gradient;
ctx.fillRect(0, 0, 1400, 1000);

ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
ctx.fillRect(50, 50, 1300, 900);

ctx.font = 'bold 55px Arial';
ctx.fillStyle = '#4cc9f0';
ctx.textAlign = 'center';
ctx.fillText('◆━━━━━▣✦▣━━━━━━◆', 700, 90);
ctx.fillText('🤖 TICTACTOE ULTIMATE', 700, 170);
ctx.fillText('◆━━━━━▣✦▣━━━━━━◆', 700, 250);

const helpText = [
  { title: '🎮 JOUER', commands: [
    '`ttt @joueur` - 1v1 contre un ami',
    '`ttt ia [facile|normal|dur]` - Contre l\'IA',
    '`ttt` - Afficher cette aide'
  ]},
  { title: '📊 STATISTIQUES', commands: [
    '`ttt stats` - Voir vos stats'
  ]},
  { title: '🏆 TOURNOI (4, 8 ou 16 joueurs)', commands: [
    '`ttt tournoi` - Créer/afficher',
    '`ttt join` - Rejoindre',
    '`ttt out` - Quitter',
    '`ttt tournoi start` - Démarrer'
  ]},
  { title: '🎨 AFFICHAGE', commands: [
    '`ttt image on/off` - Mode image'
  ]},
  { title: '🎯 EN JEU', commands: [
    'Choisir case (1-9)',
    '`forfait` - Abandonner',
    '`restart` - Rejouer (1v1 uniquement)'
  ]}
];

let y = 350;
ctx.font = 'bold 36px Arial';
ctx.fillStyle = '#FFFFFF';
ctx.textAlign = 'left';

for (const section of helpText) {
  ctx.fillStyle = '#FFD700';
  ctx.fillText(section.title, 150, y);
  y += 60;
  
  ctx.font = 'bold 30px Arial';
  ctx.fillStyle = '#CCCCCC';
  
  for (const cmd of section.commands) {
    ctx.fillText(cmd, 180, y);
    y += 50;
  }
  
  y += 40;
  ctx.font = 'bold 36px Arial';
}

ctx.font = 'italic 28px Arial';
ctx.fillStyle = '#888888';
ctx.textAlign = 'center';
ctx.fillText('☞【𝐻𝑒𝑑𝑔𝑒ℎ𝑜𝑔𝄞𝙂𝙋𝙏】 • Commande `ttt help`', 700, 950);

return canvas.toBuffer();

} catch (error) {
return null;
}
}

async function sendImage(api, threadID, imageBuffer, text = "") {
try {
if (!imageBuffer) return;

code
Code
download
content_copy
expand_less
const timestamp = Date.now();
const random = Math.random().toString(36).substring(2, 12);
const fileName = `tictactoe_${timestamp}_${random}.png`;
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

function getAvailableMoves(board) {
return board.map((v,i) => v === null ? i : -1).filter(i => i !== -1);
}

function aiMoveEasy(board) {
const moves = getAvailableMoves(board);
return moves.length ? moves[Math.floor(Math.random()*moves.length)] : null;
}

function aiMoveNormal(board, aiSymbol, humanSymbol) {
for (const m of getAvailableMoves(board)) {
const copy = [...board];
copy[m] = aiSymbol;
if (checkWinner(copy) === aiSymbol) return m;
}

for (const m of getAvailableMoves(board)) {
const copy = [...board];
copy[m] = humanSymbol;
if (checkWinner(copy) === humanSymbol) return m;
}

if (board[4] === null) return 4;

const corners = [0,2,6,8].filter(i => board[i] === null);
if (corners.length) return corners[Math.floor(Math.random()*corners.length)];

return aiMoveEasy(board);
}

function aiMoveHard(board, aiSymbol, humanSymbol) {
function minimax(b, depth, isMaximizing) {
const winner = checkWinner(b);
if (winner === aiSymbol) return 10 - depth;
if (winner === humanSymbol) return depth - 10;
if (isBoardFull(b)) return 0;

code
Code
download
content_copy
expand_less
let best;
if (isMaximizing) {
  best = -Infinity;
  for (const m of getAvailableMoves(b)) {
    b[m] = aiSymbol;
    const score = minimax(b, depth + 1, false);
    b[m] = null;
    if (score > best) best = score;
  }
  return best;
} else {
  best = Infinity;
  for (const m of getAvailableMoves(b)) {
    b[m] = humanSymbol;
    const score = minimax(b, depth + 1, true);
    b[m] = null;
    if (score < best) best = score;
  }
  return best;
}

}

let bestScore = -Infinity;
let bestMove = null;

for (const m of getAvailableMoves(board)) {
board[m] = aiSymbol;
const score = minimax(board, 0, false);
board[m] = null;
if (score > bestScore) {
bestScore = score;
bestMove = m;
}
}

return bestMove !== null ? bestMove : aiMoveEasy(board);
}

async function applyAIMove(gameID, api, usersData) {
const game = games[gameID];
if (!game || !game.inProgress || !game.isAI) return;

const aiIndex = game.players.findIndex(p => p.id === 'AI');
if (aiIndex === -1) return;
if (game.currentPlayerIndex !== aiIndex) return;

const aiSym = game.players[aiIndex].symbol;
const humanSym = game.players[1 - aiIndex].symbol;
let pos = null;

const diff = (game.aiDifficulty || 'normal').toLowerCase();
if (diff === 'easy') pos = aiMoveEasy(game.board);
else if (diff === 'normal') pos = aiMoveNormal(game.board, aiSym, humanSym);
else pos = aiMoveHard(game.board, aiSym, humanSym);

if (pos == null) return;

game.board[pos] = aiSym;

const winner = checkWinner(game.board);
const isDraw = isBoardFull(game.board);

if (winner || isDraw) {
return handleGameEnd(gameID, api, { threadID: game.threadID, senderID: 'AI' }, usersData);
}

game.currentPlayerIndex = (game.currentPlayerIndex + 1) % 2;

if (game.imageMode) {
const boardImage = await generateBoardImage(
game.board,
game.players[game.currentPlayerIndex],
game.players,
usersData,
game.isTournamentGame ? "tournament" : "normal"
);
if (boardImage) {
await sendImage(api, game.threadID, boardImage, ➲ Tour de : ${game.players[game.currentPlayerIndex].name});
}
} else {
const next = game.players[game.currentPlayerIndex];
await api.sendMessage(
◆━━━━━▣✦▣━━━━━━◆\n +
${displayBoard(game.board)}\n\n +
➲ Tour de : ${next.name}\n +
◆━━━━━▣✦▣━━━━━━◆,
game.threadID
);
}
}

async function handleGameEnd(gameID, api, event, usersData) {
const game = games[gameID];
if (!game) return;

const winnerSym = checkWinner(game.board);
const isDraw = isBoardFull(game.board) && !winnerSym;

if (winnerSym) {
const winner = game.players.find(p => p.symbol === winnerSym);
const loser = game.players.find(p => p.symbol !== winnerSym);

code
Code
download
content_copy
expand_less
ensurePlayerStats(winner.id);
ensurePlayerStats(loser.id);
playerStats[winner.id].wins++;
playerStats[winner.id].played++;
playerStats[loser.id].losses++;
playerStats[loser.id].played++;
saveStats();

if (game.imageMode) {
  const endImage = await generateEndGameImage(game.board, winner, game.players, usersData, false);
  if (endImage) {
    await sendImage(api, game.threadID, endImage);
  }
} else {
  await api.sendMessage(
    `◆━━━━━▣✦▣━━━━━━◆\n` +
    `${displayBoard(game.board)}\n\n` +
    `🎉 ${winner.name} a gagné ! 🏆\n` +
    `◆━━━━━▣✦▣━━━━━━◆`,
    game.threadID
  );
}

game.inProgress = false;

if (game.isTournamentGame && tournaments[game.tournamentID]) {
  const tournament = tournaments[game.tournamentID];
  const currentRound = tournament.rounds[tournament.currentRoundIndex];
  const match = currentRound.matches[game.matchIndex];
  
  if (match) {
    match.winner = winner.id;
    match.completed = true;
  }
  
  const doneAll = currentRound.matches.every(m => m.completed);
  if (doneAll) {
    if (tournament.imageMode) {
      const bracketImage = await generateTournamentBracketImage(tournament, usersData);
      await sendImage(api, game.threadID, bracketImage);
    } else {
      await api.sendMessage(
        `◆━━━━━▣✦▣━━━━━━◆\n` +
        `⚡ Tous les matchs du tour "${currentRound.name}" sont terminés !\n` +
        `◆━━━━━▣✦▣━━━━━━◆`,
        game.threadID
      );
    }
    await advanceTournamentRound(game.tournamentID, api, usersData);
  } else {
    await initiateNextMatch(game.tournamentID, api, usersData);
  }
} else {
  if (!game.imageMode) {
    await api.sendMessage(`Tapez "restart" pour rejouer.`, game.threadID);
  }
}

} else if (isDraw) {
game.players.forEach(p => {
ensurePlayerStats(p.id);
playerStats[p.id].draws++;
playerStats[p.id].played++;
});
saveStats();

code
Code
download
content_copy
expand_less
if (game.isTournamentGame && tournaments[game.tournamentID]) {
  const tournament = tournaments[game.tournamentID];
  const currentRound = tournament.rounds[tournament.currentRoundIndex];
  const match = currentRound.matches[game.matchIndex];
  
  match.drawCount = (match.drawCount || 0) + 1;

  if (match.drawCount >= 3) {
    game.inProgress = true;
    game.isMathChallenge = true;
    
    const mathProblem = `√(7 + √48)²⁰²⁴ × √(7 - √48)²⁰²⁴ + 1`;
    
    await api.sendMessage(
        `◆━━━━━▣✦▣━━━━━━◆\n` +
        `🤯 3 MATCHS NULS DE SUITE !\n` +
        `⚡ DÉPARTAGE MATHÉMATIQUE ⚡\n\n` +
        `Résolvez ceci : ${mathProblem}\n\n` +
        `Le premier qui donne la réponse gagne !\n` +
        `◆━━━━━▣✦▣━━━━━━◆`,
        game.threadID
    );
  } else {
    await api.sendMessage(
        `◆━━━━━▣✦▣━━━━━━◆\n` +
        `🤝 MATCH NUL (Tentative ${match.drawCount}/3)\n` +
        `🔄 Revanche immédiate !\n` +
        `◆━━━━━▣✦▣━━━━━━◆`,
        game.threadID
    );
    
    resetGame(gameID, game.players[0], game.players[1], {
        isTournamentGame: true,
        tournamentID: game.tournamentID,
        matchIndex: game.matchIndex,
        threadID: game.threadID,
        imageMode: game.imageMode
    });
    
    if (game.imageMode) {
      const boardImage = await generateBoardImage(
        games[gameID].board,
        games[gameID].players[0],
        games[gameID].players,
        usersData,
        "tournament"
      );
      await sendImage(api, game.threadID, boardImage, `➲ Nouvelle tentative : Tour de ${games[gameID].players[0].name}`);
    } else {
      await api.sendMessage(`Nouvelle partie lancée. ${games[gameID].players[0].name}, à toi !`, game.threadID);
    }
  }
} else {
  if (game.imageMode) {
    const endImage = await generateEndGameImage(game.board, null, game.players, usersData, true);
    if (endImage) await sendImage(api, game.threadID, endImage);
  } else {
    await api.sendMessage(
      `◆━━━━━▣✦▣━━━━━━◆\n` +
      `${displayBoard(game.board)}\n\n` +
      `🤝 Match nul ! Égalité parfaite.\n` +
      `◆━━━━━▣✦▣━━━━━━◆`,
      game.threadID
    );
    await api.sendMessage(`Tapez "restart" pour rejouer.`, game.threadID);
  }
  game.inProgress = false;
}

}

game.restartPrompted = true;
}

function createTournament(threadID) {
tournaments[threadID] = {
id: threadID,
players: [],
status: 'registration',
rounds: [],
currentRoundIndex: -1,
winner: null,
threadID,
requiredPlayers: 4,
imageMode: imageModeByThread[threadID] || false
};
return tournaments[threadID];
}

function generateTournamentBracketText(tournament) {
let text = '◆━━━━━▣✦▣━━━━━━◆\n';
text += '🏆 TOURNOI MORPION 🏆\n';
text += '◆━━━━━▣✦▣━━━━━━◆\n\n';
text += ➲ Status: ${getTournamentStatus(tournament)}\n;
text += ➲ Joueurs: ${tournament.players.length}/${tournament.requiredPlayers}\n\n;

if (tournament.players.length === 0) {
text += '➲ (Aucun joueur inscrit)\n';
} else {
text += '➲ Participants:\n';
tournament.players.forEach((p, i) => {
text += ${i+1}. ${p.name}\n;
});
}

if (tournament.status !== 'registration' && tournament.rounds.length > 0) {
text += '\n➲ Structure du tournoi:\n';

code
Code
download
content_copy
expand_less
tournament.rounds.forEach(round => {
  text += `  • ${round.name}: ${round.matches.filter(m => m.completed).length}/${round.matches.length} matchs\n`;
});

const currentRound = tournament.rounds[tournament.currentRoundIndex];
if (currentRound) {
  text += `\n➲ Tour actuel: ${currentRound.name}\n`;
  currentRound.matches.forEach((match, i) => {
    const p1 = tournament.players.find(p => p.id === match.player1);
    const p2 = tournament.players.find(p => p.id === match.player2);
    const status = match.completed ? 
      (match.winner ? `🏆 ${tournament.players.find(p => p.id === match.winner)?.name}` : '🤝 Nul') : 
      '⏳ En attente';
    text += `  Match ${i+1}: ${p1?.name || '??'} vs ${p2?.name || '??'} → ${status}\n`;
  });
}

}

if (tournament.status === 'completed' && tournament.winner) {
const winner = tournament.players.find(p => p.id === tournament.winner);
text += '\n◆━━━━━▣✦▣━━━━━━◆\n';
text += 🏆 CHAMPION: ${winner?.name || 'Inconnu'}\n;
text += '◆━━━━━▣✦▣━━━━━━◆';
} else {
text += '\n◆━━━━━▣✦▣━━━━━━◆';
}

return text;
}

async function startTournament(tournamentID, api, usersData) {
const tournament = tournaments[tournamentID];
if (!tournament) return;

const num = tournament.players.length;
if (![4, 8, 16].includes(num)) {
return api.sendMessage(
◆━━━━━▣✦▣━━━━━━◆\n +
❌ Le tournoi doit avoir exactement 4, 8 ou 16 joueurs. Actuels: ${num}\n +
◆━━━━━▣✦▣━━━━━━◆,
tournament.threadID
);
}

tournament.status = 'in_progress';
shuffleArray(tournament.players);

let rounds = [];
if (num === 16) {
rounds = [
{ name: "Huitièmes", matches: [] },
{ name: "Quarts", matches: [] },
{ name: "Demi-finales", matches: [] },
{ name: "Finale", matches: [] }
];
} else if (num === 8) {
rounds = [
{ name: "Quarts", matches: [] },
{ name: "Demi-finales", matches: [] },
{ name: "Finale", matches: [] }
];
} else {
rounds = [
{ name: "Demi-finales", matches: [] },
{ name: "Finale", matches: [] }
];
}

tournament.rounds = rounds;
tournament.currentRoundIndex = 0;
tournament.winner = null;

const matches0 = [];
for (let i = 0; i < num; i += 2) {
matches0.push({
player1: tournament.players[i].id,
player2: tournament.players[i+1].id,
winner: null,
completed: false,
gameID: null,
drawCount: 0
});
}

tournament.rounds[0].matches = matches0;

if (tournament.imageMode) {
const bracketImage = await generateTournamentBracketImage(tournament, usersData);
await sendImage(api, tournament.threadID, bracketImage,
◆━━━━━▣✦▣━━━━━━◆\n +
🎉 Le tournoi démarre !\n +
◆━━━━━▣✦▣━━━━━━◆
);
} else {
const bracketText = generateTournamentBracketText(tournament);
await api.sendMessage(
◆━━━━━▣✦▣━━━━━━◆\n +
🎉 Le tournoi démarre !\n\n +
${bracketText},
tournament.threadID
);
}

await initiateNextMatch(tournamentID, api, usersData);
}

async function initiateNextMatch(tournamentID, api, usersData) {
const T = tournaments[tournamentID];
if (!T) return;

const round = T.rounds[T.currentRoundIndex];
const idx = round.matches.findIndex(m => !m.completed && m.gameID === null);
if (idx === -1) return;

const match = round.matches[idx];
const p1 = T.players.find(p => p.id === match.player1);
const p2 = T.players.find(p => p.id === match.player2);

if (!p1 || !p2) {
await api.sendMessage(
◆━━━━━▣✦▣━━━━━━◆\n +
❌ Erreur: joueur introuvable pour match de tournoi.\n +
◆━━━━━▣✦▣━━━━━━◆,
T.threadID
);
return;
}

const p1Info = await getPlayerInfo(p1.id, usersData);
const p2Info = await getPlayerInfo(p2.id, usersData);

const gameID = ${T.threadID}:tournament:${T.id}:${T.currentRoundIndex}:${idx};
resetGame(gameID,
{ id: p1.id, name: p1Info.name, threadID: T.threadID },
{ id: p2.id, name: p2Info.name, threadID: T.threadID },
{
isTournamentGame: true,
tournamentID,
matchIndex: idx,
threadID: T.threadID,
imageMode: T.imageMode
}
);

round.matches[idx].gameID = gameID;

if (T.imageMode) {
const boardImage = await generateBoardImage(
games[gameID].board,
games[gameID].players[0],
games[gameID].players,
usersData,
"tournament"
);
await sendImage(api, T.threadID, boardImage,
◆━━━━━▣✦▣━━━━━━◆\n +
🎬 ${round.name} - Match ${idx+1}\n +
${p1Info.name} ❌ vs ${p2Info.name} ⭕\n +
◆━━━━━▣✦▣━━━━━━◆
);
} else {
await api.sendMessage(
◆━━━━━▣✦▣━━━━━━◆\n +
🎬 ${round.name} - Match ${idx+1}\n +
${p1Info.name} ❌ vs ${p2Info.name} ⭕\n\n +
${displayBoard(games[gameID].board)}\n\n +
${p1Info.name}, joue le premier coup (1-9).\n +
◆━━━━━▣✦▣━━━━━━◆,
T.threadID
);
}
}

async function advanceTournamentRound(tournamentID, api, usersData) {
const T = tournaments[tournamentID];
if (!T) return;

const round = T.rounds[T.currentRoundIndex];
const winners = round.matches.map(m => m.winner).filter(v => v != null);

if (winners.length !== round.matches.length) {
return api.sendMessage(
◆━━━━━▣✦▣━━━━━━◆\n +
⚠️ Attention: certains matchs ne sont pas terminés.\n +
◆━━━━━▣✦▣━━━━━━◆,
T.threadID
);
}

if (T.currentRoundIndex === T.rounds.length - 1) {
T.winner = winners[0];
T.status = 'completed';

code
Code
download
content_copy
expand_less
const championInfo = await getPlayerInfo(T.winner, usersData);

if (T.imageMode) {
  const bracketImage = await generateTournamentBracketImage(T, usersData);
  await sendImage(api, T.threadID, bracketImage,
    `◆━━━━━▣✦▣━━━━━━◆\n` +
    `🎉 FÉLICITATIONS ${championInfo.name} ! 🏆\n` +
    `◆━━━━━▣✦▣━━━━━━◆`
  );
} else {
  await api.sendMessage(
    `◆━━━━━▣✦▣━━━━━━◆\n` +
    `🎉 TOURNOI TERMINÉ ! 🏆\n\n` +
    `🏆 CHAMPION: ${championInfo.name}\n` +
    `🥈 FINALISTE: ${T.players.find(p => p.id === winners[1])?.name || 'Inconnu'}\n\n` +
    `Merci à tous les participants !\n` +
    `◆━━━━━▣✦▣━━━━━━◆`,
    T.threadID
  );
}

delete tournaments[tournamentID];
return;

}

T.currentRoundIndex++;
const nextRound = T.rounds[T.currentRoundIndex];
nextRound.matches = [];

for (let i = 0; i < winners.length; i += 2) {
nextRound.matches.push({
player1: winners[i],
player2: winners[i+1],
winner: null,
completed: false,
gameID: null,
drawCount: 0
});
}

if (T.imageMode) {
const bracketImage = await generateTournamentBracketImage(T, usersData);
await sendImage(api, T.threadID, bracketImage,
◆━━━━━▣✦▣━━━━━━◆\n +
⚡ Passage au tour ${nextRound.name.toUpperCase()} !\n +
◆━━━━━▣✦▣━━━━━━◆
);
} else {
await api.sendMessage(
◆━━━━━▣✦▣━━━━━━◆\n +
⚡ Passage au tour **${nextRound.name}** !\n +
◆━━━━━▣✦▣━━━━━━◆,
T.threadID
);
}

await initiateNextMatch(tournamentID, api, usersData);
}

module.exports = {
config: {
name: "tictactoe",
aliases: ["ttt", "morpion"],
version: "9.5",
author: "ʚʆɞ Sømå Sønïč ʚʆɞ & L'Uchiha Perdu",
category: "game",
shortDescription: "TicTacToe Ultimate avec avatars réels et Tournois",
usage: "ttt | ttt @mention | ttt ia [easy|normal|hard] | ttt stats | ttt image on/off | ttt tournoi | ttt join | ttt out | ttt help"
},

onStart: async function({ api, event, args, usersData }) {
const threadID = event.threadID;
const senderID = event.senderID;

code
Code
download
content_copy
expand_less
ensurePlayerStats(senderID);

if (args.length === 0) {
  return handleCommand('help', '', api, event, args, usersData);
}

const command = (args[0] || '').toLowerCase();
const arg1 = (args[1] || '').toLowerCase();

return handleCommand(command, arg1, api, event, args, usersData);

},

onChat: async function({ api, event, usersData }) {
const threadID = event.threadID;
const senderID = event.senderID;
const msg = (event.body || '').trim();
const msgLower = msg.toLowerCase();

code
Code
download
content_copy
expand_less
const gameID = Object.keys(games).find(id => 
  games[id].threadID === threadID && 
  games[id].players.some(p => p.id === senderID) && 
  games[id].inProgress
);

if (!gameID) {
  const finished = Object.keys(games).find(id => 
    games[id].threadID === threadID && 
    games[id].players.some(p => p.id === senderID) && 
    !games[id].inProgress
  );
  
  if (finished && msgLower === 'restart') {
    const finishedGame = games[finished];
    if (!finishedGame.isTournamentGame) {
      resetGame(finished, finishedGame.players[0], finishedGame.players[1], {
        isAI: finishedGame.isAI,
        aiDifficulty: finishedGame.aiDifficulty,
        threadID,
        imageMode: finishedGame.imageMode
      });
      
      if (finishedGame.imageMode) {
        const boardImage = await generateBoardImage(
          games[finished].board,
          games[finished].players[0],
          games[finished].players,
          usersData
        );
        await sendImage(api, threadID, boardImage,
          `◆━━━━━▣✦▣━━━━━━◆\n` +
          `🔄 Nouvelle partie !\n` +
          `${games[finished].players[0].name} ❌ vs ${games[finished].players[1].name} ⭕\n` +
          `◆━━━━━▣✦▣━━━━━━◆`
        );
      } else {
        await api.sendMessage(
          `◆━━━━━▣✦▣━━━━━━◆\n` +
          `🔄 Nouvelle partie !\n` +
          `${games[finished].players[0].name} ❌ vs ${games[finished].players[1].name} ⭕\n\n` +
          `${displayBoard(games[finished].board)}\n\n` +
          `${games[finished].players[0].name}, joue (1-9).\n` +
          `◆━━━━━▣✦▣━━━━━━◆`,
          threadID
        );
      }
      
      if (finishedGame.isAI && games[finished].players[games[finished].currentPlayerIndex].id === 'AI') {
        await applyAIMove(finished, api, usersData);
      }
    } else {
      await api.sendMessage(
        `◆━━━━━▣✦▣━━━━━━◆\n` +
        `❌ Impossible de relancer un match de tournoi avec "restart".\n` +
        `◆━━━━━▣✦▣━━━━━━◆`,
        threadID
      );
    }
  }
  return;
}

const game = games[gameID];

if (game.isMathChallenge) {
    if (msg === "2") {
        const winner = game.players.find(p => p.id === senderID);
        const loser = game.players.find(p => p.id !== senderID);
        
        await api.sendMessage(
            `◆━━━━━▣✦▣━━━━━━◆\n` +
            `⚡ BONNE RÉPONSE !\n` +
            `🏆 ${winner.name} remporte le tie-breaker !\n` +
            `◆━━━━━▣✦▣━━━━━━◆`,
            threadID
        );

        game.board = Array(9).fill(winner.symbol);
        game.inProgress = false;
        game.isMathChallenge = false;
        
        ensurePlayerStats(winner.id);
        ensurePlayerStats(loser.id);
        playerStats[winner.id].wins++;
        playerStats[loser.id].losses++;
        saveStats();

        if (game.isTournamentGame && tournaments[game.tournamentID]) {
            const tournament = tournaments[game.tournamentID];
            const currentRound = tournament.rounds[tournament.currentRoundIndex];
            const match = currentRound.matches[game.matchIndex];
            
            if (match) {
                match.winner = winner.id;
                match.completed = true;
            }
            
            const doneAll = currentRound.matches.every(m => m.completed);
            if (doneAll) {
                if (tournament.imageMode) {
                    const bracketImage = await generateTournamentBracketImage(tournament, usersData);
                    await sendImage(api, game.threadID, bracketImage);
                }
                await advanceTournamentRound(game.tournamentID, api, usersData);
            } else {
                await initiateNextMatch(game.tournamentID, api, usersData);
            }
        }
    }
    return;
}

if (msgLower === 'forfait') {
  const forfeiter = game.players.find(p => p.id === senderID);
  const other = game.players.find(p => p.id !== senderID);
  
  if (!forfeiter || !other) return;
  
  game.inProgress = false;
  ensurePlayerStats(forfeiter.id);
  ensurePlayerStats(other.id);
  
  playerStats[forfeiter.id].losses++;
  playerStats[forfeiter.id].played++;
  playerStats[other.id].wins++;
  playerStats[other.id].played++;
  saveStats();
  
  if (game.imageMode) {
    const endImage = await generateEndGameImage(game.board, other, game.players, usersData, false);
    if (endImage) {
      await sendImage(api, threadID, endImage);
    }
  } else {
    await api.sendMessage(
      `◆━━━━━▣✦▣━━━━━━◆\n` +
      `🏳️ ${forfeiter.name} a abandonné.\n` +
      `🏆 ${other.name} remporte la partie !\n` +
      `◆━━━━━▣✦▣━━━━━━◆`,
      threadID
    );
  }
  
  if (game.isTournamentGame && tournaments[game.tournamentID]) {
    const T = tournaments[game.tournamentID];
    const match = T.rounds[T.currentRoundIndex].matches[game.matchIndex];
    
    if (match) {
      match.winner = other.id;
      match.completed = true;
    }
    
    const allDone = T.rounds[T.currentRoundIndex].matches.every(m => m.completed);
    if (allDone) {
      if (T.imageMode) {
        const bracketImage = await generateTournamentBracketImage(T, usersData);
        await sendImage(api, threadID, bracketImage);
      } else {
        await api.sendMessage(
          `◆━━━━━▣✦▣━━━━━━◆\n` +
          `⚡ Tous les matchs du tour sont terminés !\n` +
          `◆━━━━━▣✦▣━━━━━━◆`,
          threadID
        );
      }
      await advanceTournamentRound(game.tournamentID, api, usersData);
    } else {
      await initiateNextMatch(game.tournamentID, api, usersData);
    }
  } else {
    if (!game.imageMode) {
      await api.sendMessage(`Tapez "restart" pour rejouer.`, threadID);
    }
  }
  return;
}

const current = game.players[game.currentPlayerIndex];
if (senderID !== current.id) {
  const tryPos = parseInt(msg) - 1;
  if (!isNaN(tryPos) && tryPos >= 0 && tryPos <= 8 && game.board[tryPos] === null) {
    await api.sendMessage(
      `◆━━━━━▣✦▣━━━━━━◆\n` +
      `❌ Ce n'est pas votre tour, ${event.senderName || senderID} !\n` +
      `◆━━━━━▣✦▣━━━━━━◆`,
      threadID
    );
  }
  return;
}

const pos = parseInt(msg) - 1;
if (isNaN(pos) || pos < 0 || pos > 8) return;

if (game.board[pos] !== null) {
  await api.sendMessage(
    `◆━━━━━▣✦▣━━━━━━◆\n` +
    `❌ ${current.name}, case invalide ou déjà occupée.\n` +
    `◆━━━━━▣✦▣━━━━━━◆`,
    threadID
  );
  return;
}

game.board[pos] = current.symbol;

const winner = checkWinner(game.board);
const isDraw = isBoardFull(game.board);

if (winner || isDraw) {
  return handleGameEnd(gameID, api, { threadID, senderID }, usersData);
}

game.currentPlayerIndex = (game.currentPlayerIndex + 1) % 2;
const next = game.players[game.currentPlayerIndex];

if (game.imageMode) {
  const boardImage = await generateBoardImage(
    game.board,
    next,
    game.players,
    usersData,
    game.isTournamentGame ? "tournament" : "normal"
  );
  if (boardImage) {
    await sendImage(api, threadID, boardImage, `➲ Tour de : ${next.name}`);
  }
} else {
  await api.sendMessage(
    `◆━━━━━▣✦▣━━━━━━◆\n` +
    `${displayBoard(game.board)}\n\n` +
    `➲ Tour de : ${next.name}\n` +
    `◆━━━━━▣✦▣━━━━━━◆`,
    threadID
  );
}

if (game.isAI && next.id === 'AI') {
  await applyAIMove(gameID, api, usersData);
}

}
};

async function handleCommand(command, arg1, api, event, args, usersData) {
const threadID = event.threadID;
const senderID = event.senderID;
const { mentions } = event;

if (command === 'image') {
if (arg1 === 'on') {
imageModeByThread[threadID] = true;
if (tournaments[threadID]) {
tournaments[threadID].imageMode = true;
}
return api.sendMessage(
◆━━━━━▣✦▣━━━━━━◆\n +
🎨 MODE IMAGE ACTIVÉ\n\n +
Tous les rendus seront désormais visuels.\n +
Pour revenir au mode textuel:\n +
\ttt image off`\n+◆━━━━━▣✦▣━━━━━━◆, threadID ); } else if (arg1 === 'off') { imageModeByThread[threadID] = false; if (tournaments[threadID]) { tournaments[threadID].imageMode = false; } return api.sendMessage(◆━━━━━▣✦▣━━━━━━◆\n+🔧 Mode image désactivé.\n+Retour au rendu textuel.\n+◆━━━━━▣✦▣━━━━━━◆`,
threadID
);
}
return;
}

if (command === 'help') {
if (imageModeByThread[threadID]) {
const helpImage = await generateHelpImage();
if (helpImage) {
await sendImage(api, threadID, helpImage);
} else {
await sendHelpText(api, threadID);
}
} else {
await sendHelpText(api, threadID);
}
return;
}

if (command === 'stats') {
const stats = playerStats[senderID] || { wins: 0, losses: 0, draws: 0, played: 0 };
const userName = await usersData.getName(senderID) || Joueur ${senderID};

code
Code
download
content_copy
expand_less
if (imageModeByThread[threadID]) {
  const statsImage = await generateStatsImage(playerStats, senderID, usersData);
  if (statsImage) {
    await sendImage(api, threadID, statsImage);
  } else {
    await sendStatsText(api, threadID, userName, stats);
  }
} else {
  await sendStatsText(api, threadID, userName, stats);
}
return;

}

if (command === 'join' || command === 'out' || command === 'tournoi') {
return handleTournamentCommand(command, arg1, api, event, args, usersData);
}

if (command === 'ia' || command === 'ai') {
const diff = ['easy', 'normal', 'hard'].includes(arg1) ? arg1 : 'normal';
const userName = await usersData.getName(senderID) || Joueur ${senderID};

code
Code
download
content_copy
expand_less
const bot = { 
  id: 'AI', 
  name: BOT_NAME
};

const human = { 
  id: senderID, 
  name: userName
};

const gameID = `${threadID}:ai:${senderID}`;
const imageMode = imageModeByThread[threadID] || false;

resetGame(gameID, human, bot, { 
  isAI: true, 
  aiDifficulty: diff, 
  threadID,
  imageMode 
});

if (imageMode) {
  const boardImage = await generateBoardImage(
    games[gameID].board,
    games[gameID].players[0],
    games[gameID].players,
    usersData
  );
  await sendImage(api, threadID, boardImage,
    `◆━━━━━▣✦▣━━━━━━◆\n` +
    `🎮 Partie contre IA (${diff})\n` +
    `${human.name} ❌ vs ${bot.name} ⭕\n\n` +
    `${human.name}, joue (1-9).\n` +
    `◆━━━━━▣✦▣━━━━━━◆`
  );
} else {
  await api.sendMessage(
    `◆━━━━━▣✦▣━━━━━━◆\n` +
    `🎮 Partie contre IA (${diff})\n` +
    `${human.name} ❌ vs ${bot.name} ⭕\n\n` +
    `${displayBoard(games[gameID].board)}\n\n` +
    `${human.name}, joue le premier coup (1-9).\n` +
    `◆━━━━━▣✦▣━━━━━━◆`,
    threadID
  );
}

if (games[gameID].players[games[gameID].currentPlayerIndex].id === 'AI') {
  await applyAIMove(gameID, api, usersData);
}
return;

}

const knownCommands = ['help', 'stats', 'image', 'join', 'out', 'tournoi', 'ia', 'ai'];
if (!knownCommands.includes(command)) {
let targetID = null;
let targetName = null;

code
Code
download
content_copy
expand_less
if (Object.keys(mentions).length > 0) {
  const firstMention = Object.keys(mentions)[0];
  targetID = firstMention;
  targetName = mentions[firstMention].replace('@', '');
} else if (args[0]) {
  const extracted = args[0].match(/\d+/);
  if (extracted) {
    targetID = extracted[0];
    targetName = `Joueur ${targetID}`;
  }
}

if (!targetID) {
  return api.sendMessage(
    `◆━━━━━▣✦▣━━━━━━◆\n` +
    `❌ Mention invalide. Usage: \`ttt @joueur\`\n` +
    `◆━━━━━▣✦▣━━━━━━◆`,
    threadID
  );
}

if (targetID === senderID) {
  return api.sendMessage(
    `◆━━━━━▣✦▣━━━━━━◆\n` +
    `❌ Vous ne pouvez pas jouer contre vous-même.\n` +
    `◆━━━━━▣✦▣━━━━━━◆`,
    threadID
  );
}

const targetInGame = Object.values(games).some(g => 
  g.threadID === threadID && 
  g.players.some(p => p.id === targetID) && 
  g.inProgress
);

if (targetInGame) {
  return api.sendMessage(
    `◆━━━━━▣✦▣━━━━━━◆\n` +
    `⚠️ Le joueur ciblé est déjà en partie.\n` +
    `◆━━━━━▣✦▣━━━━━━◆`,
    threadID
  );
}

const userName = await usersData.getName(senderID) || `Joueur ${senderID}`;
const opponentName = await usersData.getName(targetID) || targetName;

const player1 = { 
  id: senderID, 
  name: userName
};

const player2 = { 
  id: targetID, 
  name: opponentName
};

const gameID = `${threadID}:pvp:${senderID}:${targetID}`;
const imageMode = imageModeByThread[threadID] || false;

resetGame(gameID, player1, player2, { threadID, imageMode });

if (imageMode) {
  const boardImage = await generateBoardImage(
    games[gameID].board,
    games[gameID].players[0],
    games[gameID].players,
    usersData,
  );
  await sendImage(api, threadID, boardImage,
    `◆━━━━━▣✦▣━━━━━━◆\n` +
    `🎮 Nouvelle partie !\n` +
    `${player1.name} ❌ vs ${player2.name} ⭕\n\n` +
    `${player1.name}, joue (1-9).\n` +
    `◆━━━━━▣✦▣━━━━━━◆`
  );
} else {
  await api.sendMessage(
    `◆━━━━━▣✦▣━━━━━━◆\n` +
    `🎮 Nouvelle partie !\n` +
    `${player1.name} ❌ vs ${player2.name} ⭕\n\n` +
    `${displayBoard(games[gameID].board)}\n\n` +
    `${player1.name}, joue le premier coup (1-9).\n` +
    `◆━━━━━▣✦▣━━━━━━◆`,
    threadID
  );
}
return;

}

return api.sendMessage(
◆━━━━━▣✦▣━━━━━━◆\n +
❌ Commande introuvable. Tapez \ttt help`.\n+◆━━━━━▣✦▣━━━━━━◆`,
threadID
);
}

async function handleTournamentCommand(command, arg1, api, event, args, usersData) {
const threadID = event.threadID;
const senderID = event.senderID;

if (!tournaments[threadID]) createTournament(threadID);
const tournament = tournaments[threadID];

if (command === 'join') {
if (tournament.status !== 'registration') {
return api.sendMessage(
◆━━━━━▣✦▣━━━━━━◆\n +
❌ Aucun tournoi en inscription actuellement.\n +
◆━━━━━▣✦▣━━━━━━◆,
threadID
);
}

code
Code
download
content_copy
expand_less
if (tournament.players.find(p => p.id === senderID)) {
  return api.sendMessage(
    `◆━━━━━▣✦▣━━━━━━◆\n` +
    `⚠️ Vous êtes déjà inscrit.\n` +
    `◆━━━━━▣✦▣━━━━━━◆`,
    threadID
  );
}

if (tournament.players.length >= tournament.requiredPlayers) {
  return api.sendMessage(
    `◆━━━━━▣✦▣━━━━━━◆\n` +
    `❌ Tournoi complet (${tournament.requiredPlayers} joueurs max).\n` +
    `◆━━━━━▣✦▣━━━━━━◆`,
    threadID
  );
}

const playerName = await usersData.getName(senderID) || `Joueur ${senderID}`;
tournament.players.push({
  id: senderID,
  name: playerName
});

if (tournament.imageMode) {
  const bracketImage = await generateTournamentBracketImage(tournament, usersData);
  await sendImage(api, threadID, bracketImage,
    `◆━━━━━▣✦▣━━━━━━◆\n` +
    `✅ Inscription confirmée (${tournament.players.length}/${tournament.requiredPlayers})\n` +
    `◆━━━━━▣✦▣━━━━━━◆`
  );
} else {
  const bracketText = generateTournamentBracketText(tournament);
  await api.sendMessage(
    `◆━━━━━▣✦▣━━━━━━◆\n` +
    `✅ Inscription confirmée (${tournament.players.length}/${tournament.requiredPlayers})\n\n` +
    `${bracketText}`,
    threadID
  );
}
return;

}

if (command === 'out') {
if (tournament.status !== 'registration') {
return api.sendMessage(
◆━━━━━▣✦▣━━━━━━◆\n +
❌ Impossible de quitter, tournoi déjà démarré.\n +
◆━━━━━▣✦▣━━━━━━◆,
threadID
);
}

code
Code
download
content_copy
expand_less
const idx = tournament.players.findIndex(p => p.id === senderID);
if (idx === -1) {
  return api.sendMessage(
    `◆━━━━━▣✦▣━━━━━━◆\n` +
    `⚠️ Vous n'êtes pas inscrit.\n` +
    `◆━━━━━▣✦▣━━━━━━◆`,
    threadID
  );
}

tournament.players.splice(idx, 1);

if (tournament.imageMode) {
  const bracketImage = await generateTournamentBracketImage(tournament, usersData);
  await sendImage(api, threadID, bracketImage,
    `◆━━━━━▣✦▣━━━━━━◆\n` +
    `🚪 Vous avez quitté le tournoi.\n` +
    `◆━━━━━▣✦▣━━━━━━◆`
  );
} else {
  const bracketText = generateTournamentBracketText(tournament);
  await api.sendMessage(
    `◆━━━━━▣✦▣━━━━━━◆\n` +
    `🚪 Vous avez quitté le tournoi.\n\n` +
    `${bracketText}`,
    threadID
  );
}
return;

}

const subCommand = arg1;
if (subCommand === 'cancel') {
if (tournament.status !== 'registration') {
return api.sendMessage(
◆━━━━━▣✦▣━━━━━━◆\n +
❌ Impossible d'annuler, tournoi déjà démarré.\n +
◆━━━━━▣✦▣━━━━━━◆,
threadID
);
}

code
Code
download
content_copy
expand_less
delete tournaments[threadID];
await api.sendMessage(
  `◆━━━━━▣✦▣━━━━━━◆\n` +
  `🗑️ Inscription au tournoi annulée.\n` +
  `◆━━━━━▣✦▣━━━━━━◆`,
  threadID
);
return;

}

if (subCommand === 'start') {
const num = tournament.players.length;
if (![4, 8, 16].includes(num)) {
return api.sendMessage(
◆━━━━━▣✦▣━━━━━━◆\n +
❌ Il faut 4, 8 ou 16 joueurs pour démarrer. Actuels: ${num}\n +
◆━━━━━▣✦▣━━━━━━◆,
threadID
);
}

code
Code
download
content_copy
expand_less
tournament.requiredPlayers = num;
await startTournament(threadID, api, usersData);
return;

}

if (tournament.imageMode) {
const bracketImage = await generateTournamentBracketImage(tournament, usersData);
await sendImage(api, threadID, bracketImage,
◆━━━━━▣✦▣━━━━━━◆\n +
🏆 TOURNOI MORPION\n +
Tapez \ttt join` pour participer !\n+◆━━━━━▣✦▣━━━━━━◆); } else { const bracketText = generateTournamentBracketText(tournament); await api.sendMessage(◆━━━━━▣✦▣━━━━━━◆\n+🏆 TOURNOI MORPION\n\n+${bracketText}\n\n+Tapez `ttt join` pour participer !\n+◆━━━━━▣✦▣━━━━━━◆`,
threadID
);
}
}

async function sendHelpText(api, threadID) {
const helpText =
◆━━━━━▣✦▣━━━━━━◆\n +
🤖 TICTACTOE ULTIMATE - AIDE\n +
◆━━━━━▣✦▣━━━━━━◆\n\n +
🎮 JOUER:\n +
➲ \ttt @joueur` - 1v1 contre un ami\n+➲ `ttt ia [facile|normal|dur]` - Contre l'IA\n+➲ `ttt` - Afficher cette aide\n\n+📊 STATISTIQUES:\n+➲ `ttt stats` - Voir vos stats\n\n+🏆 TOURNOI (4, 8 ou 16 joueurs):\n+➲ `ttt tournoi` - Créer/afficher\n+➲ `ttt join` - Rejoindre\n+➲ `ttt out` - Quitter\n+➲ `ttt tournoi start` - Démarrer\n\n+🎨 AFFICHAGE:\n+➲ `ttt image on/off` - Mode image\n\n+🎯 EN JEU:\n+➲ Choisir case (1-9)\n+➲ `forfait` - Abandonner\n+➲ `restart` - Rejouer (1v1 uniquement)\n+◆━━━━━▣✦▣━━━━━━◆`;

await api.sendMessage(helpText, threadID);
}

async function sendStatsText(api, threadID, userName, stats) {
const winRate = stats.played > 0 ? Math.round((stats.wins / stats.played) * 100) : 0;
const statsText =
◆━━━━━▣✦▣━━━━━━◆\n +
📊 STATISTIQUES de ${userName}\n +
◆━━━━━▣✦▣━━━━━━◆\n\n +
🏆 Victoires: ${stats.wins}\n +
💀 Défaites: ${stats.losses}\n +
🤝 Nuls: ${stats.draws}\n +
🎮 Parties: ${stats.played}\n +
📈 Ratio: ${winRate}%\n +
◆━━━━━▣✦▣━━━━━━◆;

await api.sendMessage(statsText, threadID);
}
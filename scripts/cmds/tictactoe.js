const fs = require('fs-extra');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');

const STATS_FILE = path.join(__dirname, 'tictactoe_stats.json');
const ASSETS_DIR = path.join(__dirname, 'tictactoe_assets');
const VIDEO_DIR = path.join(__dirname, 'tictactoe_videos');

const BOT_UID = global.botID;
const BOT_NAME = "Hedgehog GPT";

let games = {};
let tournaments = {};
let playerStats = loadStats();
const playerCache = new Map();
const imageModeByThread = {};

if (!fs.existsSync(ASSETS_DIR)) {
  fs.mkdirSync(ASSETS_DIR, { recursive: true });
}
if (!fs.existsSync(VIDEO_DIR)) {
  fs.mkdirSync(VIDEO_DIR, { recursive: true });
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
      const token = "6628568379%7Cc1e620fa708a1d5696fb991c1bde5662";
      const avatarUrl = `https://graph.facebook.com/${BOT_UID}/picture?width=512&height=512&access_token=${token}`;
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
    const token = "6628568379%7Cc1e620fa708a1d5696fb991c1bde5662";
    const avatarUrl = `https://graph.facebook.com/${numericUid}/picture?width=512&height=512&access_token=${token}`;
    const avatar = await loadImage(avatarUrl);
    const name = await usersData.getName(numericUid) || `Joueur ${numericUid}`;

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

function resetGame(gameID, player1, player2, opts = {}) {
  const imageMode = opts.imageMode !== undefined ? opts.imageMode : imageModeByThread[opts.threadID] || false;

  games[gameID] = {
    board: Array(9).fill(null),
    players: [
      { id: player1.id, name: player1.name || `Joueur ${player1.id}`, symbol: "❌" },
      { id: player2.id, name: player2.name || `Joueur ${player2.id}`, symbol: "⭕" }
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
    imageMode: imageMode,
    moves: []
  };
}

async function generateBoardImage(board, currentPlayer, players, usersData, gameType = "normal") {
  try {
    const canvasWidth = 1400;
    const canvasHeight = 1000;
    const canvas = createCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createLinearGradient(0, 0, canvasWidth, canvasHeight);
    gradient.addColorStop(0, '#0a0a0a');
    gradient.addColorStop(0.3, '#1a1a2e');
    gradient.addColorStop(0.7, '#16213e');
    gradient.addColorStop(1, '#0f3460');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    if (gameType === "tournament") {
      ctx.fillStyle = 'rgba(255, 215, 0, 0.15)';
      for(let i=0; i<canvasWidth; i+=30) {
        for(let j=0; j<canvasHeight; j+=30) {
          if((i+j)%60===0) ctx.fillRect(i, j, 15, 15);
        }
      }
      
      ctx.font = 'bold 48px "Segoe UI", Arial, sans-serif';
      ctx.fillStyle = '#FFD700';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#FFD700';
      ctx.shadowBlur = 20;
      ctx.fillText('✦ TOURNOI ÉLITE ✦', canvasWidth/2, 90);
      ctx.shadowBlur = 0;
      
      ctx.beginPath();
      ctx.moveTo(canvasWidth/2 - 200, 110);
      ctx.lineTo(canvasWidth/2 - 50, 110);
      ctx.moveTo(canvasWidth/2 + 50, 110);
      ctx.lineTo(canvasWidth/2 + 200, 110);
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    const playerInfos = await Promise.all(players.map(p => getPlayerInfo(p.id, usersData)));

    const boardSize = 580;
    const boardX = canvasWidth/2 - boardSize/2;
    const boardY = 230;

    ctx.shadowColor = 'rgba(76, 201, 240, 0.5)';
    ctx.shadowBlur = 25;
    ctx.fillStyle = 'rgba(20, 20, 40, 0.7)';
    ctx.beginPath();
    ctx.roundRect(boardX - 20, boardY - 20, boardSize + 40, boardSize + 40, 25);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.strokeStyle = '#4cc9f0';
    ctx.lineWidth = 6;
    ctx.beginPath();
    for (let i = 1; i <= 2; i++) {
      ctx.moveTo(boardX + (boardSize/3)*i, boardY);
      ctx.lineTo(boardX + (boardSize/3)*i, boardY + boardSize);
      ctx.moveTo(boardX, boardY + (boardSize/3)*i);
      ctx.lineTo(boardX + boardSize, boardY + (boardSize/3)*i);
    }
    ctx.stroke();

    ctx.font = 'bold 120px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < 9; i++) {
      const row = Math.floor(i / 3);
      const col = i % 3;
      const x = boardX + (col * (boardSize/3)) + (boardSize/6);
      const y = boardY + (row * (boardSize/3)) + (boardSize/6);

      if (board[i] === '❌') {
        ctx.shadowColor = '#ff6b6b';
        ctx.shadowBlur = 25;
        ctx.fillStyle = '#ff6b6b';
        ctx.fillText('❌', x, y);
        ctx.shadowBlur = 0;
      } else if (board[i] === '⭕') {
        ctx.shadowColor = '#4ecdc4';
        ctx.shadowBlur = 25;
        ctx.fillStyle = '#4ecdc4';
        ctx.fillText('⭕', x, y);
        ctx.shadowBlur = 0;
      } else {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.font = 'bold 32px "Segoe UI"';
        ctx.fillText((i + 1).toString(), x, y);
        ctx.font = 'bold 120px "Segoe UI"';
      }
    }

    const avatarSize = 140;
    const infoWidth = 380;

    for (let i = 0; i < 2; i++) {
      const player = playerInfos[i];
      const playerData = players[i];
      const isCurrent = currentPlayer && currentPlayer.id === playerData.id;
      
      const panelX = i === 0 ? 80 : canvasWidth - infoWidth - 80;
      const panelY = 200;
      const panelHeight = 500;
      
      ctx.shadowColor = isCurrent ? 'rgba(76, 201, 240, 0.3)' : 'rgba(255, 255, 255, 0.1)';
      ctx.shadowBlur = 20;
      ctx.fillStyle = isCurrent ? 'rgba(76, 201, 240, 0.2)' : 'rgba(30, 30, 60, 0.4)';
      ctx.beginPath();
      ctx.roundRect(panelX, panelY, infoWidth, panelHeight, 30);
      ctx.fill();
      ctx.shadowBlur = 0;
      
      ctx.strokeStyle = isCurrent ? '#4cc9f0' : 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.roundRect(panelX, panelY, infoWidth, panelHeight, 30);
      ctx.stroke();
      
      if (player.avatar) {
        ctx.save();
        ctx.shadowColor = playerData.symbol === '❌' ? '#ff6b6b' : '#4ecdc4';
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(panelX + infoWidth/2, panelY + 110, avatarSize/2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(player.avatar, panelX + infoWidth/2 - avatarSize/2, panelY + 110 - avatarSize/2, avatarSize, avatarSize);
        ctx.restore();
        
        ctx.strokeStyle = playerData.symbol === '❌' ? '#ff6b6b' : '#4ecdc4';
        ctx.lineWidth = 6;
        ctx.stroke();
      }
      
      ctx.font = 'bold 36px "Segoe UI", Arial, sans-serif';
      ctx.fillStyle = isCurrent ? '#FFFFFF' : '#CCCCCC';
      ctx.textAlign = 'center';
      ctx.fillText(player.name.substring(0, 20), panelX + infoWidth/2, panelY + 270);
      
      ctx.font = 'bold 65px "Segoe UI", Arial, sans-serif';
      ctx.shadowColor = playerData.symbol === '❌' ? '#ff6b6b' : '#4ecdc4';
      ctx.shadowBlur = 20;
      ctx.fillStyle = playerData.symbol === '❌' ? '#ff6b6b' : '#4ecdc4';
      ctx.fillText(playerData.symbol, panelX + infoWidth/2, panelY + 350);
      ctx.shadowBlur = 0;
      
      if (isCurrent) {
        ctx.font = 'bold 30px "Segoe UI", Arial, sans-serif';
        ctx.fillStyle = '#4cc9f0';
        ctx.fillText('⮞ À SON TOUR', panelX + infoWidth/2, panelY + 420);
      }
    }

    if (currentPlayer) {
      ctx.font = 'bold 50px "Segoe UI", Arial, sans-serif';
      ctx.fillStyle = currentPlayer.symbol === '❌' ? '#ff6b6b' : '#4ecdc4';
      ctx.textAlign = 'center';
      ctx.shadowColor = currentPlayer.symbol === '❌' ? '#ff6b6b' : '#4ecdc4';
      ctx.shadowBlur = 20;
      ctx.fillText('⤓', canvasWidth/2, boardY + boardSize + 80);
      ctx.shadowBlur = 0;
      
      ctx.font = 'bold 42px "Segoe UI", Arial, sans-serif';
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(`Tour de : ${currentPlayer.name}`, canvasWidth/2, boardY + boardSize + 150);
    }

    const availableMoves = board.map((cell, idx) => cell === null ? idx + 1 : null).filter(x => x !== null);
    ctx.font = '28px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#AAAAAA';
    ctx.fillText(`Cases disponibles: ${availableMoves.join(', ')}`, canvasWidth/2, boardY + boardSize + 210);

    return canvas.toBuffer();
  } catch (error) {
    console.error('Erreur génération image plateau:', error);
    return null;
  }
}

async function generateEndGameImage(board, winner, players, usersData, isDraw = false) {
  try {
    const canvasWidth = 1400;
    const canvasHeight = 1000;
    const canvas = createCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createLinearGradient(0, 0, canvasWidth, canvasHeight);
    gradient.addColorStop(0, '#0a0a0a');
    gradient.addColorStop(0.4, '#1a1a2e');
    gradient.addColorStop(0.6, '#16213e');
    gradient.addColorStop(1, '#0f3460');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    for(let i=0; i<50; i++) {
      ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.1})`;
      ctx.beginPath();
      ctx.arc(Math.random() * canvasWidth, Math.random() * canvasHeight, Math.random() * 3, 0, Math.PI * 2);
      ctx.fill();
    }

    const playerInfos = await Promise.all(players.map(p => getPlayerInfo(p.id, usersData)));

    const boardSize = 500;
    const boardX = canvasWidth/2 - boardSize/2;
    const boardY = 150;

    ctx.shadowColor = isDraw ? '#4cc9f0' : '#FFD700';
    ctx.shadowBlur = 30;
    ctx.fillStyle = 'rgba(20, 20, 40, 0.8)';
    ctx.beginPath();
    ctx.roundRect(boardX - 20, boardY - 20, boardSize + 40, boardSize + 40, 20);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.strokeStyle = isDraw ? '#4cc9f0' : '#FFD700';
    ctx.lineWidth = 6;
    ctx.beginPath();
    for (let i = 1; i <= 2; i++) {
      ctx.moveTo(boardX + (boardSize/3)*i, boardY);
      ctx.lineTo(boardX + (boardSize/3)*i, boardY + boardSize);
      ctx.moveTo(boardX, boardY + (boardSize/3)*i);
      ctx.lineTo(boardX + boardSize, boardY + (boardSize/3)*i);
    }
    ctx.stroke();

    ctx.font = 'bold 90px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < 9; i++) {
      const row = Math.floor(i / 3);
      const col = i % 3;
      const x = boardX + (col * (boardSize/3)) + (boardSize/6);
      const y = boardY + (row * (boardSize/3)) + (boardSize/6);

      if (board[i] === '❌') {
        ctx.shadowColor = '#ff6b6b';
        ctx.shadowBlur = 20;
        ctx.fillStyle = '#ff6b6b';
        ctx.fillText('❌', x, y);
        ctx.shadowBlur = 0;
      } else if (board[i] === '⭕') {
        ctx.shadowColor = '#4ecdc4';
        ctx.shadowBlur = 20;
        ctx.fillStyle = '#4ecdc4';
        ctx.fillText('⭕', x, y);
        ctx.shadowBlur = 0;
      }
    }

    const avatarSize = 120;
    const infoWidth = 320;

    for (let i = 0; i < 2; i++) {
      const player = playerInfos[i];
      const playerData = players[i];
      const isWinner = winner && winner.id === playerData.id;
      
      const panelX = i === 0 ? 100 : canvasWidth - infoWidth - 100;
      const panelY = 700;
      const panelHeight = 200;
      
      ctx.shadowColor = isWinner ? '#FFD700' : 'rgba(255, 255, 255, 0.1)';
      ctx.shadowBlur = 15;
      ctx.fillStyle = isWinner ? 'rgba(255, 215, 0, 0.25)' : 'rgba(30, 30, 60, 0.4)';
      ctx.beginPath();
      ctx.roundRect(panelX, panelY, infoWidth, panelHeight, 20);
      ctx.fill();
      ctx.shadowBlur = 0;
      
      ctx.strokeStyle = isWinner ? '#FFD700' : 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 4;
      ctx.stroke();
      
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
      
      ctx.font = 'bold 32px "Segoe UI", Arial, sans-serif';
      ctx.fillStyle = isWinner ? '#FFD700' : '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.fillText(player.name.substring(0, 18), panelX + infoWidth/2, panelY + 150);
      
      ctx.font = 'bold 45px "Segoe UI", Arial, sans-serif';
      ctx.shadowColor = playerData.symbol === '❌' ? '#ff6b6b' : '#4ecdc4';
      ctx.shadowBlur = 15;
      ctx.fillStyle = playerData.symbol === '❌' ? '#ff6b6b' : '#4ecdc4';
      ctx.fillText(playerData.symbol, panelX + infoWidth/2, panelY + 190);
      ctx.shadowBlur = 0;
      
      if (isWinner) {
        ctx.font = 'bold 26px "Segoe UI", Arial, sans-serif';
        ctx.fillStyle = '#FFD700';
        ctx.shadowColor = '#FFD700';
        ctx.shadowBlur = 10;
        ctx.fillText('🏆 GAGNANT', panelX + infoWidth/2, panelY + 230);
        ctx.shadowBlur = 0;
      }
    }

    ctx.font = 'bold 70px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = isDraw ? '#4cc9f0' : '#FFD700';
    ctx.textAlign = 'center';
    ctx.shadowColor = isDraw ? '#4cc9f0' : '#FFD700';
    ctx.shadowBlur = 25;

    if (isDraw) {
      ctx.fillText('═══ ✦ MATCH NUL ✦ ═══', canvasWidth/2, 650);
    } else if (winner) {
      ctx.fillText('═══ ✦ VICTOIRE ✦ ═══', canvasWidth/2, 650);
      ctx.font = 'bold 55px "Segoe UI", Arial, sans-serif';
      ctx.fillText(`${winner.name}`, canvasWidth/2, 720);
    }
    ctx.shadowBlur = 0;

    ctx.font = 'italic 30px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#666666';
    ctx.fillText('☞【𝐻𝑒𝑑𝑔𝑒ℎ𝑜𝑔𝄞𝙂𝙋𝙏】 • Système TicTacToe Ultimate', canvasWidth/2, 950);

    return canvas.toBuffer();
  } catch (error) {
    console.error('Erreur génération image fin:', error);
    return null;
  }
}

async function generateTournamentBracketImage(tournament, usersData) {
  try {
    const playerCount = tournament.players.length;
    const width = 2000;
    const height = 1600;

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#0a0a0a');
    gradient.addColorStop(0.5, '#1a1a2e');
    gradient.addColorStop(1, '#0f3460');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    for(let i=0; i<100; i++) {
      ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.05})`;
      ctx.beginPath();
      ctx.arc(Math.random() * width, Math.random() * height, Math.random() * 4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.font = 'bold 70px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#4cc9f0';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#4cc9f0';
    ctx.shadowBlur = 30;
    ctx.fillText('🏆 TOURNOI ÉLITE - BRACKET 🏆', width/2, 100);
    ctx.shadowBlur = 0;

    ctx.font = 'bold 35px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(`Statut: ${getTournamentStatus(tournament)}`, width/2, 170);

    if (tournament.status === 'registration') {
      ctx.font = 'bold 60px "Segoe UI", Arial, sans-serif';
      ctx.fillStyle = '#FFD700';
      ctx.fillText(`EN ATTENTE DE JOUEURS`, width/2, height/2 - 120);
      
      const needed = tournament.requiredPlayers - playerCount;
      ctx.font = 'bold 45px "Segoe UI", Arial, sans-serif';
      ctx.fillStyle = '#888888';
      ctx.fillText(`Inscrits: ${playerCount} / ${tournament.requiredPlayers}`, width/2, height/2);
      ctx.fillText(`(Manque ${needed})`, width/2, height/2 + 70);

      let yList = height/2 + 180;
      ctx.font = '32px "Segoe UI", Arial, sans-serif';
      ctx.fillStyle = '#FFFFFF';
      tournament.players.forEach((p, i) => {
        ctx.fillText(`${i+1}. ${p.name}`, width/2, yList + (i * 45));
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
      
      ctx.font = 'bold 38px "Segoe UI", Arial, sans-serif';
      ctx.fillStyle = r === tournament.currentRoundIndex ? '#FFD700' : '#4cc9f0';
      ctx.textAlign = 'center';
      ctx.fillText(round.name.toUpperCase(), x + 150, 250);

      positions[r] = [];

      for (let m = 0; m < matchCount; m++) {
        const match = round.matches[m];
        let y;

        if (r === 0) {
          const totalHeight = height - 350;
          const spacing = totalHeight / matchCount;
          y = 350 + (m * spacing) + (spacing/2) - 60;
        } else {
          const parent1 = positions[r-1][m*2];
          const parent2 = positions[r-1][m*2+1];
          if (parent1 && parent2) {
            y = (parent1.y + parent2.y) / 2;
          } else {
            y = 350 + (m * 200);
          }
        }
        
        positions[r].push({x, y});

        const p1 = tournament.players.find(p => p.id === match.player1);
        const p2 = tournament.players.find(p => p.id === match.player2);
        
        const p1Name = p1 ? p1.name.substring(0, 15) : '???';
        const p2Name = p2 ? p2.name.substring(0, 15) : '???';

        const boxWidth = 300;
        const boxHeight = 110;

        if (r > 0) {
          const parent1 = positions[r-1][m*2];
          const parent2 = positions[r-1][m*2+1];
          ctx.strokeStyle = '#4cc9f0';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(parent1.x + boxWidth, parent1.y + boxHeight/2);
          ctx.lineTo(x, y + boxHeight/2);
          ctx.moveTo(parent2.x + boxWidth, parent2.y + boxHeight/2);
          ctx.lineTo(x, y + boxHeight/2);
          ctx.stroke();
        }

        ctx.shadowColor = match.completed ? (match.winner ? '#00ff00' : '#ffff00') : '#4cc9f0';
        ctx.shadowBlur = 15;
        ctx.fillStyle = match.completed ? '#16213e' : '#1a1a2e';
        ctx.beginPath();
        ctx.roundRect(x, y, boxWidth, boxHeight, 15);
        ctx.fill();
        ctx.shadowBlur = 0;
        
        ctx.lineWidth = 4;
        ctx.strokeStyle = match.completed ? (match.winner ? '#00ff00' : '#ffff00') : '#4cc9f0';
        ctx.stroke();

        ctx.font = 'bold 24px "Segoe UI", Arial, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'left';
        
        ctx.fillStyle = match.winner === match.player1 ? '#00ff00' : '#ffffff';
        ctx.fillText(p1Name, x + 15, y + 40);
        ctx.fillStyle = match.winner === match.player2 ? '#00ff00' : '#ffffff';
        ctx.fillText(p2Name, x + 15, y + 85);

        if (match.completed && match.winner) {
          ctx.font = '28px Arial';
          ctx.fillStyle = '#FFD700';
          ctx.fillText('👑', x + 260, match.winner === match.player1 ? y+40 : y+85);
        }
      }
    }

    if (tournament.winner) {
      const winnerName = tournament.players.find(p => p.id === tournament.winner)?.name || 'Champion';
      ctx.font = 'bold 70px "Segoe UI", Arial, sans-serif';
      ctx.fillStyle = '#FFD700';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#FFD700';
      ctx.shadowBlur = 40;
      ctx.fillText(`👑 ${winnerName} 👑`, width/2, height - 100);
      ctx.shadowBlur = 0;
    }

    return canvas.toBuffer();
  } catch (error) {
    console.error('Erreur génération bracket:', error);
    return null;
  }
}

function getTournamentStatus(tournament) {
  switch(tournament.status) {
    case 'registration': return '⏳ INSCRIPTION';
    case 'in_progress': return '⚡ EN COURS';
    case 'completed': return '✅ TERMINÉ';
    default: return '❓ INCONNU';
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
    gradient.addColorStop(0, '#0a0a0a');
    gradient.addColorStop(0.4, '#1a1a2e');
    gradient.addColorStop(0.7, '#16213e');
    gradient.addColorStop(1, '#0f3460');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1400, 900);

    ctx.shadowColor = 'rgba(76, 201, 240, 0.3)';
    ctx.shadowBlur = 30;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.beginPath();
    ctx.roundRect(50, 50, 1300, 800, 40);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.font = 'bold 60px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#4cc9f0';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#4cc9f0';
    ctx.shadowBlur = 25;
    ctx.fillText('✦ STATISTIQUES MORPION ✦', 700, 140);
    ctx.shadowBlur = 0;

    if (playerInfo.avatar) {
      ctx.save();
      ctx.shadowColor = '#4cc9f0';
      ctx.shadowBlur = 30;
      ctx.beginPath();
      ctx.arc(700, 350, 120, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(playerInfo.avatar, 580, 230, 240, 240);
      ctx.restore();
      
      ctx.strokeStyle = '#4cc9f0';
      ctx.lineWidth = 8;
      ctx.stroke();
    }

    ctx.font = 'bold 48px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.fillText(playerInfo.name, 700, 520);

    const statsLeft = 250;
    const statsTop = 600;

    ctx.font = 'bold 40px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'left';

    ctx.fillText(`🏆 Victoires: ${stats.wins}`, statsLeft, statsTop);
    ctx.fillText(`💀 Défaites: ${stats.losses}`, statsLeft, statsTop + 70);
    ctx.fillText(`🤝 Nuls: ${stats.draws}`, statsLeft, statsTop + 140);
    ctx.fillText(`🎮 Parties: ${stats.played}`, statsLeft, statsTop + 210);

    ctx.textAlign = 'right';
    ctx.fillStyle = winRate >= 50 ? '#00ff00' : winRate >= 30 ? '#ffff00' : '#ff6b6b';
    ctx.shadowColor = winRate >= 50 ? '#00ff00' : winRate >= 30 ? '#ffff00' : '#ff6b6b';
    ctx.shadowBlur = 20;
    ctx.font = 'bold 45px "Segoe UI", Arial, sans-serif';
    ctx.fillText(`📈 Ratio: ${winRate}%`, 1150, statsTop);
    ctx.shadowBlur = 0;

    const barWidth = 600;
    const barHeight = 40;
    const barY = statsTop + 250;
    const barX = 400;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.fillRect(barX, barY, barWidth, barHeight * 4);

    if (stats.played > 0) {
      ctx.shadowColor = '#00ff00';
      ctx.shadowBlur = 15;
      ctx.fillStyle = '#00ff00';
      const winsWidth = (stats.wins / stats.played) * barWidth;
      ctx.fillRect(barX, barY, winsWidth, barHeight);
      ctx.shadowBlur = 0;

      ctx.shadowColor = '#ff6b6b';
      ctx.shadowBlur = 15;
      ctx.fillStyle = '#ff6b6b';
      const lossesWidth = (stats.losses / stats.played) * barWidth;
      ctx.fillRect(barX, barY + barHeight, lossesWidth, barHeight);
      ctx.shadowBlur = 0;

      ctx.shadowColor = '#ffff00';
      ctx.shadowBlur = 15;
      ctx.fillStyle = '#ffff00';
      const drawsWidth = (stats.draws / stats.played) * barWidth;
      ctx.fillRect(barX, barY + (barHeight * 2), drawsWidth, barHeight);
      ctx.shadowBlur = 0;
    }

    ctx.font = 'bold 28px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'left';
    ctx.fillText('Victoires', barX + 10, barY + 28);
    ctx.fillText('Défaites', barX + 10, barY + barHeight + 28);
    ctx.fillText('Nuls', barX + 10, barY + (barHeight * 2) + 28);

    ctx.font = 'italic 30px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#888888';
    ctx.textAlign = 'center';
    ctx.fillText('☞【𝐻𝑒𝑑𝑔𝑒ℎ𝑜𝑔𝄞𝙂𝙋𝙏】 • Système TicTacToe Ultimate', 700, 860);

    return canvas.toBuffer();
  } catch (error) {
    console.error('Erreur génération stats:', error);
    return null;
  }
}

async function generateHelpImage() {
  try {
    const canvas = createCanvas(1400, 1000);
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createLinearGradient(0, 0, 1400, 1000);
    gradient.addColorStop(0, '#0a0a0a');
    gradient.addColorStop(0.3, '#1a1a2e');
    gradient.addColorStop(0.7, '#16213e');
    gradient.addColorStop(1, '#0f3460');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1400, 1000);

    for(let i=0; i<50; i++) {
      ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.1})`;
      ctx.beginPath();
      ctx.arc(Math.random() * 1400, Math.random() * 1000, Math.random() * 4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.shadowColor = 'rgba(76, 201, 240, 0.3)';
    ctx.shadowBlur = 30;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.beginPath();
    ctx.roundRect(50, 50, 1300, 900, 40);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.font = 'bold 60px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#4cc9f0';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#4cc9f0';
    ctx.shadowBlur = 25;
    ctx.fillText('✦ TICTACTOE ULTIMATE ✦', 700, 130);
    ctx.shadowBlur = 0;

    ctx.beginPath();
    ctx.moveTo(300, 180);
    ctx.lineTo(1100, 180);
    ctx.strokeStyle = '#4cc9f0';
    ctx.lineWidth = 3;
    ctx.stroke();

    const helpText = [
      { 
        title: '🎮 JOUER', 
        color: '#4cc9f0',
        commands: [
          '`ttt @joueur` - 1v1 contre un ami',
          '`ttt ia [facile|normal|dur]` - Contre l\'IA',
          '`ttt` - Afficher cette aide'
        ]
      },
      { 
        title: '📊 STATISTIQUES', 
        color: '#00ff88',
        commands: [
          '`ttt stats` - Voir vos stats'
        ]
      },
      { 
        title: '🏆 TOURNOI (4, 8 ou 16 joueurs)', 
        color: '#FFD700',
        commands: [
          '`ttt tournoi` - Créer/afficher',
          '`ttt join` - Rejoindre',
          '`ttt out` - Quitter',
          '`ttt tournoi start` - Démarrer'
        ]
      },
      { 
        title: '🎨 AFFICHAGE', 
        color: '#ff6b6b',
        commands: [
          '`ttt image on/off` - Mode image'
        ]
      },
      { 
        title: '🎯 EN JEU', 
        color: '#ff00ff',
        commands: [
          'Choisir case (1-9)',
          '`forfait` - Abandonner',
          '`restart` - Rejouer (1v1 uniquement)'
        ]
      }
    ];

    let y = 250;
    ctx.font = 'bold 40px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'left';

    for (const section of helpText) {
      ctx.shadowColor = section.color;
      ctx.shadowBlur = 15;
      ctx.fillStyle = section.color;
      ctx.fillText(section.title, 150, y);
      ctx.shadowBlur = 0;
      y += 70;
      
      ctx.font = 'bold 32px "Segoe UI", Arial, sans-serif';
      ctx.fillStyle = '#CCCCCC';
      
      for (const cmd of section.commands) {
        ctx.fillText(cmd, 180, y);
        y += 55;
      }
      
      y += 50;
      ctx.font = 'bold 40px "Segoe UI", Arial, sans-serif';
    }

    ctx.font = 'italic 30px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#888888';
    ctx.textAlign = 'center';
    ctx.fillText('☞【𝐻𝑒𝑑𝑔𝑒ℎ𝑜𝑔𝄞𝙂𝙋𝙏】 • Commande `ttt help`', 700, 950);

    return canvas.toBuffer();
  } catch (error) {
    console.error('Erreur génération aide:', error);
    return null;
  }
}

async function sendImage(api, threadID, imageBuffer, text = "") {
  try {
    if (!imageBuffer) return;

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
  } catch (error) {
    console.error('Erreur envoi image:', error);
  }
}

async function generateVideoReview(gameID, api, usersData) {
  try {
    const game = games[gameID];
    if (!game || !game.moves || game.moves.length === 0) return;

    const tempDir = path.join(VIDEO_DIR, `review_${Date.now()}`);
    await fs.ensureDir(tempDir);

    const frames = [];
    
    async function addFrame(canvasBuffer, frameName) {
      const framePath = path.join(tempDir, `${frameName}.png`);
      await fs.writeFile(framePath, canvasBuffer);
      frames.push(framePath);
    }

    async function generatePlayerIntroFrame(player, frameNum) {
      const canvas = createCanvas(1920, 1080);
      const ctx = canvas.getContext('2d');

      const gradient = ctx.createLinearGradient(0, 0, 1920, 1080);
      gradient.addColorStop(0, '#0a0a0a');
      gradient.addColorStop(0.5, '#1a1a2e');
      gradient.addColorStop(1, '#0f3460');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 1920, 1080);

      const playerInfo = await getPlayerInfo(player.id, usersData);

      if (playerInfo.avatar) {
        ctx.save();
        ctx.shadowColor = player.symbol === '❌' ? '#ff6b6b' : '#4ecdc4';
        ctx.shadowBlur = 40;
        ctx.beginPath();
        ctx.arc(960, 400, 200, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(playerInfo.avatar, 760, 200, 400, 400);
        ctx.restore();
      }

      ctx.font = 'bold 80px "Segoe UI", Arial, sans-serif';
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#FFFFFF';
      ctx.shadowBlur = 20;
      ctx.fillText(playerInfo.name, 960, 650);
      ctx.shadowBlur = 0;

      ctx.font = 'bold 150px "Segoe UI", Arial, sans-serif';
      ctx.shadowColor = player.symbol === '❌' ? '#ff6b6b' : '#4ecdc4';
      ctx.shadowBlur = 40;
      ctx.fillStyle = player.symbol === '❌' ? '#ff6b6b' : '#4ecdc4';
      ctx.fillText(player.symbol, 960, 850);
      ctx.shadowBlur = 0;

      return canvas.toBuffer();
    }

    async function generateBoardFrame(board, players, moveIndex = null) {
      const canvas = createCanvas(1920, 1080);
      const ctx = canvas.getContext('2d');

      const gradient = ctx.createLinearGradient(0, 0, 1920, 1080);
      gradient.addColorStop(0, '#0a0a0a');
      gradient.addColorStop(0.5, '#1a1a2e');
      gradient.addColorStop(1, '#0f3460');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 1920, 1080);

      const boardSize = 700;
      const boardX = 960 - boardSize/2;
      const boardY = 300;

      ctx.shadowColor = 'rgba(76, 201, 240, 0.5)';
      ctx.shadowBlur = 40;
      ctx.fillStyle = 'rgba(20, 20, 40, 0.8)';
      ctx.beginPath();
      ctx.roundRect(boardX - 30, boardY - 30, boardSize + 60, boardSize + 60, 35);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.strokeStyle = '#4cc9f0';
      ctx.lineWidth = 8;
      ctx.beginPath();
      for (let i = 1; i <= 2; i++) {
        ctx.moveTo(boardX + (boardSize/3)*i, boardY);
        ctx.lineTo(boardX + (boardSize/3)*i, boardY + boardSize);
        ctx.moveTo(boardX, boardY + (boardSize/3)*i);
        ctx.lineTo(boardX + boardSize, boardY + (boardSize/3)*i);
      }
      ctx.stroke();

      ctx.font = 'bold 140px "Segoe UI", Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      for (let i = 0; i < 9; i++) {
        const row = Math.floor(i / 3);
        const col = i % 3;
        const x = boardX + (col * (boardSize/3)) + (boardSize/6);
        const y = boardY + (row * (boardSize/3)) + (boardSize/6);

        if (board[i] === '❌') {
          ctx.shadowColor = '#ff6b6b';
          ctx.shadowBlur = 30;
          ctx.fillStyle = '#ff6b6b';
          ctx.fillText('❌', x, y);
          ctx.shadowBlur = 0;
        } else if (board[i] === '⭕') {
          ctx.shadowColor = '#4ecdc4';
          ctx.shadowBlur = 30;
          ctx.fillStyle = '#4ecdc4';
          ctx.fillText('⭕', x, y);
          ctx.shadowBlur = 0;
        }
      }

      if (moveIndex !== null) {
        ctx.font = 'bold 50px "Segoe UI", Arial, sans-serif';
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(`Coup #${moveIndex + 1}`, 960, 150);
      }

      return canvas.toBuffer();
    }

    const titleCanvas = createCanvas(1920, 1080);
    const titleCtx = titleCanvas.getContext('2d');
    
    const titleGradient = titleCtx.createLinearGradient(0, 0, 1920, 1080);
    titleGradient.addColorStop(0, '#0a0a0a');
    titleGradient.addColorStop(0.5, '#1a1a2e');
    titleGradient.addColorStop(1, '#0f3460');
    titleCtx.fillStyle = titleGradient;
    titleCtx.fillRect(0, 0, 1920, 1080);

    titleCtx.font = 'bold 100px "Segoe UI", Arial, sans-serif';
    titleCtx.fillStyle = '#4cc9f0';
    titleCtx.textAlign = 'center';
    titleCtx.shadowColor = '#4cc9f0';
    titleCtx.shadowBlur = 40;
    titleCtx.fillText('🎬 REVUE DE LA PARTIE', 960, 400);
    titleCtx.shadowBlur = 0;
    
    titleCtx.font = 'bold 60px "Segoe UI", Arial, sans-serif';
    titleCtx.fillStyle = '#FFFFFF';
    titleCtx.fillText(`${game.players[0].name} vs ${game.players[1].name}`, 960, 550);
    
    titleCtx.font = 'italic 40px "Segoe UI", Arial, sans-serif';
    titleCtx.fillStyle = '#888888';
    titleCtx.fillText('TicTacToe Ultimate - Hedgehog GPT', 960, 700);

    await addFrame(titleCanvas.toBuffer(), 'title');

    for (let i = 0; i < game.players.length; i++) {
      const playerFrame = await generatePlayerIntroFrame(game.players[i], i);
      await addFrame(playerFrame, `player${i + 1}`);
    }

    for (let i = 0; i < game.moves.length; i++) {
      const boardFrame = await generateBoardFrame(game.moves[i].board, game.players, i);
      await addFrame(boardFrame, `move${i + 1}`);
    }

    const finalBoardFrame = await generateBoardFrame(game.board, game.players);
    await addFrame(finalBoardFrame, 'final');

    const videoPath = path.join(tempDir, 'review.mp4');
    
    return new Promise((resolve, reject) => {
      const command = ffmpeg()
        .addInput(path.join(tempDir, '*.png'))
        .inputOptions(['-pattern_type glob', '-framerate 1'])
        .outputOptions([
          '-c:v libx264',
          '-pix_fmt yuv420p',
          '-r 30',
          '-vf "scale=1920:1080,format=yuv420p"'
        ])
        .on('end', async () => {
          try {
            await api.sendMessage({
              body: `🎬 **Revue de la partie**\n━━━━━━━━━━━━━━━\n👤 **${game.players[0].name}** ❌ vs **${game.players[1].name}** ⭕\n📊 **${game.moves.length}** coups joués\n\n_La vidéo sera supprimée automatiquement..._`,
              attachment: fs.createReadStream(videoPath)
            }, game.threadID);
            
            await fs.remove(tempDir);
            resolve();
          } catch (error) {
            reject(error);
          }
        })
        .on('error', reject)
        .save(videoPath);
    });
    
  } catch (error) {
    console.error('Erreur génération vidéo:', error);
  }
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
  game.moves.push({
    player: 'AI',
    position: pos,
    board: [...game.board]
  });

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
      await sendImage(api, game.threadID, boardImage, `➲ Tour de : ${game.players[game.currentPlayerIndex].name}`);
    }
  } else {
    const next = game.players[game.currentPlayerIndex];
    await api.sendMessage(
      `◆━━━━━▣✦▣━━━━━━◆\n` +
      `${displayBoard(game.board)}\n\n` +
      `➲ Tour de : ${next.name}\n` +
      `◆━━━━━▣✦▣━━━━━━◆`,
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

  if (game.moves && game.moves.length > 0 && !game.isTournamentGame && !game.isMathChallenge) {
    setTimeout(() => {
      generateVideoReview(gameID, api, usersData).catch(console.error);
    }, 3000);
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
  text += `➲ Status: ${getTournamentStatus(tournament)}\n`;
  text += `➲ Joueurs: ${tournament.players.length}/${tournament.requiredPlayers}\n\n`;

  if (tournament.players.length === 0) {
    text += '➲ (Aucun joueur inscrit)\n';
  } else {
    text += '➲ Participants:\n';
    tournament.players.forEach((p, i) => {
      text += `${i+1}. ${p.name}\n`;
    });
  }

  if (tournament.status !== 'registration' && tournament.rounds.length > 0) {
    text += '\n➲ Structure du tournoi:\n';

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
    text += `🏆 CHAMPION: ${winner?.name || 'Inconnu'}\n';
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
      `◆━━━━━▣✦▣━━━━━━◆\n` +
      `❌ Le tournoi doit avoir exactement 4, 8 ou 16 joueurs. Actuels: ${num}\n` +
      `◆━━━━━▣✦▣━━━━━━◆`,
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
      `◆━━━━━▣✦▣━━━━━━◆\n` +
      `🎉 Le tournoi démarre !\n` +
      `◆━━━━━▣✦▣━━━━━━◆`
    );
  } else {
    const bracketText = generateTournamentBracketText(tournament);
    await api.sendMessage(
      `◆━━━━━▣✦▣━━━━━━◆\n` +
      `🎉 Le tournoi démarre !\n\n` +
      `${bracketText}`,
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
      `◆━━━━━▣✦▣━━━━━━◆\n` +
      `❌ Erreur: joueur introuvable pour match de tournoi.\n` +
      `◆━━━━━▣✦▣━━━━━━◆`,
      T.threadID
    );
    return;
  }

  const p1Info = await getPlayerInfo(p1.id, usersData);
  const p2Info = await getPlayerInfo(p2.id, usersData);

  const gameID = `${T.threadID}:tournament:${T.id}:${T.currentRoundIndex}:${idx}`;
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
      `◆━━━━━▣✦▣━━━━━━◆\n` +
      `🎬 ${round.name} - Match ${idx+1}\n` +
      `${p1Info.name} ❌ vs ${p2Info.name} ⭕\n` +
      `◆━━━━━▣✦▣━━━━━━◆`
    );
  } else {
    await api.sendMessage(
      `◆━━━━━▣✦▣━━━━━━◆\n` +
      `🎬 ${round.name} - Match ${idx+1}\n` +
      `${p1Info.name} ❌ vs ${p2Info.name} ⭕\n\n` +
      `${displayBoard(games[gameID].board)}\n\n` +
      `${p1Info.name}, joue le premier coup (1-9).\n` +
      `◆━━━━━▣✦▣━━━━━━◆`,
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
      `◆━━━━━▣✦▣━━━━━━◆\n` +
      `⚠️ Attention: certains matchs ne sont pas terminés.\n` +
      `◆━━━━━▣✦▣━━━━━━◆`,
      T.threadID
    );
  }

  if (T.currentRoundIndex === T.rounds.length - 1) {
    T.winner = winners[0];
    T.status = 'completed';

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
      `◆━━━━━▣✦▣━━━━━━◆\n` +
      `⚡ Passage au tour ${nextRound.name.toUpperCase()} !\n` +
      `◆━━━━━▣✦▣━━━━━━◆`
    );
  } else {
    await api.sendMessage(
      `◆━━━━━▣✦▣━━━━━━◆\n` +
      `⚡ Passage au tour **${nextRound.name}** !\n` +
      `◆━━━━━▣✦▣━━━━━━◆`,
      T.threadID
    );
  }

  await initiateNextMatch(tournamentID, api, usersData);
}

module.exports = {
  config: {
    name: "tictactoe",
    aliases: ["ttt", "morpion"],
    version: "10.0",
    author: "ʚʆɞ Sømå Sønïč ʚʆɞ & L'Uchiha Perdu",
    category: "game",
    shortDescription: { en: "TicTacToe Ultimate with avatars and Tournaments", fr: "TicTacToe Ultimate avec avatars et Tournois" },
    longDescription: { en: "Advanced TicTacToe game with AI, tournaments, video reviews and beautiful visuals", fr: "Jeu de Morpion avancé avec IA, tournois, revues vidéo et visuels époustouflants" },
    usage: { en: "ttt | ttt @mention | ttt ai [easy|normal|hard] | ttt stats | ttt image on/off | ttt tournament | ttt join | ttt out | ttt help", fr: "ttt | ttt @mention | ttt ia [facile|normal|dur] | ttt stats | ttt image on/off | ttt tournoi | ttt join | ttt out | ttt help" }
  },

  onStart: async function({ api, event, args, usersData }) {
    const threadID = event.threadID;
    const senderID = event.senderID;

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
    game.moves.push({
      player: current.id,
      position: pos,
      board: [...game.board]
    });

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
        `◆━━━━━▣✦▣━━━━━━◆\n` +
        `🎨 MODE IMAGE ACTIVÉ\n\n` +
        `Tous les rendus seront désormais visuels.\n` +
        `Pour revenir au mode textuel:\n` +
        `\ttt image off\`\n` +
        `◆━━━━━▣✦▣━━━━━━◆`, 
        threadID 
      );
    } else if (arg1 === 'off') {
      imageModeByThread[threadID] = false;
      if (tournaments[threadID]) {
        tournaments[threadID].imageMode = false;
      }
      return api.sendMessage(
        `◆━━━━━▣✦▣━━━━━━◆\n` +
        `🔧 Mode image désactivé.\n` +
        `Retour au rendu textuel.\n` +
        `◆━━━━━▣✦▣━━━━━━◆`,
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
    const userName = await usersData.getName(senderID) || `Joueur ${senderID}`;

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
    const diff = ['easy', 'normal', 'hard', 'facile', 'normal', 'dur'].includes(arg1) ? 
      (arg1 === 'facile' ? 'easy' : arg1 === 'dur' ? 'hard' : arg1) : 'normal';
    const userName = await usersData.getName(senderID) || `Joueur ${senderID}`;

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
    `◆━━━━━▣✦▣━━━━━━◆\n` +
    `❌ Commande introuvable. Tapez \`ttt help\`.\n` +
    `◆━━━━━▣✦▣━━━━━━◆`,
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
        `◆━━━━━▣✦▣━━━━━━◆\n` +
        `❌ Aucun tournoi en inscription actuellement.\n` +
        `◆━━━━━▣✦▣━━━━━━◆`,
        threadID
      );
    }

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
        `◆━━━━━▣✦▣━━━━━━◆\n` +
        `❌ Impossible de quitter, tournoi déjà démarré.\n` +
        `◆━━━━━▣✦▣━━━━━━◆`,
        threadID
      );
    }

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
        `◆━━━━━▣✦▣━━━━━━◆\n` +
        `❌ Impossible d'annuler, tournoi déjà démarré.\n` +
        `◆━━━━━▣✦▣━━━━━━◆`,
        threadID
      );
    }

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
        `◆━━━━━▣✦▣━━━━━━◆\n` +
        `❌ Il faut 4, 8 ou 16 joueurs pour démarrer. Actuels: ${num}\n` +
        `◆━━━━━▣✦▣━━━━━━◆`,
        threadID
      );
    }

    tournament.requiredPlayers = num;
    await startTournament(threadID, api, usersData);
    return;
  }

  if (tournament.imageMode) {
    const bracketImage = await generateTournamentBracketImage(tournament, usersData);
    await sendImage(api, threadID, bracketImage,
      `◆━━━━━▣✦▣━━━━━━◆\n` +
      `🏆 TOURNOI MORPION\n` +
      `Tapez \`ttt join\` pour participer !\n` +
      `◆━━━━━▣✦▣━━━━━━◆`
    );
  } else {
    const bracketText = generateTournamentBracketText(tournament);
    await api.sendMessage(
      `◆━━━━━▣✦▣━━━━━━◆\n` +
      `🏆 TOURNOI MORPION\n\n` +
      `${bracketText}\n\n` +
      `Tapez \`ttt join\` pour participer !\n` +
      `◆━━━━━▣✦▣━━━━━━◆`,
      threadID
    );
  }
}

async function sendHelpText(api, threadID) {
  const helpText =
    `◆━━━━━▣✦▣━━━━━━◆\n` +
    `🤖 TICTACTOE ULTIMATE - AIDE\n` +
    `◆━━━━━▣✦▣━━━━━━◆\n\n` +
    `🎮 JOUER:\n` +
    `➲ \`ttt @joueur\` - 1v1 contre un ami\n` +
    `➲ \`ttt ia [facile|normal|dur]\` - Contre l'IA\n` +
    `➲ \`ttt\` - Afficher cette aide\n\n` +
    `📊 STATISTIQUES:\n` +
    `➲ \`ttt stats\` - Voir vos stats\n\n` +
    `🏆 TOURNOI (4, 8 ou 16 joueurs):\n` +
    `➲ \`ttt tournoi\` - Créer/afficher\n` +
    `➲ \`ttt join\` - Rejoindre\n` +
    `➲ \`ttt out\` - Quitter\n` +
    `➲ \`ttt tournoi start\` - Démarrer\n\n` +
    `🎨 AFFICHAGE:\n` +
    `➲ \`ttt image on/off\` - Mode image\n\n` +
    `🎯 EN JEU:\n` +
    `➲ Choisir case (1-9)\n` +
    `➲ \`forfait\` - Abandonner\n` +
    `➲ \`restart\` - Rejouer (1v1 uniquement)\n` +
    `◆━━━━━▣✦▣━━━━━━◆`;

  await api.sendMessage(helpText, threadID);
}

async function sendStatsText(api, threadID, userName, stats) {
  const winRate = stats.played > 0 ? Math.round((stats.wins / stats.played) * 100) : 0;
  const statsText =
    `◆━━━━━▣✦▣━━━━━━◆\n` +
    `📊 STATISTIQUES de ${userName}\n` +
    `◆━━━━━▣✦▣━━━━━━◆\n\n` +
    `🏆 Victoires: ${stats.wins}\n` +
    `💀 Défaites: ${stats.losses}\n` +
    `🤝 Nuls: ${stats.draws}\n` +
    `🎮 Parties: ${stats.played}\n` +
    `📈 Ratio: ${winRate}%\n` +
    `◆━━━━━▣✦▣━━━━━━◆`;

  await api.sendMessage(statsText, threadID);
}
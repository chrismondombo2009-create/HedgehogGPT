const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

const DAMES_SAVE_PATH = path.join(__dirname, 'dames.json');
const STATS_PATH = path.join(__dirname, 'dames_stats.json');
const DEFAULT_PIECES = {
  blanc: { pion: "⚪", dame: "🔵" },
  noir: { pion: "⚫", dame: "🔴" },
  vide: "🟩"
};

let damierGames = {};
let playerStats = {};
let playerPieces = {};

function saveGames() { fs.writeFileSync(DAMES_SAVE_PATH, JSON.stringify(damierGames, null, 2)); }
function loadGames() { if (fs.existsSync(DAMES_SAVE_PATH)) damierGames = JSON.parse(fs.readFileSync(DAMES_SAVE_PATH)); }
function saveStats() { fs.writeFileSync(STATS_PATH, JSON.stringify(playerStats, null, 2)); }
function loadStats() { if (fs.existsSync(STATS_PATH)) playerStats = JSON.parse(fs.readFileSync(STATS_PATH)); }
loadGames(); loadStats();

function createDamierBoard(pieces = DEFAULT_PIECES) {
  const board = Array.from({ length: 8 }, () => Array(8).fill(pieces.vide));
  for (let i = 0; i < 3; i++) for (let j = 0; j < 8; j++)
    if ((i + j) % 2 === 1) board[i][j] = pieces.noir.pion;
  for (let i = 5; i < 8; i++) for (let j = 0; j < 8; j++)
    if ((i + j) % 2 === 1) board[i][j] = pieces.blanc.pion;
  return board;
}

function displayDamier(board) {
  let s = "    𝚊 𝚋 𝚌 𝚍 𝚎 𝚏 𝚐 𝚑\n";
  for (let i = 0; i < 8; i++) {
    s += ` ${8-i} `;
    for (let j = 0; j < 8; j++) {
      s += board[i][j] + " ";
    }
    s += ` ${8-i}\n`;
  }
  s += "    𝚊 𝚋 𝚌 𝚍 𝚎 𝚏 𝚐 𝚑";
  return s;
}

function damierToImage(board, pieces, outPath) {
  const size = 54, canvas = createCanvas(8 * size, 8 * size), ctx = canvas.getContext('2d');
  for (let x = 0; x < 8; x++) for (let y = 0; y < 8; y++) {
    ctx.fillStyle = ((x + y) % 2 === 0) ? "#E6E6E6" : "#232323";
    ctx.fillRect(y * size, x * size, size, size);
    ctx.font = "bold 44px Arial";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(board[x][y], y * size + size / 2, x * size + size / 2);
  }
  const out = fs.createWriteStream(outPath);
  canvas.createPNGStream().pipe(out);
  return new Promise(res => out.on('finish', () => res(outPath)));
}

function parseDamierMove(str) {
  const match = str.trim().toLowerCase().match(/^([a-h][1-8])\s+([a-h][1-8])$/);
  if (!match) return null;
  const pos = (p) => [8 - Number(p[1]), p.charCodeAt(0) - 97];
  return [pos(match[1]), pos(match[2])];
}

function isInside(x, y) { return x >= 0 && x < 8 && y >= 0 && y < 8; }
function hasPieces(board, pion, dame) { return board.flat().some(cell => cell === pion || cell === dame); }

function isValidMoveDamier(board, from, to, player, pieces) {
  const [fx, fy] = from, [tx, ty] = to;
  const piece = board[fx][fy];
  if (!isInside(fx, fy) || !isInside(tx, ty)) return false;
  if (board[tx][ty] !== pieces.vide) return false;

  // Pion blanc
  if (piece === pieces.blanc.pion) {
    if (fx - tx === 1 && Math.abs(ty - fy) === 1) return true;
    if (fx - tx === 2 && Math.abs(ty - fy) === 2 &&
      (board[fx - 1][fy + (ty - fy) / 2] === pieces.noir.pion ||
        board[fx - 1][fy + (ty - fy) / 2] === pieces.noir.dame)) return "prise";
  }
  // Pion noir
  if (piece === pieces.noir.pion) {
    if (tx - fx === 1 && Math.abs(ty - fy) === 1) return true;
    if (tx - fx === 2 && Math.abs(ty - fy) === 2 &&
      (board[fx + 1][fy + (ty - fy) / 2] === pieces.blanc.pion ||
        board[fx + 1][fy + (ty - fy) / 2] === pieces.blanc.dame)) return "prise";
  }
  // Dame blanche
  if (piece === pieces.blanc.dame) {
    if (Math.abs(fx - tx) === Math.abs(fy - ty)) {
      const dx = tx > fx ? 1 : -1, dy = ty > fy ? 1 : -1;
      let x = fx + dx, y = fy + dy, found = false;
      while (x !== tx && y !== ty) {
        if (board[x][y] === pieces.noir.pion || board[x][y] === pieces.noir.dame) {
          if (found) return false;
          found = true;
        } else if (board[x][y] !== pieces.vide) return false;
        x += dx; y += dy;
      }
      return found ? "prise" : true;
    }
  }
  // Dame noire
  if (piece === pieces.noir.dame) {
    if (Math.abs(fx - tx) === Math.abs(fy - ty)) {
      const dx = tx > fx ? 1 : -1, dy = ty > fy ? 1 : -1;
      let x = fx + dx, y = fy + dy, found = false;
      while (x !== tx && y !== ty) {
        if (board[x][y] === pieces.blanc.pion || board[x][y] === pieces.blanc.dame) {
          if (found) return false;
          found = true;
        } else if (board[x][y] !== pieces.vide) return false;
        x += dx; y += dy;
      }
      return found ? "prise" : true;
    }
  }
  return false;
}

function checkPromotion(board, pieces) {
  for (let j = 0; j < 8; j++) {
    if (board[0][j] === pieces.blanc.pion) board[0][j] = pieces.blanc.dame;
    if (board[7][j] === pieces.noir.pion) board[7][j] = pieces.noir.dame;
  }
}

function getAllLegalMoves(board, player, pieces) {
  const moves = [];
  const myPion = player === 0 ? pieces.blanc.pion : pieces.noir.pion;
  const myDame = player === 0 ? pieces.blanc.dame : pieces.noir.dame;
  for (let fx = 0; fx < 8; fx++) {
    for (let fy = 0; fy < 8; fy++) {
      if ([myPion, myDame].includes(board[fx][fy])) {
        for (let tx = 0; tx < 8; tx++) {
          for (let ty = 0; ty < 8; ty++) {
            if ((fx !== tx || fy !== ty) && isValidMoveDamier(board, [fx, fy], [tx, ty], player === 0 ? "blanc" : "noir", pieces)) {
              moves.push([[fx, fy], [tx, ty]]);
            }
          }
        }
      }
    }
  }
  return moves;
}

function updateStats(winnerId, loserId) {
  if (!playerStats[winnerId]) playerStats[winnerId] = { win: 0, loss: 0 };
  if (!playerStats[loserId]) playerStats[loserId] = { win: 0, loss: 0 };
  playerStats[winnerId].win++; playerStats[loserId].loss++;
  saveStats();
}

function botBestMove(game, pieces) {
  const moves = getAllLegalMoves(game.board, 1, pieces);
  if (moves.length === 0) return null;
  let best = moves.find(([from, to]) => isValidMoveDamier(game.board, from, to, "noir", pieces) === "prise");
  if (best) return best;
  return moves[Math.floor(Math.random() * moves.length)];
}

async function botPlay(game, api, threadID) {
  const pieces = game.pieces || DEFAULT_PIECES;
  const move = botBestMove(game, pieces);
  if (!move) {
    game.inProgress = false;
    updateStats(game.players[0].id, 'BOT');
    await api.sendMessage(
      `━━━━━━━━❪❐❫━━━━━━━━\n${displayDamier(game.board)}\n━━━━━━━━❪❐❫━━━━━━━━\n🎉| ${game.players[0].name} 𝚛𝚎𝚖𝚙𝚘𝚛𝚝𝚎 𝚕𝚊 𝚙𝚊𝚛𝚝𝚒𝚎 (𝚕𝚎 𝚋𝚘𝚝 𝚗'𝚊 𝚙𝚕𝚞𝚜 𝚍𝚎 𝚌𝚘𝚞𝚙) !`,
      threadID
    );
    saveGames();
    return;
  }
  const [[fx, fy], [tx, ty]] = move;
  const piece = game.board[fx][fy];
  game.board[tx][ty] = piece;
  game.board[fx][fy] = pieces.vide;
  if (isValidMoveDamier(game.board, [fx, fy], [tx, ty], "noir", pieces) === "prise") {
    game.board[(fx + tx) / 2][(fy + ty) / 2] = pieces.vide;
  }
  checkPromotion(game.board, pieces);

  const hasBlanc = hasPieces(game.board, pieces.blanc.pion, pieces.blanc.dame);
  const hasNoir = hasPieces(game.board, pieces.noir.pion, pieces.noir.dame);
  if (!hasBlanc || !hasNoir) {
    game.inProgress = false;
    const winner = hasBlanc ? game.players[0] : game.players[1];
    updateStats(winner.id, hasBlanc ? 'BOT' : game.players[0].id);
    await api.sendMessage(
      `━━━━━━━━❪❐❫━━━━━━━━\n${displayDamier(game.board)}\n━━━━━━━━❪❐❫━━━━━━━━\n🎉| ${winner.name} 𝚛𝚎𝚖𝚙𝚘𝚛𝚝𝚎 𝚕𝚊 𝚙𝚊𝚛𝚝𝚒𝚎 !`,
      threadID
    );
    saveGames();
    return;
  }

  game.turn = 0;
  saveGames();
  await api.sendMessage(
    `━━━━━━━━❪❐❫━━━━━━━━\n${displayDamier(game.board)}\n━━━━━━━━❪❐❫━━━━━━━━\n➤『 𝙷𝙴𝙳𝙶𝙴𝙷𝙾𝙶𝄞𝙶𝙿𝚃 』☜ヅ réfléchit...🤔`,
    threadID
  );
}

module.exports = {
  config: {
    name: "dames",
    aliases: ["damiers", "checkers"],
    version: "2.0",
    author: "ミ★𝐒𝐎𝐍𝐈𝐂✄𝐄𝐗𝐄 3.0★彡",
    category: "game",
    shortDescription: "𝙹𝚎𝚞 𝚍𝚎 𝚍𝚊𝚖𝚎𝚜 𝚎𝚗 𝚙𝚊𝚛𝚝𝚒𝚎 𝚛𝚒𝚌𝚑𝚎 (𝚜𝚝𝚊𝚝𝚜, 𝚜𝚊𝚞𝚟𝚎𝚐𝚊𝚛𝚍𝚎, 𝚒𝚖𝚊𝚐𝚎, 𝚒𝚊, 𝚙𝚎𝚛𝚜𝚘𝚗𝚗𝚊𝚕𝚒𝚜𝚊𝚝𝚒𝚘𝚗 𝚍𝚎𝚜 𝚙𝚒𝚎𝚌𝚎𝚜)",
    usage: "dames @ami | dames <ID> | dames help | dames stats | dames setpieces <⚪> <🔵> <⚫> <🔴>"
  },

  onStart: async function ({ api, event, args }) {
    const threadID = event.threadID;
    const senderID = event.senderID;
    let opponentID;
    let playWithBot = false;

    // Commandes stylisées
    if (args[0] === "help" || args[0] === "rules") {
      return api.sendMessage(
        `━━━━━━━━❪❐❫━━━━━━━━\n📚| 𝚁𝚎̀𝚐𝚕𝚎𝚜 𝚍𝚞 𝚓𝚎𝚞 𝚍𝚎 𝚍𝚊𝚖𝚎𝚜\n━━━━━━━━❪❐❫━━━━━━━━\n
➤ 『 𝙲𝚘𝚖𝚖𝚎𝚗𝚝 𝚓𝚘𝚞𝚎𝚛 ? 』\n
• 𝚙𝚘𝚞𝚛 𝚓𝚘𝚞𝚎𝚛 : "𝚍𝚊𝚖𝚎𝚜 @𝚊𝚖𝚒", "𝚍𝚊𝚖𝚎𝚜 <ID>", ou "𝚍𝚊𝚖𝚎𝚜" pour jouer contre le bot.\n
• 𝚙𝚒𝚘𝚗𝚜 avancent en diagonale, 𝚍𝚊𝚖𝚎𝚜 toutes directions.\n
• 𝚍𝚎́𝚙𝚕𝚊𝚌𝚎𝚛 : "𝚋𝟼 𝚊𝟻" (𝚌𝚊𝚜𝚎 𝚍𝚎́𝚙𝚊𝚛𝚝, 𝚌𝚊𝚜𝚎 𝚊𝚛𝚛𝚒𝚟𝚎́𝚎).\n
• "𝚏𝚘𝚛𝚏𝚊𝚒𝚝" pour abandonner, "𝚛𝚎𝚜𝚝𝚊𝚛𝚝" pour rejouer, "𝚍𝚊𝚖𝚎𝚜 𝚜𝚝𝚊𝚝𝚜" pour voir tes stats.\n
• 𝟼𝟶𝚜 𝚙𝚊𝚛 𝚌𝚘𝚞𝚙, 𝚜𝚒𝚗𝚘𝚗 𝚏𝚘𝚛𝚏𝚊𝚒𝚝.\n
• 𝙿𝚎𝚛𝚜𝚘𝚗𝚗𝚊𝚕𝚒𝚜𝚎 𝚝𝚎𝚜 𝚙𝚒𝚎𝚌𝚎𝚜 : "𝚍𝚊𝚖𝚎𝚜 𝚜𝚎𝚝𝚙𝚒𝚎𝚌𝚎𝚜 <⚪> <🔵> <⚫> <🔴>"\n
━━━━━━━━❪❐❫━━━━━━━━`
        , threadID, event.messageID
      );
    }

    if (args[0] === "stats") {
      const targetId = args[1] || senderID;
      const stats = playerStats[targetId];
      if (!stats) return api.sendMessage("𝙰𝚞𝚌𝚞𝚗𝚎 𝚜𝚝𝚊𝚝𝚒𝚜𝚝𝚒𝚚𝚞𝚎 𝚝𝚛𝚘𝚞𝚟𝚎́𝚎.", threadID, event.messageID);
      return api.sendMessage(`━━━━━━━━❪❐❫━━━━━━━━\n𝚂𝚝𝚊𝚝𝚜 𝚓𝚘𝚞𝚎𝚞𝚛 : ${targetId}\n𝚅𝚒𝚌𝚝𝚘𝚒𝚛𝚎𝚜 : ${stats.win}\n𝙳𝚎́𝚏𝚊𝚒𝚝𝚎𝚜 : ${stats.loss}\n━━━━━━━━❪❐❫━━━━━━━━`, threadID, event.messageID);
    }

    if (args[0] === "setpieces" && args.length === 5) {
      playerPieces[senderID] = {
        blanc: { pion: args[1], dame: args[2] },
        noir: { pion: args[3], dame: args[4] },
        vide: DEFAULT_PIECES.vide
      };
      return api.sendMessage("✅| 𝚃𝚎𝚜 𝚙𝚒𝚎𝚌𝚎𝚜 𝚙𝚎𝚛𝚜𝚘 𝚎𝚗𝚛𝚎𝚐𝚒𝚜𝚝𝚛𝚎́𝚎𝚜 !", threadID, event.messageID);
    }

    if (args[0] === "spectate") {
      const gameID = Object.keys(damierGames).find((id) => id.startsWith(`${threadID}:`));
      if (!gameID || !damierGames[gameID].inProgress) return api.sendMessage("𝙰𝚞𝚌𝚞𝚗𝚎 𝚙𝚊𝚛𝚝𝚒𝚎 𝚎𝚗 𝚌𝚘𝚞𝚛𝚜.", threadID, event.messageID);
      const game = damierGames[gameID];
      return api.sendMessage(`━━━━━━━━❪❐❫━━━━━━━━\n${displayDamier(game.board)}\n━━━━━━━━❪❐❫━━━━━━━━\n𝚃𝚘𝚞𝚛 : ${game.players[game.turn].name}`, threadID, event.messageID);
    }

    const mentionedIDs = event.mentions ? Object.keys(event.mentions) : [];
    if (mentionedIDs.length > 0) opponentID = mentionedIDs[0];
    else if (args[0] && /^\d+$/.test(args[0])) opponentID = args[0];
    if (!opponentID) playWithBot = true;
    if (opponentID && opponentID == senderID)
      return api.sendMessage("𝚅𝚘𝚞𝚜 𝚗𝚎 𝚙𝚎𝚞𝚟𝚎𝚣 𝚙𝚊𝚜 𝚓𝚘𝚞𝚎𝚛 𝚌𝚘𝚗𝚝𝚛𝚎 𝚟𝚘𝚞𝚜-𝚖𝚎̂𝚖𝚎 !", threadID, event.messageID);

    const pieces = playerPieces[senderID] || DEFAULT_PIECES;
    const gameID = playWithBot
      ? `${threadID}:${senderID}:BOT`
      : `${threadID}:${Math.min(senderID, opponentID)}:${Math.max(senderID, opponentID)}`;
    if (damierGames[gameID] && damierGames[gameID].inProgress)
      return api.sendMessage("❌| 𝚄𝚗𝚎 𝚙𝚊𝚛𝚝𝚒𝚎 𝚎𝚜𝚝 𝚍𝚎́𝚓𝚊 𝚎𝚗 𝚌𝚘𝚞𝚛𝚜.", threadID, event.messageID);

    let player1Info, player2Info, botName = "➤『 𝙷𝙴𝙳𝙶𝙴𝙷𝙾𝙶𝄞𝙶𝙿𝚃 』☜ヅ";
    if (playWithBot) {
      player1Info = await api.getUserInfo(senderID);
      damierGames[gameID] = {
        board: createDamierBoard(pieces),
        players: [
          { id: senderID, name: player1Info[senderID].name, color: "blanc" },
          { id: "BOT", name: botName, color: "noir" }
        ],
        turn: 0,
        inProgress: true,
        vsBot: true,
        pieces,
        timer: Date.now()
      };
      saveGames();
      api.sendMessage(
        `📣| 𝙻𝚊𝚗𝚌𝚎𝚖𝚎𝚗𝚝 𝚍'𝚞𝚗𝚎 𝚙𝚊𝚛𝚝𝚒𝚎 𝚍𝚎 𝚍𝚊𝚖𝚎𝚜 𝚎𝚗𝚝𝚛𝚎 ${player1Info[senderID].name} (⚪) 𝚎𝚝 ${botName} (⚫) !\n━━━━━━━━❪❐❫━━━━━━━━\n${displayDamier(damierGames[gameID].board)}\n━━━━━━━━❪❐❫━━━━━━━━\n${player1Info[senderID].name}, 𝚊̀ 𝚟𝚘𝚞𝚜 𝚍𝚎 𝚌𝚘𝚖𝚖𝚎𝚗𝚌𝚎𝚛 (𝚎𝚡: 𝚋𝟼 𝚊𝟻).\n📛| 𝚅𝚘𝚞𝚜 𝚙𝚘𝚞𝚟𝚎𝚣 𝚎́𝚐𝚊𝚕𝚎𝚖𝚎𝚗𝚝 𝚜𝚊𝚒𝚜𝚒𝚛 \"𝚏𝚘𝚛𝚏𝚊𝚒𝚝\" 𝚙𝚘𝚞𝚛 𝚊𝚛𝚛𝚎̂𝚝𝚎𝚛 !`,
        threadID, event.messageID
      );
    } else {
      player1Info = await api.getUserInfo(senderID);
      player2Info = await api.getUserInfo(opponentID);
      if (!player2Info[opponentID])
        return api.sendMessage("𝙸𝚖𝚙𝚘𝚜𝚜𝚒𝚋𝚕𝚎 𝚍𝚎 𝚛𝚎́𝚌𝚞𝚙𝚎́𝚛𝚎𝚛 𝚕𝚎 𝚓𝚘𝚞𝚎𝚞𝚛.", threadID, event.messageID);
      damierGames[gameID] = {
        board: createDamierBoard(pieces),
        players: [
          { id: senderID, name: player1Info[senderID].name, color: "blanc" },
          { id: opponentID, name: player2Info[opponentID].name, color: "noir" }
        ],
        turn: 0,
        inProgress: true,
        vsBot: false,
        pieces,
        timer: Date.now()
      };
      saveGames();
      api.sendMessage(
        `📣| 𝙻𝚊𝚗𝚌𝚎𝚖𝚎𝚗𝚝 𝚍'𝚞𝚗𝚎 𝚗𝚘𝚞𝚟𝚎𝚕𝚕𝚎 𝚙𝚊𝚛𝚝𝚒𝚎 𝚍𝚎 𝚍𝚊𝚖𝚎𝚜 𝚎𝚗𝚝𝚛𝚎 ${player1Info[senderID].name} (⚪) 𝚎𝚝 ${player2Info[opponentID].name} (⚫) !\n━━━━━━━━❪❐❫━━━━━━━━\n${displayDamier(damierGames[gameID].board)}\n━━━━━━━━❪❐❫━━━━━━━━\n${player1Info[senderID].name}, 𝚊̀ 𝚟𝚘𝚞𝚜 𝚍𝚎 𝚌𝚘𝚖𝚖𝚎𝚗𝚌𝚎𝚛 (𝚎𝚡: 𝚋𝟼 𝚊𝟻).\n📛| 𝚅𝚘𝚞𝚜 𝚙𝚘𝚞𝚟𝚎𝚣 𝚊𝚞𝚜𝚜𝚒 𝚜𝚊𝚒𝚜𝚒𝚛 \"𝚏𝚘𝚛𝚏𝚊𝚒𝚝\" 𝚙𝚘𝚞𝚛 𝚊𝚛𝚛𝚎̂𝚝𝚎𝚛 !`,
        threadID, event.messageID
      );
    }
  },

  onChat: async function ({ api, event }) {
    const threadID = event.threadID;
    const senderID = event.senderID;
    const messageBody = event.body.trim();

    // Trouver la game correspondante
    const gameID = Object.keys(damierGames).find((id) =>
      id.startsWith(`${threadID}:`) && (id.includes(senderID) || id.endsWith(':BOT'))
    );
    if (!gameID) return;
    const game = damierGames[gameID];
    if (!game.inProgress) return;
    const board = game.board;
    const pieces = game.pieces || DEFAULT_PIECES;
    const currentPlayer = game.players[game.turn];

    // Timer 60s par coup
    if (Date.now() - (game.timer || Date.now()) > 60000) {
      game.inProgress = false;
      const opponent = game.players.find(p => p.id != senderID);
      updateStats(opponent.id, senderID);
      saveGames();
      return api.sendMessage(`⏰| 𝚃𝚎𝚖𝚙𝚜 𝚎́𝚌𝚘𝚞𝚕𝚎́ ! ${currentPlayer.name} 𝚊 𝚙𝚎𝚛𝚍𝚞 𝚙𝚊𝚛 𝚏𝚘𝚛𝚏𝚊𝚒𝚝. ${opponent.name} 𝚐𝚊𝚐𝚗𝚎.`, threadID);
    }
    game.timer = Date.now();

    if (!game.vsBot && senderID != currentPlayer.id)
      return api.sendMessage(`𝙲𝚎 𝚗'𝚎𝚜𝚝 𝚙𝚊𝚜 𝚟𝚘𝚝𝚛𝚎 𝚝𝚘𝚞𝚛 !`, threadID, event.messageID);
    if (game.vsBot && game.turn === 1) return;

    if (["forfait", "abandon"].includes(messageBody.toLowerCase())) {
      const opponent = game.players.find(p => p.id != senderID);
      game.inProgress = false;
      updateStats(opponent.id, senderID);
      saveGames();
      return api.sendMessage(`🏳️| ${currentPlayer.name} 𝚊 𝚊𝚋𝚊𝚗𝚍𝚘𝚗𝚗𝚎́. ${opponent.name} 𝚐𝚊𝚐𝚗𝚎 !`, threadID);
    }

    if (["restart", "rejouer"].includes(messageBody.toLowerCase())) {
      const [player1, player2] = game.players;
      damierGames[gameID] = {
        board: createDamierBoard(pieces),
        players: [player1, player2],
        turn: 0,
        inProgress: true,
        vsBot: game.vsBot,
        pieces,
        timer: Date.now()
      };
      saveGames();
      return api.sendMessage(
        `📣| 𝙽𝚘𝚞𝚟𝚎𝚕𝚕𝚎 𝚙𝚊𝚛𝚝𝚒𝚎 𝚍𝚎 𝚍𝚊𝚖𝚎𝚜 !\n━━━━━━━━❪❐❫━━━━━━━━\n${displayDamier(damierGames[gameID].board)}\n━━━━━━━━❪❐❫━━━━━━━━\n${player1.name}, 𝚌'𝚎𝚜𝚝 𝚟𝚘𝚞𝚜 𝚚𝚞𝚒 𝚌𝚘𝚖𝚖𝚎𝚗𝚌𝚎𝚣 (ex: 𝚋𝟼 𝚊𝟻).\n📛| \"𝚏𝚘𝚛𝚏𝚊𝚒𝚝\" 𝚙𝚘𝚞𝚛 𝚊𝚛𝚛𝚎̂𝚝𝚎𝚛`, threadID);
    }

    if (messageBody === "spectate") {
      return api.sendMessage(`━━━━━━━━❪❐❫━━━━━━━━\n${displayDamier(board)}\n━━━━━━━━❪❐❫━━━━━━━━\n𝚃𝚘𝚞𝚛 : ${currentPlayer.name}`, threadID, event.messageID);
    }

    // Fin par blocage
    const moves = getAllLegalMoves(board, game.turn, pieces);
    if (moves.length === 0) {
      game.inProgress = false;
      const opponent = game.players[(game.turn + 1) % 2];
      updateStats(opponent.id, currentPlayer.id);
      saveGames();
      return api.sendMessage(`🚫| ${currentPlayer.name} 𝚗'𝚊 𝚙𝚕𝚞𝚜 𝚍𝚎 𝚌𝚘𝚞𝚙, ${opponent.name} 𝚐𝚊𝚐𝚗𝚎 !`, threadID, event.messageID);
    }

    const move = parseDamierMove(messageBody);
    if (!move) {
      return api.sendMessage(`𝙼𝚘𝚞𝚟𝚎𝚖𝚎𝚗𝚝 𝚒𝚗𝚟𝚊𝚕𝚒𝚍𝚎. 𝚄𝚝𝚒𝚕𝚒𝚜𝚎 : 𝚋𝟼 𝚊𝟻`, threadID, event.messageID);
    }

    const [[fx, fy], [tx, ty]] = move;
    const piece = board[fx][fy];

    if (
      (game.turn === 0 && ![pieces.blanc.pion, pieces.blanc.dame].includes(piece)) ||
      (game.turn === 1 && ![pieces.noir.pion, pieces.noir.dame].includes(piece))
    ) {
      return api.sendMessage(`𝚅𝚘𝚞𝚜 𝚗𝚎 𝚙𝚎𝚞𝚟𝚎𝚣 𝚍𝚎́𝚙𝚕𝚊𝚌𝚎𝚛 𝚚𝚞𝚎 𝚟𝚘𝚜 𝚙𝚛𝚘𝚙𝚛𝚎 𝚙𝚒𝚎𝚌𝚎𝚜 !`, threadID, event.messageID);
    }

    const moveState = isValidMoveDamier(board, [fx, fy], [tx, ty], game.turn === 0 ? "blanc" : "noir", pieces);
    if (!moveState) {
      return api.sendMessage(`𝙲𝚘𝚞𝚙 𝚒𝚕𝚕𝚎́𝚐𝚊𝚕 𝚘𝚞 𝚒𝚖𝚙𝚘𝚜𝚜𝚒𝚋𝚕𝚎.`, threadID, event.messageID);
    }

    board[tx][ty] = piece;
    board[fx][fy] = pieces.vide;
    if (moveState === "prise") {
      board[(fx + tx) / 2][(fy + ty) / 2] = pieces.vide;
    }
    checkPromotion(board, pieces);

    const hasBlanc = hasPieces(board, pieces.blanc.pion, pieces.blanc.dame);
    const hasNoir = hasPieces(board, pieces.noir.pion, pieces.noir.dame);
    if (!hasBlanc || !hasNoir) {
      game.inProgress = false;
      const winner = hasBlanc ? game.players[0] : game.players[1];
      const loser = hasBlanc ? game.players[1].id : game.players[0].id;
      updateStats(winner.id, loser);
      saveGames();
      return api.sendMessage(
        `━━━━━━━━❪❐❫━━━━━━━━\n${displayDamier(board)}\n━━━━━━━━❪❐❫━━━━━━━━\n🎉| ${winner.name} 𝚛𝚎𝚖𝚙𝚘𝚛𝚝𝚎 𝚕𝚊 𝚙𝚊𝚛𝚝𝚒𝚎 !\n𝚂𝚝𝚊𝚝𝚜 : ${playerStats[winner.id].win} 𝚟𝚒𝚌𝚝𝚘𝚒𝚛𝚎𝚜, ${playerStats[winner.id].loss} 𝚍𝚎́𝚏𝚊𝚒𝚝𝚎𝚜.`,
        threadID
      );
    }

    game.turn = (game.turn + 1) % 2;
    game.timer = Date.now();
    saveGames();

    // Optionnel : image PNG
    const imgPath = path.join(__dirname, `damier_${Date.now()}.png`);
    await damierToImage(board, pieces, imgPath);

    if (game.vsBot && game.turn === 1) {
      await api.sendMessage(
        {
          body: `━━━━━━━━❪❐❫━━━━━━━━\n${displayDamier(board)}\n━━━━━━━━❪❐❫━━━━━━━━\n➤『 𝙷𝙴𝙳𝙶𝙴𝙷𝙾𝙶𝄞𝙶𝙿𝚃 』☜ヅ réfléchit...🤔`,
          attachment: fs.createReadStream(imgPath)
        },
        threadID
      );
      setTimeout(async () => {
        await botPlay(game, api, threadID);
        try { fs.unlinkSync(imgPath); } catch {}
      }, 6500);
    } else {
      api.sendMessage(
        {
          body: `━━━━━━━━❪❐❫━━━━━━━━\n${displayDamier(board)}\n━━━━━━━━❪❐❫━━━━━━━━\n${game.players[game.turn].name}, 𝚊̀ 𝚟𝚘𝚞𝚜 𝚍𝚎 𝚓𝚘𝚞𝚎𝚛 !`,
          attachment: fs.createReadStream(imgPath)
        },
        threadID
      );
      setTimeout(() => { try { fs.unlinkSync(imgPath); } catch {} }, 5000);
    }
  }
};
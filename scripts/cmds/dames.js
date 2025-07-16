const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

const DEFAULT_PIECES = {
  blanc: { pion: "⚪", dame: "🔵" },
  noir: { pion: "⚫", dame: "🔴" },
  vide: "🟩"
};

let damierGames = {};
let playerPieces = {};

function createDamierBoard(pieces = DEFAULT_PIECES) {
  const board = Array.from({ length: 8 }, () => Array(8).  for (let i = 0; i < 3; i++) for (let j = 0; j < 8; j++)
    if ((i + j) % 2 === 1) board[i][j] = pieces.noir.pion;
  for (let i = 5; i < 8; i++) for (let j = 0; j < 8; j++)
    if ((i + j) % 2 === 1) board[i][j] = pieces.blanc.pion;
  return board;
}

function displayDamier(board) {
  let s = "    𝚊 𝚋 𝚌 𝚍 𝚎 𝚏 𝚐 𝚑\n";
  for i = 0; i < 8; i++) {
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
  const size = 54;
  const canvas = createCanvas(8 * size, 8 * size);
  const ctx = canvas.getContext('2d');
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

async function sendBoardImage(api, threadID, message, board, pieces) {
  const imgPath = path.join(__dirname, `damier_${Date.now()}_${Math.floor(Math.random()*10000)}.png`);
  await damierToImage(board, {
  const match = str.trim().toLowerCase().match(/^([a-h][1-8])\s+([a-h][1-8])$/);
  if (!match) return null;
  const pos = (p) => [8 - Number(p[1]), p.charCodeAt(0) - 97];
  return [pos(match[1]), pos(match[2])];
}

function isInside(x, y) { return x >= 0 && x < 8 && y >= 0 && y < 8; }
function hasPieces(board, pion, dame) { return board.flat().some(cell => cell === pion || cell === dame); }

function isValidMoveDamier(board, from, to, player, pieces) {
  const [fx, fy] = from, [tx, ty] = to;
  const piece = board[fx];
  if (!isInside(fx, fy) || !isInside(tx, ty)) return false;
  if (board[tx][ty] !== pieces.vide) return false;
  if (piece === pieces.blanc.pion) {
    if (fx - tx === 1 && Math.abs(ty - fy) === 1) return true;
    if (fx - tx === 2 && Math.abs(ty - fy) === 2 &&
      (board[fx - 1][fy + (ty - fy) / 2] === pieces.noir.pion ||
        board[fx - 1][fy + (ty - fy) / 2] === pieces.noir.dame)) return "prise";
  }
  if (piece === pieces.noir.pion) {
    if (tx - fx === 1 && Math.abs(ty - fy) === 1) return true;
    if (tx - fx === 2 && Math.abs(ty - fy) === 2 &&
      (board[fx + 1][fy + (ty - fy) / 2] === pieces.blanc.pion ||
        board[fx + 1][fy + (typrise";
  }
  if (piece === pieces.blanc.dame) {
    if (Math.abs(fx - tx) === Math.abs(fy - ty)) {
      const dx = tx > fx ? 1 : -1, dy = ty > fy ? 1 : -1;
      let x = fx y !== ty) {
        if (board[x][y] === pieces.noir.pion || board[x][y] === pieces.noir.dame) {
          if (found) return false;
          found = true;
        } else if (board[x][y] !== pieces.vide) return false;
        x  if (piece === pieces.noir.dame) {
    if (Math.abs(fx - tx) === Math.abs(fy - ty)) {
      const dx = tx > fx ? 1 : -1, dy = ty > fy ? 1 : -1;
      let x = fx + dx, y = fy + dy, found = false;
      while (x !== tx && y !== ty) {
        if (board[x][y] === pieces.blanc.pion || board[x][y] === pieces.blanc.dame) {
          if (found) return false;
          found = true;
        } else if (board[x][y] !== pieces.vide) return false;
        x += pieces.blanc.pion : pieces.noir.pion;
  const myDame = player === 0 ? pieces.blanc.dame : pieces.noir.dame;
  for (let fx = 0; fx < 8; fx++) for (let fy = 0; fy < 8; fy++) {
    if ([myPion, myDame].includes(board[fx][fy])) {
      for (let tx = 0; tx < 8; tx++) for (let ty = 0; ty < 8; ty++) {
        if ((fx !== tx || fy !== ty) && isValidMoveDamier(board, [fx, fy], [tx, ty], player === 0 ? "blanc" : "noir", pieces)) {
          moves.push([[fx, fy], [tx, ty]]);
        }
      }
    }
  }
  return moves;
}

function botBestMove(game, pieces) {
  const moves = getAllLegalMoves(game.board, 1, pieces);
  if (moves.length 0) return null;
  let best = moves.find(([from, to]) => isValidMoveDamier(game.board, from, to, "noir", pieces) === "prise");
  if (best) return best;
  return moves[Math.floor(Math.random() * moves.length)];
}

async function botPlay(game, api, threadID) {
  const pieces = game.pieces || DEFAULT_PIECES;
  const move = botBestMove(game, pieces);
  if (!move) {
    game.inProgress = false;
    await sendBoardImage(
      api, threadID,
      `━━━━━━━━❪❐❫━━━━━━━━\n${displayDamier(game.board)}\n━━━━━━━━❪❐❫━━━━━━━━\n🎉| ${game.players[0].name} remporte la partie car le Bot ne peut plus jouer.`, game.board, pieces
    );
    return;
  }
  const [[fx, fy], [tx, ty]] = move;
  const piece = game.board[fx][fy];
  game.board[tx][ty] = piece;
  game.board[fx][fy] = pieces.vide;
  if (isValidMoveDamier(game.board, [fx, fy], [tx, ty], "noir", pieces) === "prise") {
    game.board[(fx + tx false;
    const winner = hasBlanc ? game.players[0] : game.players[1];
    await sendBoardImage(
      api, threadID,
      `━━━━━━━━❪❐❫━━━━━━━━\n${displayDamier(game.board)}\n━━━━━━━━❪❐❫━━━━━━━━\n🎉| ${winner.name} remporte la partie.`, game.board, pieces
    );
    return;
  }

  game.turn = 0;
  await sendBoardImage(
    api, threadID,
    `━━━━━━━━❪❐❫━━━━━━━━\n${displayDamier(game.board)}\n━━━━━━━━❪❐❫━━━━━━━━\nC'est à vous de jouer.`, game.board, pieces
  );
}

module.exports = {
  config: {
    name: "dames",
    aliases: ["damiers", "checkers"],
    version: "2.0",
    author: "ミ★𝐒𝐎𝐍𝐈𝐂✄𝐄𝐗𝐄 3.0★彡",
    category: "game",
    shortDescription: "Jeu de dames avec images interactives et Bot.",
    usage: "dames @ami | dames <ID> | dames api.sendMessage("Veuillez mentionner un ami ou saisir son identifiant pour jouer contre lui.", threadID, event.messageID);
    }

    const pieces = playerPieces[senderID] || DEFAULT_PIECES;
    const gameID = playWithBot
      ? `${threadID}:${senderID}:BOT`
      : `${threadID}:${Math.min(senderID, opponentID)}:${Math.max(senderID, opponentID)}`;
    if (damierGames[gameID] && damierGames[gameID].inProgress)
      return api.sendMessage("Une partie est déjà en cours entre ces joueurs.", threadID, event.messageID);

    let player1Info, player2Info, botName = "➤『 𝙷𝙴𝙳𝙶𝙴𝙷𝙾𝙶𝄞𝙶𝙿𝚃 』☜ヅ";
    if (playWithBot) {
      player1Info = await api.getUserInfo(senderID);
      damierGames[gameID] = {
        board: createDamierBoard(pieces),
        players: [
          { id: senderID, name: player1Info[senderID].name, color: "blanc" },
          { id: "BOT", name: botName, color: "noir" }
 api.getUserInfo(opponentID);
      damierGames[gameID] = {
        board: createDamierBoard(pieces),
        players: [
          { id: senderID, name: player1Info[senderID].name, color: "blanc" },
          { id: opponentID, name: player2Info[opponentID].name, color: "noir" }
        ],
        turn: 0,
        inProgress: true,
        vsBot: false,
        pieces
      };
      await sendBoardImage(
        api, threadID,
        `📣| Début d'une partie de dames entre ${player1Info[senderID].name} (⚪) et ${player2Info[opponentID].name} (⚫) !\n━━━━━━━━❪❐❫━━━━━━━━\nC'est à vous de jouer (exemple : b6 a5).`, damierGames[gameID].    const threadID = event.threadID;
    const senderID = event.senderID;
    const messageBody = event.body.trim();

    const gameID = Object.keys(damierGames).find((id) =>
      id.startsWith(`${threadID}:`) && (id.includes(senderID) || id.endsWith(':BOT'))
    );
    if (!gameID) return;
    const game = damierGames[gameID];
    if (!game.inProgress) return;
    const board = game.board;
    const pieces = game.pieces || DEFAULT_PIECES;
    const currentPlayer = game.players[game.turn];

    if (!game.vsBot && senderID !== currentPlayer.id)
      return api.sendMessage("Ce n'est pas votre tour.", threadID, event.messageID);
    if (game.vsBot && game.turn === 1) return;

    if (["forfait", "abandon"].includes(messageBody.toLowerCase())) {
      const opponent = game.players.find(p => p.id !== senderID);
      game.inProgress = false;
      await sendBoardImage(
        api, threadID,
        `🏳️| ${currentPlayer.name} abandonne. ${opponent.name} remporte la partie.`, board, pieces
      );
      return;
         (game.turn === 0 && ![pieces.blanc.pion, pieces.blanc.dame].includes(piece)) ||
      (game.turn === 1 && ![pieces.noir.pion, pieces.noir.dame].includes(piece))
    ) {
      return api.sendMessage("Vous pouvez déplacer uniquement vos propres pions.", threadID, event.messageID);
    }

    const moveState = isValidMoveDamier(board, [fx, fy], [tx, ty], game.turn === 0 ? "blanc" : "noir", pieces);
    if (!moveState) {
      return api.sendMessage("Ce coup est illégal ou impossible.", threadID, event.messageID);
    }

    board[tx][ty] = piece;
    board[fx][fy] = pieces.vide;
    if (moveState === "prise") {
      board[(fx + tx) / 2][(fy + ty) / 2] = pieces.vide;
    }
    checkPromotion(board, pieces);

    const hasBlanc = hasPieces(board, pieces ${winner.name} remporte la partie.`, board, pieces
      );
      return;
    }

    game.turn = (game.turn + 1) % 2;

    if (game.vsBot && game.turn === 1) {
      await sendBoardImage(
        api, threadID,
        `━━━━━━━━❪❐❫━━━━━━━━\n${displayDamier(board)}\n━━━━━━━━❪❐❫━━━━━━━━\nLe Bot réfléchit...`, board, pieces
      );
      setTimeout(() => botPlay(game, api, threadID), 1200);
    } else {
      const nextPlayer = game.players[game.turn];
      await sendBoardImage(
        api, threadID,
        `━━━━━━━━❪❐❫━━━━━━━━\n${displayDamier(board)}\n━━━━━━━━❪❐❫━━━━━━━━\nC'est à ${nextPlayer.name} de jouer.`, board, pieces
      );
    }
  }
};
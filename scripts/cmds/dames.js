const fs = require('fs-extra');
const path = require('path');
const { createCanvas } = require('canvas');

const DEFAULT_PIECES = {
  blanc: { pion: "⚪", dame: "🔵" },
  noir: { pion: "⚫", dame: "🔴" },
  vide: "🔲" // Changed to make it clearer
};

let damierGames = {};
// let playerPieces = {}; // No longer needed as it's not used

function createDamierBoard(pieces = DEFAULT_PIECES) {
  const board = Array.from({ length: 8 }, () => Array(8).fill(pieces.vide)); // Corrected syntax
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 8; j++) {
      if ((i + j) % 2 === 1) board[i][j] = pieces.noir.pion;
    }
  }
  for (let i = 5; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      if ((i + j) % 2 === 1) board[i][j] = pieces.blanc.pion;
    }
  }
  return board;
}

function displayDamier(board) {
  let s = "    𝚊 𝚋 𝚌 𝚍 𝚎 𝚏 𝚐 𝚑\n";
  for (let i = 0; i < 8; i++) {
    s += ` ${8 - i} `;
    for (let j = 0; j < 8; j++) {
      s += board[i][j] + " ";
    }
    s += ` ${8 - i}\n`;
  }
  s += "    𝚊 𝚋 𝚌 𝚍 𝚎 𝚏 𝚐 𝚑";
  return s;
}

function damierToImage(board, pieces, outPath) {
  const size = 64; // Increased size for better clarity
  const canvas = createCanvas(8 * size, 8 * size);
  const ctx = canvas.getContext('2d');
  for (let x = 0; x < 8; x++) {
    for (let y = 0; y < 8; y++) { // Corrected inner loop
      ctx.fillStyle = ((x + y) % 2 === 0) ? "#E6E6E6" : "#232323";
      ctx.fillRect(y * size, x * size, size, size);
      ctx.font = "bold 44px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const piece = board[x][y]; // Access piece correctly
      if (piece !== pieces.vide) { // Only draw if not empty
        ctx.fillText(piece, y * size + size / 2, x * size + size / 2);
      }
    }
  }
  const out = fs.createWriteStream(outPath);
  const stream = canvas.createPNGStream(); // Corrected missing part
  stream.pipe(out);
  return new Promise(res => out.on('finish', () => res(outPath)));
}

async function sendBoardImage(api, threadID, messageText, board, pieces) { // Renamed 'message' to 'messageText' for clarity
  const tmpDir = path.join(__dirname, "tmp");
  await fs.ensureDir(tmpDir); // Ensure tmp directory exists
  const imgPath = path.join(tmpDir, `damier_${Date.now()}_${Math.floor(Math.random() * 10000)}.png`);
  try {
    await damierToImage(board, pieces, imgPath); // Passed correct args
    await api.sendMessage(
      { body: messageText, attachment: fs.createReadStream(imgPath) }, // Use messageText here
      threadID
    );
  } catch (error) {
    console.error("Erreur lors de l'envoi de l'image du damier:", error);
    await api.sendMessage("Désolé, une erreur est survenue lors de la génération de l'image du plateau.", threadID);
  } finally {
    if (fs.existsSync(imgPath)) {
      await fs.unlink(imgPath).catch(err => console.error("Erreur lors de la suppression de l'image temporaire:", err));
    }
  }
}

function parseDamierMove(str) {
  const match = str.trim().toLowerCase().match(/^([a-h][1-8])\s+([a-h][1-8])$/);
  if (!match) return null;
  const pos = (p) => [8 - Number(p[1]), p.charCodeAt(0) - 97];
  return [pos(match[1]), pos(match[2])];
}

function isInside(x, y) { return x >= 0 && x < 8 && y >= 0 && y < 8; }
function hasPieces(board, pion, dame) { return board.flat().some(cell => cell === pion || cell === dame); } // Fixed `has` part

function isValidMoveDamier(board, from, to, playerColor, pieces) { // Renamed 'player' to 'playerColor' for clarity
  const [fx, fy] = from, [tx, ty] = to;
  const piece = board[fx][fy];
  const isBlanc = playerColor === "blanc";
  const myPion = isBlanc ? pieces.blanc.pion : pieces.noir.pion;
  const myDame = isBlanc ? pieces.blanc.dame : pieces.noir.dame;
  const oppPion = isBlanc ? pieces.noir.pion : pieces.blanc.pion;
  const oppDame = isBlanc ? pieces.noir.dame : pieces.blanc.dame;

  if (!isInside(fx, fy) || !isInside(tx, ty)) return false;
  if (piece !== myPion && piece !== myDame) return false; // Ensure it's the player's own piece
  if (board[tx][ty] !== pieces.vide) return false; // Target square must be empty

  const dx = tx - fx;
  const dy = ty - fy;

  // Pawn moves
  if (piece === myPion) {
    // Simple move
    if (Math.abs(dy) === 1 && Math.abs(dx) === 1) {
      if ((isBlanc && dx === -1) || (!isBlanc && dx === 1)) { // Blanc moves up, Noir moves down
        return true;
      }
    }
    // Capture move
    if (Math.abs(dy) === 2 && Math.abs(dx) === 2) {
      const capturedX = fx + dx / 2;
      const capturedY = fy + dy / 2;
      const capturedPiece = board[capturedX][capturedY];
      if ((capturedPiece === oppPion || capturedPiece === oppDame) &&
          ((isBlanc && dx === -2) || (!isBlanc && dx === 2))) { // Corrected `typrise`
        return "prise";
      }
    }
  }

  // Queen moves
  if (piece === myDame) {
    if (Math.abs(dx) === Math.abs(dy) && dx !== 0) {
      const stepX = dx > 0 ? 1 : -1;
      const stepY = dy > 0 ? 1 : -1;
      let x = fx + stepX;
      let y = fy + stepY;
      let foundCaptured = false; // Renamed 'found' to avoid confusion

      while (x !== tx || y !== ty) {
        if (board[x][y] === myPion || board[x][y] === myDame) return false; // Blocked by own piece
        if (board[x][y] === oppPion || board[x][y] === oppDame) {
          if (foundCaptured) return false; // Cannot capture more than one piece
          foundCaptured = true;
        } else if (board[x][y] !== pieces.vide) return false; // Blocked by empty piece? No, should be empty
        x += stepX;
        y += stepY;
      }
      return foundCaptured ? "prise" : true;
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

function getAllLegalMoves(board, playerTurn, pieces) { // Renamed 'player' to 'playerTurn' for clarity
  const moves = [];
  const myPion = playerTurn === 0 ? pieces.blanc.pion : pieces.noir.pion;
  const myDame = playerTurn === 0 ? pieces.blanc.dame : pieces.noir.dame;
  for (let fx = 0; fx < 8; fx++) {
    for (let fy = 0; fy < 8; fy++) {
      if ([myPion, myDame].includes(board[fx][fy])) {
        for (let tx = 0; tx < 8; tx++) {
          for (let ty = 0; ty < 8; ty++) {
            if (fx === tx && fy === ty) continue;
            const moveState = isValidMoveDamier(board, [fx, fy], [tx, ty], playerTurn === 0 ? "blanc" : "noir", pieces); // Passed playerColor
            if (moveState) {
              moves.push([[fx, fy], [tx, ty], moveState]); // Store movestate for prioritization
            }
          }
        }
      }
    }
  }
  const captureMoves = moves.filter(move => move[2] === "prise");
  return captureMoves.length > 0 ? captureMoves : moves; // Prioritize captures
}

function botBestMove(game, pieces) {
  const moves = getAllLegalMoves(game.board, 1, pieces); // Bot is player 1 (noir)
  if (moves.length === 0) return null;
  let bestCapture = moves.find(move => move[2] === "prise"); // Find a capture move
  if (bestCapture) return [bestCapture[0], bestCapture[1]]; // Return the [from, to] part
  const simpleMoves = moves.filter(move => move[2] === true); // Filter for simple moves
  if (simpleMoves.length > 0) {
    return [simpleMoves[Math.floor(Math.random() * simpleMoves.length)][0], simpleMoves[Math.floor(Math.random() * simpleMoves.length)][1]]; // Random simple move
  }
  return [moves[0][0], moves[0][1]]; // Fallback, should not be reached if moves.length > 0
}

function checkWinCondition(board, pieces, game) {
  const hasBlanc = hasPieces(board, pieces.blanc.pion, pieces.blanc.dame);
  const hasNoir = hasPieces(board, pieces.noir.pion, pieces.noir.dame);

  if (!hasBlanc) return game.players.find(p => p.color === "noir"); // Noir wins
  if (!hasNoir) return game.players.find(p => p.color === "blanc"); // Blanc wins
  return null;
}

async function botPlay(game, api, threadID, getLang) { // Added getLang to params
  const pieces = game.pieces || DEFAULT_PIECES;
  const move = botBestMove(game, pieces);
  if (!move) {
    game.inProgress = false;
    await sendBoardImage(
      api, threadID,
      getLang("dames.botNoMoreMoves", game.players[0].name), // Use getLang
      game.board, pieces
    );
    delete damierGames[game.gameID]; // Delete game after end
    return;
  }
  const [[fx, fy], [tx, ty]] = move;
  const piece = game.board[fx][fy];
  const moveState = isValidMoveDamier(game.board, [fx, fy], [tx, ty], "noir", pieces); // Re-check movestate for capture

  game.board[tx][ty] = piece;
  game.board[fx][fy] = pieces.vide;
  if (moveState === "prise") {
    game.board[(fx + tx) / 2][(fy + ty) / 2] = pieces.vide;
  }
  checkPromotion(game.board, pieces);

  const winner = checkWinCondition(game.board, pieces, game); // Use checkWinCondition
  if (winner) {
    game.inProgress = false;
    await sendBoardImage(
      api, threadID,
      getLang("dames.winnerMessage", winner.name), // Use getLang
      game.board, pieces
    );
    delete damierGames[game.gameID]; // Delete game after end
    return;
  }

  game.turn = 0;
  await sendBoardImage(
    api, threadID,
    getLang("dames.nextTurn", game.players[0].name), // Use getLang and specify next player
    game.board, pieces
  );
}

module.exports = {
  config: {
    name: "dames",
    aliases: ["damiers", "checkers"],
    version: "2.0",
    author: "ミ★𝐒𝐎𝐍𝐈𝐂✄𝐄𝐗𝐄 3.0★彡",
    category: "game",
    shortDescription: { fr: "Jeu de dames avec images interactives et Bot.", en: "Checkers game with interactive images and Bot." },
    longDescription: { fr: "Lance une partie de dames. Vous pouvez jouer contre un ami ou contre le Bot. Les déplacements se font via les coordonnées (ex: b6 a5).", en: "Starts a checkers game. You can play against a friend or the Bot. Moves are made using coordinates (e.g., b6 a5)." },
    guide: { fr: "{p}dames @ami | {p}dames <ID> | {p}dames bot | {p}dames", en: "{p}checkers @friend | {p}checkers <ID> | {p}checkers bot | {p}checkers" }, // Added {p}dames for default
    priority: 1,
    cooldown: 5
  },

  onStart: async function ({ api, event, args, usersData, getLang }) { // Added usersData and getLang
    const threadID = event.threadID;
    const senderID = event.senderID;
    let opponentID;
    let playWithBot = false;

    if (args.length > 0 && args[0].toLowerCase() === "bot") {
      playWithBot = true;
    } else if (Object.keys(event.mentions).length > 0) {
      opponentID = Object.keys(event.mentions)[0];
    } else if (args[0] && /^\d+$/.test(args[0])) {
      opponentID = args[0];
    }

    if (playWithBot === false && (!opponentID || opponentID === senderID)) {
      return api.sendMessage(getLang("dames.noOpponent"), threadID, event.messageID); // Use getLang
    }

    const pieces = DEFAULT_PIECES; // Removed playerPieces usage for simplicity
    const gameID = playWithBot
      ? `${threadID}:${senderID}:BOT`
      : `${threadID}:${Math.min(senderID, opponentID)}:${Math.max(senderID, opponentID)}`;
    if (damierGames[gameID] && damierGames[gameID].inProgress)
      return api.sendMessage(getLang("dames.gameAlreadyInProgress"), threadID, event.messageID); // Use getLang

    let player1Info, player2Info, botName = "➤『 𝙷𝙴𝙳𝙶𝙴𝙷𝙾𝙶𝄞𝙶𝙿𝚃 』☜ヅ";
    if (playWithBot) {
      player1Info = await usersData.get(senderID) || (await api.getUserInfo(senderID))[senderID]; // Get user info
      damierGames[gameID] = {
        board: createDamierBoard(pieces),
        players: [
          { id: senderID, name: player1Info.name, color: "blanc" },
          { id: "BOT", name: botName, color: "noir" }
        ],
        turn: 0,
        inProgress: true,
        vsBot: true,
        gameID: gameID, // Added gameID to game object
        pieces
      };
      await sendBoardImage(
        api, threadID,
        getLang("dames.startGameBot", damierGames[gameID].players[0].name, damierGames[gameID].players[1].name), // Use getLang
        damierGames[gameID].board, pieces
      );
    } else {
      player1Info = await usersData.get(senderID) || (await api.getUserInfo(senderID))[senderID];
      player2Info = await usersData.get(opponentID) || (await api.getUserInfo(opponentID))[opponentID];

      if (!player1Info || !player2Info) { // Handle case where user info isn't found
        return api.sendMessage(getLang("dames.playerNotFound"), threadID, event.messageID);
      }
      if (senderID === opponentID) { // Added check for playing against self
        return api.sendMessage(getLang("dames.cannotPlaySelf"), threadID, event.messageID);
      }

      damierGames[gameID] = {
        board: createDamierBoard(pieces),
        players: [
          { id: senderID, name: player1Info.name, color: "blanc" },
          { id: opponentID, name: player2Info.name, color: "noir" }
        ],
        turn: 0,
        inProgress: true,
        vsBot: false,
        gameID: gameID, // Added gameID to game object
        pieces
      };
      await sendBoardImage(
        api, threadID,
        getLang("dames.startGamePlayers", damierGames[gameID].players[0].name, damierGames[gameID].players[1].name), // Use getLang
        damierGames[gameID].board, pieces
      );
    }
  },

  onChat: async function ({ api, event, message, getLang }) { // Added getLang to params
    const threadID = event.threadID;
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
      return; // Removed message to avoid spam
    if (game.vsBot && game.turn === 1) return;

    if (["forfait", "abandon"].includes(messageBody.toLowerCase())) {
      const opponent = game.players.find(p => p.id !== senderID);
      game.inProgress = false;
      await sendBoardImage(
        api, threadID,
        getLang("dames.playerForfeit", currentPlayer.name, opponent.name), // Use getLang
        board, pieces
      );
      delete damierGames[gameID]; // Delete game after end
      return;
    }

    const move = parseDamierMove(messageBody);
    if (!move) {
      return; // Removed message to avoid spam
    }

    const [[fx, fy], [tx, ty]] = move;
    const piece = board[fx][fy];

    const isBlancTurn = game.turn === 0;
    const myPion = isBlancTurn ? pieces.blanc.pion : pieces.noir.pion;
    const myDame = isBlancTurn ? pieces.blanc.dame : pieces.noir.dame;

    if (piece !== myPion && piece !== myDame) { // Corrected logic for checking own piece
      return api.sendMessage(getLang("dames.notYourPiece"), threadID, event.messageID); // Use getLang
    }

    const moveState = isValidMoveDamier(board, [fx, fy], [tx, ty], isBlancTurn ? "blanc" : "noir", pieces); // Passed correct player color
    if (!moveState) {
      return api.sendMessage(getLang("dames.illegalMove"), threadID, event.messageID); // Use getLang
    }

    board[tx][ty] = piece;
    board[fx][fy] = pieces.vide;
    if (moveState === "prise") {
      board[(fx + tx) / 2][(fy + ty) / 2] = pieces.vide;
    }
    checkPromotion(board, pieces);

    const winner = checkWinCondition(board, pieces, game); // Use checkWinCondition
    if (winner) {
      game.inProgress = false;
      await sendBoardImage(
        api, threadID,
        getLang("dames.winnerMessage", winner.name), // Use getLang
        board, pieces
      );
      delete damierGames[gameID]; // Delete game after end
      return;
    }

    game.turn = (game.turn + 1) % 2;

    if (game.vsBot && game.turn === 1) {
      await sendBoardImage(
        api, threadID,
        getLang("dames.botThinking", game.players[1].name), // Use getLang
        board, pieces
      );
      setTimeout(() => botPlay(game, api, threadID, getLang), 1200); // Pass getLang
    } else {
      const nextPlayer = game.players[game.turn];
      await sendBoardImage(
        api, threadID,
        getLang("dames.nextTurn", nextPlayer.name), // Use getLang
        board, pieces
      );
    }
  },
  langs: { // Added langs object as it was missing
    fr: {
      "dames.gameAlreadyInProgress": "Une partie est déjà en cours entre ces joueurs. Veuillez la terminer ou en démarrer une autre.",
      "dames.cannotPlaySelf": "Vous ne pouvez pas jouer contre vous-même.",
      "dames.playerNotFound": "Impossible de trouver un ou plusieurs des joueurs mentionnés.",
      "dames.noOpponent": "Veuillez mentionner un ami, saisir son identifiant ou taper 'bot' pour jouer contre le Bot.",
      "dames.startGameBot": "📣| Début d'une partie de dames entre %1 (⚪) et %2 (⚫) !\n━━━━━━━━❪❐❫━━━━━━━━\nC'est à vous (⚪) de jouer (exemple : b6 a5).",
      "dames.startGamePlayers": "📣| Début d'une partie de dames entre %1 (⚪) et %2 (⚫) !\n━━━━━━━━❪❐❫━━━━━━━━\nC'est à %1 (⚪) de jouer (exemple : b6 a5).",
      "dames.playerForfeit": "🏳️| %1 abandonne. %2 remporte la partie.",
      "dames.invalidMoveFormat": "Format de coup invalide. Utilisez 'collig lignel col2lig2' (ex: b6 a5).",
      "dames.notYourPiece": "Vous pouvez déplacer uniquement vos propres pions.",
      "dames.illegalMove": "Ce coup est illégal ou impossible.",
      "dames.winnerMessage": "━━━━━━━━❪❐❫━━━━━━━━\n🎉| %1 remporte la partie !",
      "dames.botNoMoreMoves": "━━━━━━━━❪❐❫━━━━━━━━\n🎉| %1 remporte la partie car le Bot ne peut plus jouer.",
      "dames.botThinking": "━━━━━━━━❪❐❫━━━━━━━━\nLe Bot (%1) réfléchit...",
      "dames.nextTurn": "━━━━━━━━❪❐❫━━━━━━━━\nC'est à %1 de jouer.",
      "dames.gameOverNoPieces": "Fin de partie ! Le joueur %1 n'a plus de pièces.",
    },
    en: {
      "dames.gameAlreadyInProgress": "A game is already in progress between these players. Please finish it or start another.",
      "dames.cannotPlaySelf": "You cannot play against yourself.",
      "dames.playerNotFound": "Could not find one or more of the mentioned players.",
      "dames.noOpponent": "Please mention a friend, enter their ID, or type 'bot' to play against the Bot.",
      "dames.startGameBot": "📣| Starting a checkers game between %1 (⚪) and %2 (⚫) !\n━━━━━━━━❪❐❫━━━━━━━━\nIt's your (⚪) turn (example: b6 a5).",
      "dames.startGamePlayers": "📣| Starting a checkers game between %1 (⚪) and %2 (⚫) !\n━━━━━━━━❪❐❫━━━━━━━━\nIt's %1's (⚪) turn (example: b6 a5).",
      "dames.playerForfeit": "🏳️| %1 forfeits. %2 wins the game.",
      "dames.invalidMoveFormat": "Invalid move format. Use 'colrow col2row2' (e.g., b6 a5).",
      "dames.notYourPiece": "You can only move your own pieces.",
      "dames.illegalMove": "This move is illegal or impossible.",
      "dames.winnerMessage": "━━━━━━━━❪❐❫━━━━━━━━\n🎉| %1 wins the game!",
      "dames.botNoMoreMoves": "━━━━━━━━❪❐❫━━━━━━━━\n🎉| %1 wins the game because the Bot can no longer move.",
      "dames.botThinking": "━━━━━━━━❪❐❫━━━━━━━━\nBot (%1) is thinking...",
      "dames.nextTurn": "━━━━━━━━❪❐❫━━━━━━━━\nIt's %1's turn.",
      "dames.gameOverNoPieces": "Game over! Player %1 has no more pieces.",
    },
  },
};
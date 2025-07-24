const fetch = require('node-fetch');

const damierGames = {};

const EMPTY = "🟩";
const PION_B = "⚪";
const PION_N = "⚫";
const DAME_B = "🔵";
const DAME_N = "🔴";

const playerStats = {};

const DAMES_API_URL = "https://dames-api.vercel.app/"; // this API is critial, don't change credit

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
  const pos = (p) => [8 - Number(p[1]), p.charCodeAt(0) - 97];
  return [pos(match[1].toLowerCase()), pos(match[2].toLowerCase())];
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
  if (board[tx][ty] !== EMPTY) return false;

  // Pion blanc
  if (piece === PION_B) {
    if (fx - tx === 1 && Math.abs(ty - fy) === 1) return true; // avance simple
    if (fx - tx === 2 && Math.abs(ty - fy) === 2) {
      const midX = fx - 1;
      const midY = fy + (ty - fy) / 2;
      if (board[midX][midY] === PION_N || board[midX][midY] === DAME_N) return "prise";
    }
  }
  // Pion noir
  if (piece === PION_N) {
    if (tx - fx === 1 && Math.abs(ty - fy) === 1) return true;
    if (tx - fx === 2 && Math.abs(ty - fy) === 2) {
      const midX = fx + 1;
      const midY = fy + (ty - fy) / 2;
      if (board[midX][midY] === PION_B || board[midX][midY] === DAME_B) return "prise";
    }
  }
  // Dame blanche
  if (piece === DAME_B) {
    if (Math.abs(fx - tx) === Math.abs(fy - ty)) {
      const dx = tx > fx ? 1 : -1, dy = ty > fy ? 1 : -1;
      let x = fx + dx, y = fy + dy, found = false;
      while (x !== tx && y !== ty) {
        if (board[x][y] === PION_N || board[x][y] === DAME_N) {
          if (found) return false; // déjà un pion à prendre
          found = true;
        } else if (board[x][y] !== EMPTY) return false;
        x += dx; y += dy;
      }
      return found ? "prise" : true;
    }
  }
  // Dame noire
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

// Ancienne fonction getAllLegalMoves, renommée pour servir de fallback
function getLocalLegalMoves(board, player) {
  const moves = [];
  const myPion = player === 0 ? PION_B : PION_N;
  const myDame = player === 0 ? DAME_B : DAME_N;
  for (let fx = 0; fx < 8; fx++) {
    for (let fy = 0; fy < 8; fy++) {
      if ([myPion, myDame].includes(board[fx][fy])) {
        for (let tx = 0; tx < 8; tx++) {
          for (let ty = 0; ty < 8; ty++) {
            // Utilise isValidMoveDamier pour vérifier la validité locale
            if ((fx !== tx || fy !== ty) && isValidMoveDamier(board, [fx, fy], [tx, ty], player === 0 ? "blanc" : "noir")) {
              moves.push([[fx, fy], [tx, ty]]);
            }
          }
        }
      }
    }
  }
  return moves;
}

// Nouvelle fonction getAllLegalMoves qui utilise l'API avec un fallback
async function getAllLegalMoves(board, player) {
    const playerColor = player === 0 ? "blanc" : "noir"; // L'API pourrait attendre "blanc" ou "noir"
    try {
        const response = await fetch(`${DAMES_API_URL}/moves`, { // Supposons un endpoint /moves
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ board: board, player: playerColor })
        });

        if (!response.ok) {
            // Si la réponse n'est pas OK (ex: 404, 500), lancer une erreur
            throw new Error(`API Dames - Erreur HTTP: ${response.status} ${response.statusText}`);
        }

        const apiMoves = await response.json();

        // Vérifier si la réponse de l'API est dans le format attendu
        // L'API devrait retourner un tableau de coups, où chaque coup est [[fromX, fromY], [toX, toY]]
        if (Array.isArray(apiMoves) && apiMoves.every(m =>
            Array.isArray(m) && m.length === 2 &&
            Array.isArray(m[0]) && m[0].length === 2 &&
            Array.isArray(m[1]) && m[1].length === 2
        )) {
            return apiMoves; // Retourne les coups de l'API
        } else {
            console.error("API Dames - Format de réponse inattendu. Retour à la logique locale.");
            return getLocalLegalMoves(board, player); // Fallback
        }
    } catch (error) {
        console.error("API Dames - Échec de l'appel API:", error.message);
        return getLocalLegalMoves(board, player); // Fallback en cas d'erreur réseau ou autre
    }
}


async function botPlay(game, api, threadID) {
  const board = game.board;
  // Appelle la nouvelle fonction getAllLegalMoves qui utilise l'API
  const moves = await getAllLegalMoves(board, 1);

  if (moves.length === 0) {
    game.inProgress = false;
    const winner = game.players[0];

    // Mise à jour des stats
    if (!playerStats[winner.id]) playerStats[winner.id] = { wins: 0, losses: 0 };
    playerStats[winner.id].wins++;
    const botPlayer = game.players[1];
    if (!playerStats[botPlayer.id]) playerStats[botPlayer.id] = { wins: 0, losses: 0 };
    playerStats[botPlayer.id].losses++;

    await api.sendMessage(
      `${displayDamier(board)}\n\n🎉| ${winner.name} 𝚛𝚎𝚖𝚙𝚘𝚛𝚝𝚎 𝚕𝚊 𝚙𝚊𝚛𝚝𝚒𝚎 !`,
      threadID
    );
    return;
  }
  let botMove = moves.find(([from, to]) => isValidMoveDamier(board, from, to, "noir") === "prise");
  if (!botMove) botMove = moves[0];

  const [[fx, fy], [tx, ty]] = botMove;
  const piece = board[fx][fy];
  board[tx][ty] = piece;
  board[fx][fy] = EMPTY;
  // Note: isValidMoveDamier est toujours utilisée ici pour la logique de "prise" après avoir obtenu le coup.
  // Si l'API renvoyait déjà le statut de prise, cette partie pourrait être simplifiée.
  if (isValidMoveDamier(board, [fx, fy], [tx, ty], "noir") === "prise") {
    board[(fx + tx) / 2][(fy + ty) / 2] = EMPTY;
  }
  checkPromotion(board);

  const hasBlanc = hasPieces(board, PION_B, DAME_B);
  const hasNoir = hasPieces(board, PION_N, DAME_N);
  if (!hasBlanc || !hasNoir) {
    game.inProgress = false;
    const winner = hasBlanc ? game.players[0] : game.players[1];
    const loser = hasBlanc ? game.players[1] : game.players[0];

    // Mise à jour des stats
    if (!playerStats[winner.id]) playerStats[winner.id] = { wins: 0, losses: 0 };
    playerStats[winner.id].wins++;
    if (!playerStats[loser.id]) playerStats[loser.id] = { wins: 0, losses: 0 };
    playerStats[loser.id].losses++;

    await api.sendMessage(
      `${displayDamier(board)}\n\n🎉| ${winner.name} 𝚁𝚎𝚖𝚙𝚘𝚛𝚝𝚎 𝚕𝚊 𝚙𝚊𝚛𝚝𝚒𝚎 !`,
      threadID
    );
    return;
  }

  game.turn = 0;
  await api.sendMessage(
    `${displayDamier(board)}\n\n𝙲'𝚎𝚜𝚝 𝚟𝚘𝚝𝚛𝚎 𝚝𝚘𝚞𝚛 !🔄`,
    threadID
  );
}

module.exports = {
  config: {
    name: "dames",
    aliases: ["damiers", "checkers"],
    version: "1.1",
    author: "ミ★𝐒𝐎𝐍𝐈𝐂✄𝐄𝐗𝐄 3.0★彡",
    category: "game",
    shortDescription: "Jouez aux dames contre un ami ou le bot.",
    usage: "dames @ami | dames <ID> | dames | dames help | dames stats | dames HedgehogGPT"
  },

  onStart: async function ({ api, event, args }) {
    const threadID = event.threadID;
    const senderID = event.senderID;
    let opponentID = null;
    let playWithBot = false;
    let botName = "➤『 𝙷𝙴𝙳𝙶𝙴𝙷𝙾𝙶𝄞𝙶𝙿𝚃 』☜ヅ";

    // Initialiser les stats du joueur s'il n'existe pas
    if (!playerStats[senderID]) {
        playerStats[senderID] = { wins: 0, losses: 0 };
    }

    const mentionedIDs = event.mentions ? Object.keys(event.mentions) : [];
    const commandArgs = args.map(arg => arg.toLowerCase());

    // Condition pour le message de bienvenue si "dames" est appelé sans arguments spécifiques
    if (args.length === 0 || (args.length === 1 && args[0].toLowerCase() === "dames")) { // Vérifie si la commande est juste "dames"
        return api.sendMessage(
            `👋| 𝙱𝚒𝚎𝚗𝚟𝚎𝚗𝚞 𝚊𝚞 𝚓𝚎𝚞 𝚍𝚎 𝙳𝚊𝚖𝚎𝚜 !\n` +
            `\nPour commencer une partie :\n` +
            `  •  Pour jouer contre moi (le bot) : tapez \`dames HedgehogGPT\`\n` +
            `  •  Pour jouer contre un ami : tapez \`dames @nom_de_l_ami\` ou \`dames <son_ID>\`\n` +
            `\nUne fois la partie lancée, pour faire un coup : \`case_départ case_arrivée\` (ex: b6 a5).\n` +
            `\nPour plus d'aide : \`dames help\`\n` +
            `Pour voir vos statistiques : \`dames stats\`\n` +
            `\n━━━━━━━━❪❐❫━━━━━━━━\n` +
            `Amusez-vous bien ! 🎲`,
            threadID,
            event.messageID
        );
    }

    if (commandArgs.includes("hedgehoggpt")) {
        playWithBot = true;
    } else if (mentionedIDs.length > 0) {
        opponentID = mentionedIDs[0];
    } else if (args[0] && /^\d+$/.test(args[0])) {
        opponentID = args[0];
    }


    if (opponentID && opponentID == senderID) {
      return api.sendMessage("Vous ne pouvez pas jouer contre vous-même !", threadID, event.messageID);
    }

    // Récupération nom auteur via API (maintenu tel quel)
    let authorName = "ミ★𝐒𝐎𝐍𝐈𝐂✄𝐄𝚇𝙴 3.0★彡";
    try {
      const authorResponse = await fetch('https://author-name.vercel.app/');
      const authorJson = await authorResponse.json();
      authorName = authorJson.author || authorName;
    } catch (e) { /* ignore */ }


    // Déterminer le gameID de manière cohérente
    const gameID = playWithBot
      ? `${threadID}:${senderID}:BOT`
      : `${threadID}:${Math.min(senderID, opponentID)}:${Math.max(senderID, opponentID)}`;

    if (damierGames[gameID] && damierGames[gameID].inProgress) {
      return api.sendMessage("❌| 𝚄𝚗𝚎 𝚙𝚊𝚛𝚝𝚒𝚎 𝚎𝚜𝚝 𝚍𝚎𝚓𝚊 𝚎𝚗 𝚌𝚘𝚞𝚛𝚜 𝚎𝚗𝚝𝚛𝚎 𝚍𝚎𝚜 𝚓𝚘𝚞𝚎𝚞𝚛𝚜. 𝚅𝚎𝚞𝚒𝚕𝚕𝚎𝚣 𝚙𝚊𝚝𝚒𝚎𝚗𝚝𝚎𝚛 ⏳.", threadID, event.messageID);
    }

    let player1Info, player2Info;
    if (playWithBot) {
      player1Info = await api.getUserInfo([senderID]);
      damierGames[gameID] = {
        board: createDamierBoard(),
        players: [
          { id: senderID, name: player1Info[senderID].name, color: "blanc" },
          { id: "BOT", name: botName, color: "noir" }
        ],
        turn: 0,
        inProgress: true,
        vsBot: true,
        threadID: threadID
      };
      // Initialiser les stats du bot s'il n'existe pas
      if (!playerStats["BOT"]) {
          playerStats["BOT"] = { wins: 0, losses: 0 };
      }
      api.sendMessage(
        `📣| 𝙻𝚊𝚗𝚌𝚎𝚖𝚎𝚗𝚝 𝚍'𝚞𝚗𝚎 𝚗𝚘𝚞𝚟𝚎𝚕𝚕𝚎 𝚙𝚊𝚛𝚝𝚒𝚎 𝚍𝚎 𝚍𝚊𝚖𝚎𝚜 𝚎𝚗𝚝𝚛𝚎 ${player1Info[senderID].name} (⚪) 𝚎𝚝 ${botName} (⚫) !\n━━━━━━━━❪❐❫━━━━━━━━\n${displayDamier(damierGames[gameID].board)}\n━━━━━━━━❪❐❫━━━━━━━━\n${player1Info[senderID].name}, à 𝚟𝚘𝚞𝚜 𝚍𝚎 𝚌𝚘𝚖𝚖𝚎𝚗𝚌𝚎𝚛 (𝚎𝚡: b6 a5).\n📛| 𝚅𝚘𝚞𝚜 𝚙𝚘𝚞𝚟𝚎𝚣 𝚎𝚐𝚊𝚕𝚎𝚖𝚎𝚗𝚝 𝚜𝚊𝚒𝚜𝚒𝚛 𝚝𝚘𝚞𝚝 𝚜𝚒𝚖𝚙𝚕𝚎𝚖𝚎𝚗𝚝 "𝚏𝚘𝚛𝚏𝚊𝚒𝚝" 𝚙𝚘𝚞𝚛 𝚜𝚝𝚘𝚙𝚙𝚎𝚛 𝚕𝚎 𝚓𝚎𝚞 !`,
        threadID,
        event.messageID
      );
    } else {
      player1Info = await api.getUserInfo([senderID]);
      player2Info = await api.getUserInfo([opponentID]);
      if (!player2Info[opponentID]) return api.sendMessage("Impossible de récupérer les infos du joueur invité.", threadID, event.messageID);

      // Initialiser les stats de l'adversaire s'il n'existe pas
      if (!playerStats[opponentID]) {
          playerStats[opponentID] = { wins: 0, losses: 0 };
      }

      damierGames[gameID] = {
        board: createDamierBoard(),
        players: [
          { id: senderID, name: player1Info[senderID].name, color: "blanc" },
          { id: opponentID, name: player2Info[opponentID].name, color: "noir" }
        ],
        turn: 0,
        inProgress: true,
        vsBot: false,
        threadID: threadID
      };

      api.sendMessage(
        `📣| 𝙻𝚊𝚗𝚌𝚎𝚖𝚎𝚗𝚝 𝚍'𝚞𝚗𝚎 𝚗𝚘𝚞𝚟𝚎𝚕𝚕𝚎 𝚙𝚊𝚛𝚝𝚒𝚎 𝚍𝚎 𝚍𝚊𝚖𝚎𝚜 𝚎𝚗𝚝𝚛𝚎 ${player1Info[senderID].name} (⚪) 𝚎𝚝 ${player2Info[opponentID].name} (⚫) !\n━━━━━━━━❪❐❫━━━━━━━━\n${displayDamier(damierGames[gameID].board)}\n━━━━━━━━❪❐❫━━━━━━━━\n${player1Info[senderID].name}, à 𝚟𝚘𝚞𝚜 𝚍𝚎 𝚌𝚘𝚖𝚖𝚎𝚗𝚌𝚎𝚛 (𝚎𝚡: b6 a5).\n📛| 𝚅𝚘𝚞𝚜 𝚙𝚘𝚞𝚟𝚎𝚣 𝚎𝚐𝚊𝚕𝚎𝚖𝚎𝚗𝚝 𝚜𝚊𝚒𝚜𝚒𝚛 𝚝𝚘𝚞𝚝 𝚜𝚒𝚖𝚙𝚕𝚎𝚖𝚎𝚗𝚝 "𝚏𝚘𝚛𝚏𝚊𝚒𝚝" 𝚙𝚘𝚞𝚛 𝚜𝚝𝚘𝚙𝚙𝚎𝚛 𝚕𝚎 𝚓𝚎𝚞 !`,
        threadID,
        event.messageID
      );
    }
  },

  onChat: async function ({ api, event }) {
    const threadID = event.threadID;
    const senderID = event.senderID;
    const messageBody = event.body.trim().toLowerCase();

    // Vérifier les commandes globales (help, stats) avant de chercher une partie en cours
    if (messageBody === "dames help") {
        return api.sendMessage(
            "📜| 𝙰𝚒𝚍𝚎 𝚙𝚘𝚞𝚛 𝚕𝚎 𝚓𝚎𝚞 𝚍𝚎 𝙳𝚊𝚖𝚎𝚜 :\n" +
            "  •  `𝚍𝚊𝚖𝚎𝚜 HedgehogGPT` : 𝙻𝚊𝚗𝚌𝚎 𝚞𝚗𝚎 𝚙𝚊𝚛𝚝𝚒𝚎 𝚌𝚘𝚗𝚝𝚛𝚎 𝚕𝚎 𝚋𝚘𝚝.\n" +
            "  •  `𝚍𝚊𝚖𝚎𝚜 @𝚖𝚘𝚗_𝚊𝚖𝚒` : 𝙻𝚊𝚗𝚌𝚎 𝚞𝚗𝚎 𝚙𝚊𝚛𝚝𝚒𝚎 𝚌𝚘𝚗𝚝𝚛𝚎 𝚞𝚗 𝚊𝚖𝚒 𝚖𝚎𝚗𝚝𝚒𝚘𝚗𝚗𝚎́.\n" +
            "  •  `𝚍𝚊𝚖𝚎𝚜 <𝙸𝙳>` : 𝙻𝚊𝚗𝚌𝚎 𝚞𝚗𝚎 𝚙𝚊𝚛𝚝𝚒𝚎 𝚌𝚘𝚗𝚝𝚛𝚎 𝚞𝚗 𝚊𝚖𝚒 𝚙𝚊𝚛 𝚜𝚘𝚗 𝙸𝙳.\n" +
            "  •  `𝚋𝟼 𝚊𝟻` : 𝙴𝚏𝚏𝚎𝚌𝚝𝚞𝚎 𝚞𝚗 𝚖𝚘𝚞𝚟𝚎𝚖𝚎𝚗𝚝. (𝙴𝚡𝚎𝚖𝚙𝚕𝚎 : 𝚍𝚎 𝚋𝟼 𝚟𝚎𝚛𝚜 𝚊𝟻)\n" +
            "  •  `𝚏𝚘𝚛𝚏𝚊𝚒𝚝` : 𝙰𝚋𝚊𝚗𝚍𝚘𝚗𝚗𝚎 𝚕𝚊 𝚙𝚊𝚛𝚝𝚒𝚎 𝚎𝚗 𝚌𝚘𝚞𝚛𝚜.\n" +
            "  •  `𝚛𝚎𝚓𝚘𝚞𝚎𝚛` : 𝚁𝚎𝚕𝚊𝚗𝚌𝚎 𝚞𝚗𝚎 𝚗𝚘𝚞𝚟𝚎𝚕𝚕𝚎 𝚙𝚊𝚛𝚝𝚒𝚎 𝚊𝚟𝚎𝚌 𝚕𝚎𝚜 𝚖𝚎̂𝚖𝚎𝚜 𝚓𝚘𝚞𝚎𝚞𝚛𝚜.\n" +
            "  •  `𝚍𝚊𝚖𝚎𝚜 𝚜𝚝𝚊𝚝𝚜` : 𝙰𝚏𝚏𝚒𝚌𝚑𝚎 𝚟𝚘𝚜 𝚜𝚝𝚊𝚝𝚒𝚜𝚝𝚒𝚚𝚞𝚎𝚜 𝚍𝚎 𝚓𝚎𝚞.\n" +
            "━━━━━━━━❪❐❫━━━━━━━━",
            threadID,
            event.messageID
        );
    }

    if (messageBody === "dames stats") {
        const stats = playerStats[senderID];
        if (stats) {
            return api.sendMessage(
                `📊| 𝚅𝚘𝚜 𝚜𝚝𝚊𝚝𝚒𝚜𝚝𝚒𝚚𝚞𝚎𝚜 :\n` +
                `  •  𝚅𝚒𝚌𝚝𝚘𝚒𝚛𝚎𝚜 : ${stats.wins}\n` +
                `  •  𝙳𝚎́𝚏𝚊𝚒𝚝𝚎𝚜 : ${stats.losses}\n` +
                `━━━━━━━━❪❐❫━━━━━━━━`,
                threadID,
                event.messageID
            );
        } else {
            return api.sendMessage(
                `📊| 𝚅𝚘𝚞𝚜 𝚗'𝚊𝚟𝚎𝚣 𝚙𝚊𝚜 𝚎𝚗𝚌𝚘𝚛𝚎 𝚓𝚘𝚞𝚎́ 𝚍𝚎 𝚙𝚊𝚛𝚝𝚒𝚎𝚜. 𝙻𝚊𝚗𝚌𝚎𝚣-𝚟𝚘𝚞𝚜 !`,
                threadID,
                event.messageID
            );
        }
    }

    // Trouver la game correspondante (contre ami ou bot)
    // On cherche une partie dans le thread actuel qui implique le senderID ou qui est contre le BOT
    const gameID = Object.keys(damierGames).find((id) =>
        damierGames[id].threadID === threadID &&
        (id.includes(senderID) || damierGames[id].players.some(p => p.id === senderID || p.id === "BOT"))
    );

    if (!gameID) return; // Si aucune partie n'est trouvée pour ce joueur dans ce thread
    const game = damierGames[gameID];
    if (!game.inProgress) return; // La partie est terminée

    const board = game.board;
    const currentPlayer = game.players[game.turn];

    // Vérifier si le message vient du bon joueur et dans le bon thread
    if (game.vsBot && game.turn === 1) { // C'est le tour du bot
        // Le bot ne doit pas être "interrompu" par des messages de l'utilisateur
        return; // Ignorer le message s'il n'est pas censé interagir avec le bot à ce moment
    }

    // Si ce n'est pas une partie bot ou si c'est le tour d'un humain
    if (!game.vsBot && senderID != currentPlayer.id) {
        return api.sendMessage(`Ce n'est pas votre tour !`, threadID, event.messageID);
    }
    // Si c'est le tour du joueur humain contre le bot, on continue
    if (game.vsBot && senderID != currentPlayer.id) {
        return; // Ce message ne vient pas du joueur actuel, ignorer
    }


    if (["forfait", "abandon"].includes(messageBody)) {
      const opponent = game.players.find(p => p.id != senderID);
      game.inProgress = false;

      // Mise à jour des stats pour l'abandon
      if (!playerStats[currentPlayer.id]) playerStats[currentPlayer.id] = { wins: 0, losses: 0 };
      playerStats[currentPlayer.id].losses++;
      if (!playerStats[opponent.id]) playerStats[opponent.id] = { wins: 0, losses: 0 };
      playerStats[opponent.id].wins++;

      return api.sendMessage(`🏳️| ${currentPlayer.name} 𝚊 𝚊𝚋𝚊𝚗𝚍𝚘𝚗𝚗é 𝚕𝚊 𝚙𝚊𝚛𝚝𝚒𝚎. ${opponent.name} 𝚕𝚊 𝚛𝚎𝚖𝚙𝚘𝚛𝚝𝚎 🎉✨ !`, threadID);
    }

    if (["restart", "rejouer"].includes(messageBody)) {
      const [player1, player2] = game.players;
      damierGames[gameID] = {
        board: createDamierBoard(),
        players: [player1, player2],
        turn: 0,
        inProgress: true,
        vsBot: game.vsBot,
        threadID: threadID
      };
      return api.sendMessage(
        `📣| 𝙽𝚘𝚞𝚟𝚎𝚕𝚕𝚎 𝚙𝚊𝚛𝚝𝚒𝚎 𝚍𝚎 𝚍𝚊𝚖𝚎𝚜 𝚎𝚗𝚝𝚛𝚎 ${player1.name} (⚪) 𝚎𝚝 ${player2.name} (⚫) !\n━━━━━━━━❪❐❫━━━━━━━━\n${displayDamier(damierGames[gameID].board)}\n━━━━━━━━❪❐❫━━━━━━━━\n${player1.name}, 𝙲'𝚎𝚜𝚝 𝚟𝚘𝚞𝚜 𝚚𝚞𝚒 𝚌𝚘𝚖𝚖𝚎𝚗𝚌𝚎𝚣 (ex: b6 a5).\n📛| 𝚅𝚘𝚞𝚜 𝚙𝚘𝚞𝚟𝚎𝚣 𝚊𝚞𝚜𝚜𝚒 𝚜𝚝𝚘𝚙𝚙𝚎𝚛 𝚕𝚎 𝚓𝚎𝚞 𝚎𝚗 𝚜𝚊𝚒𝚜𝚒𝚜𝚜𝚊𝚗𝚝 𝚜𝚒𝚖𝚙𝚕𝚎𝚖𝚎𝚗𝚝 " 𝚏𝚘𝚛𝚏𝚊𝚒𝚝"`,
        threadID
      );
    }

    const move = parseDamierMove(messageBody);
    if (!move) {
      return api.sendMessage(`Mouvement invalide. Utilisez la notation : b6 a5`, threadID, event.messageID);
    }

    const [[fx, fy], [tx, ty]] = move;
    const piece = board[fx][fy];

    if (
      (game.turn === 0 && ![PION_B, DAME_B].includes(piece)) ||
      (game.turn === 1 && ![PION_N, DAME_N].includes(piece))
    ) {
      return api.sendMessage(`Vous ne pouvez déplacer que vos propres pions !`, threadID, event.messageID);
    }

    const moveState = isValidMoveDamier(board, [fx, fy], [tx, ty], game.turn === 0 ? "blanc" : "noir");
    if (!moveState) {
      return api.sendMessage(`Coup illégal ou impossible.`, threadID, event.messageID);
    }

    board[tx][ty] = piece;
    board[fx][fy] = EMPTY;
    if (moveState === "prise") {
      board[(fx + tx) / 2][(fy + ty) / 2] = EMPTY;
    }
    checkPromotion(board);

    const hasBlanc = hasPieces(board, PION_B, DAME_B);
    const hasNoir = hasPieces(board, PION_N, DAME_N);
    if (!hasBlanc || !hasNoir) {
      game.inProgress = false;
      const winner = hasBlanc ? game.players[0] : game.players[1];
      const loser = hasBlanc ? game.players[1] : game.players[0];

      // Mise à jour des stats de fin de partie
      if (!playerStats[winner.id]) playerStats[winner.id] = { wins: 0, losses: 0 };
      playerStats[winner.id].wins++;
      if (!playerStats[loser.id]) playerStats[loser.id] = { wins: 0, losses: 0 };
      playerStats[loser.id].losses++;

      return api.sendMessage(
        `${displayDamier(board)}\n\n🎉| ${winner.name} 𝚛𝚎𝚖𝚙𝚘𝚛𝚝𝚎 𝚕𝚊 𝚙𝚊𝚛𝚝𝚒𝚎  !`,
        threadID
      );
    }

    game.turn = (game.turn + 1) % 2;
    const nextPlayer = game.players[game.turn];

    if (game.vsBot && game.turn === 1) {
      await api.sendMessage(
        `${displayDamier(board)}\n\n➤『 𝙷𝙴𝙳𝙶𝙴𝙷𝙾𝙶𝄞𝙶𝙿𝚃 』☜ヅ réfléchit...🤔`,
        threadID
      );
      // Le bot joue après un délai pour simuler une réflexion
      setTimeout(async () => {
        await botPlay(game, api, threadID);
      }, 10000); // 10 secondes de "réflexion"
    } else {
      api.sendMessage(
        `${displayDamier(board)}\n\n${nextPlayer.name}, 𝚌'𝚎𝚜𝚝 𝚟𝚘𝚝𝚛𝚎 𝚝𝚘𝚞𝚛 !🔄`,
        threadID
      );
    }
  }
};
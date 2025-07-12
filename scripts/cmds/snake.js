const snakeGames = {};
const SIZE = 8;

const EMPTY = "⬛";
const FRUIT = "🍎";
const SNAKES = ["🟩", "🟦"];

function createBoard() {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(EMPTY));
}

function randomEmptyCell(board, snakes) {
  let empties = [];
  for (let i = 0; i < SIZE; i++) for (let j = 0; j < SIZE; j++) {
    let occupied = false;
    for (const snake of snakes) {
      for (const part of snake) if (part[0] === i && part[1] === j) occupied = true;
    }
    if (board[i][j] === EMPTY && !occupied) empties.push([i, j]);
  }
  if (empties.length === 0) return null;
  return empties[Math.floor(Math.random() * empties.length)];
}

function display(board, snakes, fruits) {
  // Reset
  for (let i = 0; i < SIZE; i++) for (let j = 0; j < SIZE; j++) board[i][j] = EMPTY;
  for (let i = 0; i < fruits.length; i++) {
    const [x, y] = fruits[i];
    board[x][y] = FRUIT;
  }
  for (let s = 0; s < snakes.length; s++) {
    for (const [x, y] of snakes[s]) board[x][y] = SNAKES[s];
  }
  let txt = "   A B C D E F G H\n";
  for (let i = 0; i < SIZE; i++) {
    txt += (i + 1) + " ";
    for (let j = 0; j < SIZE; j++) txt += board[i][j] + " ";
    txt += (i + 1) + "\n";
  }
  txt += "   A B C D E F G H";
  return txt;
}

function nextHead([x, y], dir) {
  if (dir === "haut") return [x - 1, y];
  if (dir === "bas") return [x + 1, y];
  if (dir === "gauche") return [x, y - 1];
  if (dir === "droite") return [x, y + 1];
  return [x, y];
}

function isCollision([x, y], snakes) {
  if (x < 0 || x >= SIZE || y < 0 || y >= SIZE) return true;
  for (const snake of snakes) for (const part of snake) if (part[0] === x && part[1] === y) return true;
  return false;
}

module.exports = {
  config: {
    name: "snake",
    aliases: ["serpent", "snakegame"],
    version: "1.0",
    author: "Copilot Chat & Sonic-Shisui",
    category: "game",
    shortDescription: "Jeu du serpent multijoueur (2 joueurs).",
    usage: "snake @ami ou snake <ID>",
  },

  onStart: async function ({ api, event, args }) {
    const threadID = event.threadID;
    const senderID = event.senderID;
    let opponentID;

    const mentionedIDs = Object.keys(event.mentions);
    if (mentionedIDs.length > 0) opponentID = mentionedIDs[0];
    else if (args[0] && /^\d+$/.test(args[0])) opponentID = args[0];

    if (!opponentID)
      return api.sendMessage("Mentionnez un ami ou donnez son ID pour commencer une partie de serpent !", threadID, event.messageID);
    if (opponentID == senderID)
      return api.sendMessage("Vous ne pouvez pas jouer contre vous-même !", threadID, event.messageID);

    const gameID = `${threadID}:${Math.min(senderID, opponentID)}:${Math.max(senderID, opponentID)}`;
    if (snakeGames[gameID] && snakeGames[gameID].inProgress)
      return api.sendMessage("Une partie est déjà en cours entre ces joueurs.", threadID, event.messageID);

    const player1Info = await api.getUserInfo(senderID);
    const player2Info = await api.getUserInfo(opponentID);

    if (!player2Info[opponentID])
      return api.sendMessage("Impossible de trouver l'utilisateur avec cet ID.", threadID, event.messageID);

    // Init snakes
    const snake1 = [[0, 0]];
    const snake2 = [[SIZE - 1, SIZE - 1]];
    const snakes = [snake1, snake2];
    // Fruits
    const fruits = [];
    fruits.push(randomEmptyCell(createBoard(), snakes));

    snakeGames[gameID] = {
      board: createBoard(),
      snakes,
      fruits,
      directions: ["droite", "gauche"],
      scores: [0, 0],
      players: [
        { id: senderID, name: player1Info[senderID].name },
        { id: opponentID, name: player2Info[opponentID].name }
      ],
      turn: 0,
      inProgress: true
    };

    api.sendMessage(
      `🐍| Partie de Snake entre ${player1Info[senderID].name} (🟩) et ${player2Info[opponentID].name} (🟦) !\n` +
      display(snakeGames[gameID].board, snakes, fruits) +
      `\n\n${player1Info[senderID].name}, à toi de jouer ! (envoie : haut, bas, gauche ou droite)`,
      threadID,
      event.messageID
    );
  },

  onChat: async function ({ api, event }) {
    const threadID = event.threadID;
    const senderID = event.senderID;
    const messageBody = event.body.trim().toLowerCase();

    const dirs = ["haut", "bas", "gauche", "droite"];
    const gameID = Object.keys(snakeGames).find((id) => id.startsWith(`${threadID}:`) && id.includes(senderID));
    if (!gameID) return;
    const game = snakeGames[gameID];
    if (!game.inProgress) return;

    const turn = game.turn;
    const currentPlayer = game.players[turn];

    if (senderID != currentPlayer.id)
      return api.sendMessage(`Ce n'est pas votre tour !`, threadID, event.messageID);

    // Restart
    if (["restart", "rejouer"].includes(messageBody)) {
      const [player1, player2] = game.players;
      const snake1 = [[0, 0]];
      const snake2 = [[SIZE - 1, SIZE - 1]];
      const snakes = [snake1, snake2];
      const fruits = [randomEmptyCell(createBoard(), snakes)];
      snakeGames[gameID] = {
        board: createBoard(),
        snakes,
        fruits,
        directions: ["droite", "gauche"],
        scores: [0, 0],
        players: [player1, player2],
        turn: 0,
        inProgress: true
      };
      return api.sendMessage(
        `🐍| Nouvelle partie de Snake entre ${player1.name} (🟩) et ${player2.name} (🟦) !\n` +
        display(snakeGames[gameID].board, snakes, fruits) +
        `\n\n${player1.name}, à toi de jouer ! (envoie : haut, bas, gauche ou droite)`,
        threadID
      );
    }

    // Abandon
    if (["forfait", "abandon"].includes(messageBody)) {
      const opponent = game.players[(turn + 1) % 2];
      game.inProgress = false;
      return api.sendMessage(`🏳️| ${currentPlayer.name} a abandonné la partie. ${opponent.name} gagne !`, threadID);
    }

    // Un coup ?
    if (!dirs.includes(messageBody))
      return api.sendMessage(`Merci d'envoyer une direction valide : haut, bas, gauche ou droite.`, threadID, event.messageID);

    // Calcule le prochain mouvement du joueur courant
    const snakes = game.snakes.map(s => s.slice());
    const mySnake = snakes[turn];
    const otherSnake = snakes[(turn + 1) % 2];
    const fruits = game.fruits.slice();
    const dir = messageBody;
    const [nx, ny] = nextHead(mySnake[0], dir);

    // Test collision
    if (isCollision([nx, ny], snakes)) {
      game.inProgress = false;
      return api.sendMessage(`${currentPlayer.name} s'est écrasé ! ${game.players[(turn + 1) % 2].name} gagne !\n` +
        display(game.board, game.snakes, game.fruits), threadID);
    }

    // Avance la tête du serpent
    mySnake.unshift([nx, ny]);
    let ate = false;
    for (let i = 0; i < fruits.length; i++) {
      if (fruits[i][0] === nx && fruits[i][1] === ny) {
        ate = true;
        fruits.splice(i, 1);
        game.scores[turn]++;
        break;
      }
    }
    if (!ate) mySnake.pop(); // il n'a pas mangé, on retire la queue

    // Nouveau fruit ?
    if (ate || fruits.length < 1) {
      const pos = randomEmptyCell(createBoard(), snakes);
      if (pos) fruits.push(pos);
    }

    // Enregistre le move
    game.snakes = snakes;
    game.fruits = fruits;

    // Vérifie si les deux serpents sont bloqués
    let blocked = 0;
    for (let p = 0; p < 2; p++) {
      const h = game.snakes[p][0];
      let canMove = false;
      for (const d of dirs) {
        const [tx, ty] = nextHead(h, d);
        if (!isCollision([tx, ty], game.snakes)) canMove = true;
      }
      if (!canMove) blocked++;
    }
    if (blocked === 2) {
      game.inProgress = false;
      let msg = "Les deux serpents sont bloqués !\n";
      if (game.scores[0] > game.scores[1]) msg += `${game.players[0].name} remporte la partie !`;
      else if (game.scores[1] > game.scores[0]) msg += `${game.players[1].name} remporte la partie !`;
      else msg += "Match nul !";
      return api.sendMessage(msg + "\n" + display(game.board, game.snakes, game.fruits), threadID);
    }

    // Tour suivant
    game.turn = (turn + 1) % 2;
    const nextPlayer = game.players[game.turn];
    api.sendMessage(
      display(game.board, game.snakes, game.fruits) +
      `\nScores : ${game.players[0].name} ${game.scores[0]} - ${game.players[1].name} ${game.scores[1]}\n\n${nextPlayer.name}, à toi (haut, bas, gauche ou droite)`,
      threadID
    );
  }
};
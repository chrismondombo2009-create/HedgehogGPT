let games = {};

function checkWinner(board) {
    const winPatterns = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6]
    ];
    for (const pattern of winPatterns) {
        const [a, b, c] = pattern;
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return board[a];
        }
    }
    return null;
}

function isBoardFull(board) {
    return board.every((cell) => cell !== null);
}

function displayBoard(board) {
    let display = "";
    for (let i = 0; i < 9; i++) {
        display += board[i] ? board[i] : "🟨";
        display += (i + 1) % 3 === 0 ? "\n" : " ";
    }
    return display;
}

function resetGame(gameID, player1, player2) {
    games[gameID] = {
        board: Array(9).fill(null),
        players: [
            { id: player1.id, name: player1.name, symbol: "💙" },
            { id: player2.id, name: player2.name, symbol: "🤍" }
        ],
        currentPlayerIndex: 0,
        inProgress: true,
        restartPrompted: false
    };
}

async function handleGameEnd(gameID, api, event) {
    const game = games[gameID];
    const winner = checkWinner(game.board);
    const boardMessage = displayBoard(game.board);

    if (winner) {
        const winnerPlayer = game.players.find(player => player.symbol === winner);
        await api.sendMessage(`${boardMessage}\n🎉| ${winnerPlayer.name} a gagné ! Tapez "restart" pour recommencer.`, event.threadID);
        game.inProgress = false;
    } else if (isBoardFull(game.board)) {
        await api.sendMessage(`${boardMessage}\n🤝| Match nul ! Tapez 'restart' pour recommencer.`, event.threadID);
        game.inProgress = false;
    }
    game.restartPrompted = true;
}

module.exports = {
    config: {
        name: "tictactoe",
        aliases: ["ttt"],
        version: "1.2",
        author: "ミ★𝐒𝐎𝐍𝐈𝐂✄𝐄𝐗𝐄 3.0★彡",
        category: "game",
        shortDescription: "Un jeu de morpion à deux joueurs.",
        usage: "Mentionnez un ami ou donnez son ID pour commencer un jeu : ~tictactoe <ID>",
    },

    onStart: async function ({ api, event, args }) {
        const threadID = event.threadID;
        const senderID = event.senderID;
        let opponentID;

        // 1. Par mention
        const mentionedIDs = Object.keys(event.mentions);
        if (mentionedIDs.length > 0) {
            opponentID = mentionedIDs[0];
        }
        // 2. Sinon, par ID passé en argument
        else if (args[0]) {
            // Vérifie que l'ID est numérique
            if (!/^\d+$/.test(args[0])) {
                return api.sendMessage("ID invalide. Merci de fournir un ID numérique.", threadID, event.messageID);
            }
            opponentID = args[0];
        }

        if (!opponentID) {
            return api.sendMessage("Mentionnez un ami ou donnez son ID pour commencer un jeu de Tic-Tac-Toe !", threadID, event.messageID);
        }
        if (opponentID == senderID) {
            return api.sendMessage("Vous ne pouvez pas jouer contre vous-même !", threadID, event.messageID);
        }

        const gameID = `${threadID}:${Math.min(senderID, opponentID)}:${Math.max(senderID, opponentID)}`;

        if (games[gameID] && games[gameID].inProgress) {
            return api.sendMessage("Un jeu est déjà en cours entre ces joueurs.", threadID, event.messageID);
        }

        // Récup info joueurs
        const player1Info = await api.getUserInfo(senderID);
        const player2Info = await api.getUserInfo(opponentID);

        // Si l'ID n'existe pas ou n'est pas valide
        if (!player2Info[opponentID]) {
            return api.sendMessage("Impossible de trouver l'utilisateur avec cet ID.", threadID, event.messageID);
        }

        const player1 = { id: senderID, name: player1Info[senderID].name };
        const player2 = { id: opponentID, name: player2Info[opponentID].name };

        resetGame(gameID, player1, player2);

        api.sendMessage(
            `🎮| Partie de Tic-Tac-Toe entre ${player1.name} 『💙』 et ${player2.name} 『🤍』 commence !\n${displayBoard(games[gameID].board)}\n\n${player1.name}, faites votre premier mouvement en envoyant un numéro (1-9).`,
            threadID,
            event.messageID
        );
    },

    onChat: async function ({ api, event }) {
        const threadID = event.threadID;
        const senderID = event.senderID;
        const messageBody = event.body.trim().toLowerCase();

        // Identifier le jeu entre deux joueurs
        const gameID = Object.keys(games).find((id) => id.startsWith(`${threadID}:`) && id.includes(senderID));
        if (!gameID) return;

        const game = games[gameID];
        if (!game.inProgress) {
            if (!game.restartPrompted) {
                game.restartPrompted = true;
                return api.sendMessage("🚀| La partie est terminée ! Tapez 'restart' pour recommencer le jeu.", threadID, event.messageID);
            }
            return;
        }

        if (messageBody === "restart") {
            const player1 = game.players[0];
            const player2 = game.players[1];
            resetGame(gameID, player1, player2);
            return api.sendMessage(
                `🎮| Nouveau jeu de Tic-Tac-Toe entre ${player1.name} 『💙』 et ${player2.name} 『🤍』 !\n${displayBoard(game.board)}\n\n${player1.name}, vous commencez en premier, choisissez une case.`,
                threadID,
                event.messageID
            );
        }

        if (messageBody === "forfait") {
            const forfeitingPlayer = game.players.find(player => player.id === senderID);
            const opponentPlayer = game.players.find(player => player.id !== senderID);

            game.inProgress = false;
            return api.sendMessage(
                `🏳️| ${forfeitingPlayer.name} a abandonné la partie. ${opponentPlayer.name} est déclaré vainqueur ! Tapez "restart" pour recommencer.`,
                threadID,
                event.messageID
            );
        }

        const position = parseInt(messageBody) - 1;
        const currentPlayer = game.players[game.currentPlayerIndex];

        if (isNaN(position) || position < 0 || position > 8 || game.board[position] !== null) {
            return api.sendMessage(`${currentPlayer.name}, c'est toujours à votre tour !`, threadID, event.messageID);
        }

        if (senderID !== currentPlayer.id) {
            return; // Ignorer les mouvements hors tour sans notification.
        }

        game.board[position] = currentPlayer.symbol;

        if (checkWinner(game.board) || isBoardFull(game.board)) {
            await handleGameEnd(gameID, api, event);
            return;
        }

        game.currentPlayerIndex = (game.currentPlayerIndex + 1) % 2;
        const nextPlayer = game.players[game.currentPlayerIndex];
        api.sendMessage(
            `${displayBoard(game.board)}\n\n${nextPlayer.name}, c'est à votre tour !`,
            threadID,
            event.messageID
        );
    }
};
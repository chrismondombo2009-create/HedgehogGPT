let games = {};
let tournaments = {};

const playerStats = {};

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
        restartPrompted: false,
        threadID: player1.threadID,
        isTournamentGame: false,
        tournamentID: null,
        matchIndex: null
    };
}

async function handleGameEnd(gameID, api, event) {
    const game = games[gameID];
    const winner = checkWinner(game.board);
    const boardMessage = displayBoard(game.board);

    if (winner) {
        const winnerPlayer = game.players.find(player => player.symbol === winner);
        const loserPlayer = game.players.find(player => player.symbol !== winner);

        if (!playerStats[winnerPlayer.id]) playerStats[winnerPlayer.id] = { wins: 0, losses: 0 };
        playerStats[winnerPlayer.id].wins++;
        if (!playerStats[loserPlayer.id]) playerStats[loserPlayer.id] = { wins: 0, losses: 0 };
        playerStats[loserPlayer.id].losses++;

        await api.sendMessage(`${boardMessage}\n🎉| ${winnerPlayer.name} 𝚊 𝚐𝚊𝚐𝚗𝚎́ !`, event.threadID);
        game.inProgress = false;

        if (game.isTournamentGame && tournaments[game.tournamentID]) {
            const tournament = tournaments[game.tournamentID];
            const currentRound = tournament.rounds[tournament.currentRoundIndex];
            const match = currentRound.matches[game.matchIndex];

            match.winner = winnerPlayer.id;
            match.completed = true;

            const allMatchesCompleted = currentRound.matches.every(m => m.completed);

            if (allMatchesCompleted) {
                await api.sendMessage(`🔔| 𝚃𝚘𝚞𝚜 𝚕𝚎𝚜 𝚖𝚊𝚝𝚌𝚑𝚜 𝚍𝚞 𝚝𝚘𝚞𝚛 "${currentRound.name}" 𝚜𝚘𝚗𝚝 𝚝𝚎𝚛𝚖𝚒𝚗𝚎́𝚜 !`, event.threadID);
                await advanceTournamentRound(tournament.id, api, event);
            }
        } else {
            await api.sendMessage(`𝚃𝚊𝚙𝚎𝚣 "𝚛𝚎𝚜𝚝𝚊𝚛𝚝" 𝚙𝚘𝚞𝚛 𝚛𝚎𝚌𝚘𝚖𝚖𝚎𝚗𝚌𝚎𝚛.`, event.threadID);
        }

    } else if (isBoardFull(game.board)) {
        game.players.forEach(player => {
            if (!playerStats[player.id]) playerStats[player.id] = { wins: 0, losses: 0 };
        });
        await api.sendMessage(`${boardMessage}\n🤝| 𝙼𝚊𝚝𝚌𝚑 𝚗𝚞𝚕 !`, event.threadID);
        game.inProgress = false;

        if (game.isTournamentGame && tournaments[game.tournamentID]) {
            const tournament = tournaments[game.tournamentID];
            const currentRound = tournament.rounds[tournament.currentRoundIndex];
            const match = currentRound.matches[game.matchIndex];

            match.completed = true;
            match.winner = null;

            await api.sendMessage(`🚨| 𝙼𝚊𝚝𝚌𝚑 𝚗𝚞𝚕 𝚍𝚊𝚗𝚜 𝚕𝚎 𝚝𝚘𝚞𝚛𝚗𝚘𝚒 ! 𝙻𝚎 𝚖𝚊𝚝𝚌𝚑 𝚍𝚘𝚒𝚝 𝚎̂𝚝𝚛𝚎 𝚛𝚎𝚓𝚘𝚞𝚎́ 𝚎𝚗𝚝𝚛𝚎 ${game.players[0].name} 𝚎𝚝 ${game.players[1].name}.`, event.threadID);
            tournament.status = 'paused';

        } else {
            await api.sendMessage(`𝚃𝚊𝚙𝚎𝚣 '𝚛𝚎𝚜𝚝𝚊𝚛𝚝' 𝚙𝚘𝚞𝚛 𝚛𝚎𝚌𝚘𝚖𝚖𝚎𝚗𝚌𝚎𝚛.`, event.threadID);
        }
    }
    game.restartPrompted = true;
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

async function generateTournamentBracketText(tournament) {
    let bracket = `╔═ 🏆 𝚃𝙾𝚄𝚁𝙽𝙾𝙸 𝙳𝙴 𝚃𝙸𝙲-𝚃𝙰𝙲-𝚃𝙾𝙴 🏆 ═╗\n`;
    bracket += `║ 𝚂𝚝𝚊𝚝𝚞𝚝: ${
        tournament.status === 'registration' ? '𝙸𝚗𝚜𝚌𝚛𝚒𝚙𝚝𝚒𝚘𝚗𝚜' :
        tournament.status === 'in_progress' ? '𝙴𝚗 𝚌𝚘𝚞𝚛𝚜' :
        tournament.status === 'completed' ? '𝚃𝚎𝚛𝚖𝚒𝚗𝚎́' :
        '𝙿𝚊𝚞𝚜𝚎́'
    }\n`;
    bracket += `║ 𝙹𝚘𝚞𝚎𝚞𝚛𝚜: ${tournament.players.length}/4\n`;
    bracket += `╠══════════════════╣\n`;
    bracket += `║ 𝙿𝙰𝚁𝚃𝙸𝙲𝙸𝙿𝙰𝙽𝚃𝚂:\n`;
    bracket += `╠══════════════════╣\n`;

    if (tournament.players.length === 0) {
        bracket += `║ 𝙰𝚞𝚌𝚞𝚗 𝚓𝚘𝚞𝚎𝚞𝚛 𝚒𝚗𝚜𝚌𝚛𝚒𝚝.\n`;
    } else {
        tournament.players.forEach((player, index) => {
            bracket += `║ ${index + 1}. ${player.name}\n`;
        });
    }

    if (tournament.status !== 'registration') {
        bracket += `╠══════════════════╣\n`;
        bracket += `║ 𝙿𝙷𝙰𝚂𝙴𝚂 𝙳𝚄 𝚃𝙾𝚄𝚁𝙽𝙾𝙸:\n`;
        bracket += `╠══════════════════╣\n`;

        tournament.rounds.forEach((round, roundIndex) => {
            bracket += `║ **${round.name.toUpperCase()}** (${round.matches.filter(m => m.completed).length}/${round.matches.length} 𝚖𝚊𝚝𝚌𝚑𝚜 𝚝𝚎𝚛𝚖𝚒𝚗𝚎́𝚜)\n`;
            round.matches.forEach((match, matchIndex) => {
                const player1Name = match.player1 ? tournament.players.find(p => p.id === match.player1)?.name || `Joueur inconnu (${match.player1})` : "À déterminer";
                const player2Name = match.player2 ? tournament.players.find(p => p.id === match.player2)?.name || `Joueur inconnu (${match.player2})` : "À déterminer";
                const status = match.completed ? (match.winner ? `✅ Vainqueur: ${tournament.players.find(p => p.id === match.winner)?.name}` : "🤝 Nul") : "⏳ En attente";

                bracket += `║    𝙼𝚊𝚝𝚌𝚑 ${matchIndex + 1}: ${player1Name} 𝚟𝚜 ${player2Name} ${status}\n`;
            });
        });
    }

    if (tournament.status === 'completed' && tournament.winner) {
        const winnerName = tournament.players.find(p => p.id === tournament.winner)?.name || "Inconnu";
        bracket += `╠══════════════════╣\n`;
        bracket += `║ 🏆 𝚅𝙰𝙸𝙽𝚀𝚄𝙴𝚄𝚁 𝙳𝚄 𝚃𝙾𝚄𝚁𝙽𝙾𝙸 : **${winnerName}** 🎉\n`;
    }

    bracket += `╚══════════════════╝`;
    return bracket;
}

async function startTournament(tournamentID, api, event) {
    const tournament = tournaments[tournamentID];
    if (tournament.players.length !== 4) {
        await api.sendMessage("❌| 𝙻𝚎 𝚝𝚘𝚞𝚛𝚗𝚘𝚒 𝚗𝚎 𝚙𝚎𝚞𝚝 𝚙𝚊𝚜 𝚌𝚘𝚖𝚖𝚎𝚗𝚌𝚎𝚛. 𝙸𝚕 𝚏𝚊𝚞𝚝 𝚎𝚡𝚊𝚌𝚝𝚎𝚖𝚎𝚗𝚝 𝟺 𝚓𝚘𝚞𝚎𝚞𝚛𝚜.", tournament.threadID);
        return;
    }

    tournament.status = 'in_progress';
    shuffleArray(tournament.players);

    tournament.rounds = [
        { name: "Demi-finales", matches: [] },
        { name: "Finale", matches: [] }
    ];
    tournament.currentRoundIndex = 0;
    tournament.winner = null;

    for (let i = 0; i < 4; i += 2) {
        const player1 = tournament.players[i];
        const player2 = tournament.players[i + 1];
        tournament.rounds[0].matches.push({
            player1: player1.id,
            player2: player2.id,
            winner: null,
            completed: false,
            gameID: null
        });
    }

    await api.sendMessage(
        `🎉| 𝙻𝚎 𝚝𝚘𝚞𝚛𝚗𝚘𝚒 𝚌𝚘𝚖𝚖𝚎𝚗𝚌𝚎 ! 𝚅𝚘𝚒𝚌𝚒 𝚕𝚎 𝚋𝚛𝚊𝚌𝚔𝚎𝚝 𝚍𝚎𝚜 𝙳𝚎𝚖𝚒-𝚏𝚒𝚗𝚊𝚕𝚎𝚜:\n` +
        `${await generateTournamentBracketText(tournament)}`,
        tournament.threadID
    );

    await initiateNextMatch(tournamentID, api, event);
}

async function initiateNextMatch(tournamentID, api, event) {
    const tournament = tournaments[tournamentID];
    const currentRound = tournament.rounds[tournament.currentRoundIndex];

    const nextMatchIndex = currentRound.matches.findIndex(m => !m.completed && m.gameID === null);

    if (nextMatchIndex !== -1) {
        const match = currentRound.matches[nextMatchIndex];
        const player1 = tournament.players.find(p => p.id === match.player1);
        const player2 = tournament.players.find(p => p.id === match.player2);

        if (!player1 || !player2) {
            console.error("Erreur: Joueur non trouvé pour le match de tournoi.");
            await api.sendMessage("❌| 𝙴𝚛𝚛𝚎𝚞𝚛 𝚍𝚎 𝚓𝚘𝚞𝚎𝚞𝚛 𝚙𝚘𝚞𝚛 𝚕𝚎 𝚙𝚛𝚘𝚌𝚑𝚊𝚒𝚗 𝚖𝚊𝚝𝚌𝚑 𝚍𝚞 𝚝𝚘𝚞𝚛𝚗𝚘𝚒. 𝚅𝚎𝚞𝚒𝚕𝚕𝚎𝚣 𝚛𝚎𝚟𝚎́𝚛𝚒𝚏𝚒𝚎𝚛 𝚕𝚎𝚜 𝚙𝚊𝚛𝚝𝚒𝚌𝚒𝚙𝚊𝚗𝚝𝚜.", tournament.threadID);
            return;
        }

        const gameID = `${tournament.threadID}:tournament:${tournamentID}:${nextMatchIndex}`;
        resetGame(gameID, player1, player2);
        games[gameID].isTournamentGame = true;
        games[gameID].tournamentID = tournamentID;
        games[gameID].matchIndex = nextMatchIndex;

        match.gameID = gameID;

        await api.sendMessage(
            `🎮| 𝚃𝙾𝚄𝚁𝙽𝙾𝙸 - ${currentRound.name} - 𝙼𝚊𝚝𝚌𝚑 ${nextMatchIndex + 1}:\n` +
            `𝙽𝚘𝚞𝚟𝚎𝚕𝚕𝚎 𝚙𝚊𝚛𝚝𝚒𝚎 𝚎𝚗𝚝𝚛𝚎 ${player1.name} 『💙』 𝚎𝚝 ${player2.name} 『🤍』 𝚌𝚘𝚖𝚖𝚎𝚗𝚌𝚎 !\n` +
            `${displayBoard(games[gameID].board)}\n\n${player1.name}, 𝚏𝚊𝚒𝚝𝚎𝚜 𝚟𝚘𝚝𝚛𝚎 𝚙𝚛𝚎𝚖𝚒𝚎𝚛 𝚖𝚘𝚞𝚟𝚎𝚖𝚎𝚗𝚝 𝚎𝚗 𝚎𝚗𝚟𝚘𝚢𝚊𝚗𝚝 𝚞𝚗 𝚗𝚞𝚖𝚎́𝚛𝚘 (𝟷-𝟿).`,
            tournament.threadID
        );
    }
}

async function advanceTournamentRound(tournamentID, api, event) {
    const tournament = tournaments[tournamentID];
    const currentRound = tournament.rounds[tournament.currentRoundIndex];

    const winners = currentRound.matches.map(match => match.winner).filter(id => id !== null);

    if (winners.length !== currentRound.matches.length) {
        await api.sendMessage("⚠️| 𝙰𝚝𝚝𝚎𝚗𝚝𝚒𝚘𝚗 : 𝚃𝚘𝚞𝚜 𝚕𝚎𝚜 𝚖𝚊𝚝𝚌𝚑𝚜 𝚍𝚞 𝚝𝚘𝚞𝚛 𝚙𝚛𝚎́𝚌𝚎́𝚍𝚎𝚗𝚝 𝚗'𝚘𝚗 𝚙𝚊𝚜 𝚎𝚗𝚌𝚘𝚛𝚎 𝚍𝚎́𝚝𝚎𝚛𝚖𝚒𝚗𝚎́ 𝚕𝚎𝚞𝚛 𝚟𝚊𝚒𝚗𝚚𝚞𝚎𝚞𝚛. 𝙻'𝚊𝚟𝚊𝚗𝚌𝚎𝚖𝚎𝚗𝚝 𝚎𝚜𝚝 𝚜𝚞𝚜𝚙𝚎𝚗𝚍𝚞.", tournament.threadID);
        return;
    }

    if (tournament.currentRoundIndex === tournament.rounds.length - 1) {
        tournament.winner = winners[0];
        tournament.status = 'completed';
        const winnerPlayer = tournament.players.find(p => p.id === tournament.winner);
        await api.sendMessage(
            `🎉🏆🎉| 𝙵𝙴́𝙻𝙸𝙲𝙸𝚃𝙰𝚃𝙸𝙾𝙽𝚂, ${winnerPlayer.name} 𝚎𝚜𝚝 𝚕𝚎 𝚐𝚛𝚊𝚗𝚍 𝚟𝚊𝚒𝚗𝚚𝚞𝚎𝚞𝚛 𝚍𝚞 𝚃𝙾𝚄𝚁𝙽𝙾𝙸 𝙳𝙴 𝚃𝙸𝙲-𝚃𝙰𝙲-𝚃𝙾𝙴 !\n` +
            `${await generateTournamentBracketText(tournament)}`,
            tournament.threadID
        );
        delete tournaments[tournamentID];
        return;
    }

    tournament.currentRoundIndex++;
    const nextRound = tournament.rounds[tournament.currentRoundIndex];
    nextRound.matches = [];

    shuffleArray(winners);
    for (let i = 0; i < winners.length; i += 2) {
        const player1ID = winners[i];
        const player2ID = winners[i + 1];
        nextRound.matches.push({
            player1: player1ID,
            player2: player2ID,
            winner: null,
            completed: false,
            gameID: null
        });
    }

    await api.sendMessage(
        `➡️| 𝙿𝚛𝚘𝚌𝚑𝚊𝚒𝚗 𝚝𝚘𝚞𝚛 : **${nextRound.name}** !\n𝚅𝚘𝚒𝚌𝚒 𝚕𝚎 𝚗𝚘𝚞𝚟𝚎𝚊𝚞 𝚋𝚛𝚊𝚌𝚔𝚎𝚝:\n` +
        `${await generateTournamentBracketText(tournament)}`,
        tournament.threadID
    );

    await initiateNextMatch(tournamentID, api, event);
}


module.exports = {
    config: {
        name: "tictactoe",
        aliases: ["ttt"],
        version: "1.3",
        author: "ミ★𝐒𝐎𝐍𝐈𝐂✄𝐄𝚇𝙴 3.0★彡",
        category: "game",
        shortDescription: "Un jeu de morpion à deux joueurs ou un tournoi à 4 joueurs.",
        usage: "tictactoe | tictactoe @ami | tictactoe <ID> | tictactoe help | tictactoe stats | ttt tournoi [start|cancel] | ttt join | ttt out"
    },

    onStart: async function ({ api, event, args }) {
        const threadID = event.threadID;
        const senderID = event.senderID;
        let opponentID = null;

        if (!playerStats[senderID]) {
            playerStats[senderID] = { wins: 0, losses: 0 };
        }

        const mentionedIDs = Object.keys(event.mentions);
        const command = args[0]?.toLowerCase();
        const subcommand = args[1]?.toLowerCase();
        const currentTournament = tournaments[threadID];

        // --- DÉBUT DES MODIFICATIONS ---
        // Gère les commandes "join" et "out" en tant que sous-commandes du préfixe ttt
        if (command === "join") {
            if (!currentTournament || currentTournament.status !== 'registration') {
                return api.sendMessage("❌| 𝙰𝚞𝚌𝚞𝚗 𝚝𝚘𝚞𝚛𝚗𝚘𝚒 𝚎𝚗 𝚌𝚘𝚞𝚛𝚜 𝚍'𝚒𝚗𝚜𝚌𝚛𝚒𝚙𝚝𝚒𝚘𝚗. 𝙻𝚊𝚗𝚌𝚎𝚣-𝚎𝚗 𝚞𝚗 𝚊𝚟𝚎𝚌 `ttt tournoi`.", threadID, event.messageID);
            }
            const senderInfo = await api.getUserInfo(senderID);
            const senderName = senderInfo[senderID].name;

            const existingPlayer = currentTournament.players.find(p => p.id === senderID);
            if (existingPlayer) {
                return api.sendMessage(`🧐| ${senderName}, 𝚟𝚘𝚞 𝚎̂𝚝𝚎𝚜 𝚍𝚎́𝚓𝚊̀ 𝚒𝚗𝚜𝚌𝚛𝚒𝚝 𝚊𝚞 𝚝𝚘𝚞𝚛𝚗𝚘𝚒 !`, threadID, event.messageID);
            }
            if (currentTournament.players.length >= 4) {
                return api.sendMessage(`🚫| 𝙻𝚎 𝚝𝚘𝚞𝚛𝚗𝚘𝚒 𝚎𝚜𝚝 𝚌𝚘𝚖𝚙𝚕𝚎𝚝 (${currentTournament.players.length}/4). 𝚅𝚎𝚞𝚒𝚕𝚕𝚎𝚣 𝚊𝚝𝚝𝚎𝚗𝚍𝚛𝚎 𝚕𝚎 𝚙𝚛𝚘𝚌𝚑𝚊𝚒𝚗 𝚝𝚘𝚞𝚛𝚗𝚘𝚒 !`, threadID, event.messageID);
            }
            currentTournament.players.push({ id: senderID, name: senderName });
            const updatedBracket = await generateTournamentBracketText(currentTournament);
            await api.sendMessage(
                `✅| ${senderName} 𝚊 𝚛𝚎𝚓𝚘𝚒𝚗𝚝 𝚕𝚎 𝚝𝚘𝚞𝚛𝚗𝚘𝚒 ! ${currentTournament.players.length}/4 𝚓𝚘𝚞𝚎𝚞𝚛𝚜.\n` +
                `${updatedBracket}\n` +
                (currentTournament.players.length < 4 ? `𝙴𝚗𝚌𝚘𝚛𝚎 ${4 - currentTournament.players.length} 𝚙𝚕𝚊𝚌𝚎(s) !` : `𝙻𝚎 𝚝𝚘𝚞𝚛𝚗𝚘𝚒 𝚎𝚜𝚝 𝚙𝚛𝚎̂𝚝 ! 𝚃𝚊𝚙𝚎𝚣 \`ttt tournoi start\` 𝚙𝚘𝚞𝚛 𝚍𝚎́𝚖𝚊𝚛𝚛𝚎𝚛.`),
                threadID,
                event.messageID
            );
            return;
        }

        if (command === "out") {
            if (!currentTournament || currentTournament.status !== 'registration') {
                return api.sendMessage("❌| 𝙰𝚞𝚌𝚞𝚗 𝚝𝚘𝚞𝚛𝚗𝚘𝚒 𝚎𝚗 𝚌𝚘𝚞𝚛𝚜 𝚍'𝚒𝚗𝚜𝚌𝚛𝚒𝚙𝚝𝚒𝚘𝚗.", threadID, event.messageID);
            }
            const senderInfo = await api.getUserInfo(senderID);
            const senderName = senderInfo[senderID].name;
            const playerIndex = currentTournament.players.findIndex(p => p.id === senderID);
            if (playerIndex === -1) {
                return api.sendMessage(`🧐| ${senderName}, 𝚟𝚘𝚞 𝚗'𝚎̂𝚝𝚎𝚜 𝚙𝚊𝚜 𝚒𝚗𝚜𝚌𝚛𝚒𝚝 𝚊𝚞 𝚝𝚘𝚞𝚛𝚗𝚘𝚒.`, threadID, event.messageID);
            }
            currentTournament.players.splice(playerIndex, 1);
            const updatedBracket = await generateTournamentBracketText(currentTournament);
            await api.sendMessage(
                `🗑️| ${senderName} 𝚊 𝚚𝚞𝚒𝚝𝚝𝚎́ 𝚕𝚎 𝚝𝚘𝚞𝚛𝚗𝚘𝚒. ${currentTournament.players.length}/4 𝚓𝚘𝚞𝚎𝚞𝚛𝚜.\n` +
                `${updatedBracket}`,
                threadID,
                event.messageID
            );
            return;
        }
        // --- FIN DES MODIFICATIONS ---

        if (command === "tournoi") {
            if (subcommand === "cancel") {
                if (!currentTournament) {
                    return api.sendMessage("❌| 𝙰𝚞𝚌𝚞𝚗 𝚝𝚘𝚞𝚛𝚗𝚘𝚒 𝚎𝚗 𝚌𝚘𝚞𝚛𝚜 𝚍'𝚒𝚗𝚜𝚌𝚛𝚒𝚙𝚝𝚒𝚘𝚗𝚜 à 𝚊𝚗𝚗𝚞𝚕𝚎𝚛.", threadID, event.messageID);
                }
                if (currentTournament.status !== 'registration') {
                    return api.sendMessage("❌| 𝙻𝚎 𝚝𝚘𝚞𝚛𝚗𝚘𝚒 𝚎𝚜𝚝 𝚍𝚎́𝚓𝚊̀ 𝚎𝚗 𝚌𝚘𝚞𝚛𝚜 𝚘𝚞 𝚝𝚎𝚛𝚖𝚒𝚗𝚎́. 𝚅𝚘𝚞𝚜 𝚗𝚎 𝚙𝚘𝚞𝚟𝚎𝚣 𝚙𝚊𝚜 𝚕'𝚊𝚗𝚗𝚞𝚕𝚎𝚛 𝚖𝚊𝚒𝚗𝚝𝚎𝚗𝚊𝚗𝚝.", threadID, event.messageID);
                }
                delete tournaments[threadID];
                return api.sendMessage("🗑️| 𝙻'𝚒𝚗𝚜𝚌𝚛𝚒𝚙𝚝𝚒𝚘𝚗 𝚊𝚞 𝚝𝚘𝚞𝚛𝚗𝚘𝚒 𝚊 𝚎́𝚝𝚎́ 𝚊𝚗𝚗𝚞𝚕𝚎́𝚎 𝚊𝚟𝚎𝚌 𝚜𝚞𝚌𝚌𝚎̀𝚜.", threadID, event.messageID);
            }

            if (subcommand === "start") {
                if (!currentTournament || currentTournament.status !== 'registration') {
                    return api.sendMessage("❌| 𝙰𝚞𝚌𝚞𝚗 𝚝𝚘𝚞𝚛𝚗𝚘𝚒 𝚎𝚗 𝚌𝚘𝚞𝚛𝚜 d'inscription à démarrer. Lancez-en un avec `ttt tournoi`.", threadID, event.messageID);
                }
                if (currentTournament.players.length !== 4) {
                    return api.sendMessage(`🚫| 𝙸𝚕 𝚏𝚊𝚞𝚝 𝚎𝚡𝚊𝚌𝚝𝚎𝚖𝚎𝚗𝚝 𝟺 𝚓𝚘𝚞𝚎𝚞𝚛𝚜 𝚙𝚘𝚞𝚛 𝚍𝚎́𝚖𝚊𝚛𝚛𝚎𝚛 𝚕𝚎 𝚝𝚘𝚞𝚛𝚗𝚘𝚒. 𝙰𝚌𝚝𝚞𝚎𝚕: ${currentTournament.players.length}/4.`, threadID, event.messageID);
                }
                await startTournament(threadID, api, event);
                return;
            }

            if (currentTournament && currentTournament.status === 'registration') {
                const currentBracket = await generateTournamentBracketText(currentTournament);
                return api.sendMessage(
                    `✨| 𝚄𝚗 𝚝𝚘𝚞𝚛𝚗𝚘𝚒 𝚎𝚜𝚝 𝚍𝚎́𝚓𝚊̀ 𝚎𝚗 𝚌𝚘𝚞𝚛𝚜 𝚍'𝚒𝚗𝚜𝚌𝚛𝚒𝚙𝚝𝚒𝚘𝚗𝚜 !\n` +
                    `${currentBracket}\n` +
                    `𝚃𝚊𝚙𝚎𝚣 "\`ttt join\`" 𝚙𝚘𝚞𝚛 𝚛𝚎𝚓𝚘𝚒𝚗𝚍𝚛𝚎 𝚘𝚞 "\`ttt out\`" 𝚙𝚘𝚞𝚛 𝚚𝚞𝚒𝚝𝚝𝚎𝚛. 𝚀𝚞𝚊𝚗𝚍 𝚙𝚛𝚎̂𝚝: \`ttt tournoi start\`.`,
                    threadID,
                    event.messageID
                );
            }

            if (currentTournament && currentTournament.status === 'in_progress') {
                const currentBracket = await generateTournamentBracketText(currentTournament);
                return api.sendMessage(
                    `❌| 𝚄𝚗 𝚝𝚘𝚞𝚛𝚗𝚘𝚒 𝚎𝚜𝚝 𝚍𝚎́𝚓𝚊̀ 𝚎𝚗 𝚌𝚘𝚞𝚛𝚜 𝚍𝚊𝚗𝚜 𝚌𝚎 𝚌𝚑𝚊𝚝.\n` +
                    `${currentBracket}\n` +
                    `𝚅𝚎𝚞𝚒𝚕𝚕𝚎𝚣 𝚙𝚊𝚝𝚒𝚎𝚗𝚝𝚎𝚛 𝚚𝚞'𝚒𝚕 𝚜𝚎 𝚝𝚎𝚛𝚖𝚒𝚗𝚎 𝚘𝚞 𝚛𝚎𝚙𝚛𝚎𝚗𝚍𝚛𝚎 𝚕𝚎 𝚖𝚊𝚝𝚌𝚑 𝚊𝚌𝚝𝚞𝚎𝚕.`,
                    threadID,
                    event.messageID
                );
            }
            if (currentTournament && currentTournament.status === 'completed') {
                const currentBracket = await generateTournamentBracketText(currentTournament);
                return api.sendMessage(
                    `✅| 𝚄𝚗 𝚝𝚘𝚞𝚛𝚗𝚘𝚒 𝚊 𝚍𝚎́𝚓𝚊̀ 𝚎́𝚝𝚎́ 𝚝𝚎𝚛𝚖𝚒𝚗𝚎́ 𝚛𝚎́𝚌𝚎𝚖𝚖𝚎𝚗𝚝.\n` +
                    `${currentBracket}\n` +
                    `𝙻𝚊𝚗𝚌𝚎𝚣-𝚎𝚗 𝚞𝚗 𝚗𝚘𝚞𝚟𝚎𝚊𝚞 𝚊𝚟𝚎𝚌 \`ttt tournoi\`.`,
                    threadID,
                    event.messageID
                );
            }
            if (currentTournament && currentTournament.status === 'paused') {
                const currentBracket = await generateTournamentBracketText(currentTournament);
                return api.sendMessage(
                    `⏸️| 𝙻𝚎 𝚝𝚘𝚞𝚛𝚗𝚘𝚒 𝚎𝚜𝚝 𝚊𝚌𝚝𝚞𝚎𝚕𝚕𝚎𝚖𝚎𝚗𝚝 𝚎𝚗 𝚙𝚊𝚞𝚜𝚎 (𝚙𝚎𝚞𝚝-𝚎̂𝚝𝚛𝚎 𝚊̀ 𝚌𝚊𝚞𝚜𝚎 𝚍'𝚞𝚗 𝚖𝚊𝚝𝚌𝚑 𝚗𝚞𝚕).\n` +
                    `${currentBracket}\n` +
                    `Les joueurs concernés doivent rejouer leur match.`,
                    threadID,
                    event.messageID
                );
            }

            tournaments[threadID] = {
                id: threadID,
                players: [],
                status: 'registration',
                rounds: [],
                currentRoundIndex: -1,
                winner: null,
                threadID: threadID,
                messageID: null
            };

            const initialBracket = await generateTournamentBracketText(tournaments[threadID]);
            const sentMessage = await api.sendMessage(
                `🎉| 𝙻𝚎 𝚝𝚘𝚞𝚛𝚗𝚘𝚒 𝚍𝚎 𝚃𝚒𝚌-𝚃𝚊𝚌-𝚃𝚘𝚎 𝚌𝚘𝚖𝚖𝚎𝚗𝚌𝚎 ! 𝙱𝚎𝚜𝚘𝚒𝚗 𝚍𝚎 𝟺 𝚓𝚘𝚞𝚎𝚞𝚛𝚜.\n` +
                `${initialBracket}\n` +
                `𝚃𝚊𝚙𝚎𝚣 "\`ttt join\`" 𝚙𝚘𝚞𝚛 𝚛𝚎𝚓𝚘𝚒𝚗𝚍𝚛𝚎 𝚘𝚞 "\`ttt out\`" 𝚙𝚘𝚞𝚛 𝚚𝚞𝚒𝚝𝚝𝚎𝚛. 𝚀𝚞𝚊𝚗𝚍 𝚙𝚛𝚎̂𝚝: \`ttt tournoi start\`.`,
                threadID,
                event.messageID
            );
            tournaments[threadID].messageID = sentMessage.messageID;
            return;
        }

        if (args.length === 0 || command === "help") {
            return api.sendMessage(
                `👋| 𝙱𝚒𝚎𝚗𝚟𝚎𝚗𝚞 𝚊𝚞 𝚓𝚎𝚞 𝚍𝚎 𝚃𝚒𝚌-𝚃𝚊𝚌-𝚃𝚘𝚎 !\n` +
                `\n𝙿𝚘𝚞𝚛 𝚌𝚘𝚖𝚖𝚎𝚗𝚌𝚎𝚛 𝚞𝚗𝚎 𝚙𝚊𝚛𝚝𝚒𝚎 :\n` +
                ` • 𝙿𝚕𝚊𝚢𝚎𝚛 𝚟𝚜 𝙿𝚕𝚊𝚢𝚎𝚛: \`ttt @ami\` 𝚘𝚞 \`ttt <ID>\`\n` +
                `\n𝙿𝚘𝚞𝚛 𝚏𝚊𝚒𝚛𝚎 𝚞𝚗 𝚌𝚘𝚞𝚙: 𝚎𝚗𝚟𝚘𝚢𝚎𝚣 𝚞𝚗 𝚗𝚞𝚖𝚎́𝚛𝚘 (𝟷-𝟿).\n` +
                `\nCommandes:\n` +
                ` • \`ttt help\`: 𝙰𝚏𝚏𝚒𝚌𝚑𝚎 𝚌𝚎𝚝𝚝𝚎 𝚊𝚒𝚍𝚎.\n` +
                ` • \`ttt stats\`: 𝚅𝚘𝚜 𝚜𝚝𝚊𝚝𝚒𝚜𝚝𝚒𝚚𝚞𝚎𝚜.\n` +
                ` • \`forfait\`: 𝙰𝚋𝚊𝚗𝚍𝚘𝚗𝚗𝚎𝚛 𝚕𝚊 𝚙𝚊𝚛𝚝𝚒𝚎.\n` +
                ` • \`restart\`: 𝚁𝚎𝚕𝚊𝚗𝚌𝚎𝚛 𝚞𝚗𝚎 𝚙𝚊𝚛𝚝𝚒𝚎 (pour les matchs 1 vs 1).\n` +
                `\n𝙿𝙾𝚄𝚁 𝙻𝙴 𝚃𝙾𝚄𝚁𝙽𝙾𝙸 (4 𝚓𝚘𝚞𝚎𝚞𝚛𝚜) :\n` +
                ` • \`ttt tournoi\`: 𝙻𝚊𝚗𝚌𝚎𝚛 𝚞𝚗 𝚗𝚘𝚞𝚟𝚎𝚊𝚞 𝚝𝚘𝚞𝚛𝚗𝚘𝚒 𝚘𝚞 𝚟𝚘𝚒𝚛 𝚜𝚘𝚗 𝚜𝚝𝚊𝚝𝚞𝚝.\n` +
                ` • \`ttt join\`: 𝚁𝚎𝚓𝚘𝚒𝚗𝚍𝚛𝚎 𝚕𝚎 𝚝𝚘𝚞𝚛𝚗𝚘𝚒 𝚎𝚗 𝚌𝚘𝚞𝚛𝚜 𝚍'𝚒𝚗𝚜𝚌𝚛𝚒𝚙𝚝𝚒𝚘𝚗.\n` +
                ` • \`ttt out\`: 𝚀𝚞𝚒𝚝𝚝𝚎𝚛 𝚕𝚎 𝚝𝚘𝚞𝚛𝚗𝚘𝚒 𝚎𝚗 𝚌𝚘𝚞𝚛𝚜 𝚍'𝚒𝚗𝚜𝚌𝚛𝚒𝚙𝚝𝚒𝚘𝚗.\n` +
                ` • \`ttt tournoi start\`: 𝙳𝚎́𝚖𝚊𝚛𝚛𝚎𝚛 𝚕𝚎 𝚝𝚘𝚞𝚛𝚗𝚘𝚒 𝚚𝚞𝚊𝚗𝚍 𝟺 𝚓𝚘𝚞𝚎𝚞𝚛𝚜 𝚜𝚘𝚗𝚝 𝚒𝚗𝚜𝚌𝚛𝚒𝚝𝚜.\n` +
                ` • \`ttt tournoi cancel\`: 𝙰𝚗𝚗𝚞𝚕𝚎𝚛 𝚕'𝚒𝚗𝚜𝚌𝚛𝚒𝚙𝚝𝚒𝚘𝚗 𝚍'𝚞𝚗 𝚝𝚘𝚞𝚛𝚗𝚘𝚒.\n` +
                `\n━━━━━━━━❪❐❫━━━━━━━━\n` +
                `𝙰𝚖𝚞𝚜𝚎𝚣-𝚟𝚘𝚞𝚜 𝚋𝚒𝚎𝚗 ! 🎲`,
                threadID,
                event.messageID
            );
        }

        if (command === "stats") {
            const stats = playerStats[senderID];
            if (stats) {
                return api.sendMessage(
                    `📊| 𝚅𝚘𝚜 𝚜𝚝𝚊𝚝𝚒𝚜𝚝𝚒𝚚𝚞𝚎𝚜 𝚍𝚎 𝚃𝚒𝚌-𝚃𝚊𝚌-𝚃𝚘𝚎 :\n` +
                    ` • 𝚅𝚒𝚌𝚝𝚘𝚒𝚛𝚎𝚜 : ${stats.wins}\n` +
                    ` • 𝙳𝚎́𝚏𝚊𝚒𝚝𝚎𝚜 : ${stats.losses}\n` +
                    `━━━━━━━━❪❐❫━━━━━━━━`,
                    threadID,
                    event.messageID
                );
            } else {
                return api.sendMessage(
                    `📊| 𝚅𝚘𝚞𝚜 𝚗'𝚊𝚟𝚎𝚣 𝚙𝚊𝚜 𝚎𝚗𝚌𝚘𝚛𝚎 𝚓𝚘𝚞𝚎́ 𝚍𝚎 𝚙𝚊𝚛𝚝𝚒𝚎𝚜 𝚍𝚎 𝚃𝚒𝚌-𝚃𝚊𝚌-𝚃𝚘𝚎. 𝙻𝚊𝚗𝚌𝚎𝚣-𝚟𝚘𝚞𝚜 !`,
                    threadID,
                    event.messageID
                );
            }
        }
        
        if (tournaments[threadID] && tournaments[threadID].status !== 'registration') {
            return api.sendMessage("❌| 𝚄𝚗 𝚝𝚘𝚞𝚛𝚗𝚘𝚒 𝚎𝚜𝚝 𝚊𝚌𝚝𝚞𝚎𝚕𝚕𝚎𝚖𝚎𝚗𝚝 𝚎𝚗 𝚌𝚘𝚞𝚛𝚜 𝚍𝚊𝚗𝚜 𝚌𝚎 𝚌𝚑𝚊𝚝. 𝚅𝚘𝚞𝚜 𝚗𝚎 𝚙𝚘𝚞𝚟𝚎𝚣 𝚙𝚊𝚜 𝚕𝚊𝚗𝚌𝚎𝚛 𝚍𝚎 𝚙𝚊𝚛𝚝𝚒𝚎𝚜 𝚒𝚗𝚍𝚒𝚟𝚒𝚍𝚞𝚎𝚕𝚕𝚎𝚜.", threadID, event.messageID);
        }

        if (mentionedIDs.length > 0) {
            opponentID = mentionedIDs[0];
        } else if (args[0]) {
            if (!/^\d+$/.test(args[0])) {
                return api.sendMessage("𝙸𝙳 𝚒𝚗𝚟𝚊𝚕𝚒𝚍𝚎. 𝙼𝚎𝚛𝚌𝚒 𝚍𝚎 𝚏𝚘𝚞𝚛𝚗𝚒𝚛 𝚞𝚗 𝙸𝙳 𝚗𝚞𝚖𝚎́𝚛𝚒𝚚𝚞𝚎.", threadID, event.messageID);
            }
            opponentID = args[0];
        }

        if (!opponentID) {
            return api.sendMessage("❌| 𝙿𝚘𝚞𝚛 𝚌𝚘𝚖𝚖𝚎𝚗𝚌𝚎𝚛 𝚞𝚗𝚎 𝚙𝚊𝚛𝚝𝚒𝚎, 𝚖𝚎𝚗𝚝𝚒𝚘𝚗𝚗𝚎𝚣 𝚞𝚗 𝚊𝚖𝚒 𝚘𝚞 𝚍𝚘𝚗𝚗𝚎𝚣 𝚜𝚘𝚗 𝙸𝙳. 𝙿𝚘𝚞𝚛 𝚍𝚎 𝚕'𝚊𝚒𝚍𝚎, 𝚝𝚊𝚙𝚎𝚣 `tictactoe help`.", threadID, event.messageID);
        }
        if (opponentID == senderID) {
            return api.sendMessage("𝚅𝚘𝚞𝚜 𝚗𝚎 𝚙𝚘𝚞𝚟𝚎𝚣 𝚙𝚊𝚜 𝚓𝚘𝚞𝚎𝚛 𝚌𝚘𝚗𝚝𝚛𝚎 𝚟𝚘𝚞-𝚖𝚎̂𝚖𝚎 !", threadID, event.messageID);
        }

        const gameID = `${threadID}:${Math.min(senderID, opponentID)}:${Math.max(senderID, opponentID)}`;

        if (games[gameID] && games[gameID].inProgress) {
            return api.sendMessage("❌| 𝚄𝚗 𝚓𝚎𝚞 𝚎𝚜𝚝 𝚍𝚎́𝚓𝚊̀ 𝚎𝚗 𝚌𝚘𝚞𝚛𝚜 𝚎𝚗𝚝𝚛𝚎 𝚌𝚎𝚜 𝚓𝚘𝚞𝚎𝚞𝚛𝚜. 𝚅𝚎𝚞illez patienter ⏳.", threadID, event.messageID);
        }

        const player1Info = await api.getUserInfo(senderID);
        const player2Info = await api.getUserInfo(opponentID);

        if (!player2Info[opponentID]) {
            return api.sendMessage("𝙸𝚖𝚙𝚘𝚜𝚜𝚒𝚋𝚕𝚎 𝚍𝚎 𝚝𝚛𝚘𝚞𝚟𝚎𝚛 𝚕'𝚞𝚝𝚒𝚕𝚒𝚜𝚊𝚝𝚎𝚞𝚛 𝚊𝚟𝚎𝚌 𝚌𝚎𝚝 𝙸𝙳.", threadID, event.messageID);
        }

        const player1 = { id: senderID, name: player1Info[senderID].name, threadID: threadID };
        const player2 = { id: opponentID, name: player2Info[opponentID].name, threadID: threadID };

        resetGame(gameID, player1, player2);

        api.sendMessage(
            `🎮| 𝙿𝚊𝚛𝚝𝚒𝚎 𝚍𝚎 𝚃𝚒𝚌-𝚃𝚊𝚌-𝚃𝚘𝚎 𝚎𝚗𝚝𝚛𝚎 ${player1.name} 『💙』 𝚎𝚝 ${player2.name} 『🤍』 𝚌𝚘𝚖𝚖𝚎𝚗𝚌𝚎 !\n${displayBoard(games[gameID].board)}\n\n${player1.name}, 𝚏𝚊𝚒𝚝𝚎𝚜 𝚟𝚘𝚝𝚛𝚎 𝚙𝚛𝚎𝚖𝚒𝚎𝚛 𝚖𝚘𝚞𝚟𝚎𝚖𝚎𝚗𝚝 𝚎𝚗 𝚎𝚗𝚟𝚘𝚢𝚊𝚗𝚝 𝚞𝚗 𝚗𝚞𝚖𝚎́𝚛𝚘 (𝟷-𝟿).`,
            threadID,
            event.messageID
        );
    },

    onChat: async function ({ api, event }) {
        const threadID = event.threadID;
        const senderID = event.senderID;
        const messageBody = event.body.trim().toLowerCase();

        // Le code pour gérer "join" et "out" a été déplacé vers onStart.
        // Cette section de onChat est maintenant simplifiée.
        
        // Trouve un jeu en cours où l'expéditeur est l'un des joueurs.
        const gameID = Object.keys(games).find((id) =>
            games[id].threadID === threadID &&
            games[id].players.some(player => player.id === senderID) &&
            games[id].inProgress
        );

        if (!gameID) {
            // Vérifie si un jeu est terminé et que la commande "restart" est lancée
            const finishedGameID = Object.keys(games).find((id) =>
                games[id].threadID === threadID &&
                games[id].players.some(player => player.id === senderID) &&
                !games[id].inProgress
            );
            if (finishedGameID && messageBody === "restart") {
                const finishedGame = games[finishedGameID];
                if (!finishedGame.isTournamentGame) {
                    const player1 = finishedGame.players[0];
                    const player2 = finishedGame.players[1];
                    resetGame(finishedGameID, player1, player2);
                    return api.sendMessage(
                        `🎮| 𝙽𝚘𝚞𝚟𝚎𝚊𝚞 𝚓𝚎𝚞 𝚍𝚎 𝚃𝚒𝚌-𝚃𝚊𝚌-𝚃𝚘𝚎 𝚎𝚗𝚝𝚛𝚎 ${player1.name} 『💙』 𝚎𝚝 ${player2.name} 『🤍』 !\n${displayBoard(games[finishedGameID].board)}\n\n${player1.name}, 𝚟𝚘𝚞𝚜 𝚌𝚘𝚖𝚖𝚎𝚗𝚌𝚎𝚣 𝚎𝚗 𝚙𝚛𝚎𝚖𝚒𝚎𝚛, 𝚌𝚑𝚘𝚒𝚜𝚒𝚜𝚜𝚎𝚣 𝚞𝚗𝚎 𝚌𝚊𝚜𝚎.`,
                        threadID,
                        event.messageID
                    );
                }
            }
            return;
        }

        const game = games[gameID];

        // Gère la commande "forfait" pour les parties en cours
        if (messageBody === "forfait") {
            const forfeitingPlayer = game.players.find(player => player.id === senderID);
            const opponentPlayer = game.players.find(player => player.id !== senderID);
            
            game.inProgress = false;
            if (!playerStats[forfeitingPlayer.id]) playerStats[forfeitingPlayer.id] = { wins: 0, losses: 0 };
            playerStats[forfeitingPlayer.id].losses++;
            if (!playerStats[opponentPlayer.id]) playerStats[opponentPlayer.id] = { wins: 0, losses: 0 };
            playerStats[opponentPlayer.id].wins++;

            await api.sendMessage(
                `🏳️| ${forfeitingPlayer.name} 𝚊 𝚊𝚋𝚊𝚗𝚍𝚘𝚗𝚗𝚎́ 𝚕𝚊 𝚙𝚊𝚛𝚝𝚒𝚎. ${opponentPlayer.name} 𝚎𝚜𝚝 𝚍𝚎́𝚌𝚕𝚊𝚛𝚎́ 𝚟𝚊𝚒𝚗𝚚𝚞𝚎𝚞𝚛 !`,
                threadID,
                event.messageID
            );

            if (game.isTournamentGame && tournaments[game.tournamentID]) {
                const tournament = tournaments[game.tournamentID];
                const currentRound = tournament.rounds[tournament.currentRoundIndex];
                const match = currentRound.matches[game.matchIndex];

                match.winner = opponentPlayer.id;
                match.completed = true;

                const allMatchesCompleted = currentRound.matches.every(m => m.completed);
                if (allMatchesCompleted) {
                    await api.sendMessage(`🔔| 𝚃𝚘𝚞𝚜 𝚕𝚎𝚜 𝚖𝚊𝚝𝚌𝚑𝚜 𝚍𝚞 𝚝𝚘𝚞𝚛 "${currentRound.name}" 𝚜𝚘𝚗𝚝 𝚝𝚎𝚛𝚖𝚒𝚗𝚎́𝚜 !`, event.threadID);
                    await advanceTournamentRound(tournament.id, api, event);
                }
            } else {
                await api.sendMessage(`𝚃𝚊𝚙𝚎𝚣 "𝚛𝚎𝚜𝚝𝚊𝚛𝚝" 𝚙𝚘𝚞𝚛 𝚛𝚎𝚌𝚘𝚖𝚖𝚎𝚗𝚌𝚎𝚛.`, threadID, event.messageID);
            }
            return;
        }

        // Gère les coups du joueur
        const position = parseInt(messageBody) - 1;
        const currentPlayer = game.players[game.currentPlayerIndex];

        if (senderID !== currentPlayer.id) {
            if (!isNaN(position) && position >= 0 && position <= 8 && game.board[position] === null) {
                return api.sendMessage(`𝙲𝚎 𝚗'𝚎𝚜𝚝 𝚙𝚊𝚜 𝚟𝚘𝚝𝚛𝚎 𝚝𝚘𝚞𝚛 ${game.players.find(p => p.id === senderID).name} ! 𝙲'𝚎𝚜𝚝 𝚕𝚎 𝚝𝚘𝚞𝚛 𝚍𝚎 ${currentPlayer.name}.`, threadID, event.messageID);
            }
            return;
        }

        if (isNaN(position) || position < 0 || position > 8 || game.board[position] !== null) {
            return api.sendMessage(`${currentPlayer.name}, 𝚌𝚊𝚜𝚎 𝚒𝚗𝚟𝚊𝚕𝚒𝚍𝚎 𝚘𝚞 𝚍𝚎́𝚓𝚊̀ 𝚘𝚌𝚌𝚞𝚙𝚎́𝚎. 𝙲'𝚎𝚜𝚝 𝚝𝚘𝚞𝚓𝚘𝚞𝚛𝚜 à 𝚟𝚘𝚝𝚛𝚎 𝚝𝚘𝚞𝚛 !`, threadID, event.messageID);
        }

        game.board[position] = currentPlayer.symbol;

        if (checkWinner(game.board) || isBoardFull(game.board)) {
            await handleGameEnd(gameID, api, event);
            return;
        }

        game.currentPlayerIndex = (game.currentPlayerIndex + 1) % 2;
        const nextPlayer = game.players[game.currentPlayerIndex];
        api.sendMessage(
            `${displayBoard(game.board)}\n\n${nextPlayer.name}, 𝚌'𝚎𝚜𝚝 à 𝚟𝚘𝚝𝚛𝚎 𝚝𝚘𝚞𝚛 !`,
            threadID,
            event.messageID
        );
    }
};
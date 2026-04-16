const express = require('express');
const app = express();
const port = 3000;

app.use(express.json());

let games = []; // In-memory JSON storage for games

// Health Check endpoint
app.get('/health', (req, res) => {
    res.status(200).send('API is running!');
});

// Get all games
app.get('/games', (req, res) => {
    res.json(games);
});

// Post a new game
app.post('/games', (req, res) => {
    const newGame = req.body;
    newGame.id = games.length + 1; // Simple ID assignment
    games.push(newGame);
    res.status(201).json(newGame);
});

// Update a game
app.put('/games/:id', (req, res) => {
    const gameId = parseInt(req.params.id);
    const gameIndex = games.findIndex(game => game.id === gameId);
    if (gameIndex !== -1) {
        games[gameIndex] = {...games[gameIndex], ...req.body};
        res.json(games[gameIndex]);
    } else {
        res.status(404).send('Game not found');
    }
});

// Delete a game
app.delete('/games/:id', (req, res) => {
    const gameId = parseInt(req.params.id);
    games = games.filter(game => game.id !== gameId);
    res.status(204).send();
});

// Statistics endpoint
app.get('/statistics', (req, res) => {
    res.json({ totalGames: games.length });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
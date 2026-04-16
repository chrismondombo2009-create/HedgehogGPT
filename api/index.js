const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Load games from JSON file
app.get('/api/games', (req, res) => {
    fs.readFile(path.join(__dirname, 'games.json'), 'utf8', (err, data) => {
        if (err) {
            return res.status(500).json({ message: 'Error reading file' });
        }
        res.json(JSON.parse(data));
    });
});

// Save a game to JSON file
app.post('/api/games', (req, res) => {
    const newGame = req.body;
    fs.readFile(path.join(__dirname, 'games.json'), 'utf8', (err, data) => {
        if (err) {
            return res.status(500).json({ message: 'Error reading file' });
        }
        const games = JSON.parse(data);
        games.push(newGame);
        fs.writeFile(path.join(__dirname, 'games.json'), JSON.stringify(games, null, 2), (err) => {
            if (err) {
                return res.status(500).json({ message: 'Error saving game' });
            }
            res.status(201).json(newGame);
        });
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

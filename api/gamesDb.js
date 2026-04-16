const mongoose = require('mongoose');

// MongoDB connection
const mongoURI = 'your_mongoDB_connection_string_here';
mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB connected...'))
    .catch(err => console.error('MongoDB connection error:', err));

// Define the game schema
const gameSchema = new mongoose.Schema({
    player1: { type: String, required: true },
    player2: { type: String, required: true },
    moves: [{ type: String }], // Store game moves
    winner: { type: String, default: null },
    createdAt: { type: Date, default: Date.now }
});

// Create the game model
const Game = mongoose.model('Game', gameSchema);

module.exports = { Game };
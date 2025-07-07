# Asteroid Dodgers - Multiplayer Web Game

A real-time multiplayer web game where players control ships to avoid asteroids and collect power-ups. Built using pure JavaScript and DOM elements (no Canvas).

## Features

- Real-time multiplayer gameplay for 2-4 players
- Smooth 60 FPS performance
- Pure DOM-based rendering (no Canvas)
- Keyboard controls with responsive input
- Power-ups system
- In-game menu (pause/resume/quit)
- Game timer and scoring system
- Sound effects

## Getting Started

### Prerequisites

- Node.js (v14+)
- npm or yarn

### Installation

1. Clone the repository

```bash
git clone https://github.com/yourusername/asteroid-dodgers.git
cd asteroid-dodgers
```

2. Install dependencies

```bash
npm install
```

### Running the Game Locally

#### Single-player/Testing Mode

```bash
npm start
```

This will start a local server at http://localhost:3000 where you can play in local mode with AI opponents.

#### Multiplayer Mode

```bash
npm run multiplayer
```

This will start the multiplayer server. Players can connect to the server address shown in the console.

## How to Play

1. Open the game URL in your browser
2. Enter your player name and create or join a room
3. When all players have joined, the host can start the game
4. Use the arrow keys or WASD to control your ship:
   - Up/W: Accelerate
   - Down/S: Brake
   - Left/A: Rotate left
   - Right/D: Rotate right
5. Avoid asteroids and collect power-ups
6. The player with the highest score at the end of the round wins

## Power-Ups

- **Shield** (Blue): Temporary invulnerability
- **Speed** (Yellow): Temporary speed boost
- **Points** (Purple): Extra points

## Development

### Project Structure

```
asteroid-dodgers/
├── index.html          # Main HTML file
├── server.js           # Local development server
├── multiplayer-server.js # Multiplayer server
├── src/
│   ├── css/
│   │   └── styles.css  # Game styles
│   ├── js/
│   │   ├── audio.js    # Audio management
│   │   ├── game.js     # Core game logic
│   │   ├── main.js     # Application entry point
│   │   ├── networking.js # Multiplayer functionality
│   │   ├── player.js   # Player class
│   │   ├── ui.js       # UI management
│   │   └── utils.js    # Utility functions
│   └── assets/
│       └── sounds/     # Game sound effects
└── package.json        # Project dependencies
```


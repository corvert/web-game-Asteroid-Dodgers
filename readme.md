# Asteroid Dodgers - Multiplayer Web Game

A real-time multiplayer web game where players control ships to avoid asteroids and collect power-ups. Built using pure JavaScript and DOM elements (no Canvas). This is an online multiplayer experience designed for 2-4 players.

## Features

- Real-time multiplayer gameplay for 2-4 players
- Smooth 60 FPS performance
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
git clone https://gitea.kood.tech/orvetpriimagi/web-game.git
```

2. Install dependencies

```bash
npm install
```

### Running the Multiplayer Game

Start the multiplayer server:

```bash
npm start
```


## How to Play

1. Start the multiplayer server using `npm start`
2. Open http://localhost:3000/ (multiple players can connect)
3. Enter your player name and create or join a room
4. Wait for other players to join (2-4 players supported)
5. When all players have joined, the host can start the game
6. Use the arrow keys or WASD to control your ship:
   - Up/W: Accelerate
   - Down/S: Brake
   - Left/A: Rotate left
   - Right/D: Rotate right
7. Avoid asteroids and collect power-ups
8. The player with the highest score at the end of the round wins
9. Compete with other players in real-time!

## Power-Ups

- **Shield** (Blue): Temporary invulnerability
- **Speed** (Yellow): Temporary speed boost
- **Points** (Purple): Extra points

## Development

### Project Structure

```
asteroid-dodgers/
├── index.html          # Main HTML file
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


## Development team

- **Ranno Poklonski**
- **Orvet Priimägi**
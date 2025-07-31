/**
 * Multiplayer game server
 */
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');
const cors = require('cors');

// Create application
const app = express();

// Enable CORS for all routes
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

const server = http.createServer(app);
const io = socketIO(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST", "OPTIONS"],
        credentials: true
    }
});

// Game state
const rooms = new Map();

/**
 * Get list of active rooms with player counts
 * @returns {Array} Array of room objects with id and playerCount
 */
function getActiveRooms() {
    const activeRooms = [];
    
    for (const [roomId, room] of rooms.entries()) {
        // Only include rooms that are not in progress and have space
        if (room.players.length > 0 && room.players.length < 6 && !room.gameInProgress) {
            activeRooms.push({
                id: roomId,
                playerCount: room.players.length,
                host: room.hostName || 'Unknown'
            });
        }
    }
    
    return activeRooms;
}

// Serve static files
app.use(express.static(path.join(__dirname, '/')));

// Handle root path
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Socket connection handler
io.on('connection', (socket) => {
    console.log(`Player connected: ${socket.id}`);
      // Room join handler
    socket.on('room:join', (data) => {
        const { name, roomId, color } = data;
        let joinedRoom;
        console.log(`Player ${socket.id} attempting to ${roomId ? 'join room ' + roomId : 'create new room'}`);        // Validate player name first
        if (!name || name.trim() === '') {
            socket.emit('error', { message: 'Player name is required' });
            return;
        }
        
        // Create or join a room
        if (!roomId) {
            // Create new room with random ID
            const newRoomId = generateRoomId();
            joinedRoom = createRoom(newRoomId);
            console.log(`Created new room ${newRoomId} for player ${socket.id}`);
            
            // Add player as host
            joinedRoom.host = socket.id;
            joinedRoom.hostName = name;
        } else {
            // Normalize room ID to uppercase
            const normalizedRoomId = roomId.trim().toUpperCase();
            console.log(`Looking for room with ID: ${normalizedRoomId}`);
            
            // Join existing room
            joinedRoom = rooms.get(normalizedRoomId);
            
            // Room not found or full
            if (!joinedRoom) {
                console.log(`Room ${normalizedRoomId} not found, available rooms: ${Array.from(rooms.keys()).join(', ')}`);
                socket.emit('error', { message: `Room "${normalizedRoomId}" not found` });
                return;
            }
            
            if (joinedRoom.players.length >= 4) {
                socket.emit('error', { message: 'Room is full (maximum 4 players)' });
                return;
            }
              
            // Check if game is already in progress
            if (joinedRoom.gameInProgress) {
                socket.emit('error', { message: 'Game is already in progress. Please try joining another room.' });
                return;
            }
              
            // Check for duplicate player names in this room
            const nameExists = joinedRoom.players.some(player => 
                player.name.toLowerCase() === name.toLowerCase()
            );
            
            if (nameExists) {
                console.log(`Player name "${name}" already exists in room ${normalizedRoomId}`);
                socket.emit('error', { message: `Player name "${name}" is already taken. Please choose a different name.` });
                return;
            }
            
            console.log(`Player ${socket.id} joining existing room ${normalizedRoomId} with ${joinedRoom.players.length} players`);
        }
          // Add player to room
        const player = {
            id: socket.id,
            name,
            color,
            isHost: joinedRoom.host === socket.id
        };
        
        joinedRoom.players.push(player);
        socket.join(joinedRoom.id);
        
        // Store room ID and player name on socket for disconnect handling
        socket.roomId = joinedRoom.id;
        socket.playerName = name;
        
        console.log(`Player ${socket.id} joined room ${joinedRoom.id}`);
          // Notify player they've joined
        socket.emit('room:joined', {
            roomId: joinedRoom.id,
            isHost: player.isHost,
            players: joinedRoom.players
        });
        
        // Notify other players in the room
        socket.to(joinedRoom.id).emit('room:player_joined', player);
    });
    
    // Room leave handler
    socket.on('room:leave', () => {
        const roomId = findPlayerRoom(socket.id);
        if (!roomId) return;
        
        const room = rooms.get(roomId);
        if (!room) return;

        // Check if player is the host and game hasn't started yet
        const isHost = room.host === socket.id;
        const gameNotStarted = !room.gameInProgress;
        
        // Find the leaving player before removing them from the array
        const leavingPlayer = room.players.find(p => p.id === socket.id);
        const playerName = leavingPlayer ? leavingPlayer.name : 'Unknown player';
        
        // Remove player from room
        room.players = room.players.filter(p => p.id !== socket.id);
        
        // Special case: If the host is leaving before the game starts, close the room
        if (isHost && gameNotStarted) {
            console.log(`Host ${socket.id} (${playerName}) quit room ${roomId} before game start - closing room`);
            
            // Notify all players that the room is being closed because host left
            io.to(roomId).emit('room:closed', { 
                reason: 'host_left',
                message: 'Room closed because the host left',
                hostName: playerName
            });
            
            // Force all remaining players to leave the socket.io room
            for (const player of room.players) {
                const playerSocket = io.sockets.sockets.get(player.id);
                if (playerSocket) {
                    playerSocket.leave(roomId);
                    // Clean up socket data for other players too
                    playerSocket.roomId = null;
                    playerSocket.playerName = null;
                }
            }
            
            // Remove the room
            rooms.delete(roomId);
            console.log(`Room ${roomId} removed (host left before game start)`);
        } else {
            // Standard case: Regular player leaving or host leaving during game
            console.log(`Player ${socket.id} (${playerName}) left room ${roomId}`);
            
            // Notify other players
            socket.to(roomId).emit('room:player_left', {
                id: socket.id,
                name: playerName
            });
            
            // If room is empty, remove it
            if (room.players.length === 0) {
                rooms.delete(roomId);
                console.log(`Room ${roomId} removed (empty)`);
                return;
            }
            
            // If host left during game, assign new host
            if (isHost && room.players.length > 0) {
                const newHost = room.players[0].id;
                room.host = newHost;
                
                // Update player as new host
                const hostPlayer = room.players.find(p => p.id === newHost);
                if (hostPlayer) {
                    hostPlayer.isHost = true;
                    
                    // Notify new host
                    io.to(newHost).emit('room:host_changed', { isHost: true });
                    
                    // Notify all players about the new host
                    io.to(roomId).emit('room:host_changed', { 
                        host: newHost,
                        hostName: hostPlayer.name
                    });
                }
            }
        }
        
        // Leave the socket.io room
        socket.leave(roomId);
        
        // Clean up socket data
        socket.roomId = null;
        socket.playerName = null;
    });
    
    // Game start handler
    socket.on('game:start', () => {
        const roomId = findPlayerRoom(socket.id);
        if (!roomId) return;
        
        const room = rooms.get(roomId);
        
        // Only host can start the game
        if (room.host !== socket.id) {
            return;
        }
        
        // Minimum 2 players required
        if (room.players.length < 2) {
            socket.emit('error', { message: 'Need at least 2 players to start' });
            return;
        }
        
        // Start the game
        room.gameInProgress = true;
        room.gameStarted = true;
          // Notify all players in the room
        io.to(roomId).emit('game:start', {
            players: room.players
        });
    });
    
    // Game action handler (pause, resume, quit)
    socket.on('game:action', (data) => {
        const { action } = data;
        const roomId = findPlayerRoom(socket.id);
        if (!roomId) return;
        
        const room = rooms.get(roomId);
        if (!room || !room.gameInProgress) return;
        
        // Process action
        switch (action) {
            case 'pause':
                io.to(roomId).emit('game:pause', { playerId: socket.id });
                break;
            case 'resume':
                io.to(roomId).emit('game:resume', { playerId: socket.id });
                break;            
                case 'quit':
                // Find player data to include name
                const quittingPlayer = room.players.find(p => p.id === socket.id);
                
                // Check if there will be enough remaining players to continue
                if (room.players.length <= 2) {  // This means only one player will be left after this player quits
                    room.gameInProgress = false;
                    room.gameStarted = false;
                    io.to(roomId).emit('game:end', { 
                        playerId: socket.id, 
                        reason: 'quit',
                        playerName: quittingPlayer ? quittingPlayer.name : 'Unknown player'
                    });
                } else {
                    // Enough players to continue, just notify about the player who quit
                    socket.to(roomId).emit('player:quit', {
                        playerId: socket.id,
                        playerName: quittingPlayer ? quittingPlayer.name : 'Unknown player'
                    });
                    
                    // Send a direct message to the quitting player
                    socket.emit('game:end', { 
                        playerId: socket.id, 
                        reason: 'quit',
                        playerName: quittingPlayer ? quittingPlayer.name : 'Unknown player',
                        localOnly: true
                    });
                }
                break;            
                case 'restart':
                // Only host can restart
                if (room.host === socket.id) {
                    room.gameInProgress = false;
                    room.gameStarted = false;
                    // Find player data to include name
                    const restartingPlayer = room.players.find(p => p.id === socket.id);
                    io.to(roomId).emit('game:restart', {
                        playerId: socket.id,
                        playerName: restartingPlayer ? restartingPlayer.name : 'Unknown player'
                    });
                }
                break;
        }
    });
    
    // Player update handler
    socket.on('player:update', (playerState) => {
        const roomId = findPlayerRoom(socket.id);
        if (!roomId) return;
        
        const room = rooms.get(roomId);
        if (!room || !room.gameInProgress) return;
        
        // Broadcast player state to other players in the room
        socket.to(roomId).emit('player:update', playerState);
    });
    
    // Handle player disconnection
    socket.on('disconnect', () => {
        console.log(`Player disconnected: ${socket.id}`);
        
        // Find the room this player was in
        const roomId = socket.roomId || findPlayerRoom(socket.id);
        
        if (roomId) {
            const room = rooms.get(roomId);
            
            if (room) {
                // Check if player is the host and game hasn't started yet
                const isHost = room.host === socket.id;
                const gameNotStarted = !room.gameInProgress;
                
                // Find the leaving player before removing them from the array
                const leavingPlayer = room.players.find(p => p.id === socket.id);
                const playerName = leavingPlayer ? leavingPlayer.name : (socket.playerName || 'Unknown player');
                
                // Remove player from room
                room.players = room.players.filter(p => p.id !== socket.id);
                
                // Special case: If the host is disconnecting before the game starts, close the room
                if (isHost && gameNotStarted) {
                    console.log(`Host ${socket.id} (${playerName}) disconnected from room ${roomId} before game start - closing room`);
                    
                    // Notify all players that the room is being closed because host left
                    socket.to(roomId).emit('room:closed', { 
                        reason: 'host_disconnected',
                        message: 'Room closed because the host disconnected',
                        hostName: playerName
                    });
                    
                    // Force all remaining players to leave the socket.io room
                    for (const player of room.players) {
                        const playerSocket = io.sockets.sockets.get(player.id);
                        if (playerSocket) {
                            playerSocket.leave(roomId);
                            playerSocket.roomId = null;
                            playerSocket.playerName = null;
                        }
                    }
                    
                    // Remove the room
                    rooms.delete(roomId);
                    console.log(`Room ${roomId} removed (host disconnected before game start)`);
                } else {
                    // Standard case: Regular player disconnecting or host disconnecting during game
                    console.log(`Player ${socket.id} (${playerName}) disconnected from room ${roomId}`);
                    
                    // Notify other players
                    socket.to(roomId).emit('room:player_left', { 
                        id: socket.id,
                        name: playerName
                    });
                    
                    // If room is empty, remove it
                    if (room.players.length === 0) {
                        rooms.delete(roomId);
                        console.log(`Room ${roomId} removed (empty)`);
                    } else if (isHost && room.players.length > 0) {
                        // Host left during game, assign new host
                        const newHost = room.players[0];
                        room.host = newHost.id;
                        room.hostName = newHost.name;
                        
                        // Update player as new host
                        newHost.isHost = true;
                        
                        // Notify new host
                        io.to(newHost.id).emit('room:host_changed', { isHost: true });
                        
                        // Notify all players about the new host
                        socket.to(roomId).emit('room:host_changed', { 
                            host: newHost.id,
                            hostName: newHost.name
                        });
                        
                        console.log(`New host for room ${roomId}: ${newHost.id} (${newHost.name})`);
                    }
                    
                    // If game is in progress and there are enough players left (more than 1)
                    if (room.gameInProgress && room.players.length >= 2) {
                        // Game should continue, inform remaining players about the disconnection
                        socket.to(roomId).emit('player:quit', { 
                            playerId: socket.id,
                            playerName: playerName
                        });
                    } else if (room.gameInProgress) {
                        // Not enough players left, end the game
                        room.gameInProgress = false;
                        room.gameStarted = false;
                        socket.to(roomId).emit('game:end', { 
                            playerId: socket.id, 
                            reason: 'quit',
                            playerName: playerName
                        });
                    }
                }
                
                // Clean up socket data
                socket.roomId = null;
                socket.playerName = null;
            }
        }
    });
    
    // Handle request for active rooms
    socket.on('room:list', () => {
        const activeRooms = getActiveRooms();
        socket.emit('room:list', activeRooms);
        console.log(`Player ${socket.id} requested room list. Found ${activeRooms.length} active rooms.`);
    });
});

/**
 * Generate a unique room ID
 * @returns {string} Room ID
 */
function generateRoomId() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    
    // Generate a 6-character code
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    // Check if already exists
    if (rooms.has(result)) {
        return generateRoomId(); // Try again
    }
    
    return result;
}

/**
 * Create a new game room
 * @param {string} roomId - Room ID
 * @returns {Object} Room object
 */
function createRoom(roomId) {
    const room = {
        id: roomId,
        host: null,
        hostName: null,
        players: [],
        gameInProgress: false,
        gameStarted: false,
        createdAt: Date.now()
    };
    
    rooms.set(roomId, room);
    console.log(`Room ${roomId} created`);
    
    return room;
}

/**
 * Find which room a player is in
 * @param {string} playerId - Player socket ID
 * @returns {string|null} Room ID or null
 */
function findPlayerRoom(playerId) {
    for (const [roomId, room] of rooms.entries()) {
        if (room.players.some(p => p.id === playerId)) {
            return roomId;
        }
    }
    return null;
}

// Clean up old rooms periodically (every 5 minutes)
setInterval(() => {
    const now = Date.now();
    let roomsRemoved = 0;
    
    for (const [roomId, room] of rooms.entries()) {
        let shouldRemove = false;
        
        // Remove rooms inactive for more than 2 hours
        if (now - room.createdAt > 2 * 60 * 60 * 1000 && !room.gameInProgress) {
            shouldRemove = true;
        }
        
        // Remove rooms where all players have disconnected (ghost rooms)
        if (room.players.length > 0) {
            const connectedPlayers = room.players.filter(player => {
                const socket = io.sockets.sockets.get(player.id);
                return socket && socket.connected;
            });
            
            if (connectedPlayers.length === 0) {
                console.log(`Found ghost room ${roomId} with ${room.players.length} disconnected players`);
                shouldRemove = true;
            } else if (connectedPlayers.length < room.players.length) {
                // Remove disconnected players from the room
                const disconnectedCount = room.players.length - connectedPlayers.length;
                room.players = connectedPlayers;
                console.log(`Removed ${disconnectedCount} disconnected players from room ${roomId}`);
                
                // If host was disconnected, assign new host
                if (connectedPlayers.length > 0 && !connectedPlayers.some(p => p.id === room.host)) {
                    const newHost = connectedPlayers[0];
                    room.host = newHost.id;
                    room.hostName = newHost.name;
                    newHost.isHost = true;
                    
                    // Notify new host
                    io.to(newHost.id).emit('room:host_changed', { isHost: true });
                    
                    // Notify all players about the new host
                    io.to(roomId).emit('room:host_changed', { 
                        host: newHost.id,
                        hostName: newHost.name
                    });
                    
                    console.log(`Assigned new host for room ${roomId}: ${newHost.id} (${newHost.name})`);
                }
            }
        }
        
        if (shouldRemove) {
            rooms.delete(roomId);
            roomsRemoved++;
        }
    }
    
    if (roomsRemoved > 0) {
        console.log(`Cleaned up ${roomsRemoved} inactive/ghost rooms`);
    }
}, 5 * 60 * 1000);

// Set port (default: 3000)
const PORT = process.env.PORT || 3000;

// Start server
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

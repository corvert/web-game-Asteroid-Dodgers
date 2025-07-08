/**
 * Networking class for handling multiplayer communication
 */
class NetworkManager {
    constructor() {
        this.socket = null;
        this.roomId = null;
        this.isHost = false;
        this.playerId = null;
        this.players = new Map();
        this.usedPlayerNames = new Set(); // Track player names for validation
        
        // Event callbacks
        this.callbacks = {
            onConnect: null,
            onDisconnect: null,
            onError: null,
            onJoinRoom: null,
            onPlayerJoined: null,
            onPlayerLeft: null,
            onHostChanged: null,
            onGameStart: null,
            onGameEnd: null,
            onGameRestart: null,
            onPlayerUpdate: null,
            onPause: null,
            onResume: null,
            onRoomClosed: null
        };
        
        // Network state
        this.isConnected = false;
        this.updateRate = 50; // ms between state updates
        this.updateInterval = null;
    }
    
    /**
     * Connect to socket server
     */
    connectToServer() {
        // Get WebSocket server URL
        const protocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
        const host = window.location.hostname === 'localhost' 
            ? 'localhost:3000'
            : window.location.host;
        
        const serverUrl = `${protocol}${host}`;
        
        return this.connect(serverUrl);
    }
    
    /**
     * Request list of active game rooms
     * @returns {Promise} Promise resolving with room list
     */
    getActiveRooms() {
        return new Promise((resolve, reject) => {
            if (!this.socket || !this.isConnected) {
                reject(new Error('Not connected to server'));
                return;
            }
            
            // Set up one-time handler for the response
            this.socket.once('room:list', (rooms) => {
                console.log(`Received ${rooms.length} active rooms from server`);
                resolve(rooms);
            });
            
            // Request the room list
            this.socket.emit('room:list');
            
            // Set timeout in case the server doesn't respond
            setTimeout(() => {
                // Check if the handler is still registered
                if (this.socket.hasListeners('room:list')) {
                    this.socket.off('room:list'); // Remove our listener
                    reject(new Error('Server timeout requesting room list'));
                }
            }, 5000);
        });
    }
    
    /**
     * Initialize socket connection
     * @param {string} serverUrl - WebSocket server URL
     * @returns {Promise} Promise resolving when connected
     */
    connect(serverUrl) {
        return new Promise((resolve, reject) => {
            try {
                console.log(`Attempting to connect to server: ${serverUrl}`);
                
                // Connect to socket server with enhanced options
                this.socket = io(serverUrl, {
                    reconnection: true,
                    reconnectionAttempts: 5,
                    reconnectionDelay: 1000,
                    reconnectionDelayMax: 5000,
                    timeout: 20000,
                    transports: ['websocket', 'polling'],
                    forceNew: true,
                    autoConnect: true
                });
                
                // Add connection timeout
                const connectionTimeout = setTimeout(() => {
                    console.warn('Connection timeout - server may be unreachable');
                    if (!this.isConnected) {
                        reject(new Error('Connection timeout'));
                    }
                }, 10000);
                
                // Set up event listeners
                this.setupSocketListeners();
                
                // Handle successful connection
                this.socket.on('connect', () => {
                    clearTimeout(connectionTimeout);
                    console.log('Connected to server');
                    this.isConnected = true;
                    this.playerId = this.socket.id;
                    
                    if (this.callbacks.onConnect) {
                        this.callbacks.onConnect(this.playerId);
                    }
                    
                    resolve();
                });
                
                // Handle connection error
                this.socket.on('connect_error', (error) => {
                    clearTimeout(connectionTimeout);
                    console.error('Connection error:', error);
                    
                    if (this.callbacks.onError) {
                        this.callbacks.onError('connection', error.message || 'Failed to connect to server');
                    }
                    
                    reject(error);
                });
            } catch (err) {
                console.error('Failed to initialize socket:', err);
                reject(err);
            }
        });
    }
    
    /**
     * Set up socket event listeners
     */
    setupSocketListeners() {
        // Handle any errors from the server
        this.socket.on('error', (errorData) => {
            console.error('Server error:', errorData);
            
            if (this.callbacks.onError) {
                this.callbacks.onError('server', errorData.message || 'Unknown server error');
            }
        });
        
        // Disconnection
        this.socket.on('disconnect', (reason) => {
            console.log('Disconnected from server:', reason);
            this.isConnected = false;
            
            if (this.callbacks.onDisconnect) {
                this.callbacks.onDisconnect(reason);
            }
        });
        
        // Room events
        this.socket.on('room:joined', (data) => {
            console.log('Joined room:', data);
            this.roomId = data.roomId;
            this.isHost = data.isHost;
            console.log(`Room joined - isHost status: ${this.isHost}`);
            
            // Update the used player names set
            this.usedPlayerNames.clear();
            
            // Add all existing player names to the set
            if (data.players && Array.isArray(data.players)) {
                data.players.forEach(player => {
                    this.players.set(player.id, player);
                    this.usedPlayerNames.add(player.name.toLowerCase());
                });
            }
            
            if (this.callbacks.onJoinRoom) {
                this.callbacks.onJoinRoom(data.roomId, data.isHost, data.players);
            }
        });
        
        this.socket.on('room:player_joined', (playerData) => {
            console.log('Player joined:', playerData);
            this.players.set(playerData.id, playerData);
            this.usedPlayerNames.add(playerData.name.toLowerCase());
            
            if (this.callbacks.onPlayerJoined) {
                this.callbacks.onPlayerJoined(playerData);
            }
        });
          this.socket.on('room:player_left', (playerData) => {
            console.log('Player left:', playerData);
            
            // Handle both old format (just ID) and new format (object with ID and name)
            const playerId = typeof playerData === 'object' ? playerData.id : playerData;
            const playerName = typeof playerData === 'object' ? playerData.name : null;
            
            // Remove player name from used names list
            const player = this.players.get(playerId);
            if (player) {
                this.usedPlayerNames.delete(player.name.toLowerCase());
            }
            
            this.players.delete(playerId);
            
            if (this.callbacks.onPlayerLeft) {
                this.callbacks.onPlayerLeft(playerId, playerName);
            }
        });
        
        // Handle host change event
        this.socket.on('room:host_changed', (data) => {
            console.log('Host changed event received:', data);
            
            // Update host status based on whether this player is the new host
            if (data.host === this.playerId) {
                this.isHost = true;
                console.log('You are now the host!');
            } else {
                this.isHost = false;
                console.log('You are not the host. New host ID:', data.host);
            }
            
            // Update UI and notify other components of host change
            if (this.callbacks.onHostChanged) {
                this.callbacks.onHostChanged(data.host, data.hostName);
            }
        });

        this.socket.on('game:start', (data) => {
            console.log('Game starting:', data);
            
            if (this.callbacks.onGameStart) {
                this.callbacks.onGameStart(data);
            }
        });
        
        this.socket.on('game:end', (data) => {
            console.log('Game ended:', data);
            
            if (this.callbacks.onGameEnd) {
                this.callbacks.onGameEnd(data);
            }
        });
        
        this.socket.on('game:pause', (data) => {
            console.log('Game paused by:', data.playerId);
            
            if (this.callbacks.onPause) {
                this.callbacks.onPause(data.playerId);
            }
        });
        
        this.socket.on('game:resume', (data) => {
            console.log('Game resumed by:', data.playerId);
            
            if (this.callbacks.onResume) {
                this.callbacks.onResume(data.playerId);
            }
        });          // Add game restart event handling
        this.socket.on('game:restart', (data) => {
            console.log('Game restart event received from server', data);
            
            if (this.callbacks.onGameRestart) {
                console.log('Calling onGameRestart callback');
                this.callbacks.onGameRestart(data);
            } else {
                console.error('No onGameRestart callback registered');
            }
        });
        
        // Handle player quit event (when a player quits but game continues)
        this.socket.on('player:quit', (data) => {
            console.log('Player quit event received:', data);
            
            // Remove player from the players list
            if (data && data.playerId) {
                this.players.delete(data.playerId);
                
                // If callback exists, notify application
                if (this.callbacks.onPlayerLeft) {
                    this.callbacks.onPlayerLeft(data.playerId, data.playerName);
                }
            }
        });

        // Handle room closed event (when host quits before game starts)
        this.socket.on('room:closed', (data) => {
            console.log('Room closed event received:', data);
            
            // Clear room state
            this.roomId = null;
            this.players.clear();
            this.usedPlayerNames.clear();
            
            // If callback exists, notify application
            if (this.callbacks.onRoomClosed) {
                this.callbacks.onRoomClosed(data);
            } else {
                // Fallback to onError if no specific callback is registered
                if (this.callbacks.onError) {
                    this.callbacks.onError('room', data.message || 'Room was closed');
                }
            }
        });
        
        // State updates
        this.socket.on('player:update', (playerState) => {
            if (this.callbacks.onPlayerUpdate) {
                this.callbacks.onPlayerUpdate(playerState);
            }
        });
    }
    
    /**
     * Check if a player name is valid and available in current room
     * @param {string} name - Name to check
     * @returns {boolean} True if the name is valid and available
     */
    isPlayerNameAvailable(name) {
        if (!name || name.trim() === '') return false;
        
        // Check if this name is already in use
        return !this.usedPlayerNames.has(name.toLowerCase());
    }
    
    /**
     * Create or join a room
     * @param {string} playerName - Player's display name
     * @param {string} [roomId] - Room ID to join (optional, creates new room if not provided)
     * @returns {boolean} Whether the join request was sent
     */
    joinRoom(playerName, roomId = null) {
        if (!this.isConnected) {
            console.error('Cannot join room: Not connected to server');
            return false;
        }
        
        // Check name before sending to server
        if (!playerName || playerName.trim() === '') {
            if (this.callbacks.onError) {
                this.callbacks.onError('validation', 'Player name is required');
            }
            return false;
        }
        
        // Ensure room ID is properly formatted
        const cleanRoomId = roomId ? roomId.trim().toUpperCase() : null;
        
        console.log(`Networking: ${cleanRoomId ? 'Joining existing room: ' + cleanRoomId : 'Creating new room'}`);
        
        // Reset host status when joining a new room
        this.isHost = false;
        
        this.socket.emit('room:join', {
            name: playerName,
            roomId: cleanRoomId,
            color: Utils.generateColor()
        });
        
        return true;
    }
    
    /**
     * Leave the current room
     */
    leaveRoom() {
        if (!this.isConnected || !this.roomId) return;
        
        this.socket.emit('room:leave');
        this.roomId = null;
        this.isHost = false;
        this.players.clear();
        this.usedPlayerNames.clear();
    }
    
    /**
     * Start game as host
     */
    startGame() {
        if (!this.isConnected || !this.roomId || !this.isHost) return;
        
        this.socket.emit('game:start');
    }
      /**
     * Send game action (pause/resume/quit/restart)
     * @param {string} action - Action type ('pause', 'resume', 'quit', 'restart')
     */
    sendGameAction(action) {
        if (!this.isConnected || !this.roomId) return;
        
        console.log(`Sending game action to server: ${action}`);
        this.socket.emit('game:action', { action });
    }
    
    /**
     * Start sending regular player state updates
     * @param {Function} getPlayerState - Function that returns current player state
     */
    startStateUpdates(getPlayerState) {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        
        this.updateInterval = setInterval(() => {
            if (!this.isConnected || !this.roomId) return;
            
            const playerState = getPlayerState();
            if (playerState) {
                this.socket.emit('player:update', playerState);
            }
        }, this.updateRate);
    }
    
    /**
     * Stop sending state updates
     */
    stopStateUpdates() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }
    
    /**
     * Get player by ID
     * @param {string} playerId - Player ID to look up
     * @returns {Object|null} Player data or null if not found
     */
    getPlayer(playerId) {
        return this.players.get(playerId) || null;
    }
    
    /**
     * Get all players in current room
     * @returns {Array} Array of player objects
     */
    getAllPlayers() {
        return Array.from(this.players.values());
    }
    
    /**
     * Register event callbacks
     * @param {Object} callbacks - Callback functions
     */
    registerCallbacks(callbacks) {
        this.callbacks = { ...this.callbacks, ...callbacks };
    }
    
    /**
     * Disconnect from the server
     */
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        
        this.isConnected = false;
        this.roomId = null;
        this.isHost = false;
        this.players.clear();
        this.usedPlayerNames.clear();
    }
}

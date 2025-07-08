/**
 * Main application entry point
 */
class AsteroidDodgers {    constructor() {
        // Initialize components
        this.ui = new UIManager();
        this.game = new Game();
        this.network = new NetworkManager();
        // Configuration
        this.config = {
            // Use local server by default when running locally
            serverUrl: window.location.hostname === 'localhost' ? 
                window.location.origin : 'https://multiplayer-game-server.glitch.me', // WebSocket server URL
        };
        
        // Flag for local game debugging without server
        // We're setting this to false by default to enable proper multiplayer
        this.debugLocalGame = false;
    }
    
    /**
     * Initialize the application
     */
    async init() {
        console.log('Initializing Asteroid Dodgers...');
        
        // Show loading screen
        this.ui.showLoading('Initializing game...');
        
        // Initialize audio system
        try {
            await AudioSystem.init();
        } catch (error) {
            console.warn('Audio initialization failed:', error);
        }
        
        // Initialize game with game area element
        this.game.init(this.ui.elements.gameArea);
        
        // Initialize network connection
        try {
            await this.network.connectToServer();
            // Initialize room selection once connected
            this.ui.initRoomSelection(this.network);
        } catch (error) {
            console.warn('Network initialization failed:', error);        }
        
        // Register UI callbacks
        this.ui.registerCallbacks({
            onJoinGame: this.handleJoinGame.bind(this),
            onStartGame: this.handleStartGame.bind(this),
            onResumeGame: this.handleResumeGame.bind(this),
            onRestartGame: this.handleRestartGame.bind(this),
            onQuitGame: this.handleQuitGame.bind(this),
            onPlayAgain: this.handlePlayAgain.bind(this),
            onLeaveRoom: this.handleLeaveRoom.bind(this)
        });
        
        // Register game callbacks
        this.game.registerCallbacks({
            onGameOver: this.handleGameOver.bind(this),
            onScoreUpdate: this.handleScoreUpdate.bind(this),
            onPlayerHit: this.handlePlayerHit.bind(this),
            onTimeUpdate: this.handleTimeUpdate.bind(this),
            onPause: this.handleGamePause.bind(this),
            onResume: this.handleGameResume.bind(this)        });
        
        // Register network callbacks
        this.network.registerCallbacks({
            onConnect: this.handleNetworkConnect.bind(this),
            onDisconnect: this.handleNetworkDisconnect.bind(this),
            onError: this.handleNetworkError.bind(this),
            onJoinRoom: this.handleRoomJoined.bind(this),
            onPlayerJoined: this.handlePlayerJoined.bind(this),
            onPlayerLeft: this.handlePlayerLeft.bind(this),
            onHostChanged: this.handleHostChanged.bind(this),
            onGameStart: this.handleGameStartEvent.bind(this),
            onGameEnd: this.handleGameEndEvent.bind(this),
            onGameRestart: this.handleGameRestart.bind(this),
            onPlayerUpdate: this.handlePlayerUpdate.bind(this),
            onPause: this.handleGamePause.bind(this),
            onResume: this.handleGameResume.bind(this),
            onRoomClosed: this.handleRoomClosed.bind(this)
        });
        
        // Connect to multiplayer server
        if (!this.debugLocalGame) {
            try {
                this.ui.showLoading('Connecting to server...');
                console.log(`Attempting to connect to server at ${this.config.serverUrl}`);
                
                // Try to connect with a timeout
                const connectionPromise = this.network.connect(this.config.serverUrl);
                
                // Set a timeout for the connection attempt
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('Connection timed out')), 8000);
                });
                
                // Race the connection against the timeout
                await Promise.race([connectionPromise, timeoutPromise]);
                
                console.log('Successfully connected to multiplayer server');
            } catch (error) {
                console.error('Failed to connect to server:', error);
                this.ui.showConnectionStatus('Failed to connect to game server. Running in local mode.', 'error');
                this.debugLocalGame = true;
            }
        } else {
            console.log('Running in local debug mode, no server connection will be attempted');
        }
        
        // Show join screen
        this.ui.showJoinScreen();
    }
      /**
     * Handle user joining or creating a game
     * @param {string} playerName - Player's display name
     * @param {string|null} roomId - Room ID to join or null to create
     */    handleJoinGame(playerName, roomId) {
        // First, validate that the player name is unique
        if (!this.isPlayerNameUnique(playerName)) {
            this.ui.showConnectionStatus(`The name "${playerName}" is already taken. Please choose a different name.`, 'error');
            this.ui.showNameValidationState(false);
            AudioSystem.play('error');
            return;
        }
        
        // Reset host status in UI before joining a new room
        this.ui.resetHostStatus();
        
        if (this.debugLocalGame) {
            // Local testing mode - create a local game
            this.createLocalGame(playerName);
            return;
        }
        
        // Network mode - join or create room via server
        this.ui.showConnectionStatus('Joining game...', 'info');
        
        // Save player name to session storage
        sessionStorage.setItem('playerName', playerName);
        
        // Clean up and validate the room ID
        const cleanRoomId = roomId ? roomId.trim().toUpperCase() : null;
        
        // Log the connection attempt for debugging
        console.log(`Attempting to ${cleanRoomId ? 'join room ' + cleanRoomId : 'create new room'} with player: ${playerName}`);
        
        // Join room with validated ID
        if (!this.network.joinRoom(playerName, cleanRoomId)) {
            // If joinRoom returned false, there was a validation issue
            // The error will be handled in the onError callback
            return;
        }
    }/**
     * Create a local game for testing without server
     * @param {string} playerName - Player's display name
     */    createLocalGame(playerName) {
        // Name uniqueness is already checked in handleJoinGame
        
        // Save player name to session storage for potential restart
        sessionStorage.setItem('playerName', playerName);
        
        // Create local player
        const playerId = 'local-' + Utils.generateId();
        const player = this.game.addPlayer({
            id: playerId,
            name: playerName,
            color: Utils.generateColor(),
            isLocal: true
        });
        
        // Add some AI players for testing
        const aiPlayers = [
            this.game.addPlayer({
                id: 'ai-1',
                name: 'Bot-1',
                color: Utils.generateColor(),
                isLocal: false
            }),
            this.game.addPlayer({
                id: 'ai-2',
                name: 'Bot-2',
                color: Utils.generateColor(),
                isLocal: false
            })
        ];
        
        // Start updating AI players
        this.aiUpdateInterval = setInterval(() => {
            aiPlayers.forEach(ai => {
                // Random movement
                if (Math.random() > 0.95) ai.keys.left = !ai.keys.left;
                if (Math.random() > 0.95) ai.keys.right = !ai.keys.right;
                if (Math.random() > 0.9) ai.keys.up = !ai.keys.up;
                if (Math.random() > 0.98) ai.keys.down = !ai.keys.down;
                
                ai.needsUpdate = true;
            });
        }, 100);
        
        // Show waiting room with fake room ID
        const roomId = Utils.generateId();
        this.ui.showWaitingRoom(roomId, true);
        
        // Update players list
        const players = [
            { id: playerId, name: playerName, color: player.color },
            { id: 'ai-1', name: 'Bot-1', color: aiPlayers[0].color },
            { id: 'ai-2', name: 'Bot-2', color: aiPlayers[1].color }
        ];
        
        this.ui.updatePlayersList(players, playerId);
        
        // Mock connection status
        this.ui.showConnectionStatus('Local game created. Press Start to begin.', 'success');
    }
    
    /**
     * Handle user starting the game
     */
    handleStartGame() {
        if (this.debugLocalGame) {
            // Start local game
            this.ui.showGameScreen();
            this.game.startGame();
        } else {
            // Start network game
            this.network.startGame();
        }
    }
      /**
     * Handle user resuming a paused game
     */
    handleResumeGame() {
        if (this.debugLocalGame) {
            // Resume local game - specify localPlayerId and that it's a local event
            this.game.togglePause(this.game.localPlayerId, false);
        } else {
            // Resume network game
            this.network.sendGameAction('resume');
        }
    }
      /**     * Handle user quitting the game
     */
    handleQuitGame() {
        if (!this.debugLocalGame && this.game.isRunning) {
            // Notify other players that this player is quitting
            this.network.sendGameAction('quit');
        }
        
        // Stop any active game
        this.game.reset();
        
        // Clean up AI if running
        if (this.aiUpdateInterval) {
            clearInterval(this.aiUpdateInterval);
            this.aiUpdateInterval = null;
        }
        
        if (!this.debugLocalGame) {
            // Leave network room
            this.network.leaveRoom();
        }
        
        // Ensure the game menu is hidden
        this.ui.hideMenu();
        
        // Go back to join screen
        this.ui.showJoinScreen();
    }/**
     * Handle play again request
     */
    handlePlayAgain() {
        // Immediately hide the game over screen for better user experience
        this.ui.hideAllScreens();
        
        if (this.debugLocalGame) {
            // Stop AI update interval if it exists
            if (this.aiUpdateInterval) {
                clearInterval(this.aiUpdateInterval);
                this.aiUpdateInterval = null;
            }
            
            // Reset game state
            this.game.reset();
            
            // Get the player name from previous game if available
            const playerName = sessionStorage.getItem('playerName') || 'Player';
            
            // Create a new local game with the same player name
            this.createLocalGame(playerName);
            
            console.log('Local game restarted with player: ' + playerName);
        } else {
            // Network mode: Go back to waiting room
            if (this.network.isHost) {
                // Only host can send the restart action
                console.log('Host requesting game restart');
                // Show loading status while waiting for server response
                this.ui.showLoading('Restarting game...');
                this.network.sendGameAction('restart');
            } else {
                // Don't show the join screen for non-host players, keep them in the game
                // Instead, show a notification that only the host can restart
                console.log('Non-host player requesting restart - informing that only host can restart');
                
                // Show game over screen again if it was hidden
                this.ui.showGameOver(this.game.lastWinner, this.game.lastScores, this.network.isHost, false);
                
                // Show notification message
                this.ui.showGameNotification('Only the host can restart the game', 5000);
                
                // Play notification sound
                AudioSystem.play('error');
            }
        }
    }
    
    /**
     * Handle restart game action from the pause menu
     * Uses the same functionality as handlePlayAgain but specifically from the pause menu
     */
    handleRestartGame() {
        console.log('Game restart requested from pause menu');
        
        // Play the restart sound
        AudioSystem.play('restart');
        
        // In network mode, check if player is host
        if (!this.debugLocalGame && !this.network.isHost) {
            // Non-host players should stay in the game and show a message
            this.ui.hideMenu();
            this.ui.showGameNotification('Only the host can restart the game', 5000);
            AudioSystem.play('error');
            return;
        }
        
        // Use the existing play again handler for actual restart logic
        this.handlePlayAgain();
        
        // In local mode, we need to immediately start the game since we're not waiting for host
        if (this.debugLocalGame) {
            this.game.start();
        }
    }
      /**
     * Handle game over event
     * @param {string} winnerId - ID of the winning player
     * @param {Array} scores - Final player scores
     */
    handleGameOver(winnerId, scores) {
        const winner = scores.find(p => p.id === winnerId) || scores[0];
        
        // Pass host status and local game flag to UI
        const isHost = !this.debugLocalGame && this.network.isHost;
        this.ui.showGameOver(winner, scores, isHost, this.debugLocalGame);
        
        // Stop network updates
        if (!this.debugLocalGame) {
            this.network.stopStateUpdates();
        }
    }
    
    /**
     * Handle score updates
     * @param {Array} scores - Updated player scores
     */
    handleScoreUpdate(scores) {
        this.ui.updateScoreboard(scores);
    }
    
    /**
     * Handle player hit event
     * @param {string} playerId - ID of the hit player
     * @param {boolean} isDead - Whether the player died
     */
    handlePlayerHit(playerId, isDead) {
        // Additional hit effects could be added here
    }
    
    /**
     * Handle game timer updates
     * @param {number} seconds - Game time in seconds
     */
    handleTimeUpdate(seconds) {
        this.ui.updateTimer(seconds);
    }
    
    /**
     * Handle successful network connection
     * @param {string} playerId - Server-assigned player ID
     */
    handleNetworkConnect(playerId) {
        console.log('Connected with ID:', playerId);
        this.ui.showConnectionStatus('Connected to server', 'success');
    }
    
    /**
     * Handle network disconnection
     * @param {string} reason - Reason for disconnect
     */
    handleNetworkDisconnect(reason) {
        this.ui.showConnectionStatus(`Disconnected: ${reason}`, 'error');
        
        // Reset to join screen
        this.handleQuitGame();
    }
      /**
     * Handle network error
     * @param {string} type - Error type
     * @param {string} message - Error message
     */    handleNetworkError(type, message) {
        console.error(`Network error (${type}): ${message}`);
        
        // For room errors, provide more user-friendly messages
        if (type === 'server' || type === 'validation') {
            // If debug mode was enabled because of a previous connection error, disable it
            if (message.includes('Room') && this.debugLocalGame) {
                this.debugLocalGame = false;
                console.log('Disabled debug mode to allow proper room joining');
            }
            
            // Show specific error guidance
            if (message.includes('Room not found')) {
                this.ui.showConnectionStatus('Room ID not found. Please check the code and try again.', 'error');
            } else if (message.includes('already taken') || message.includes('already exists')) {
                // Handle duplicate name errors
                this.ui.showConnectionStatus(message, 'error');
                // Play error sound
                AudioSystem.play('error');
            } else if (message.includes('Room is full')) {
                this.ui.showConnectionStatus('Room is full (maximum 4 players). Try creating a new room.', 'error');
            } else if (message.includes('Game is already in progress')) {
                // Handle game in progress errors
                this.ui.showGameInProgressError('Game is already in progress. Please join another room or create a new one.');
            } else {
                this.ui.showConnectionStatus(`Error: ${message}`, 'error');
            }
        } else {
            // For other error types
            this.ui.showConnectionStatus(`Error: ${message}`, 'error');
        }
    }
    
    /**
     * Handle successful room join
     * @param {string} roomId - Room ID
     * @param {boolean} isHost - Whether the player is the host
     * @param {Array} players - List of players in the room
     */
    handleRoomJoined(roomId, isHost, players) {
        this.ui.showWaitingRoom(roomId, isHost);
        this.ui.updatePlayersList(players, this.network.playerId);
        
        // Explicitly update host controls based on current isHost value
        this.ui.updateHostControls(isHost);
        
        // Sound effect
        AudioSystem.play('join');
    }
    
    /**
     * Handle player joining the room
     * @param {Object} playerData - New player data
     */
    handlePlayerJoined(playerData) {
        // Update the players list
        const players = this.network.getAllPlayers();
        this.ui.updatePlayersList(players, this.network.playerId);
        
        // Sound effect
        AudioSystem.play('join');
    }
    
    /**
     * Handle player leaving the room
     * @param {string} playerId - ID of the player who left
     */    handlePlayerLeft(playerId, playerName) {
        // Update the players list
        const players = this.network.getAllPlayers();
        this.ui.updatePlayersList(players, this.network.playerId);
        
        // Remove player from game if game is running
        if (this.game.isRunning) {
            this.game.removePlayer(playerId);
            
            // Display notification if player left during an active game
            if (playerName) {
                this.ui.showGameNotification(`${playerName} left the game`, 3000);
            }
        }
        
        // Sound effect
        AudioSystem.play('leave');
    }
    
    /**
     * Handle game start event from network
     * @param {Object} data - Game start data
     */
    handleGameStartEvent(data) {
        // Clear any existing game
        this.game.reset();
        
        // Show game screen
        this.ui.showGameScreen();
        
        // Create players from network data
        data.players.forEach(playerData => {
            const isLocal = playerData.id === this.network.playerId;
            
            this.game.addPlayer({
                id: playerData.id,
                name: playerData.name,
                color: playerData.color,
                isLocal: isLocal
            });
        });
        
        // Start sending local player updates
        const localPlayer = this.game.getLocalPlayer();
        if (localPlayer) {
            this.network.startStateUpdates(() => localPlayer.getNetworkState());
        }
        
        // Start the game
        this.game.startGame();
    }
    
    /**
     * Handle game end event from network
     * @param {Object} data - Game end data
     */    handleGameEndEvent(data) {
        // If localOnly flag is set, this is only for the current player who quit
        // and shouldn't affect other players' games
        if (!data.localOnly && this.game.isRunning) {
            this.game.endGame();
            
            // If game ended because a player quit, show notification
            if (data && data.reason === 'quit' && data.playerName) {
                this.ui.showGameNotification(`${data.playerName} quit the game`, 5000);
            }
        } else if (data.localOnly) {
            // Only end the local player's view of the game
            this.game.isRunning = false;
            if (this.game.animationFrameId) {
                cancelAnimationFrame(this.game.animationFrameId);
                this.game.animationFrameId = null;
            }
            
            // Show appropriate UI for the player who quit
            this.ui.showJoinScreen();
        }
    }
    
    /**
     * Handle player state update from network
     * @param {Object} playerState - Updated player state
     */
    handlePlayerUpdate(playerState) {
        // Ignore own updates
        if (playerState.id === this.network.playerId) return;
        
        // Update remote player
        let player = this.game.players.get(playerState.id);
        
        // Create player if it doesn't exist
        if (!player) {
            player = this.game.addPlayer({
                id: playerState.id,
                name: playerState.name,
                color: playerState.color,
                isLocal: false
            });
        }
        
        // Update player state
        player.updateFromNetwork(playerState);
    }    /**
     * Handle game pause event from network
     * @param {string} playerId - ID of the player who paused the game
     * @param {boolean} [isLocalEvent=false] - Whether this event was triggered locally
     */
    handleGamePause(playerId, isLocalEvent = false) {
        // Find player who paused
        const player = this.network.getPlayer(playerId);
        if (!player && !isLocalEvent) return;
        
        // If this is a local event from ESC key, we need to send a network event to all players
        if (isLocalEvent && !this.debugLocalGame) {
            // Send pause action to all players
            this.network.sendGameAction('pause');
        }
        
        // Update game state
        this.game.isPaused = true;
        
        // Show menu
        this.ui.showMenu();
        
        // Show notification if it's not a local event
        if (!isLocalEvent && player) {
            this.ui.showPauseNotification(player.name + ' paused the game');
        }
    }
      /**
     * Handle game resume event from network
     * @param {string} playerId - ID of the player who resumed the game
     * @param {boolean} [isLocalEvent=false] - Whether this event was triggered locally
     */
    handleGameResume(playerId, isLocalEvent = false) {
        // Find player who resumed
        const player = this.network.getPlayer(playerId);
        if (!player && !isLocalEvent) return;
        
        // If this is a local event from ESC key, we need to send a network event to all players
        if (isLocalEvent && !this.debugLocalGame) {
            // Send resume action to all players
            this.network.sendGameAction('resume');
        }
        
        // Update game state
        this.game.isPaused = false;
        
        // Hide menu
        this.ui.hideMenu();
        
        // Show notification if it's not a local event
        if (!isLocalEvent && player) {
            this.ui.showPauseNotification(player.name + ' resumed the game');
        }
    }    /**     * Handle network game restart event
     * @param {Object} data - Restart event data including player information
     */
    handleGameRestart(data) {
        console.log('Handling game restart', data);
        
        // Reset game state
        this.game.reset();
        
        // Play restart sound
        AudioSystem.play('start');
        
        // Explicitly hide the game over screen first
        this.ui.hideAllScreens();
        
        // Show waiting room
        this.ui.showWaitingRoom(this.network.roomId, this.network.isHost);
        
        // Update players list
        const players = Array.from(this.network.players.values());
        this.ui.updatePlayersList(players, this.network.playerId);
        
        // Get player name for notification
        let playerName = 'The host';
        if (data && data.playerName) {
            playerName = data.playerName;
        }
        
        // Show notification for restart
        this.ui.showGameNotification(`Game restarted by ${playerName}`, 5000);
        
        // Show connection status with different messages for host and players
        if (this.network.isHost) {
            this.ui.showConnectionStatus('Game restarted. You can start a new game when ready.', 'success');
        } else {
            this.ui.showConnectionStatus('Game restarted by the host. Waiting for the host to start a new game.', 'info');
        }
    }
    
    /**
     * Check if a player name is unique
     * @param {string} name - Player name to check
     * @returns {boolean} True if the name is unique
     */
    isPlayerNameUnique(name) {
        // For local game mode, check against AI player names
        if (this.debugLocalGame) {
            const aiNames = ['Bot-1', 'Bot-2', 'Bot-3'];
            return !aiNames.map(n => n.toLowerCase()).includes(name.toLowerCase());
        }
        
        // For network mode, check if the name is already used in the current room
        if (this.network.roomId) {
            const players = this.network.getAllPlayers();
            return !players.some(player => player.name.toLowerCase() === name.toLowerCase());
        }
        
        // If not in a room yet, name is considered unique
        return true;
    }
    
    /**
     * Handle room closed event (when host quits before game start)
     * @param {Object} data - Room closed data
     */
    handleRoomClosed(data) {
        // Clear room state
        this.ui.hideWaitingRoom();
        this.ui.showJoinScreen();
        
        // Show notification to the user
        const message = data.hostName ? 
            `Room closed: The host (${data.hostName}) left the game.` : 
            `Room closed: The host left the game.`;
        
        this.ui.showConnectionStatus(message, 'error');
        
        // Sound effect
        AudioSystem.play('error');
    }
    
    /**
     * Handle host changed event (when host quits during game)
     * @param {string} hostId - ID of the new host
     * @param {string} hostName - Name of the new host
     */
    handleHostChanged(hostId, hostName) {
        // Update UI to show new host
        if (this.network.playerId === hostId) {
            // This player is now the host
            this.ui.showGameNotification(`You are now the host!`, 5000);
            
            // Update UI to show host controls if needed
            this.ui.updateHostControls(true);
        } else {
            // Another player is now the host
            this.ui.showGameNotification(`${hostName} is now the host`, 5000);
            
            // Update UI to hide host controls if needed
            this.ui.updateHostControls(false);
        }
        
        // Sound effect for host change
        AudioSystem.play('notification');
    }
    
    /**
     * Handle user leaving the room
     */
    handleLeaveRoom() {
        // Leave the room via network
        this.network.leaveRoom();
        
        // Explicitly reset host status in UI
        this.ui.resetHostStatus();
        
        // Return to join screen
        this.ui.hideWaitingRoom();
        this.ui.showJoinScreen();
        
        // Show status message
        this.ui.showConnectionStatus('You left the room.', 'info');
        
        // Sound effect
        AudioSystem.play('leave');
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const game = new AsteroidDodgers();
    game.init();
});

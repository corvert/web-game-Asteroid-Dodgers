/**
 * UI Manager for handling game user interface
 */
class UIManager {
    constructor() {
        // Screen elements
        this.screens = {
            loading: document.getElementById('loading-screen'),
            join: document.getElementById('join-screen'),
            game: document.getElementById('game-screen'),
            gameOver: document.getElementById('game-over-screen')        };
        
        // UI elements
        this.elements = {
            // Join screen
            playerNameInput: document.getElementById('player-name'),
            roomIdInput: document.getElementById('room-id'),
            createJoinBtn: document.getElementById('create-join-btn'),
            connectionStatus: document.getElementById('connection-status'),
            waitingRoom: document.querySelector('.waiting-room'),
            roomCode: document.getElementById('room-code'),
            playersList: document.getElementById('players-list'),
            startGameBtn: document.getElementById('start-game-btn'),
            leaveRoomBtn: document.getElementById('leave-room-btn'),
            
            // Instructions
            instructionsToggle: document.getElementById('instructions-toggle'),
            instructionsContent: document.getElementById('instructions-content'),
            
            // Room selection
            refreshRoomsBtn: document.getElementById('refresh-rooms-btn'),
            roomDropdown: document.getElementById('room-dropdown'),
            
            // Game screen
            gameArea: document.getElementById('game-area'),
            timer: document.getElementById('timer'),
            scoreboard: document.getElementById('scoreboard'),
              // Game menu
            gameMenu: document.getElementById('game-menu'),
            resumeBtn: document.getElementById('resume-btn'),
            restartBtn: document.getElementById('restart-btn'),
            quitBtn: document.getElementById('quit-btn'),
            
            // Game over screen
            winnerDisplay: document.getElementById('winner-display'),
            finalScores: document.getElementById('final-scores'),
            playAgainBtn: document.getElementById('play-again-btn'),
            exitBtn: document.getElementById('exit-btn')
        };
          // Event callbacks
        this.callbacks = {
            onJoinGame: null,
            onStartGame: null,
            onResumeGame: null,
            onRestartGame: null,
            onQuitGame: null,
            onPlayAgain: null,
            onLeaveRoom: null
        };
        
        // Track active notifications for stacking
        this.activeNotifications = [];
        this.notificationBaseTop = 20; // Base top position in percentage
        this.notificationSpacing = 5;  // Spacing between notifications in percentage
        
        this.init();
    }
    
    /**
     * Initialize UI manager and set up event listeners
     */
    init() {
        // Set up button event listeners
        this.setupEventListeners();
        
        // Try to load stored player name
        const storedName = sessionStorage.getItem('playerName');
        if (storedName) {
            this.elements.playerNameInput.value = storedName;
        }
        
        // Set up orientation change handler
        this.setupOrientationHandler();
    }
    
    /**
     * Set up orientation change handler
     */
    setupOrientationHandler() {
        // Handle orientation changes
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                this.adjustInstructionsForOrientation();
            }, 100);
        });
        
        // Also handle resize events
        window.addEventListener('resize', () => {
            this.adjustInstructionsForOrientation();
        });
        
        // Initial adjustment
        this.adjustInstructionsForOrientation();
    }
    
    /**
     * Adjust instructions display based on current orientation and viewport
     */
    adjustInstructionsForOrientation() {
        const content = this.elements.instructionsContent;
        const container = this.elements.instructionsToggle.parentElement;
        const viewport = window.innerHeight;
        const isLandscape = window.innerWidth > window.innerHeight;
        const isSmallScreen = viewport < 600;
        const isVerySmallScreen = viewport < 500;
        
        if (content && content.classList.contains('show')) {
            let maxHeight;
            
            if (isVerySmallScreen) {
                maxHeight = '20vh';
            } else if (isSmallScreen && isLandscape) {
                maxHeight = '25vh';
            } else if (isLandscape) {
                maxHeight = '35vh';
            } else if (isSmallScreen) {
                maxHeight = '30vh';
            } else {
                maxHeight = '40vh';
            }
            
            content.style.maxHeight = maxHeight;
            
            // Ensure smooth scrolling is enabled
            content.style.scrollBehavior = 'smooth';
        }
        
        // Adjust join screen layout for better button visibility
        const joinScreen = this.screens.join;
        if (joinScreen && (isVerySmallScreen || (isLandscape && isSmallScreen))) {
            joinScreen.style.justifyContent = 'flex-start';
            joinScreen.style.paddingTop = '1rem';
        } else if (joinScreen) {
            joinScreen.style.justifyContent = 'center';
            joinScreen.style.paddingTop = '1rem';
        }
    }
    
    /**
     * Set up UI event listeners
     */
    setupEventListeners() {        // Join screen        // Function to handle join game action
        const handleJoinGameAction = () => {
            const playerName = this.elements.playerNameInput.value.trim();
            const roomId = this.elements.roomIdInput.value.trim() || null;
            
            if (this.validatePlayerName(playerName)) {
                if (this.callbacks.onJoinGame) {
                    // Format room ID to uppercase for consistency
                    const formattedRoomId = roomId ? roomId.trim().toUpperCase() : null;
                    console.log(`UI: Create/Join action: Player=${playerName}, Room=${formattedRoomId || 'NEW'}`);
                    this.callbacks.onJoinGame(playerName, formattedRoomId);
                }
                AudioSystem.play('click');
            }
        };
        
        // Button click handler
        this.elements.createJoinBtn.addEventListener('click', handleJoinGameAction);
        
        // Enter key handlers for input fields
        this.elements.playerNameInput.addEventListener('keyup', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                // If name is filled but room is not focused, focus on room
                if (this.elements.playerNameInput.value.trim() && 
                    document.activeElement !== this.elements.roomIdInput) {
                    this.elements.roomIdInput.focus();
                } else {
                    handleJoinGameAction();
                }
            }
        });
        
        this.elements.roomIdInput.addEventListener('keyup', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                handleJoinGameAction();
            }
        });
        
        this.elements.startGameBtn.addEventListener('click', () => {
            if (this.callbacks.onStartGame) {
                this.callbacks.onStartGame();
            }
            AudioSystem.play('click');
        });
        
        // Leave room button handler
        this.elements.leaveRoomBtn.addEventListener('click', () => {
            if (this.callbacks.onLeaveRoom) {
                this.callbacks.onLeaveRoom();
            }
            AudioSystem.play('click');
        });
          // Game menu
        this.elements.resumeBtn.addEventListener('click', () => {
            if (this.callbacks.onResumeGame) {
                this.callbacks.onResumeGame();
            }
            this.hideMenu();
            AudioSystem.play('click');
        });
        
        this.elements.restartBtn.addEventListener('click', () => {
            if (this.callbacks.onRestartGame) {
                this.callbacks.onRestartGame();
            }
            this.hideMenu();
            AudioSystem.play('click');
        });
          this.elements.quitBtn.addEventListener('click', () => {
            if (this.callbacks.onQuitGame) {
                this.callbacks.onQuitGame();
            }
            this.hideMenu();
            AudioSystem.play('click');
        });
        
        // Game over screen
        this.elements.playAgainBtn.addEventListener('click', () => {
            if (this.callbacks.onPlayAgain) {
                this.callbacks.onPlayAgain();
            }
            AudioSystem.play('click');
        });
          this.elements.exitBtn.addEventListener('click', () => {
            if (this.callbacks.onQuitGame) {
                this.callbacks.onQuitGame();
            }
            this.hideMenu(); // Also hide the menu here to ensure it's not visible
            AudioSystem.play('click');
        });
        
        // Enter key handling for inputs
        this.elements.playerNameInput.addEventListener('keyup', (event) => {
            if (event.key === 'Enter') {
                this.elements.createJoinBtn.click();
            }
        });
        
        this.elements.roomIdInput.addEventListener('keyup', (event) => {
            if (event.key === 'Enter') {
                this.elements.createJoinBtn.click();
            }
        });
        
        // Instructions toggle handler
        this.elements.instructionsToggle.addEventListener('click', () => {
            this.toggleInstructions();
            AudioSystem.play('click');
        });

        // Enter key handlers for input fields
        this.elements.playerNameInput.addEventListener('keyup', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                // If name is filled but room is not focused, focus on room
                if (this.elements.playerNameInput.value.trim() && 
                    document.activeElement !== this.elements.roomIdInput) {
                    this.elements.roomIdInput.focus();
                } else {
                    handleJoinGameAction();
                }
            }
        });
        
        this.elements.roomIdInput.addEventListener('keyup', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                handleJoinGameAction();
            }
        });
        
        this.elements.startGameBtn.addEventListener('click', () => {
            if (this.callbacks.onStartGame) {
                this.callbacks.onStartGame();
            }
            AudioSystem.play('click');
        });
        
        // Leave room button handler
        this.elements.leaveRoomBtn.addEventListener('click', () => {
            if (this.callbacks.onLeaveRoom) {
                this.callbacks.onLeaveRoom();
            }
            AudioSystem.play('click');
        });
          // Game menu
        this.elements.resumeBtn.addEventListener('click', () => {
            if (this.callbacks.onResumeGame) {
                this.callbacks.onResumeGame();
            }
            this.hideMenu();
            AudioSystem.play('click');
        });
        
        this.elements.restartBtn.addEventListener('click', () => {
            if (this.callbacks.onRestartGame) {
                this.callbacks.onRestartGame();
            }
            this.hideMenu();
            AudioSystem.play('click');
        });
          this.elements.quitBtn.addEventListener('click', () => {
            if (this.callbacks.onQuitGame) {
                this.callbacks.onQuitGame();
            }
            this.hideMenu();
            AudioSystem.play('click');
        });
        
        // Game over screen
        this.elements.playAgainBtn.addEventListener('click', () => {
            if (this.callbacks.onPlayAgain) {
                this.callbacks.onPlayAgain();
            }
            AudioSystem.play('click');
        });
          this.elements.exitBtn.addEventListener('click', () => {
            if (this.callbacks.onQuitGame) {
                this.callbacks.onQuitGame();
            }
            this.hideMenu(); // Also hide the menu here to ensure it's not visible
            AudioSystem.play('click');
        });
        
        // Enter key handling for inputs
        this.elements.playerNameInput.addEventListener('keyup', (event) => {
            if (event.key === 'Enter') {
                this.elements.createJoinBtn.click();
            }
        });
        
        this.elements.roomIdInput.addEventListener('keyup', (event) => {
            if (event.key === 'Enter') {
                this.elements.createJoinBtn.click();
            }
        });
        
        // Instructions toggle handler
        this.elements.instructionsToggle.addEventListener('click', () => {
            this.toggleInstructions();
            AudioSystem.play('click');
        });

        // Enter key handlers for input fields
        this.elements.playerNameInput.addEventListener('keyup', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                // If name is filled but room is not focused, focus on room
                if (this.elements.playerNameInput.value.trim() && 
                    document.activeElement !== this.elements.roomIdInput) {
                    this.elements.roomIdInput.focus();
                } else {
                    handleJoinGameAction();
                }
            }
        });
        
        this.elements.roomIdInput.addEventListener('keyup', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                handleJoinGameAction();
            }
        });
        
        this.elements.startGameBtn.addEventListener('click', () => {
            if (this.callbacks.onStartGame) {
                this.callbacks.onStartGame();
            }
            AudioSystem.play('click');
        });
        
        // Leave room button handler
        this.elements.leaveRoomBtn.addEventListener('click', () => {
            if (this.callbacks.onLeaveRoom) {
                this.callbacks.onLeaveRoom();
            }
            AudioSystem.play('click');
        });
          // Game menu
        this.elements.resumeBtn.addEventListener('click', () => {
            if (this.callbacks.onResumeGame) {
                this.callbacks.onResumeGame();
            }
            this.hideMenu();
            AudioSystem.play('click');
        });
        
        this.elements.restartBtn.addEventListener('click', () => {
            if (this.callbacks.onRestartGame) {
                this.callbacks.onRestartGame();
            }
            this.hideMenu();
            AudioSystem.play('click');
        });
          this.elements.quitBtn.addEventListener('click', () => {
            if (this.callbacks.onQuitGame) {
                this.callbacks.onQuitGame();
            }
            this.hideMenu();
            AudioSystem.play('click');
        });
        
        // Game over screen
        this.elements.playAgainBtn.addEventListener('click', () => {
            if (this.callbacks.onPlayAgain) {
                this.callbacks.onPlayAgain();
            }
            AudioSystem.play('click');
        });
          this.elements.exitBtn.addEventListener('click', () => {
            if (this.callbacks.onQuitGame) {
                this.callbacks.onQuitGame();
            }
            this.hideMenu(); // Also hide the menu here to ensure it's not visible
            AudioSystem.play('click');
        });
        
        // Enter key handling for inputs
        this.elements.playerNameInput.addEventListener('keyup', (event) => {
            if (event.key === 'Enter') {
                this.elements.createJoinBtn.click();
            }
        });
        
        this.elements.roomIdInput.addEventListener('keyup', (event) => {
            if (event.key === 'Enter') {
                this.elements.createJoinBtn.click();
            }
        });
        
        // Instructions toggle handler
        this.elements.instructionsToggle.addEventListener('click', () => {
            this.toggleInstructions();
            AudioSystem.play('click');
        });

        // Enter key handlers for input fields
        this.elements.playerNameInput.addEventListener('keyup', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                // If name is filled but room is not focused, focus on room
                if (this.elements.playerNameInput.value.trim() && 
                    document.activeElement !== this.elements.roomIdInput) {
                    this.elements.roomIdInput.focus();
                } else {
                    handleJoinGameAction();
                }
            }
        });
        
        this.elements.roomIdInput.addEventListener('keyup', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                handleJoinGameAction();
            }
        });
        
        this.elements.startGameBtn.addEventListener('click', () => {
            if (this.callbacks.onStartGame) {
                this.callbacks.onStartGame();
            }
            AudioSystem.play('click');
        });
        
        // Leave room button handler
        this.elements.leaveRoomBtn.addEventListener('click', () => {
            if (this.callbacks.onLeaveRoom) {
                this.callbacks.onLeaveRoom();
            }
            AudioSystem.play('click');
        });
          // Game menu
        this.elements.resumeBtn.addEventListener('click', () => {
            if (this.callbacks.onResumeGame) {
                this.callbacks.onResumeGame();
            }
            this.hideMenu();
            AudioSystem.play('click');
        });
        
        this.elements.restartBtn.addEventListener('click', () => {
            if (this.callbacks.onRestartGame) {
                this.callbacks.onRestartGame();
            }
            this.hideMenu();
            AudioSystem.play('click');
        });
          this.elements.quitBtn.addEventListener('click', () => {
            if (this.callbacks.onQuitGame) {
                this.callbacks.onQuitGame();
            }
            this.hideMenu();
            AudioSystem.play('click');
        });
        
        // Game over screen
        this.elements.playAgainBtn.addEventListener('click', () => {
            if (this.callbacks.onPlayAgain) {
                this.callbacks.onPlayAgain();
            }
            AudioSystem.play('click');
        });
          this.elements.exitBtn.addEventListener('click', () => {
            if (this.callbacks.onQuitGame) {
                this.callbacks.onQuitGame();
            }
            this.hideMenu(); // Also hide the menu here to ensure it's not visible
            AudioSystem.play('click');
        });
        
        // Enter key handling for inputs
        this.elements.playerNameInput.addEventListener('keyup', (event) => {
            if (event.key === 'Enter') {
                this.elements.createJoinBtn.click();
            }
        });
        
        this.elements.roomIdInput.addEventListener('keyup', (event) => {
            if (event.key === 'Enter') {
                this.elements.createJoinBtn.click();
            }
        });
    }
    
    /**
     * Show the loading screen
     * @param {string} message - Optional loading message
     */
    showLoading(message) {
        this.hideAllScreens();
        
        if (message) {
            this.screens.loading.querySelector('p').textContent = message;
        }
        
        this.screens.loading.classList.remove('hidden');
    }
    
    /**
     * Show the join screen
     */
    showJoinScreen() {
        this.hideAllScreens();
        this.screens.join.classList.remove('hidden');
        this.elements.waitingRoom.classList.add('hidden');
        this.elements.playerNameInput.focus();
    }
    
    /**
     * Toggle the instructions panel
     */
    toggleInstructions() {
        const content = this.elements.instructionsContent;
        const toggle = this.elements.instructionsToggle;
        
        if (content.classList.contains('hidden')) {
            // Show instructions
            content.classList.remove('hidden');
            content.classList.add('show');
            toggle.classList.add('active');
            // Adjust for current orientation
            this.adjustInstructionsForOrientation();
            
            // Ensure the toggle button remains visible after animation
            setTimeout(() => {
                this.ensureToggleButtonVisible();
            }, 350);
        } else {
            // Hide instructions
            content.classList.add('hidden');
            content.classList.remove('show');
            toggle.classList.remove('active');
            
            // Ensure button remains accessible after closing
            setTimeout(() => {
                this.ensureToggleButtonVisible();
            }, 100);
        }
    }
    
    /**
     * Ensure the instructions toggle button is visible in the viewport
     */
    ensureToggleButtonVisible() {
        const toggle = this.elements.instructionsToggle;
        if (toggle) {
            const rect = toggle.getBoundingClientRect();
            const viewportHeight = window.innerHeight;
            
            // If button is not fully visible, scroll it into view
            if (rect.top < 0 || rect.bottom > viewportHeight) {
                toggle.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'start',
                    inline: 'nearest'
                });
            }
        }
    }
    
    /**
     * Show the waiting room with room code
     * @param {string} roomId - Room ID
     * @param {boolean} isHost - Whether the player is the host
     */
    showWaitingRoom(roomId, isHost) {
        // Hide all screens first to ensure clean transition
        this.hideAllScreens();
        
        // Show the join screen which contains the waiting room
        this.screens.join.classList.remove('hidden');
        
        this.elements.roomCode.textContent = roomId;
        this.elements.waitingRoom.classList.remove('hidden');
        
        // Only host can start the game
        if (isHost) {
            this.elements.startGameBtn.classList.remove('hidden');
        } else {
            this.elements.startGameBtn.classList.add('hidden');
        }
        
        // Clear the room ID input field
        this.elements.roomIdInput.value = '';
    }
    
    /**
     * Hide the waiting room
     */
    hideWaitingRoom() {
        this.elements.waitingRoom.classList.add('hidden');
        this.elements.startGameBtn.classList.add('hidden');
    }
    
    /**
     * Update the players list in waiting room
     * @param {Array} players - Array of player objects
     * @param {string} localPlayerId - ID of the local player
     */
    updatePlayersList(players, localPlayerId) {
        const playersList = this.elements.playersList;
        playersList.innerHTML = '';
        
        players.forEach(player => {
            const playerEntry = document.createElement('div');
            playerEntry.className = 'player-entry';
            
            // Mark the local player
            if (player.id === localPlayerId) {
                playerEntry.classList.add('local-player');
            }
            
            // Set background color as player color
            playerEntry.style.borderLeft = `4px solid ${player.color}`;
            
            // Player name
            const nameSpan = document.createElement('span');
            nameSpan.textContent = player.name;
            playerEntry.appendChild(nameSpan);
            
            // Status indicator
            const statusSpan = document.createElement('span');
            statusSpan.textContent = 'Ready';
            statusSpan.className = 'player-ready';
            playerEntry.appendChild(statusSpan);
            
            playersList.appendChild(playerEntry);
        });
    }
    
    /**
     * Show connection status message
     * @param {string} message - Status message
     * @param {string} type - Message type ('info', 'success', 'error')
     */    showConnectionStatus(message, type = 'info') {
        const statusElement = this.elements.connectionStatus;
        statusElement.textContent = message;
        statusElement.className = '';
        statusElement.classList.add(type);
        
        // Add shake animation for errors
        if (type === 'error') {
            statusElement.animate([
                { transform: 'translateX(0px)' },
                { transform: 'translateX(-5px)' },
                { transform: 'translateX(5px)' },
                { transform: 'translateX(-5px)' },
                { transform: 'translateX(0px)' }
            ], {
                duration: 300,
                iterations: 1
            });
        }
        
        // Clear after a few seconds
        setTimeout(() => {
            statusElement.textContent = '';
            statusElement.className = '';
        }, 5000);
    }
    
    /**
     * Show the game screen
     */
    showGameScreen() {
        this.hideAllScreens();
        this.screens.game.classList.remove('hidden');
        this.hideMenu();
    }
    
    /**
     * Show the game menu
     */
    showMenu() {
        this.elements.gameMenu.classList.remove('hidden');
    }
    
    /**
     * Hide the game menu
     */
    hideMenu() {
        this.elements.gameMenu.classList.add('hidden');
    }
    
    /**
     * Update the game timer display
     * @param {number} seconds - Game time in seconds
     */
    updateTimer(seconds) {
        this.elements.timer.textContent = Utils.formatTime(seconds);
    }
    
    /**
     * Update the scoreboard
     * @param {Array} scores - Array of player score objects
     */
    updateScoreboard(scores) {
        const scoreboard = this.elements.scoreboard;
        scoreboard.innerHTML = '';
        
        // Sort by score descending
        scores.sort((a, b) => b.score - a.score);
        
        scores.forEach(player => {
            const scoreEntry = document.createElement('div');
            scoreEntry.className = 'score-entry';
            
            // Create colored indicator for player
            const indicator = document.createElement('span');
            indicator.style.display = 'inline-block';
            indicator.style.width = '8px';
            indicator.style.height = '8px';
            indicator.style.borderRadius = '50%';
            indicator.style.backgroundColor = player.color;
            indicator.style.marginRight = '5px';
            
            // Create status indicator (alive/dead)
            const statusIndicator = document.createElement('span');
            statusIndicator.textContent = player.isAlive ? `♥${player.lives}` : '✗';
            statusIndicator.style.marginRight = '5px';
            statusIndicator.style.color = player.isAlive ? '#4CAF50' : '#FF5252';
            
            scoreEntry.appendChild(indicator);
            scoreEntry.appendChild(statusIndicator);
            scoreEntry.appendChild(document.createTextNode(`${player.name}: ${player.score}`));
            
            scoreboard.appendChild(scoreEntry);
        });
    }
      /**
     * Show game over screen with results
     * @param {Object} winner - Winner player object
     * @param {Array} scores - Array of player scores
     * @param {boolean} isHost - Whether the current player is the host
     * @param {boolean} isLocalGame - Whether this is a local game (offline)
     */
    showGameOver(winner, scores, isHost = false, isLocalGame = false) {
        this.hideAllScreens();
        
        // Display winner info - safely handle undefined winner
        if (winner && winner.name) {
            this.elements.winnerDisplay.textContent = `${winner.name} wins!`;
            this.elements.winnerDisplay.style.color = winner.color;
        } else {
            this.elements.winnerDisplay.textContent = `Game Over!`;
            this.elements.winnerDisplay.style.color = '#ffffff';
        }
        
        // Display final scores
        const finalScores = this.elements.finalScores;
        finalScores.innerHTML = '';
        
        // Add header row
        const headerRow = document.createElement('div');
        headerRow.className = 'final-score-header';
        headerRow.innerHTML = `
            <div>Player</div>
            <div>Score</div>
            <div>Survived</div>
        `;
        finalScores.appendChild(headerRow);
        
        // Sort by score descending
        scores = Array.isArray(scores) ? scores : [];
        scores.sort((a, b) => b.score - a.score);
        
        scores.forEach(player => {
            const scoreEntry = document.createElement('div');
            scoreEntry.className = 'final-score-entry';
            
            if (player.isWinner) {
                scoreEntry.classList.add('winner');
            }
            
            const nameElement = document.createElement('div');
            nameElement.textContent = player.name;
            nameElement.style.color = player.color;
            
            const scoreElement = document.createElement('div');
            scoreElement.textContent = player.score;
            
            const survivalElement = document.createElement('div');
            survivalElement.textContent = player.formattedSurvivalTime || '0:00';
            survivalElement.style.fontSize = '0.9em';
            survivalElement.style.opacity = '0.8';
            
            scoreEntry.appendChild(nameElement);
            scoreEntry.appendChild(scoreElement);
            scoreEntry.appendChild(survivalElement);
            finalScores.appendChild(scoreEntry);
        });
        
        // Update the Play Again button text and tooltip based on host status
        if (!isLocalGame) {
            if (isHost) {
                this.elements.playAgainBtn.textContent = 'Play Again';
                this.elements.playAgainBtn.title = '';
            } else {
                this.elements.playAgainBtn.textContent = 'Request Restart';
                this.elements.playAgainBtn.title = 'Only the host can restart the game';
            }
        } else {
            this.elements.playAgainBtn.textContent = 'Play Again';
            this.elements.playAgainBtn.title = '';
        }
        
        this.screens.gameOver.classList.remove('hidden');
    }
      /**
     * Show game pause notification
     * @param {string} playerName - Name of player who paused the game
     */
    showPauseNotification(playerName) {
        this._createNotification(`${playerName}`, 3000);
    }
    
    /**
     * Show a game notification message
     * @param {string} message - Message to display
     * @param {number} [duration=3000] - How long to show the notification in ms
     */
    showGameNotification(message, duration = 3000) {
        this._createNotification(message, duration);
    }
    
    /**
     * Create and manage stacked notifications
     * @private
     * @param {string} message - Message to display
     * @param {number} duration - How long to show the notification in ms
     */
    _createNotification(message, duration) {
        const notification = document.createElement('div');
        notification.className = 'game-notification';
        notification.textContent = message;
        
        // Append to game-container
        const gameContainer = document.getElementById('game-container');
        gameContainer.appendChild(notification);
        
        // Calculate position based on existing notifications
        const topPosition = this.notificationBaseTop + (this.activeNotifications.length * this.notificationSpacing);
        notification.style.top = `${topPosition}%`;
        
        // Add to active notifications
        this.activeNotifications.push(notification);
        
        // Remove notification after duration
        setTimeout(() => {
            // Remove from DOM
            notification.remove();
            
            // Remove from active notifications
            const index = this.activeNotifications.indexOf(notification);
            if (index !== -1) {
                this.activeNotifications.splice(index, 1);
            }
            
            // Reposition remaining notifications
            this._repositionNotifications();
        }, duration);
    }
    
    /**
     * Reposition active notifications after one is removed
     * @private
     */
    _repositionNotifications() {
        this.activeNotifications.forEach((notif, index) => {
            const topPosition = this.notificationBaseTop + (index * this.notificationSpacing);
            notif.style.top = `${topPosition}%`;
        });
    }
    
    /**
     * Hide all screens
     */
    hideAllScreens() {
        for (const screen of Object.values(this.screens)) {
            screen.classList.add('hidden');
        }
    }
    
    /**
     * Register UI event callbacks
     * @param {Object} callbacks - Callback functions
     */
    registerCallbacks(callbacks) {
        this.callbacks = {...this.callbacks, ...callbacks};
    }
      /**
     * Validates if the player name is valid
     * @param {string} name - The player name to validate
     * @returns {boolean} True if valid, false otherwise
     */
    validatePlayerName(name) {
        if (!name || name.trim() === '') {
            this.showConnectionStatus('Please enter a player name', 'error');
            this.showNameValidationState(false);
            return false;
        }
        
        // Check name length
        if (name.trim().length < 2) {
            this.showConnectionStatus('Player name must be at least 2 characters long', 'error');
            this.showNameValidationState(false);
            return false;
        }
        
        this.showNameValidationState(true);
        return true;
    }
    
    /**
     * Add visual indication of name validation error
     * @param {boolean} isValid - Whether the name is valid
     */
    showNameValidationState(isValid) {
        const input = this.elements.playerNameInput;
        
        if (isValid) {
            input.classList.remove('invalid');
        } else {
            input.classList.add('invalid');
            input.focus();
            
            // Shake animation for invalid input
            input.animate([
                { transform: 'translateX(0px)' },
                { transform: 'translateX(-5px)' },
                { transform: 'translateX(5px)' },
                { transform: 'translateX(-5px)' },
                { transform: 'translateX(0px)' }
            ], {
                duration: 300,
                iterations: 1
            });
        }
    }
    
    /**
     * Initialize room selection functionality
     * @param {Object} networkManager - The network manager instance
     */
    initRoomSelection(networkManager) {
        this.networkManager = networkManager;
        
        // Setup refresh button click
        this.elements.refreshRoomsBtn.addEventListener('click', () => {
            this.refreshRoomsList();
        });
        
        // Setup room input focus to show dropdown
        this.elements.roomIdInput.addEventListener('focus', () => {
            this.refreshRoomsList();
            this.elements.roomDropdown.classList.remove('hidden');
        });
        
        // Setup click outside to hide dropdown
        document.addEventListener('click', (e) => {
            if (!this.elements.roomIdInput.contains(e.target) &&
                !this.elements.roomDropdown.contains(e.target) &&
                !this.elements.refreshRoomsBtn.contains(e.target)) {
                this.elements.roomDropdown.classList.add('hidden');
            }
        });
    }
    
    /**
     * Refresh the list of active rooms
     */
    refreshRoomsList() {
        // Start spinner animation
        const refreshIcon = this.elements.refreshRoomsBtn.querySelector('i');
        refreshIcon.classList.add('spin');
        
        // Clear current options
        while (this.elements.roomDropdown.firstChild) {
            this.elements.roomDropdown.removeChild(this.elements.roomDropdown.firstChild);
        }
        
        // Show loading message
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'room-dropdown-loading';
        loadingDiv.textContent = 'Looking for active rooms...';
        this.elements.roomDropdown.appendChild(loadingDiv);
        
        // Show the dropdown
        this.elements.roomDropdown.classList.remove('hidden');
        
        // Request rooms from the server
        this.networkManager.getActiveRooms()
            .then(rooms => {
                // Stop spinner animation
                refreshIcon.classList.remove('spin');
                
                // Clear loading message
                while (this.elements.roomDropdown.firstChild) {
                    this.elements.roomDropdown.removeChild(this.elements.roomDropdown.firstChild);
                }
                
                // Display rooms or empty message
                if (rooms.length === 0) {
                    const emptyDiv = document.createElement('div');
                    emptyDiv.className = 'room-dropdown-empty';
                    emptyDiv.textContent = 'No active rooms found';
                    this.elements.roomDropdown.appendChild(emptyDiv);
                } else {
                    // Add each room as an option
                    rooms.forEach(room => {
                        const roomOption = document.createElement('div');
                        roomOption.className = 'room-option';
                        
                        const roomInfo = document.createElement('div');
                        roomInfo.className = 'room-info';
                        roomInfo.innerHTML = `
                            <span class="room-id">${room.id}</span>
                            <span class="player-count">${room.playerCount} player${room.playerCount !== 1 ? 's' : ''}</span>
                        `;
                        
                        const roomHost = document.createElement('div');
                        roomHost.className = 'room-host';
                        roomHost.textContent = `Host: ${room.host}`;
                        
                        roomOption.appendChild(roomInfo);
                        roomOption.appendChild(roomHost);
                        
                        // Add click handler to select this room
                        roomOption.addEventListener('click', () => {
                            this.elements.roomIdInput.value = room.id;
                            this.elements.roomDropdown.classList.add('hidden');
                        });
                        
                        this.elements.roomDropdown.appendChild(roomOption);
                    });
                }
            })
            .catch(error => {
                // Stop spinner animation
                refreshIcon.classList.remove('spin');
                
                // Show error message
                while (this.elements.roomDropdown.firstChild) {
                    this.elements.roomDropdown.removeChild(this.elements.roomDropdown.firstChild);
                }
                
                const errorDiv = document.createElement('div');
                errorDiv.className = 'room-dropdown-empty';
                errorDiv.textContent = 'Error loading rooms';
                this.elements.roomDropdown.appendChild(errorDiv);
                
                console.error('Failed to load rooms:', error);
            });
    }
    
    /**
     * Initialize UI
     */
    initUI() {
        // Hide all screens initially
        this.hideAllScreens();
        
        // Show the loading screen
        this.showLoading('Loading game...');
        
        // Set up network manager callbacks
        this.registerCallbacks({
            onJoinGame: (playerName, roomId) => {
                this.showLoading('Joining game...');
            },
            onStartGame: () => {
                this.showGameScreen();
            },
            onResumeGame: () => {
                this.showGameScreen();
            },
            onRestartGame: () => {
                this.showGameScreen();
            },
            onQuitGame: () => {
                this.showJoinScreen();
            },
            onPlayAgain: () => {
                this.showLoading('Starting new game...');
            }
        });
    }
    
    /**
     * Update UI elements based on host status
     * @param {boolean} isHost - Whether the current player is the host
     */
    updateHostControls(isHost) {
        // Update UI elements that should only be visible/enabled for the host
        if (this.elements.startGameBtn) {
            this.elements.startGameBtn.style.display = isHost ? 'block' : 'none';
        }
        
        if (this.elements.restartBtn) {
            this.elements.restartBtn.style.display = isHost ? 'block' : 'none';
        }
        
        // Update any other host-specific controls
        const hostOnlyElements = document.querySelectorAll('.host-only');
        hostOnlyElements.forEach(el => {
            el.style.display = isHost ? 'block' : 'none';
        });
        
        // Optional: Update UI to visually indicate the player is now the host
        if (isHost) {
            const hostBadge = document.createElement('div');
            hostBadge.className = 'host-badge';
            hostBadge.textContent = 'HOST';
            
            // Remove any existing host badges
            document.querySelectorAll('.host-badge').forEach(el => el.remove());
            
            // Add to the player's avatar or name element if appropriate
            const playerInfo = document.querySelector('.player-info');
            if (playerInfo) {
                playerInfo.appendChild(hostBadge);
            }
        }
    }
    
    /**
     * Reset host status in the UI
     * This ensures all host-related UI elements are reset when leaving a room
     * or creating a new room
     */
    resetHostStatus() {
        // Hide all host controls
        this.updateHostControls(false);
        
        // Make sure start game button is hidden
        this.elements.startGameBtn.classList.add('hidden');
    }
    
    /**
     * Show error message when trying to join a game that is in progress
     * @param {string} message - Error message to display
     */
    showGameInProgressError(message) {
        this.showConnectionStatus(message, 'error');
        
        // Reset the room ID input to allow joining another room
        if (this.elements.roomIdInput) {
            this.elements.roomIdInput.value = '';
        }
        
        // Flash the input field to indicate error
        if (this.elements.roomIdInput) {
            this.elements.roomIdInput.classList.add('error');
            setTimeout(() => {
                this.elements.roomIdInput.classList.remove('error');
            }, 1000);
        }
        
        // Play error sound
        AudioSystem.play('error');
    }
}
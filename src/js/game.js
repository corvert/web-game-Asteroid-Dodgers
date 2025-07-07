/**
 * Game class handling core game logic
 */
class Game {
    constructor() {
        // Game state
        this.isRunning = false;
        this.isPaused = false;
        this.gameTime = 0; // in seconds
        this.lastFrameTime = 0;
        this.animationFrameId = null;
        
        // Players and entities
        this.players = new Map();
        this.localPlayerId = null;
        this.asteroids = [];
        this.powerups = [];
        
        // Game settings
        this.settings = {
            gameDuration: 180, // 3 minutes
            maxPlayers: 4,
            maxAsteroids: 15,
            asteroidSpawnRate: 2000, // ms
            powerupSpawnRate: 1000, // ms
            roundStartCountdown: 3 // seconds
        };
        
        // Game area dimensions
        this.bounds = {
            width: 0,
            height: 0
        };
        
        // Performance monitoring
        this.perfMonitor = Utils.createPerformanceMonitor();
          // Event callbacks
        this.callbacks = {
            onGameOver: null,
            onScoreUpdate: null,
            onPlayerHit: null,
            onTimeUpdate: null,
            onPause: null,
            onResume: null
        };
        
        // DOM elements
        this.gameArea = null;
        this.lastAsteroidSpawn = 0;
        this.lastPowerupSpawn = 0;
    }
    
    /**
     * Initialize the game
     * @param {HTMLElement} gameArea - The game area DOM element
     */    init(gameArea) {
        this.gameArea = gameArea;
        
        // Get game area dimensions
        const rect = gameArea.getBoundingClientRect();
        
        // Ensure we have valid bounds
        if (rect.width <= 0 || rect.height <= 0) {
            console.warn('Game area has invalid dimensions, using defaults');
            this.bounds.width = 1000; // Default width
            this.bounds.height = 700; // Default height
            
            // Set explicit size on the game area element to match our bounds
            gameArea.style.width = `${this.bounds.width}px`;
            gameArea.style.height = `${this.bounds.height}px`;
        } else {
            this.bounds.width = rect.width;
            this.bounds.height = rect.height;
        }
        
        // Ensure game area is visible and properly sized
        gameArea.style.display = 'block';
        gameArea.style.position = 'relative';
        gameArea.style.overflow = 'hidden';
        
        // Initialize audio
        AudioSystem.init();
        
        // Set up keyboard event listeners
        this.setupEventListeners();
        
        console.log('Game initialized with bounds:', this.bounds);
    }
    
    /**
     * Set up keyboard event listeners
     */
    setupEventListeners() {
        window.addEventListener('keydown', this.handleKeyDown.bind(this));
        window.addEventListener('keyup', this.handleKeyUp.bind(this));
        
        // Handle window resize
        window.addEventListener('resize', Utils.debounce(() => {
            const rect = this.gameArea.getBoundingClientRect();
            this.bounds.width = rect.width;
            this.bounds.height = rect.height;
        }, 250));
    }
      /**
     * Handle keydown events
     * @param {KeyboardEvent} event - Keyboard event
     */
    handleKeyDown(event) {
        // Prevent default for arrow keys to avoid page scrolling
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) {
            event.preventDefault();
        }        // Handle Escape key for pause/unpause regardless of game state
        if (event.code === 'Escape') {
            if (this.isRunning) {
                // Notify the callbacks about the ESC key being pressed
                // The main.js handler will then send a network event to notify all players
                if (this.callbacks) {
                    if (!this.isPaused && this.callbacks.onPause) {
                        this.callbacks.onPause(this.localPlayerId, true);
                    } else if (this.isPaused && this.callbacks.onResume) {
                        this.callbacks.onResume(this.localPlayerId, true);
                    }
                }
                return;
            }
        }
        
        // Don't process other keys if game is not running or is paused
        if (!this.isRunning || this.isPaused) return;
        
        // Pass to local player if exists
        const localPlayer = this.getLocalPlayer();
        if (localPlayer) {
            localPlayer.handleInput(event.code, true);
        }
    }
    
    /**
     * Handle keyup events
     * @param {KeyboardEvent} event - Keyboard event
     */
    handleKeyUp(event) {
        // Don't process if game is not running
        if (!this.isRunning) return;
        
        // Pass to local player if exists
        const localPlayer = this.getLocalPlayer();
        if (localPlayer) {
            localPlayer.handleInput(event.code, false);
        }
    }
    
    /**
     * Add a player to the game
     * @param {Object} playerData - Player data object
     * @returns {Player} The created player instance
     */
    addPlayer(playerData) {
        const player = new Player(playerData);
        
        // Set as local player if isLocal flag is true
        if (playerData.isLocal) {
            this.localPlayerId = player.id;
        }        // Create player DOM elements
        if (this.gameArea) {
            player.createElements(this.gameArea);
            
            // Double check that bounds are properly set
            if (this.bounds.width <= 0 || this.bounds.height <= 0) {
                console.error('Invalid game bounds:', this.bounds);
                // Get bounds again to make sure they're correct
                const rect = this.gameArea.getBoundingClientRect();
                this.bounds.width = Math.max(rect.width, 800); // Fallback to 800 if width is 0
                this.bounds.height = Math.max(rect.height, 600); // Fallback to 600 if height is 0
                console.log('Updated game bounds:', this.bounds);
            }
              // Set starting position spread across the game area
            // Calculate positions based on player index for more even distribution
            let playerIndex = this.players.size; // Get proper 1-based player count
            
            // Ensure we have valid game bounds before calculation
            if (this.bounds.width <= 0 || this.bounds.height <= 0) {
                console.error('Invalid game bounds when adding player:', this.bounds);
                // Force update bounds from game area if available
                if (this.gameArea) {
                    const rect = this.gameArea.getBoundingClientRect();
                    this.bounds.width = rect.width || 800;
                    this.bounds.height = rect.height || 600;
                } else {
                    // Last resort defaults
                    this.bounds.width = 800;
                    this.bounds.height = 600;
                }
                console.log('Updated game bounds:', this.bounds);
            }
            
            // Safety margins from edges (10% of dimensions)
            const marginX = this.bounds.width * 0.1;
            const marginY = this.bounds.height * 0.1;
            const usableWidth = this.bounds.width - 2 * marginX;
            const usableHeight = this.bounds.height - 2 * marginY;
            
            // Place players in different areas of the screen based on their index
            // This uses a different approach than quadrants - more like a circle around the center
            const positionAngle = (playerIndex * Math.PI / 2) + (Math.random() * Math.PI / 4); // Randomize slightly
            const distanceFromCenter = Math.min(usableWidth, usableHeight) * 0.3; // Place about 30% from center
            
            const centerX = this.bounds.width / 2;
            const centerY = this.bounds.height / 2;
            
            // Calculate position in polar coordinates (avoids corners)
            const x = centerX + Math.cos(positionAngle) * distanceFromCenter;
            const y = centerY + Math.sin(positionAngle) * distanceFromCenter;
            
            // Clamp to ensure within safe zone
            const safeX = Math.max(marginX, Math.min(this.bounds.width - marginX, x));
            const safeY = Math.max(marginY, Math.min(this.bounds.height - marginY, y));
            
            console.log(`Player ${player.name} (${playerIndex}) initialized at position:`, 
                { x: safeX, y: safeY, bounds: this.bounds, angle: positionAngle * 180 / Math.PI });
            
            // Face outward from center for more dynamic starts
            const angleFromCenter = Math.atan2(safeY - centerY, safeX - centerX) * 180 / Math.PI;
            player.angle = angleFromCenter;
            
            // Initialize the player
            player.init(x, y);
        }
        
        // Add to players collection
        this.players.set(player.id, player);
        
        return player;
    }
    
    /**
     * Get the local player instance
     * @returns {Player|null} Local player or null if not found
     */
    getLocalPlayer() {
        return this.localPlayerId ? this.players.get(this.localPlayerId) : null;
    }
    
    /**
     * Remove a player from the game
     * @param {string} playerId - ID of the player to remove
     */
    removePlayer(playerId) {
        const player = this.players.get(playerId);
        if (player) {
            player.destroy();
            this.players.delete(playerId);
        }
    }
    
    /**
     * Start the game with connected players
     */
    startGame() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.isPaused = false;
        this.gameTime = 0;
        
        // Reset game state
        this.clearGameEntities();
        
        // Play countdown sound
        AudioSystem.play('countdown');
        
        // Start countdown
        let countdown = this.settings.roundStartCountdown;
        const countdownInterval = setInterval(() => {
            countdown--;
            if (countdown <= 0) {
                clearInterval(countdownInterval);
                this.startGameLoop();
                AudioSystem.play('start');
            }
        }, 1000);
    }
    
    /**
     * Start the main game loop
     */
    startGameLoop() {
        // Reset timing variables
        this.lastFrameTime = performance.now();
        this.lastAsteroidSpawn = this.lastFrameTime;
        this.lastPowerupSpawn = this.lastFrameTime;
        
        // Start animation loop
        this.gameLoop();
    }
    
    /**
     * Game loop function called on each animation frame
     */
    gameLoop() {
        const now = performance.now();
        const deltaTime = now - this.lastFrameTime;
        
        if (!this.isPaused) {
            // Update game timer
            this.gameTime += deltaTime / 1000;
            
            // Spawn entities
            this.spawnEntities(now);
            
            // Update all players
            this.updatePlayers(deltaTime);
            
            // Update all asteroids
            this.updateAsteroids(deltaTime);
            
            // Update all powerups
            this.updatePowerups(deltaTime);
            
            // Check collisions
            this.checkCollisions();
            
            // Check game over condition
            if (this.gameTime >= this.settings.gameDuration) {
                this.endGame();
            } else {
                // Update UI
                if (this.callbacks.onTimeUpdate) {
                    this.callbacks.onTimeUpdate(Math.floor(this.gameTime));
                }
                if (this.callbacks.onScoreUpdate) {
                    const scores = Array.from(this.players.values()).map(p => ({
                        id: p.id,
                        name: p.name,
                        score: p.score,
                        lives: p.lives,
                        color: p.color,
                        isAlive: p.isAlive
                    }));
                    this.callbacks.onScoreUpdate(scores);
                }
            }
        }
        
        // Update performance monitor
        this.perfMonitor.update();
        
        // Continue game loop if game is still running
        if (this.isRunning) {
            this.lastFrameTime = now;
            this.animationFrameId = requestAnimationFrame(this.gameLoop.bind(this));
        }
    }
    
    /**
     * Update all players
     * @param {number} deltaTime - Time since last frame
     */
    updatePlayers(deltaTime) {
        for (const player of this.players.values()) {
            player.update(deltaTime, this.bounds);
        }
    }
    
    /**
     * Spawn game entities (asteroids and powerups)
     * @param {number} now - Current timestamp
     */
    spawnEntities(now) {
        // Spawn asteroids
        if (now - this.lastAsteroidSpawn > this.settings.asteroidSpawnRate) {
            if (this.asteroids.length < this.settings.maxAsteroids) {
                this.spawnAsteroid();
            }
            this.lastAsteroidSpawn = now;
        }
        
        // Spawn powerups
        if (now - this.lastPowerupSpawn > this.settings.powerupSpawnRate) {
            if (Math.random() < 0.5) {  // 50% chance to spawn a powerup
                this.spawnPowerup();
            }
            this.lastPowerupSpawn = now;
        }
    }
    
    /**
     * Spawn a new asteroid
     */
    spawnAsteroid() {
        // Calculate spawn position (off-screen)
        const side = Math.floor(Math.random() * 4); // 0: top, 1: right, 2: bottom, 3: left
        let x, y;
        
        switch (side) {
            case 0: // Top
                x = Math.random() * this.bounds.width;
                y = -50;
                break;
            case 1: // Right
                x = this.bounds.width + 50;
                y = Math.random() * this.bounds.height;
                break;
            case 2: // Bottom
                x = Math.random() * this.bounds.width;
                y = this.bounds.height + 50;
                break;
            case 3: // Left
                x = -50;
                y = Math.random() * this.bounds.height;
                break;
        }
        
        // Calculate velocity towards game area center
        const centerX = this.bounds.width / 2;
        const centerY = this.bounds.height / 2;
        const angle = Math.atan2(centerY - y, centerX - x);
        const speed = 0.5 + Math.random() * 1.5;
        const velocityX = Math.cos(angle) * speed;
        const velocityY = Math.sin(angle) * speed;
        
        // Create asteroid element
        const element = document.createElement('div');
        element.className = 'asteroid';
        
        // Random size between 20 and 60
        const size = 20 + Math.random() * 40;
        element.style.width = `${size}px`;
        element.style.height = `${size}px`;
        
        // Add slight irregular shape
        const bumpiness = Math.random() * 15 + 5;
        element.style.borderRadius = `${50 - bumpiness}%`;
        
        // Add to DOM
        this.gameArea.appendChild(element);
        
        // Store asteroid data
        const asteroid = {
            element,
            x,
            y,
            velocityX,
            velocityY,
            size,
            rotation: 0,
            rotationSpeed: (Math.random() - 0.5) * 2 // Random rotation
        };
        
        this.asteroids.push(asteroid);
    }
    
    /**
     * Update all asteroids
     * @param {number} deltaTime - Time since last frame
     */
    updateAsteroids(deltaTime) {
        for (let i = this.asteroids.length - 1; i >= 0; i--) {
            const asteroid = this.asteroids[i];
            
            // Update position
            asteroid.x += asteroid.velocityX * deltaTime / 16;
            asteroid.y += asteroid.velocityY * deltaTime / 16;
            
            // Update rotation
            asteroid.rotation += asteroid.rotationSpeed * deltaTime / 16;
            
            // Update visual position
            asteroid.element.style.left = `${asteroid.x}px`;
            asteroid.element.style.top = `${asteroid.y}px`;
            asteroid.element.style.transform = `translate(-50%, -50%) rotate(${asteroid.rotation}deg)`;
            
            // Remove if out of bounds
            if (asteroid.x < -100 || asteroid.x > this.bounds.width + 100 ||
                asteroid.y < -100 || asteroid.y > this.bounds.height + 100) {
                asteroid.element.remove();
                this.asteroids.splice(i, 1);
            }
        }
    }
      /**
     * Spawn a new powerup
     */
    spawnPowerup() {
        // Check bounds validity
        if (!this.bounds || this.bounds.width <= 0 || this.bounds.height <= 0) {
            console.error('Invalid game bounds when spawning powerup:', this.bounds);
            
            // Force update bounds from game area if available
            if (this.gameArea) {
                const rect = this.gameArea.getBoundingClientRect();
                this.bounds.width = Math.max(rect.width, 800);  // Fallback to 800 if width is 0
                this.bounds.height = Math.max(rect.height, 600); // Fallback to 600 if height is 0
            } else {
                // Last resort defaults
                this.bounds = {
                    width: 800,
                    height: 600
                };
            }
            
            console.log('Updated game bounds for powerup spawn:', this.bounds);
        }
        
        // Safety margins
        const margin = 50;
        const safeWidth = Math.max(100, this.bounds.width - (margin * 2));
        const safeHeight = Math.max(100, this.bounds.height - (margin * 2));
        
        // Random position within game area with safe margins
        const x = margin + Math.random() * safeWidth;
        const y = margin + Math.random() * safeHeight;
        
        console.log(`Spawning powerup at: (${x}, ${y}), game area: ${this.bounds.width}x${this.bounds.height}`);
        
        // Create powerup element
        const element = document.createElement('div');
        element.className = 'powerup';
        element.style.width = '30px';
        element.style.height = '30px';
        element.style.borderRadius = '50%';
        
        // Determine powerup type
        const types = ['shield', 'speed', 'score'];
        const type = types[Math.floor(Math.random() * types.length)];
        
        // Style based on type
        switch (type) {
            case 'shield':
                element.style.backgroundColor = 'rgba(64, 224, 208, 0.7)';
                element.style.boxShadow = '0 0 10px #40E0D0';
                break;
            case 'speed':
                element.style.backgroundColor = 'rgba(255, 215, 0, 0.7)';
                element.style.boxShadow = '0 0 10px #FFD700';
                break;
            case 'score':
                element.style.backgroundColor = 'rgba(147, 112, 219, 0.7)';
                element.style.boxShadow = '0 0 10px #9370DB';
                break;
        }
        
        // Add pulse animation
        element.style.animation = 'pulse 1.5s infinite';
        
        // Add to DOM
        this.gameArea.appendChild(element);
        
        // Store powerup data
        const powerup = {
            element,
            x,
            y,
            type,
            createdAt: performance.now()
        };
        
        this.powerups.push(powerup);
        
        // Expire powerup after 10 seconds
        setTimeout(() => {
            const index = this.powerups.indexOf(powerup);
            if (index !== -1) {
                if (powerup.element.parentNode) {
                    powerup.element.remove();
                }
                this.powerups.splice(index, 1);
            }
        }, 10000);
    }
      /**
     * Update all powerups
     */
    updatePowerups() {
        // Get game bounds again to ensure accurate positioning
        const rect = this.gameArea ? this.gameArea.getBoundingClientRect() : null;
        const maxWidth = rect ? rect.width : this.bounds.width;
        const maxHeight = rect ? rect.height : this.bounds.height;
        
        for (const powerup of this.powerups) {
            // Ensure powerup is within bounds
            if (powerup.x < 0 || powerup.x > maxWidth || 
                powerup.y < 0 || powerup.y > maxHeight) {
                
                // Reposition if outside bounds
                powerup.x = Math.max(50, Math.min(maxWidth - 50, powerup.x));
                powerup.y = Math.max(50, Math.min(maxHeight - 50, powerup.y));
                
                console.log(`Adjusted out-of-bounds powerup to: (${powerup.x}, ${powerup.y})`);
            }
            
            // Update visual position
            powerup.element.style.left = `${powerup.x}px`;
            powerup.element.style.top = `${powerup.y}px`;
            
            // Add a small floating animation
            const time = performance.now() / 1000;
            const floatOffset = Math.sin(time + powerup.createdAt / 1000) * 5;
            powerup.element.style.transform = `translate(-50%, -50%) translateY(${floatOffset}px)`;
        }
    }
    
    /**
     * Check for collisions between game entities
     */
    checkCollisions() {
        // Check player-asteroid collisions
        for (const player of this.players.values()) {
            if (!player.isAlive || player.invulnerable) continue;
            
            for (let i = this.asteroids.length - 1; i >= 0; i--) {
                const asteroid = this.asteroids[i];
                
                if (Utils.checkCollision(player.element, asteroid.element)) {
                    // Player hit by asteroid
                    const isDead = player.onCollision();
                    
                    // Play collision sound
                    AudioSystem.play('collision');
                    
                    // Callback for hit event
                    if (this.callbacks.onPlayerHit) {
                        this.callbacks.onPlayerHit(player.id, isDead);
                    }
                    
                    // Remove asteroid
                    asteroid.element.remove();
                    this.asteroids.splice(i, 1);
                    
                    // Check if player died
                    if (isDead) {
                        // Check game over condition
                        const alivePlayers = Array.from(this.players.values()).filter(p => p.isAlive);
                        if (alivePlayers.length <= 1) {
                            this.endGame();
                        }
                    }
                    
                    break; // Only process one collision per player per frame
                }
            }
        }
        
        // Check player-powerup collisions
        for (const player of this.players.values()) {
            if (!player.isAlive) continue;
            
            for (let i = this.powerups.length - 1; i >= 0; i--) {
                const powerup = this.powerups[i];
                
                if (Utils.checkCollision(player.element, powerup.element)) {
                    // Player collected powerup
                    this.applyPowerup(player, powerup.type);
                    
                    // Play powerup sound
                    AudioSystem.play('powerup');
                    
                    // Remove powerup
                    powerup.element.remove();
                    this.powerups.splice(i, 1);
                    
                    break; // Only process one powerup per player per frame
                }
            }
        }
    }
    
    /**
     * Apply powerup effect to a player
     * @param {Player} player - Player to apply the powerup to
     * @param {string} type - Type of powerup
     */
    applyPowerup(player, type) {
        switch (type) {
            case 'shield':
                // Give temporary invulnerability
                player.invulnerable = true;
                setTimeout(() => {
                    player.invulnerable = false;
                }, 5000); // 5 seconds of invulnerability
                break;
            case 'speed':
                // Increase speed temporarily
                const originalSpeed = player.maxSpeed;
                player.maxSpeed *= 1.5;
                setTimeout(() => {
                    player.maxSpeed = originalSpeed;
                }, 5000); // 5 seconds of speed boost
                break;
            case 'score':
                // Add bonus points
                player.addScore(50);
                break;
        }
    }    /**
     * Toggle game pause state
     * @param {string} [playerId] - ID of player who paused the game
     * @param {boolean} [isNetworkEvent=false] - Whether this was triggered by a network event
     * @returns {boolean} New pause state
     */    togglePause(playerId, isNetworkEvent = false) {
        this.isPaused = !this.isPaused;
        
        // Play sound effect
        if (AudioSystem) {
            AudioSystem.play(this.isPaused ? 'pause' : 'resume');
        }
        
        console.log(`Game ${this.isPaused ? 'paused' : 'resumed'}${playerId ? ' by player ' + playerId : ''}`);
        return this.isPaused;
    }
    
    /**
     * End the game and determine winner
     */
    endGame() {
        if (!this.isRunning) return;
        
        this.isRunning = false;
        
        // Cancel animation frame
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        
        // Play game over sound
        AudioSystem.play('gameover');
        
        // Determine winner based on score
        const playersList = Array.from(this.players.values());
        playersList.sort((a, b) => b.score - a.score);
        
        const winner = playersList[0];
        const scores = playersList.map(p => ({
            id: p.id,
            name: p.name,
            score: p.score,
            isWinner: p === winner,
            color: p.color
        }));
        
        // Trigger game over callback
        if (this.callbacks.onGameOver) {
            this.callbacks.onGameOver(winner.id, scores);
        }
    }
    
    /**
     * Clear all game entities (asteroids, powerups)
     */
    clearGameEntities() {
        // Clear asteroids
        this.asteroids.forEach(asteroid => {
            if (asteroid.element && asteroid.element.parentNode) {
                asteroid.element.parentNode.removeChild(asteroid.element);
            }
        });
        this.asteroids = [];
        
        // Clear powerups
        this.powerups.forEach(powerup => {
            if (powerup.element && powerup.element.parentNode) {
                powerup.element.parentNode.removeChild(powerup.element);
            }
        });
        this.powerups = [];
    }
    
    /**
     * Reset the game state completely
     */
    reset() {
        // Stop game loop
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        
        // Clear game entities
        this.clearGameEntities();
        
        // Clear players
        for (const player of this.players.values()) {
            player.destroy();
        }
        this.players.clear();
        
        // Reset game state
        this.isRunning = false;
        this.isPaused = false;
        this.gameTime = 0;
        this.localPlayerId = null;
    }
    
    /**
     * Register event callbacks
     * @param {Object} callbacks - Callback functions
     */
    registerCallbacks(callbacks) {
        this.callbacks = {...this.callbacks, ...callbacks};
    }
}

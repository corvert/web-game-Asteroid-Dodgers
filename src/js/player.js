/**
 * Player class representing a game player
 */
class Player {
    /**
     * Create a new player
     * @param {Object} config - Player configuration
     * @param {string} config.id - Unique player ID
     * @param {string} config.name - Player display name
     * @param {string} config.color - Player color hex code
     * @param {boolean} config.isLocal - Whether this is the local player
     */
    constructor({ id, name, color, isLocal = false }) {
        this.id = id;
        this.name = name;
        this.color = color;
        this.isLocal = isLocal;
        this.score = 0;
        this.lives = 3;
        this.isAlive = true;
          // Position and movement
        this.x = 0; // Will be set when joining game
        this.y = 0;
        this.speed = 5;
        this.maxSpeed = 8;
        this.currentSpeed = 0;
        this.friction = 0.98; // Slightly reduced friction for smoother movement
        this.velocityX = 0;
        this.velocityY = 0;
        this.angle = 0; // Direction facing
        this.turningSpeed = 6; // Increased for more responsive turning
        this.acceleration = 0.25; // Acceleration factor
        
        // Input state
        this.keys = {
            up: false,
            down: false,
            left: false,
            right: false,
        };
        
        // DOM element reference
        this.element = null;
        this.trails = [];
        
        // Invulnerability after being hit
        this.invulnerable = false;
        this.respawnTime = 2000; // 2 seconds
        
        // Performance optimization flags
        this.needsUpdate = false;
        this.lastUpdateTime = 0;
        this.updateThrottle = 10; // ms
    }
    
    /**
     * Create the player's DOM element
     * @param {HTMLElement} container - Element to append the player to
     */
    createElements(container) {
        // Create player ship element
        this.element = document.createElement('div');
        this.element.className = 'player-ship';
        this.element.style.backgroundColor = this.color;
        
        // Create name tag
        const nameTag = document.createElement('div');
        nameTag.className = 'player-name-tag';
        nameTag.textContent = this.name;
        
        // Add to DOM
        this.element.appendChild(nameTag);
        container.appendChild(this.element);
    }
      /**
     * Initialize the player with starting position
     * @param {number} x - Initial X position
     * @param {number} y - Initial Y position
     */    
    init(x, y) {
        console.log(`Initializing player ${this.name} at position (${x}, ${y}) with angle ${this.angle}`);
        
        // Ensure we have valid coordinates
        if (isNaN(x) || isNaN(y) || x === 0 || y === 0) {
            console.error(`Invalid initial position: (${x}, ${y}), resetting to center`);
            
            // Get the parent element's bounds to compute center position
            if (this.element && this.element.parentElement) {
                const parentWidth = this.element.parentElement.clientWidth;
                const parentHeight = this.element.parentElement.clientHeight;
                x = parentWidth / 2;
                y = parentHeight / 2;
            } else {
                // Fallback to reasonable defaults
                x = 400;
                y = 300;
            }
        }
        
        this.x = x;
        this.y = y;
        
        // Give a more substantial initial momentum to prevent feeling "stuck"
        // Convert angle to radians for movement calculations
        const angleRad = this.angle * Math.PI / 180;
        
        // Add a stronger initial velocity in the direction the player is facing
        // Using a random factor (1-2) for varied starting speeds
        const speedFactor = 1 + Math.random();
        this.velocityX = Math.sin(angleRad) * speedFactor;
        this.velocityY = -Math.cos(angleRad) * speedFactor;
        
        console.log(`Player ${this.name} initialized with velocity: (${this.velocityX}, ${this.velocityY})`);
        
        // Update the visual position
        this.updatePosition();
    }
    
    /**
     * Handle keyboard input for local player
     * @param {string} key - Key code
     * @param {boolean} pressed - Whether the key is pressed or released
     */
    handleInput(key, pressed) {
        if (!this.isLocal || !this.isAlive) return;
        
        const keyMap = {
            'ArrowUp': 'up',
            'KeyW': 'up',
            'ArrowDown': 'down',
            'KeyS': 'down',
            'ArrowLeft': 'left',
            'KeyA': 'left',
            'ArrowRight': 'right',
            'KeyD': 'right'
        };
        
        const mappedKey = keyMap[key];
        if (mappedKey && this.keys[mappedKey] !== pressed) {
            this.keys[mappedKey] = pressed;
            this.needsUpdate = true;
        }
    }
    
    /**
     * Update player's position and physics
     * @param {number} deltaTime - Time elapsed since last frame in ms
     * @param {Object} bounds - Game area bounds { width, height }
     * @returns {boolean} Whether position was updated
     */
    update(deltaTime, bounds) {
        if (!this.isAlive || !this.element) return false;
        
        const now = performance.now();
        if (now - this.lastUpdateTime < this.updateThrottle && !this.needsUpdate) {
            return false;
        }
        
        // Handle input for local player
        if (this.isLocal) {
            // Turning
            if (this.keys.left) this.angle -= this.turningSpeed * (deltaTime / 16);
            if (this.keys.right) this.angle += this.turningSpeed * (deltaTime / 16);
            
            // Normalize angle to 0-360
            this.angle = (this.angle + 360) % 360;
            
            // Convert angle to radians for movement calculations
            const angleRad = this.angle * Math.PI / 180;
              // Accelerate
            if (this.keys.up) {
                this.velocityX += Math.sin(angleRad) * this.acceleration;
                this.velocityY -= Math.cos(angleRad) * this.acceleration;
                
                // Leave trail particles when accelerating
                if (Math.random() > 0.6) this.createTrail(); // Increased trail frequency
            }
            
            // Brake
            if (this.keys.down) {
                this.velocityX *= 0.9;
                this.velocityY *= 0.9;
            }
            
            // Apply friction
            this.velocityX *= this.friction;
            this.velocityY *= this.friction;
            
            // Limit max speed
            const speed = Math.sqrt(this.velocityX * this.velocityX + this.velocityY * this.velocityY);
            if (speed > this.maxSpeed) {
                const ratio = this.maxSpeed / speed;
                this.velocityX *= ratio;
                this.velocityY *= ratio;
            }
            
            this.needsUpdate = false;
        }
        
        // Update position
        this.x += this.velocityX;
        this.y += this.velocityY;
          // Validate bounds before attempting to wrap
        if (!bounds || typeof bounds.width !== 'number' || typeof bounds.height !== 'number' || 
            bounds.width <= 0 || bounds.height <= 0) {
            console.error('Invalid bounds provided to player update:', bounds);
            // Try to get bounds from parent element as fallback
            if (this.element && this.element.parentElement) {
                bounds = {
                    width: this.element.parentElement.clientWidth,
                    height: this.element.parentElement.clientHeight
                };
                console.log('Using fallback bounds from parent element:', bounds);
            } else {
                // Last resort default bounds
                bounds = { width: 800, height: 600 };
                console.log('Using default bounds:', bounds);
            }
        }
        
        // Wrap around screen edges with safety margin
        const margin = 20; // Keep 20px away from exact edge
        if (this.x < -margin) this.x = bounds.width - margin;
        if (this.x > bounds.width + margin) this.x = margin;
        if (this.y < -margin) this.y = bounds.height - margin;
        if (this.y > bounds.height + margin) this.y = margin;
        
        // Update visual position
        this.updatePosition();
        
        // Update trail particles
        this.updateTrails();
        
        this.lastUpdateTime = now;
        return true;
    }
    
    /**
     * Create a trail particle
     */
    createTrail() {
        if (!this.isAlive || this.trails.length >= 10) return;
        
        // Calculate position behind ship
        const angleRad = this.angle * Math.PI / 180;
        const trailX = this.x - Math.sin(angleRad) * 20;
        const trailY = this.y + Math.cos(angleRad) * 20;
        
        // Create trail element
        const trail = document.createElement('div');
        trail.className = 'player-trail';
        trail.style.backgroundColor = this.color;
        trail.style.width = '10px';
        trail.style.height = '10px';
        trail.style.left = `${trailX}px`;
        trail.style.top = `${trailY}px`;
        
        // Add to DOM
        this.element.parentNode.appendChild(trail);
        
        // Store reference with creation time
        this.trails.push({
            element: trail,
            createdAt: performance.now(),
            x: trailX,
            y: trailY
        });
    }
    
    /**
     * Update and fade trail particles
     */
    updateTrails() {
        const now = performance.now();
        
        for (let i = this.trails.length - 1; i >= 0; i--) {
            const trail = this.trails[i];
            const age = now - trail.createdAt;
            
            if (age > 1000) {
                // Remove trail if too old
                trail.element.remove();
                this.trails.splice(i, 1);
            } else {
                // Fade out and shrink trail
                const scale = 1 - (age / 1000);
                trail.element.style.opacity = scale.toFixed(2);
                const size = 10 * scale;
                trail.element.style.width = `${size}px`;
                trail.element.style.height = `${size}px`;
            }
        }
    }
      /**
     * Update visual position and rotation of player element
     */    
    updatePosition() {
        if (!this.element) return;
        
        // Get the parent element's bounds to properly clamp values
        const parentElement = this.element.parentElement;
        const maxWidth = parentElement ? parentElement.clientWidth : 2000;
        const maxHeight = parentElement ? parentElement.clientHeight : 2000;
        
        // Ensure position coordinates are valid numbers
        if (isNaN(this.x) || isNaN(this.y)) {
            console.error(`Invalid player position: x=${this.x}, y=${this.y}`);
            // Set to default position if invalid
            this.x = maxWidth / 2;
            this.y = maxHeight / 2;
        }
        
        // Update position (clamp to ensure it's visible)
        // Leave a 20px margin from the edges
        const safeX = Math.max(20, Math.min(maxWidth - 20, this.x));
        const safeY = Math.max(20, Math.min(maxHeight - 20, this.y));
        
        // If position was clamped significantly, log it
        if (Math.abs(safeX - this.x) > 5 || Math.abs(safeY - this.y) > 5) {
            console.warn(`Player ${this.name} position clamped from (${this.x}, ${this.y}) to (${safeX}, ${safeY})`);
            // Update the actual position to the clamped value to prevent repeated warnings
            this.x = safeX;
            this.y = safeY;
        }
        
        this.element.style.left = `${safeX}px`;
        this.element.style.top = `${safeY}px`;
        
        // Update rotation
        this.element.style.transform = `translate(-50%, -50%) rotate(${this.angle}deg)`;
        
        // Update visual effects
        if (this.invulnerable) {
            this.element.style.opacity = (Math.sin(performance.now() / 100) + 1) / 2;
        } else {
            this.element.style.opacity = '1';
        }
        
        // Debug position for the first 5 frames
        if (this._debugFrames === undefined) this._debugFrames = 0;
        if (this._debugFrames < 5) {
            console.log(`Player ${this.name} position: ${safeX}, ${safeY}, bounds: ${maxWidth}x${maxHeight}`);
            this._debugFrames++;
        }
    }
    
    /**
     * Handle collision with another object
     */
    onCollision() {
        if (this.invulnerable || !this.isAlive) return false;
        
        this.lives--;
        
        if (this.lives <= 0) {
            this.isAlive = false;
            if (this.element) {
                this.element.classList.add('exploding');
                setTimeout(() => {
                    if (this.element) this.element.remove();
                }, 1000);
            }
            return true; // Player died
        }
        
        // Make player invulnerable temporarily
        this.invulnerable = true;
        setTimeout(() => {
            this.invulnerable = false;
        }, this.respawnTime);
        
        return false; // Player still alive
    }
    
    /**
     * Add points to player's score
     * @param {number} points - Points to add
     */
    addScore(points) {
        this.score += points;
    }
    
    /**
     * Clean up player resources
     */
    destroy() {
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
        
        // Remove all trail elements
        this.trails.forEach(trail => {
            if (trail.element && trail.element.parentNode) {
                trail.element.parentNode.removeChild(trail.element);
            }
        });
        this.trails = [];
    }
    
    /**
     * Get player data for network transmission
     * @returns {Object} Serialized player state
     */
    getNetworkState() {
        return {
            id: this.id,
            x: this.x,
            y: this.y,
            angle: this.angle,
            velocityX: this.velocityX,
            velocityY: this.velocityY,
            score: this.score,
            lives: this.lives,
            isAlive: this.isAlive,
            color: this.color,
            name: this.name
        };
    }
    
    /**
     * Update player state from network data
     * @param {Object} data - Network player state
     */
    updateFromNetwork(data) {
        // Only update remote players
        if (this.isLocal) return;
        
        this.x = data.x;
        this.y = data.y;
        this.angle = data.angle;
        this.velocityX = data.velocityX;
        this.velocityY = data.velocityY;
        this.score = data.score;
        this.lives = data.lives;
        this.isAlive = data.isAlive;
        
        this.updatePosition();
    }
}

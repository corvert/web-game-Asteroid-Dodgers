/**
 * Audio Manager for handling game sounds
 */
class AudioManager {
    constructor() {
        this.sounds = {};
        this.muted = false;
        this.initialized = false;
          // Sound configuration
        this.soundConfig = {
            // UI sounds
            'click': { src: 'src/assets/sounds/click.mp3', volume: 0.5 },
            'join': { src: 'src/assets/sounds/join.mp3', volume: 0.5 },
            'leave': { src: 'src/assets/sounds/leave.mp3', volume: 0.3 },
            'start': { src: 'src/assets/sounds/start.mp3', volume: 0.7 },
            'restart': { src: 'src/assets/sounds/restart.mp3', volume: 0.7 },
            'countdown': { src: 'src/assets/sounds/countdown.mp3', volume: 0.5 },
            'error': { src: 'src/assets/sounds/error.mp3', volume: 0.5 },
            'notification': { src: 'src/assets/sounds/notification.mp3', volume: 0.5 },
            'message': { src: 'src/assets/sounds/message.mp3', volume: 0.4 },
            
            // Game sounds
            'collision': { src: 'src/assets/sounds/collision.mp3', volume: 0.6 },
            'powerup': { src: 'src/assets/sounds/powerup.mp3', volume: 0.5 },
            'gameover': { src: 'src/assets/sounds/gameover.mp3', volume: 0.7 },
            'win': { src: 'src/assets/sounds/win.mp3', volume: 0.7 },
        };
    }
    
    /**
     * Initialize the audio manager and preload sounds
     * @returns {Promise} Promise that resolves when all sounds are loaded
     */    init() {
        if (this.initialized) return Promise.resolve();
        
        const loadPromises = [];
        
        // Check if the audio context is available
        try {
            // Create a mock sound for testing if audio is supported
            const audioTest = new Audio();
            if (!audioTest.play) {
                console.warn('Audio playback not supported in this browser');
                this.muted = true;
            }
        } catch (e) {
            console.warn('Audio system initialization failed:', e);
            this.muted = true;
            // Return early but still mark as initialized
            this.initialized = true;
            return Promise.resolve();
        }
        
        console.log('Loading audio files...');
        
        // Create a mock beep sound instead of loading files
        // This helps avoid 404 errors for missing sound files
        const createMockSound = (frequency = 440, duration = 500, volume = 0.5) => {
            try {
                const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                const oscillator = audioCtx.createOscillator();
                const gainNode = audioCtx.createGain();
                
                oscillator.type = 'sine';
                oscillator.frequency.value = frequency; 
                gainNode.gain.value = volume;
                
                oscillator.connect(gainNode);
                gainNode.connect(audioCtx.destination);
                
                const mockSound = {
                    play: () => {
                        oscillator.start();
                        setTimeout(() => {
                            oscillator.stop();
                        }, duration);
                        return Promise.resolve();
                    },
                    cloneNode: () => createMockSound(frequency, duration, volume),
                    pause: () => oscillator.stop(),
                    volume: volume,
                    muted: false,
                    loop: false
                };
                
                return mockSound;
            } catch (e) {
                console.warn('Audio context not supported:', e);
                return {
                    play: () => Promise.resolve(),
                    cloneNode: () => ({ play: () => Promise.resolve() }),
                    pause: () => {},
                    volume: 0,
                    muted: true,
                    loop: false
                };
            }
        };
        
        // Create mock sounds for each key
        for (const [key, config] of Object.entries(this.soundConfig)) {
            try {
                // Try to load the real sound file
                const sound = new Audio(config.src);
                sound.volume = config.volume;
                
                const promise = new Promise((resolve) => {
                    sound.addEventListener('canplaythrough', () => {
                        resolve();
                    }, { once: true });
                    
                    // Fall back to mock sound on error
                    sound.addEventListener('error', () => {
                        console.warn(`Could not load sound: ${key}, using mock sound instead`);
                        // Create different pitched sounds for different events
                        let frequency = 440; // Default A4
                        
                        switch(key) {
                            case 'click': frequency = 440; break; // A4
                            case 'join': frequency = 523.25; break; // C5
                            case 'leave': frequency = 349.23; break; // F4
                            case 'start': frequency = 659.25; break; // E5
                            case 'countdown': frequency = 392; break; // G4
                            case 'collision': frequency = 277.18; break; // C#4 
                            case 'powerup': frequency = 587.33; break; // D5
                            case 'gameover': frequency = 196; break; // G3
                            case 'win': frequency = 783.99; break; // G5
                        }
                        
                        this.sounds[key] = createMockSound(frequency, 300, config.volume);
                        resolve();
                    }, { once: true });
                });
                
                this.sounds[key] = sound;
                loadPromises.push(promise);
            } catch (e) {
                console.warn(`Error creating sound for ${key}:`, e);
                this.sounds[key] = createMockSound();
            }
        }
        
        return Promise.all(loadPromises).then(() => {
            this.initialized = true;
            console.log('Audio system initialized');
        });
    }
    
    /**
     * Play a sound effect
     * @param {string} soundId - ID of the sound to play
     * @param {boolean} loop - Whether the sound should loop
     * @returns {HTMLAudioElement|null} Audio element or null if sound doesn't exist
     */    play(soundId, loop = false) {
        if (this.muted || !this.initialized) return null;
        
        const sound = this.sounds[soundId];
        if (!sound) {
            console.warn(`Sound not found: ${soundId}`);
            return null;
        }
        
        try {
            // Create a new audio element for overlapping sounds
            const soundInstance = sound.cloneNode();
            soundInstance.loop = loop;
            
            // Check if this is a mock sound (our custom implementation)
            if (typeof soundInstance === 'object' && !soundInstance instanceof HTMLAudioElement) {
                // This is our mock sound object
                soundInstance.play().catch(err => {
                    console.warn(`Failed to play mock sound ${soundId}:`, err);
                });
                return soundInstance;
            }
            
            // For actual audio elements
            if (soundInstance instanceof HTMLAudioElement) {
                // Remove the element when done playing to clean up memory
                soundInstance.addEventListener('ended', () => {
                    if (document.body.contains(soundInstance)) {
                        document.body.removeChild(soundInstance);
                    }
                }, { once: true });
                
                // Append to document to ensure it works consistently across browsers
                document.body.appendChild(soundInstance);
                
                soundInstance.play().catch(err => {
                    console.warn(`Failed to play sound ${soundId}:`, err);
                    // Remove from DOM if play failed
                    if (document.body.contains(soundInstance)) {
                        document.body.removeChild(soundInstance);
                    }
                });
            }
            
            return soundInstance;
        } catch (err) {
            console.warn(`Error playing sound ${soundId}:`, err);
            return null;
        }
    }
    
    /**
     * Stop a specific looping sound
     * @param {HTMLAudioElement} soundInstance - The sound instance to stop
     */
    stopSound(soundInstance) {
        if (soundInstance) {
            soundInstance.pause();
            soundInstance.currentTime = 0;
            if (soundInstance.parentNode) {
                soundInstance.parentNode.removeChild(soundInstance);
            }
        }
    }
    
    /**
     * Toggle mute state
     * @param {boolean} muted - Force a specific state (optional)
     * @returns {boolean} New mute state
     */
    toggleMute(muted) {
        if (typeof muted === 'boolean') {
            this.muted = muted;
        } else {
            this.muted = !this.muted;
        }
        
        // Update all currently playing sounds
        for (const sound of Object.values(this.sounds)) {
            sound.muted = this.muted;
        }
        
        return this.muted;
    }
}

// Create a singleton instance
const AudioSystem = new AudioManager();

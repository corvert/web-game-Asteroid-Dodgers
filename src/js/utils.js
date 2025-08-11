/**
 * Utilities and helper functions
 */
const Utils = {
    /**
     * Generate a random ID
     * @param {number} length - Length of the ID
     * @returns {string} Random ID
     */
    generateId: (length = 6) => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    },

    /**
     * Generate a random color
     * @returns {string} Hex color code
     */
    generateColor: () => {
        const colors = [
            '#FF5252', '#FF4081', '#E040FB', '#7C4DFF', 
            '#536DFE', '#448AFF', '#40C4FF', '#18FFFF', 
            '#64FFDA', '#69F0AE', '#B2FF59', '#EEFF41', 
            '#FFFF00', '#FFD740', '#FFAB40', '#FF6E40'
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    },

    /**
     * Check for collision between two DOM elements
     * @param {HTMLElement} elem1 - First element
     * @param {HTMLElement} elem2 - Second element
     * @returns {boolean} Whether there's a collision
     */
    checkCollision: (elem1, elem2) => {
        const rect1 = elem1.getBoundingClientRect();
        const rect2 = elem2.getBoundingClientRect();
        
        // Calculate the distance between centers
        const centerX1 = rect1.left + rect1.width / 2;
        const centerY1 = rect1.top + rect1.height / 2;
        const centerX2 = rect2.left + rect2.width / 2;
        const centerY2 = rect2.top + rect2.height / 2;
        
        const dx = centerX1 - centerX2;
        const dy = centerY1 - centerY2;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // If the distance is less than the sum of the radii, there's a collision
        return distance < (rect1.width / 2 + rect2.width / 2);
    },

    /**
     * Format time in seconds to MM:SS format
     * @param {number} seconds - Time in seconds
     * @returns {string} Formatted time
     */
    formatTime: (seconds) => {
        const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
        const secs = (seconds % 60).toString().padStart(2, '0');
        return `${mins}:${secs}`;
    },

    /**
     * Debounce function to limit how often a function is called
     * @param {Function} func - The function to debounce
     * @param {number} wait - Milliseconds to wait
     * @returns {Function} Debounced function
     */
    debounce: (func, wait) => {
        let timeout;
        return function(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * Throttle function to limit rate of function calls
     * @param {Function} func - The function to throttle
     * @param {number} limit - Milliseconds to wait between calls
     * @returns {Function} Throttled function
     */
    throttle: (func, limit) => {
        let lastFunc;
        let lastRan;
        return function(...args) {
            if (!lastRan) {
                func(...args);
                lastRan = Date.now();
            } else {
                clearTimeout(lastFunc);
                lastFunc = setTimeout(() => {
                    if ((Date.now() - lastRan) >= limit) {
                        func(...args);
                        lastRan = Date.now();
                    }
                }, limit - (Date.now() - lastRan));
            }
        };
    },

    /**
     * Create a performance monitor for tracking FPS
     * @returns {Object} Performance monitor object
     */
    createPerformanceMonitor: () => {
        let frameCount = 0;
        let lastTime = performance.now();
        let fps = 0;
        let framesTime = [];
        
        // Detect if FPS drops below threshold
        const fpsThreshold = 55; // Alert if below 55 FPS
        
        const update = () => {
            const now = performance.now();
            const elapsed = now - lastTime;
            
            // Track frame time
            if (elapsed > 0) {
                framesTime.push(elapsed);
                if (framesTime.length > 60) framesTime.shift();
            }
            
            frameCount++;
            
            // Update FPS counter approximately once per second
            // if (elapsed >= 1000) {
            //     fps = (frameCount * 1000) / elapsed;
                
            //     // Check for performance issues
            //     // if (fps < fpsThreshold) {
            //     //     console.warn(`Low FPS detected: ${fps.toFixed(1)} FPS`);
                    
            //     //     // Calculate average frame time and jank frames
            //     //     const avgFrameTime = framesTime.reduce((a, b) => a + b, 0) / framesTime.length;
            //     //     const jankFrames = framesTime.filter(time => time > (1000 / 50)).length;
                    
            //     //     console.warn(`Average frame time: ${avgFrameTime.toFixed(2)}ms`);
            //     //     console.warn(`Jank frames: ${jankFrames} (${((jankFrames / framesTime.length) * 100).toFixed(1)}%)`);
            //     // }
                
            //     frameCount = 0;
            //     lastTime = now;
            // }
            
            // return fps;
        };
        
        return {
            update,
            getFPS: () => fps
        };
    }
};

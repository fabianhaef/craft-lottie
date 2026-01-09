/**
 * Utility functions for Lottie data manipulation
 */
class LottieDataUtils {
    /**
     * Clean internal flags from Lottie data structure
     * @param {Object|Array} obj - Lottie data object or array
     */
    static cleanLottieData(obj) {
        if (Array.isArray(obj)) {
            obj.forEach(item => LottieDataUtils.cleanLottieData(item));
        } else if (obj && typeof obj === 'object') {
            // Remove internal flags but keep the structure
            delete obj._hidden;
            // Keep _originalOp for now as we need it for restoration
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    LottieDataUtils.cleanLottieData(obj[key]);
                }
            }
        }
    }

    /**
     * Fix keyframe structures that might be missing 'a' property
     * @param {Object|Array} obj - Lottie data object or array
     * @param {string} path - Current path in the object tree (for debugging)
     */
    static fixKeyframeStructures(obj, path = '') {
        // Recursively fix keyframe structures that might be missing 'a' property
        if (Array.isArray(obj)) {
            obj.forEach((item, idx) => LottieDataUtils.fixKeyframeStructures(item, `${path}[${idx}]`));
        } else if (obj && typeof obj === 'object' && obj !== null) {
            // Check if this looks like an animated property (has 'k' but missing 'a')
            // BUT skip text document data (t.d) which has 'k' as keyframe array, not animated value
            if (obj.k !== undefined && obj.a === undefined) {
                // Skip if this looks like text document data (t.d)
                // Text document 'k' is an array of keyframes with 's' (style) and 't' (time) properties
                const isTextDocumentData = Array.isArray(obj.k) && obj.k.length > 0 && 
                    obj.k[0] && typeof obj.k[0] === 'object' && 
                    (obj.k[0].s !== undefined || obj.k[0].t !== undefined);
                
                if (!isTextDocumentData) {
                    obj.a = 0;
                }
            }
            
            // Check common keyframe properties in transforms (ks object)
            if (obj.ks && typeof obj.ks === 'object') {
                const keyframeProps = ['o', 'r', 'p', 'a', 's', 't', 'sk', 'sa', 'sc', 'sw', 'rx', 'ry', 'rz', 'or'];
                for (const prop of keyframeProps) {
                    if (obj.ks[prop] && typeof obj.ks[prop] === 'object') {
                        if (obj.ks[prop].k !== undefined && obj.ks[prop].a === undefined) {
                            obj.ks[prop].a = 0;
                        }
                        // Fix nested keyframe arrays
                        if (Array.isArray(obj.ks[prop].k)) {
                            obj.ks[prop].k.forEach((kf, idx) => {
                                if (kf && typeof kf === 'object' && kf.s !== undefined && kf.s !== null) {
                                    // Keyframe has a value, ensure it's valid
                                    if (typeof kf.s === 'object' && kf.s.a === undefined && kf.s.k !== undefined) {
                                        kf.s.a = 0;
                                    }
                                }
                            });
                        }
                    }
                }
            }
            
            // Fix shape properties
            if (Array.isArray(obj.shapes)) {
                obj.shapes.forEach((shape, idx) => {
                    if (shape && typeof shape === 'object') {
                        // Fix shape transform properties
                        if (shape.p && typeof shape.p === 'object' && shape.p.k !== undefined && shape.p.a === undefined) {
                            shape.p.a = 0;
                        }
                        if (shape.s && typeof shape.s === 'object' && shape.s.k !== undefined && shape.s.a === undefined) {
                            shape.s.a = 0;
                        }
                        // Fix color properties
                        if (shape.c && typeof shape.c === 'object' && shape.c.k !== undefined && shape.c.a === undefined) {
                            shape.c.a = 0;
                        }
                        if (shape.o && typeof shape.o === 'object' && shape.o.k !== undefined && shape.o.a === undefined) {
                            shape.o.a = 0;
                        }
                    }
                });
            }
            
            // Recursively process nested objects
            for (const key in obj) {
                if (obj.hasOwnProperty(key) && typeof obj[key] === 'object' && obj[key] !== null) {
                    LottieDataUtils.fixKeyframeStructures(obj[key], path ? `${path}.${key}` : key);
                }
            }
        }
    }

    /**
     * Prepare Lottie data for saving (clean flags, apply layer visibility)
     * @param {Object} lottieData - Original Lottie data
     * @returns {Object} Cleaned data ready for saving
     */
    static prepareDataForSave(lottieData) {
        // Create a clean copy
        const dataToSave = JSON.parse(JSON.stringify(lottieData));
        
        // Apply layer visibility changes to the saved data
        if (dataToSave.layers && Array.isArray(dataToSave.layers)) {
            dataToSave.layers.forEach((layer, index) => {
                const originalLayer = lottieData.layers[index];
                if (originalLayer && originalLayer._hidden === true) {
                    // Hide layer by setting op to ip
                    const layerIp = layer.ip !== undefined ? layer.ip : 0;
                    layer.op = layerIp;
                }
                // Remove internal flags
                delete layer._hidden;
                delete layer._originalOp;
            });
        }
        
        // Clean all internal flags from the entire structure
        LottieDataUtils.cleanLottieData(dataToSave);
        
        return dataToSave;
    }

    /**
     * Convert RGB array to hex color
     * @param {Array<number>} rgbArray - RGB array [r, g, b] with values 0-1
     * @returns {string} Hex color string (e.g., "#FF0000")
     */
    static rgbArrayToHex(rgbArray) {
        const r = Math.round(rgbArray[0] * 255);
        const g = Math.round(rgbArray[1] * 255);
        const b = Math.round(rgbArray[2] * 255);
        return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
    }

    /**
     * Convert hex color to RGB array
     * @param {string} hex - Hex color string (e.g., "#FF0000")
     * @returns {Array<number>|null} RGB array [r, g, b] with values 0-1, or null if invalid
     */
    static hexToRgbArray(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? [
            parseInt(result[1], 16) / 255,
            parseInt(result[2], 16) / 255,
            parseInt(result[3], 16) / 255
        ] : null;
    }

    /**
     * Check if two colors match (within tolerance)
     * @param {Array<number>} color - RGB array [r, g, b]
     * @param {Array<number>} targetRgb - Target RGB array [r, g, b]
     * @param {number} tolerance - Color matching tolerance (default: 0.01)
     * @returns {boolean} True if colors match
     */
    static colorsMatch(color, targetRgb, tolerance = 0.01) {
        return Math.abs(color[0] - targetRgb[0]) < tolerance &&
               Math.abs(color[1] - targetRgb[1]) < tolerance &&
               Math.abs(color[2] - targetRgb[2]) < tolerance;
    }

    /**
     * Calculate color distance between two hex colors
     * @param {string} color1 - First hex color
     * @param {string} color2 - Second hex color
     * @returns {number} Color distance (Euclidean distance in RGB space)
     */
    static colorDistance(color1, color2) {
        const rgb1 = LottieDataUtils.hexToRgbArray(color1);
        const rgb2 = LottieDataUtils.hexToRgbArray(color2);
        if (!rgb1 || !rgb2) return Infinity;
        
        const r = rgb1[0] - rgb2[0];
        const g = rgb1[1] - rgb2[1];
        const b = rgb1[2] - rgb2[2];
        return Math.sqrt(r * r + g * g + b * b);
    }

    /**
     * Get layer by path in Lottie data structure
     * @param {Object} obj - Lottie data object
     * @param {string} path - Path to layer (e.g., "layers[0]" or "layers[0].layers[1]")
     * @returns {Object|null} Layer object or null if not found
     */
    static getLayerByPath(obj, path) {
        if (!path) return obj;
        
        // Handle paths like "layers[0]" or "layers[0].layers[1]"
        const parts = path.split('.');
        let current = obj;
        
        for (const part of parts) {
            const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/);
            if (arrayMatch) {
                const [, key, index] = arrayMatch;
                if (current && current[key] && Array.isArray(current[key])) {
                    const idx = parseInt(index);
                    if (idx >= 0 && idx < current[key].length) {
                        current = current[key][idx];
                    } else {
                        console.warn(`Index ${idx} out of bounds for ${key}`);
                        return null;
                    }
                } else {
                    console.warn(`Could not access ${key}[${index}]`);
                    return null;
                }
            } else {
                if (current && current[part]) {
                    current = current[part];
                } else {
                    console.warn(`Could not access property ${part}`);
                    return null;
                }
            }
        }
        
        return current;
    }

    /**
     * Escape HTML to prevent XSS
     * @param {string} text - Text to escape
     * @returns {string} Escaped HTML
     */
    static escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LottieDataUtils;
}

// Export for global use in browser
if (typeof window !== 'undefined') {
    window.LottieDataUtils = LottieDataUtils;
}

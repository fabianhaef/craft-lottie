/**
 * Handles color extraction and editing
 */
class ColorEditor {
    constructor(config) {
        this.colorContainer = config.colorContainer;
        this.brandPalette = config.brandPalette || [];
        this.lottieData = null;
        this.onColorChange = config.onColorChange || (() => {});
        this.onChange = config.onChange || (() => {});
    }

    /**
     * Set Lottie data
     * @param {Object} lottieData - Lottie animation data
     */
    setLottieData(lottieData) {
        this.lottieData = lottieData;
    }

    /**
     * Extract and display colors
     */
    extractColors() {
        if (!this.colorContainer || !this.lottieData) {
            return;
        }

        const colors = new Set();
        this.findColors(this.lottieData, colors);

        this.colorContainer.innerHTML = '';

        // Show brand palette first if available
        if (this.brandPalette && this.brandPalette.length > 0) {
            const paletteSection = document.createElement('div');
            paletteSection.className = 'lottie-palette-section';
            
            const paletteTitle = document.createElement('div');
            paletteTitle.className = 'lottie-palette-title';
            paletteTitle.textContent = this.translations?.brandPalette || 'Brand Palette';
            paletteSection.appendChild(paletteTitle);
            
            const paletteColors = document.createElement('div');
            paletteColors.className = 'lottie-palette-colors';
            
            this.brandPalette.forEach((paletteColor) => {
                this.createPaletteColorSwatch(paletteColor, paletteColors);
            });
            
            paletteSection.appendChild(paletteColors);
            this.colorContainer.appendChild(paletteSection);
            
            // Add separator if there are extracted colors
            if (colors.size > 0) {
                const separator = document.createElement('div');
                separator.className = 'lottie-colors-separator';
                this.colorContainer.appendChild(separator);
            }
        }

        if (colors.size === 0 && (!this.brandPalette || this.brandPalette.length === 0)) {
            this.colorContainer.innerHTML = `<div class="lottie-colors-empty">${this.translations?.noColorsFound || 'No editable colors found in this animation'}</div>`;
            return;
        }

        // Show extracted colors from animation
        if (colors.size > 0) {
            const extractedSection = document.createElement('div');
            extractedSection.className = 'lottie-colors-extracted';
            
            const extractedTitle = document.createElement('div');
            extractedTitle.className = 'lottie-palette-title';
            extractedTitle.textContent = this.translations?.animationColors || 'Animation Colors';
            extractedTitle.style.gridColumn = '1 / -1';
            extractedSection.appendChild(extractedTitle);
            
            Array.from(colors).forEach((color, index) => {
                this.createColorPicker(color, index, extractedSection);
            });
            
            this.colorContainer.appendChild(extractedSection);
        }
    }

    /**
     * Find colors in Lottie data structure
     * @param {Object} obj - Object to search
     * @param {Set} colors - Set to add colors to
     * @param {string} path - Current path (for debugging)
     */
    findColors(obj, colors, path = '') {
        if (typeof obj !== 'object' || obj === null) return;

        for (const key in obj) {
            const value = obj[key];

            // Look for color arrays: 'c', 's' (stroke), 'fc' (fill color)
            if (['c', 's', 'fc'].includes(key) && Array.isArray(value)) {
                // Check if it's a keyframed color (has 'k' property)
                if (value.k && Array.isArray(value.k) && value.k.length >= 3) {
                    const colorHex = LottieDataUtils.rgbArrayToHex(value.k);
                    colors.add(colorHex);
                }
                // Check if it's a direct color array
                else if (value.length >= 3 && typeof value[0] === 'number') {
                    const colorHex = LottieDataUtils.rgbArrayToHex(value);
                    colors.add(colorHex);
                }
            }
            // Recursively search nested objects
            else if (typeof value === 'object') {
                this.findColors(value, colors, path ? `${path}.${key}` : key);
            }
        }
    }

    /**
     * Create color picker UI element
     * @param {string} color - Hex color
     * @param {number} index - Color index
     * @param {HTMLElement} container - Container element
     */
    createColorPicker(color, index, container) {
        const colorItem = document.createElement('div');
        colorItem.className = 'lottie-color-item';

        const colorSwatch = document.createElement('input');
        colorSwatch.type = 'color';
        colorSwatch.value = color;
        colorSwatch.className = 'lottie-color-swatch';
        colorSwatch.dataset.currentColor = color;

        const colorLabel = document.createElement('div');
        colorLabel.className = 'lottie-color-label';
        colorLabel.textContent = color.toUpperCase();

        colorSwatch.addEventListener('input', (e) => {
            const oldColor = colorSwatch.dataset.currentColor;
            const newColor = e.target.value;
            this.updateColor(oldColor, newColor);
            colorSwatch.dataset.currentColor = newColor;
            colorLabel.textContent = newColor.toUpperCase();
        });

        colorItem.appendChild(colorSwatch);
        colorItem.appendChild(colorLabel);
        (container || this.colorContainer).appendChild(colorItem);
    }

    /**
     * Create palette color swatch
     * @param {string} color - Hex color
     * @param {HTMLElement} container - Container element
     */
    createPaletteColorSwatch(color, container) {
        const swatch = document.createElement('button');
        swatch.type = 'button';
        swatch.className = 'lottie-palette-swatch';
        swatch.style.backgroundColor = color;
        swatch.title = color.toUpperCase();
        swatch.dataset.color = color;
        
        swatch.addEventListener('click', () => {
            // Apply this palette color to all matching colors in the animation
            const extractedColors = new Set();
            this.findColors(this.lottieData, extractedColors);
            
            // Find the closest matching color in the animation
            let closestColor = null;
            let minDistance = Infinity;
            
            extractedColors.forEach(extractedColor => {
                const distance = LottieDataUtils.colorDistance(color, extractedColor);
                if (distance < minDistance) {
                    minDistance = distance;
                    closestColor = extractedColor;
                }
            });
            
            if (closestColor) {
                this.updateColor(closestColor, color);
                // Re-extract colors to update UI
                this.extractColors();
            } else {
                if (typeof Craft !== 'undefined' && Craft.cp && Craft.cp.displayNotice) {
                    Craft.cp.displayNotice(this.translations?.noColorsToReplace || 'No colors found in animation to replace');
                }
            }
        });
        
        container.appendChild(swatch);
    }

    /**
     * Update color in Lottie data
     * @param {string} oldColor - Old hex color
     * @param {string} newColor - New hex color
     */
    updateColor(oldColor, newColor) {
        if (oldColor === newColor) return;

        const oldRgb = LottieDataUtils.hexToRgbArray(oldColor);
        const newRgb = LottieDataUtils.hexToRgbArray(newColor);

        if (!oldRgb || !newRgb) return;

        this.replaceColor(this.lottieData, oldRgb, newRgb);
        this.onColorChange();
        this.onChange();
    }

    /**
     * Replace color in Lottie data structure
     * @param {Object} obj - Object to search
     * @param {Array<number>} oldRgb - Old RGB array
     * @param {Array<number>} newRgb - New RGB array
     */
    replaceColor(obj, oldRgb, newRgb) {
        if (typeof obj !== 'object' || obj === null) return;

        for (const key in obj) {
            const value = obj[key];

            // Handle color properties: c, s, fc
            if (['c', 's', 'fc'].includes(key) && Array.isArray(value)) {
                // Keyframed color (has 'k' property)
                if (value.k && Array.isArray(value.k) && value.k.length >= 3) {
                    if (LottieDataUtils.colorsMatch(value.k, oldRgb)) {
                        value.k[0] = newRgb[0];
                        value.k[1] = newRgb[1];
                        value.k[2] = newRgb[2];
                    }
                }
                // Direct color array
                else if (value.length >= 3 && typeof value[0] === 'number') {
                    if (LottieDataUtils.colorsMatch(value, oldRgb)) {
                        value[0] = newRgb[0];
                        value[1] = newRgb[1];
                        value[2] = newRgb[2];
                    }
                }
            }
            // Recurse into nested objects
            else if (typeof value === 'object') {
                this.replaceColor(value, oldRgb, newRgb);
            }
        }
    }

    /**
     * Set translations
     * @param {Object} translations - Translation object
     */
    setTranslations(translations) {
        this.translations = translations;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ColorEditor;
}

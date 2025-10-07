/**
 * Lottie Editor for Craft CMS
 * Provides in-field editing capabilities for Lottie animations
 */
class LottieEditor {
    constructor(fieldId, options = {}) {
        this.fieldId = fieldId;
        this.options = options;
        this.animation = null;
        this.lottieData = null;
        this.previewInstance = null;
        
        this.init();
    }

    init() {
        this.fileInput = document.querySelector(`input[id="${this.fieldId}-file"]`);
        this.previewContainer = document.querySelector('.lottie-preview-container');
        this.previewElement = document.querySelector(`#${this.fieldId}-preview`);
        this.controlsContainer = document.querySelector('.lottie-controls');
        this.hiddenInput = document.querySelector(`input[id="${this.fieldId}"]`);
        this.speedInput = document.querySelector(`input[id="${this.fieldId}-speed"]`);
        this.colorsContainer = document.querySelector(`#${this.fieldId}-colors`);

        if (this.fileInput) {
            this.fileInput.addEventListener('change', (e) => this.handleFileUpload(e));
        }

        if (this.speedInput) {
            this.speedInput.addEventListener('input', (e) => this.handleSpeedChange(e));
        }

        // Load existing data if present
        if (this.hiddenInput && this.hiddenInput.value) {
            try {
                this.lottieData = JSON.parse(this.hiddenInput.value);
                this.loadAnimation();
            } catch (e) {
                console.warn('Failed to parse existing Lottie data:', e);
            }
        }
    }

    handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (!file.name.toLowerCase().endsWith('.json')) {
            alert('Please select a valid .json Lottie file.');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                this.lottieData = JSON.parse(e.target.result);
                this.loadAnimation();
            } catch (error) {
                console.error('Error parsing Lottie file:', error);
                alert('Invalid Lottie JSON file.');
            }
        };
        reader.readAsText(file);
    }

    loadAnimation() {
        if (!this.lottieData) return;

        // Show preview and controls
        this.previewContainer.style.display = 'block';
        this.controlsContainer.style.display = 'block';

        // Load animation in preview using lottie-web
        if (this.previewInstance) {
            this.previewInstance.destroy();
        }

        // Import lottie-web from node_modules
        if (typeof lottie === 'undefined') {
            this.loadLottieWeb(() => {
                this.renderPreview();
            });
        } else {
            this.renderPreview();
        }

        // Extract and show colors
        this.extractColors();
        
        // Save to hidden field
        this.saveData();
    }

    loadLottieWeb(callback) {
        // Load lottie-web from node_modules
        const script = document.createElement('script');
        script.src = '/node_modules/lottie-web/build/player/lottie.min.js';
        script.onload = callback;
        script.onerror = () => {
            // Fallback to CDN
            const fallbackScript = document.createElement('script');
            fallbackScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.13.0/lottie.min.js';
            fallbackScript.onload = callback;
            document.head.appendChild(fallbackScript);
        };
        document.head.appendChild(script);
    }

    renderPreview() {
        this.previewInstance = lottie.loadAnimation({
            container: this.previewElement,
            renderer: 'svg',
            loop: true,
            autoplay: true,
            animationData: this.lottieData
        });

        // Apply speed if set
        if (this.speedInput && this.speedInput.value) {
            this.previewInstance.setSpeed(parseFloat(this.speedInput.value));
        }
    }

    extractColors() {
        if (!this.options.enableColorEditing || !this.colorsContainer) return;

        const colors = new Set();
        this.findColors(this.lottieData, colors);
        
        this.colorsContainer.innerHTML = '';
        
        Array.from(colors).forEach((color, index) => {
            this.createColorPicker(color, index);
        });
    }

    findColors(obj, colors, path = '') {
        if (typeof obj !== 'object' || obj === null) return;

        for (const key in obj) {
            const currentPath = path ? `${path}.${key}` : key;
            
            if (key === 'c' && Array.isArray(obj[key]) && obj[key].length >= 3) {
                // This looks like a color array [r, g, b] or [r, g, b, a]
                const colorHex = this.rgbArrayToHex(obj[key]);
                colors.add(colorHex);
            } else if (typeof obj[key] === 'object') {
                this.findColors(obj[key], colors, currentPath);
            }
        }
    }

    rgbArrayToHex(rgbArray) {
        const r = Math.round(rgbArray[0] * 255);
        const g = Math.round(rgbArray[1] * 255);
        const b = Math.round(rgbArray[2] * 255);
        
        return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
    }

    hexToRgbArray(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? [
            parseInt(result[1], 16) / 255,
            parseInt(result[2], 16) / 255,
            parseInt(result[3], 16) / 255
        ] : null;
    }

    createColorPicker(color, index) {
        const colorItem = document.createElement('div');
        colorItem.className = 'lottie-color-item';
        
        const colorSwatch = document.createElement('input');
        colorSwatch.type = 'color';
        colorSwatch.value = color;
        colorSwatch.className = 'lottie-color-swatch';
        
        const colorLabel = document.createElement('span');
        colorLabel.textContent = `Color ${index + 1}`;
        
        colorSwatch.addEventListener('change', (e) => {
            this.updateColor(color, e.target.value);
        });
        
        colorItem.appendChild(colorSwatch);
        colorItem.appendChild(colorLabel);
        this.colorsContainer.appendChild(colorItem);
    }

    updateColor(oldColor, newColor) {
        if (oldColor === newColor) return;
        
        const oldRgb = this.hexToRgbArray(oldColor);
        const newRgb = this.hexToRgbArray(newColor);
        
        if (!oldRgb || !newRgb) return;
        
        this.replaceColor(this.lottieData, oldRgb, newRgb);
        this.renderPreview();
        this.saveData();
    }

    replaceColor(obj, oldRgb, newRgb) {
        if (typeof obj !== 'object' || obj === null) return;

        for (const key in obj) {
            if (key === 'c' && Array.isArray(obj[key]) && obj[key].length >= 3) {
                // Check if this color matches the old color (with some tolerance)
                const tolerance = 0.01;
                if (Math.abs(obj[key][0] - oldRgb[0]) < tolerance &&
                    Math.abs(obj[key][1] - oldRgb[1]) < tolerance &&
                    Math.abs(obj[key][2] - oldRgb[2]) < tolerance) {
                    
                    obj[key][0] = newRgb[0];
                    obj[key][1] = newRgb[1];
                    obj[key][2] = newRgb[2];
                }
            } else if (typeof obj[key] === 'object') {
                this.replaceColor(obj[key], oldRgb, newRgb);
            }
        }
    }

    handleSpeedChange(event) {
        const speed = parseFloat(event.target.value);
        if (this.previewInstance) {
            this.previewInstance.setSpeed(speed);
        }
        this.saveData();
    }

    saveData() {
        if (!this.hiddenInput || !this.lottieData) return;
        
        const dataToSave = {
            data: this.lottieData,
            speed: this.speedInput ? parseFloat(this.speedInput.value) : 1.0
        };
        
        this.hiddenInput.value = JSON.stringify(dataToSave);
    }
}

// Export for global use
window.LottieEditor = LottieEditor;
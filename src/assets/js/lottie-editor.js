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
        this.currentAssetId = options.assetId || null;

        console.log('LottieEditor initialized:', {
            fieldId: fieldId,
            assetId: options.assetId,
            hasExistingData: !!options.existingData
        });

        this.init();
    }

    init() {
        console.log('Looking for elements with fieldId:', this.fieldId);

        // Try to find the asset selector input - it might have various IDs
        this.assetSelectInput = document.querySelector(`input[id="${this.fieldId}-asset"]`) ||
                                document.querySelector(`input[name="lottie-temp-asset"]`);

        this.valueInput = document.querySelector(`input[id="${this.fieldId}"]`);
        this.previewContainer = document.querySelector('.lottie-preview-container');
        this.previewElement = document.querySelector(`#${this.fieldId}-preview`);
        this.controlsContainer = document.querySelector('.lottie-controls');
        this.speedInput = document.querySelector(`input[id="${this.fieldId}-speed"]`);
        this.colorsContainer = document.querySelector(`#${this.fieldId}-colors`);

        console.log('Found elements:', {
            assetSelectInput: this.assetSelectInput?.id,
            valueInput: this.valueInput?.id,
            speedInput: this.speedInput?.id
        });

        // Listen for asset selection changes
        if (this.assetSelectInput) {
            console.log('Asset select input found:', this.assetSelectInput.id);

            // Use Craft's element selector events
            const elementSelect = this.assetSelectInput.closest('.elementselect');
            if (elementSelect) {
                console.log('Element select container found');

                // Watch for changes in the hidden input value
                const observer = new MutationObserver(() => {
                    console.log('Asset input value changed to:', this.assetSelectInput.value);
                    this.handleAssetChange();
                });
                observer.observe(this.assetSelectInput, {
                    attributes: true,
                    attributeFilter: ['value']
                });

                // Also listen for selectElements event
                $(elementSelect).on('selectElements', () => {
                    console.log('selectElements event fired');
                    setTimeout(() => this.handleAssetChange(), 100);
                });

                // And removeElements event
                $(elementSelect).on('removeElements', () => {
                    console.log('removeElements event fired');
                    this.handleRemoveAsset();
                });
            } else {
                console.warn('Could not find .elementselect container');
            }
        } else {
            console.warn('Could not find asset select input');
        }

        if (this.speedInput) {
            this.speedInput.addEventListener('input', (e) => this.handleSpeedChange(e));
        }

        // Load existing data if present
        if (this.options.existingData) {
            this.lottieData = this.options.existingData.data || this.options.existingData;
            this.loadAnimation();
        } else if (this.currentAssetId) {
            // Load from asset
            this.loadAssetData(this.currentAssetId);
        }
    }

    handleAssetChange() {
        if (!this.assetSelectInput) {
            console.warn('handleAssetChange: assetSelectInput not found');
            return;
        }

        const assetId = this.assetSelectInput.value;
        console.log('handleAssetChange called, assetId:', assetId, 'current:', this.currentAssetId);

        if (assetId && assetId !== this.currentAssetId) {
            this.currentAssetId = assetId;
            console.log('Asset changed to:', assetId);

            // Immediately save assetId to the value field
            this.saveData();

            this.loadAssetData(assetId);
        }
    }

    handleRemoveAsset() {
        this.currentAssetId = null;
        this.lottieData = null;
        this.previewContainer.style.display = 'none';
        this.controlsContainer.style.display = 'none';

        if (this.previewInstance) {
            this.previewInstance.destroy();
            this.previewInstance = null;
        }

        // Clear the value field
        if (this.valueInput) {
            this.valueInput.value = '';
        }
    }

    async loadAssetData(assetId) {
        try {
            // Fetch the asset data from Craft
            const response = await fetch(`/actions/assets/thumb?assetId=${assetId}&width=1&height=1`);

            // Get the actual asset URL
            const assetElement = document.querySelector(`[data-id="${assetId}"]`);
            let assetUrl = null;

            if (assetElement) {
                assetUrl = assetElement.getAttribute('data-url');
            }

            if (!assetUrl) {
                // Try to construct URL from asset ID
                const urlResponse = await fetch(`/actions/craft-lottie/default/get-asset-url?assetId=${assetId}`);
                if (urlResponse.ok) {
                    const urlData = await urlResponse.json();
                    assetUrl = urlData.url;
                }
            }

            if (assetUrl) {
                const jsonResponse = await fetch(assetUrl);
                const jsonData = await jsonResponse.json();

                if (this.validateLottieData(jsonData)) {
                    this.lottieData = jsonData;
                    this.loadAnimation();
                } else {
                    alert('The selected file does not appear to be a valid Lottie animation.');
                }
            }
        } catch (error) {
            console.error('Error loading asset data:', error);
            alert('Failed to load the Lottie file. Please try again.');
        }
    }


    validateLottieData(data) {
        // Basic validation: check for essential Lottie properties
        return data &&
               typeof data === 'object' &&
               (data.v || data.version) && // Lottie version
               (data.layers || data.assets); // Has layers or assets
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

        // Save the updated speed
        this.saveData();
    }

    saveData() {
        if (!this.valueInput) return;

        // Build the complete value object
        const value = {
            assetId: this.currentAssetId || null,
            data: this.lottieData || null,
            speed: this.speedInput ? parseFloat(this.speedInput.value) : 1.0
        };

        console.log('Saving field data:', value);
        this.valueInput.value = JSON.stringify(value);
    }
}

// Export for global use
window.LottieEditor = LottieEditor;
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
        this.enableColorEditing = options.enableColorEditing || false;

        this.init();
    }

    init() {
        const fieldContainer = document.getElementById(this.fieldId + '-field');

        if (!fieldContainer) {
            console.error('Field container not found:', this.fieldId + '-field');
            return;
        }

        this.assetSelectInput = fieldContainer.querySelector('input[name*="[assetId]"]');

        this.valueInput = fieldContainer.querySelector(`input[id="${this.fieldId}"]`) ||
                         fieldContainer.querySelector('input[type="hidden"][name$="[lottie]"]');

        this.previewContainer = fieldContainer.querySelector('.lottie-preview-container');
        this.previewElement = fieldContainer.querySelector('.lottie-preview');
        this.speedInput = fieldContainer.querySelector(`input[id="${this.fieldId}-speed"]`) ||
                         fieldContainer.querySelector('input[name$="[speed]"]');
        this.colorsContainer = fieldContainer.querySelector(`#${this.fieldId}-colors`);

        // Listen for asset selection changes
        if (this.assetSelectInput) {
            this.assetSelectInput.addEventListener('change', () => {
                this.handleAssetChange();
            });

            let lastValue = this.assetSelectInput.value;
            const pollInterval = setInterval(() => {
                const currentValue = this.assetSelectInput.value;
                if (currentValue !== lastValue) {
                    lastValue = currentValue;
                    this.handleAssetChange();
                }
            }, 500);

            this.pollInterval = pollInterval;

            this.assetSelectInput.addEventListener('input', () => {
                this.handleAssetChange();
            });

            const elementSelect = this.assetSelectInput.closest('.elementselect') ||
                                 fieldContainer.querySelector('.elementselect');

            if (elementSelect) {
                const elementsContainer = elementSelect.querySelector('.elements');
                if (elementsContainer) {
                    const chipObserver = new MutationObserver((mutations) => {
                        const chips = elementsContainer.querySelectorAll('.element');
                        if (chips.length > 0) {
                            const assetId = chips[0].getAttribute('data-id');
                            if (assetId && assetId !== this.currentAssetId) {
                                this.currentAssetId = assetId;
                                this.saveData();
                                this.loadAssetData(assetId);
                            }
                        } else if (this.currentAssetId) {
                            this.handleRemoveAsset();
                        }
                    });

                    chipObserver.observe(elementsContainer, {
                        childList: true,
                        subtree: true
                    });
                }

                if (typeof $ !== 'undefined') {
                    $(elementSelect).on('selectElements', () => {
                        setTimeout(() => {
                            const chips = elementSelect.querySelectorAll('.element');
                            if (chips.length > 0) {
                                const assetId = chips[0].getAttribute('data-id');
                                if (assetId && assetId !== this.currentAssetId) {
                                    this.currentAssetId = assetId;
                                    this.saveData();
                                    this.loadAssetData(assetId);
                                }
                            }
                        }, 100);
                    });

                    $(elementSelect).on('removeElements', () => {
                        this.handleRemoveAsset();
                    });
                }

                const existingChips = elementSelect.querySelectorAll('.element');
                if (existingChips.length > 0) {
                    const assetId = existingChips[0].getAttribute('data-id');
                    if (assetId && !this.currentAssetId) {
                        this.currentAssetId = assetId;
                        this.loadAssetData(assetId);
                    }
                }
            }

            if (this.assetSelectInput.value && !this.currentAssetId) {
                this.currentAssetId = this.assetSelectInput.value;
                this.loadAssetData(this.currentAssetId);
            }
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
            return;
        }

        const assetId = this.assetSelectInput.value;

        if (assetId && assetId !== this.currentAssetId) {
            this.currentAssetId = assetId;
            this.saveData();
            this.loadAssetData(assetId);
        } else if (!assetId && this.currentAssetId) {
            this.handleRemoveAsset();
        }
    }

    handleRemoveAsset() {
        this.currentAssetId = null;
        this.lottieData = null;
        this.previewContainer.style.display = 'none';

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
            const response = await fetch(`/actions/craft-lottie/default/get-asset-json?assetId=${assetId}`);

            if (!response.ok) {
                throw new Error(`Failed to fetch asset: ${response.status} ${response.statusText}`);
            }

            const jsonData = await response.json();

            if (this.validateLottieData(jsonData)) {
                this.lottieData = jsonData;
                this.loadAnimation();
            } else {
                console.error('Invalid Lottie data structure');
                alert('The selected file does not appear to be a valid Lottie animation.');
            }
        } catch (error) {
            console.error('Error loading asset data:', error);
            alert('Failed to load the Lottie file: ' + error.message);
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
        if (!this.lottieData || !this.previewContainer || !this.previewElement) {
            return;
        }

        this.previewContainer.style.display = 'block';

        if (this.previewInstance) {
            this.previewInstance.destroy();
        }

        if (typeof lottie === 'undefined') {
            this.loadLottieWeb(() => {
                this.renderPreview();
            });
        } else {
            this.renderPreview();
        }

        this.extractColors();
        this.saveData();
    }

    loadLottieWeb(callback) {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.12.2/lottie.min.js';
        script.onload = callback;
        script.onerror = () => {
            console.error('Failed to load lottie-web library');
            alert('Failed to load the Lottie animation library. Please check your internet connection.');
        };
        document.head.appendChild(script);
    }

    renderPreview() {
        if (!this.previewElement) {
            return;
        }

        try {
            this.previewInstance = lottie.loadAnimation({
                container: this.previewElement,
                renderer: 'svg',
                loop: true,
                autoplay: true,
                animationData: this.lottieData
            });

            if (this.speedInput && this.speedInput.value) {
                const speed = parseFloat(this.speedInput.value);
                this.previewInstance.setSpeed(speed);
            }
        } catch (error) {
            console.error('Error rendering preview:', error);
        }
    }

    extractColors() {
        if (!this.enableColorEditing || !this.colorsContainer) return;

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
        if (!this.valueInput) {
            return;
        }

        const value = {
            assetId: this.currentAssetId || null,
            data: this.lottieData || null,
            speed: this.speedInput ? parseFloat(this.speedInput.value) : 1.0
        };

        this.valueInput.value = JSON.stringify(value);
    }
}

// Export for global use
window.LottieEditor = LottieEditor;
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
        this.backgroundColor = options.backgroundColor || null;
        this.previewOnly = options.previewOnly || false;
        this.savedSpeed = null;

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
        
        // Only initialize controls if not in preview-only mode
        if (!this.previewOnly) {
            this.speedInput = fieldContainer.querySelector(`input[id="${this.fieldId}-speed"]`) ||
                             fieldContainer.querySelector('input[name$="[speed]"]');
            this.speedControl = fieldContainer.querySelector('.lottie-speed-control');
            this.speedValue = fieldContainer.querySelector('.lottie-speed-value');
            this.colorsContainer = fieldContainer.querySelector('[id$="-colors"]');
            this.colorEditor = fieldContainer.querySelector('.lottie-color-editor');
        }

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

        if (!this.previewOnly && this.speedInput) {
            this.speedInput.addEventListener('input', (e) => this.handleSpeedChange(e));
            // Update the speed value display
            if (this.speedValue) {
                this.speedValue.textContent = this.speedInput.value;
            }
        }

        // Load existing data if present
        if (this.options.existingData) {
            // Handle both direct data and nested data structure
            if (typeof this.options.existingData === 'object' && this.options.existingData.data) {
                this.lottieData = this.options.existingData.data;
            } else if (this.options.existingData && typeof this.options.existingData === 'object') {
                // In preview-only mode, we might just have assetId
                if (this.options.existingData.assetId && !this.options.existingData.data) {
                    // Just store the asset ID, load the data from asset
                    this.currentAssetId = this.options.existingData.assetId;
                    this.loadAssetData(this.currentAssetId);
                    return;
                } else {
                    this.lottieData = this.options.existingData;
                }
            }
            
            // Store saved speed for preview use
            if (this.options.existingData && this.options.existingData.speed) {
                this.savedSpeed = parseFloat(this.options.existingData.speed);
            }
            
            // Set speed from existing data if available (only in edit mode)
            if (!this.previewOnly && this.speedInput) {
                const savedSpeed = this.savedSpeed || 1.0;
                this.speedInput.value = savedSpeed;
                if (this.speedValue) {
                    this.speedValue.textContent = parseFloat(savedSpeed).toFixed(1);
                }
            }
            
            // Set background color if available
            if (this.options.existingData.backgroundColor) {
                this.backgroundColor = this.options.existingData.backgroundColor;
            }
            
            // Only load animation if we have data
            if (this.lottieData) {
                this.loadAnimation();
            } else if (this.currentAssetId) {
                this.loadAssetData(this.currentAssetId);
            }
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
        
        // Hide all UI elements
        if (this.previewContainer) {
            this.previewContainer.style.display = 'none';
        }
        if (!this.previewOnly) {
            if (this.speedControl) {
                this.speedControl.style.display = 'none';
            }
            if (this.colorEditor) {
                this.colorEditor.style.display = 'none';
            }
            if (this.colorsContainer) {
                this.colorsContainer.innerHTML = '';
            }
        }

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
                const errorData = await response.json().catch(() => ({}));
                const errorMessage = errorData.error || `Failed to fetch asset: ${response.status} ${response.statusText}`;
                const errorCode = errorData.errorCode || 'FETCH_ERROR';
                this.showError(errorMessage, errorCode);
                return;
            }

            const responseData = await response.json();
            
            // Check if response contains an error
            if (responseData.error) {
                this.showError(responseData.error, responseData.errorCode || 'VALIDATION_ERROR');
                return;
            }
            
            // Handle response structure: { animation: {...}, backgroundColor: '...', speed: 1.0 }
            const jsonData = responseData.animation || responseData;
            
            if (this.validateLottieData(jsonData)) {
                this.lottieData = jsonData;
                
                // Set background color if provided
                if (responseData.backgroundColor) {
                    this.backgroundColor = responseData.backgroundColor;
                }
                
                // Set speed from response or default
                const savedSpeed = responseData.speed || 1.0;
                this.savedSpeed = savedSpeed; // Store for preview use
                if (!this.previewOnly && this.speedInput) {
                    this.speedInput.value = savedSpeed;
                    if (this.speedValue) {
                        this.speedValue.textContent = parseFloat(savedSpeed).toFixed(1);
                    }
                }
                
                this.loadAnimation();
            } else {
                this.showError('The selected file does not appear to be a valid Lottie animation. Please ensure the file contains valid Lottie JSON data.', 'INVALID_STRUCTURE');
            }
        } catch (error) {
            console.error('Error loading asset data:', error);
            this.showError(`An unexpected error occurred while loading the file: ${error.message}`, 'UNEXPECTED_ERROR');
        }
    }


    validateLottieData(data) {
        // Basic validation: check for essential Lottie properties
        if (!data || typeof data !== 'object') {
            return false;
        }

        // Check for required properties
        const hasVersion = data.v !== undefined || data.version !== undefined;
        const hasLayersOrAssets = (data.layers && Array.isArray(data.layers)) || 
                                   (data.assets && Array.isArray(data.assets));
        const hasFrameRate = data.fr !== undefined && typeof data.fr === 'number' && data.fr > 0;
        const hasDimensions = data.w !== undefined && data.h !== undefined && 
                             typeof data.w === 'number' && typeof data.h === 'number' &&
                             data.w > 0 && data.h > 0;

        return hasVersion && hasLayersOrAssets && hasFrameRate && hasDimensions;
    }

    showError(message, errorCode = 'ERROR') {
        console.error(`[Lottie Editor ${errorCode}]:`, message);
        
        // Show error in preview container if available
        if (this.previewContainer) {
            this.previewContainer.innerHTML = `
                <div class="lottie-error" style="padding: 20px; text-align: center; color: #cf1124;">
                    <p style="font-weight: 600; margin-bottom: 8px;">Unable to load animation</p>
                    <p style="font-size: 14px; color: #6b7280;">${this.escapeHtml(message)}</p>
                </div>
            `;
        }

        // Show alert for critical errors
        if (errorCode === 'EMPTY_FILE' || errorCode === 'INVALID_LOTTIE' || errorCode === 'VALIDATION_ERROR') {
            if (typeof Craft !== 'undefined' && Craft.cp && Craft.cp.displayError) {
                Craft.cp.displayError(message);
            } else {
                alert(message);
            }
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    loadAnimation() {
        if (!this.lottieData || !this.previewContainer || !this.previewElement) {
            return;
        }

        // Show preview container
        this.previewContainer.style.display = 'block';

        // Show speed control if enabled (only in edit mode)
        if (!this.previewOnly && this.speedControl) {
            this.speedControl.style.display = 'block';
        }

        // Show color editor if enabled (only in edit mode)
        if (!this.previewOnly && this.colorEditor) {
            this.colorEditor.style.display = 'block';
        }

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

        // Extract colors after preview is rendered (only in edit mode)
        if (!this.previewOnly) {
            setTimeout(() => {
                this.extractColors();
            }, 100);
        }
        
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

        // Apply background color
        if (this.backgroundColor) {
            this.previewElement.style.backgroundColor = this.backgroundColor;
        } else {
            this.previewElement.style.backgroundColor = '';
        }

        try {
            this.previewInstance = lottie.loadAnimation({
                container: this.previewElement,
                renderer: 'svg',
                loop: true,
                autoplay: true,
                animationData: this.lottieData
            });

            // Set speed if available (use saved speed or default to 1.0)
            let speed = 1.0;
            if (!this.previewOnly && this.speedInput && this.speedInput.value) {
                speed = parseFloat(this.speedInput.value);
            } else if (this.options.existingData && this.options.existingData.speed) {
                speed = parseFloat(this.options.existingData.speed);
            } else if (this.savedSpeed) {
                speed = parseFloat(this.savedSpeed);
            }
            this.previewInstance.setSpeed(speed);
        } catch (error) {
            console.error('Error rendering preview:', error);
        }
    }

    extractColors() {
        if (this.previewOnly) {
            return;
        }
        
        if (!this.colorsContainer) {
            // Try to find it again using the field container
            const fieldContainer = document.getElementById(this.fieldId + '-field');
            if (fieldContainer) {
                this.colorsContainer = fieldContainer.querySelector('[id$="-colors"]');
            }
            if (!this.colorsContainer) {
                return;
            }
        }

        if (!this.lottieData) {
            return;
        }

        const colors = new Set();
        this.findColors(this.lottieData, colors);
        
        this.colorsContainer.innerHTML = '';
        
        if (colors.size === 0) {
            const noColorsMsg = document.createElement('p');
            noColorsMsg.className = 'light';
            noColorsMsg.style.color = '#718096';
            noColorsMsg.style.fontSize = '13px';
            noColorsMsg.style.margin = '10px 0 0 0';
            noColorsMsg.textContent = 'No editable colors found in this animation.';
            this.colorsContainer.appendChild(noColorsMsg);
            return;
        }
        
        Array.from(colors).forEach((color, index) => {
            this.createColorPicker(color, index);
        });
    }

    findColors(obj, colors, path = '') {
        if (typeof obj !== 'object' || obj === null) return;

        for (const key in obj) {
            const value = obj[key];
            const currentPath = path ? `${path}.${key}` : key;
            
            // Look for color properties: 'c' (color), 's' (stroke), 'fc' (fill color)
            if (['c', 's', 'fc'].includes(key) && value !== null && value !== undefined) {
                // Check if it's a keyframed color object (has 'k' property)
                if (typeof value === 'object' && !Array.isArray(value) && value.k !== undefined) {
                    // Handle keyframed color - k can be an array directly or nested
                    let colorArray = null;
                    
                    if (Array.isArray(value.k)) {
                        // k is directly an array
                        if (value.k.length >= 3 && typeof value.k[0] === 'number') {
                            colorArray = value.k;
                        }
                    } else if (value.k && typeof value.k === 'object' && Array.isArray(value.k)) {
                        // k might be nested
                        colorArray = value.k;
                    }
                    
                    if (colorArray && colorArray.length >= 3) {
                        const colorHex = this.rgbArrayToHex(colorArray);
                        colors.add(colorHex);
                    }
                }
                // Check if it's a direct color array [r, g, b]
                else if (Array.isArray(value) && value.length >= 3 && typeof value[0] === 'number') {
                    const colorHex = this.rgbArrayToHex(value);
                    colors.add(colorHex);
                }
            }
            // Recursively search nested objects (but skip arrays that are already checked)
            else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                this.findColors(value, colors, currentPath);
            }
            // Also recurse into arrays to find nested color objects
            else if (Array.isArray(value)) {
                value.forEach((item, index) => {
                    if (typeof item === 'object' && item !== null) {
                        this.findColors(item, colors, `${currentPath}[${index}]`);
                    }
                });
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
        colorSwatch.dataset.originalColor = color;
        
        const colorLabel = document.createElement('span');
        colorLabel.textContent = `Color ${index + 1}: ${color.toUpperCase()}`;
        
        colorSwatch.addEventListener('change', (e) => {
            const oldColor = colorSwatch.dataset.originalColor;
            const newColor = e.target.value;
            this.updateColor(oldColor, newColor);
            colorSwatch.dataset.originalColor = newColor;
            colorLabel.textContent = `Color ${index + 1}: ${newColor.toUpperCase()}`;
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
            const value = obj[key];
            
            // Handle color properties: c, s, fc
            if (['c', 's', 'fc'].includes(key) && Array.isArray(value)) {
                // Keyframed color (has 'k' property)
                if (value.k && Array.isArray(value.k) && value.k.length >= 3) {
                    if (this.colorsMatch(value.k, oldRgb)) {
                        value.k[0] = newRgb[0];
                        value.k[1] = newRgb[1];
                        value.k[2] = newRgb[2];
                    }
                }
                // Direct color array
                else if (value.length >= 3 && typeof value[0] === 'number') {
                    if (this.colorsMatch(value, oldRgb)) {
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

    colorsMatch(color, targetRgb) {
        const tolerance = 0.01;
        return Math.abs(color[0] - targetRgb[0]) < tolerance &&
               Math.abs(color[1] - targetRgb[1]) < tolerance &&
               Math.abs(color[2] - targetRgb[2]) < tolerance;
    }

    handleSpeedChange(event) {
        const speed = parseFloat(event.target.value);
        
        // Update the speed value display
        if (this.speedValue) {
            this.speedValue.textContent = speed.toFixed(1);
        }
        
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

        // In preview-only mode, just save the asset ID
        if (this.previewOnly) {
            const value = {
                assetId: this.currentAssetId || null
            };
            this.valueInput.value = JSON.stringify(value);
            return;
        }

        const value = {
            assetId: this.currentAssetId || null,
            data: this.lottieData || null,
            speed: this.speedInput ? parseFloat(this.speedInput.value) : 1.0,
            backgroundColor: this.backgroundColor || null
        };

        this.valueInput.value = JSON.stringify(value);
    }
}

// Export for global use
window.LottieEditor = LottieEditor;
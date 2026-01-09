/**
 * Handles layer visibility and management
 */
class LayerManager {
    constructor(config) {
        this.layersContainer = config.layersContainer;
        this.lottieData = null;
        this.onLayerChange = config.onLayerChange || (() => {});
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
     * Extract and display layers
     */
    extractLayers() {
        if (!this.layersContainer || !this.lottieData) {
            return;
        }

        if (!this.lottieData.layers || !Array.isArray(this.lottieData.layers)) {
            this.layersContainer.innerHTML = `<div class="lottie-layers-empty">${this.translations?.noLayers || 'No layers found in this animation'}</div>`;
            return;
        }

        this.layersContainer.innerHTML = '';

        // Process layers in reverse order (top to bottom in UI, but maintain layer order)
        const layers = [...this.lottieData.layers].reverse();
        
        layers.forEach((layer, index) => {
            const originalIndex = this.lottieData.layers.length - 1 - index;
            this.createLayerControl(layer, originalIndex);
        });
    }

    /**
     * Create layer control UI
     * @param {Object} layer - Layer data
     * @param {number} layerIndex - Layer index
     */
    createLayerControl(layer, layerIndex) {
        const layerItem = document.createElement('div');
        layerItem.className = 'lottie-layer-item';
        layerItem.dataset.layerIndex = layerIndex;

        // Determine if layer is visible
        // Check _hidden flag first, then check op > ip
        const layerIp = layer.ip !== undefined ? layer.ip : 0;
        const layerOp = layer.op !== undefined ? layer.op : (this.lottieData.op || 60);
        const isVisible = layer._hidden === undefined ? (layerOp > layerIp) : !layer._hidden;

        const layerToggle = document.createElement('label');
        layerToggle.className = 'lottie-layer-toggle';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = isVisible;
        checkbox.className = 'lottie-layer-checkbox';
        
        const toggleLabel = document.createElement('span');
        toggleLabel.className = 'lottie-layer-toggle-label';
        
        const layerInfo = document.createElement('div');
        layerInfo.className = 'lottie-layer-info';
        
        const layerName = document.createElement('div');
        layerName.className = 'lottie-layer-name';
        layerName.textContent = layer.nm || `Layer ${layerIndex + 1}`;
        
        const layerType = document.createElement('div');
        layerType.className = 'lottie-layer-type';
        layerType.textContent = this.getLayerTypeName(layer.ty);

        layerInfo.appendChild(layerName);
        layerInfo.appendChild(layerType);

        toggleLabel.appendChild(checkbox);
        toggleLabel.appendChild(layerInfo);
        layerToggle.appendChild(toggleLabel);

        checkbox.addEventListener('change', () => {
            this.toggleLayerVisibility(layerIndex, checkbox.checked);
        });

        layerItem.appendChild(layerToggle);
        this.layersContainer.appendChild(layerItem);
    }

    /**
     * Get layer type name
     * @param {number} type - Layer type number
     * @returns {string} Layer type name
     */
    getLayerTypeName(type) {
        const types = {
            0: 'Precomp',
            1: 'Solid',
            2: 'Image',
            3: 'Null',
            4: 'Shape',
            5: 'Text',
            6: 'Audio',
            13: 'Camera'
        };
        return types[type] || `Type ${type}`;
    }

    /**
     * Toggle layer visibility
     * @param {number} layerIndex - Layer index
     * @param {boolean} visible - Visibility state
     */
    toggleLayerVisibility(layerIndex, visible) {
        if (!this.lottieData.layers || !this.lottieData.layers[layerIndex]) {
            console.warn('Layer not found at index:', layerIndex);
            return;
        }

        const layer = this.lottieData.layers[layerIndex];
        const animationOp = this.lottieData.op || 60;
        const layerIp = layer.ip !== undefined ? layer.ip : 0;
        
        // Store original op if not already stored
        if (!layer._originalOp) {
            layer._originalOp = layer.op !== undefined ? layer.op : animationOp;
        }

        // Store visibility state
        layer._hidden = !visible;

        this.onLayerChange();
        this.onChange();
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
    module.exports = LayerManager;
}

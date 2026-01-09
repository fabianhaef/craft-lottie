/**
 * Handles text layer editing
 */
class TextEditor {
    constructor(config) {
        this.textContainer = config.textContainer;
        this.lottieData = null;
        this.onTextChange = config.onTextChange || (() => {});
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
     * Extract and display text layers
     */
    extractTextLayers() {
        if (!this.textContainer || !this.lottieData) {
            return;
        }

        const textLayers = [];
        this.findTextLayers(this.lottieData, textLayers);

        this.textContainer.innerHTML = '';

        if (textLayers.length === 0) {
            this.textContainer.innerHTML = `<div class="lottie-text-empty">${this.translations?.noTextLayers || 'No editable text layers found in this animation'}</div>`;
            return;
        }

        textLayers.forEach((textLayer, index) => {
            this.createTextEditor(textLayer, index);
        });
    }

    /**
     * Find text layers in Lottie data
     * @param {Object} obj - Object to search
     * @param {Array} textLayers - Array to add text layers to
     * @param {string} layerPath - Current layer path
     * @param {number} layerIndex - Current layer index
     */
    findTextLayers(obj, textLayers, layerPath = '', layerIndex = 0) {
        if (typeof obj !== 'object' || obj === null) return;

        // Recursively search in layers array first (most common structure)
        if (Array.isArray(obj.layers)) {
            obj.layers.forEach((layer, index) => {
                const currentPath = layerPath ? `${layerPath}.layers[${index}]` : `layers[${index}]`;
                this.findTextLayers(layer, textLayers, currentPath, index);
            });
            return; // Don't process layers array itself as a text layer
        }

        // Check if this is a layer with text (ty === 5 means text layer)
        if (obj.ty === 5 && obj.t) {
            const textData = obj.t;
            let texts = [];

            // Handle different text data structures
            // Structure: t.d.k[].s.t (keyframed) or t.d.k.s.t (static)
            if (textData.d && textData.d.k) {
                if (Array.isArray(textData.d.k)) {
                    // Keyframed text: k is an array of keyframes
                    textData.d.k.forEach((keyframe, kIndex) => {
                        if (keyframe.s && typeof keyframe.s.t === 'string') {
                            texts.push({
                                text: keyframe.s.t,
                                keyframeIndex: kIndex,
                                isKeyframed: true,
                                keyframeData: keyframe
                            });
                        }
                    });
                } else if (textData.d.k.s && typeof textData.d.k.s.t === 'string') {
                    // Single keyframe or static text
                    texts.push({
                        text: textData.d.k.s.t,
                        keyframeIndex: 0,
                        isKeyframed: Array.isArray(textData.d.k) === false,
                        keyframeData: textData.d.k
                    });
                }
            }

            if (texts.length > 0) {
                textLayers.push({
                    layerIndex: layerIndex,
                    layerName: obj.nm || `Text Layer ${textLayers.length + 1}`,
                    layerPath: layerPath,
                    texts: texts,
                    layerData: obj
                });
            }
        }
    }

    /**
     * Create text editor UI for a text layer
     * @param {Object} textLayer - Text layer data
     * @param {number} index - Layer index
     */
    createTextEditor(textLayer, index) {
        const textItem = document.createElement('div');
        textItem.className = 'lottie-text-item';
        textItem.dataset.layerIndex = textLayer.layerIndex;
        textItem.dataset.layerPath = textLayer.layerPath;

        const textHeader = document.createElement('div');
        textHeader.className = 'lottie-text-header';
        textHeader.textContent = textLayer.layerName;

        textItem.appendChild(textHeader);

        // Create input for each text in the layer
        textLayer.texts.forEach((textObj, textIndex) => {
            const textInputWrapper = document.createElement('div');
            textInputWrapper.className = 'lottie-text-input-wrapper';

            const textLabel = document.createElement('label');
            textLabel.className = 'lottie-text-label';
            if (textLayer.texts.length > 1) {
                const keyframeLabel = textObj.isKeyframed ? ` (${this.translations?.keyframe || 'Keyframe'} ${textObj.keyframeIndex + 1})` : '';
                textLabel.textContent = `${this.translations?.text || 'Text'} ${textIndex + 1}${keyframeLabel}`;
            } else {
                textLabel.textContent = this.translations?.textContent || 'Text Content';
            }

            const textInput = document.createElement('input');
            textInput.type = 'text';
            textInput.className = 'lottie-text-input';
            textInput.value = textObj.text;
            textInput.dataset.textIndex = textIndex;
            textInput.dataset.keyframeIndex = textObj.keyframeIndex;
            textInput.dataset.isKeyframed = textObj.isKeyframed;

            textInput.addEventListener('input', () => {
                this.updateText(textLayer, textIndex, textInput.value);
            });

            textInputWrapper.appendChild(textLabel);
            textInputWrapper.appendChild(textInput);
            textItem.appendChild(textInputWrapper);
        });

        this.textContainer.appendChild(textItem);
    }

    /**
     * Update text in Lottie data
     * @param {Object} textLayer - Text layer data
     * @param {number} textIndex - Text index
     * @param {string} newText - New text content
     */
    updateText(textLayer, textIndex, newText) {
        const layer = LottieDataUtils.getLayerByPath(this.lottieData, textLayer.layerPath);
        if (!layer || !layer.t || !layer.t.d) {
            console.warn('Could not find layer at path:', textLayer.layerPath);
            return;
        }

        const textObj = textLayer.texts[textIndex];
        
        // Update the text in the JSON structure
        if (Array.isArray(layer.t.d.k)) {
            // Keyframed text: update specific keyframe
            const keyframe = layer.t.d.k[textObj.keyframeIndex];
            if (keyframe && keyframe.s) {
                keyframe.s.t = newText;
            }
        } else if (layer.t.d.k && layer.t.d.k.s) {
            // Static text or single keyframe
            layer.t.d.k.s.t = newText;
        }

        // Update the text in our textLayer object for UI consistency
        textObj.text = newText;

        this.onTextChange();
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
    module.exports = TextEditor;
}

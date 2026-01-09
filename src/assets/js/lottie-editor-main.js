/**
 * Main Lottie Editor class - orchestrates all modules
 */
class LottieEditorMain {
    constructor(config) {
        // Configuration
        this.assetId = config.assetId;
        this.brandPalette = config.brandPalette || [];
        this.csrfToken = config.csrfToken;
        this.csrfParam = config.csrfParam;
        this.translations = config.translations || {};

        // DOM elements
        this.previewContainer = document.getElementById('lottie-preview');
        this.speedControl = document.getElementById('speed-control');
        this.speedInput = document.getElementById('speed-input');
        this.colorContainer = document.getElementById('color-picker-container');
        this.backgroundColorInput = document.getElementById('background-color');
        this.clearBackgroundBtn = document.getElementById('clear-background');
        this.textContainer = document.getElementById('text-editor-container');
        this.layersContainer = document.getElementById('layers-container');
        this.interactionsContainer = document.getElementById('interactions-container');
        this.saveBtn = document.getElementById('save-btn');
        this.saveAsBtn = document.getElementById('save-as-btn');

        // State
        this.lottieData = null;
        this.backgroundColor = null;
        this.speed = 1.0;
        this.hasChanges = false;

        // Initialize modules
        this.animationRenderer = new AnimationRenderer({
            previewContainer: this.previewContainer,
            speedControl: this.speedControl,
            onChange: () => this.markAsChanged()
        });

        this.colorEditor = new ColorEditor({
            colorContainer: this.colorContainer,
            brandPalette: this.brandPalette,
            onColorChange: () => {
                this.animationRenderer.render(this.lottieData, this.backgroundColor, this.speed);
            },
            onChange: () => this.markAsChanged()
        });
        this.colorEditor.setTranslations(this.translations);

        this.textEditor = new TextEditor({
            textContainer: this.textContainer,
            onTextChange: () => {
                this.animationRenderer.render(this.lottieData, this.backgroundColor, this.speed);
            },
            onChange: () => this.markAsChanged()
        });
        this.textEditor.setTranslations(this.translations);

        this.layerManager = new LayerManager({
            layersContainer: this.layersContainer,
            onLayerChange: () => {
                this.animationRenderer.render(this.lottieData, this.backgroundColor, this.speed);
            },
            onChange: () => this.markAsChanged()
        });
        this.layerManager.setTranslations(this.translations);

        this.interactionManager = new InteractionManager({
            interactionsContainer: this.interactionsContainer,
            interactions: [],
            translations: this.translations,
            onChange: () => this.markAsChanged()
        });

        this.dataManager = new DataManager({
            assetId: this.assetId,
            csrfToken: this.csrfToken,
            csrfParam: this.csrfParam,
            onDataLoaded: (data) => this.handleDataLoaded(data),
            onError: (message, code) => this.showError(message, code)
        });

        // Setup event listeners
        this.setupEventListeners();
    }

    /**
     * Initialize the editor
     */
    async init() {
        if (!this.assetId) {
            this.showError('Invalid asset ID', 'INVALID_ASSET_ID');
            return;
        }

        // Load data
        const data = await this.dataManager.loadData();
        if (data) {
            this.handleDataLoaded(data);
        }
    }

    /**
     * Handle loaded data
     * @param {Object} data - Loaded data
     */
    handleDataLoaded(data) {
        this.lottieData = data.animation;
        this.backgroundColor = data.backgroundColor || null;
        this.speed = data.speed || 1.0;
        const interactions = data.interactions || [];

        // Update UI
        if (this.backgroundColor) {
            this.backgroundColorInput.value = this.backgroundColor;
        }
        
        if (this.speedControl && this.speedInput) {
            this.speedControl.value = this.speed;
            this.speedInput.value = this.speed;
        }

        // Set data in modules
        this.colorEditor.setLottieData(this.lottieData);
        this.textEditor.setLottieData(this.lottieData);
        this.layerManager.setLottieData(this.lottieData);
        this.interactionManager.setInteractions(interactions);

        // Render everything
        this.animationRenderer.render(this.lottieData, this.backgroundColor, this.speed);
        this.colorEditor.extractColors();
        this.textEditor.extractTextLayers();
        this.layerManager.extractLayers();
        this.interactionManager.renderInteractions();
        this.interactionManager.initializeInteractionMenu();

        // Re-initialize menu after renderInteractions in case it was removed
        const originalRenderInteractions = this.interactionManager.renderInteractions.bind(this.interactionManager);
        this.interactionManager.renderInteractions = () => {
            originalRenderInteractions();
            setTimeout(() => {
                const btn = document.getElementById('add-interaction-btn');
                if (btn && !btn.hasAttribute('data-garnish-initialized')) {
                    this.interactionManager.initializeInteractionMenu();
                }
            }, 50);
        };
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Speed control synchronization
        const syncSpeed = (value) => {
            if (this.speedControl) this.speedControl.value = value;
            if (this.speedInput) this.speedInput.value = value;
            this.speed = parseFloat(value) || 1.0;
            this.animationRenderer.setSpeed(this.speed);
            this.markAsChanged();
        };

        if (this.speedControl) {
            this.speedControl.addEventListener('input', function() {
                syncSpeed(this.value);
            });
        }

        if (this.speedInput) {
            this.speedInput.addEventListener('input', function() {
                let value = parseFloat(this.value);
                if (isNaN(value) || value < 0.1) value = 0.1;
                if (value > 5.0) value = 5.0;
                this.value = value;
                syncSpeed(value);
            });

            this.speedInput.addEventListener('blur', function() {
                if (!this.value || parseFloat(this.value) <= 0) {
                    this.value = 1.0;
                    syncSpeed(1.0);
                }
            });
        }

        // Background color control
        if (this.backgroundColorInput) {
            this.backgroundColorInput.addEventListener('input', (e) => {
                this.backgroundColor = e.target.value;
                if (this.previewContainer) {
                    this.previewContainer.style.backgroundColor = this.backgroundColor;
                }
                this.markAsChanged();
            });
        }

        if (this.clearBackgroundBtn) {
            this.clearBackgroundBtn.addEventListener('click', () => {
                this.backgroundColor = null;
                this.backgroundColorInput.value = '#ffffff';
                if (this.previewContainer) {
                    this.previewContainer.style.backgroundColor = '';
                }
                this.markAsChanged();
            });
        }

        // Save button handler
        if (this.saveBtn) {
            this.saveBtn.addEventListener('click', () => {
                if (!this.hasChanges) return;
                this.save('save');
            });
        }

        // Save as Copy button handler
        if (this.saveAsBtn) {
            this.saveAsBtn.addEventListener('click', () => {
                this.save('saveAs');
            });
        }
    }

    /**
     * Save data
     * @param {string} saveType - 'save' or 'saveAs'
     */
    async save(saveType = 'save') {
        const button = saveType === 'saveAs' ? this.saveAsBtn : this.saveBtn;
        const savingText = this.translations.saving || 'Saving...';
        const savedText = this.translations.saved || 'Saved!';
        const buttonText = saveType === 'saveAs' 
            ? (this.translations.saveAsCopy || 'Save as Copy')
            : (this.translations.saveChanges || 'Save Changes');

        button.disabled = true;
        button.textContent = savingText;

        try {
            const result = await this.dataManager.saveData({
                lottieData: this.lottieData,
                backgroundColor: this.backgroundColor,
                speed: this.speed,
                interactions: this.interactionManager.getInteractions()
            }, saveType);

            if (result.success) {
                if (saveType === 'save') {
                    this.hasChanges = false;
                    button.textContent = savedText;
                    setTimeout(() => {
                        button.textContent = buttonText;
                        button.disabled = true;
                    }, 2000);
                } else {
                    button.textContent = savedText;
                    setTimeout(() => {
                        button.textContent = buttonText;
                        button.disabled = false;
                    }, 2000);
                }

                const successMessage = saveType === 'saveAs'
                    ? (this.translations.savedAsNewAsset || 'Animation saved as new asset successfully')
                    : (this.translations.savedSuccessfully || 'Animation saved successfully');

                if (typeof Craft !== 'undefined' && Craft.cp && Craft.cp.displayNotice) {
                    Craft.cp.displayNotice(successMessage);
                }

                // Redirect for save-as
                if (saveType === 'saveAs' && result.assetId) {
                    setTimeout(() => {
                        window.location.href = `/admin/craft-lottie/edit/${result.assetId}`;
                    }, 1500);
                }
            } else {
                throw new Error(result.error || (this.translations.failedToSave || 'Failed to save'));
            }
        } catch (error) {
            console.error('Save failed:', error);
            button.disabled = false;
            button.textContent = buttonText;
            
            const errorMessage = saveType === 'saveAs'
                ? (this.translations.failedToSaveAsNewAsset || 'Failed to save as new asset:')
                : (this.translations.failedToSaveAnimation || 'Failed to save animation:');

            if (typeof Craft !== 'undefined' && Craft.cp && Craft.cp.displayError) {
                Craft.cp.displayError(errorMessage + ' ' + error.message);
            }
        }
    }

    /**
     * Mark as changed
     */
    markAsChanged() {
        this.hasChanges = true;
        if (this.saveBtn) {
            this.saveBtn.disabled = false;
        }
    }

    /**
     * Show error message
     * @param {string} message - Error message
     * @param {string} errorCode - Error code
     */
    showError(message, errorCode = 'ERROR') {
        if (this.animationRenderer) {
            this.animationRenderer.showError(message, errorCode);
        }
    }
}

// Export for global use
if (typeof window !== 'undefined') {
    window.LottieEditorMain = LottieEditorMain;
}

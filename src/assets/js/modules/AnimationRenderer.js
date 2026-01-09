/**
 * Handles Lottie animation rendering and preview
 */
class AnimationRenderer {
    constructor(config) {
        this.previewContainer = config.previewContainer;
        this.speedControl = config.speedControl;
        this.onChange = config.onChange || (() => {});
        this.animation = null;
        
        // Performance: Cache cleaned/fixed animation data
        this.cachedData = {
            original: null,
            cleaned: null,
            dataHash: null
        };
        
        // Performance: Debounce rendering to avoid excessive re-renders
        this.renderTimeout = null;
        this.pendingRender = null;
    }

    /**
     * Render the animation (debounced)
     * @param {Object} lottieData - Lottie animation data
     * @param {string|null} backgroundColor - Background color (hex)
     * @param {number} speed - Animation speed
     */
    render(lottieData, backgroundColor, speed) {
        // Clear any pending render
        if (this.renderTimeout) {
            clearTimeout(this.renderTimeout);
        }
        
        // Store pending render parameters
        this.pendingRender = { lottieData, backgroundColor, speed };
        
        // Debounce: wait 50ms before actually rendering (batches rapid changes)
        this.renderTimeout = setTimeout(() => {
            this._doRender(this.pendingRender.lottieData, this.pendingRender.backgroundColor, this.pendingRender.speed);
            this.pendingRender = null;
        }, 50);
    }

    /**
     * Internal render method (actual rendering logic)
     * @param {Object} lottieData - Lottie animation data
     * @param {string|null} backgroundColor - Background color (hex)
     * @param {number} speed - Animation speed
     */
    _doRender(lottieData, backgroundColor, speed) {
        // Check if we can just update speed/background without full re-render
        if (this.animation && this.cachedData.original === lottieData) {
            // Only update speed and background if data hasn't changed
            this.setSpeed(speed);
            if (backgroundColor) {
                this.previewContainer.style.backgroundColor = backgroundColor;
            } else {
                this.previewContainer.style.backgroundColor = '';
            }
            return;
        }

        if (this.animation) {
            try {
                this.animation.destroy();
            } catch (e) {
                // Ignore destroy errors
            }
            this.animation = null;
        }

        // Clear loading state
        this.previewContainer.innerHTML = '';

        // Apply background color
        if (backgroundColor) {
            this.previewContainer.style.backgroundColor = backgroundColor;
        } else {
            this.previewContainer.style.backgroundColor = '';
        }

        if (!lottieData) {
            this.previewContainer.innerHTML = '<div class="lottie-loading"><p style="color: #cf1124;">No animation data available</p></div>';
            return;
        }

        try {
            // Performance: Check cache first
            const dataHash = this.hashData(lottieData);
            let animationDataCopy;
            
            if (this.cachedData.original === lottieData && this.cachedData.cleaned) {
                // Use cached cleaned data
                animationDataCopy = this.cachedData.cleaned;
            } else {
                // Create a clean copy without our internal flags
                // Use structuredClone if available (faster than JSON.parse/stringify)
                if (typeof structuredClone !== 'undefined') {
                    animationDataCopy = structuredClone(lottieData);
                } else {
                    animationDataCopy = JSON.parse(JSON.stringify(lottieData));
                }
                
                // Cache the cleaned data
                this.cachedData.original = lottieData;
                this.cachedData.dataHash = dataHash;
                
                // Remove our internal flags before rendering
                LottieDataUtils.cleanLottieData(animationDataCopy);
                
                // Text layers need t.p, t.m, and t.a to work properly with lottie-web
                if (animationDataCopy.layers && Array.isArray(animationDataCopy.layers)) {
                    animationDataCopy.layers.forEach((layer) => {
                        if (layer.ty === 5 && layer.t) {
                            if (!layer.t.p) {
                                layer.t.p = {};
                            }
                            
                            // Add text more options if missing
                            if (!layer.t.m) {
                                layer.t.m = {
                                    g: 1,
                                    a: { a: 0, k: [0, 0], ix: 2 }
                                };
                            }
                            
                            // Add empty text animators array if missing
                            if (!layer.t.a) {
                                layer.t.a = [];
                            }
                        }
                    });
                }
                
                // Fix keyframe structures
                LottieDataUtils.fixKeyframeStructures(animationDataCopy);
                
                // Store cleaned version in cache
                this.cachedData.cleaned = animationDataCopy;
            }
            
            // Apply layer visibility by filtering layers (safer than modifying op)
            // Create a filtered copy for rendering (don't modify cached version)
            let renderData = animationDataCopy;
            if (animationDataCopy.layers && Array.isArray(animationDataCopy.layers) && lottieData.layers) {
                // Check if any layers are hidden
                const hasHiddenLayers = lottieData.layers.some(layer => layer._hidden === true);
                if (hasHiddenLayers) {
                    // Create a shallow copy and filter layers
                    renderData = { ...animationDataCopy };
                    renderData.layers = animationDataCopy.layers.filter((layer, index) => {
                        const originalLayer = lottieData.layers[index];
                        if (originalLayer && originalLayer._hidden === true) {
                            return false; // Hide this layer
                        }
                        return true; // Show this layer
                    });
                }
            }
            
            this.animation = lottie.loadAnimation({
                container: this.previewContainer,
                renderer: 'svg',
                loop: true,
                autoplay: true,
                animationData: renderData
            });

            // Apply speed
            const speedValue = parseFloat(speed) || 1.0;
            if (!isNaN(speedValue) && speedValue > 0) {
                this.animation.setSpeed(speedValue);
            } else {
                this.animation.setSpeed(1.0);
            }
        } catch (error) {
            console.error('Error rendering animation:', error);
            console.error('Error details:', {
                message: error.message,
                stack: error.stack,
                name: error.name
            });
            console.error('Lottie data keys:', lottieData ? Object.keys(lottieData) : 'null');
            this.showError('Error rendering animation: ' + error.message, 'RENDER_ERROR');
        }
    }

    /**
     * Update animation speed
     * @param {number} speed - New speed value
     */
    setSpeed(speed) {
        if (this.animation) {
            const speedValue = parseFloat(speed) || 1.0;
            if (!isNaN(speedValue) && speedValue > 0) {
                this.animation.setSpeed(speedValue);
            }
        }
    }

    /**
     * Show error message with actionable guidance
     * @param {string} message - Error message
     * @param {string} errorCode - Error code
     */
    showError(message, errorCode = 'ERROR') {
        // Get user-friendly error message and suggestions
        const errorInfo = this.getErrorInfo(errorCode, message);
        
        const errorHtml = `
            <div class="lottie-error">
                <div class="lottie-error-icon">⚠️</div>
                <div class="lottie-error-title">${LottieDataUtils.escapeHtml(errorInfo.title)}</div>
                <div class="lottie-error-message">${LottieDataUtils.escapeHtml(errorInfo.message)}</div>
                ${errorInfo.suggestion ? `<div class="lottie-error-suggestion">${LottieDataUtils.escapeHtml(errorInfo.suggestion)}</div>` : ''}
                <div class="lottie-error-code">Error code: ${errorCode}</div>
                <button class="btn" onclick="location.reload()" style="margin-top: 16px;">Reload Page</button>
            </div>
        `;
        this.previewContainer.innerHTML = errorHtml;
    }

    /**
     * Get user-friendly error information
     * @param {string} errorCode - Error code
     * @param {string} message - Original error message
     * @returns {Object} Error information object
     */
    getErrorInfo(errorCode, message) {
        const errorMap = {
            'INVALID_ASSET_ID': {
                title: 'Invalid Animation',
                message: 'The animation file could not be found or is invalid.',
                suggestion: 'Please go back to the library and select a valid Lottie animation file.'
            },
            'NETWORK_ERROR': {
                title: 'Network Error',
                message: 'Failed to load the animation. Please check your internet connection.',
                suggestion: 'Try refreshing the page or check if the server is accessible.'
            },
            'INVALID_DATA': {
                title: 'Invalid Animation Data',
                message: 'The animation file appears to be corrupted or in an unsupported format.',
                suggestion: 'Please ensure the file is a valid Lottie JSON or .lottie file.'
            },
            'RENDER_ERROR': {
                title: 'Rendering Error',
                message: 'The animation could not be displayed. This may be due to an unsupported feature or corrupted data.',
                suggestion: 'Try opening the file in a Lottie viewer to verify it\'s valid, or contact support if the issue persists.'
            }
        };

        const defaultInfo = {
            title: 'Unable to Load Animation',
            message: message || 'An unexpected error occurred.',
            suggestion: 'Please try refreshing the page. If the problem persists, contact support.'
        };

        return errorMap[errorCode] || defaultInfo;
    }

    /**
     * Simple hash function for data change detection
     * @param {Object} obj - Object to hash
     * @returns {string} Hash string
     */
    hashData(obj) {
        if (!obj) return 'null';
        try {
            const str = JSON.stringify(obj);
            return `${str.length}_${Object.keys(obj).length}`;
        } catch (e) {
            return 'error';
        }
    }

    /**
     * Destroy the animation instance
     */
    destroy() {
        if (this.renderTimeout) {
            clearTimeout(this.renderTimeout);
            this.renderTimeout = null;
        }
        if (this.animation) {
            try {
                this.animation.destroy();
            } catch (e) {
                // Ignore destroy errors
            }
            this.animation = null;
        }
        // Clear cache
        this.cachedData = {
            original: null,
            cleaned: null,
            dataHash: null
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AnimationRenderer;
}

/**
 * Handles Lottie animation rendering and preview
 */
class AnimationRenderer {
    constructor(config) {
        this.previewContainer = config.previewContainer;
        this.speedControl = config.speedControl;
        this.onChange = config.onChange || (() => {});
        this.animation = null;
    }

    /**
     * Render the animation
     * @param {Object} lottieData - Lottie animation data
     * @param {string|null} backgroundColor - Background color (hex)
     * @param {number} speed - Animation speed
     */
    render(lottieData, backgroundColor, speed) {
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
            // Create a clean copy without our internal flags
            const animationDataCopy = JSON.parse(JSON.stringify(lottieData));
            
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
            
            // Apply layer visibility by filtering layers (safer than modifying op)
            if (animationDataCopy.layers && Array.isArray(animationDataCopy.layers) && lottieData.layers) {
                // Filter out hidden layers for preview
                animationDataCopy.layers = animationDataCopy.layers.filter((layer, index) => {
                    const originalLayer = lottieData.layers[index];
                    if (originalLayer && originalLayer._hidden === true) {
                        return false; // Hide this layer
                    }
                    return true; // Show this layer
                });
            }
            
            this.animation = lottie.loadAnimation({
                container: this.previewContainer,
                renderer: 'svg',
                loop: true,
                autoplay: true,
                animationData: animationDataCopy
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
     * Show error message
     * @param {string} message - Error message
     * @param {string} errorCode - Error code
     */
    showError(message, errorCode = 'ERROR') {
        const errorHtml = `
            <div class="lottie-error" style="padding: 24px; text-align: center;">
                <div style="color: #cf1124; font-size: 18px; font-weight: 600; margin-bottom: 8px;">
                    Unable to load animation
                </div>
                <div style="color: #6b7280; font-size: 14px; margin-bottom: 16px;">
                    ${LottieDataUtils.escapeHtml(message)}
                </div>
                <div style="font-size: 12px; color: #9ca3af;">
                    Error code: ${errorCode}
                </div>
            </div>
        `;
        this.previewContainer.innerHTML = errorHtml;
    }

    /**
     * Destroy the animation instance
     */
    destroy() {
        if (this.animation) {
            try {
                this.animation.destroy();
            } catch (e) {
                // Ignore destroy errors
            }
            this.animation = null;
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AnimationRenderer;
}

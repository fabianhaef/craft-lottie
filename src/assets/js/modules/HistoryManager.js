/**
 * Handles undo/redo functionality for the Lottie editor
 */
class HistoryManager {
    constructor(editor, maxHistorySize = 50) {
        this.editor = editor;
        this.maxHistorySize = maxHistorySize;
        this.history = [];
        this.currentIndex = -1;
        this.isUndoing = false;
        this.historySaveTimeout = null;
    }

    /**
     * Save current state to history
     */
    saveState() {
        if (this.isUndoing) return;

        // Remove any states after current index (when undoing then making new changes)
        if (this.currentIndex < this.history.length - 1) {
            this.history = this.history.slice(0, this.currentIndex + 1);
        }

        // Create a snapshot of current state
        const state = this.createSnapshot();

        // Add to history
        this.history.push(state);
        this.currentIndex++;

        // Limit history size
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
            this.currentIndex--;
        }

        this.updateUI();
    }

    /**
     * Create a snapshot of current state
     * @returns {Object} State snapshot
     */
    createSnapshot() {
        return {
            lottieData: this.deepClone(this.editor.lottieData),
            backgroundColor: this.editor.backgroundColor,
            speed: this.editor.speed,
            timestamp: Date.now()
        };
    }

    /**
     * Deep clone an object
     * @param {Object} obj - Object to clone
     * @returns {Object} Cloned object
     */
    deepClone(obj) {
        if (!obj) return null;
        try {
            if (typeof structuredClone !== 'undefined') {
                return structuredClone(obj);
            }
            return JSON.parse(JSON.stringify(obj));
        } catch (e) {
            console.warn('Failed to clone state:', e);
            return null;
        }
    }

    /**
     * Restore state from snapshot
     * @param {Object} state - State snapshot
     */
    restoreState(state) {
        if (!state) return;

        this.isUndoing = true;

        // Restore data
        this.editor.lottieData = this.deepClone(state.lottieData);
        this.editor.backgroundColor = state.backgroundColor;
        this.editor.speed = state.speed;

        // Update UI
        if (this.editor.backgroundColorInput) {
            this.editor.backgroundColorInput.value = state.backgroundColor || '#ffffff';
        }
        if (this.editor.speedControl) {
            this.editor.speedControl.value = state.speed;
        }
        if (this.editor.speedInput) {
            this.editor.speedInput.value = state.speed;
        }
        if (this.editor.previewContainer) {
            this.editor.previewContainer.style.backgroundColor = state.backgroundColor || '';
        }

        // Update modules
        if (this.editor.colorEditor) {
            this.editor.colorEditor.setLottieData(this.editor.lottieData);
            this.editor.colorEditor.extractColors();
        }
        if (this.editor.textEditor) {
            this.editor.textEditor.setLottieData(this.editor.lottieData);
            this.editor.textEditor.extractTextLayers();
        }
        if (this.editor.layerManager) {
            this.editor.layerManager.setLottieData(this.editor.lottieData);
            this.editor.layerManager.extractLayers();
        }

        // Re-render animation
        if (this.editor.animationRenderer) {
            this.editor.animationRenderer.render(
                this.editor.lottieData,
                this.editor.backgroundColor,
                this.editor.speed
            );
        }

        this.isUndoing = false;
        // Don't mark as changed when undoing/redoing (to avoid creating new history entries)
        // But update the UI
        this.updateUI();
    }

    /**
     * Undo last change
     */
    undo() {
        if (this.canUndo()) {
            this.currentIndex--;
            const state = this.history[this.currentIndex];
            this.restoreState(state);
        }
    }

    /**
     * Redo last undone change
     */
    redo() {
        if (this.canRedo()) {
            this.currentIndex++;
            const state = this.history[this.currentIndex];
            this.restoreState(state);
        }
    }

    /**
     * Check if undo is possible
     * @returns {boolean} True if undo is possible
     */
    canUndo() {
        return this.currentIndex > 0;
    }

    /**
     * Check if redo is possible
     * @returns {boolean} True if redo is possible
     */
    canRedo() {
        return this.currentIndex < this.history.length - 1;
    }

    /**
     * Update undo/redo UI buttons
     */
    updateUI() {
        // This will be called by the editor to update button states
        // The editor should handle the actual UI updates
        if (this.editor.updateHistoryButtons) {
            this.editor.updateHistoryButtons();
        }
    }

    /**
     * Clear history
     */
    clear() {
        this.history = [];
        this.currentIndex = -1;
        this.updateUI();
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HistoryManager;
}

if (typeof window !== 'undefined') {
    window.HistoryManager = HistoryManager;
}

/**
 * Handles keyboard shortcuts for the Lottie editor
 */
class KeyboardShortcuts {
    constructor(editor) {
        this.editor = editor;
        this.shortcuts = new Map();
        this.setupShortcuts();
    }

    /**
     * Setup keyboard shortcuts
     */
    setupShortcuts() {
        // Save (Ctrl+S or Cmd+S)
        this.registerShortcut(['ctrl+s', 'meta+s'], (e) => {
            e.preventDefault();
            if (this.editor.hasChanges && !this.editor.saveBtn.disabled) {
                this.editor.save('save');
            }
        });

        // Save as Copy (Ctrl+Shift+S or Cmd+Shift+S)
        this.registerShortcut(['ctrl+shift+s', 'meta+shift+s'], (e) => {
            e.preventDefault();
            this.editor.save('saveAs');
        });

        // Undo (Ctrl+Z or Cmd+Z)
        this.registerShortcut(['ctrl+z', 'meta+z'], (e) => {
            e.preventDefault();
            if (this.editor.historyManager) {
                this.editor.historyManager.undo();
            }
        });

        // Redo (Ctrl+Shift+Z or Cmd+Shift+Z or Ctrl+Y)
        this.registerShortcut(['ctrl+shift+z', 'meta+shift+z', 'ctrl+y', 'meta+y'], (e) => {
            e.preventDefault();
            if (this.editor.historyManager) {
                this.editor.historyManager.redo();
            }
        });

        // Escape to cancel/close (if applicable)
        this.registerShortcut(['escape'], (e) => {
            // Only handle if there are unsaved changes
            if (this.editor.hasChanges) {
                const confirmed = confirm(this.editor.translations.unsavedChanges || 'You have unsaved changes. Are you sure you want to leave?');
                if (confirmed) {
                    window.location.href = '/admin/craft-lottie';
                }
            }
        });
    }

    /**
     * Register a keyboard shortcut
     * @param {Array<string>} keys - Array of key combinations (e.g., ['ctrl+s', 'meta+s'])
     * @param {Function} callback - Callback function
     */
    registerShortcut(keys, callback) {
        keys.forEach(key => {
            this.shortcuts.set(key.toLowerCase(), callback);
        });
    }

    /**
     * Handle keydown event
     * @param {KeyboardEvent} e - Keyboard event
     */
    handleKeyDown(e) {
        const key = this.getKeyString(e);
        const handler = this.shortcuts.get(key);
        if (handler) {
            handler(e);
        }
    }

    /**
     * Get key string from keyboard event
     * @param {KeyboardEvent} e - Keyboard event
     * @returns {string} Key combination string
     */
    getKeyString(e) {
        const parts = [];
        if (e.ctrlKey) parts.push('ctrl');
        if (e.metaKey) parts.push('meta');
        if (e.altKey) parts.push('alt');
        if (e.shiftKey) parts.push('shift');
        
        // Get the key name
        let keyName = e.key.toLowerCase();
        if (keyName === ' ') keyName = 'space';
        
        parts.push(keyName);
        return parts.join('+');
    }

    /**
     * Initialize keyboard shortcuts
     */
    init() {
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
    }

    /**
     * Destroy keyboard shortcuts
     */
    destroy() {
        document.removeEventListener('keydown', this.handleKeyDown);
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = KeyboardShortcuts;
}

if (typeof window !== 'undefined') {
    window.KeyboardShortcuts = KeyboardShortcuts;
}

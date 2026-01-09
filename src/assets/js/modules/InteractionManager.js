/**
 * Handles interaction configuration UI
 */
class InteractionManager {
    constructor(config) {
        this.interactionsContainer = config.interactionsContainer;
        this.interactions = config.interactions || [];
        this.onInteractionChange = config.onInteractionChange || (() => {});
        this.onChange = config.onChange || (() => {});
        this.menuBtn = null;
        this.translations = config.translations || {};
    }

    /**
     * Set interactions
     * @param {Array} interactions - Interactions array
     */
    setInteractions(interactions) {
        this.interactions = interactions || [];
    }

    /**
     * Get interactions
     * @returns {Array} Interactions array
     */
    getInteractions() {
        return this.interactions;
    }

    /**
     * Render interactions UI
     */
    renderInteractions() {
        if (!this.interactionsContainer) return;
        
        // Ensure interactions is initialized
        if (!this.interactions) {
            this.interactions = [];
        }
        
        // Clear existing interactions (except add button and menu)
        const existingItems = this.interactionsContainer.querySelectorAll('.lottie-interaction-item');
        existingItems.forEach(item => item.remove());
        
        if (this.interactions.length === 0) {
            return;
        }
        
        this.interactions.forEach((interaction, index) => {
            this.createInteractionItem(interaction, index);
        });
    }

    /**
     * Create interaction item UI
     * @param {Object} interaction - Interaction data
     * @param {number} index - Interaction index
     */
    createInteractionItem(interaction, index) {
        const item = document.createElement('div');
        item.className = 'lottie-interaction-item';
        item.dataset.index = index;
        
        const header = document.createElement('div');
        header.className = 'lottie-interaction-header';
        
        const title = document.createElement('div');
        title.className = 'lottie-interaction-title';
        title.textContent = this.getInteractionTypeLabel(interaction.type);
        
        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'btn small lottie-interaction-remove';
        removeBtn.textContent = this.translations.remove || 'Remove';
        removeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.interactions.splice(index, 1);
            this.renderInteractions();
            this.onChange();
        });
        
        header.appendChild(title);
        header.appendChild(removeBtn);
        item.appendChild(header);
        
        const fields = document.createElement('div');
        fields.className = 'lottie-interaction-fields';
        
        // Enabled checkbox
        const enabledRow = document.createElement('div');
        enabledRow.className = 'lottie-interaction-field-row';
        const enabledCheckbox = document.createElement('input');
        enabledCheckbox.type = 'checkbox';
        enabledCheckbox.checked = interaction.enabled !== false;
        enabledCheckbox.addEventListener('change', () => {
            this.interactions[index].enabled = enabledCheckbox.checked;
            this.onChange();
        });
        const enabledLabel = document.createElement('label');
        enabledLabel.textContent = this.translations.enabled || 'Enabled';
        enabledRow.appendChild(enabledCheckbox);
        enabledRow.appendChild(enabledLabel);
        fields.appendChild(enabledRow);
        
        // Type-specific fields
        switch (interaction.type) {
            case 'scroll':
                fields.appendChild(this.createSelectField(this.translations.trigger || 'Trigger', 'trigger', ['onScroll', 'onViewport', 'onScrollProgress'], interaction.trigger || 'onScroll', index));
                fields.appendChild(this.createNumberField(this.translations.offset || 'Offset', 'offset', interaction.offset || 0, index, 0, 1, 0.1));
                fields.appendChild(this.createSelectField(this.translations.direction || 'Direction', 'direction', ['forward', 'backward', 'both'], interaction.direction || 'forward', index));
                break;
            case 'click':
                fields.appendChild(this.createSelectField(this.translations.action || 'Action', 'action', ['play', 'pause', 'toggle', 'restart'], interaction.action || 'play', index));
                break;
            case 'hover':
                fields.appendChild(this.createSelectField(this.translations.onEnter || 'On Enter', 'onEnter', ['play', 'pause', 'restart'], interaction.onEnter || 'play', index));
                fields.appendChild(this.createSelectField(this.translations.onLeave || 'On Leave', 'onLeave', ['play', 'pause', 'restart'], interaction.onLeave || 'pause', index));
                break;
            case 'url':
                fields.appendChild(this.createTextField(this.translations.url || 'URL', 'url', interaction.url || '', index));
                fields.appendChild(this.createSelectField(this.translations.target || 'Target', 'target', ['_self', '_blank', '_parent', '_top'], interaction.target || '_self', index));
                fields.appendChild(this.createTextField(this.translations.layerName || 'Layer Name', 'layerName', interaction.layerName || '', index, this.translations.layerNamePlaceholder || 'Optional: specific layer to make clickable'));
                break;
        }
        
        item.appendChild(fields);
        const addBtn = document.getElementById('add-interaction-btn');
        if (addBtn) {
            this.interactionsContainer.insertBefore(item, addBtn);
        } else {
            this.interactionsContainer.appendChild(item);
        }
    }

    /**
     * Create select field
     * @param {string} label - Field label
     * @param {string} fieldName - Field name
     * @param {Array<string>} options - Select options
     * @param {string} value - Current value
     * @param {number} index - Interaction index
     * @returns {HTMLElement} Field element
     */
    createSelectField(label, fieldName, options, value, index) {
        const field = document.createElement('div');
        field.className = 'lottie-interaction-field';
        
        const labelEl = document.createElement('label');
        labelEl.textContent = label;
        
        const select = document.createElement('select');
        options.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt;
            option.textContent = opt;
            if (opt === value) option.selected = true;
            select.appendChild(option);
        });
        select.addEventListener('change', () => {
            this.interactions[index][fieldName] = select.value;
            this.onChange();
        });
        
        field.appendChild(labelEl);
        field.appendChild(select);
        return field;
    }

    /**
     * Create text field
     * @param {string} label - Field label
     * @param {string} fieldName - Field name
     * @param {string} value - Current value
     * @param {number} index - Interaction index
     * @param {string} placeholder - Placeholder text
     * @returns {HTMLElement} Field element
     */
    createTextField(label, fieldName, value, index, placeholder = '') {
        const field = document.createElement('div');
        field.className = 'lottie-interaction-field';
        
        const labelEl = document.createElement('label');
        labelEl.textContent = label;
        
        const input = document.createElement('input');
        input.type = 'text';
        input.value = value;
        input.placeholder = placeholder;
        input.addEventListener('input', () => {
            this.interactions[index][fieldName] = input.value;
            this.onChange();
        });
        
        field.appendChild(labelEl);
        field.appendChild(input);
        return field;
    }

    /**
     * Create number field
     * @param {string} label - Field label
     * @param {string} fieldName - Field name
     * @param {number} value - Current value
     * @param {number} index - Interaction index
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @param {number} step - Step value
     * @returns {HTMLElement} Field element
     */
    createNumberField(label, fieldName, value, index, min, max, step) {
        const field = document.createElement('div');
        field.className = 'lottie-interaction-field';
        
        const labelEl = document.createElement('label');
        labelEl.textContent = label;
        
        const input = document.createElement('input');
        input.type = 'number';
        input.value = value;
        input.min = min;
        input.max = max;
        input.step = step;
        input.addEventListener('input', () => {
            this.interactions[index][fieldName] = parseFloat(input.value) || 0;
            this.onChange();
        });
        
        field.appendChild(labelEl);
        field.appendChild(input);
        return field;
    }

    /**
     * Get interaction type label
     * @param {string} type - Interaction type
     * @returns {string} Label
     */
    getInteractionTypeLabel(type) {
        const labels = {
            'scroll': this.translations.scrollTrigger || 'Scroll Trigger',
            'click': this.translations.clickAction || 'Click Action',
            'hover': this.translations.hoverEffect || 'Hover Effect',
            'url': this.translations.urlLink || 'URL Link'
        };
        return labels[type] || type;
    }

    /**
     * Initialize interaction menu
     */
    initializeInteractionMenu() {
        const addInteractionBtn = document.getElementById('add-interaction-btn');
        
        if (!addInteractionBtn) {
            return;
        }
        
        // Prevent double-instantiation
        if (this.menuBtn || addInteractionBtn.hasAttribute('data-garnish-initialized')) {
            return;
        }
        
        // Function to add interaction
        const addInteraction = (type) => {
            if (!type || !['scroll', 'click', 'hover', 'url'].includes(type)) {
                return;
            }
            
            if (!this.interactions) {
                this.interactions = [];
            }
            
            const newInteraction = {
                type: type,
                enabled: true
            };
            
            this.interactions.push(newInteraction);
            this.renderInteractions();
            this.onChange();
        };
        
        // Initialize Craft's menu button
        try {
            this.menuBtn = new Garnish.MenuBtn(addInteractionBtn, {
                onOptionSelect: (option) => {
                    // Get type from the option - it might be a DOM element or jQuery object
                    let type = null;
                    if (option && option.getAttribute) {
                        // It's a DOM element
                        type = option.getAttribute('data-type');
                    } else if (option && option.$option) {
                        // It's a jQuery-wrapped element
                        type = option.$option.getAttribute('data-type');
                    } else if (option && option.data) {
                        // It has a data method (jQuery)
                        type = option.data('type');
                    } else if (option && option.attr) {
                        // It has an attr method (jQuery)
                        type = option.attr('data-type');
                    }
                    if (type) {
                        addInteraction(type);
                    }
                }
            });
            
            // Mark as initialized to prevent double-instantiation
            addInteractionBtn.setAttribute('data-garnish-initialized', 'true');
            
            // Find the Garnish-created menu and populate it
            setTimeout(() => {
                const garnishMenuId = addInteractionBtn.getAttribute('aria-controls');
                
                if (garnishMenuId) {
                    const garnishMenu = document.getElementById(garnishMenuId);
                    if (garnishMenu) {
                        // Populate the menu with our items
                        garnishMenu.innerHTML = '<ul class="padded">' +
                            `<li><a href="javascript:void(0)" data-type="scroll"><span class="icon" data-icon="arrows"></span> ${this.translations.scrollTrigger || 'Scroll Trigger'}</a></li>` +
                            `<li><a href="javascript:void(0)" data-type="click"><span class="icon" data-icon="pointer"></span> ${this.translations.clickAction || 'Click Action'}</a></li>` +
                            `<li><a href="javascript:void(0)" data-type="hover"><span class="icon" data-icon="cursor"></span> ${this.translations.hoverEffect || 'Hover Effect'}</a></li>` +
                            `<li><a href="javascript:void(0)" data-type="url"><span class="icon" data-icon="world"></span> ${this.translations.urlLink || 'URL Link'}</a></li>` +
                            '</ul>';
                        
                        // Attach click handlers
                        const menuItems = garnishMenu.querySelectorAll('a[data-type]');
                        menuItems.forEach((item) => {
                            item.addEventListener('click', (e) => {
                                const type = item.getAttribute('data-type');
                                addInteraction(type);
                                if (this.menuBtn) {
                                    this.menuBtn.hide();
                                }
                            });
                        });
                    }
                }
            }, 10);
        } catch (e) {
            console.error('Failed to initialize interaction menu:', e);
        }
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
    module.exports = InteractionManager;
}

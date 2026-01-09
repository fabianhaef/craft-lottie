/**
 * Handles data loading and saving operations
 */
class DataManager {
    constructor(config) {
        this.assetId = config.assetId;
        this.csrfToken = config.csrfToken;
        this.csrfParam = config.csrfParam;
        this.onDataLoaded = config.onDataLoaded || (() => {});
        this.onError = config.onError || (() => {});
    }

    /**
     * Load animation data from server
     * @returns {Promise<Object>} Promise resolving to animation data
     */
    async loadData() {
        const fetchUrl = `/actions/craft-lottie/default/get-asset-json?assetId=${this.assetId}`;

        try {
            const response = await fetch(fetchUrl);
            
            if (!response.ok) {
                // Try to get error details from response
                try {
                    const data = await response.json();
                    throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
                } catch (e) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
            }
            
            const data = await response.json();
            
            if (data.error) {
                const errorCode = data.errorCode || 'UNKNOWN_ERROR';
                const errorMessage = data.error || 'An unknown error occurred';
                console.error('Lottie load error:', errorCode, errorMessage);
                this.onError(errorMessage, errorCode);
                return null;
            }
            
            // Validate data structure
            const animationData = data.animation || data;
            if (!animationData || typeof animationData !== 'object') {
                this.onError('Invalid animation data structure', 'INVALID_DATA');
                return null;
            }
            
            return {
                animation: animationData,
                backgroundColor: data.backgroundColor || null,
                speed: data.speed || 1.0,
                interactions: data.interactions || []
            };
        } catch (error) {
            console.error('Failed to load Lottie file:', error);
            this.onError(error.message || 'An unexpected error occurred while loading the animation.', 'NETWORK_ERROR');
            return null;
        }
    }

    /**
     * Save data to server
     * @param {Object} data - Data to save
     * @param {string} saveType - 'save' or 'saveAs'
     * @returns {Promise<Object>} Promise resolving to save result
     */
    async saveData(data, saveType = 'save') {
        const { lottieData, backgroundColor, speed, interactions } = data;
        
        // Prepare data for saving
        const dataToSave = LottieDataUtils.prepareDataForSave(lottieData);

        const formData = new FormData();
        formData.append('assetId', this.assetId);
        formData.append('jsonData', JSON.stringify(dataToSave));
        formData.append('backgroundColor', backgroundColor || '');
        formData.append('speed', speed || '1.0');
        formData.append('interactions', JSON.stringify(interactions || []));
        formData.append(this.csrfParam, this.csrfToken);

        const endpoint = saveType === 'saveAs' 
            ? '/actions/craft-lottie/default/save-as-new-asset'
            : '/actions/craft-lottie/default/save-asset-json';

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                body: formData,
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                return response.text().then(text => {
                    throw new Error(`Server error: ${response.status}`);
                });
            }

            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'Failed to save');
            }

            return result;
        } catch (error) {
            console.error('Save failed:', error);
            throw error;
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DataManager;
}

// greenhouse-selector.js
// Component untuk switch antar greenhouse
// ===========================================================

import { getUserGreenhouses } from '../greenhouse/greenhouse-service.js';

/**
 * Class untuk mengelola greenhouse selector dropdown
 */
export class GreenhouseSelector {
    constructor(selectElementId, onSelectCallback) {
        this.selectElementId = selectElementId;
        this.selectElement = document.getElementById(selectElementId);
        this.onSelectCallback = onSelectCallback;
        this.greenhouses = [];
        this.selectedGreenhouseId = null;
    }

    /**
     * Load greenhouses dari Firestore dan populate dropdown
     * @param {string} userId - User ID
     */
    async loadGreenhouses(userId) {
        try {
            const result = await getUserGreenhouses(userId);
            
            if (!result.success || !result.data || result.data.length === 0) {
                console.warn('⚠️ No greenhouses found for user');
                this._showEmptyState();
                return;
            }

            this.greenhouses = result.data;
            this._populateDropdown();
            
            // Select first greenhouse by default
            if (this.greenhouses.length > 0) {
                this.selectGreenhouse(this.greenhouses[0].id);
            }

            console.log(`✅ Loaded ${this.greenhouses.length} greenhouses`);
        } catch (error) {
            console.error('❌ Error loading greenhouses:', error);
            this._showErrorState();
        }
    }

    /**
     * Populate dropdown dengan greenhouse options
     * @private
     */
    _populateDropdown() {
        if (!this.selectElement) {
            console.error('❌ Select element not found');
            return;
        }

        // Clear existing options
        this.selectElement.innerHTML = '';

        // Add options
        this.greenhouses.forEach((greenhouse, index) => {
            const option = document.createElement('option');
            option.value = greenhouse.id;
            option.textContent = `${greenhouse.name || `Greenhouse ${index + 1}`}${greenhouse.location ? ` - ${greenhouse.location}` : ''}`;
            this.selectElement.appendChild(option);
        });

        // Add event listener
        this.selectElement.addEventListener('change', (e) => {
            const selectedId = e.target.value;
            this.selectGreenhouse(selectedId);
        });
    }

    /**
     * Select greenhouse by ID
     * @param {string} greenhouseId - Greenhouse ID
     */
    selectGreenhouse(greenhouseId) {
        if (this.selectedGreenhouseId === greenhouseId) {
            return; // Already selected
        }

        this.selectedGreenhouseId = greenhouseId;
        
        if (this.selectElement) {
            this.selectElement.value = greenhouseId;
        }

        // Call callback
        if (this.onSelectCallback) {
            const greenhouse = this.greenhouses.find(gh => gh.id === greenhouseId);
            this.onSelectCallback(greenhouseId, greenhouse);
        }

        // Save to localStorage
        localStorage.setItem('selectedGreenhouseId', greenhouseId);

        console.log(`✅ Selected greenhouse: ${greenhouseId}`);
    }

    /**
     * Get selected greenhouse
     * @returns {Object|null} Selected greenhouse object
     */
    getSelectedGreenhouse() {
        if (!this.selectedGreenhouseId) {
            return null;
        }
        return this.greenhouses.find(gh => gh.id === this.selectedGreenhouseId) || null;
    }

    /**
     * Get selected greenhouse ID
     * @returns {string|null} Selected greenhouse ID
     */
    getSelectedGreenhouseId() {
        return this.selectedGreenhouseId;
    }

    /**
     * Load selected greenhouse from localStorage
     */
    loadSelectedFromStorage() {
        const savedId = localStorage.getItem('selectedGreenhouseId');
        if (savedId && this.greenhouses.find(gh => gh.id === savedId)) {
            this.selectGreenhouse(savedId);
        }
    }

    /**
     * Show empty state
     * @private
     */
    _showEmptyState() {
        if (!this.selectElement) return;
        
        this.selectElement.innerHTML = '<option value="">No greenhouses found</option>';
        this.selectElement.disabled = true;
    }

    /**
     * Show error state
     * @private
     */
    _showErrorState() {
        if (!this.selectElement) return;
        
        this.selectElement.innerHTML = '<option value="">Error loading greenhouses</option>';
        this.selectElement.disabled = true;
    }

    /**
     * Get all greenhouses
     * @returns {Array} Array of greenhouse objects
     */
    getAllGreenhouses() {
        return this.greenhouses;
    }
}


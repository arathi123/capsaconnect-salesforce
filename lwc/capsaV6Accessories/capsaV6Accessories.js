import { LightningElement, track, api } from 'lwc';
import getOptionsByStepAndFamily from '@salesforce/apex/CartConfiguratorController.getOptionsByStepAndFamily';

export default class CapsaV6Accessories extends LightningElement {
    @api productType = 'V6';
    @api selections;
    @track rawOptions = [];
    @track selectedAccessories = []; // Array of simple SKUs for internal UI tracking
    // Preview carry-over variables
    @track baseCartImage = '';
    @track isLoading = true;

    connectedCallback() {
        this.restorePreviewState();
        this.fetchMetadata();
    }

    restorePreviewState() {
        // Inherit the layered math preview from Step 8!
        if (this.selections && this.selections.layeredPreview) {
            this.baseCartImage = this.selections.layeredPreview.baseImage;
        } else {
            // Fallback if accessed directly
            this.baseCartImage = this.selections?.previewImage || '/resource/m38eImagesPart1/m38eImagesPart1/documentation.jpg';
        }
    }

    async fetchMetadata() {
        try {
            const data = await getOptionsByStepAndFamily({
                stepKey: 'V6 ACCESSORIES',
                productFamily: this.productType
            });
            this.rawOptions = data || [];
            // Restore state from the Unified Array Architecture
            if (this.selections && this.selections.ACCESSORIES && this.selections.ACCESSORIES.length > 0) {
                // Extract just the keys to re-check the boxes in the UI
                this.selectedAccessories = this.selections.ACCESSORIES.map(acc => acc.key);
            }
        } catch (error) {
            console.error('Error fetching V6 Accessories:', error);
        } finally {
            this.isLoading = false;
        }
    }

    // --- CHECKBOX LOGIC ---
    handleNoneSelect() {
        // If they click 'None', clear the array
        this.selectedAccessories = [];
    }

    handleAccessorySelect(event) {
        const key = event.currentTarget.dataset.key;
        const currentIndex = this.selectedAccessories.indexOf(key);
        // Toggle logic: If it's already in the array, remove it. If not, add it.
        if (currentIndex === -1) {
            this.selectedAccessories.push(key);
        } else {
            this.selectedAccessories.splice(currentIndex, 1);
        }
        // Force array reactivity
        this.selectedAccessories = [...this.selectedAccessories];
    }

    // --- LWC GETTERS ---
    get isNoneSelected() {
        return this.selectedAccessories.length === 0;
    }

    get noneCardClass() {
        return this.isNoneSelected ? 'option-row selected' : 'option-row';
    }

    get accessoryOptions() {
        return this.rawOptions.map(opt => {
            const isChecked = this.selectedAccessories.includes(opt.Option_Key__c);
            return {
                ...opt,
                isChecked: isChecked,
                cardClass: isChecked ? 'option-row selected' : 'option-row'
            };
        });
    }

    get selectedAccessoriesLabels() {
        return this.selectedAccessories.map(key => {
            const opt = this.rawOptions.find(o => o.Option_Key__c === key);
            return opt ? opt.Option_Label__c : '';
        }).filter(label => label !== '');
    }

    get accessoriesString() {
        return this.selectedAccessoriesLabels.length ? this.selectedAccessoriesLabels.join(', ') : 'None';
    }

    handleNext() {
        // Build the Decoupled Array for the Master Engine
        let payloadArray = [];
        // For each selected SKU, find its metadata and build the unified object
        this.selectedAccessories.forEach(key => {
            const opt = this.rawOptions.find(o => o.Option_Key__c === key);
            if (opt) {
                payloadArray.push({
                    key: opt.Option_Key__c,
                    label: opt.Option_Label__c,
                    sku: opt.Option_Key__c // These are real billable accessories
                });
            }
        });
        this.dispatchEvent(new CustomEvent('stepcomplete', {
            detail: {
                ACCESSORIES: payloadArray
            }
        }));
    }
}
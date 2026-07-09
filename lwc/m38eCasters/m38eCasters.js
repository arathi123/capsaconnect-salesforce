import { LightningElement, track, api } from 'lwc';
import getOptionsByStepAndFamily from '@salesforce/apex/CartConfiguratorController.getOptionsByStepAndFamily';

export default class M38eCasters extends LightningElement {
    @api productType = 'M38e';
    @api selections; 

    @track rawOptions = [];
    @track selectedCaster = '';
    @track hoveredKey = '';
    
    @track currentPreviewImage = '';
    @track isLoading = true;

    connectedCallback() {
        // Carry over the preview image from the previous steps. It does not change here.
        this.currentPreviewImage = this.selections?.previewImage || '/resource/m38eImagesPart1/m38eImagesPart1/documentation.jpg';
        this.fetchMetadata();
    }

    async fetchMetadata() {
        try {
            const data = await getOptionsByStepAndFamily({ stepKey: 'CASTERS', productFamily: this.productType });
            this.rawOptions = data || [];

            // Restore state from the Unified Array Architecture
            if (this.selections && this.selections.CASTERS && this.selections.CASTERS.length > 0) {
                this.selectedCaster = this.selections.CASTERS[0].key;
            }
        } catch (error) {
            console.error('Error fetching M38e Casters options:', error);
        } finally {
            this.isLoading = false;
        }
    }

    // --- Hover Logic ---
    handleMouseEnter(event) {
        this.hoveredKey = event.currentTarget.dataset.key;
    }

    handleMouseLeave() {
        this.hoveredKey = '';
    }

    // --- Selection Logic ---
    handleSelect(event) {
        this.selectedCaster = event.currentTarget.dataset.key;
    }

    // --- Modern LWC Getter (Reactivity Engine) ---
    get casterOptions() {
        return this.rawOptions.map(opt => {
            const isSelected = opt.Option_Key__c === this.selectedCaster;
            return {
                ...opt,
                isSelected: isSelected,
                isVisible: isSelected || opt.Option_Key__c === this.hoveredKey,
                rowClass: isSelected ? 'option-row selected' : 'option-row'
            };
        });
    }

    get isStepComplete() {
        return this.selectedCaster !== '';
    }

    handleNext() {
        // 1. Locate the selected record metadata
        const selectedOpt = this.rawOptions.find(opt => opt.Option_Key__c === this.selectedCaster);

        // 2. Build the decoupled array
        let payloadArray = [];
        
        if (selectedOpt) {
            payloadArray.push({
                key: selectedOpt.Option_Key__c,
                label: selectedOpt.Option_Label__c,
                // Pass the real SKU, unless the option is "None"
                sku: selectedOpt.Option_Key__c === 'NONE' ? null : selectedOpt.Option_Key__c 
            });
        }

        // 3. Dispatch perfectly structured state
        this.dispatchEvent(new CustomEvent('stepcomplete', {
            detail: { 
                CASTERS: payloadArray, 
                previewImage: this.currentPreviewImage 
            }
        }));
    }
}
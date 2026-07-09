import { LightningElement, track, api, wire } from 'lwc';
import getOptionsByStepAndFamily from '@salesforce/apex/CartConfiguratorController.getOptionsByStepAndFamily';
import LAPTOP_STORAGE from '@salesforce/resourceUrl/laptopstorage';

export default class SlimCartWarranty extends LightningElement {
    @api productType = 'slimcart';
    @api selections;

    @track useCaseOptions = [];
    @track currentPreviewImage = LAPTOP_STORAGE+'/laptop_drawer.jpg';
    @track isLoading = true;
    
    // Internal UI tracker
    @track localSelection = '';

    @wire(getOptionsByStepAndFamily, { stepKey: 'SLIM CART WARRANTY', productFamily: '$productType' })
    wiredOptions({ error, data }) {
        if (data) {
            this.useCaseOptions = data.map(opt => ({
                ...opt,
                isVisible: false,
                isSelected: false,
                rowClass: 'option-row'
            }));
            
            // Restore state if jumping backward
            if (this.selections && this.selections.Warranty && this.selections.Warranty.length > 0) {
                this.localSelection = this.selections.Warranty[0].key;
                this.syncUI();
            }
            this.isLoading = false;
        }
    }

    handleSelect(event) {
        this.localSelection = event.currentTarget.dataset.key;
        this.syncUI();
    }

    syncUI() {
        this.useCaseOptions = this.useCaseOptions.map(opt => {
            const isSelected = opt.Option_Key__c === this.localSelection;
            return {
                ...opt,
                isSelected: isSelected,
                isVisible: isSelected, // Permanent show when selected
                rowClass: isSelected ? 'option-row selected' : 'option-row'
            };
        });
    }

    get isStepComplete() { return this.localSelection !== ''; }

    handleNext() {
        // 1. Locate the selected record metadata
        const selectedOpt = this.useCaseOptions.find(opt => opt.Option_Key__c === this.localSelection);
        
        // 2. Build the unified payload array
        let payloadArray = [];
        if (selectedOpt) {
            payloadArray.push({
                key: selectedOpt.Option_Key__c,      // Used by internal LWC logic/filters
                label: selectedOpt.Option_Label__c,  // Used by the Results UI
                sku: null                            // Not a billable item
            });
        }

        // 3. Dispatch perfectly structured state
        this.dispatchEvent(new CustomEvent('stepcomplete', {
            detail: { 
                Warranty: payloadArray, 
                previewImage: this.currentPreviewImage 
            }
        }));
    }
}
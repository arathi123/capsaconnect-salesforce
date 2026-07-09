import { LightningElement, track, api, wire } from 'lwc';
import getOptionsByStepAndFamily from '@salesforce/apex/CartConfiguratorController.getOptionsByStepAndFamily';

export default class CapsaT7MedlinkUseCase extends LightningElement {
    @api productType = 'M38e';
    @api selections;

    @track useCaseOptions = [];
    @track currentPreviewImage = '/resource/T7MedLink/T7MedLink2/T7MedLink4.png';
    @track isLoading = true;
    
    // Internal UI tracker
    @track localSelection = '';

    @wire(getOptionsByStepAndFamily, { stepKey: 'CART TYPE', productFamily: '$productType' })
    wiredOptions({ error, data }) {
        if (data) {
            this.useCaseOptions = data.map(opt => ({
                ...opt,
                isVisible: false,
                isSelected: false,
                rowClass: 'option-row'
            }));
            
            // Restore state if jumping backward
            if (this.selections && this.selections.USE_CASE && this.selections.USE_CASE.length > 0) {
                this.localSelection = this.selections.USE_CASE[0].key;
                this.syncUI();
            }
            this.isLoading = false;
        }
    }

    handleMouseEnter(event) {
        this.toggleDescription(event.currentTarget.dataset.key, true);
    }

    handleMouseLeave(event) {
        this.toggleDescription(event.currentTarget.dataset.key, false);
    }

    toggleDescription(key, isHovering) {
        this.useCaseOptions = this.useCaseOptions.map(opt => ({
            ...opt,
            isVisible: (opt.Option_Key__c === key && isHovering) || opt.isSelected
        }));
    }

    handleSelect(event) {
        this.localSelection = event.currentTarget.dataset.key;
        this.syncUI();
    }

    syncUI() {
        this.useCaseOptions = this.useCaseOptions.map(opt => {
            const isSelected = opt.Option_Key__c === this.localSelection;
            if (isSelected && opt.Preview_Image_URL__c) {
                this.currentPreviewImage = opt.Preview_Image_URL__c;
            }
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
                USE_CASE: payloadArray, 
                previewImage: this.currentPreviewImage 
            }
        }));
    }
}
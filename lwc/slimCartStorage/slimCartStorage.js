import { LightningElement, track, api, wire } from 'lwc';
import getOptionsByStepAndFamily from '@salesforce/apex/CartConfiguratorController.getOptionsByStepAndFamily';
import TABLET_IMG from '@salesforce/resourceUrl/Tablet';
import LAPTOP_STORAGE from '@salesforce/resourceUrl/laptopstorage';

export default class SlimCartStorage extends LightningElement {
    @api productType = 'slimcart';
    @api selections;

    @track useCaseOptions = [];
    currentPreviewImage = TABLET_IMG+'/tablet_SlimCartFlex.jpg'; 
    @track isLoading = true;
    
    // Internal UI tracker
    @track localSelection = '';

    @wire(getOptionsByStepAndFamily, { stepKey: 'SLIM CART STORAGE', productFamily: '$productType' })
    wiredOptions({ error, data }) {
        if (data) {
            this.useCaseOptions = data.map(opt => ({
                ...opt,
                isVisible: false,
                isSelected: false,
                rowClass: 'option-row'
            }));
            
            // Restore state if jumping backward
            if (this.selections && this.selections.Storage && this.selections.Storage.length > 0) {
                this.localSelection = this.selections.Storage[0].key;
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
        console.log('local sel'+this.localSelection);
        this.currentPreviewImage = TABLET_IMG+'/tablet_SlimCartFlex.jpg'; 
        if(this.localSelection === 'single drawer'){
            this.currentPreviewImage = LAPTOP_STORAGE+'/laptop_drawer.jpg';// replace with exact filename  
        }else if(this.localSelection === 'Dual Drawers'){
            this.currentPreviewImage = LAPTOP_STORAGE+'/laptop_2drawer.jpg';// replace with exact filename  
        }
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
                Storage: payloadArray, 
                previewImage: this.currentPreviewImage 
            }
        }));
    }
}
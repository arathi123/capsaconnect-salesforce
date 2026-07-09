import { LightningElement, track, api } from 'lwc';
import getOptionsByStepAndFamily from '@salesforce/apex/CartConfiguratorController.getOptionsByStepAndFamily';

export default class M38eLift extends LightningElement {
    @api productType = 'M38e';
    @api selections; 

    @track liftOptions = [];
    @track currentPreviewImage = '';
    @track isLoading = true;
    
    @track selectedLift = '';
    @track hoveredLiftKey = '';

    connectedCallback() {
        // Carry over the preview image from the previous step
        this.currentPreviewImage = this.selections?.previewImage || '/resource/m38eImagesPart1/m38eImagesPart1/documentation.jpg';
        this.fetchMetadata();
    }

    async fetchMetadata() {
        try {
            const data = await getOptionsByStepAndFamily({ stepKey: 'LIFT', productFamily: this.productType });
            
            if (data) {
                this.liftOptions = data.map(opt => ({
                    ...opt,
                    isVisible: false,
                    isSelected: false,
                    rowClass: 'option-row'
                }));

                // Restore state from the Unified Array Architecture
                if (this.selections && this.selections.LIFT && this.selections.LIFT.length > 0) {
                    this.selectedLift = this.selections.LIFT[0].key;
                    this.syncUI();
                }
            }
        } catch (error) {
            console.error('Error fetching M38e Lift options:', error);
        } finally {
            this.isLoading = false;
        }
    }

    // --- Hover Logic ---
    handleMouseEnter(event) {
        this.hoveredLiftKey = event.currentTarget.dataset.key;
        this.syncUI();
    }

    handleMouseLeave() {
        this.hoveredLiftKey = '';
        this.syncUI();
    }

    // --- Selection Logic ---
    handleSelect(event) {
        const key = event.currentTarget.dataset.key;
        if (this.selectedLift === key) return;
        
        this.selectedLift = key;
        this.syncUI();
    }

    syncUI() {
        this.liftOptions = this.liftOptions.map(opt => {
            const isSelected = opt.Option_Key__c === this.selectedLift;
            const isHovered = opt.Option_Key__c === this.hoveredLiftKey;
            
            return {
                ...opt,
                isSelected: isSelected,
                isVisible: isSelected || isHovered,
                rowClass: isSelected ? 'option-row selected' : 'option-row'
            };
        });
    }

    get isStepComplete() {
        return this.selectedLift !== '';
    }

    handleNext() {
        // 1. Locate the selected record metadata
        const selectedOpt = this.liftOptions.find(opt => opt.Option_Key__c === this.selectedLift);
        
        // 2. Build the decoupled array
        let payloadArray = [];
        
        if (selectedOpt) {
            payloadArray.push({
                key: selectedOpt.Option_Key__c,
                label: selectedOpt.Option_Label__c,
                sku: null // Lift modifies the Chassis SKU; it is not a standalone line-item
            });
        }

        // 3. Dispatch perfectly structured state
        this.dispatchEvent(new CustomEvent('stepcomplete', {
            detail: { 
                LIFT: payloadArray, 
                previewImage: this.currentPreviewImage 
            }
        }));
    }
}
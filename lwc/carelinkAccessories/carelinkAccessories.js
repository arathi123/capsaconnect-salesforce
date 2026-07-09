import { LightningElement, track, api } from 'lwc';
import getOptionsByStepAndFamily from '@salesforce/apex/CartConfiguratorController.getOptionsByStepAndFamily';

export default class CarelinkAccessories extends LightningElement {
    @api productType = 'CareLink';
    @api selections; 

    @track rawOptions = [];
    @track selectedAccessories = [];
    
    // Preview state
    @track baseCartImage = '';
    @track overlays = [];
    @track isLoading = true;

    connectedCallback() {
        this.restorePreviewState();
        this.fetchMetadata();
    }

    restorePreviewState() {
        // Carry over the layered math from the Builder step
        if (this.selections?.layeredPreview) {
            this.baseCartImage = this.selections.layeredPreview.baseImage;
            this.overlays = this.selections.layeredPreview.overlays || [];
        } else {
            this.baseCartImage = this.selections?.previewImage || '/resource/carelinkImagesPart1/carelinkImagesPart1/documentation.jpg';
        }
    }

    async fetchMetadata() {
        try {
            const data = await getOptionsByStepAndFamily({ stepKey: 'ACCESSORY', productFamily: this.productType });
            this.rawOptions = data || [];

            if (this.selections?.ACCESSORIES?.length > 0) {
                this.selectedAccessories = this.selections.ACCESSORIES.map(acc => acc.key);
            }
        } finally { this.isLoading = false; }
    }

    // --- SELECTION LOGIC ---
    handleNoneSelect() {
        this.selectedAccessories = [];
    }

    handleAccessorySelect(event) {
        const key = event.currentTarget.dataset.key;
        const index = this.selectedAccessories.indexOf(key);

        if (index === -1) {
            // Add and remove 'None'
            this.selectedAccessories = [...this.selectedAccessories.filter(k => k !== 'None'), key];
        } else {
            // Remove
            this.selectedAccessories = this.selectedAccessories.filter(k => k !== key);
        }
    }

    // --- GETTERS ---
    get isNoneSelected() { return this.selectedAccessories.length === 0; }
    get noneCardClass() { return this.isNoneSelected ? 'option-row selected' : 'option-row'; }

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

    handleNext() {
        const payloadArray = this.selectedAccessories.map(key => {
            const opt = this.rawOptions.find(o => o.Option_Key__c === key);
            return { key, label: opt ? opt.Option_Label__c : 'None', sku: key === 'None' ? null : key };
        });

        this.dispatchEvent(new CustomEvent('stepcomplete', { 
            detail: { ACCESSORIES: payloadArray } 
        }));
    }
}
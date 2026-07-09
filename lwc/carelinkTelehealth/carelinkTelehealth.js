import { LightningElement, track, api } from 'lwc';
import getOptionsByStepAndFamily from '@salesforce/apex/CartConfiguratorController.getOptionsByStepAndFamily';

export default class CarelinkTelehealth extends LightningElement {
    @api productType = 'CareLink';
    @api selections; 

    @track rawOptions = [];
    @track selectedAccessories = []; // Internal array of keys
    
    // Preview state
    @track baseCartImage = '';
    @track overlays = [];
    @track isLoading = true;

    connectedCallback() {
        this.restorePreviewState();
        this.fetchMetadata();
    }

    restorePreviewState() {
        if (this.selections?.layeredPreview) {
            this.baseCartImage = this.selections.layeredPreview.baseImage;
            this.overlays = this.selections.layeredPreview.overlays || [];
        } else {
            this.baseCartImage = this.selections?.previewImage || '/resource/carelinkImagesPart1/carelinkImagesPart1/documentation.jpg';
        }
    }

    async fetchMetadata() {
        try {
            const data = await getOptionsByStepAndFamily({ stepKey: 'TELE ACCESSORY', productFamily: this.productType });
            this.rawOptions = data || [];
            
            if (this.selections?.TELEHEALTH?.length > 0) {
                this.selectedAccessories = this.selections.TELEHEALTH.map(acc => acc.key);
            }
        } finally { 
            this.isLoading = false; 
        }
    }

    // --- SELECTION LOGIC ---
    handleNoneSelect() {
        this.selectedAccessories = [];
    }

    handleAccessorySelect(event) {
        const key = event.currentTarget.dataset.key;
        const index = this.selectedAccessories.indexOf(key);

        if (index === -1) {
            // Add item and forcefully remove 'None' if it exists in the array
            this.selectedAccessories = [...this.selectedAccessories.filter(k => k !== 'None'), key];
        } else {
            // Remove item
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

    // --- OUTPUT ---
    handleNext() {
        let payloadArray = this.selectedAccessories.map(key => {
            if (key === 'None') return { key: 'None', label: 'None', sku: null };
            const opt = this.rawOptions.find(o => o.Option_Key__c === key);
            return { key: opt.Option_Key__c, label: opt.Option_Label__c, sku: opt.Option_Key__c };
        });

        this.dispatchEvent(new CustomEvent('stepcomplete', {
            detail: { TELEHEALTH: payloadArray, overrideNext: 'Accessories' }
        }));
    }
}
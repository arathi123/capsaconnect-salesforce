import { LightningElement, track, api } from 'lwc';
import getOptionsByStepAndFamily from '@salesforce/apex/CartConfiguratorController.getOptionsByStepAndFamily';

export default class M38eAccessories extends LightningElement {
    @api productType = 'M38e';
    @api selections; 

    @track rawOptions = [];
    @track selectedAccessories = []; // Array of simple SKUs for internal UI tracking
    
    // Preview carry-over variables
    @track baseCartImage = '';
    @track overlays = [];
    
    @track isLoading = true;

    connectedCallback() {
        this.restorePreviewState();
        this.fetchMetadata();
    }

    restorePreviewState() {
        // Inherit the layered math preview from the Builder Step
        if (this.selections && this.selections.layeredPreview) {
            this.baseCartImage = this.selections.layeredPreview.baseImage;
            this.overlays = this.selections.layeredPreview.overlays || [];
        } else {
            // Fallback for No Storage / direct jump
            this.baseCartImage = this.selections?.previewImage || '/resource/m38eImagesPart1/m38eImagesPart1/documentation.jpg';
        }
    }

    async fetchMetadata() {
        try {
            const data = await getOptionsByStepAndFamily({ stepKey: 'ACCESSORY', productFamily: this.productType });
            this.rawOptions = data || [];

            // Restore state from the Unified Array Architecture
            if (this.selections && this.selections.ACCESSORIES && this.selections.ACCESSORIES.length > 0) {
                this.selectedAccessories = this.selections.ACCESSORIES.map(acc => acc.key);
            }
        } catch (error) {
            console.error('Error fetching M38e Accessories:', error);
        } finally {
            this.isLoading = false;
        }
    }

    // --- UPGRADED VISIBILITY FILTER EVALUATOR ---
    evaluateFilter(filterStr, stateObj) {
        if (!filterStr) return true; 
        
        const orGroups = filterStr.split('||').map(s => s.trim());
        
        for (let group of orGroups) {
            const andConditions = group.split(';').map(s => s.trim());
            let groupPassed = true;
            
            for (let cond of andConditions) {
                if (!cond) continue;
                
                let [key, val] = cond.split('=');
                let isNotEqual = false;
                
                if (key.endsWith('!')) {
                    isNotEqual = true;
                    key = key.slice(0, -1);
                }
                
                // Trim in case of spaces like "BIN = 123"
                key = key.trim();
                val = val.trim();

                const stateVal = stateObj[key];
                
                if (isNotEqual) {
                    if (stateVal && stateVal.toLowerCase() === val.toLowerCase()) {
                        groupPassed = false;
                        break;
                    }
                } else {
                    if (!stateVal || stateVal.toLowerCase() !== val.toLowerCase()) {
                        groupPassed = false;
                        break;
                    }
                }
            }
            
            if (groupPassed) return true;
        }
        
        return false; 
    }

    // --- CHECKBOX LOGIC ---
    handleNoneSelect() {
        this.selectedAccessories = [];
    }

    handleAccessorySelect(event) {
        const key = event.currentTarget.dataset.key;
        const currentIndex = this.selectedAccessories.indexOf(key);

        if (currentIndex === -1) {
            this.selectedAccessories.push(key);
        } else {
            this.selectedAccessories.splice(currentIndex, 1);
        }
        
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
        // Safely extract the Bin Type from the STORAGE array.
        // In the Storage array, index 0 is the Storage Base, index 1 is the specific Bin.
        const storageArr = this.selections?.STORAGE || [];
        const binType = storageArr.length > 1 ? storageArr[1].key : '';

        // Build the state object for the RX specific accessories filter
        const state = {
            BIN: binType
        };

        return this.rawOptions
            .filter(opt => this.evaluateFilter(opt.Visibility_Filter__c, state))
            .map(opt => {
                const isChecked = this.selectedAccessories.includes(opt.Option_Key__c);
                return {
                    ...opt,
                    isChecked: isChecked,
                    cardClass: isChecked ? 'option-row selected' : 'option-row'
                };
            });
    }

    handleNext() {
        // Build the Decoupled Array for the Master Engine
        let payloadArray = [];

        this.selectedAccessories.forEach(key => {
            const opt = this.rawOptions.find(o => o.Option_Key__c === key);
            if (opt) {
                payloadArray.push({
                    key: opt.Option_Key__c,
                    label: opt.Option_Label__c,
                    sku: opt.Option_Key__c // Actual orderable item
                });
            }
        });

        this.dispatchEvent(new CustomEvent('stepcomplete', { 
            detail: { ACCESSORIES: payloadArray } 
        }));
    }
}
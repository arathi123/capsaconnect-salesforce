import { LightningElement, track, api } from 'lwc';
import getOptionsByStepAndFamily from '@salesforce/apex/CartConfiguratorController.getOptionsByStepAndFamily';

export default class CarelinkWarranty extends LightningElement {
    @api productType = 'CareLink';
    @api selections; 

    @track rawOptions = [];
    
    // User Selections
    @track selectedBaseWarranty = ''; 
    @track isBatterySelected = false;
    
    // Preview Variables
    @track baseCartImage = '';
    @track overlays = [];
    
    @track isLoading = true;

    connectedCallback() {
        this.restorePreviewState();
        this.fetchMetadata();
    }

    restorePreviewState() {
        if (this.selections && this.selections.layeredPreview) {
            this.baseCartImage = this.selections.layeredPreview.baseImage;
            this.overlays = this.selections.layeredPreview.overlays || [];
        } else {
            this.baseCartImage = this.selections?.previewImage || '/resource/carelinkImagesPart1/carelinkImagesPart1/documentation.jpg';
        }
    }

    async fetchMetadata() {
        try {
            const data = await getOptionsByStepAndFamily({ stepKey: 'WARRANTY', productFamily: this.productType });
            this.rawOptions = data || [];

            // Restore state from the Unified Array Architecture
            if (this.selections && this.selections.WARRANTY && this.selections.WARRANTY.length > 0) {
                // Check if Battery was selected
                const batteryOpt = this.selections.WARRANTY.find(item => item.key === 'BATT5YR655WH');
                if (batteryOpt) {
                    this.isBatterySelected = true;
                }
                
                // Find the base warranty (anything that isn't the battery)
                const baseOpt = this.selections.WARRANTY.find(item => item.key !== 'BATT5YR655WH');
                if (baseOpt) {
                    this.selectedBaseWarranty = baseOpt.key;
                }
            }
        } catch (error) {
            console.error('Error fetching CareLink Warranty options:', error);
        } finally {
            this.isLoading = false;
        }
    }

    // --- LOGIC GETTERS ---
    
    // Get the radio options
    get baseWarrantyOptions() {
        return this.rawOptions
            .filter(opt => opt.Option_Key__c !== 'BATT5YR655WH') // Exclude battery
            .map(opt => {
                const isSelected = opt.Option_Key__c === this.selectedBaseWarranty;
                return {
                    ...opt,
                    isSelected: isSelected,
                    cardClass: isSelected ? 'option-row selected' : 'option-row'
                };
            });
    }

    // Get the single Battery checkbox option
    get batteryOption() {
        return this.rawOptions.find(opt => opt.Option_Key__c === 'BATT5YR655WH');
    }

    get isBatteryDisabled() {
        return !this.selectedBaseWarranty || this.selectedBaseWarranty === 'NO_WTY';
    }

    get batteryCardClass() {
        if (this.isBatteryDisabled) return 'option-row disabled-row';
        return this.isBatterySelected ? 'option-row selected' : 'option-row';
    }

    get isStepComplete() {
        return this.selectedBaseWarranty !== '';
    }

    // --- INTERACTION HANDLERS ---
    
    handleBaseSelect(event) {
        this.selectedBaseWarranty = event.currentTarget.dataset.key;

        // Auto-uncheck battery if they switch back to "No Warranty"
        if (this.selectedBaseWarranty === 'NO_WTY') {
            this.isBatterySelected = false;
        }
    }

    handleBatterySelect() {
        if (!this.isBatteryDisabled) {
            this.isBatterySelected = !this.isBatterySelected;
        }
    }

    handleNext() {
        // Build the Decoupled Array for the Master Engine
        let payloadArray = [];

        // 1. Add the Base Warranty (Radio Selection)
        const baseOpt = this.rawOptions.find(opt => opt.Option_Key__c === this.selectedBaseWarranty);
        if (baseOpt) {
            payloadArray.push({
                key: baseOpt.Option_Key__c,
                label: baseOpt.Option_Label__c,
                sku: baseOpt.Option_Key__c === 'NO_WTY' ? null : baseOpt.Option_Key__c
            });
        }

        // 2. Add the Battery Warranty (Checkbox Selection)
        if (this.isBatterySelected) {
            const battOpt = this.rawOptions.find(opt => opt.Option_Key__c === 'BATT5YR655WH');
            if (battOpt) {
                payloadArray.push({
                    key: battOpt.Option_Key__c,
                    label: battOpt.Option_Label__c,
                    sku: battOpt.Option_Key__c // Always billable when selected
                });
            }
        }

        this.dispatchEvent(new CustomEvent('stepcomplete', { 
            detail: { WARRANTY: payloadArray, overrideNext: 'Results' } 
        }));
    }
}
import { LightningElement, track, api } from 'lwc';
import getOptionsByStepAndFamily from '@salesforce/apex/CartConfiguratorController.getOptionsByStepAndFamily';

export default class M38ePower extends LightningElement {
    @api productType = 'M38e';
    @api selections; 

    @track rawPowerOptions = [];
    @track rawCordOptions = [];
    @track rawKitOptions = [];
    
    @track selectedPower = '';
    @track selectedCord = '';
    @track currentPreviewImage = '';
    @track hoveredCordKey = '';
    
    @track isLoading = true;

    connectedCallback() {
        this.currentPreviewImage = this.selections?.previewImage || '/resource/m38eImagesPart1/m38eImagesPart1/documentation.jpg';
        this.fetchAllMetadata();
    }

    async fetchAllMetadata() {
        try {
            const [powerData, cordData, kitData] = await Promise.all([
                getOptionsByStepAndFamily({ stepKey: 'POWER OPTION', productFamily: this.productType }),
                getOptionsByStepAndFamily({ stepKey: 'POWER CORD', productFamily: this.productType }),
                getOptionsByStepAndFamily({ stepKey: 'POWER KIT', productFamily: this.productType })
            ]);

            this.rawPowerOptions = (powerData || []).map(opt => ({
                ...opt,
                isVisible: false,
                isSelected: false,
                rowClass: 'option-row'
            }));
            
            this.rawCordOptions = cordData || [];
            this.rawKitOptions = kitData || [];

            // Restore state from the Unified Array Architecture
            if (this.selections && this.selections.POWER && this.selections.POWER.length > 0) {
                this.selectedPower = this.selections.POWER[0].key;
                
                // If a cord/kit was also selected, it will be the second item in the array
                if (this.selections.POWER.length > 1) {
                    this.selectedCord = this.selections.POWER[1].key;
                }
                this.syncUI();
            }

        } catch (error) {
            console.error('Error fetching M38e Power options:', error);
        } finally {
            this.isLoading = false;
        }
    }

    // --- Hover Logic for Power Options ---
    handlePowerMouseEnter(event) {
        this.togglePowerDescription(event.currentTarget.dataset.key, true);
    }

    handlePowerMouseLeave(event) {
        this.togglePowerDescription(event.currentTarget.dataset.key, false);
    }

    togglePowerDescription(key, isHovering) {
        this.rawPowerOptions = this.rawPowerOptions.map(opt => ({
            ...opt,
            isVisible: (opt.Option_Key__c === key && isHovering) || opt.isSelected
        }));
    }

    // --- Hover Logic for Cord Options ---
    handleCordMouseEnter(event) {
        this.hoveredCordKey = event.currentTarget.dataset.key;
    }

    handleCordMouseLeave() {
        this.hoveredCordKey = '';
    }

    // --- Selection Logic ---
    handlePowerSelect(event) {
        const key = event.currentTarget.dataset.key;
        if (this.selectedPower === key) return;
        
        this.selectedPower = key;
        this.selectedCord = ''; // Reset cord choice on power change
        this.syncUI();
    }

    handleCordSelect(event) {
        this.selectedCord = event.currentTarget.dataset.key;
    }

    syncUI() {
        this.rawPowerOptions = this.rawPowerOptions.map(opt => {
            const isSelected = opt.Option_Key__c === this.selectedPower;
            return {
                ...opt,
                isSelected: isSelected,
                isVisible: isSelected,
                rowClass: isSelected ? 'option-row selected' : 'option-row'
            };
        });
    }

    // --- Getters for HTML Iteration ---
    get filteredPowerOptions() {
        // Safely extract the Use Case routing key from the array
        const useCaseArr = this.selections?.USE_CASE || [];
        const useCaseKey = useCaseArr.length > 0 ? useCaseArr[0].key : '';
        
        return this.rawPowerOptions.filter(opt => {
            if (!opt.Visibility_Filter__c) return true;
            return opt.Visibility_Filter__c.includes(`USE_CASE=${useCaseKey}`);
        });
    }

    get visibleCordOptions() {
        if (!this.selectedPower) return [];

        let availableCords = [];

        if (this.selectedPower === 'PWR-NA') {
            availableCords = [...this.rawCordOptions];
        } else if (this.selectedPower === 'PWR-INTL') {
            availableCords = [...this.rawKitOptions];
        } else if (this.selectedPower === 'PWR-NONE') {
            availableCords = [...this.rawCordOptions, ...this.rawKitOptions];
        }

        return availableCords.map(opt => {
            const isSelected = opt.Option_Key__c === this.selectedCord;
            return {
                ...opt,
                isSelected: isSelected,
                isVisible: isSelected || opt.Option_Key__c === this.hoveredCordKey,
                rowClass: isSelected ? 'option-row selected' : 'option-row'
            };
        });
    }

    get isStepComplete() {
        return this.selectedPower !== '' && this.selectedCord !== '';
    }

    handleNext() {
        const powerOpt = this.rawPowerOptions.find(opt => opt.Option_Key__c === this.selectedPower);
        const allCords = [...this.rawCordOptions, ...this.rawKitOptions];
        const cordOpt = allCords.find(opt => opt.Option_Key__c === this.selectedCord);

        // Build the Decoupled Array
        let payloadArray = [];
        
        // 1. Add the Parent Power Option (Routing Key)
        if (powerOpt) {
            payloadArray.push({
                key: powerOpt.Option_Key__c,
                label: powerOpt.Option_Label__c,
                sku: null // Not a billable SKU
            });
        }

        // 2. Add the Cord/Kit (Billable SKU)
        if (cordOpt && cordOpt.Option_Key__c !== 'NONE') {
            payloadArray.push({
                key: cordOpt.Option_Key__c,
                label: cordOpt.Option_Label__c,
                sku: cordOpt.Option_Key__c // Actual product code for Apex
            });
        }

        this.dispatchEvent(new CustomEvent('stepcomplete', {
            detail: { 
                POWER: payloadArray, 
                previewImage: this.currentPreviewImage 
            }
        }));
    }
}
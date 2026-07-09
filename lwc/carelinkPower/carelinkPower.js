import { LightningElement, track, api } from 'lwc';
import getOptionsByStepAndFamily from '@salesforce/apex/CartConfiguratorController.getOptionsByStepAndFamily';

export default class CarelinkPower extends LightningElement {
    @api productType = 'CareLink';
    @api selections; 

    @track rawPowerOptions = [];
    @track rawCordOptions = [];
    @track rawKitOptions = [];
    @track rawInverterOptions = [];
    
    @track selectedPower = '';
    @track selectedCord = '';
    @track selectedInverter = '';

    @track currentPreviewImage = '';
    @track hoveredCordKey = '';
    
    @track isLoading = true;

    connectedCallback() {
        this.currentPreviewImage = this.selections?.previewImage || '/resource/carelinkImagesPart1/carelinkImagesPart1/documentation.jpg';
        this.fetchAllMetadata();
    }

    async fetchAllMetadata() {
        try {
            const [powerData, cordData, kitData, invData] = await Promise.all([
                getOptionsByStepAndFamily({ stepKey: 'POWER OPTION', productFamily: this.productType }),
                getOptionsByStepAndFamily({ stepKey: 'POWER CORD', productFamily: this.productType }),
                getOptionsByStepAndFamily({ stepKey: 'POWER KIT', productFamily: this.productType }),
                getOptionsByStepAndFamily({ stepKey: 'INVERTER', productFamily: this.productType })
            ]);

            this.rawPowerOptions = (powerData || []).map(opt => ({
                ...opt,
                isVisible: false,
                isSelected: false,
                rowClass: 'option-row'
            }));
            
            this.rawCordOptions = cordData || [];
            this.rawKitOptions = kitData || [];
            this.rawInverterOptions = invData || [];

            // Restore state from the Unified Array Architecture
            if (this.selections && this.selections.POWER && this.selections.POWER.length > 0) {
                this.selectedPower = this.selections.POWER[0].key;
                
                if (this.selections.POWER.length > 1) {
                    this.selectedCord = this.selections.POWER[1].key;
                }
                if (this.selections.POWER.length > 2) {
                    this.selectedInverter = this.selections.POWER[2].key;
                }
                this.syncUI();
            }

        } catch (error) {
            console.error('Error fetching CareLink Power options:', error);
        } finally {
            this.isLoading = false;
        }
    }

    // --- Visibility Evaluator ---
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
                key = key.trim();
                val = val.trim();
                const stateVal = stateObj[key];
                
                if (isNotEqual) {
                    if (stateVal && stateVal.toLowerCase() === val.toLowerCase()) { groupPassed = false; break; }
                } else {
                    if (!stateVal || stateVal.toLowerCase() !== val.toLowerCase()) { groupPassed = false; break; }
                }
            }
            if (groupPassed) return true;
        }
        return false; 
    }

    // --- Hover Logic ---
    handlePowerMouseEnter(event) { this.togglePowerDescription(event.currentTarget.dataset.key, true); }
    handlePowerMouseLeave(event) { this.togglePowerDescription(event.currentTarget.dataset.key, false); }

    togglePowerDescription(key, isHovering) {
        this.rawPowerOptions = this.rawPowerOptions.map(opt => ({
            ...opt,
            isVisible: (opt.Option_Key__c === key && isHovering) || opt.isSelected
        }));
    }

    handleCordMouseEnter(event) { this.hoveredCordKey = event.currentTarget.dataset.key; }
    handleCordMouseLeave() { this.hoveredCordKey = ''; }

    // --- Selection Logic ---
    handlePowerSelect(event) {
        const key = event.currentTarget.dataset.key;
        if (this.selectedPower === key) return;
        
        this.selectedPower = key;
        this.selectedCord = ''; 
        this.selectedInverter = '';
        this.syncUI();
    }

    handleCordSelect(event) {
        this.selectedCord = event.currentTarget.dataset.key;
    }

    handleInverterSelect(event) {
        this.selectedInverter = event.currentTarget.dataset.key;
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
        const useCaseArr = this.selections?.USE_CASE || [];
        const useCaseKey = useCaseArr.length > 0 ? useCaseArr[0].key : '';
        
        return this.rawPowerOptions.filter(opt => {
            return this.evaluateFilter(opt.Visibility_Filter__c, { USE_CASE: useCaseKey });
        });
    }

    get visibleCordOptions() {
        if (!this.selectedPower) return [];

        let availableCords = [];
        if (this.selectedPower === 'PWR-NA') {
            availableCords = [...this.rawCordOptions];
        } else if (this.selectedPower === 'PWR-INTL') {
            availableCords = [...this.rawKitOptions];
        } else if (this.selectedPower === 'Non Powered') {
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

    get visibleInverterOptions() {
        if (!this.selectedCord) return [];

        let availableInverters = [];
        if (this.selectedPower === 'PWR-NA') {
            availableInverters = this.rawInverterOptions.filter(o => o.Option_Key__c === 'NONE' || o.Option_Key__c === '1821102');
        } else {
            availableInverters = this.rawInverterOptions.filter(o => o.Option_Key__c === 'NONE' || o.Option_Key__c !== '1821102');
        }

        return availableInverters.map(opt => {
            const isSelected = opt.Option_Key__c === this.selectedInverter;
            return {
                ...opt,
                isSelected: isSelected,
                rowClass: isSelected ? 'option-row selected' : 'option-row'
            };
        });
    }

    get isStepComplete() {
        return this.selectedPower !== '' && this.selectedCord !== '' && this.selectedInverter !== '';
    }

    // --- Output Generator ---
    handleNext() {
        const powerOpt = this.rawPowerOptions.find(opt => opt.Option_Key__c === this.selectedPower);
        const allCords = [...this.rawCordOptions, ...this.rawKitOptions];
        const cordOpt = allCords.find(opt => opt.Option_Key__c === this.selectedCord);
        const invOpt = this.rawInverterOptions.find(opt => opt.Option_Key__c === this.selectedInverter);

        // Build the Decoupled Array
        let payloadArray = [];
        
        // 1. Power Option (Routing Key, sku = null)
        if (powerOpt) {
            payloadArray.push({
                key: powerOpt.Option_Key__c,
                label: powerOpt.Option_Label__c,
                sku: null 
            });
        }

        // 2. Cord/Kit (Billable SKU)
        if (cordOpt && cordOpt.Option_Key__c !== 'Other') {
            payloadArray.push({
                key: cordOpt.Option_Key__c,
                label: cordOpt.Option_Label__c,
                sku: cordOpt.Option_Key__c 
            });
        }

        // 3. Inverter (Billable SKU)
        if (invOpt && invOpt.Option_Key__c !== 'NONE') {
            payloadArray.push({
                key: invOpt.Option_Key__c,
                label: invOpt.Option_Label__c,
                sku: invOpt.Option_Key__c 
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
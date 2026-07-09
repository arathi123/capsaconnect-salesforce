import { LightningElement, track, api } from 'lwc';
import getOptionsByStepAndFamily from '@salesforce/apex/CartConfiguratorController.getOptionsByStepAndFamily';

export default class CarelinkLift extends LightningElement {
    @api productType = 'CareLink';
    @api selections;

    @track rawLiftOptions = [];
    @track selectedLift = '';
    @track hoveredLiftKey = '';
    
    @track currentPreviewImage = '';
    @track isLoading = true;

    connectedCallback() {
        // Carry over the preview image from the previous steps
        this.currentPreviewImage = this.selections?.previewImage || '/resource/carelinkImagesPart1/carelinkImagesPart1/documentation.jpg';
        this.fetchMetadata();
    }

    async fetchMetadata() {
        try {
            const data = await getOptionsByStepAndFamily({ stepKey: 'LIFT', productFamily: this.productType });
            
            if (data) {
                this.rawLiftOptions = data.map(opt => ({
                    ...opt,
                    isVisible: false,
                    isSelected: false,
                    rowClass: 'option-row'
                }));

                // Restore state from Unified Array Architecture
                if (this.selections && this.selections.LIFT && this.selections.LIFT.length > 0) {
                    this.selectedLift = this.selections.LIFT[0].key;
                    this.syncUI();
                }
            }
        } catch (error) {
            console.error('Error fetching CareLink Lift options:', error);
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
        this.rawLiftOptions = this.rawLiftOptions.map(opt => {
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

    // --- Getters ---
    get filteredLiftOptions() {
        // Extract Use Case routing key to evaluate the Manual lift filter (USE_CASE!=Specialty)
        const useCaseArr = this.selections?.USE_CASE || [];
        const useCaseKey = useCaseArr.length > 0 ? useCaseArr[0].key : '';
        
        return this.rawLiftOptions.filter(opt => {
            return this.evaluateFilter(opt.Visibility_Filter__c, { USE_CASE: useCaseKey });
        });
    }

    get isStepComplete() {
        return this.selectedLift !== '';
    }

    // --- Output Generator ---
    handleNext() {
        const selectedOpt = this.rawLiftOptions.find(opt => opt.Option_Key__c === this.selectedLift);
        
        // Build the Decoupled Array
        let payloadArray = [];
        
        if (selectedOpt) {
            payloadArray.push({
                key: selectedOpt.Option_Key__c,
                label: selectedOpt.Option_Label__c,
                sku: null // Lift modifies Chassis, not a standalone billable SKU
            });
        }

        this.dispatchEvent(new CustomEvent('stepcomplete', {
            detail: { 
                LIFT: payloadArray, 
                previewImage: this.currentPreviewImage 
            }
        }));
    }
}
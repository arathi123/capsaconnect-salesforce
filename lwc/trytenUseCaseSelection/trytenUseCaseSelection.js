import { LightningElement, track, api } from 'lwc';
import getOptionsByStepAndFamily from '@salesforce/apex/CartConfiguratorController.getOptionsByStepAndFamily';

export default class TrytenUseCaseSelection extends LightningElement {
    @api productType = 'Tryten';
    @api initialSelections; 

    @track allOptions = [];
    @track currentPreviewImage = '/resource/TrytenBaseImages/images/cart.png';
    @track isLoading = true;

    // Holds the Option_Key__c for each answered step
    @track selections = {
        APP: '',
        ARM: '',
        SIZE: '',
        CASE: '',
        FOOTPRINT: '',
        CONFIG: '',
        MOUNT: ''
    };

    connectedCallback() {
        this.fetchAllTrytenData();
    }

    async fetchAllTrytenData() {
        this.isLoading = true;
        try {
            // The 7 Step Keys from your metadata
            const stepsToFetch = ['APP', 'ARM', 'SIZE', 'CASE', 'FOOTPRINT', 'CONFIG', 'MOUNT'];
            
            // Fire all 7 Apex calls concurrently
            const apexPromises = stepsToFetch.map(step => {
                return getOptionsByStepAndFamily({ stepKey: step, productFamily: this.productType });
            });

            const results = await Promise.all(apexPromises);

            // Flatten the results into a single array
            this.allOptions = results.flat().map(opt => ({
                ...opt,
                isSelected: false,
                cardClass: 'option-card'
            }));

            // If navigating backwards, restore state
            if (this.initialSelections && this.initialSelections.APP) {
                this.selections = JSON.parse(JSON.stringify(this.initialSelections));
                this.updatePreviewImage();
            }
        } catch (error) {
            console.error('Error fetching Tryten options:', error);
        } finally {
            this.isLoading = false;
        }
    }

    // =====================================
    // DYNAMIC FILTER ENGINE
    // =====================================
    
    matchesFilter(filterStr) {
        if (!filterStr) return true; // Show if no filter exists
        
        const rules = filterStr.split(';').map(s => s.trim());
        const reqMap = {};
        
        // Group rules (e.g., { APP: ['TAB'], FOOTPRINT: ['FP-L', 'FP-H'] })
        rules.forEach(rule => {
            const parts = rule.split('=');
            if (parts.length === 2) {
                const key = parts[0].trim();
                const val = parts[1].trim();
                if (!reqMap[key]) reqMap[key] = [];
                reqMap[key].push(val);
            }
        });

        // Evaluate conditions
        for (const key of Object.keys(reqMap)) {
            // If the prerequisite question hasn't been answered yet, hide this option
            if (!this.selections[key]) return false; 
            // If the answer doesn't match the required values, hide this option
            if (!reqMap[key].includes(this.selections[key])) return false;
        }
        return true;
    }

    getFilteredOptions(stepKey) {
        return this.allOptions
            .filter(opt => opt.Step_Key__c === stepKey && this.matchesFilter(opt.Visibility_Filter__c))
            .map(opt => ({
                ...opt,
                isSelected: this.selections[stepKey] === opt.Option_Key__c,
                cardClass: this.selections[stepKey] === opt.Option_Key__c ? 'option-card selected' : 'option-card'
            }));
    }

    // =====================================
    // UI GETTERS
    // =====================================
    
    get appOptions() { return this.getFilteredOptions('APP'); }
    get armOptions() { return this.getFilteredOptions('ARM'); }
    get sizeOptions() { return this.getFilteredOptions('SIZE'); }
    get caseOptions() { return this.getFilteredOptions('CASE'); }
    get footprintOptions() { return this.getFilteredOptions('FOOTPRINT'); }
    get configOptions() { return this.getFilteredOptions('CONFIG'); }
    get mountOptions() { 
        const s = this.selections;
        let isMountReady = false;

        // Path 1: Light or Heavy Footprint selected (bypasses Config)
        if (s.FOOTPRINT === 'FP-L' || s.FOOTPRINT === 'FP-H') {
            isMountReady = true;
        } 
        // Path 2: Medium Footprint selected AND a Config is chosen
        else if (s.FOOTPRINT === 'FP-M' && s.CONFIG !== '') {
            isMountReady = true;
        }

        if (!isMountReady) return [];

        // Return the Mounts directly since they apply equally to all valid paths
        return this.allOptions
            .filter(opt => opt.Step_Key__c === 'MOUNT')
            .map(opt => ({
                ...opt,
                isSelected: this.selections['MOUNT'] === opt.Option_Key__c,
                cardClass: this.selections['MOUNT'] === opt.Option_Key__c ? 'option-card selected' : 'option-card'
            }));
    }

    // =====================================
    // INTERACTION & CASCADING RESETS
    // =====================================

    handleSelect(event) {
        const stepKey = event.currentTarget.dataset.step;
        const optKey = event.currentTarget.dataset.key;
        
        if (this.selections[stepKey] === optKey) return; 
        
        this.selections[stepKey] = optKey;

        // Cascade Clear: Automatically reset downstream answers if a parent changes
        if (stepKey === 'APP') {
            this.selections.ARM = ''; this.selections.SIZE = ''; this.selections.CASE = '';
            this.selections.FOOTPRINT = ''; this.selections.CONFIG = ''; this.selections.MOUNT = '';
        } else if (stepKey === 'ARM') {
            this.selections.SIZE = ''; this.selections.CASE = '';
            this.selections.FOOTPRINT = ''; this.selections.CONFIG = ''; this.selections.MOUNT = '';
        } else if (stepKey === 'SIZE') {
            this.selections.CASE = '';
        } else if (stepKey === 'FOOTPRINT') {
            this.selections.CONFIG = ''; this.selections.MOUNT = '';
        } else if (stepKey === 'CONFIG') {
            this.selections.MOUNT = '';
        }

        this.updatePreviewImage();
    }

    // Starts from the deepest possible choice and works backwards to find a Preview Image
    updatePreviewImage() {
        const orderedSteps = ['MOUNT', 'CONFIG', 'FOOTPRINT', 'CASE', 'SIZE', 'ARM', 'APP'];
        
        for (let step of orderedSteps) {
            const selectedKey = this.selections[step];
            if (selectedKey) {
                const opt = this.allOptions.find(o => o.Option_Key__c === selectedKey && o.Step_Key__c === step);
                if (opt && opt.Preview_Image_URL__c) {
                    this.currentPreviewImage = opt.Preview_Image_URL__c;
                    return;
                }
            }
        }
    }

    // =====================================
    // 22-PATH COMPLETION CHECK
    // =====================================
    
    get isStepComplete() {
        const s = this.selections;
        
        if (s.APP === 'TAB') {
            if (s.ARM === 'ARM-N') return true;
            if (s.ARM === 'ARM-Y' && s.SIZE === 'SIZE-7') return true;
            if (s.ARM === 'ARM-Y' && s.SIZE === 'SIZE-14' && s.CASE !== '') return true;
        }
        
        if (s.APP === 'MON') {
            if (s.ARM === 'ARM-Y' && s.SIZE !== '') return true;
            if (s.ARM === 'ARM-N') {
                if ((s.FOOTPRINT === 'FP-L' || s.FOOTPRINT === 'FP-H') && s.MOUNT !== '') return true;
                if (s.FOOTPRINT === 'FP-M' && s.CONFIG !== '' && s.MOUNT !== '') return true;
            }
        }
        
        return false;
    }

    handleNext() {
        this.dispatchEvent(new CustomEvent('usestepcomplete', {
            detail: {
                selections: this.selections,
                previewImage: this.currentPreviewImage // Pass the image up!
            }
        }));
    }
}
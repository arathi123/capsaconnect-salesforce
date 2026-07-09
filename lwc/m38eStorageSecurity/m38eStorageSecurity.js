import { LightningElement, track, api } from 'lwc';
import getOptionsByStepAndFamily from '@salesforce/apex/CartConfiguratorController.getOptionsByStepAndFamily';

export default class M38eStorageSecurity extends LightningElement {
    @api productType = 'M38e';
    @api selections; 

    @track rawStorageTypes = [];
    @track rawBinOptions = [];
    
    @track selectedStorage = '';
    @track selectedBin = '';
    @track nextStepOverride = '';
    
    @track currentPreviewImage = '';
    @track basePreviewImage = ''; // Holds the Step 1-4 cart image
    @track isLoading = true;

    connectedCallback() {
        this.basePreviewImage = this.selections?.previewImage || '/resource/m38eImagesPart1/m38eImagesPart1/documentation.jpg';
        this.currentPreviewImage = this.basePreviewImage;
        this.fetchAllMetadata();
    }

    async fetchAllMetadata() {
        try {
            const [storageData, binData] = await Promise.all([
                getOptionsByStepAndFamily({ stepKey: 'STORAGE', productFamily: this.productType }),
                getOptionsByStepAndFamily({ stepKey: 'BIN', productFamily: this.productType })
            ]);

            this.rawStorageTypes = storageData || [];
            this.rawBinOptions = binData || [];

            // Restore state from the Unified Array Architecture
            if (this.selections && this.selections.STORAGE && this.selections.STORAGE.length > 0) {
                this.selectedStorage = this.selections.STORAGE[0].key;
                
                // Re-calculate the "None" override if applicable
                if (this.selectedStorage === 'None') {
                    const opt = this.rawStorageTypes.find(o => o.Option_Key__c === 'None');
                    this.nextStepOverride = opt?.Next_Step_Override__c || 'Accessories';
                }
                
                // If they selected a Bin Module, it will be the second item in the array
                if (this.selections.STORAGE.length > 1) {
                    this.selectedBin = this.selections.STORAGE[1].key;
                    
                    const previouslySelectedBin = this.rawBinOptions.find(opt => opt.Option_Key__c === this.selectedBin);
                    if (previouslySelectedBin) {
                        this.nextStepOverride = previouslySelectedBin.Next_Step_Override__c || '';
                        this.currentPreviewImage = this.transformImageUrl(previouslySelectedBin.Preview_Image_URL__c);
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching M38e Storage options:', error);
        } finally {
            this.isLoading = false;
        }
    }

    // --- VISIBILITY FILTER EVALUATOR ---
    evaluateFilter(filterStr, stateObj) {
        if (!filterStr) return true; // No filter = always visible
        
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

    // --- DYNAMIC IMAGE TRANSFORMER ('L' vs 'M') ---
    transformImageUrl(url) {
        if (!url) return '';
        
        const monitorArr = this.selections?.MONITOR || [];
        const monitorType = monitorArr.length > 0 ? monitorArr[0].key : '';
        const isLaptop = monitorType === '1975115';
        const suffix = isLaptop ? 'L' : 'M';
        
        // 1. Clean the URL: Strip any existing L or M right before the extension to prevent double appending
        let cleanUrl = url.replace(/L\.png$/i, '.png')
                          .replace(/M\.png$/i, '.png')
                          .replace(/L\.jpg$/i, '.jpg')
                          .replace(/M\.jpg$/i, '.jpg');
        
        // 2. Inject the correct suffix safely
        return cleanUrl.replace('.png', `${suffix}.png`).replace('.jpg', `${suffix}.jpg`);
    }

    // --- SELECTION LOGIC ---
    handleStorageSelect(event) {
        const key = event.currentTarget.dataset.key;
        if (this.selectedStorage === key) return;
        
        this.selectedStorage = key;
        this.selectedBin = ''; 
        this.currentPreviewImage = this.basePreviewImage; 
        this.nextStepOverride = '';
        
        if (key === 'None') {
            const opt = this.rawStorageTypes.find(o => o.Option_Key__c === key);
            this.nextStepOverride = opt?.Next_Step_Override__c || 'Accessories';
        }
    }

    handleBinSelect(event) {
        this.selectedBin = event.currentTarget.dataset.key;
        this.nextStepOverride = event.currentTarget.dataset.override;
        
        // Fetch raw URL directly from metadata instead of trusting HTML dataset!
        const binOpt = this.rawBinOptions.find(opt => opt.Option_Key__c === this.selectedBin);
        if (binOpt) {
            this.currentPreviewImage = this.transformImageUrl(binOpt.Preview_Image_URL__c);
        }
    }

    // --- LWC GETTERS ---
    get storageOptions() {
        const useCaseArr = this.selections?.USE_CASE || [];
        const useCaseKey = useCaseArr.length > 0 ? useCaseArr[0].key : '';
        
        const liftArr = this.selections?.LIFT || [];
        const liftKey = liftArr.length > 0 ? liftArr[0].key : '';
        const liftState = liftKey === 'LIFT-ELEC' ? 'Electronic' : 'Manual';

        const state = { 
            USE_CASE: useCaseKey, 
            LIFT: liftState 
        };

        return this.rawStorageTypes
            .filter(opt => this.evaluateFilter(opt.Visibility_Filter__c, state))
            .map(opt => ({
                ...opt,
                isSelected: opt.Option_Key__c === this.selectedStorage,
                rowClass: opt.Option_Key__c === this.selectedStorage ? 'option-row selected' : 'option-row'
            }));
    }

    get showBinOptions() {
        return this.selectedStorage !== '' && this.selectedStorage !== 'None';
    }

    get binOptions() {
        if (!this.showBinOptions) return [];
        
        const useCaseArr = this.selections?.USE_CASE || [];
        const useCaseKey = useCaseArr.length > 0 ? useCaseArr[0].key : '';
        
        const liftArr = this.selections?.LIFT || [];
        const liftKey = liftArr.length > 0 ? liftArr[0].key : '';
        const liftState = liftKey === 'LIFT-ELEC' ? 'Electronic' : 'Manual';

        const state = {
            USE_CASE: useCaseKey,
            LIFT: liftState,
            STORAGE: this.selectedStorage
        };

        return this.rawBinOptions
            .filter(opt => this.evaluateFilter(opt.Visibility_Filter__c, state))
            .map(opt => {
                const isSelected = opt.Option_Key__c === this.selectedBin;
                return {
                    ...opt,
                    Display_Image_URL__c: this.transformImageUrl(opt.Image_URL__c),
                    isSelected: isSelected,
                    cardClass: isSelected ? 'drawer-card selected' : 'drawer-card'
                };
            });
    }

    get isStepComplete() {
        if (this.selectedStorage === 'None') return true;
        return this.selectedStorage !== '' && this.selectedBin !== '';
    }

    handleNext() {
        const storageOpt = this.rawStorageTypes.find(opt => opt.Option_Key__c === this.selectedStorage);
        const binOpt = this.rawBinOptions.find(opt => opt.Option_Key__c === this.selectedBin);

        // Build the Decoupled Array
        let payloadArray = [];

        // 1. Add the Storage Security Base (Routing Key)
        if (storageOpt) {
            payloadArray.push({
                key: storageOpt.Option_Key__c,
                label: storageOpt.Option_Label__c,
                sku: null 
            });
        }

        // 2. Add the Bin Type (Billable Compound SKU)
        if (this.selectedStorage !== 'None' && binOpt) {
            payloadArray.push({
                key: binOpt.Option_Key__c,
                label: binOpt.Option_Label__c,
                sku: binOpt.Option_Key__c 
            });
        }

        // Dispatch perfectly structured state
        this.dispatchEvent(new CustomEvent('stepcomplete', {
            detail: { 
                STORAGE: payloadArray, 
                previewImage: this.currentPreviewImage, 
                overrideNext: this.nextStepOverride 
            }
        }));
    }
}
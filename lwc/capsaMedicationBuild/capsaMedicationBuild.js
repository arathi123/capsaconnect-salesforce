import { LightningElement, track, api } from 'lwc';
import checkTargetCartProduct from '@salesforce/apex/QuoteGeneratorController.checkTargetCartProduct';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

const STEPS = [
    { name: 'TypeSelection', label: 'Type Selection' },
    { name: 'UseCase', label: 'Use Case' },
    { name: 'Width', label: 'Width' },
    { name: 'Height', label: 'Height' },
    { name: 'Lock', label: 'Lock' },
    { name: 'Series', label: 'Series' },
    { name: 'BumperColor', label: 'Bumper Color' },
    { name: 'Storage', label: 'Storage' },
    { name: 'ExtendedStorage', label: 'Extended Storage' },
    { name: 'Accessories', label: 'Accessories' },
    { name: 'Tray', label: 'Tray' }, 
    { name: 'Results', label: 'Results' }
];

export default class CapsaMedicationBuild extends LightningElement {
    @api selections;
    @api opportunityId;
    @api productType = 'Medication';
    @api quoteId;
    @track stepIndex = 1;
    isLoading = false;
    @track isUnlistedCart = false;
    @track isValidAtStorage = false;
    isStorageMode = false;
    isExtendedMode = true;

    @track selections = {
        cartType: { key: '', label: '' },
        width: { key: '', label: '' },
        height: { key: '', label: '' },
        lock: { key: '', label: '' },
        series: { key: '', label: '' },  
        color: { key: '', label: '' },    
        storageTiers: { configCode: '' },
        extendedStorageTiers: { configCode: '' }, 
        tray: { key: '', label: '' },
        accessories: []

    };

    get currentStep() { return STEPS[this.stepIndex].name; }
    get isUseCaseStep() { return this.currentStep === 'UseCase'; }
    get isWidthStep() { return this.currentStep === 'Width'; }
    get isHeightStep() { return this.currentStep === 'Height'; }
    get isLockStep() { return this.currentStep === 'Lock'; }
    get isSeriesStep() { return this.currentStep === 'Series'; }          
    get isColorStep() { return this.currentStep === 'BumperColor'; }      
    get isStorageStep() { return this.currentStep === 'Storage'; }
    get isExtendedStorageStep() { return this.currentStep === 'ExtendedStorage'; }
    get isAccessoryStep() { return this.currentStep === 'Accessories'; }
    get isTrayStep() { return this.currentStep === 'Tray'; }  // Added for Laptop Options
    get isResultStep() { return this.currentStep === 'Results'; }

    get isWidthXL() {
        return this.selections.width && 
              (this.selections.width.key === 'XL' || (this.selections.width.label && this.selections.width.label.includes('XL')));
    }

    @api jumpToStep(stepName) {
        const newIndex = STEPS.findIndex(s => s.name === stepName);
        if (newIndex !== -1) this.stepIndex = newIndex;
    }

    // --- Dynamic SKU Generation ---
    generateSku() {
        const type = this.selections.cartType.key || '';
        const w = this.selections.width.key || '';
        const h = this.selections.height.key || '';
        const l = this.selections.lock.key || '';
        const s = this.selections.series.key || '';
        const c = this.selections.color.key || '';
        const storage = this.selections.storageTiers.configCode || '000';
        
        // Base string: 'AV'+Carttype+width+height+'-'+Lock+Series+color+'-D'+Storagedrawerconfig
        let sku = `AV${type}${w}${h}-${l}${s}${c}-D${storage}`;
        
        // Append Extended Storage if Width is XL
        if (this.isWidthXL) {
            const extStorage = this.selections.extendedStorageTiers.configCode || '000';
            sku += `-U${extStorage}`;
        }
        
        return sku;
    }

    // --- Formatted Output for Results Page ---
    get summaryData() {
        return {
            packageSku: this.generateSku(),
            accessories: (this.selections.accessories || []).map((acc, index) => ({
                id: `acc-${index}`,
                label: acc.displayValue,
                quantity: acc.quantity || '',
                optionKey: acc.optionKey,
                position: acc.position || ''
            })),
            tray: this.selections.tray
        };
    }

    // --- Handlers ---
    handleCartTypeSelection(event) { this.selections.cartType = event.detail; }
    handleWidthSelection(event) { this.selections.width = event.detail; }
    handleHeightSelection(event) { this.selections.height = event.detail; }
    handleLockSelection(event) { this.selections.lock = event.detail; }
    handleSeriesSelection(event) { this.selections.series = event.detail; }
    handleColorSelection(event) { this.selections.color = event.detail; }
    handleTraySelection(event) {  this.selections.tray = event.detail; }

    handleNextButton(event) {
        this.isLoading = true;

        if (event && event.detail) {
            /*
            if (event.detail.step === 'STORAGE' && this.currentStep === 'Storage') {
                this.selections.storageTiers = event.detail.payload || { configCode: '000' };
            }  */
           if (event.detail.step === 'STORAGE' && this.currentStep === 'Storage') {

                this.selections.storageTiers = event.detail.payload || { configCode: '000' };

                const targetCart = this.generateSku();
                console.log('Checking SKU at Storage:', targetCart);

                //  ONLY VALIDATE IF NOT XL
                if (!this.isWidthXL) {

                    checkTargetCartProduct({ targetCart })
                        .then(result => {
                            console.log('Storage SKU valid:', result);

                            if (result) {
                                this.isValidAtStorage = true;
                                this.isUnlistedCart = false;
                            } else {
                                this.isUnlistedCart = true;

                            this.showToast(
                                'Configuration Not Found',
                                'This specific configuration is not in our standard catalog. You may proceed, and our team will review this custom request upon quote submission.',
                                'warning'
                                );
                            }
                        })
                        .catch(err => {
                            console.error(err);
                        });
                }
            }   
                       
            /* 
            else if (event.detail.step === 'STORAGE' && this.currentStep === 'ExtendedStorage') {
                this.selections.extendedStorageTiers = event.detail.payload || { configCode: '000' };
            } */

            else if (event.detail.step === 'STORAGE' && this.currentStep === 'ExtendedStorage') {

                this.selections.extendedStorageTiers = event.detail.payload || { configCode: '000' };

                const targetCart = this.generateSku();
                console.log('Checking SKU at ExtendedStorage:', targetCart);

                //  ONLY VALIDATE FOR XL
                if (this.isWidthXL) {

                    checkTargetCartProduct({ targetCart })
                        .then(result => {
                            console.log('Extended SKU valid:', result);

                            if (result) {
                                this.isUnlistedCart = false;
                            } else {
                                this.isUnlistedCart = true;

                                this.showToast(
                                    'Configuration Not Found',
                                    'This specific configuration is not in our standard catalog. You may proceed, and our team will review this custom request upon quote submission.',
                                    'warning'
                                );
                            }
                        })
                        .catch(err => {
                            console.error(err);
                        });
                }
            }
            else if (event.detail.step === 'ACCESSORIES') {
                this.selections.accessories = event.detail.payload.accessories || [];
            }

            else if (event.detail.step === 'TRAY') {   
                this.selections.tray = event.detail.payload;
                }
        }
        
                // FINAL SAFETY
        if (this.isValidAtStorage) {
            this.isUnlistedCart = false;
        }
        setTimeout(() => {
            let nextStepName = STEPS[this.stepIndex + 1].name;

            // Skip Extended Storage if width is not XL
            if (this.currentStep === 'Storage' && !this.isWidthXL) {
                nextStepName = 'Accessories';
            }

                        if (this.currentStep === 'Accessories') {
                const requiresTray = (this.selections.accessories || []).some(acc => acc.requiresTrayPage);
                if (!requiresTray) {
                    nextStepName = 'Results';
                }
            }
            
            this.dispatchEvent(new CustomEvent('stepchange', { detail: { nextStep: nextStepName } }));
            this.jumpToStep(nextStepName);
            this.isLoading = false;
        }, 300);
    }

    showToast(title, message, variant) {
        this.dispatchEvent(
            new ShowToastEvent({
                title,
                message,
                variant,
                mode: 'pester'
            })
        );
   }
}
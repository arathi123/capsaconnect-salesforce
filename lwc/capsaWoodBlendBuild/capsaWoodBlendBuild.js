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
    { name: 'Options', label: 'Options' },                  // NEW STEP
    { name: 'Accessories', label: 'Accessories' },
    // ADDED (Tray Step)
    { name: 'Tray', label: 'Tray' },
    { name: 'Results', label: 'Results' }                   
];

export default class CapsaWoodBlendBuild extends LightningElement {
    @api selections;
    @api opportunityId;
    @api productType;
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
        // NEW: Options tracking for Woodblend
        options: {
            handle: { optionLabel: '', optionKey: '', displayValue: '' },
            surface: { optionLabel: '', optionKey: '', displayValue: '', position: '' }
        },
        accessories: [],
        tray: { key: '', label: '' }
    };

    get currentStep() { return STEPS[this.stepIndex].name; }
    get currentStepLabel() { return STEPS[this.stepIndex].label; }
    
    // UPDATED SKIP LOGIC: If we are on Options and it's not XL, the previous step was Storage
    get previousStepLabel() { 
        if (this.currentStep === 'Options' && !this.isWidthXL) {
            return 'Storage';
        }
        return STEPS[this.stepIndex - 1]?.label || 'Previous Step'; 
    }
    
    get isWidthXL() {
        return this.selections.width && 
              (this.selections.width.key === 'XL' || (this.selections.width.label && this.selections.width.label.includes('XL')));
    }

    get isUseCaseStep() { return this.currentStep === 'UseCase'; }
    get isWidthStep() { return this.currentStep === 'Width'; }
    get isHeightStep() { return this.currentStep === 'Height'; }
    get isLockStep() { return this.currentStep === 'Lock'; }
    get isSeriesStep() { return this.currentStep === 'Series'; }          
    get isColorStep() { return this.currentStep === 'BumperColor'; }      
    get isStorageStep() { return this.currentStep === 'Storage'; } 
    get isExtendedStorageStep() { return this.currentStep === 'ExtendedStorage'; }
    get isOptionsStep() { return this.currentStep === 'Options'; } // NEW
    get isAccessoryStep() { return this.currentStep === 'Accessories'; }
    get isResultStep() { return this.currentStep === 'Results'; }
    // ADDED
    get isTrayStep() { return this.currentStep === 'Tray'; }

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
        
        let sku = `AW${type}${w}${h}-${l}${s}${c}-D${storage}`;
        
        if (this.isWidthXL) {
            const extStorage = this.selections.extendedStorageTiers.configCode || '000';
            sku += `-U${extStorage}`;
        }
        
        return sku;
    }

    // UPDATED: Added handle and pullOutSurface to pass to the result page
    get summaryData() {
        return {
            packageSku: this.generateSku(),
            handle: this.selections.options.handle || '',
            pullOutSurface: this.selections.options.surface || '',
            tray: this.selections.tray || '',
            accessories: (this.selections.accessories || []).map((acc, index) => ({
                id: `acc-${index}`,
                label: acc.displayValue,
                quantity: acc.quantity || '',
                optionKey: acc.optionKey,
                position: acc.position || '',
                tray: acc.tray || ''
            }))
        };
    }

    handleCartTypeSelection(event) { this.selections.cartType = event.detail; }
    handleWidthSelection(event) { this.selections.width = event.detail; }
    handleHeightSelection(event) { this.selections.height = event.detail; }
    handleLockSelection(event) { this.selections.lock = event.detail; }
    handleSeriesSelection(event) { this.selections.series = event.detail; }
    handleColorSelection(event) { this.selections.color = event.detail; }
     handleTraySelection(event) {
        this.selections.tray = event.detail;
    }

    handleNextButton(event) {
        this.isLoading = true;

        if (event && event.detail) {
        if (event.detail.step === 'STORAGE' && this.currentStep === 'Storage') {

            this.selections.storageTiers = event.detail.payload || { configCode: '000' };

            const targetCart = this.generateSku();
            console.log('WoodBlend Storage SKU:', targetCart);

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

        else if (event.detail.step === 'STORAGE' && this.currentStep === 'ExtendedStorage') {

                this.selections.extendedStorageTiers = event.detail.payload || { configCode: '000' };

                const targetCart = this.generateSku();
                console.log('WoodBlend Extended SKU:', targetCart);

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
            // NEW: Capture Options Payload
            else if (event.detail.step === 'OPTIONS') {
                this.selections.options = {
                    handle: event.detail.payload.handle || { optionLabel: '', optionKey: '', displayValue: '' },
                    surface: event.detail.payload.surface || { optionLabel: '', optionKey: '', displayValue: '', position: '' }
                };
            }
            else if (event.detail.step === 'ACCESSORIES') {
                this.selections.accessories = event.detail.payload.accessories || [];
            }
            else if (event.detail.step === 'TRAY') {
                this.selections.tray = event.detail.payload;
            }
        }
        
        setTimeout(() => {
            let nextStepName;
            
            // Respect the dynamic "goTo" override if a component sends it (like Options jumping to Accessories)
            if (event.detail && event.detail.goTo) {
                nextStepName = event.detail.goTo;
            } else {
                nextStepName = STEPS[this.stepIndex + 1].name;
            }

            // UPDATED SKIP LOGIC: Skip Extended Storage directly to Options
            if (this.currentStep === 'Storage' && !this.isWidthXL) {
                nextStepName = 'Options';
            }

            // IMPORTANT FIX (Same as Medication)
            if (this.currentStep === 'Accessories') {
                const requiresTray = (this.selections.accessories || [])
                    .some(acc => acc.requiresTrayPage === true);

                if (requiresTray) {
                    nextStepName = 'Tray';     // show tray
                } else {
                    nextStepName = 'Results';  // skip tray
                }
            }
            
            this.dispatchEvent(new CustomEvent('stepchange', {
                detail: { nextStep: nextStepName }
            }));

            this.jumpToStep(nextStepName);
            
            this.isLoading = false;
        }, 300);
    }

    // UPDATED SKIP LOGIC
    handleBack() {
        let prevStepName = STEPS[this.stepIndex - 1].name;

        if (this.currentStep === 'Options' && !this.isWidthXL) {
            prevStepName = 'Storage';
        }
        //  ADDED (Tray back)
        if (this.currentStep === 'Tray') {
            prevStepName = 'Accessories';
        }
        
        this.dispatchEvent(new CustomEvent('stepchange', {
            detail: { nextStep: prevStepName }
        }));
        
        this.jumpToStep(prevStepName);
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
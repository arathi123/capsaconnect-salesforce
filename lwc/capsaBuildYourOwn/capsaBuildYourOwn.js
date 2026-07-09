import { LightningElement, track, api } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import checkTargetCartProduct from '@salesforce/apex/QuoteGeneratorController.checkTargetCartProduct';

// Step configuration
const STEPS = [
    { name: 'TypeSelection', label: 'Type Selection' },
    { name: 'UseCase', label: 'Use Case' },
    { name: 'Height', label: 'Height' },
    { name: 'Lock', label: 'Lock' },
    { name: 'Color', label: 'Color' },
    { name: 'Storage', label: 'Storage' },
    { name: 'Options', label: 'Options' },
    { name: 'Bridge', label: 'Bridge' },
    { name: 'Accessories', label: 'Accessories' },
    { name: 'Tray', label: 'Tray' },
    { name: 'Results', label: 'Results' }
];

export default class CapsaBuildYourOwn extends LightningElement {
    @api selections
    @api opportunityId;
    @api productType = 'Medical';
    @api quoteId;
    @track stepIndex = 1;
    isLoading = false;
    @track isUnlistedCart = false;

    @api jumpToStep(stepName) {
        console.log('Jumping to step: ', stepName);
        const newIndex = STEPS.findIndex(s => s.name === stepName);
        if (newIndex !== -1) this.stepIndex = newIndex;
    }
    
    @track selections = {
        cartType: { key: '', label: '' },
        height: { key: '', label: '' },
        lock: { key: '', label: '' },
        color: { key: '', label: '' },
        storageTiers: {configCode: '', details: {}, totalTiers: 0},
        options: {
            handle: { optionLabel: '', optionKey: '', displayValue: '' },
            labels: { optionLabel: '', optionKey: '', displayValue: '' },
            surface: { optionLabel: '', optionKey: '', displayValue: '', position: '' }, 
            bridge: { optionLabel: '', optionKey: '', displayValue: '' }
        },
        bridge: {
            bridge: { optionLabel: '', optionKey: '', displayValue: '' },
            tiltBins: [],
            bulkBins: [],
            optionalStorageShelf: { optionLabel: '', optionKey: '' }
        },
        accessories: [],
        package: '',
        isPackage: false,
        tray: { key: '', label: '' }
    };

    get currentStep() { return STEPS[this.stepIndex].name; }
    get isUseCaseStep() { return this.currentStep === 'UseCase'; }
    get isHeightStep() { return this.currentStep === 'Height'; }
    get isLockStep() { return this.currentStep === 'Lock'; }
    get isColorStep() { return this.currentStep === 'Color'; }
    get isStorageStep() { return this.currentStep === 'Storage'; }
    get isOptionsStep() { return this.currentStep === 'Options'; }
    get isBridgeStep() { return this.currentStep === 'Bridge'; }
    get isAccessoryStep() { return this.currentStep === 'Accessories'; }
    get isTrayStep() { return this.currentStep === 'Tray'; }
    get isResultStep() { return this.currentStep === 'Results'; }
    get isPackage() { return this.selections.isPackage; }

    // --- NEW: Dynamic Skip Logic Evaluator ---
    get requiresTrayStep() {
        return this.selections.accessories && this.selections.accessories.some(acc => acc.requiresTrayPage);
    }

    get formattedAccessories() {
        return (this.selections.accessories || []).map((acc, index) => ({
            id: `acc-${index}`,
            label: acc.displayValue,
            quantity: acc.quantity || '',
            optionKey: acc.optionKey,
            position: acc.position || ''
        }));
    }

    get formattedStorageTiers() { return this.selections.storageTiers.details || []; }

    get formattedBins() {
        const bins = [];
        if (this.selections.bridge.tiltBins && this.selections.bridge.tiltBins.length > 0) {
            this.selections.bridge.tiltBins.forEach((bin, index) => {
                bins.push({ id: `tilt-bin-${index}`, label: `${bin.optionLabel} - ${bin.optionKey}`, quantity: bin.quantity || '', optionKey: bin.optionKey });
            });
        }
        if (this.selections.bridge.bulkBins && this.selections.bridge.bulkBins.length > 0) {
            this.selections.bridge.bulkBins.forEach((bin, index) => {
                bins.push({ id: `bulk-bin-${index}`, label: `${bin.optionLabel} - ${bin.optionKey}`, quantity: bin.quantity || '', optionKey: bin.optionKey });
            });
        }
        return bins;
    }

    get formattedStorageShelf() {
        const storageShelf = {};
        if (this.selections.bridge.optionalStorageShelf.optionLabel != 'None' && this.selections.bridge.optionalStorageShelf.optionLabel != '' && this.selections.bridge.optionalStorageShelf.optionKey != 'NONE') {
            storageShelf.optionLabel = this.selections.bridge.optionalStorageShelf.optionLabel + ' - ' + this.selections.bridge.optionalStorageShelf.optionKey;
            storageShelf.optionKey = this.selections.bridge.optionalStorageShelf.optionKey;
        } else {
            storageShelf.optionLabel = 'None';
            storageShelf.optionKey = '';
        }
        return storageShelf;
    }

    get summaryData() {
        return {
            isCustom: true,
            packageSku: this.generateSku(),
            cartType: this.selections.cartType,
            height: this.selections.height,
            lock: this.selections.lock,
            color: this.selections.color,
            storageTiers: this.formattedStorageTiers,
            handle: this.selections.options.handle || '',
            labels: this.selections.options.labels || '',
            pullOutSurface: this.selections.options.surface || { optionLabel: '', optionKey: '', displayValue: '', position: '' },
            bridge: this.selections.bridge.bridge || 'None',
            bins: this.formattedBins,
            optionalStorageShelf: this.formattedStorageShelf,
            accessories: this.formattedAccessories,
            tray: this.selections.tray
        };
    }

    get packageSummaryData() {
        return { packageSku: this.generatePediatricSku(), cartType: this.selections.cartType, packageSelected: this.selections.package };
    }

    generateSku() {
        const cartType = 'AM' + this.selections.height.key + 'MC';
        const color = this.selections.color ? this.selections.color.key : 'ER';
        const lock = this.selections.lock ? this.selections.lock.key : 'N';
        const drawerConfig = 'DR' + (this.selections.storageTiers.configCode || '000');
        return `${cartType}-${color}-${lock}-${drawerConfig}`;
    }

    generatePediatricSku() { return `AM-EM-STD-PED`; }

    handleCartTypeSelection(event) {
        this.selections.cartType = event.detail;
        this.selections.isPackage = (this.selections.cartType && this.selections.cartType.nextStepOverride === 'Accessories');
    }

    handleHeightSelection(event) { this.selections.height = event.detail; }
    handleLockSelection(event) { this.selections.lock = event.detail; }
    handleColorSelection(event) { this.selections.color = event.detail; }
    handleTraySelection(event) { this.selections.tray = event.detail; }

    async handleNextButton(event) {
        const detail = event.detail;

        if (detail && detail.step && detail.payload) {
            switch (detail.step) {
                case 'STORAGE':
                    this.selections.storageTiers = detail.payload || {};
                    break;
                case 'OPTIONS':
                    this.selections.options = {
                        handle: detail.payload.handle || { optionLabel: '', optionKey: '', displayValue: '' },
                        labels: detail.payload.labels || { optionLabel: '', optionKey: '', displayValue: '' },
                        surface: detail.payload.surface || { optionLabel: '', optionKey: '', displayValue: '', position: '' },
                        bridge: detail.payload.bridge || { optionLabel: '', optionKey: '', displayValue: '' }
                    };
                    break;
                case 'BRIDGE':
                    this.selections.bridge = {
                        bridge: detail.payload.bridge || { optionLabel: '', optionKey: '', displayValue: '' },
                        tiltBins: detail.payload.tiltBins || [],
                        bulkBins: detail.payload.bulkBins || [],
                        optionalStorageShelf: detail.payload.optionalStorageShelf || { optionLabel: '', optionKey: '' }
                    };
                    break;
                case 'PACKAGE':
                    this.selections.package = detail.payload || false;
                    break;
                case 'ACCESSORIES':
                    this.selections.accessories = detail.payload.accessories || [];
                    break;
                case 'TRAY':
                    this.selections.tray = detail.payload;
                    break;
                default:
                    break;
            }
        }

        this.isLoading = true;

        try {
            if (detail && detail.step === 'STORAGE') {
                const targetCart = this.generateSku(); 
                const exists = await checkTargetCartProduct({ targetCart });
              if (!exists) {
    
                    this.isUnlistedCart = true;

                    this.showToast(
                        'Configuration Not Found',
                        'This specific configuration is not in our standard catalog. You may proceed, and our team will review this custom request upon quote submission.',
                        'warning'
                    );
                } else {
                    this.isUnlistedCart = false;
                }
            }

            let nextStepName;
            if (detail && detail.goTo) {
                nextStepName = detail.goTo;
            } else {
                nextStepName = STEPS[this.stepIndex + 1].name;
            }

            // --- SKIP LOGIC ENFORCEMENT ---
            if (this.currentStep === 'Accessories' && !this.requiresTrayStep) {
                nextStepName = 'Results'; // Skip Tray if not needed
            }

            this.dispatchEvent(new CustomEvent('stepchange', { detail: { nextStep: nextStepName } }));
            this.jumpToStep(nextStepName);
        } catch (err) {
            console.error('handleNextButton error', err);
            this.showToast('Error', err.body ? err.body.message : (err.message || 'Unknown error'), 'error');
        } finally {
            this.isLoading = false;
        }
    }

    handleBack() {
        let prevStepName = STEPS[this.stepIndex - 1].name;

        // --- SKIP LOGIC ENFORCEMENT (Going Backwards) ---
        if (this.currentStep === 'Results' && !this.requiresTrayStep) {
            prevStepName = 'Accessories';
        }

        this.dispatchEvent(new CustomEvent('stepchange', { detail: { nextStep: prevStepName } }));
        this.jumpToStep(prevStepName);
    }

    handlePathselection(event) {
        const targetStep = event.detail.currentStep;
        const newIndex = STEPS.findIndex(s => s.name === targetStep);
        if (newIndex !== -1) this.stepIndex = newIndex;
    }

    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant, mode: 'pester' }));
    }
}
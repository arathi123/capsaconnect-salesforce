import { LightningElement, api, track } from 'lwc';

const STEPS = [
    { name: 'UseCase', label: 'Use Case' },
    { name: 'Power', label: 'Power' },
    { name: 'Lift', label: 'Lift' },
    { name: 'Monitor', label: 'Monitor' },
    { name: 'KeyboardTray', label: 'Keyboard Tray' },
    { name: 'Storage&Security', label: 'Storage & Security' },
    { name: 'Builder', label: 'Builder' },
    { name: 'AdditionalStorage', label: 'Additional Storage' },
    { name: 'Telehealth', label: 'Telehealth' },
    { name: 'Accessories', label: 'Accessories' },
    { name: 'Warranty', label: 'Warranty' },
    { name: 'Results', label: 'Results' }
];

export default class CapsaCarelinkBuild extends LightningElement {
    @api opportunityId;
    @api productType = 'CareLink';
    @api quoteId;

    @track currentStep = 'UseCase'; 

    @track selections = {
        USE_CASE: [], POWER: [], LIFT: [], MONITOR: [], KEYBOARD: [],
        STORAGE: [], BUILDER_SLOTS: [], ADDITIONAL_STORAGE: [],
        TELEHEALTH: [], ACCESSORIES: [], WARRANTY: [],
        previewImage: '', layeredPreview: null 
    };

    @api jumpToStep(stepName) {
        this.currentStep = stepName;
        const targetIdx = STEPS.findIndex(s => s.name === stepName);
        
        if (targetIdx !== -1) {
            if (targetIdx < STEPS.findIndex(s => s.name === 'Power')) this.selections.POWER = [];
            if (targetIdx < STEPS.findIndex(s => s.name === 'Lift')) this.selections.LIFT = [];
            if (targetIdx < STEPS.findIndex(s => s.name === 'Monitor')) this.selections.MONITOR = [];
            if (targetIdx < STEPS.findIndex(s => s.name === 'KeyboardTray')) this.selections.KEYBOARD = [];
            if (targetIdx < STEPS.findIndex(s => s.name === 'Storage&Security')) this.selections.STORAGE = [];
            if (targetIdx < STEPS.findIndex(s => s.name === 'Builder')) {
                this.selections.BUILDER_SLOTS = []; 
                this.selections.layeredPreview = null; 
            }
            if (targetIdx < STEPS.findIndex(s => s.name === 'AdditionalStorage')) this.selections.ADDITIONAL_STORAGE = [];
            if (targetIdx < STEPS.findIndex(s => s.name === 'Telehealth')) this.selections.TELEHEALTH = [];
            if (targetIdx < STEPS.findIndex(s => s.name === 'Accessories')) this.selections.ACCESSORIES = [];
            if (targetIdx < STEPS.findIndex(s => s.name === 'Warranty')) this.selections.WARRANTY = [];
        }
    }

    // --- STEP GETTERS ---
    get isUseCase() { return this.currentStep === 'UseCase'; }
    get isPower() { return this.currentStep === 'Power'; }
    get isLift() { return this.currentStep === 'Lift'; }
    get isMonitor() { return this.currentStep === 'Monitor'; }
    get isKeyboard() { return this.currentStep === 'KeyboardTray'; }
    get isStorageAndSecurity() { return this.currentStep === 'Storage&Security'; }
    get isBuilder() { return this.currentStep === 'Builder'; }
    get isAdditionalStorage() { return this.currentStep === 'AdditionalStorage'; }
    get isTelehealth() { return this.currentStep === 'Telehealth'; }
    get isAccessories() { return this.currentStep === 'Accessories'; }
    get isWarranty() { return this.currentStep === 'Warranty'; }
    get isResults() { return this.currentStep === 'Results'; }

    get isStandardBinSystem() {
        return this.selections.STORAGE && this.selections.STORAGE.some(s => s.key === 'Standard');
    }

    get isMaxBinSystem() {
        return this.selections.STORAGE && this.selections.STORAGE.some(s => s.key === 'MaxBin');
    }

    // --- EVENT HANDLERS ---
    handleStepComplete(event) {
        const incomingData = event.detail;
        for (let key in incomingData) {
            this.selections[key] = incomingData[key];
        }

        const currentIndex = STEPS.findIndex(s => s.name === this.currentStep);
        let nextStepName = incomingData.overrideNext || (currentIndex < STEPS.length - 1 ? STEPS[currentIndex + 1].name : 'Results');

        this.currentStep = nextStepName;
        
        this.dispatchEvent(new CustomEvent('stepchange', {
            detail: { nextStep: nextStepName }
        }));
    }

    handleResetFlow() {
        this.currentStep = 'UseCase';
        this.selections = {
            USE_CASE: [], POWER: [], LIFT: [], MONITOR: [], KEYBOARD: [],
            STORAGE: [], BUILDER_SLOTS: [], ADDITIONAL_STORAGE: [],
            TELEHEALTH: [], ACCESSORIES: [], WARRANTY: [],
            previewImage: '', layeredPreview: null 
        };
        this.dispatchEvent(new CustomEvent('stepchange', { detail: { nextStep: 'UseCase' } }));
    }
}
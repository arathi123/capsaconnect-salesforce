import { LightningElement, api, track } from 'lwc';

const STEPS = [
    { name: 'UseCase', label: 'Use Case' },
    { name: 'Power', label: 'Power' },
    { name: 'Lift', label: 'Lift' },
    { name: 'Monitor', label: 'Monitor' },
    { name: 'KeyboardTray', label: 'Keyboard Tray' },
    { name: 'Casters', label: 'Casters' },
    { name: 'Storage&Security', label: 'Storage & Security' },
    { name: 'Builder', label: 'Builder' },
    { name: 'TeleAccessories', label: 'Tele. Accessories' },
    { name: 'Accessories', label: 'Accessories' },
    { name: 'Warranty', label: 'Warranty' },
    { name: 'Results', label: 'Results' }
];

export default class CapsaM38eBuild extends LightningElement {
    @api opportunityId;
    @api productType;
    @api quoteId;

    @track currentStep = 'UseCase'; 

    // THE CLEAN STATE TRACKER: Everything is an Array
    @track selections = {
        USE_CASE: [],
        POWER: [],
        LIFT: [],
        MONITOR: [],
        KEYBOARD: [],
        CASTERS: [],
        STORAGE: [],
        BUILDER_SLOTS: [],
        TELE_ACCESSORIES: [],
        ACCESSORIES: [],
        WARRANTY: [],
        previewImage: '' 
    };

    @api jumpToStep(stepName) {
        this.currentStep = stepName;
        
        const targetIdx = STEPS.findIndex(s => s.name === stepName);
        
        if (targetIdx !== -1) {
            // Clear arrays downstream of the jump
            if (targetIdx < STEPS.findIndex(s => s.name === 'Power')) this.selections.POWER = [];
            if (targetIdx < STEPS.findIndex(s => s.name === 'Lift')) this.selections.LIFT = [];
            if (targetIdx < STEPS.findIndex(s => s.name === 'Monitor')) this.selections.MONITOR = [];
            if (targetIdx < STEPS.findIndex(s => s.name === 'KeyboardTray')) this.selections.KEYBOARD = [];
            if (targetIdx < STEPS.findIndex(s => s.name === 'Casters')) this.selections.CASTERS = [];
            if (targetIdx < STEPS.findIndex(s => s.name === 'Storage&Security')) this.selections.STORAGE = [];
            
            if (targetIdx < STEPS.findIndex(s => s.name === 'Builder')) {
                this.selections.BUILDER_SLOTS = []; 
                this.selections.layeredPreview = null; 
            }
            if (targetIdx < STEPS.findIndex(s => s.name === 'TeleAccessories')) this.selections.TELE_ACCESSORIES = [];
            if (targetIdx < STEPS.findIndex(s => s.name === 'Accessories')) this.selections.ACCESSORIES = [];
            if (targetIdx < STEPS.findIndex(s => s.name === 'Warranty')) this.selections.WARRANTY = [];
        }
    }

    // Step Getters 
    get isUseCase() { return this.currentStep === 'UseCase'; }
    get isPower() { return this.currentStep === 'Power'; }
    get isLift() { return this.currentStep === 'Lift'; }
    get isMonitor() { return this.currentStep === 'Monitor'; }
    get isKeyboard() { return this.currentStep === 'KeyboardTray'; }
    get isCasters() { return this.currentStep === 'Casters'; }
    get isStorageAndSecurity() { return this.currentStep === 'Storage&Security'; }
    get isBuilder() { return this.currentStep === 'Builder'; }
    get isTeleAccessories() { return this.currentStep === 'TeleAccessories'; }
    get isAccessories() { return this.currentStep === 'Accessories'; }
    get isWarranty() { return this.currentStep === 'Warranty'; }
    get isResults() { return this.currentStep === 'Results'; }

    // ==========================================
    // THE MASTER STEP HANDLER
    // ==========================================
    handleStepComplete(event) {
        const incomingData = event.detail;
        for (let key in incomingData) {
            this.selections[key] = incomingData[key];
        }

        console.log('=== ENGINE STATE ===');
        console.log(this.selections);

        const currentIndex = STEPS.findIndex(s => s.name === this.currentStep);
        let override = incomingData.overrideNext;
        let nextStepName = 'Results'; 

        // Extract the selected Use Case key from the unified array (Safely)
        const useCaseKey = this.selections.USE_CASE.length > 0 ? this.selections.USE_CASE[0].key : '';

        // Dynamic Telepresence Interceptor
        if (override === 'Accessories' && useCaseKey === 'Telepresence') {
            override = 'TeleAccessories';
        }

        // Standard Routing Logic
        if (override) {
            nextStepName = override; 
        } else if (currentIndex !== -1 && currentIndex < STEPS.length - 1) {
            nextStepName = STEPS[currentIndex + 1].name;
            
            // Skip Logic
            if (nextStepName === 'TeleAccessories' && useCaseKey !== 'Telepresence') {
                nextStepName = 'Accessories';
            }
        }

        this.currentStep = nextStepName;
        
        this.dispatchEvent(new CustomEvent('stepchange', {
            detail: { nextStep: nextStepName }
        }));
    }
}
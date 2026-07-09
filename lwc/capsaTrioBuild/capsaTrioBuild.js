import { LightningElement, api, track } from 'lwc';

const STEPS = [
    { name: 'UseCase', label: 'Use Case' },
    { name: 'Power', label: 'Power' },
    { name: 'Lift', label: 'Lift' },
    { name: 'Monitor', label: 'Monitor' },
    { name: 'KeyboardTray', label: 'Keyboard Tray' },
    { name: 'Storage&Security', label: 'Storage & Security' },
    { name: 'Builder', label: 'Builder' },
    { name: 'AdditionalStorage', label: 'Additional Storage' }, // <-- Missing
    { name: 'TeleAccessories', label: 'Tele Accessories' },
    { name: 'Accessories', label: 'Accessories' },
    { name: 'Warranty', label: 'Warranty' },
    { name: 'Results', label: 'Results' }
];

export default class CapsaTrioBuild extends LightningElement {

    @api opportunityId;
    @api productType;
    @api quoteId;

    @track currentStep = 'UseCase';

   @track selections = {
        USE_CASE: [],
        POWER: [],
        LIFT: [],
        MONITOR: [],
        KEYBOARD_TRAY: [],
    //  CASTERS: [],
        STORAGE: [],
        BUILDER: [],
        ADDITIONAL_STORAGE: [],
        TELE_ACCESSORIES: [],
        ACCESSORIES: [],
        WARRANTY: [],
        previewImage: ''
    };

    @api
    jumpToStep(stepName) {

        this.currentStep = stepName;

        const targetIdx =
            STEPS.findIndex(
                s => s.name === stepName
            );

        if (targetIdx !== -1) {

            if (targetIdx < STEPS.findIndex(s => s.name === 'Power')) {
                this.selections.POWER = [];
            }

            if (targetIdx < STEPS.findIndex(s => s.name === 'Lift')) {
                this.selections.LIFT = [];
            }

            if (targetIdx < STEPS.findIndex(s => s.name === 'Casters')) {
                this.selections.CASTERS = [];
            }
            
            if (targetIdx < STEPS.findIndex(s => s.name === 'Monitor')) {
                this.selections.MONITOR = [];
            }

            if (targetIdx < STEPS.findIndex(s => s.name === 'KeyboardTray')) {
                this.selections.KEYBOARD_TRAY = [];
            }

            if (targetIdx < STEPS.findIndex(s => s.name === 'TeleAccessories')) {
                this.selections.TELE_ACCESSORIES = [];
            }

            if (targetIdx < STEPS.findIndex(s => s.name === 'Storage&Security')) {
                this.selections.STORAGE = [];
            }

            if (targetIdx < STEPS.findIndex(s => s.name === 'Builder')) {
                this.selections.BUILDER = [];
            }
            if (targetIdx < STEPS.findIndex(s => s.name === 'AdditionalStorage')) {
                this.selections.ADDITIONAL_STORAGE = [];
            }
            if (targetIdx < STEPS.findIndex(s => s.name === 'TeleAccessories')) {
                this.selections.TELE_ACCESSORIES = [];
            }

            if (targetIdx < STEPS.findIndex(s => s.name === 'Accessories')) {
                this.selections.ACCESSORIES = [];
            }

            if (targetIdx < STEPS.findIndex(s => s.name === 'Warranty')) {
                this.selections.WARRANTY = [];
            }
        }
    }

    get isUseCase() {
        return this.currentStep === 'UseCase';
    }

    get isPower() {
        return this.currentStep === 'Power';
    }

    get isLift() {
        return this.currentStep === 'Lift';
    }

    get isCasters() {
        return this.currentStep === 'Casters';
    }

    get isMonitor() {
        return this.currentStep === 'Monitor';
    }

    get isKeyboardTray() {
        return this.currentStep === 'KeyboardTray';
    }

    get isTeleAccessories() {
        return this.currentStep === 'TeleAccessories';
    }

    get isStorageAndSecurity() {
        return this.currentStep === 'Storage&Security';
    }

    get isBuilder() {
        return this.currentStep === 'Builder';
    }
    
    get isAdditionalStorage() {
        return this.currentStep === 'AdditionalStorage';
    }

    get isAccessories() {
        return this.currentStep === 'Accessories';
    }

    get isWarranty() {
        return this.currentStep === 'Warranty';
    }

    get isResults() {
        return this.currentStep === 'Results';
    }

    handleStepComplete(event) {

        const incomingData =
            event.detail;

        for (let key in incomingData) {

            this.selections[key] =
                incomingData[key];
        }

        console.log(
            'TRIO ENGINE STATE',
            JSON.stringify(this.selections)
        );

        const currentIndex =
            STEPS.findIndex(
                s => s.name === this.currentStep
            );

        let nextStepName = 'Results';

        if (this.currentStep === 'Storage&Security') {

            const storage = this.selections.STORAGE || [];

            const selectedBin =
                storage.length
                    ? storage[storage.length - 1].key
                    : '';

            if (selectedBin === 'DOC_CART') {

                // Skip Builder completely
                nextStepName = 'TeleAccessories';

            } else {

                nextStepName = 'Builder';
            }

        }
        else if (this.currentStep === 'Builder') {

            const storage = this.selections.STORAGE || [];

            const selectedBin =
                storage.length
                    ? storage[storage.length - 1].key
                    : '';

            // RX modules go to Additional Storage
            if (
                selectedBin === 'RX_LOCK' ||
                selectedBin === 'RX_NON_LOCK' ||
                selectedBin === 'RX_XP_LOCK'
            ) {

                nextStepName = 'AdditionalStorage';

            } else {

                nextStepName = 'TeleAccessories';

            }

        }

        else if (this.currentStep === 'AdditionalStorage') {

            nextStepName = 'TeleAccessories';

        }
        else if (
            currentIndex !== -1 &&
            currentIndex < STEPS.length - 1
        ) {

            nextStepName = STEPS[currentIndex + 1].name;

        }

        this.currentStep =
            nextStepName;

        this.dispatchEvent(
            new CustomEvent(
                'stepchange',
                {
                    detail: {
                        nextStep: nextStepName
                    }
                }
            )
        );
    }
}
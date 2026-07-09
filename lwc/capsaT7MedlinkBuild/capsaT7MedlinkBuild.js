import { LightningElement, api, track } from 'lwc';

const STEPS = [
    { name: 'UseCase', label: 'Use Case' },
    { name: 'Power', label: 'Power' },
    { name: 'PowerInputCable', label: 'Power Input Cable' },
    { name: 'BatteryType', label: 'Battery Type' },
    { name: 'PowerTrack', label: 'Power Track' },
    { name: 'GantryMonitorArmType', label: 'Gantry & Monitor Arm Type' },
    { name: 'HeadAssemblyType', label: 'Head Assembly Type' },
    { name: 'MedicationDrawers', label: 'Medication Drawers' },
    // { name: 'T7MedLinkStorage', label: 'Storage' },
    { name: 'Accessories', label: 'Accessories' },
    { name: 'Result', label: 'Result' }
];

export default class CapsaT7MedlinkBuild extends LightningElement {
    @api opportunityId;
    @api productType;
    @api quoteId;

    @track currentStep = 'UseCase';

    @track selections = {
        USE_CASE: [],
        POWER: [],
        PowerInputCable: [],
        BatteryType: [],
        PowerTrack: [],
        GantryMonitorArmType: [],
        HeadAssemblyType: [],
        MedicationDrawers: [],
        MedlinkDrawerKits: [],
        T7MedLinkStorage: { configCode: '', details: [], totalTiers: 0 },
        ACCESSORIES: [],
        Result: null
    };

    @api jumpToStep(stepName) {
        this.currentStep = stepName;

        const targetIdx = STEPS.findIndex(s => s.name === stepName);

        if (targetIdx !== -1) {
            if (targetIdx < STEPS.findIndex(s => s.name === 'Power'))
                this.selections.POWER = [];

            if (targetIdx < STEPS.findIndex(s => s.name === 'PowerInputCable'))
                this.selections.PowerInputCable = [];

            if (targetIdx < STEPS.findIndex(s => s.name === 'BatteryType'))
                this.selections.BatteryType = [];

            if (targetIdx < STEPS.findIndex(s => s.name === 'PowerTrack'))
                this.selections.PowerTrack = [];

            if (targetIdx < STEPS.findIndex(s => s.name === 'GantryMonitorArmType'))
                this.selections.GantryMonitorArmType = [];

            if (targetIdx < STEPS.findIndex(s => s.name === 'HeadAssemblyType'))
                this.selections.HeadAssemblyType = [];

            if (targetIdx < STEPS.findIndex(s => s.name === 'MedicationDrawers')) {
                this.selections.MedicationDrawers = [];
                this.selections.MedlinkDrawerKits = [];
            }

            // if (targetIdx < STEPS.findIndex(s => s.name === 'T7MedLinkStorage'))
            //     this.selections.T7MedLinkStorage = { configCode: '', details: [], totalTiers: 0 };

            if (targetIdx < STEPS.findIndex(s => s.name === 'Accessories'))
                this.selections.ACCESSORIES = [];

            if (targetIdx < STEPS.findIndex(s => s.name === 'Result'))
                this.selections.Result = null;
        }
    }

    get isUseCase() { return this.currentStep === 'UseCase'; }
    get isPower() { return this.currentStep === 'Power'; }
    get isPowerInputCable() { return this.currentStep === 'PowerInputCable'; }
    get isBatteryType() { return this.currentStep === 'BatteryType'; }
    get isPowerTrack() { return this.currentStep === 'PowerTrack'; }
    get isGantryMonitorArmType() { return this.currentStep === 'GantryMonitorArmType'; }
    get isHeadAssemblyType() { return this.currentStep === 'HeadAssemblyType'; }
    get isMedicationDrawers() { return this.currentStep === 'MedicationDrawers'; }
   // get isT7MedLinkStorage() { return this.currentStep === 'T7MedLinkStorage'; }
    get isAccessories() { return this.currentStep === 'Accessories'; }
    get isResult() { return this.currentStep === 'Result'; }

    get summaryData() {
        const toItems = (arr) => (arr || []).filter(i => i && i.key);
        const accData = this.selections.ACCESSORIES;
        const accessories = Array.isArray(accData) ? [] : (accData?.accessories || []);
        const accessoryNone = Array.isArray(accData) ? false : (accData?.accessoryNone || false);

        return {
            useCases:        toItems(this.selections.USE_CASE),
            power:           toItems(this.selections.POWER),
            powerInputCable: toItems(this.selections.PowerInputCable),
            batteryType:     toItems(this.selections.BatteryType),
            powerTrack:      toItems(this.selections.PowerTrack),
            gantry:          toItems(this.selections.GantryMonitorArmType),
            headAssembly:    toItems(this.selections.HeadAssemblyType),
            medDrawers:      toItems(this.selections.MedicationDrawers),
            drawerKits:      toItems(this.selections.MedlinkDrawerKits),
            accessories,
            accessoryNone
        };
    }

    handleStepComplete(event) {
        const incomingData = event.detail;

        for (let key in incomingData) {
            this.selections[key] = incomingData[key];
        }

        console.log('=== ENGINE STATE ===');
        console.log(this.selections);

        const currentIndex = STEPS.findIndex(s => s.name === this.currentStep);

        let override = incomingData.overrideNext;
        let nextStepName = 'Result';

        if (override) {
            nextStepName = override;
        } else if (currentIndex !== -1 && currentIndex < STEPS.length - 1) {
            nextStepName = STEPS[currentIndex + 1].name;
        }

        this.currentStep = nextStepName;

        this.dispatchEvent(new CustomEvent('stepchange', {
            detail: { nextStep: nextStepName }
        }));
    }
}
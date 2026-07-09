import { LightningElement, api, track } from 'lwc';

const STEPS = [
    { name: 'CartTypeComputing', label: 'Cart Type and Computing Interface' },
    { name: 'PowerCordOption',   label: 'Power Cord Option' },
    { name: 'WarrantyService',   label: 'Warranty & Service Options' },
    { name: 'Accessories',       label: 'Accessories' },
    { name: 'Result',            label: 'Result' }
];

export default class CapsaNonPoweredM40Build extends LightningElement {
    @api opportunityId;
    @api productType;
    @api quoteId;

    @track currentStep = 'CartTypeComputing';

    @track selections = {
        CartTypeComputing: [],
        PowerCordOption:   [],
        WarrantyService:   [],
        ACCESSORIES:       [],
        Result:            null
    };

    @api jumpToStep(stepName) {
        this.currentStep = stepName;
        const targetIdx = STEPS.findIndex(s => s.name === stepName);

        if (targetIdx !== -1) {
            if (targetIdx < STEPS.findIndex(s => s.name === 'PowerCordOption'))
                this.selections.PowerCordOption = [];
            if (targetIdx < STEPS.findIndex(s => s.name === 'WarrantyService'))
                this.selections.WarrantyService = [];
            if (targetIdx < STEPS.findIndex(s => s.name === 'Accessories'))
                this.selections.ACCESSORIES = [];
            if (targetIdx < STEPS.findIndex(s => s.name === 'Result'))
                this.selections.Result = null;
        }
    }

    get isCartTypeComputing() { return this.currentStep === 'CartTypeComputing'; }
    get isPowerCordOption()   { return this.currentStep === 'PowerCordOption'; }
    get isWarrantyService()   { return this.currentStep === 'WarrantyService'; }
    get isAccessories()       { return this.currentStep === 'Accessories'; }
    get isResult()            { return this.currentStep === 'Result'; }

    get summaryData() {
        const accData = this.selections.ACCESSORIES;
        const accessories = Array.isArray(accData) ? [] : (accData?.accessories || []);
        const accessoryNone = Array.isArray(accData) ? false : (accData?.accessoryNone || false);

        return {
            cartTypeComputing: (this.selections.CartTypeComputing || []),
            powerCordOption:   (this.selections.PowerCordOption || []),
            warrantyService:   (this.selections.WarrantyService || []),
            accessories,
            accessoryNone
        };
    }

    handleStepComplete(event) {
        const incomingData = event.detail;

        for (let key in incomingData) {
            this.selections[key] = incomingData[key];
        }

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
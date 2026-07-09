import { LightningElement, api, track } from 'lwc';

const STEPS = [
    { name: 'KLRobot',         label: 'KL Robot' },
    { name: 'Warranty',        label: 'Warranty' },
    { name: 'RobotsService',   label: 'Service' },
    { name: 'RobotsAccessory', label: 'Accessory' },
    { name: 'RobotsResult',    label: 'Result' }
];

// Steps in this list are skipped during forward navigation and hidden from the path bar,
// without removing the underlying component/step logic.
const HIDDEN_STEPS = ['RobotsService'];

export default class CapsaRobotsBuild extends LightningElement {
    @api opportunityId;
    @api productType;
    @api quoteId;

    @track currentStep = 'KLRobot';

    @track selections = {
        KLRobot:         [],
        Warranty:        [],
        RobotsService:   [],
        ACCESSORIES:     [],
        RobotsResult:    null
    };

    @api jumpToStep(stepName) {
        this.currentStep = stepName;
        const targetIdx = STEPS.findIndex(s => s.name === stepName);

        if (targetIdx !== -1) {
            if (targetIdx < STEPS.findIndex(s => s.name === 'Warranty'))
                this.selections.Warranty = [];
            if (targetIdx < STEPS.findIndex(s => s.name === 'RobotsService'))
                this.selections.RobotsService = [];
            if (targetIdx < STEPS.findIndex(s => s.name === 'RobotsAccessory'))
                this.selections.ACCESSORIES = [];
            if (targetIdx < STEPS.findIndex(s => s.name === 'RobotsResult'))
                this.selections.RobotsResult = null;
        }
    }

    get isKLRobot()         { return this.currentStep === 'KLRobot'; }
    get isWarranty()        { return this.currentStep === 'Warranty'; }
    get isRobotsService()   { return this.currentStep === 'RobotsService'; }
    get isRobotsAccessory() { return this.currentStep === 'RobotsAccessory'; }
    get isRobotsResult()    { return this.currentStep === 'RobotsResult'; }

    get summaryData() {
        const accData = this.selections.ACCESSORIES;
        const accessories = Array.isArray(accData) ? [] : (accData?.accessories || []);
        const accessoryNone = Array.isArray(accData) ? false : (accData?.accessoryNone || false);

        return {
            klRobot:       (this.selections.KLRobot || []),
            warranty:      (this.selections.Warranty || []),
            service:       (this.selections.RobotsService || []),
            accessories,
            accessoryNone
        };
    }

    handleStepComplete(event) {
        const incomingData = event.detail;

        for (let key in incomingData) {
            this.selections[key] = incomingData[key];
        }

        console.log('=== ROBOTS ENGINE STATE ===');
        console.log(JSON.stringify(this.selections));

        const currentIndex = STEPS.findIndex(s => s.name === this.currentStep);
        let override = incomingData.overrideNext;
        let nextStepName = 'RobotsResult';

        if (override) {
            nextStepName = override;
        } else if (currentIndex !== -1 && currentIndex < STEPS.length - 1) {
            let nextIndex = currentIndex + 1;
            while (nextIndex < STEPS.length - 1 && HIDDEN_STEPS.includes(STEPS[nextIndex].name)) {
                nextIndex++;
            }
            nextStepName = STEPS[nextIndex].name;
        }

        this.currentStep = nextStepName;

        this.dispatchEvent(new CustomEvent('stepchange', {
            detail: { nextStep: nextStepName }
        }));
    }
}
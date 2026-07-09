import { LightningElement, track, api } from 'lwc';

const STEPS = [
    { name: 'TypeSelection', label: 'Type Selection' },
    { name: 'TableTopUnit',  label: 'Table Top Unit' },
    { name: 'Warranty',      label: 'Warranty' },
    { name: 'Service',       label: 'Service' },
    { name: 'Result',        label: 'Result' }
];

// Steps in this list are skipped during forward navigation and hidden from the path bar,
// without removing the underlying component/step logic.
const HIDDEN_STEPS = ['Service'];

export default class CapsaPAUIBuild extends LightningElement {
    @api opportunityId;
    @api productType = 'PA';
    @api quoteId;
    @track stepIndex = 1;
    isLoading = false;

    @track selections = {
        tableTopUnit: { key: '', label: '' },
        warranty:     { key: '', label: '' },
        service:      { key: '', label: '' }
    };

    get currentStep()    { return STEPS[this.stepIndex].name; }
    get isTableTopUnit() { return this.currentStep === 'TableTopUnit'; }
    get isWarranty()     { return this.currentStep === 'Warranty'; }
    get isService()      { return this.currentStep === 'Service'; }
    get isResult()       { return this.currentStep === 'Result'; }

    @api jumpToStep(stepName) {
        const idx = STEPS.findIndex(s => s.name === stepName);
        if (idx !== -1) this.stepIndex = idx;
    }

    handleTableTopSelected(event) {
        this.selections.tableTopUnit = event.detail;
    }

    handleWarrantySelected(event) {
        this.selections.warranty = event.detail;
    }

    handleServiceSelected(event) {
        this.selections.service = event.detail;
    }

    handleNextButton(event) {
        this.isLoading = true;

        if (event && event.detail) {
            if (event.detail.step === 'TABLETOPUNIT') {
                this.selections.tableTopUnit = event.detail.payload;
            } else if (event.detail.step === 'WARRANTY') {
                this.selections.warranty = event.detail.payload;
            } else if (event.detail.step === 'SERVICE') {
                this.selections.service = event.detail.payload;
            }
        }

        setTimeout(() => {
            let nextIndex = this.stepIndex + 1;
            while (nextIndex < STEPS.length && HIDDEN_STEPS.includes(STEPS[nextIndex].name)) {
                nextIndex++;
            }
            if (nextIndex < STEPS.length) {
                const nextStepName = STEPS[nextIndex].name;
                this.dispatchEvent(new CustomEvent('stepchange', { detail: { nextStep: nextStepName } }));
                this.jumpToStep(nextStepName);
            } else {
                this.dispatchEvent(new CustomEvent('resetflow'));
            }
            this.isLoading = false;
        }, 300);
    }
}
import { LightningElement, api, track, wire } from 'lwc';
import { CurrentPageReference } from 'lightning/navigation';

export default class CapsaNonPoweredM40UI extends LightningElement {

    @api opportunityId;
    productType = 'NonPoweredM40';

    quoteId;

    @track visitedSteps = ['TypeSelection'];

    currentStep = 'TypeSelection';

    showLandingPage = true;
    showBuildYourOwn = false;

    @wire(CurrentPageReference)
    getStateParameters(currentPageReference) {
        if (currentPageReference) {
            this.quoteId = currentPageReference.state?.c__quoteid;
            this.opportunityId = currentPageReference.state?.c__oppid;
        }
    }

    get allowedSteps() {
        return [...this.visitedSteps, this.currentStep];
    }

    handleBuildClick() {
        this.showLandingPage = false;
        this.showBuildYourOwn = true;
        this.currentStep = 'CartTypeComputing';
    }

    handleStepChange(event) {
        const next = event.detail.nextStep;
        if (!this.visitedSteps.includes(this.currentStep)) {
            this.visitedSteps = [...this.visitedSteps, this.currentStep];
        }
        this.currentStep = next;
    }

    handlePathSelection(event) {
        const target = event.detail.currentStep;
        const idx = this.visitedSteps.indexOf(target);

        if (idx !== -1) {
            this.visitedSteps = this.visitedSteps.slice(0, idx + 1);
        }

        this.currentStep = target;

        if (target === 'TypeSelection') {
            this.showLandingPage = true;
            this.showBuildYourOwn = false;
            this.visitedSteps = ['TypeSelection'];
        } else {
            const engine = this.template.querySelector('c-capsa-non-powered-m40-build');
            if (engine) {
                engine.jumpToStep(target);
            }
        }
    }

    handleResetFlow() {
        this.dispatchEvent(new CustomEvent('resetflow'));

        this.showLandingPage = true;
        this.showBuildYourOwn = false;
        this.currentStep = 'TypeSelection';
        this.visitedSteps = ['TypeSelection'];
    }
}
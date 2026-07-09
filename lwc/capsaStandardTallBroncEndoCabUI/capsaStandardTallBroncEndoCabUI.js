import { LightningElement, api, track } from 'lwc';

export default class CapsaStandardTallBroncEndoCabUI extends LightningElement {

    @api opportunityId;
    @api productType = 'Standard Tall Bronc Endo Cab';

    @track visitedSteps = ['TypeSelection'];
    currentStep = 'TypeSelection';

    showLandingPage = true;
    showBuildYourOwn = false;
    isLoading = false;

    get allowedSteps() {
        return [...this.visitedSteps, this.currentStep];
    }

    handleBuildClick() {

        this.isLoading = true;
        this.showLandingPage = false;
        this.showBuildYourOwn = true;

        // IMPORTANT
        this.currentStep = 'UseCase';

        if (!this.visitedSteps.includes('TypeSelection')) {
            this.visitedSteps.push('TypeSelection');
        }

        setTimeout(() => {
            this.isLoading = false;
        }, 800);
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

            const engine = this.template.querySelector(
                'c-capsa-standard-tall-bronc-endo-cab-build'
            );

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
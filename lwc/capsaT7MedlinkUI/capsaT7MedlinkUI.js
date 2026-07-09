import { LightningElement, api, track, wire } from 'lwc';
import { CurrentPageReference } from 'lightning/navigation';

export default class CapsaT7MedlinkUI extends LightningElement {

    @api opportunityId;
    @api productType = 'T7MedLink';

    quoteId;

    @track visitedSteps = ['TypeSelection'];

    currentStep = 'TypeSelection';

    showLandingPage = true;
    showBuildYourOwn = false;
    isLoading = false;

    @wire(CurrentPageReference)
    getStateParameters(currentPageReference) {

        if (currentPageReference) {

            this.quoteId =
                currentPageReference.state?.c__quoteid;

            this.opportunityId =
                currentPageReference.state?.c__oppid;
        }
    }

    hiddenSteps = ['T7MedLinkStorage', 'MedlinkDrawerKits'];

    get allowedSteps() {
        return [...this.visitedSteps, this.currentStep];
    }

    handleBuildClick() {
        this.startFlow();
    }

    startFlow() {

        this.showLandingPage = false;

        this.showBuildYourOwn = true;

        this.currentStep = 'UseCase';
    }

    handleStepChange(event) {

        const next =
            event.detail.nextStep;

        if (!this.visitedSteps.includes(this.currentStep)) {

            this.visitedSteps = [
                ...this.visitedSteps,
                this.currentStep
            ];
        }

        this.currentStep = next;
    }

    handlePathSelection(event) {

        const target =
            event.detail.currentStep;

        const idx =
            this.visitedSteps.indexOf(target);

        if (idx !== -1) {

            this.visitedSteps =
                this.visitedSteps.slice(
                    0,
                    idx + 1
                );
        }

        this.currentStep = target;

        if (target === 'TypeSelection') {

            this.showLandingPage = true;
            this.showBuildYourOwn = false;
            this.visitedSteps = ['TypeSelection'];

        } else {

            const engine =
                this.template.querySelector(
                    'c-capsa-t7-medlink-build'
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
import { LightningElement, api, track, wire } from 'lwc';
import { CurrentPageReference } from 'lightning/navigation';

export default class CapsaAdditionalCSAccessoriesUI extends LightningElement {

    @api opportunityId;
    quoteId;

    @api productType = 'ADDITIONAL CS ACCESSORIES';

    @track visitedSteps = ['TypeSelection'];

    currentStep = 'TypeSelection';

    isLoading = false;

    showLandingPage = true;

    showBuildYourOwn = false;

    @wire(CurrentPageReference)
    getStateParameters(currentPageReference) {

        if (currentPageReference) {

            this.quoteId =
                currentPageReference.state?.c__quoteid;

            this.opportunityId =
                currentPageReference.state?.c__oppid;

            // RESET FLOW
            this.currentStep =
                'TypeSelection';

            this.visitedSteps =
                ['TypeSelection'];

            this.showLandingPage = true;

            this.showBuildYourOwn = false;
        }
    }

    get allowedSteps() {

        return [

            ...this.visitedSteps,

            this.currentStep
        ];
    }

    handleBuildClick() {

        this.isLoading = true;

        this.showLandingPage = false;

        this.showBuildYourOwn = true;

        this.currentStep = 'Parts';

        this.visitedSteps = [
            'TypeSelection',
            'Parts'
        ];

        setTimeout(() => {

            this.isLoading = false;

        }, 800);
    }

    handleStepChange(event) {

        const next =
            event.detail.nextStep;

        if (
            next &&
            !this.visitedSteps.includes(next)
        ) {

            this.visitedSteps = [

                ...this.visitedSteps,

                next
            ];
        }

        this.currentStep = next;
    }

    handlePathSelection(event) {

        const target =
            event.detail.currentStep;

        if (target === 'TypeSelection') {

            this.showLandingPage = true;

            this.showBuildYourOwn = false;

            this.currentStep =
                'TypeSelection';

            this.visitedSteps =
                ['TypeSelection'];

            return;
        }

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

        const engine =
            this.template.querySelector(
                'c-capsa-additional-c-s-accessories-build'
            );

        if (engine) {

            engine.jumpToStep(target);
        }
    }

    handleResetFlow() {

        this.dispatchEvent(

            new CustomEvent(
                'resetflow'
            )
        );

        this.showLandingPage = true;

        this.showBuildYourOwn = false;

        this.currentStep = 'TypeSelection';

        this.visitedSteps = ['TypeSelection'];
    }
}
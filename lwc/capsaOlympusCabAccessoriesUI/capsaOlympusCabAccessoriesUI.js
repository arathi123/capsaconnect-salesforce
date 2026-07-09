import { LightningElement, api, track ,wire} from 'lwc';
import { CurrentPageReference } from 'lightning/navigation';

export default class CapsaOlympusCabAccessoriesUI extends LightningElement {

    @api opportunityId;
    quoteId;

    @api productType = 'Olympus Cab_Accessories';


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
            this.currentStep = 'TypeSelection';

            this.visitedSteps = [
                'TypeSelection'
            ];

            this.showLandingPage = true;

            this.showBuildYourOwn = false;

            console.log(
                'Flow Reset Complete'
            );
        }
    }

    get allowedSteps() {

        return [

            ...this.visitedSteps,

            this.currentStep
        ];
    }


    handleBuildClick() {

        console.log('START CONFIG CLICKED');

        this.isLoading = true;

        this.showLandingPage = false;

        this.showBuildYourOwn = true;

        this.currentStep = 'CabinetLine';

        this.visitedSteps = [
            'TypeSelection',
            'CabinetLine'
        ];

        setTimeout(() => {

            this.isLoading = false;

        }, 800);
    }

    handleStepChange(event) {

        const next =
            event.detail.nextStep;

        console.log(
            'NEXT STEP => ',
            next
        );

        if (
            !this.visitedSteps.includes(
                this.currentStep
            )
        ) {

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

        console.log(
            'PATH CLICK => ',
            target
        );

        // BACK TO LANDING
        if (
            target === 'TypeSelection'
        ) {

            this.showLandingPage = true;

            this.showBuildYourOwn = false;

            this.currentStep =
                'TypeSelection';

            this.visitedSteps =
                ['TypeSelection'];

            return;
        }

        // NORMAL STEP NAVIGATION

        const idx =
            this.visitedSteps.indexOf(
                target
            );

        if (idx !== -1) {

            this.visitedSteps =
                this.visitedSteps.slice(
                    0,
                    idx + 1
                );
        }

        this.currentStep = target;

        // UPDATE CHILD INTERNAL STEP

        const engine =
            this.template.querySelector(
                'c-capsa-olympus-cab-accessories-build'
            );

        if (engine) {

            engine.jumpToStep(target);
        }
    }


    handleResetFlow() {

        console.log(
            'RESET FLOW'
        );

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
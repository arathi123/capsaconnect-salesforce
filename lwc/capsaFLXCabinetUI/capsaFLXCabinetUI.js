import { LightningElement, api, track, wire } from 'lwc';

import { CurrentPageReference }
from 'lightning/navigation';

// import getPreconfiguredCarts
// from '@salesforce/apex/CartConfiguratorController.getPreconfiguredCarts';

export default class CapsaFLXCabinetUI extends LightningElement {

    @api opportunityId;

    @api productType = 'FLX Cabinet';

    quoteId;
    @track packageConfigs = null;

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

        this.startFlow('BYO');
    }


    startFlow(type) {

        this.isLoading = true;

        this.showLandingPage = false;

        this.showBuildYourOwn =
            (type === 'BYO');


        if (this.showBuildYourOwn) {

            this.currentStep = 'Shell';

            this.visitedSteps = [

                'TypeSelection',

                'Shell'
            ];
        }

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
            next &&
            !this.visitedSteps.includes(next)
        ) {

            this.visitedSteps = [

                ...this.visitedSteps,

                next
            ];
        }


        this.currentStep = next;

        console.log(
            'VISITED STEPS => ',
            JSON.stringify(this.visitedSteps)
        );
    }


    handlePathSelection(event) {

        const target =
            event.detail.currentStep;

        console.log(
            'PATH CLICK => ',
            target
        );


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

        this.showLandingPage = false;

        this.showBuildYourOwn = true;

        const engine =
            this.template.querySelector(
                'c-capsa-f-l-x-cabinet-build'
            );

        if (engine) {

            engine.jumpToStep(target);
        }

        console.log(
            'UPDATED VISITED => ',
            JSON.stringify(this.visitedSteps)
        );
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

        this.visitedSteps =
            ['TypeSelection'];
    }
}
import { LightningElement, track, api } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

import checkTargetCartProduct
from '@salesforce/apex/QuoteGeneratorController.checkTargetCartProduct';

const STEPS = [

    { name: 'TypeSelection', label: 'Type Selection' },
    { name: 'WallCabinet', label: 'Wall Cabinet' },
    { name: 'Results', label: 'Results' }

];

export default class CapsaSmallEndoWallCabBuild extends LightningElement {

    @api opportunityId;
    @api quoteId;
    @api productType = 'Small Endo Wall Cab';
    @track stepIndex = 1;
    isLoading = false;
    @track isUnlistedCart = false;

    @track selections = {

        wallCabinet: {}

    };

    get currentStep() {

        return STEPS[this.stepIndex].name;
    }

    get isWallCabinetStep() {

        return this.currentStep === 'WallCabinet';
    }

    get isResultStep() {

        return this.currentStep === 'Results';
    }


    @api
    jumpToStep(stepName) {

        const index =
            STEPS.findIndex(
                s => s.name === stepName
            );

        if (index !== -1) {

            this.stepIndex = index;
        }
    }

    generateSku() {

        return this.selections.wallCabinet?.key || '';
    }

    handleNextButton(event) {

        this.isLoading = true;

        if (event && event.detail) {

            if (
                event.detail.step ===
                'WallCabinet'
            ) {

                this.selections.wallCabinet =
                    event.detail.payload;
            }
        }
    setTimeout(() => {

        const nextStepName =
            STEPS[this.stepIndex + 1]?.name;

        // PRODUCT VALIDATION
        if (this.currentStep === 'WallCabinet') {

            const targetCart =
                this.generateSku();

            console.log(
                'Checking Small Endo Product => ',
                targetCart
            );

            checkTargetCartProduct({
                targetCart: targetCart
            })
            .then(result => {

                this.isUnlistedCart =
                    !result;

                console.log(
                    'Product Found => ',
                    result
                );

                if (!result) {

                    this.showToast(
                        'Configuration Not Found',
                        'This specific configuration is not in our standard catalog. You may proceed and our team will review this request.',
                        'warning'
                    );
                }

                this.dispatchEvent(
                    new CustomEvent(
                        'stepchange',
                        {
                            detail: {
                                nextStep: nextStepName
                            }
                        }
                    )
                );

                if (nextStepName) {
                    this.jumpToStep(nextStepName);
                }

                this.isLoading = false;
            })
            .catch(error => {

                console.error(
                    'Validation Error => ',
                    error
                );

                this.isLoading = false;
            });

            return;
        }

        this.dispatchEvent(
            new CustomEvent(
                'stepchange',
                {
                    detail: {
                        nextStep: nextStepName
                    }
                }
            )
        );

        if (nextStepName) {

            this.jumpToStep(nextStepName);
        }

        this.isLoading = false;

    }, 300);
    }
    get summaryData() {

        return {

            selections: this.selections
        };
    }

    showToast(title, message, variant) {

        this.dispatchEvent(
            new ShowToastEvent({
                title,
                message,
                variant
            })
        );
    }
}
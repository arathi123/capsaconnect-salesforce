import { LightningElement, track, api } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

import checkTargetCartProduct
from '@salesforce/apex/QuoteGeneratorController.checkTargetCartProduct';

const STEPS = [

    { name: 'TypeSelection', label: 'Type Selection' },
    { name: 'Parts', label: 'Parts' },
    { name: 'Results', label: 'Results' }

];

export default class CapsaAdditionalCSAccessoriesBuild extends LightningElement {

    @api opportunityId;
    @api quoteId;
    @api productType = 'ADDITIONAL CS ACCESSORIES';

    @track stepIndex = 1;

    isLoading = false;
    @track isUnlistedCart = false;


    @track selections = {

        parts: {}

    };

    get currentStep() {

        return STEPS[this.stepIndex].name;
    }

    get isPartsStep() {

        return this.currentStep === 'Parts';
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

        return this.selections.parts?.key || '';
    }

    handleNextButton(event) {

        this.isLoading = true;

        console.log(
            'STEP EVENT => ',
            JSON.stringify(event.detail)
        );


        if (event && event.detail) {

            if (
                event.detail.step ===
                'Parts'
            ) {

                console.log(
                    'PART SELECTED => ',
                    JSON.stringify(event.detail.payload)
                );

                this.selections.parts =
                    event.detail.payload;
            }
        }

        console.log(
            'UPDATED SELECTIONS => ',
            JSON.stringify(this.selections)
        );

    setTimeout(() => {

        const nextStepName =
            STEPS[this.stepIndex + 1]?.name;

        console.log(
            'NEXT STEP => ',
            nextStepName
        );

        // PRODUCT VALIDATION
        if (this.currentStep === 'Parts') {

            const targetCart =
                this.generateSku();

            console.log(
                'Checking Additional CS Accessory Product => ',
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

                    this.jumpToStep(
                        nextStepName
                    );
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

        console.log(
            'SUMMARY DATA => ',
            JSON.stringify(this.selections)
        );

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
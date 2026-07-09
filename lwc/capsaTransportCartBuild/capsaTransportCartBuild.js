import { LightningElement, track, api } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

import checkTargetCartProduct
from '@salesforce/apex/QuoteGeneratorController.checkTargetCartProduct';

const STEPS = [

    { name: 'TypeSelection', label: 'Type Selection' },
    { name: 'UseCase', label: 'Type of Cart' },
    { name: 'Accessories', label: 'Accessories' },
    { name: 'Results', label: 'Results' }

];

export default class CapsaTransportCartBuild extends LightningElement {

    @api opportunityId;
    @api quoteId;

    @api productType = 'Transport Cart';

    @track stepIndex = 1;
    @track isUnlistedCart = false;

    isLoading = false;


    @track selections = {

        useCase: {},
        accessories: []

    };


    get currentStep() {

        return STEPS[this.stepIndex].name;
    }

    get isUseCaseStep() {

        return this.currentStep === 'UseCase';
    }

    get isAccessoryStep() {

        return this.currentStep === 'Accessories';
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

        return this.selections.useCase?.key || '';
    }

    handleNextButton(event) {

        this.isLoading = true;

        console.log(
            'STEP EVENT => ',
            JSON.stringify(event.detail)
        );


        if (event && event.detail) {

            // USE CASE

            if (event.detail.step === 'CARTTYPE') {

                this.selections.useCase =
                    event.detail.payload;
            }

            // ACCESSORIES

            else if (event.detail.step === 'ACCESSORIES') {

                this.selections.accessories =
                    event.detail.payload.accessories || [];
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
        if (this.currentStep === 'Accessories') {

            const targetCart =
                this.generateSku();

            console.log(
                'Checking Transport Cart Product => ',
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
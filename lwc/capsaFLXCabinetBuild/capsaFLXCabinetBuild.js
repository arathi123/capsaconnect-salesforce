import { LightningElement, api, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

import checkTargetCartProducts
from '@salesforce/apex/QuoteGeneratorController.checkTargetCartProducts';

const STEPS = [

    { name: 'TypeSelection', label: 'Type Selection' },
    { name: 'Shell', label: 'Shell' },
    { name: 'Base', label: 'Base' },
    { name: 'Top', label: 'Top' },
    { name: 'Lock', label: 'Lock' },
    { name: 'Divider', label: 'Divider' },
    { name: 'ACCESSORIES', label: 'Accessories' },
    { name: 'Results', label: 'Results' }

];

export default class CapsaFLXCabinetBuild extends LightningElement {

    @api opportunityId;
    @api quoteId;
    @track isUnlistedCart = false;

    @api productType = 'FLX Cabinet';

    @track currentStep = 'Shell';

    @track selections = {

        Shell: {},
        Base: {},
        Top: {},
        Lock: {},
        Divider: {},
        accessories: []

    };

    @api
    jumpToStep(stepName) {

        this.currentStep = stepName;
    }

    get isShell() {

        return this.currentStep === 'Shell';
    }

    get isBase() {

        return this.currentStep === 'Base';
    }

    get isTop() {

        return this.currentStep === 'Top';
    }

    get isLock() {

        return this.currentStep === 'Lock';
    }

    get isDivider() {

        return this.currentStep === 'Divider';
    }

    get isAccessories() {

        return this.currentStep === 'ACCESSORIES';
    }

    get isResults() {

        return this.currentStep === 'Results';
    }

    getAllProductCodes() {

        let codes = [];

        if (this.selections.Shell?.key) {

            codes.push(this.selections.Shell.key);
        }

        if (this.selections.Base?.key) {

            codes.push(this.selections.Base.key);
        }

        if (this.selections.Top?.key) {

            codes.push(this.selections.Top.key);
        }

        if (this.selections.Lock?.key) {

            codes.push(this.selections.Lock.key);
        }

        if (this.selections.LOCK?.key) {

            codes.push(this.selections.LOCK.key);
        }

        if (this.selections.Divider?.key) {

            codes.push(this.selections.Divider.key);
        }

        if (this.selections.accessories) {

            this.selections.accessories.forEach(acc => {

                if (acc.optionKey) {

                    codes.push(acc.optionKey);
                }
            });
        }

        return codes;
    }

    handleNext(event) {

        const step =
            event.detail.step;

        const payload =
            event.detail.payload;

        if (
            step === 'ACCESSORIES'
        ) {

            this.selections.accessories =
                payload.accessories || [];
        }

        else {

            this.selections[step] =
                payload;
        }

        const currentIndex =
            STEPS.findIndex(
                s => s.name === this.currentStep
            );

        const nextStep =
            STEPS[currentIndex + 1]?.name;

        if (this.currentStep === 'ACCESSORIES') {

            const productCodes =
            this.getAllProductCodes();

            console.log(
                'Checking FLX Products => ',
                JSON.stringify(productCodes)
            );

            checkTargetCartProducts({
                productCodes: productCodes
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

                if (nextStep) {

                    this.currentStep =
                        nextStep;

                    this.dispatchEvent(
                        new CustomEvent(
                            'stepchange',
                            {
                                detail: {
                                    nextStep: nextStep
                                }
                            }
                        )
                    );
                }
            })

            .catch(error => {

                console.error(
                    'Validation Error => ',
                    error
                );
            });

            return;
        }

        if (nextStep) {

            this.currentStep =
                nextStep;

            this.dispatchEvent(
                new CustomEvent(
                    'stepchange',
                    {
                        detail: {
                            nextStep: nextStep
                        }
                    }
                )
            );
        }
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
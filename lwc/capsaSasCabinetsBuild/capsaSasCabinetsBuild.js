import { LightningElement, track, api } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

import checkTargetCartProduct
from '@salesforce/apex/QuoteGeneratorController.checkTargetCartProduct';

const STEPS = [

    { name: 'TypeSelection', label: 'Type Selection' },
    { name: 'CabinetLine', label: 'Cabinet Line' },
    { name: 'JHooks', label: 'J Hooks' },
    { name: 'Material', label: 'Material' },
    { name: 'DoorKeyType', label: 'Door & Key Type' },
    { name: 'Top', label: 'Top' },
    { name: 'Accessories', label: 'Accessories' },
    { name: 'Option', label: 'Option' },
    { name: 'Results', label: 'Results' }

];

export default class CapsaSasCabinetsBuild extends LightningElement {

    @api opportunityId;
    @api quoteId;
    @api selections;

    @api productType = 'SAS Cabinets';

    @track stepIndex = 1;

    isLoading = false;

    @track isUnlistedCart = false;

    @track selections = {

        typeSelection: {},
        cabinetLine: {},
        jHooks: {},
        material: {},
        doorKeyType: {},
        top: {},
        accessories: [],
        option: {}

    };

    get currentStep() {

        return STEPS[this.stepIndex].name;
    }

    get isTypeSelectionStep() {
        return this.currentStep === 'TypeSelection';
    }

    get isCabinetLineStep() {
        return this.currentStep === 'CabinetLine';
    }

    get isJHooksStep() {
        return this.currentStep === 'JHooks';
    }

    get isMaterialStep() {
        return this.currentStep === 'Material';
    }

    get isDoorKeyTypeStep() {
        return this.currentStep === 'DoorKeyType';
    }

    get isTopStep() {
        return this.currentStep === 'Top';
    }

    get isAccessoryStep() {
        return this.currentStep === 'Accessories';
    }

    get isOptionStep() {
        return this.currentStep === 'Option';
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

        const cabinetLine =
            this.selections.cabinetLine?.key || '';

        const jHooks =
            this.selections.jHooks?.key || '';

        const material =
            this.selections.material?.key || '';

        const doorKeyType =
            this.selections.doorKeyType?.key || '';

        const top =
            this.selections.top?.key || '';

       let sku = '';

        if (cabinetLine === 'SAS') {

            sku =
                `${cabinetLine}-${jHooks}${material}-${doorKeyType}`;

        } else if (
            cabinetLine === 'SAS-B' ||
            cabinetLine === 'SAS-BO'
        ) {

            sku =
                `${cabinetLine}${jHooks}${material}-${doorKeyType}`;

        } else if (
            cabinetLine === 'SAS-DRY'
        ) {

            sku =
                `SAS-${jHooks}${material}-DRY`;

        } else {

            sku =
                `${cabinetLine}${jHooks}${material}-${doorKeyType}`;
        }

        return sku;
    }

    handleNextButton(event) {

        this.isLoading = true;

        console.log(
            'STEP EVENT => ',
            JSON.stringify(event.detail)
        );

        if (event && event.detail) {

            // TYPE SELECTION
            if (event.detail.step === 'TypeSelection') {

                this.selections.typeSelection =
                    event.detail.payload;
            }

            // CABINET LINE
            else if (event.detail.step === 'CabinetLine') {

                this.selections.cabinetLine =
                    event.detail.payload;
            }

            // J HOOKS
            else if (event.detail.step === 'JHooks') {

                this.selections.jHooks =
                    event.detail.payload;
            }

            // MATERIAL
            else if (event.detail.step === 'Material') {

                this.selections.material =
                    event.detail.payload;
            }

            // DOOR KEY TYPE
            else if (event.detail.step === 'DoorKeyType') {

                this.selections.doorKeyType =
                    event.detail.payload;
            }

            // TOP
            else if (event.detail.step === 'Top') {

                this.selections.top =
                    event.detail.payload;
            }

            // ACCESSORIES
            else if (event.detail.step === 'ACCESSORIES') {

                this.selections.accessories =
                    event.detail.payload.accessories || [];
            }

            // OPTION
            else if (event.detail.step === 'Option') {

                this.selections.option =
                    event.detail.payload;
            }
        }

        console.log(
            'UPDATED SELECTIONS => ',
            JSON.stringify(this.selections)
        );

        setTimeout(() => {

            let nextStepName =
                STEPS[this.stepIndex + 1]?.name;

            console.log(
                'NEXT STEP => ',
                nextStepName
            );

                // Skip TOP for Roll Up Door
            if (
                this.currentStep === 'DoorKeyType' &&
                this.selections.doorKeyType?.key === 'RU'
            ) {
                nextStepName = 'Accessories';
            }

            // PRODUCT VALIDATION
            if (this.currentStep === 'Option') {

                const targetCart =
                    this.generateSku();

                console.log(
                    'Checking Product => ',
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
                            'This cabinet will be created as Unlisted Cabinet.',
                            'warning'
                        );
                    }
                })
                .catch(error => {

                    console.error(
                        'Validation Error => ',
                        error
                    );
                });
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

            packageSku: this.generateSku(),

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
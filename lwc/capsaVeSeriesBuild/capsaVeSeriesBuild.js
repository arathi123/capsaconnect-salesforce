import { LightningElement, track, api } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import checkTargetCartProduct
from '@salesforce/apex/QuoteGeneratorController.checkTargetCartProduct';

const STEPS = [
    { name: 'TypeSelection', label: 'Type Selection' },
    { name: 'UseCase', label: 'Type of Cart' },
    { name: 'Width', label: 'Width' },
    { name: 'ExtraStorageType', label: 'Extra Storage Type' },
    { name: 'Height', label: 'Height' },
    { name: 'Lock', label: 'Lock' },
    { name: 'Panel Color', label: 'Panel Color' },
    { name: 'Storage', label: 'Storage' },
    { name: 'ExtendedStorage', label: 'Extended Storage' },
    { name: 'Accessories', label: 'Accessories' },
 //   { name: 'Accessory Kit', label: 'Accessory Kit' },
    { name: 'Results', label: 'Results' }
];

export default class CapsaVeSeriesBuild extends LightningElement {

    @api opportunityId;
    @api productType = 'VE-Series';
    @api quoteId; 
    @track isUnlistedCart = false;

    @track stepIndex = 1;

    isLoading = false;

    connectedCallback() {

    console.log(
        'VE STEP INDEX =>',
        this.stepIndex
    );

    console.log(
        'VE CURRENT STEP =>',
        this.currentStep
    );

    console.log(
        'VE IS USE CASE =>',
        this.isUseCaseStep
    );
}

    @track selections = {
        cartType: {},
        width: {},
        height: {},
        lock: {},
        color: {},
        storage: {},
        extraStorageType: {},
        extendedStorage: {},
        accessories: []
        // stockCarts: {}
        // accessoryKit: {}
    };


    get currentStep() {

        return STEPS[this.stepIndex].name;
    }


    get isUseCaseStep() {

        return this.currentStep === 'UseCase';
    }

    get isWidthStep() {

        return this.currentStep === 'Width';
    }

    get isHeightStep() {

        return this.currentStep === 'Height';
    }

    get isLockStep() {

        return this.currentStep === 'Lock';
    }

    get isColorStep() {

        return this.currentStep === 'Panel Color';
    }

    get isStorageStep() {

        return this.currentStep === 'Storage';
    }

    get isExtraStorageTypeStep() {

        return this.currentStep === 'ExtraStorageType';
    }

    get isExtendedStorageStep() {

        return this.currentStep === 'ExtendedStorage';
    }

    get isAccessoryStep() {

        return this.currentStep === 'Accessories';
    }

    // get isStockStep() {

    //     return this.currentStep === 'Stock Carts';
    // }

    // get isKitStep() {

    //     return this.currentStep === 'Accessory Kit';
    // }

    get isResultStep() {

        return this.currentStep === 'Results';
    }

    @api
    jumpToStep(stepName) {

        const newIndex =
            STEPS.findIndex(
                s => s.name === stepName
            );

        if (newIndex !== -1) {

            this.stepIndex = newIndex;
        }
    }

    generateSku() {

        const type =
            this.selections.cartType?.key || '';

        const w =
            this.selections.width?.key || '';

        const h =
            this.selections.height?.key || '';

        const l =
            this.selections.lock?.key || '';

        const c =
            this.selections.color?.key || '';

        const storage =
            this.selections.storage?.configCode ||
            this.selections.storage?.key ||
            '000';

        const extendedStorage =
            this.selections.extendedStorage?.configCode ||
            this.selections.extendedStorage?.key ||
            '';

        const extraStorageType =
            this.selections.extraStorageType?.label ||
            '';

        let sku =
            `VE${w}${type}-${l}-${c}-D${storage}`;

        // EXTENDED STORAGE
        if (extendedStorage) {

            sku += `-U${extendedStorage}`;
        }

        // EXTRA STORAGE TYPE
        if (extraStorageType) {

            sku += `-${extraStorageType}`;
        }

        console.log(
            'Generated VE-Series SKU => ',
            sku
        );

        return sku;
    }


    handleCartTypeSelection(event) {

        this.selections.cartType = event.detail;
    }

    handleWidthSelection(event) {

        this.selections.width = event.detail;
    }

    handleHeightSelection(event) {

        this.selections.height = event.detail;
    }

    handleLockSelection(event) {

        this.selections.lock = event.detail;
    }

    handleColorSelection(event) {

        this.selections.color = event.detail;
    }

    handleStorageSelection(event) {

        this.selections.storage = event.detail;
    }

    handleExtraStorageTypeSelection(event) {

        this.selections.extraStorageType =
            event.detail;

        console.log(
            'Extra Storage Type => ',
            JSON.stringify(this.selections.extraStorageType)
        );
    }

    handleExtendedStorageSelection(event) {

        this.selections.extendedStorage =
            event.detail;

        console.log(
            'Extended Storage => ',
            JSON.stringify(this.selections.extendedStorage)
        );
    }


    handleNextButton(event) {

        console.log('===== NEXT BUTTON =====');

        console.log(
            'Current Step Before Next => ',
            this.currentStep
        );

        console.log(
            'Current Step Index => ',
            this.stepIndex
        );

        console.log(
            'Event Detail => ',
            JSON.stringify(event.detail)
        );

        this.isLoading = true;

        if (event && event.detail) {

            // STORAGE
            if (
                event.detail.step === 'STORAGE'
                && this.currentStep === 'Storage'
            ) {

                this.selections.storage =
                    event.detail.payload || {};

                console.log(
                    'Storage Saved => ',
                    JSON.stringify(this.selections.storage)
                );
            }

            // EXTENDED STORAGE
            if (
                event.detail.step === 'STORAGE'
                && this.currentStep === 'ExtendedStorage'
            ) {

                this.selections.extendedStorage =
                    event.detail.payload || {};

                console.log(
                    'Extended Storage Saved => ',
                    JSON.stringify(this.selections.extendedStorage)
                );
            }

            // EXTRA STORAGE TYPE
            if (
                event.detail.step === 'EXTRA STORAGE TYPE'
            ) {

                this.selections.extraStorageType =
                    event.detail.payload || {};

                console.log(
                    'Extra Storage Type Saved => ',
                    JSON.stringify(this.selections.extraStorageType)
                );
            }

            // ACCESSORIES
            if (event.detail.step === 'ACCESSORIES') {

                this.selections.accessories =
                    event.detail.payload?.accessories || [];

                console.log(
                    'Accessories Saved => ',
                    JSON.stringify(this.selections.accessories)
                );
            }

            // STOCK CARTS
            // if (event.detail.step === 'STOCK CARTS') {

            //     this.selections.stockCarts =
            //         event.detail.payload || {};

            //     console.log(
            //         'Stock Cart Saved => ',
            //         JSON.stringify(this.selections.stockCarts)
            //     );
            // }

            // ACCESSORY KIT
            // if (event.detail.step === 'ACCESSORY KIT') {

            //     this.selections.accessoryKit =
            //         event.detail.payload || {};

            //     console.log(
            //         'Accessory Kit Saved => ',
            //         JSON.stringify(this.selections.accessoryKit)
            //     );
            // }
        }

        setTimeout(() => {

            // LAST STEP SAFETY
            if (this.stepIndex >= STEPS.length - 1) {

                this.isLoading = false;
                return;
            }

            let nextStepName =
                STEPS[this.stepIndex + 1].name;

        // WIDTH
        if (this.currentStep === 'Width') {

            const selectedWidth =
                this.selections.width?.key;

            if (
                selectedWidth === '5'
                || selectedWidth === '6'
            ) {

                nextStepName =
                    'ExtraStorageType';

            } else {

                this.selections.extraStorageType = {};

                nextStepName =
                    'Height';
            }
        }

        if (
            this.currentStep === 'ExtraStorageType'
        ) {

            nextStepName =
                'Height';
        }

        if (
            this.currentStep === 'Storage'
        ) {

            const targetCart =
                this.generateSku();

            console.log(
                'VE Storage SKU =>',
                targetCart
            );

            if (
                this.selections.extraStorageType?.key
            ) {

                nextStepName =
                    'ExtendedStorage';

            } else {

                checkTargetCartProduct({
                    targetCart: targetCart
                })
                .then(result => {

                    this.isUnlistedCart =
                        !result;

                    if (!result) {

                        this.showToast(
                            'Configuration Not Found',
                            'This specific configuration is not in our standard catalog. You may proceed, and our team will review this custom request upon quote submission.',
                            'warning'
                        );
                    }
                });

                nextStepName =
                    'Accessories';
            }
        }

        // EXTENDED STORAGE
        if (
            this.currentStep === 'ExtendedStorage'
        ) {

            const targetCart =
                this.generateSku();

            console.log(
                'VE Extended SKU =>',
                targetCart
            );

            checkTargetCartProduct({
                targetCart: targetCart
            })
            .then(result => {

                this.isUnlistedCart =
                    !result;

                if (!result) {

                    this.showToast(
                        'Configuration Not Found',
                        'This specific configuration is not in our standard catalog. You may proceed, and our team will review this custom request upon quote submission.',
                        'warning'
                    );
                }
            });

            nextStepName =
                'Accessories';
        }

            console.log(
                'Next Step Name => ',
                nextStepName
            );

            // SEND TO PARENT
            this.dispatchEvent(
                new CustomEvent('stepchange', {
                    detail: {
                        nextStep: nextStepName
                    }
                })
            );

            // LOCAL STEP CHANGE
            this.jumpToStep(nextStepName);

            console.log(
                'Current Step After Next => ',
                this.currentStep
            );

            this.isLoading = false;

        }, 300);
    }


    get summaryData() {

        console.log(
            'Summary Data => ',
            JSON.stringify(this.selections)
        );

        return {

            packageSku: this.generateSku(),

            selections: this.selections,

            accessories:
                (this.selections.accessories || []).map(
                    (acc, index) => ({
                        id: `acc-${index}`,
                        label: acc.displayValue,
                        quantity: acc.quantity || '',
                        optionKey: acc.optionKey
                    })
                )
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
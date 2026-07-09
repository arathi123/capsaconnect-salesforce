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
    { name: 'Handle Color', label: 'Handle Color' },
    { name: 'Storage', label: 'Storage' },
    { name: 'ExtendedStorage', label: 'Extended Storage' },
    { name: 'Accessories', label: 'Accessories' },
   // { name: 'Accessory Kit', label: 'Accessory Kit' },
    { name: 'Results', label: 'Results' }
];
export default class CapsaMseriesBuild extends LightningElement {

    @api opportunityId;
    @api productType = 'M-Series';
    @api quoteId;
    @track stepIndex = 1;
    isLoading = false;
    @track isUnlistedCart = false;

    @track selections = {
        cartType: {},
        width: {},
        height: {},
        lock: {},
        color: {},
        storage: {},
        extraStorageType: {},
        extendedStorage: {},
        accessories: [],
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
        return this.currentStep === 'Handle Color';
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

        let sku =
            `M${w}${type}-${l}-${c}-D${storage}`;

        // ADD EXTENDED STORAGE
        if (extendedStorage) {

            sku += `-U${extendedStorage}`;
        }

        console.log('Generated SKU => ', sku);

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

        console.log(
            'Storage Selected => ',
            JSON.stringify(this.selections.storage)
        );
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

        this.isLoading = true;

        if (event && event.detail) {

            // STORAGE
            if (event.detail.step === 'STORAGE'
                && this.currentStep === 'Storage') {

                this.selections.storage =
                    event.detail.payload || {};

                console.log(
                    'Storage Saved => ',
                    JSON.stringify(this.selections.storage)
                );
            }

            // EXTENDED STORAGE
            if (event.detail.step === 'STORAGE'
                && this.currentStep === 'ExtendedStorage') {

                this.selections.extendedStorage =
                    event.detail.payload || {};

                console.log(
                    'Extended Storage Saved => ',
                    JSON.stringify(this.selections.extendedStorage)
                );
            }

            // EXTRA STORAGE TYPE
            if (event.detail.step === 'EXTRA STORAGE TYPE') {

                this.selections.extraStorageType =
                    event.detail.payload || {};
            }

            // ACCESSORIES
            if (event.detail.step === 'ACCESSORIES') {

                this.selections.accessories =
                    event.detail.payload?.accessories || [];
            }

            // ACCESSORY KIT
            // if (event.detail.step === 'ACCESSORY KIT') {

            //     this.selections.accessoryKit =
            //         event.detail.payload || {};
            // }
        }

        setTimeout(() => {

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
                    selectedWidth === '5' ||
                    selectedWidth === '6'
                ) {
                    nextStepName = 'ExtraStorageType';
                } else {
                    nextStepName = 'Height';
                }
            }

            // EXTRA STORAGE TYPE
            if (this.currentStep === 'ExtraStorageType') {
                nextStepName = 'Height';
            }

                        // STORAGE
            if (this.currentStep === 'Storage') {

                const targetCart = this.generateSku();

                console.log('M-Series Storage SKU =>', targetCart);

                if (!this.selections.extraStorageType?.key) {

                    checkTargetCartProduct({
                        targetCart: targetCart
                    })
                    .then(result => {

                        this.isUnlistedCart = !result;

                        if (!result) {

                            this.showToast(
                                'Configuration Not Found',
                                'This specific configuration is not in our standard catalog. You may proceed, and our team will review this custom request upon quote submission.',
                                'warning'
                            );
                        }
                    })
                    .catch(error => {
                        console.error(error);
                    });

                    nextStepName = 'Accessories';

                } else {

                    nextStepName = 'ExtendedStorage';
                }
            }

            if (this.currentStep === 'ExtendedStorage') {

                const targetCart = this.generateSku();

                console.log(
                    'M-Series Extended SKU =>',
                    targetCart
                );

                checkTargetCartProduct({
                    targetCart: targetCart
                })
                .then(result => {

                    this.isUnlistedCart = !result;

                    if (!result) {

                        this.showToast(
                            'Configuration Not Found',
                            'This specific configuration is not in our standard catalog. You may proceed, and our team will review this custom request upon quote submission.',
                            'warning'
                        );
                    }
                })
                .catch(error => {
                    console.error(error);
                });

                nextStepName = 'Accessories';
            }

            this.dispatchEvent(
                new CustomEvent('stepchange', {
                    detail: {
                        nextStep: nextStepName
                    }
                })
            );

            this.jumpToStep(nextStepName);

            this.isLoading = false;

        }, 300);
    }

    get summaryData() {

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

    // =========================
    // TOAST
    // =========================

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
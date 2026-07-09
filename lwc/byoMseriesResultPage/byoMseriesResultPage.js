import { LightningElement, api, track } from 'lwc';

import { NavigationMixin } from 'lightning/navigation';

import { ShowToastEvent }
from 'lightning/platformShowToastEvent';

import createQuote
from '@salesforce/apex/QuoteGeneratorController.createQuoteFromConfiguration';

import updateExistingQuote
from '@salesforce/apex/QuoteGeneratorController.updateExistingQuote';

export default class ByoMseriesResultPage extends NavigationMixin(LightningElement) {

    @api opportunityId;

    // NEW
    @api quoteId;

    @api summaryData = {};

    @track isLoading = false;

    @api isUnlistedCart;

    connectedCallback() {

        console.log(
            'M-Series Result Page Loaded'
        );

        console.log(
            'Summary Data => ',
            JSON.stringify(this.summaryData)
        );

        console.log(
            'Quote Id => ',
            this.quoteId
        );

        if (this.isUnlistedCart) {

            this.showToast(
                'Configuration Not Found',
                'This cart will be created as Unlisted Cart.',
                'warning'
            );
        }
    }

    get isReconfigureMode() {

        console.log(
            ' Checking Reconfigure Mode'
        );

        console.log(
            ' quoteId =>',
            this.quoteId
        );

        console.log(
            'Boolean Result =>',
            !!this.quoteId
        );

        return !!this.quoteId;
    }

    get selections() {

        return this.summaryData?.selections || {};
    }

    get hasAccessories() {

        return this.selections.accessories
            && this.selections.accessories.length > 0;
    }

    get hasAccessoryKit() {

        return this.selections.accessoryKit
            && Array.isArray(this.selections.accessoryKit)
            && this.selections.accessoryKit.length > 0;
    }

    get hasStorage() {

        return this.selections.storage
            && Object.keys(this.selections.storage).length > 0;
    }

    get packageSku() {

        if (
            this.selections?.cartType?.key &&
            !this.selections?.width?.key &&
            !this.selections?.height?.key
        ) {

            console.log(
                ' PACKAGE FLOW SKU'
            );

            return this.selections.cartType.key;
        }

        const t =
            this.selections.cartType?.key || '';

        const w =
            this.selections.width?.key || '';

        const l =
            this.selections.lock?.key || '';

        const c =
            this.selections.color?.key || '';

        const storage =
            this.selections.storage?.configCode
            || this.selections.storage?.key
            || '000';

        const extendedStorage =
            this.selections.extendedStorage?.configCode
            || this.selections.extendedStorage?.key
            || '';

        const extraStorageType =
            this.selections.extraStorageType?.key
            || '';

        let sku =
            `M${w}${t}-${l}-${c}-D${storage}`;

        if (extendedStorage) {

            sku =
                `${sku}-U${extendedStorage}`;
        }

        if (extraStorageType) {

            sku =
                `${sku}-${extraStorageType}`;
        }

        console.log(
            ' BYO SKU => ',
            sku
        );

        return sku;
    }

    get storageDetails() {

        return this.selections.storage?.details || [];
    }

    get storageCode() {

        return this.selections.storage?.configCode || '';
    }

    generateProductData() {

        let items = [];

        const processItems = (
            rawCode,
            multiplier = 1,
            pos = ''
        ) => {

            if (
                !rawCode ||
                rawCode === 'NONE' ||
                rawCode === 'None' ||
                rawCode === ''
            ) {
                return;
            }

            const codes =
                String(rawCode).split(',');

            codes.forEach(code => {

                const trimmedCode =
                    code.trim();

                if (trimmedCode) {

                    let existingItem =
                        items.find(
                            i =>
                                i.code === trimmedCode
                                && i.position === pos
                        );

                    if (existingItem) {

                        existingItem.qty +=
                            parseInt(multiplier) || 1;

                    } else {

                        items.push({

                            code: trimmedCode,

                            qty:
                                parseInt(multiplier) || 1,

                            position: pos
                        });
                    }
                }
            });
        };

        processItems(
            this.packageSku,
            1,
            ''
        );

        if (
            this.selections.storage?.configCode
        ) {

            processItems(
                `D${this.selections.storage.configCode}`,
                1,
                ''
            );
        }

        if (this.selections.accessories) {

            this.selections.accessories.forEach(
                acc => {

                    processItems(
                        acc.optionKey,
                        acc.quantity || 1,
                        acc.position || ''
                    );
                }
            );
        }

        if (
            this.selections.accessoryKit &&
            Array.isArray(
                this.selections.accessoryKit
            )
        ) {

            this.selections.accessoryKit.forEach(
                kit => {

                    processItems(
                        kit.key,
                        1,
                        ''
                    );
                }
            );
        }

        console.log(
            'M-Series Payload => ',
            JSON.stringify(items)
        );

        return JSON.stringify(items);
    }

    handleQuoteRequest() {

        this.isLoading = true;

        const configJson =
            this.generateProductData();

        createQuote({

            configJson: configJson,

            opportunityId:
                this.opportunityId,

            cartSKU:
                this.packageSku
        })

        .then(quoteId => {

            this.isLoading = false;

            this.showToast(
                'Success',
                'Quote created successfully.',
                'success'
            );

            this[NavigationMixin.Navigate]({

                type: 'standard__recordPage',

                attributes: {
                    recordId: quoteId,
                    objectApiName: 'Quote',
                    actionName: 'view'
                }
            });
        })

        .catch(error => {

            this.isLoading = false;

            this.showToast(
                'Error',
                error.body?.message
                    || 'Something went wrong',
                'error'
            );
        });
    }

    handleUpdateQuote() {

        this.isLoading = true;

        const configJson =
            this.generateProductData();

        updateExistingQuote({

            quoteId: this.quoteId,

            configJson: configJson,

            cartSKU: this.packageSku
        })

        .then(() => {

            this.isLoading = false;

            this.showToast(
                'Success',
                'Quote updated successfully.',
                'success'
            );

            this[NavigationMixin.Navigate]({

                type: 'standard__recordPage',

                attributes: {
                    recordId: this.quoteId,
                    objectApiName: 'Quote',
                    actionName: 'view'
                }
            });
        })

        .catch(error => {

            this.isLoading = false;

            console.error(error);

            this.showToast(
                'Error',
                error.body?.message
                    || 'Something went wrong',
                'error'
            );
        });
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
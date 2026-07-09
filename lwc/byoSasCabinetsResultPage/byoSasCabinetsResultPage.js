import { LightningElement, api, track } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';

import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import createQuote from '@salesforce/apex/QuoteGeneratorController.createQuoteFromConfiguration';
import updateExistingQuote from '@salesforce/apex/QuoteGeneratorController.updateExistingQuote';

export default class ByoSasCabinetsResultPage extends NavigationMixin(LightningElement) {

    @api opportunityId;
    @api quoteId;
    @api summaryData = {};
    @track isLoading = false;
    @api isUnlistedCart;


    get isReconfigureMode() {

        return !!this.quoteId;
    }

    get selections() {

        return this.summaryData?.selections || {};
    }


    get hasAccessories() {

        return this.selections.accessories
            && this.selections.accessories.length > 0;
    }

    get packageSku() {

        const cabinetLine =
            this.selections.cabinetLine?.key || '';

        const jHooks =
            this.selections.jHooks?.key || '';

        const material =
            this.selections.material?.key || '';

        const doorKey =
            this.selections.doorKeyType?.key || '';

        const top =
            this.selections.top?.key || '';

        const option =
            this.selections.option?.key || '';

        let sku = '';

        if (cabinetLine === 'SAS') {

            sku =
                `${cabinetLine}-${jHooks}${material}-${doorKey}`;

        } else if (
            cabinetLine === 'SAS-B' ||
            cabinetLine === 'SAS-BO'
        ) {

            sku =
                `${cabinetLine}${jHooks}${material}-${doorKey}`;

        } else if (
            cabinetLine === 'SAS-DRY'
        ) {

            sku =
                `SAS-${jHooks}${material}-DRY`;

        } else {

            sku =
                `${cabinetLine}${jHooks}${material}-${doorKey}`;
        }

        return sku;
    }

    generateProductData() {

        let items = [];

        const processItems = (
            rawCode,
            qty = 1
        ) => {

            if (!rawCode) {
                return;
            }

            items.push({

                code: rawCode,

                qty: qty
            });
        };

        processItems(
            this.selections.cabinetLine?.key
        );

        processItems(
            this.selections.jHooks?.key
        );

        processItems(
            this.selections.material?.key
        );

        processItems(
            this.selections.doorKeyType?.key
        );

        processItems(
            this.selections.top?.key
        );

        processItems(
            this.selections.option?.key
        );

        if (this.selections.accessories) {

            this.selections.accessories.forEach(
                acc => {

                    processItems(
                        acc.optionKey,
                        acc.quantity || 1
                    );
                }
            );
        }

        console.log(
            'SAS Payload => ',
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

    showToast(title, message, variant) {

        this.dispatchEvent(

            new ShowToastEvent({
                title,
                message,
                variant
            })
        );
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

            this.showToast(
                'Error',
                error.body?.message ||
                'Something went wrong',
                'error'
            );
        });
    }
}
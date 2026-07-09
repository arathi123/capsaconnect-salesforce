import { LightningElement, api, track } from 'lwc';

import { NavigationMixin }
from 'lightning/navigation';

import { ShowToastEvent }
from 'lightning/platformShowToastEvent';

import createQuote
from '@salesforce/apex/QuoteGeneratorController.createQuoteFromConfiguration';
import updateExistingQuote
from '@salesforce/apex/QuoteGeneratorController.updateExistingQuote';

export default class CapsaOlympusCabAccessorieResultPage extends NavigationMixin(LightningElement) {

    @api opportunityId;
    @api quoteId;

    @api summaryData = {};

    @track isLoading = false;
    @api isUnlistedCart;

    connectedCallback(){
        if (this.isUnlistedCart) {

            this.showToast(
                'Configuration Not Found',
                'This cabinet configuration will be created as Unlisted Cart.',
                'warning'
            );
        }
    }

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

        return this.selections.cabinetLine?.key || '';
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
            'Olympus Payload => ',
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
                error.body?.message
                    || 'Something went wrong',
                'error'
            );
        });
    }
}
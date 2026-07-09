import { LightningElement, api, track } from 'lwc';

import { NavigationMixin }
from 'lightning/navigation';

import { ShowToastEvent }
from 'lightning/platformShowToastEvent';

import createQuote
from '@salesforce/apex/QuoteGeneratorController.createQuoteFromConfiguration';
import updateExistingQuote
from '@salesforce/apex/QuoteGeneratorController.updateExistingQuote';

export default class ByoTransportCartResultPage extends NavigationMixin(LightningElement) {

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

    get hasUseCase() {

        return this.selections.useCase
            && this.selections.useCase.label;
    }


    get hasAccessories() {

        return this.selections.accessories
            && this.selections.accessories.length > 0;
    }

    get packageSku() {

        return this.selections.useCase?.key || '';
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

        // USE CASE

        processItems(
            this.selections.useCase?.key
        );

        // ACCESSORIES

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
            'TRANSPORT CART Payload => ',
            JSON.stringify(items)
        );

        return JSON.stringify(items);
    }

    handleQuoteRequest() {

        this.isLoading = true;

        createQuote({

            configJson:
                this.generateProductData(),

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

            console.error(
                'QUOTE ERROR => ',
                JSON.stringify(error)
            );

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

        updateExistingQuote({

            quoteId: this.quoteId,

            configJson:
                this.generateProductData(),

            cartSKU:
                this.packageSku
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
import { LightningElement, api, track } from 'lwc';

import { NavigationMixin }
from 'lightning/navigation';

import { ShowToastEvent }
from 'lightning/platformShowToastEvent';

import createQuote
from '@salesforce/apex/QuoteGeneratorController.createQuoteFromConfiguration';

import updateExistingQuote
from '@salesforce/apex/QuoteGeneratorController.updateExistingQuote';

export default class ByoAdditionalCSAccessoriesResultPage extends NavigationMixin(LightningElement) {

    @api opportunityId;
    @api quoteId;
    @api summaryData = {};
    @api isUnlistedCart;

    @track isLoading = false;

    get isReconfigureMode() {

        return !!this.quoteId;
    }

    get selections() {

        return this.summaryData?.selections || {};
    }

    get packageSku() {

        return this.selections.parts?.key || '';
    }

    generateProductData() {

        let items = [];

        if (this.selections.parts?.key) {

            items.push({

                code:
                    this.selections.parts.key,

                qty: 1
            });
        }

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
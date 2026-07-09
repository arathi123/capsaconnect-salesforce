import { LightningElement, api, track } from 'lwc';

import { NavigationMixin }
from 'lightning/navigation';

import { ShowToastEvent }
from 'lightning/platformShowToastEvent';

import createQuote
from '@salesforce/apex/QuoteGeneratorController.createQuoteFromConfiguration';
import updateExistingQuote
from '@salesforce/apex/QuoteGeneratorController.updateExistingQuote';

export default class ByoFlxCabinetResultPage extends NavigationMixin(LightningElement) {

    @api opportunityId;
    @api quoteId;
    @api isUnlistedCart;

    @api selections = {};

    @track isLoading = false;

    connectedCallback() {

        console.log(
            'FLX QuoteId =>',
            this.quoteId
        );

        console.log(
            'FLX Reconfigure =>',
            this.isReconfigureMode
        );
    }

    get isReconfigureMode() {

        return !!this.quoteId;
    }

    get configurationCodes() {

        return [

            {
                label: 'Shell',
                code:
                    this.selections.Shell?.key
            },

            {
                label: 'Base',
                code:
                    this.selections.Base?.key
            },

            {
                label: 'Top',
                code:
                    this.selections.Top?.key
            },

            {
                label: 'Lock',
                code:
                    this.selections.Lock?.key
                    ||
                    this.selections.LOCK?.key
            },

            {
                label: 'Divider',
                code:
                    this.selections.Divider?.key
            }

        ]

        .filter(
            item => item.code
        );
    }


    get hasAccessories() {

        return this.selections.accessories
            &&
            this.selections.accessories.length > 0;
    }


    generateProductData() {

        let items = [];

        const addItem = (
            code,
            qty = 1
        ) => {

            if (!code) {

                return;
            }

            items.push({

                code: code,

                qty: qty
            });
        };

        // SHELL

        addItem(
            this.selections.Shell?.key
        );

        // BASE

        addItem(
            this.selections.Base?.key
        );

        // TOP

        addItem(
            this.selections.Top?.key
        );

        // LOCK

        addItem(
            this.selections.Lock?.key
            ||
            this.selections.LOCK?.key
        );

        // DIVIDER

        addItem(
            this.selections.Divider?.key
        );

        // ACCESSORIES

        if (this.selections.accessories) {

            this.selections.accessories.forEach(acc => {

                addItem(

                    acc.optionKey,

                    acc.quantity || 1
                );
            });
        }

        console.log(
            'FLX PRODUCT PAYLOAD => ',
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
                this.opportunityId
        })

        .then(quoteId => {

            this.isLoading = false;

            this.showToast(
                'Success',
                'Quote created successfully.',
                'success'
            );

            this[NavigationMixin.Navigate]({

                type:
                    'standard__recordPage',

                attributes: {

                    recordId:
                        quoteId,

                    objectApiName:
                        'Quote',

                    actionName:
                        'view'
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

    showToast(
        title,
        message,
        variant
    ) {

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

                type:
                    'standard__recordPage',

                attributes: {

                    recordId:
                        this.quoteId,

                    objectApiName:
                        'Quote',

                    actionName:
                        'view'
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
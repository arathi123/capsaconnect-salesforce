import { LightningElement, api, track } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

import createQuoteFromConfiguration
    from '@salesforce/apex/QuoteGeneratorController.createQuoteFromConfiguration';

import updateExistingQuote
    from '@salesforce/apex/QuoteGeneratorController.updateExistingQuote';

export default class TrioResults extends NavigationMixin(LightningElement) {

    @api opportunityId;

    @api selections;

    @api quoteId;

    @track isLoading = false;

    @track baseCartImage = '';

    @track overlays = [];

    @track chassisSku = 'TRIO-CUSTOM';

    connectedCallback() {

            console.log(
                'RESULT DATA',
                JSON.stringify(this.selections)
            );

        this.restorePreviewState();

        this.chassisSku =
            this.calculateChassisSku();

    }

    get isReconfigureMode() {

        return (
            this.quoteId !== null &&
            this.quoteId !== undefined &&
            this.quoteId !== ''
        );

    }

    restorePreviewState() {

        if (

            this.selections &&
            this.selections.layeredPreview

        ) {

            this.baseCartImage =
                this.selections.layeredPreview.baseImage;

            this.overlays =
                this.selections.layeredPreview.overlays || [];

        }
        else {

            this.baseCartImage =
                this.selections?.previewImage ||
                '/resource/TrioCarts/TrioCarts/documentation.jpg';

        }

    }


    get powerSection() {

        const power = this.selections?.POWER || [];

        return {
            title: 'Power',
            items: power.filter(item =>

                item.group !== 'BATTERY'

            ),
            hasData: power.some(item => item.group !== 'BATTERY')
        };
    }

    get batterySection() {

        const power = this.selections?.POWER || [];

        return {
            title: 'GoLife External Battery System',
            items: power.filter(item =>

                item.group === 'BATTERY'

            ),
            hasData: power.some(item => item.group === 'BATTERY')
        };
    }

    get summarySections() {

    const builderSlots =
    (this.selections?.BUILDER || [])
        .filter(item => item.label)
        .map(item => ({

            key: item.key,

            label: `Bin ${item.tier}: ${item.label}`,

            sku: item.sku

        }));


        const storageItems = [

            ...(this.selections?.STORAGE || []),

            ...builderSlots,

            ...(this.selections?.ADDITIONAL_STORAGE || [])

        ];

        return [

            {

                title: 'Use Case',

                items: this.selections?.USE_CASE || [],

                hasData:
                    (this.selections?.USE_CASE || []).length > 0

            },

            this.powerSection,

            this.batterySection,

            {

                title: 'Lift',

                items: this.selections?.LIFT || [],

                hasData:
                    (this.selections?.LIFT || []).length > 0

            },

            {

                title: 'Monitor',

                items: this.selections?.MONITOR || [],

                hasData:
                    (this.selections?.MONITOR || []).length > 0

            },

            {

                title: 'Keyboard Tray',

                items: this.selections?.KEYBOARD_TRAY || [],

                hasData:
                    (this.selections?.KEYBOARD_TRAY || []).length > 0

            },

            {

                title: 'Storage & Security',

                items: storageItems,

                hasData:
                    storageItems.length > 0

            },

            {

                title: 'Tele Accessories',

                items:
                    this.selections?.TELE_ACCESSORIES || [],

                hasData:
                    (this.selections?.TELE_ACCESSORIES || []).length > 0

            },

            {

                title: 'Accessories',

                items:
                    this.selections?.ACCESSORIES || [],

                hasData:
                    (this.selections?.ACCESSORIES || []).length > 0

            },

            {

                title: 'Warranty',

                items:
                    this.selections?.WARRANTY || [],

                hasData:
                    (this.selections?.WARRANTY || []).length > 0

            }

        ];

    }

    calculateChassisSku() {

        const storage =
            this.selections?.STORAGE || [];

        // Find last storage option having SKU

        const chassis =
            [...storage]
                .reverse()
                .find(item => item.sku);

        if (chassis) {

            // If multiple SKUs are stored
            // Example:
            // SKU1 & SKU2
            // SKU1 + SKU2

            return chassis.sku
                .split(/&|\+|,/)[0]
                .trim();

        }

        return 'TRIO-BASE';

    }


    buildProductRequests() {

        let requests = [];

        // Combine every step into one array

        const allSelections = [

            ...(this.selections?.POWER || []),

            ...(this.selections?.LIFT || []),

            ...(this.selections?.MONITOR || []),

            ...(this.selections?.KEYBOARD_TRAY || []),

            ...(this.selections?.STORAGE || []),

            ...(this.selections?.BUILDER || []),

            ...(this.selections?.ADDITIONAL_STORAGE || []),

            ...(this.selections?.TELE_ACCESSORIES || []),

            ...(this.selections?.ACCESSORIES || []),

            ...(this.selections?.WARRANTY || [])

        ];

        // Ignore non-billable items

        const billableItems =

            allSelections.filter(item =>

                item.sku !== null &&
                item.sku !== '' &&
                item.sku !== 'None'

            );

        billableItems.forEach(item => {

            let skuList = [item.sku];

            // Handle combined SKU strings

            if (item.sku.includes('&')) {

                skuList = item.sku.split('&');

            }
            else if (item.sku.includes('+')) {

                skuList = item.sku.split('+');

            }
            else if (item.sku.includes(',')) {

                skuList = item.sku.split(',');

            }

            skuList.forEach(code => {

                const sku = code.trim();

                if (sku) {

                    requests.push({

                        code: sku,

                        qty: 1,

                        imgUrl: ''

                    });

                }

            });

        });

        return JSON.stringify(requests);

    }

    navigateToRecord(recordId) {

        this[NavigationMixin.Navigate]({

            type: 'standard__recordPage',

            attributes: {

                recordId: recordId,

                objectApiName: 'Quote',

                actionName: 'view'

            }

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

    async handleGenerateQuote() {

        this.isLoading = true;

        try {

            const configJson =
                this.buildProductRequests();

            if (this.isReconfigureMode) {

                await updateExistingQuote({

                    quoteId: this.quoteId,

                    configJson: configJson

                });

                this.showToast(

                    'Success',

                    'Quote updated successfully.',

                    'success'

                );

                this.dispatchEvent(

                    new CustomEvent(

                        'resetflow',

                        {

                            bubbles: true,

                            composed: true

                        }

                    )

                );

                this.navigateToRecord(

                    this.quoteId

                );

            }

            else {

                const newQuoteId =

                    await createQuoteFromConfiguration({

                        configJson: configJson,

                        opportunityId: this.opportunityId,

                        cartSKU: this.chassisSku

                    });

                this.showToast(

                    'Success',

                    'Quote created successfully.',

                    'success'

                );

                this.dispatchEvent(

                    new CustomEvent(

                        'resetflow',

                        {

                            bubbles: true,

                            composed: true

                        }

                    )

                );

                this.navigateToRecord(

                    newQuoteId

                );

            }

        }

        catch (error) {

            console.error('Quote Generation Error');
            console.log(JSON.stringify(error));
            console.log('BODY', error.body);
            console.log('MESSAGE', error.body?.message);
            console.log('STACK', error.body?.stackTrace);

            this.showToast(
                'Error',
                error.body?.message || error.message || 'Unknown Error',
                'error'
            );

            this.isLoading = false;
        }

    }

}
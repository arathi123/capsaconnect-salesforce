import { LightningElement, api, track } from 'lwc';

export default class CapsaMseriesPackageFlow extends LightningElement {

    @api cartLabel;
    @api cartId;
    @api cartUniqueId;
    @api pathJson;
    @api opportunityId;
    @api quoteId;

    @track currentStep = 'Accessory Kit';
    
    @track selections = {
        accessoryKit: [],
        accessoryKitNone: false
    };


    connectedCallback() {

        console.log(
            ' PACKAGE FLOW QUOTE ID => ',
            this.quoteId
        );

        console.log(
            'M-Series Package Flow Started'
        );

        console.log(
            'Cart Label:',
            this.cartLabel
        );

        console.log(
            'Cart Id:',
            this.cartId
        );

        console.log(
            ' Cart Unique Id:',
            this.cartUniqueId
        );

        // update parent path
        this.dispatchEvent(
            new CustomEvent('stepchange', {
                detail: {
                    nextStep: 'Accessory Kit'
                }
            })
        );
    }


    @api
    jumpToStep(stepName) {

        console.log(
            ' Jump To Step:',
            stepName
        );

        this.currentStep = stepName;
    }

    handleNext(event) {

        console.log(
            'Package Next:',
            JSON.stringify(event.detail)
        );

        // SAVE ACCESSORY KIT
        this.selections.accessoryKit =
            event.detail.payload?.kits || [];

        this.selections.accessoryKitNone =
            event.detail.payload?.noneSelected || false;

        console.log(
            ' Selected Kit:',
            JSON.stringify(this.selections.accessoryKit)
        );

        // MOVE TO RESULTS
        this.currentStep = 'Results';

        // UPDATE PARENT PATH
        this.dispatchEvent(
            new CustomEvent('stepchange', {
                detail: {
                    nextStep: 'Results'
                }
            })
        );
    }

    get isAccessoryKit() {

        return this.currentStep === 'Accessory Kit';
    }

    get isResults() {

        return this.currentStep === 'Results';
    }


    get summaryData() {

        return {

            cartLabel: this.cartLabel,

            cartId: this.cartId,

            cartUniqueId: this.cartUniqueId,

            selections: {

                // REQUIRED
                cartType: {
                    key: this.cartId,
                    label: this.cartLabel
                },

                // ✅ ADD THESE EMPTY OBJECTS
                width: {
                    key: '',
                    label: ''
                },

                height: {
                    key: '',
                    label: ''
                },

                lock: {
                    key: '',
                    label: ''
                },

                color: {
                    key: '',
                    label: ''
                },

                storage: {},

                extendedStorage: {},

                extraStorageType: {},

                accessories: [],

                accessoryKit:
                    this.selections.accessoryKit || []
            }
        };
    }
}
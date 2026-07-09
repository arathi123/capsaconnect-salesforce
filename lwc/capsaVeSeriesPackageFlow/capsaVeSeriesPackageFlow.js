import { LightningElement, api, track } from 'lwc';

export default class CapsaVeSeriesPackageFlow extends LightningElement {
    @api cartLabel;
    @api cartId;
    @api cartUniqueId;
    @api pathJson; // Passed in but ignored, matching the M-Series pattern
    @api opportunityId;

    @track currentStep = 'Accessory Kit';

    @track selections = {
        accessoryKit: [],
        accessoryKitNone: false
    };

    connectedCallback() {
        console.log('VE-Series Package Flow Started');
        console.log('Cart Label:', this.cartLabel);
        console.log('Cart Id:', this.cartId);
        console.log('Cart Unique Id:', this.cartUniqueId);

        // Update parent path immediately on load
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
        console.log('Jump To Step:', stepName);
        this.currentStep = stepName;
    }

    // Since we are using the generic c-byo-kit-selection, we don't need a specific handleKitSelection.
    // The generic component fires 'onnextstep' which we catch here.
    handleNext(event) {
        console.log('Package Next:', JSON.stringify(event.detail));

        // Save the Accessory Kit selection
        this.selections.accessoryKit =
            event.detail.payload?.kits || [];

        this.selections.accessoryKitNone =
            event.detail.payload?.noneSelected || false;

        console.log('Selected Kit:', JSON.stringify(this.selections.accessoryKit));

        // Move directly to Results
        this.currentStep = 'Results';

        // Update the parent path tracker
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

    // Formatting the payload exactly as M-Series does, to pass to the BYO Result Page
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
                // Add empty objects to prevent undefined errors in the shared Result Page
                width: { key: '', label: '' },
                height: { key: '', label: '' },
                lock: { key: '', label: '' },
                color: { key: '', label: '' },
                storage: {},
                extendedStorage: {},
                extraStorageType: {},
                accessories: [],
                accessoryKit: this.selections.accessoryKit || {}
            }
        };
    }
}
import { LightningElement, track, api } from 'lwc';
import getOptionsByStepAndFamily
    from '@salesforce/apex/CartConfiguratorController.getOptionsByStepAndFamily';

export default class TrioWarranty extends LightningElement {

    @api productType = 'Trio';
    @api selections;

    @track rawOptions = [];

    // Selected radio warranty
    @track selectedBaseWarranty = '';

    // Battery checkbox
    @track isBatterySelected = false;

    // Preview
    @track baseCartImage = '';
    @track overlays = [];

    @track isLoading = true;

    connectedCallback() {

        this.restorePreviewState();

        this.fetchMetadata();

    }

    // =====================================
    // PREVIEW
    // =====================================

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

    // =====================================
    // LOAD METADATA
    // =====================================

    async fetchMetadata() {

        try {

            const data =
                await getOptionsByStepAndFamily({

                    stepKey: 'WARRANTY',

                    productFamily: this.productType

                });

            this.rawOptions = data || [];

            // Restore previous selections

            if (
                this.selections &&
                this.selections.WARRANTY &&
                this.selections.WARRANTY.length > 0
            ) {

                // Battery Warranty

                const battery =
                    this.selections.WARRANTY.find(

                        item =>
                            item.key === 'BATTERY_45'

                    );

                if (battery) {

                    this.isBatterySelected = true;

                }

                // Base Warranty

                const base =
                    this.selections.WARRANTY.find(

                        item =>
                            item.key !== 'BATTERY_45'

                    );

                if (base) {

                    this.selectedBaseWarranty =
                        base.key;

                }

            }

        }
        catch (error) {

            console.error(

                'Warranty Error',

                error

            );

        }
        finally {

            this.isLoading = false;

        }

    }

        // =====================================
    // GETTERS
    // =====================================

    get baseWarrantyOptions() {

        return this.rawOptions

            .filter(

                option =>
                    option.Option_Key__c !== 'BATTERY_45'

            )

            .map(option => {

                const selected =
                    option.Option_Key__c ===
                    this.selectedBaseWarranty;

                return {

                    ...option,

                    isSelected: selected,

                    cardClass: selected
                        ? 'option-row selected'
                        : 'option-row'

                };

            });

    }

    get batteryOption() {

        return this.rawOptions.find(

            option =>
                option.Option_Key__c === 'BATTERY_45'

        );

    }

    get isBatteryDisabled() {

        return (

            !this.selectedBaseWarranty ||

            this.selectedBaseWarranty === 'NO_WTY'

        );

    }

    get batteryCardClass() {

        if (this.isBatteryDisabled) {

            return 'option-row disabled-row';

        }

        return this.isBatterySelected

            ? 'option-row selected'

            : 'option-row';

    }

    get isStepComplete() {

        return this.selectedBaseWarranty !== '';

    }

    // =====================================
    // RADIO SELECT
    // =====================================

    handleBaseSelect(event) {

        this.selectedBaseWarranty =
            event.currentTarget.dataset.key;

        // Disable Battery if No Warranty

        if (
            this.selectedBaseWarranty === 'NO_WTY'
        ) {

            this.isBatterySelected = false;

        }

    }

    // =====================================
    // BATTERY CHECKBOX
    // =====================================

    handleBatterySelect() {

        if (!this.isBatteryDisabled) {

            this.isBatterySelected =
                !this.isBatterySelected;

        }

    }

    // =====================================
    // NEXT
    // =====================================

    handleNext() {

        const payload = [];

        // Base Warranty

        const baseWarranty =
            this.rawOptions.find(

                option =>

                    option.Option_Key__c ===
                    this.selectedBaseWarranty

            );

        if (baseWarranty) {

            payload.push({

                key: baseWarranty.Option_Key__c,

                label: baseWarranty.Option_Label__c,

                sku:

                    baseWarranty.Option_Key__c === 'NO_WTY'

                        ? null

                        : baseWarranty.Option_Key__c

            });

        }

        // Battery Warranty

        if (this.isBatterySelected) {

            const battery =
                this.rawOptions.find(

                    option =>
                        option.Option_Key__c ===
                        'BATTERY_45'

                );

            if (battery) {

                payload.push({

                    key: battery.Option_Key__c,

                    label: battery.Option_Label__c,

                    sku: battery.Option_Key__c

                });

            }

        }

        this.dispatchEvent(

            new CustomEvent(

                'stepcomplete',

                {

                    detail: {

                        WARRANTY: payload,

                        overrideNext: 'Results'

                    }

                }

            )

        );

    }

}
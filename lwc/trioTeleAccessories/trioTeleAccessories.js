import { LightningElement, track, api } from 'lwc';
import getOptionsByStepAndFamily
    from '@salesforce/apex/CartConfiguratorController.getOptionsByStepAndFamily';

export default class TrioTeleAccessories extends LightningElement {

    @api productType = 'Trio';
    @api selections;

    @track rawOptions = [];

    @track selectedAccessories = [];

    @track baseCartImage = '';

    @track overlays = [];

    @track isLoading = true;

    connectedCallback() {

        this.restorePreviewState();

        this.fetchMetadata();

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

    async fetchMetadata() {

        try {

            const data =
                await getOptionsByStepAndFamily({

                    stepKey:'TELE ACCESSORY',

                    productFamily:this.productType

                });

            this.rawOptions = data || [];

            if (

                this.selections &&
                this.selections.TELE_ACCESSORIES &&
                this.selections.TELE_ACCESSORIES.length

            ) {

                this.selectedAccessories =
                    this.selections.TELE_ACCESSORIES.map(

                        item => item.key

                    );

            }

        }
        catch(error){

            console.error(

                'Tele Accessories Error',

                error

            );

        }
        finally{

            this.isLoading = false;

        }

    }


    handleNoneSelect() {

        this.selectedAccessories = [];

    }

    handleAccessorySelect(event) {

        const key = event.currentTarget.dataset.key;

        // If None selected
        if (key === 'NONE') {

            this.selectedAccessories = ['NONE'];

            return;

        }

        // Remove None when selecting any accessory
        this.selectedAccessories =
            this.selectedAccessories.filter(k => k !== 'NONE');

        const index =
            this.selectedAccessories.indexOf(key);

        if (index === -1) {

            this.selectedAccessories.push(key);

        } else {

            this.selectedAccessories.splice(index, 1);

        }

        this.selectedAccessories = [
            ...this.selectedAccessories
        ];
    }


    get isNoneSelected() {

        return this.selectedAccessories.length === 0;

    }

    get noneCardClass() {

        return this.isNoneSelected
            ? 'option-row selected'
            : 'option-row';

    }

    get accessoryOptions() {

        return this.rawOptions.map(option => {

            const checked =
                this.selectedAccessories.includes(
                    option.Option_Key__c
                );

            return {

                ...option,

                isChecked: checked,

                cardClass: checked
                    ? 'option-row selected'
                    : 'option-row'

            };

        });

    }


    handleNext() {

        const payload = [];

        this.selectedAccessories.forEach(key => {

            const option = this.rawOptions.find(

                item => item.Option_Key__c === key

            );

            if (option) {

                payload.push({

                    key: option.Option_Key__c,

                    label: option.Option_Label__c,

                    sku: option.Option_Key__c

                });

            }

        });

        this.dispatchEvent(

            new CustomEvent(

                'stepcomplete',

                {

                    detail: {

                        TELE_ACCESSORIES: payload

                    }

                }

            )

        );

    }

}
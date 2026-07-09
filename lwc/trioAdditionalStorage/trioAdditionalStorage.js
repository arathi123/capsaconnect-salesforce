import { LightningElement, api, track } from 'lwc';
import getOptionsByStepAndFamily
    from '@salesforce/apex/CartConfiguratorController.getOptionsByStepAndFamily';

export default class TrioAdditionalStorage extends LightningElement {

    @api productType = 'Trio';
    @api selections;

    @track isLoading = true;

    @track storageOptions = [];

    @track selectedKey = '';

    connectedCallback() {

        this.loadOptions();

        if (
            this.selections &&
            this.selections.ADDITIONAL_STORAGE &&
            this.selections.ADDITIONAL_STORAGE.length
        ) {

            this.selectedKey =
                this.selections.ADDITIONAL_STORAGE[0].key;

        }

    }

    async loadOptions() {

        this.isLoading = true;

        try {

            const data =
                await getOptionsByStepAndFamily({

                    stepKey: 'ADDITIONAL STORAGE',

                    productFamily: this.productType

                });

            this.storageOptions = (data || []).map(option => {

                return {

                    ...option,

                    selected:
                        option.Option_Key__c === this.selectedKey,

                    cardClass:
                        option.Option_Key__c === this.selectedKey
                            ? 'option-card selected'
                            : 'option-card'

                };

            });

        }
        catch(error){

            console.error(
                'Additional Storage Error',
                error
            );

        }
        finally{

            this.isLoading = false;

        }

    }

        handleSelect(event) {

        this.selectedKey =
            event.currentTarget.dataset.key;

        this.storageOptions =
            this.storageOptions.map(option => {

                const selected =
                    option.Option_Key__c === this.selectedKey;

                return {

                    ...option,

                    selected,

                    cardClass: selected
                        ? 'option-card selected'
                        : 'option-card'

                };

            });

    }

    get displayOptions() {

        return this.storageOptions;

    }

    get isNextDisabled() {

        return !this.selectedKey;

    }

    handleNext() {

        const selectedOption =
            this.storageOptions.find(

                option =>
                    option.Option_Key__c === this.selectedKey

            );

        if (!selectedOption) {

            return;

        }

        this.dispatchEvent(

            new CustomEvent(

                'stepcomplete',

                {

                    detail: {

                        ADDITIONAL_STORAGE: [

                            {

                                key: selectedOption.Option_Key__c,

                                label: selectedOption.Option_Label__c,

                                sku: selectedOption.Option_Key__c

                            }

                        ]

                    }

                }

            )

        );

    }

}
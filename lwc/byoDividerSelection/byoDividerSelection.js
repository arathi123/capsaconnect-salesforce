import { LightningElement, track, api, wire } from 'lwc';

import getOptionsByStepAndFamily
from '@salesforce/apex/CartConfiguratorController.getOptionsByStepAndFamily';

export default class ByoDividerSelection extends LightningElement {

    @api productType = 'FLX Cabinet';

    @track allOptions = [];

    @track selections = {

        material: '',
        height: '',
        corresponding: '',
        columns: ''
    };

    isLoading = true;

    @wire(
        getOptionsByStepAndFamily,
        {
            stepKey: 'Divider',
            productFamily: '$productType'
        }
    )

    wiredOptions({ error, data }) {

        if (data) {

            this.allOptions =
                data.map(opt => {

                    return {

                        ...opt,

                        isSelected: false,

                        cardClass: 'option-card'
                    };
                });

            console.log(
                'DIVIDER OPTIONS => ',
                JSON.stringify(this.allOptions)
            );

            this.isLoading = false;

        } else if (error) {

            console.error(
                'DIVIDER ERROR => ',
                error
            );

            this.isLoading = false;
        }
    }

    get materialOptions() {

        return this.getOptions(
            [
                'LAP',
                'LAS'
            ],
            'material'
        );
    }

    get heightOptions() {

        return this.getOptions(
            [
                'T',
                'S'
            ],
            'height'
        );
    }

    get correspondingOptions() {

        return this.getOptions(
            [
                '1936',
                '2736'
            ],
            'corresponding'
        );
    }

    get columnOptions() {

        return this.getOptions(
            [
                '2COL',
                '3COL'
            ],
            'columns'
        );
    }

    getOptions(keys, section) {

        return this.allOptions

            .filter(
                opt =>
                    keys.includes(
                        opt.Option_Label__c
                    )
            )

            .map(opt => {

                const isSelected =
                    this.selections[section] ===
                    opt.Option_Key__c;

                return {

                    ...opt,

                    isSelected,

                    cardClass: isSelected
                        ? 'option-card selected'
                        : 'option-card'
                };
            });
    }

    handleSelect(event) {

        const section =
            event.currentTarget.dataset.section;

        const key =
            event.currentTarget.dataset.key;

        this.selections = {

            ...this.selections,

            [section]: key
        };

        this.allOptions =
            [...this.allOptions];
    }



    get generatedSku() {

        const s = this.selections;

        return `${s.material}-${s.height}${s.corresponding}-${s.columns}`;
    }


    get isComplete() {

        return this.selections.material
            && this.selections.height
            && this.selections.corresponding
            && this.selections.columns;
    }

    handleNext() {

        this.dispatchEvent(

            new CustomEvent(
                'nextstep',
                {
                    detail: {

                        step: 'Divider',

                        payload: {

                            key:
                                this.generatedSku,

                            label:
                                this.generatedSku,

                            selections:
                                this.selections
                        }
                    }
                }
            )
        );
    }
}
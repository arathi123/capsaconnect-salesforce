import { LightningElement, track, api, wire } from 'lwc';

import getOptionsByStepAndFamily
from '@salesforce/apex/CartConfiguratorController.getOptionsByStepAndFamily';

export default class ByoBaseSelection extends LightningElement {

    @api productType = 'FLX Cabinet';

    @track allOptions = [];

    @track selections = {

        material: '',
        depth: '',
        width: '',
        style: ''
    };

    isLoading = true;

    @wire(
        getOptionsByStepAndFamily,
        {
            stepKey: 'Base',
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
                'BASE OPTIONS => ',
                JSON.stringify(this.allOptions)
            );

            this.isLoading = false;

        } else if (error) {

            console.error(
                'BASE ERROR => ',
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

    get depthOptions() {

        return this.getOptions(
            [
                'D19',
                'D27'
            ],
            'depth'
        );
    }

    get widthOptions() {

        return this.getOptions(
            [
                'W19',
                'W36'
            ],
            'width'
        );
    }

    get styleOptions() {

        return this.getOptions(
            [
                'TK4',
                'TK6',
                'CASTER'
            ],
            'style'
        );
    }

    getOptions(labels, section) {

        return this.allOptions

            .filter(
                opt =>
                    labels.includes(
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

        console.log(
            'BASE SELECTIONS => ',
            JSON.stringify(this.selections)
        );

        this.allOptions =
            [...this.allOptions];
    }


    get generatedSku() {

        const s = this.selections;

        const depth =
            s.depth
                ? s.depth.replace('D', '')
                : '';

        const width =
            s.width
                ? s.width.replace('W', '')
                : '';

        return `${s.material}-${depth}${width}-${s.style}`;
    }


    get isComplete() {

        return this.selections.material
            && this.selections.depth
            && this.selections.width
            && this.selections.style;
    }


    handleNext() {

        console.log(
            'BASE SKU => ',
            this.generatedSku
        );

        this.dispatchEvent(

            new CustomEvent(
                'nextstep',
                {
                    detail: {

                        step: 'Base',

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
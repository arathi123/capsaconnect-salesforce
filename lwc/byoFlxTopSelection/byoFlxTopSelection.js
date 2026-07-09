import { LightningElement, track, api, wire } from 'lwc';

import getOptionsByStepAndFamily
from '@salesforce/apex/CartConfiguratorController.getOptionsByStepAndFamily';

export default class ByoFlxTopSelection extends LightningElement {

    @api productType = 'FLX Cabinet';

    @track allOptions = [];

    @track selections = {

        material: '',
        depth: '',
        width: '',
        style: ''
    };

    isLoading = true;

    connectedCallback() {

        console.log(
            'TOP COMPONENT LOADED'
        );

        this.selections = {

            material: '',
            depth: '',
            width: '',
            style: ''
        };
    }


    @wire(
        getOptionsByStepAndFamily,
        {
            stepKey: 'Top',
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
                'TOP OPTIONS => ',
                JSON.stringify(this.allOptions)
            );

            this.isLoading = false;

        } else if (error) {

            console.error(
                'TOP ERROR => ',
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
                'FLAT',
                'SLOPE'
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

        console.log(
            'SECTION => ',
            section
        );

        console.log(
            'KEY => ',
            key
        );

        this.selections = {

            ...this.selections,

            [section]: key
        };

        console.log(
            'UPDATED TOP SELECTIONS => ',
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
            'FINAL TOP SKU => ',
            this.generatedSku
        );

        this.dispatchEvent(

            new CustomEvent(
                'nextstep',
                {
                    detail: {

                        step: 'Top',

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
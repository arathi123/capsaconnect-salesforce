import { LightningElement, track, api, wire } from 'lwc';

import getOptionsByStepAndFamily
from '@salesforce/apex/CartConfiguratorController.getOptionsByStepAndFamily';

export default class ByoShellSelection extends LightningElement {

    @api productType = 'FLX Cabinet';

    @track allOptions = [];

    @track selections = {

        material: '',
        height: '',
        depth: '',
        width: '',
        door: ''
    };

    isLoading = true;

    connectedCallback() {

        console.log(
            'SHELL COMPONENT LOADED'
        );

        this.selections = {

            material: '',
            height: '',
            depth: '',
            width: '',
            door: ''
        };
    }


    @wire(
        getOptionsByStepAndFamily,
        {
            stepKey: 'Shell',
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
                'ALL OPTIONS => ',
                JSON.stringify(this.allOptions)
            );

            this.isLoading = false;

        } else if (error) {

            console.error(
                'FLX SHELL ERROR => ',
                error
            );

            this.isLoading = false;
        }
    }

    get materialOptions() {

        return this.getOptions(
            [
                'LP',
                'LS'
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

    get doorOptions() {

        return this.getOptions(
            [
                'G',
                'R'
            ],
            'door'
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
            'UPDATED SELECTIONS => ',
            JSON.stringify(this.selections)
        );

        this.allOptions =
            [...this.allOptions];
    }

    get generatedSku() {

        const s = this.selections;

        const depth =
            s.depth?.replace('D', '') || '';

        const width =
            s.width?.replace('W', '') || '';

        return `${s.material}-${s.height}${depth}${width}-${s.door}`;
    }


    get isComplete() {

        return this.selections.material
            && this.selections.height
            && this.selections.depth
            && this.selections.width
            && this.selections.door;
    }

    handleNext() {

        console.log(
            'FINAL SKU => ',
            this.generatedSku
        );

        this.dispatchEvent(

            new CustomEvent(
                'nextstep',
                {
                    detail: {

                        step: 'Shell',

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
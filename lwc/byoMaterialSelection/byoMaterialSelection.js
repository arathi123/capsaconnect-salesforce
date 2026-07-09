import { LightningElement, track, wire, api } from 'lwc';

import getOptionsByStepAndFamily
from '@salesforce/apex/CartConfiguratorController.getOptionsByStepAndFamily';

export default class ByoMaterialSelection extends LightningElement {

    @api productType;

    @api selections;

    @track materialOptions = [];

    selectedMaterial = '';

    selectedLabel = '';

    showNextButton = false;

    @wire(
        getOptionsByStepAndFamily,
        {
            stepKey: 'Material',
            productFamily: '$productType'
        }
    )
    wiredOptions({ error, data }) {

        if (data) {

            this.materialOptions =
                data.map(opt => ({

                    ...opt,

                    cardkey:
                        opt.Option_Key__c +
                        opt.Option_Label__c,

                    showDesc: false,

                    isSelected: false,

                    cardClass: 'height-card'
                }));

        } else if (error) {

            console.error(
                'Error fetching Material:',
                error
            );
        }
    }

    handleMouseEnter(event) {

        this.toggleDesc(
            event.currentTarget.dataset.key,
            true
        );
    }

    handleMouseLeave(event) {

        this.toggleDesc(
            event.currentTarget.dataset.key,
            false
        );
    }

    toggleDesc(key, isHovering) {

        this.materialOptions =
            this.materialOptions.map(opt => {

                const shouldShow =

                    (
                        opt.cardkey === key &&
                        isHovering
                    ) ||

                    opt.isSelected;

                return {

                    ...opt,

                    showDesc: shouldShow
                };
            });
    }

    handleSelect(event) {

        const key =
            event.currentTarget.dataset.key;

        const selectedOption =
            this.materialOptions.find(
                opt =>
                    opt.cardkey === key
            );

        this.selectedMaterial =
            selectedOption
                ? selectedOption.Option_Key__c
                : '';

        this.selectedLabel =
            selectedOption
                ? selectedOption.Option_Label__c
                : '';

        this.showNextButton = true;

        this.materialOptions =
            this.materialOptions.map(opt => {

                const isSelected =
                    opt.cardkey === key;

                return {

                    ...opt,

                    isSelected: isSelected,

                    showDesc: isSelected,

                    cardClass: isSelected
                        ? 'height-card selected'
                        : 'height-card'
                };
            });
    }

    handleNext() {

        this.dispatchEvent(

            new CustomEvent(
                'nextstep',
                {
                    detail: {

                        step: 'Material',

                        payload: {

                            key: this.selectedMaterial,

                            label: this.selectedLabel
                        }
                    }
                }
            )
        );
    }
}
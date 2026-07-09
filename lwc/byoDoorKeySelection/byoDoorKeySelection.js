import { LightningElement, track, wire, api } from 'lwc';

import getOptionsByStepAndFamily
from '@salesforce/apex/CartConfiguratorController.getOptionsByStepAndFamily';

export default class ByoDoorKeySelection extends LightningElement {

    @api productType;

    @api selections;

    @track doorKeyOptions = [];

    selectedDoorKey = '';

    selectedLabel = '';

    showNextButton = false;

    @wire(
        getOptionsByStepAndFamily,
        {
            stepKey: 'DoorKeyType',
            productFamily: '$productType'
        }
    )
    wiredOptions({ error, data }) {

        if (data) {

            this.doorKeyOptions =
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
                'Error fetching Door Key:',
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

        this.doorKeyOptions =
            this.doorKeyOptions.map(opt => {

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
            this.doorKeyOptions.find(
                opt =>
                    opt.cardkey === key
            );

        this.selectedDoorKey =
            selectedOption
                ? selectedOption.Option_Key__c
                : '';

        this.selectedLabel =
            selectedOption
                ? selectedOption.Option_Label__c
                : '';

        this.showNextButton = true;

        this.doorKeyOptions =
            this.doorKeyOptions.map(opt => {

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

                        step: 'DoorKeyType',

                        payload: {

                            key: this.selectedDoorKey,

                            label: this.selectedLabel
                        }
                    }
                }
            )
        );
    }
}
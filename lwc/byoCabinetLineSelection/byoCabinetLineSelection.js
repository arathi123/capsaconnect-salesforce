import { LightningElement, api, wire, track } from 'lwc';

import getOptionsByStepAndFamily
from '@salesforce/apex/CartConfiguratorController.getOptionsByStepAndFamily';

export default class ByoCabinetLineSelection extends LightningElement {

    @api productType;

    @track cabinetOptions = [];

    selectedType = '';
    selectedLabel = '';

    showNextButton = false;

    // =========================================
    // LOAD OPTIONS
    // =========================================

    @wire(
        getOptionsByStepAndFamily,
        {
            stepKey: 'CabinetLine',
            productFamily: '$productType'
        }
    )
    wiredOptions({ error, data }) {

        if (data) {

            console.log(
                'CABINET OPTIONS => ',
                JSON.stringify(data)
            );

            this.cabinetOptions =
                data.map(opt => ({

                    ...opt,

                    isVisible: false,

                    isSelected: false,

                    rowClass: 'option-row'
                }));

        } else if (error) {

            console.error(
                'Error fetching cabinet lines:',
                error
            );
        }
    }

    // =========================================
    // HOVER
    // =========================================

    handleMouseEnter(event) {

        const key =
            event.currentTarget.dataset.key;

        this.toggleDescription(
            key,
            true
        );
    }

    handleMouseLeave(event) {

        const key =
            event.currentTarget.dataset.key;

        this.toggleDescription(
            key,
            false
        );
    }

    // =========================================
    // DESCRIPTION TOGGLE
    // =========================================

    toggleDescription(key, isHovering) {

        this.cabinetOptions =
            this.cabinetOptions.map(opt => {

                const shouldBeVisible =

                    (
                        opt.Option_Key__c === key &&
                        isHovering
                    ) ||

                    opt.isSelected;

                return {

                    ...opt,

                    isVisible:
                        shouldBeVisible
                };
            });
    }

    // =========================================
    // SELECT
    // =========================================

    handleSelect(event) {

        const key =
            event.currentTarget.dataset.key;

        const selectedOption =
            this.cabinetOptions.find(
                opt =>
                    opt.Option_Key__c === key
            );

        this.selectedType = key;

        this.selectedLabel =
            selectedOption
                ? selectedOption.Option_Label__c
                : '';

        this.showNextButton = true;

        this.cabinetOptions =
            this.cabinetOptions.map(opt => {

                const isSelected =
                    opt.Option_Key__c === key;

                return {

                    ...opt,

                    isSelected: isSelected,

                    isVisible: isSelected,

                    rowClass: isSelected
                        ? 'option-row selected'
                        : 'option-row'
                };
            });
    }

    // =========================================
    // NEXT
    // =========================================

    handleNext() {

        this.dispatchEvent(

            new CustomEvent(
                'nextstep',
                {
                    detail: {

                        step: 'CabinetLine',

                        payload: {

                            key: this.selectedType,

                            label: this.selectedLabel
                        }
                    }
                }
            )
        );
    }
}
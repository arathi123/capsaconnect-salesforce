import { LightningElement, track, wire, api } from 'lwc';

import getOptionsByStepAndFamily
from '@salesforce/apex/CartConfiguratorController.getOptionsByStepAndFamily';

export default class ByoOptionSelection extends LightningElement {

    @api productType;

    @api selections;

    @track optionOptions = [];

    selectedOption = '';

    selectedLabel = '';

    showNextButton = false;
    @track optionNone = false;

    get noneCardClass() {

        return this.optionNone
            ? 'height-card selected'
            : 'height-card';
    }


    @wire(
        getOptionsByStepAndFamily,
        {
            stepKey: 'Option',
            productFamily: '$productType'
        }
    )
    wiredOptions({ error, data }) {

        if (data) {

            this.optionOptions =
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
                'Error fetching Options:',
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

        this.optionOptions =
            this.optionOptions.map(opt => {

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

        this.optionNone = false;

        const key =
            event.currentTarget.dataset.key;

        const selectedOption =
            this.optionOptions.find(
                opt =>
                    opt.cardkey === key
            );

        this.selectedOption =
            selectedOption
                ? selectedOption.Option_Key__c
                : '';

        this.selectedLabel =
            selectedOption
                ? selectedOption.Option_Label__c
                : '';

        this.showNextButton = true;

        this.optionOptions =
            this.optionOptions.map(opt => {

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

                        step: 'Option',
                            payload: {

                                key: this.selectedOption,

                                label: this.selectedLabel,

                                noneSelected: this.optionNone
                            }
                    }
                }
            )
        );
    }

    handleNoneSelection() {

        this.optionNone = true;

        this.selectedOption = '';
        this.selectedLabel = '';

        this.showNextButton = true;

        this.optionOptions =
            this.optionOptions.map(opt => {

                return {

                    ...opt,

                    isSelected: false,

                    showDesc: false,

                    cardClass: 'height-card'
                };
            });
    }
}
import { LightningElement, track, wire, api } from 'lwc';

import getOptionsByStepAndFamily
from '@salesforce/apex/CartConfiguratorController.getOptionsByStepAndFamily';

export default class ByoTopSelection extends LightningElement {

    @api productType;

    @api selections;

    @track topOptions = [];
    @track allTopOptions = [];

    selectedTop = '';

    selectedLabel = '';

    showNextButton = false;

    @wire(
        getOptionsByStepAndFamily,
        {
            stepKey: 'Top',
            productFamily: '$productType'
        }
    )
    wiredOptions({ error, data }) {

        if (data) {

            this.allTopOptions = data;

            this.applyFilterAndSet();

        } else if (error) {

            console.error(
                'Error fetching Top:',
                error
            );
        }
    }

    applyFilterAndSet() {

        let filteredData =
            this.applyVisibilityFilter(
                this.allTopOptions
            );

        // NO FALLBACK FOR TOP
        if (!filteredData) {
            filteredData = [];
        }

        this.topOptions =
            filteredData.map(opt => ({
                ...opt,
                cardkey:
                    opt.Option_Key__c +
                    opt.Option_Label__c,
                showDesc: false,
                isSelected: false,
                cardClass: 'height-card'
            }));
    }

    applyVisibilityFilter(options) {

        const selectedDoorKey =
            this.selections?.doorKeyType?.key;

        if (!selectedDoorKey) {
            return options;
        }

        return options.filter(opt => {

            if (!opt.Visibility_Filter__c) {
                return true;
            }

            const rules =
                opt.Visibility_Filter__c.split(';');

            return rules.some(rule => {

                const parts =
                    rule.split('=');

                if (parts.length !== 2) {
                    return false;
                }

                const field =
                    parts[0].trim().toUpperCase();

                const value =
                    parts[1].trim();

                return (
                    field === 'DOORKEYTYPE' &&
                    value === selectedDoorKey
                );
            });
        });
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

        this.topOptions =
            this.topOptions.map(opt => {

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
            this.topOptions.find(
                opt =>
                    opt.cardkey === key
            );

        this.selectedTop =
            selectedOption
                ? selectedOption.Option_Key__c
                : '';

        this.selectedLabel =
            selectedOption
                ? selectedOption.Option_Label__c
                : '';

        this.showNextButton = true;

        this.topOptions =
            this.topOptions.map(opt => {

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

                        step: 'Top',

                        payload: {

                            key: this.selectedTop,

                            label: this.selectedLabel
                        }
                    }
                }
            )
        );
    }
}
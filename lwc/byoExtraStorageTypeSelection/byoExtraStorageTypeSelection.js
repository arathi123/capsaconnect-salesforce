import { LightningElement, track, wire, api } from 'lwc';

import getOptionsByStepAndFamily
from '@salesforce/apex/CartConfiguratorController.getOptionsByStepAndFamily';

export default class ByoExtraStorageTypeSelection
extends LightningElement {

    @api productType;
    @api selections;

    @track storageTypeOptions = [];

    selectedValue = '';
    selectedLabel = '';

    showNextButton = false;

    @wire(
        getOptionsByStepAndFamily,
        {
            stepKey: 'EXTRASTORAGETYPE',
            productFamily: '$productType'
        }
    )
    wiredOptions({ error, data }) {

        if (data) {

            let filteredData =
                this.applyVisibilityFilter(data);

            if (!filteredData || filteredData.length === 0) {
                filteredData = data;
            }

            this.storageTypeOptions =
                filteredData.map(opt => {

                    return {

                        ...opt,

                        value: opt.Option_Key__c,

                        label: opt.Option_Label__c,

                        description: opt.Description__c,

                        image: opt.Image_URL__c,

                        isSelected: false,

                        showDesc: false,

                        cardClass: 'height-card'
                    };
                });

            console.log(
                'Selected Width =>',
                this.selections?.width?.key
            );

            console.log(
                'Extra Storage Type Options => ',
                JSON.stringify(this.storageTypeOptions)
            );

        } else if (error) {

            console.error(
                'Error fetching Extra Storage Type options:',
                error
            );
        }
    }

    applyVisibilityFilter(options) {

        if (
            this.productType !== 'M-Series' &&
            this.productType !== 'VE-Series'
        ) {
            return options;
        }

        if (!this.selections?.width?.key) {
            return options;
        }

        const selectedWidth =
            this.selections.width.key;

        return options.filter(opt => {

            if (!opt.Visibility_Filter__c) {
                return false;
            }

            const rules =
                opt.Visibility_Filter__c.split(';');

            return rules.some(rule => {

                const parts = rule.split('=');

                if (parts.length !== 2) {
                    return false;
                }

                const field =
                    parts[0].trim().toUpperCase();

                const value =
                    parts[1].trim();

                if (field !== 'WIDTH') {
                    return false;
                }

                const allowedWidths =
                    value.split(',')
                        .map(v => v.trim());

                return allowedWidths.includes(selectedWidth);
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

        this.storageTypeOptions =
            this.storageTypeOptions.map(opt => {

                const shouldShow =
                    (opt.value === key && isHovering)
                    || opt.isSelected;

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
            this.storageTypeOptions.find(
                opt => opt.value === key
            );

        this.selectedValue = key;

        this.selectedLabel =
            selectedOption?.label || '';

        this.showNextButton = true;

        this.storageTypeOptions =
            this.storageTypeOptions.map(opt => {

                const isSelected =
                    opt.value === key;

                return {

                    ...opt,

                    isSelected: isSelected,

                    showDesc: isSelected,

                    cardClass:
                        isSelected
                            ? 'height-card selected'
                            : 'height-card'
                };
            });
    }


    handleNext() {

        this.dispatchEvent(

            new CustomEvent(
                'extrastoragetypeselected',
                {
                    detail: {

                        key: this.selectedValue,

                        label: this.selectedLabel
                    }
                }
            )
        );

        this.dispatchEvent(

            new CustomEvent(
                'nextstep',
                {
                    detail: {

                        step: 'EXTRA STORAGE TYPE',

                        payload: {

                            key: this.selectedValue,

                            label: this.selectedLabel
                        }
                    }
                }
            )
        );
    }
}
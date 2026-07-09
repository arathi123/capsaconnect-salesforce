import { LightningElement, track, wire, api } from 'lwc';

import getOptionsByStepAndFamily
from '@salesforce/apex/CartConfiguratorController.getOptionsByStepAndFamily';

export default class ByoPartsSelection extends LightningElement {

    @api productType;

    @api selections;

    @track partsOptions = [];

    selectedPart = '';

    selectedLabel = '';

    showNextButton = false;


    @wire(
        getOptionsByStepAndFamily,
        {
            stepKey: 'Parts',
            productFamily: '$productType'
        }
    )
    wiredOptions({ error, data }) {

        if (data) {

            this.partsOptions =
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
                'Error fetching Parts:',
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

        this.partsOptions =
            this.partsOptions.map(opt => {

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
            this.partsOptions.find(
                opt =>
                    opt.cardkey === key
            );

        this.selectedPart =
            selectedOption
                ? selectedOption.Option_Key__c
                : '';

        this.selectedLabel =
            selectedOption
                ? selectedOption.Option_Label__c
                : '';

        this.showNextButton = true;

        this.partsOptions =
            this.partsOptions.map(opt => {

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

        const selected =
            this.partsOptions.find(
                item =>
                    item.Option_Key__c ===
                    this.selectedPart
            );

        console.log(
            'SELECTED PART => ',
            JSON.stringify(selected)
        );

        this.dispatchEvent(

            new CustomEvent(
                'nextstep',
                {
                    detail: {

                        step: 'Parts',

                        payload: {

                            key:
                                selected?.Option_Key__c || '',

                            label:
                                selected?.Option_Label__c || '',

                            description:
                                selected?.Description__c || ''
                        }
                    }
                }
            )
        );
    }
}
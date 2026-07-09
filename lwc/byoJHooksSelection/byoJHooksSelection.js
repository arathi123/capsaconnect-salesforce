import { LightningElement, track, wire, api } from 'lwc';

import getOptionsByStepAndFamily
from '@salesforce/apex/CartConfiguratorController.getOptionsByStepAndFamily';

export default class ByoJHooksSelection extends LightningElement {

    @api productType;

    @api selections;

    @track jHookOptions = [];

    selectedJHook = '';

    selectedLabel = '';

    showNextButton = false;


    @wire(
        getOptionsByStepAndFamily,
        {
            stepKey: 'JHooks',
            productFamily: '$productType'
        }
    )
    wiredOptions({ error, data }) {

        if (data) {

            this.jHookOptions =
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
                'Error fetching J Hooks:',
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

        this.jHookOptions =
            this.jHookOptions.map(opt => {

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
            this.jHookOptions.find(
                opt =>
                    opt.cardkey === key
            );

        this.selectedJHook =
            selectedOption
                ? selectedOption.Option_Key__c
                : '';

        this.selectedLabel =
            selectedOption
                ? selectedOption.Option_Label__c
                : '';

        this.showNextButton = true;

        this.jHookOptions =
            this.jHookOptions.map(opt => {

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

        this.dispatchEvent(

            new CustomEvent(
                'jhooksselected',
                {
                    detail: {
                        key: this.selectedJHook,
                        label: this.selectedLabel
                    }
                }
            )
        );
    }


    handleNext() {

        const selected =
            this.jHookOptions.find(
                item =>
                    item.Option_Key__c ===
                    this.selectedJHook
            );

        console.log(
            'SELECTED JHOOK => ',
            JSON.stringify(selected)
        );

        this.dispatchEvent(

            new CustomEvent(
                'nextstep',
                {
                    detail: {

                        step: 'JHooks',

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
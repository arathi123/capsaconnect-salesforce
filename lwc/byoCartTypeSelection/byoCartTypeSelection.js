import { LightningElement, api, wire, track } from 'lwc';
import getOptionsByStepAndFamily from '@salesforce/apex/CartConfiguratorController.getOptionsByStepAndFamily';

export default class ByoCartTypeSelection extends LightningElement {
    @api productType;

    @api selections;
    @track allCartOptions = [];

    @track cartOptions = [];
    selectedType = '';
    selectedLabel = '';
    showNextButton = false;

    @wire(getOptionsByStepAndFamily, {
        stepKey: 'CART TYPE',
        productFamily: '$productType'
    })
    wiredOptions({ error, data }) {

        if (data) {

            this.allCartOptions = data;

            this.applyFilterAndSet();

        } else if (error) {

            console.error(
                'Error fetching cart types:',
                error
            );
        }
    }

    applyFilterAndSet() {

        let filteredData =
            this.applyVisibilityFilter(
                this.allCartOptions
            );

        if (!filteredData || filteredData.length === 0) {

            filteredData =
                this.allCartOptions;
        }

        this.cartOptions =
            filteredData.map(opt => ({
                ...opt,
                isVisible: false,
                isSelected: false,
                rowClass: 'option-row'
            }));
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

        const hasWidthFilters =
            options.some(opt =>
                opt.Visibility_Filter__c &&
                opt.Visibility_Filter__c
                    .toUpperCase()
                    .includes('WIDTH=')
            );

        if (!hasWidthFilters) {
            return options;
        }

        return options.filter(opt => {

            if (!opt.Visibility_Filter__c) {
                return false;
            }

            const rules =
                opt.Visibility_Filter__c
                    .split(';');

            return rules.some(rule => {

                const parts =
                    rule.split('=');

                if (parts.length !== 2) {
                    return false;
                }

                const field =
                    parts[0]
                        .trim()
                        .toUpperCase();

                const value =
                    parts[1].trim();

                if (field !== 'WIDTH') {
                    return false;
                }

                const allowedWidths =
                    value.split(',')
                        .map(v => v.trim());

                return allowedWidths
                    .includes(selectedWidth);
            });
        });
    }

    handleMouseEnter(event) {
        const key = event.currentTarget.dataset.key;
        this.toggleDescription(key, true);
    }

    handleMouseLeave(event) {
        const key = event.currentTarget.dataset.key;
        this.toggleDescription(key, false);
    }

    /**
     * Updated Logic: 
     * Description is visible if (Current Card is Hovered) OR (Current Card is Selected)
     */
    toggleDescription(key, isHovering) {
        this.cartOptions = this.cartOptions.map(opt => {
            const shouldBeVisible = (opt.Option_Key__c === key && isHovering) || opt.isSelected;
            return { ...opt, isVisible: shouldBeVisible };
        });
    }

    handleSelect(event) {
        const key = event.currentTarget.dataset.key;
        const selectedOption = this.cartOptions.find(opt => opt.Option_Key__c === key);

        this.selectedType = key;
        this.selectedLabel = selectedOption ? selectedOption.Option_Label__c : '';
        this.nextStepOverride = selectedOption ? selectedOption.Next_Step_Override__c : '';
        this.showNextButton = true;

        this.cartOptions = this.cartOptions.map(opt => {
            const isSelected = opt.Option_Key__c === key;
            return { 
                ...opt, 
                isSelected: isSelected,
                isVisible: isSelected, 
                rowClass: isSelected ? 'option-row selected' : 'option-row'
            };
        });

        this.dispatchEvent(new CustomEvent('typeselected', { 
            detail: { 
                key: this.selectedType, 
                label: this.selectedLabel,
                nextStepOverride: this.nextStepOverride
            } 
        }));
    }

    handleNext() {
        this.dispatchEvent(new CustomEvent('nextstep', {
            detail: { 
                step: 'CARTTYPE', // Changed to match a specific key
                payload: { 
                    key: this.selectedType, 
                    label: this.selectedLabel 
                },
                goTo: this.nextStepOverride
            }
        }));
    }
}
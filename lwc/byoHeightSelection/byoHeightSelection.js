import { LightningElement, track, wire, api } from 'lwc';
import getOptionsByStepAndFamily from '@salesforce/apex/CartConfiguratorController.getOptionsByStepAndFamily';

export default class ByoHeightSelection extends LightningElement {
    @api productType;

    // ✅ NEW: receive selections from parent
    @api selections;

    @track heightOptions = [];
    @track allHeightOptions = []; // ✅ NEW: store original data

    selectedHeight = '';
    selectedLabel = '';
    showNextButton = false;

    @wire(getOptionsByStepAndFamily, { stepKey: 'HEIGHT', productFamily: '$productType' })
    wiredOptions({ error, data }) {
        if (data) {

            // ✅ store original data
            this.allHeightOptions = data;

            // ✅ apply filter
            this.applyFilterAndSet();

        } else if (error) {
            console.error('Error fetching height options:', error);
        }
    }

    // ✅ NEW FUNCTION (FILTER + MAP)
    applyFilterAndSet() {

        let filteredData = this.applyVisibilityFilter(this.allHeightOptions);

        // ✅ FALLBACK (important)
        if (!filteredData || filteredData.length === 0) {
            filteredData = this.allHeightOptions;
        }

        this.heightOptions = filteredData.map(opt => ({
            ...opt,
            cardkey: opt.Option_Key__c + opt.Option_Label__c, // ✅ NEW unique key for card
            showDesc: false,
            isSelected: false,
            cardClass: 'height-card'
        }));
    }

    applyVisibilityFilter(options) {

        // M-Series & VE-Series TC Rule
        if (
            (this.productType === 'M-Series' ||
            this.productType === 'VE-Series') &&
            this.selections?.cartType?.key === 'TC'
        ) {
            return options.filter(opt =>
                opt.Option_Key__c === '10'
            );
        }

            // VE 4X Rule
        if (
            this.productType === 'VE-Series' &&
            this.selections?.width?.key === '4x'
        ) {

            return options.filter(opt =>
                opt.Option_Key__c === '10'
            );
    }


        // MEDICATION
            if (
                this.productType !== 'M-Series' &&
                this.productType !== 'VE-Series'
            ) {

            if (!this.selections?.width?.key) {
                return options;
            }

            const selectedWidth =
                this.selections.width.key;

            const hasWidthFilters = options.some(opt =>
                opt.Visibility_Filter__c &&
                opt.Visibility_Filter__c.toUpperCase().includes('WIDTH=')
            );

            if (!hasWidthFilters) {
                return options;
            }

            return options.filter(opt => {

                if (!opt.Visibility_Filter__c) {
                    return false;
                }

                const rules = opt.Visibility_Filter__c.split(';');

                return rules.some(rule => {

                    const parts = rule.split('=');

                    if (parts.length !== 2) {
                        return false;
                    }

                    const field = parts[0].trim().toUpperCase();
                    const value = parts[1].trim();

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

        // M-SERIES
        if (!this.selections?.cartType?.key) {
            return options;
        }

        const selectedUseCase =
            this.selections.cartType.key;

        const hasUseCaseFilters = options.some(opt =>
            opt.Visibility_Filter__c &&
            opt.Visibility_Filter__c.toUpperCase().includes('USECASE=')
        );

        if (!hasUseCaseFilters) {
            return options;
        }

        return options.filter(opt => {

            if (!opt.Visibility_Filter__c) {
                return false;
            }

            const rules = opt.Visibility_Filter__c.split(';');

            return rules.some(rule => {

                const parts = rule.split('=');

                if (parts.length !== 2) {
                    return false;
                }

                const field = parts[0].trim().toUpperCase();
                const value = parts[1].trim();

                if (field !== 'USECASE') {
                    return false;
                }

                const allowedUseCases =
                    value.split(',')
                        .map(v => v.trim());

                return allowedUseCases.includes(selectedUseCase);
            });
        });
    }

    handleMouseEnter(event) {
        this.toggleDesc(event.currentTarget.dataset.key, true);
    }

    handleMouseLeave(event) {
        this.toggleDesc(event.currentTarget.dataset.key, false);
    }

    toggleDesc(key, isHovering) {
        this.heightOptions = this.heightOptions.map(opt => {
            const shouldShow = (opt.cardkey === key && isHovering) || opt.isSelected;
            return { ...opt, showDesc: shouldShow };
        });
    }

  handleSelect(event) {
        const key = event.currentTarget.dataset.key;
        const selectedOption = this.heightOptions.find(opt => opt.cardkey === key);
        
        this.selectedHeight = selectedOption ? selectedOption.Option_Key__c : '';
        this.selectedLabel = selectedOption ? selectedOption.Option_Label__c : '';
        this.showNextButton = true;

        this.heightOptions = this.heightOptions.map(opt => {
            const isSelected = opt.cardkey === key;
            return {
                ...opt,
                isSelected: isSelected,
                showDesc: isSelected, 
                cardClass: isSelected ? 'height-card selected' : 'height-card'
            };
        });

        this.dispatchEvent(new CustomEvent('heightselected', { 
            detail: { key: this.selectedHeight, label: this.selectedLabel }
        }));
    }

    handleNext() {
        this.dispatchEvent(new CustomEvent('nextstep', {
            detail: {
                step: 'HEIGHT',
                payload: { key: this.selectedHeight, label: this.selectedLabel }
            }
        }));
    }
}
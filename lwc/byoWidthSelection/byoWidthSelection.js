import { LightningElement, track, wire, api } from 'lwc';
import getOptionsByStepAndFamily from '@salesforce/apex/CartConfiguratorController.getOptionsByStepAndFamily';

export default class ByoWidthSelection extends LightningElement {
    @api productType;

    //  receive selections
    @api selections;

    @track widthOptions = [];
    @track allWidthOptions = []; //  NEW

    selectedWidth = '';
    selectedLabel = '';
    showNextButton = false;

    //  FETCH DATA
    @wire(getOptionsByStepAndFamily, { stepKey: 'WIDTH', productFamily: '$productType' })
    wiredOptions({ error, data }) {

        console.log(' WIDTH wire triggered');

        if (data) {
            console.log(' RAW WIDTH DATA:', JSON.stringify(data));

            this.allWidthOptions = data;

            this.applyFilterAndSet();

        } else if (error) {
            console.error(' Width Error:', error);
        }
    }

    //  APPLY FILTER + MAP
    applyFilterAndSet() {

        console.log('🟣 Applying WIDTH filter...');
        console.log('🟣 Selections:', JSON.stringify(this.selections));

        let filteredData = this.applyVisibilityFilter(this.allWidthOptions);

        //  FALLBACK (same as height)
        if (!filteredData || filteredData.length === 0) {
            console.log('⚠️ WIDTH fallback → showing all');
            filteredData = this.allWidthOptions;
        }

        this.widthOptions = filteredData.map(opt => ({
            ...opt,
            showDesc: false,
            isSelected: false,
            cardClass: 'width-card'
        }));

        console.log('Final WIDTH:', JSON.stringify(this.widthOptions));
    }

        applyVisibilityFilter(options) {

        if (!this.selections?.cartType?.label) {
            return options;
        }

        const selectedUseCase =
            this.selections.cartType.label;

        // Check whether any record contains USECASE filter
        const hasUseCaseFilters = options.some(opt =>
            opt.Visibility_Filter__c &&
            opt.Visibility_Filter__c.toUpperCase().includes('USECASE=')
        );

        // No filters configured -> show all
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

                const allowedValues =
                    value.split(',')
                        .map(v => v.trim());

                return allowedValues.includes(selectedUseCase);
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
        this.widthOptions = this.widthOptions.map(opt => {
            const shouldShow = (opt.Option_Key__c === key && isHovering) || opt.isSelected;
            return { ...opt, showDesc: shouldShow };
        });
    }

    //  DO NOT CHANGE (kept same)
    handleSelect(event) {
        const key = event.currentTarget.dataset.key;
        const selectedOption = this.widthOptions.find(opt => opt.Option_Key__c === key);
        
        this.selectedWidth = key;
        this.selectedLabel = selectedOption ? selectedOption.Option_Label__c : '';
        this.showNextButton = true;

        this.widthOptions = this.widthOptions.map(opt => {
            const isSelected = opt.Option_Key__c === key;
            return {
                ...opt,
                isSelected: isSelected,
                showDesc: isSelected,
                cardClass: isSelected ? 'width-card selected' : 'width-card'
            };
        });

        this.dispatchEvent(new CustomEvent('widthselected', { 
            detail: { key: key, label: this.selectedLabel }
        }));
    }

    handleNext() {
        this.dispatchEvent(new CustomEvent('nextstep', {
            detail: { 
                step: 'WIDTH', 
                payload: { key: this.selectedWidth, label: this.selectedLabel } 
            }
        }));
    }
}
import { LightningElement, track, wire, api } from 'lwc';
import getOptionsByStepAndFamily from '@salesforce/apex/CartConfiguratorController.getOptionsByStepAndFamily';

export default class ByoColorSelection extends LightningElement {
    @api productType;

    //  SAME AS HEIGHT & LOCK
    @api selections;

    @track colorOptions = [];
    @track allColorOptions = []; // store original

    selectedColor = '';
    selectedLabel = '';
    showNextButton = false;

    // FETCH DATA
    @wire(getOptionsByStepAndFamily, { stepKey: 'COLOR', productFamily: '$productType' })
    wiredOptions({ error, data }) {
        console.log(' COLOR wire triggered');

        if (data) {
            console.log(' RAW COLOR DATA:', JSON.stringify(data));

            this.allColorOptions = data;

            this.applyFilterAndSet();

        } else if (error) {
            console.error(' Error fetching color options:', error);
        }
    }

    // APPLY FILTER + MAP
    applyFilterAndSet() {

        console.log(' Applying COLOR filter...');
        console.log(' Current selections:', JSON.stringify(this.selections));

        let filteredData = this.applyVisibilityFilter(this.allColorOptions);

        // FALLBACK (IMPORTANT)
        if (!filteredData || filteredData.length === 0) {
            console.log('⚠️ No results after filter → fallback to ALL');
            filteredData = this.allColorOptions;
        }

        console.log(' Filtered count:', filteredData.length);

        this.colorOptions = filteredData.map(opt => ({
            ...opt,
            isSelected: false,
            cardClass: 'color-card'
        }));

        console.log(' Final Color Options:', JSON.stringify(this.colorOptions));
    }

    applyVisibilityFilter(options) {

        // MEDICATION
        if (
                this.productType !== 'M-Series' &&
                this.productType !== 'VE-Series'
            ){

            if (!this.selections?.series?.key) {
                return options;
            }

            const selectedSeries =
                this.selections.series.key;

            const hasSeriesFilters = options.some(opt =>
                opt.Visibility_Filter__c &&
                opt.Visibility_Filter__c.toUpperCase().includes('SERIES=')
            );

            if (!hasSeriesFilters) {
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

                    if (field !== 'SERIES') {
                        return false;
                    }

                    return value
                        .split(',')
                        .map(v => v.trim())
                        .includes(selectedSeries);
                });
            });
        }

        // M-SERIES
        if (!this.selections?.lock?.key) {
            return options;
        }

        const selectedLock =
            this.selections.lock.key;

        const hasLockFilters = options.some(opt =>
            opt.Visibility_Filter__c &&
            opt.Visibility_Filter__c.toUpperCase().includes('LOCK=')
        );

        if (!hasLockFilters) {
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

                if (field !== 'LOCK') {
                    return false;
                }

                return value
                    .split(',')
                    .map(v => v.trim())
                    .includes(selectedLock);
            });
        });
    }

    //  SAME CLICK BEHAVIOR (DO NOT CHANGE)
    handleSelect(event) {
        const key = event.currentTarget.dataset.key;
        const selectedOption = this.colorOptions.find(opt => opt.Option_Key__c === key);

        console.log('Selected Color:', key);

        this.selectedColor = key;
        this.selectedLabel = selectedOption ? selectedOption.Option_Label__c : '';
        this.showNextButton = true;

        this.colorOptions = this.colorOptions.map(opt => {
            const isSelected = opt.Option_Key__c === key;
            return {
                ...opt,
                isSelected: isSelected,
                cardClass: isSelected ? 'color-card selected' : 'color-card'
            };
        });

        this.dispatchEvent(new CustomEvent('colorselected', {
            detail: { key: this.selectedColor, label: this.selectedLabel }
        }));
    }

    handleNext() {
        console.log('COLOR NEXT clicked');

        this.dispatchEvent(new CustomEvent('nextstep', {
            detail: {
                step: 'COLOR',
                payload: {
                    key: this.selectedColor,
                    label: this.selectedLabel
                }
            }
        }));
    }
}
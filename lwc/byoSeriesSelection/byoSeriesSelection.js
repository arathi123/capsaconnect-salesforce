import { LightningElement, track, wire, api } from 'lwc';
import getOptionsByStepAndFamily from '@salesforce/apex/CartConfiguratorController.getOptionsByStepAndFamily';

export default class ByoSeriesSelection extends LightningElement {
    @api productType;

    // ✅ NEW (same as other steps)
    @api selections;

    @track seriesOptions = [];
    @track allSeriesOptions = []; // ✅ store original

    selectedSeries = '';
    selectedLabel = '';
    showNextButton = false;

    // Uses SERIES as the step key
    @wire(getOptionsByStepAndFamily, { stepKey: 'SERIES', productFamily: '$productType' })
    wiredOptions({ error, data }) {
        console.log('🟡 SERIES wire triggered');

        if (data) {
            console.log('🟢 RAW SERIES DATA:', JSON.stringify(data));

            // ✅ store original
            this.allSeriesOptions = data;

            // ✅ apply filter
            this.applyFilterAndSet();

        } else if (error) {
            console.error('🔴 Error fetching series options:', error);
        }
    }

    // ✅ NEW: APPLY FILTER + MAP (same pattern)
    applyFilterAndSet() {

        console.log('🟣 Applying SERIES filter...');
        console.log('🟣 Current selections:', JSON.stringify(this.selections));

        let filteredData = this.applyVisibilityFilter(this.allSeriesOptions);

        // ✅ FALLBACK
        if (!filteredData || filteredData.length === 0) {
            console.log('⚠️ No results after filter → fallback to ALL');
            filteredData = this.allSeriesOptions;
        }

        console.log('🟣 Filtered count:', filteredData.length);

        this.seriesOptions = filteredData.map(opt => ({
            ...opt,
            showDesc: false,
            isSelected: false,
            cardClass: 'series-card'
        }));

        console.log('🔵 Final Series Options:', JSON.stringify(this.seriesOptions));
    }

    // ✅ FILTER ENGINE (USECASE ONLY — SAME AS OTHERS)
    applyVisibilityFilter(options) {

        if (!this.selections?.lock?.key) {
            return options;
        }

        const selectedLock =
            this.selections.lock.key;

        // Check whether any record contains LOCK filter
        const hasLockFilters = options.some(opt =>
            opt.Visibility_Filter__c &&
            opt.Visibility_Filter__c.toUpperCase().includes('LOCK=')
        );

        // No LOCK filters configured -> show all
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

                const allowedLocks =
                    value.split(',')
                        .map(v => v.trim());

                return allowedLocks.includes(selectedLock);
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
        this.seriesOptions = this.seriesOptions.map(opt => {
            const shouldShow = (opt.Option_Key__c === key && isHovering) || opt.isSelected;            
            return { ...opt, showDesc: shouldShow };
        });
    }

    handleSelect(event) {
        const key = event.currentTarget.dataset.key;
        const selectedOption = this.seriesOptions.find(opt => opt.Option_Key__c === key);
        
        this.selectedSeries = key;
        this.selectedLabel = selectedOption ? selectedOption.Option_Label__c : '';
        this.showNextButton = true;

        this.seriesOptions = this.seriesOptions.map(opt => {
            const isSelected = opt.Option_Key__c === key;
            return {
                ...opt,
                isSelected: isSelected,
                showDesc: isSelected, 
                cardClass: isSelected ? 'series-card selected' : 'series-card'
            };
        });

        this.dispatchEvent(new CustomEvent('seriesselected', { 
            detail: { key: key, label: this.selectedLabel }
        }));
    }

    handleNext() {
        this.dispatchEvent(new CustomEvent('nextstep', {
            detail: { step: 'SERIES', payload: { key: this.selectedSeries, label: this.selectedLabel } }
        }));
    }
}
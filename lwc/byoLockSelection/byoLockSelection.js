import { LightningElement, track, wire, api } from 'lwc';
import getOptionsByStepAndFamily from '@salesforce/apex/CartConfiguratorController.getOptionsByStepAndFamily';

export default class ByoLockSelection extends LightningElement {
    @api productType;

    // ✅ SAME AS HEIGHT (IMPORTANT)
    @api selections;

    @track lockOptions = [];
    @track allLockOptions = []; // store original

    selectedLock = '';
    selectedLabel = '';
    showNextButton = false;

    // 🔥 FETCH DATA
    @wire(getOptionsByStepAndFamily, { stepKey: 'LOCK', productFamily: '$productType' })
    wiredOptions({ error, data }) {
        console.log('🟡 LOCK wire triggered');

        if (data) {
            console.log('🟢 RAW LOCK DATA:', JSON.stringify(data));

            this.allLockOptions = data;

            this.applyFilterAndSet();

        } else if (error) {
            console.error('🔴 Error fetching lock options:', error);
        }
    }

    // ✅ APPLY FILTER + MAP
    applyFilterAndSet() {

        console.log('🟣 Applying LOCK filter...');
        console.log('🟣 Current selections:', JSON.stringify(this.selections));

        let filteredData = this.applyVisibilityFilter(this.allLockOptions);

        // ✅ FALLBACK
        if (!filteredData || filteredData.length === 0) {
            console.log('⚠️ No results after filter → fallback to ALL');
            filteredData = this.allLockOptions;
        }

        console.log('🟣 Filtered count:', filteredData.length);

        this.lockOptions = filteredData.map(opt => ({
            ...opt,
            showDesc: false,
            isSelected: false,
            cardClass: 'lock-card'
        }));

        console.log('🔵 Final Lock Options:', JSON.stringify(this.lockOptions));
    }

    applyVisibilityFilter(options) {

        if (!this.selections?.height?.key) {
            return options;
        }

        const selectedHeight =
            this.selections.height.key;

        // Check whether any record contains HEIGHT filter
        const hasHeightFilters = options.some(opt =>
            opt.Visibility_Filter__c &&
            opt.Visibility_Filter__c.toUpperCase().includes('HEIGHT=')
        );

        // No HEIGHT filters configured -> show all
        if (!hasHeightFilters) {
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

                if (field !== 'HEIGHT') {
                    return false;
                }

                const allowedHeights =
                    value.split(',')
                        .map(v => v.trim());

                return allowedHeights.includes(selectedHeight);
            });
        });
    }

    // ✅ SAME CLICK PATTERN AS HEIGHT (DO NOT CHANGE)
    handleSelect(event) {
        const key = event.currentTarget.dataset.key;
        const selectedOption = this.lockOptions.find(opt => opt.Option_Key__c === key);

        console.log('🟢 Selected Lock:', key);

        this.selectedLock = key;
        this.selectedLabel = selectedOption
            ? selectedOption.Option_Label__c + ' (' + selectedOption.Option_Key__c + ')'
            : '';

        this.showNextButton = true;

        this.lockOptions = this.lockOptions.map(opt => {
            const isSelected = opt.Option_Key__c === key;
            return {
                ...opt,
                isSelected: isSelected,
                showDesc: isSelected,
                cardClass: isSelected ? 'lock-card selected' : 'lock-card'
            };
        });

        this.dispatchEvent(new CustomEvent('lockselected', {
            detail: { key: key, label: this.selectedLabel }
        }));
    }

    handleNext() {
        console.log('➡️ LOCK NEXT clicked');

        this.dispatchEvent(new CustomEvent('nextstep', {
            detail: {
                step: 'LOCK',
                payload: { key: this.selectedLock, label: this.selectedLabel }
            }
        }));
    }
}
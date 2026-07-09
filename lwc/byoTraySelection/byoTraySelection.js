import { LightningElement, api, wire, track } from 'lwc';
import getOptionsByStepAndFamily from '@salesforce/apex/CartConfiguratorController.getOptionsByStepAndFamily';

export default class ByoTraySelection extends LightningElement {
    @api productType;

    // NEW (same as others)
    @api selections;

    @track trayOptions = [];
    @track allTrayOptions = []; // store original

    selectedKey = '';
    selectedLabel = '';
    showNextButton = false;

    @wire(getOptionsByStepAndFamily, { stepKey: 'TRAY', productFamily: '$productType' })
    wiredOptions({ error, data }) {
        console.log('TRAY wire triggered');

        if (data) {
            console.log('🟢 RAW TRAY DATA:', JSON.stringify(data));

            // store original data
            this.allTrayOptions = data;

            // apply filter
            this.applyFilterAndSet();

        } else if (error) {
            console.error(' Error fetching tray options:', error);
        }
    }

    //  APPLY FILTER + MAP
    applyFilterAndSet() {

        console.log(' Applying TRAY filter...');
        console.log(' Selections:', JSON.stringify(this.selections));

        let filteredData = this.applyVisibilityFilter(this.allTrayOptions);

        //  FALLBACK (important)
        if (!filteredData || filteredData.length === 0) {
            console.log('⚠️ No results after filter → fallback to ALL');
            filteredData = this.allTrayOptions;
        }

        console.log('🟣 Filtered count:', filteredData.length);

        this.trayOptions = filteredData.map(opt => ({
            ...opt,
            showDesc: false,
            isSelected: false,
            cardClass: 'tray-card'
        }));

        console.log('🔵 Final Tray Options:', JSON.stringify(this.trayOptions));
    }

    //  FINAL FILTER (USECASE BASED — SAME AS ALL COMPONENTS)
    applyVisibilityFilter(options) {

        console.log(' Running TRAY USECASE filter...');
        console.log(' Selections:', JSON.stringify(this.selections));

        if (!this.selections || !this.selections.cartType?.label) {
            return options;
        }

        const selectedUseCase = this.selections.cartType.label;

        //  check if any record matches THIS usecase
        const hasMatchingUseCaseFilter = options.some(opt => {
            if (!opt.Visibility_Filter__c) return false;

            return opt.Visibility_Filter__c
                .split(';')
                .some(rule => {
                    const parts = rule.split('=');
                    if (parts.length !== 2) return false;

                    const field = parts[0].trim().toUpperCase();
                    const value = parts[1].trim();

                    return field === 'USECASE' && value === selectedUseCase;
                });
        });

        console.log('🟣 TRAY strict mode:', hasMatchingUseCaseFilter);

        return options.filter(opt => {

            //  CASE 1 → no matching filter → show ALL
            if (!hasMatchingUseCaseFilter) {
                return true;
            }

            // CASE 2 → strict mode → hide non-filtered
            if (!opt.Visibility_Filter__c) {
                console.log('❌ TRAY excluded (no filter):', opt.Option_Label__c);
                return false;
            }

            const rules = opt.Visibility_Filter__c.split(';');

            return rules.some(rule => {
                const parts = rule.split('=');
                if (parts.length !== 2) return false;

                const field = parts[0].trim().toUpperCase();
                const value = parts[1].trim();

                if (field === 'USECASE') {
                    const match = selectedUseCase === value;
                    console.log(`➡️ TRAY USECASE: ${selectedUseCase} === ${value} → ${match}`);
                    return match;
                }

                return false;
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
        this.trayOptions = this.trayOptions.map(opt => {
            const shouldShow = (opt.Option_Key__c === key && isHovering) || opt.isSelected;
            return { ...opt, showDesc: shouldShow };
        });
    }

    handleSelect(event) {
        const key = event.currentTarget.dataset.key;
        const selectedOption = this.trayOptions.find(opt => opt.Option_Key__c === key);
        
        this.selectedKey = key;
        this.selectedLabel = selectedOption ? selectedOption.Option_Label__c : '';
        this.showNextButton = true;

        this.trayOptions = this.trayOptions.map(opt => {
            const isSelected = opt.Option_Key__c === key;
            return {
                ...opt,
                isSelected: isSelected,
                showDesc: isSelected,
                cardClass: isSelected ? 'tray-card selected' : 'tray-card'
            };
        });

        this.dispatchEvent(new CustomEvent('trayselected', { 
            detail: { 
                key: this.selectedKey, 
                label: this.selectedLabel 
            } 
        }));
    }

    handleNext() {
        this.dispatchEvent(new CustomEvent('nextstep', {
            detail: { 
                step: 'TRAY', 
                payload: { 
                    key: this.selectedKey, 
                    label: this.selectedLabel 
                } 
            }
        }));
    }
}
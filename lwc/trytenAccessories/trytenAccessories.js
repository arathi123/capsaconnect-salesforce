import { LightningElement, track, api, wire } from 'lwc';
import getOptionsByStepAndFamily from '@salesforce/apex/CartConfiguratorController.getOptionsByStepAndFamily';

export default class TrytenAccessories extends LightningElement {
    @api productType = 'Tryten';
    @api selections; 

    @track accessories = [];
    @track isNoneSelected = false;
    @track isLoading = true;

    @wire(getOptionsByStepAndFamily, { stepKey: 'ACCESSORY', productFamily: '$productType' })
    wiredAccessories({ error, data }) {
        if (data) {
            this.processAccessories(data);
        } else if (error) {
            console.error('Error fetching accessories:', error);
            this.isLoading = false;
        }
    }

    processAccessories(data) {
        const filtered = data.filter(opt => this.matchesFilter(opt.Visibility_Filter__c));
        
        this.accessories = filtered.map(opt => ({
            ...opt,
            isSelected: false,
            wrapperClass: 'accessory-item'
        }));
        
        this.isLoading = false;
    }

    matchesFilter(filterStr) {
        if (!filterStr) return true; 
        
        const rules = filterStr.split(';').map(s => s.trim());
        const reqMap = {};
        
        rules.forEach(rule => {
            const parts = rule.split('=');
            if (parts.length === 2) {
                const key = parts[0].trim();
                const val = parts[1].trim();
                if (!reqMap[key]) reqMap[key] = [];
                reqMap[key].push(val);
            }
        });

        for (const key of Object.keys(reqMap)) {
            if (!this.selections || !this.selections[key]) return false; 
            if (!reqMap[key].includes(this.selections[key])) return false;
        }
        return true;
    }

    handleSelect(event) {
        const optKey = event.currentTarget.dataset.key;

        if (optKey === 'NONE') {
            this.isNoneSelected = !this.isNoneSelected;
            
            if (this.isNoneSelected) {
                this.accessories = this.accessories.map(opt => ({
                    ...opt,
                    isSelected: false,
                    wrapperClass: 'accessory-item'
                }));
            }
        } else {
            let anySelected = false;
            this.accessories = this.accessories.map(opt => {
                if (opt.Option_Key__c === optKey) {
                    const newStatus = !opt.isSelected;
                    if (newStatus) anySelected = true;
                    return {
                        ...opt,
                        isSelected: newStatus,
                        wrapperClass: newStatus ? 'accessory-item selected' : 'accessory-item'
                    };
                }
                if (opt.isSelected) anySelected = true;
                return opt;
            });

            if (anySelected) {
                this.isNoneSelected = false;
            }
        }
    }

    get noneWrapperClass() {
        return this.isNoneSelected ? 'accessory-item none-option selected' : 'accessory-item none-option';
    }

    handleNext() {
        const selectedAccs = this.accessories
            .filter(opt => opt.isSelected)
            .map(opt => ({
                key: opt.Option_Key__c,
                label: opt.Option_Label__c
            }));

        if (this.isNoneSelected) {
            selectedAccs.push({ key: 'NONE', label: 'None' });
        }

        if (selectedAccs.length === 0) {
            // Optional: prevent proceeding without selection
            return; 
        }

        this.dispatchEvent(new CustomEvent('accessorystepcomplete', {
            detail: selectedAccs
        }));
    }
}
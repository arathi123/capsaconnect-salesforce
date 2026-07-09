import { LightningElement, api, wire, track } from 'lwc';
import getOptionsByStepAndFamily from '@salesforce/apex/CartConfiguratorController.getOptionsByStepAndFamily';

export default class CapsaTableTopUnit extends LightningElement {
    @api productType;
    @track allOptions = [];
    selectedKey = '';
    selectedLabel = '';
    isLoading = true;

    @wire(getOptionsByStepAndFamily, {
        stepKey: 'TableTopUnit',
        productFamily: '$productType'
    })
    wiredOptions({ error, data }) {
        if (data) {
            this.allOptions = data.map(opt => ({
                ...opt,
                isSelected: false,
                cardClass: 'option-card'
            }));
            this.isLoading = false;
        } else if (error) {
            console.error('Error fetching table top unit options:', error);
            this.isLoading = false;
        }
    }

    getSectionOptions(labelName) {
        return this.allOptions
            .filter(opt => opt.Option_Label__c === labelName)
            .map(opt => ({
                ...opt,
                isSelected: this.selectedKey === opt.Option_Key__c,
                cardClass: this.selectedKey === opt.Option_Key__c
                    ? 'option-card selected'
                    : 'option-card'
            }));
    }

    get kl1Options()     { return this.getSectionOptions('KL1 Table Top Counter'); }
    get kl1PlusOptions() { return this.getSectionOptions('KL1 PLUS Table Top Counter'); }
    get kl1vOptions()    { return this.getSectionOptions('KL1v Table Top Counter'); }

    get isComplete() { return !!this.selectedKey; }

    handleSelect(event) {
        const key = event.currentTarget.dataset.key;
        this.selectedKey = key;
        const opt = this.allOptions.find(o => o.Option_Key__c === key);
        this.selectedLabel = opt
            ? opt.Option_Label__c + ' - ' + opt.Description__c
            : key;
        this.allOptions = [...this.allOptions];
        this.dispatchEvent(new CustomEvent('typeselected', {
            detail: { key: this.selectedKey, label: this.selectedLabel }
        }));
    }

    handleNext() {
        this.dispatchEvent(new CustomEvent('nextstep', {
            detail: {
                step: 'TABLETOPUNIT',
                payload: { key: this.selectedKey, label: this.selectedLabel }
            }
        }));
    }
}
import { LightningElement, api, wire, track } from 'lwc';
import getOptionsByStepAndFamily from '@salesforce/apex/CartConfiguratorController.getOptionsByStepAndFamily';

export default class CapsaService extends LightningElement {
    @api productType;
    @track allOptions = [];
    selectedKey = '';
    selectedLabel = '';
    isLoading = true;

    @wire(getOptionsByStepAndFamily, {
        stepKey: 'Service',
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
            console.error('Error fetching service options:', error);
            this.isLoading = false;
        }
    }

    get isComplete() { return !!this.selectedKey; }

    get mappedOptions() {
        return this.allOptions.map(opt => ({
            ...opt,
            isSelected: this.selectedKey === opt.Option_Key__c,
            cardClass: this.selectedKey === opt.Option_Key__c
                ? 'option-card selected'
                : 'option-card'
        }));
    }

    handleSelect(event) {
        const key = event.currentTarget.dataset.key;
        this.selectedKey = key;
        const opt = this.allOptions.find(o => o.Option_Key__c === key);
        this.selectedLabel = opt
            ? opt.Option_Label__c + ' - ' + opt.Description__c
            : key;
        this.allOptions = [...this.allOptions];
        this.dispatchEvent(new CustomEvent('serviceselected', {
            detail: { key: this.selectedKey, label: this.selectedLabel }
        }));
    }

    handleNext() {
        this.dispatchEvent(new CustomEvent('nextstep', {
            detail: {
                step: 'SERVICE',
                payload: { key: this.selectedKey, label: this.selectedLabel }
            }
        }));
    }
}
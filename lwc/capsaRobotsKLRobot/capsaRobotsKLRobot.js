import { LightningElement, api, track } from 'lwc';
import getOptionsByStepAndFamily from '@salesforce/apex/CartConfiguratorController.getOptionsFresh';

export default class CapsaRobotsKLRobot extends LightningElement {
    @api productType = 'Robots';
    @api selections;

    @track _options = [];
    @track selectedKey = '';
    @track isLoading = true;

    connectedCallback() {
        getOptionsByStepAndFamily({ stepKey: 'KLRobot', productFamily: this.productType || 'Robots' })
            .then(data => {
                this._options = (data || []).map(opt => ({
                    ...opt,
                    isSelected: false,
                    rowClass: 'option-row'
                }));
                this.isLoading = false;
            })
            .catch(error => {
                console.error('Error fetching KL Robot options:', error);
                this.isLoading = false;
            });
    }

    get options() {
        return this._options.map(opt => ({
            ...opt,
            isSelected: opt.Option_Key__c === this.selectedKey,
            rowClass: opt.Option_Key__c === this.selectedKey ? 'option-row selected' : 'option-row'
        }));
    }

    get showNextButton() {
        return this.selectedKey !== '';
    }

    handleSelect(event) {
        this.selectedKey = event.currentTarget.dataset.key;
    }

    handleNext() {
        const selectedOpt = this._options.find(o => o.Option_Key__c === this.selectedKey);
        const payload = selectedOpt ? [{ key: selectedOpt.Option_Key__c, label: selectedOpt.Option_Label__c }] : [];

        this.dispatchEvent(new CustomEvent('stepcomplete', {
            detail: { KLRobot: payload }
        }));
    }
}
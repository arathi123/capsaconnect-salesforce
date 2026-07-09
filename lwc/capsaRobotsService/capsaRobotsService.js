import { LightningElement, api, track } from 'lwc';
import getOptionsByStepAndFamily from '@salesforce/apex/CartConfiguratorController.getOptionsFresh';

export default class CapsaRobotsService extends LightningElement {
    @api productType = 'Robots';
    @api selections;

    @track _options = [];
    @track isLoading = true;

    connectedCallback() {
        getOptionsByStepAndFamily({ stepKey: 'Service', productFamily: this.productType || 'Robots' })
            .then(data => {
                this._options = (data || []).map(opt => ({
                    ...opt,
                    uiKey: opt.Option_Key__c,
                    isSelected: false,
                    wrapperClass: 'option-item'
                }));
                this.isLoading = false;
            })
            .catch(error => {
                console.error('Error fetching Service options:', error);
                this.isLoading = false;
            });
    }

    get showNextButton() {
        return this._options.some(o => o.isSelected);
    }

    handleToggle(event) {
        const key = event.target.dataset.id;
        this._options = this._options.map(opt => {
            if (opt.uiKey !== key) return opt;
            const isSelected = !opt.isSelected;
            return { ...opt, isSelected, wrapperClass: isSelected ? 'option-item selected' : 'option-item' };
        });
    }

    handleNext() {
        const selected = this._options
            .filter(o => o.isSelected)
            .map(o => ({ key: o.Option_Key__c, label: o.Option_Label__c }));

        this.dispatchEvent(new CustomEvent('stepcomplete', {
            detail: { RobotsService: selected }
        }));
    }
}
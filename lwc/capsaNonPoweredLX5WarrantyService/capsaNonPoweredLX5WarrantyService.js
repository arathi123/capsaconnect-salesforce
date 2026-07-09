import { LightningElement, api, track } from 'lwc';
import getOptionsFresh from '@salesforce/apex/CartConfiguratorController.getOptionsFresh';

export default class CapsaNonPoweredLX5WarrantyService extends LightningElement {
    @api productType = 'NonPoweredLX5';
    @api selections;
    @track _options = [];
    @track selectedKey = '';
    @track isLoading = true;

    connectedCallback() {
        getOptionsFresh({ stepKey: 'WarrantyService', productFamily: this.productType || 'NonPoweredLX5' })
            .then(data => {
                this._options = (data || []).map(opt => ({ ...opt, isSelected: false, rowClass: 'option-row' }));
                if (this.selections && this.selections.WarrantyService && this.selections.WarrantyService.length > 0) {
                    this.selectedKey = this.selections.WarrantyService[0].key;
                }
                this.isLoading = false;
            })
            .catch(error => {
                console.error('Error fetching WarrantyService options:', error);
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

    get showNextButton() { return this.selectedKey !== ''; }

    handleSelect(event) { this.selectedKey = event.currentTarget.dataset.key; }

    handleNext() {
        const selectedOpt = this._options.find(o => o.Option_Key__c === this.selectedKey);
        const payload = selectedOpt ? [{ key: selectedOpt.Option_Key__c, label: selectedOpt.Option_Label__c }] : [];
        this.dispatchEvent(new CustomEvent('stepcomplete', { detail: { WarrantyService: payload } }));
    }
}
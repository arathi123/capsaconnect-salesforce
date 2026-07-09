import { LightningElement, api, track } from 'lwc';

export default class ByoDividerModal extends LightningElement {
    @api options = []; 
    @track processedOptions = [];
    selectedKey = '';

    connectedCallback() {
        if (this.options) {
            this.processedOptions = this.options.map(opt => ({
                ...opt,
                // FIX: Fallback logic for unique UI identification
                uiKey: opt.Option_Key__c || opt.MasterLabel || opt.Id,
                isSelected: false,
                cardClass: 'divider-card'
            }));
        }
    }

    get isSaveDisabled() {
        return !this.selectedKey;
    }

    handleSelect(event) {
        const key = event.currentTarget.dataset.key;
        this.selectedKey = key;

        this.processedOptions = this.processedOptions.map(opt => {
            const isSelected = opt.uiKey === key;
            return {
                ...opt,
                isSelected: isSelected,
                cardClass: isSelected ? 'divider-card selected' : 'divider-card'
            };
        });
    }

    saveSelection() {
        const selectedOption = this.processedOptions.find(opt => opt.isSelected);
        this.dispatchEvent(new CustomEvent('save', { detail: selectedOption }));
    }

    closeModal() {
        this.dispatchEvent(new CustomEvent('close'));
    }
}
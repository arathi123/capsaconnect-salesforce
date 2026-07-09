import { LightningElement, track, wire, api } from 'lwc';
import getOptionsByIdentifiers from '@salesforce/apex/CartConfiguratorController.getOptionsByIdentifiers';

export default class PackageLockSelection extends LightningElement {
    @api options = []; // Unique Identifiers from the pathJson
    @track lockOptions = [];
    
    selectedLock = '';
    selectedLabel = '';
    showNextButton = false;

    @wire(getOptionsByIdentifiers, { identifiers: '$options' })
    wiredOptions({ error, data }) {
        if (data) {
            this.lockOptions = data.map(opt => ({
                ...opt,
                showDesc: false,
                isSelected: false,
                cardClass: 'lock-card'
            }));
        } else if (error) {
            console.error('Error fetching lock options:', error);
        }
    }

    handleMouseEnter(event) {
        this.toggleDesc(event.currentTarget.dataset.key, true);
    }

    handleMouseLeave(event) {
        this.toggleDesc(event.currentTarget.dataset.key, false);
    }

    toggleDesc(key, isHovering) {
        this.lockOptions = this.lockOptions.map(opt => {
            const shouldShow = (opt.Option_Key__c === key && isHovering) || opt.isSelected;
            return { ...opt, showDesc: shouldShow };
        });
    }

    handleSelect(event) {
        const key = event.currentTarget.dataset.key;
        const selectedOption = this.lockOptions.find(opt => opt.Option_Key__c === key);
        
        this.selectedLock = key;
        this.selectedLabel = selectedOption ? selectedOption.Option_Label__c : '';
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

        // Save state in parent immediately
        this.dispatchEvent(new CustomEvent('lockselected', { 
            detail: { key: key, label: this.selectedLabel } 
        }));
    }

    handleNext() {
        this.dispatchEvent(new CustomEvent('next', {
            detail: { 
                step: 'Lock', 
                payload: { key: this.selectedLock, label: this.selectedLabel } 
            }
        }));
    }
}
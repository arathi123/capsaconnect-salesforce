import { LightningElement, track, wire, api } from 'lwc';
import getOptionsByIdentifiers from '@salesforce/apex/CartConfiguratorController.getOptionsByIdentifiers';

export default class PackageHeightSelection extends LightningElement {
    @api options = []; // Received from capsaPackageFlow (the IDs from JSON)
    @track heightOptions = [];
    
    selectedHeight = '';
    selectedLabel = '';
    uniqueId = '';
    showNextButton = false;

    // Use the list of Unique_Identifier__c strings to fetch full record details
    @wire(getOptionsByIdentifiers, { identifiers: '$options' })
    wiredOptions({ error, data }) {
        if (data) {
            this.heightOptions = data.map(opt => ({
                ...opt,
                showDesc: false,
                isSelected: false,
                cardClass: 'height-card'
            }));
        } else if (error) {
            console.error('Error fetching height options:', error);
        }
    }

    handleMouseEnter(event) {
        this.toggleDesc(event.currentTarget.dataset.key, true);
    }

    handleMouseLeave(event) {
        this.toggleDesc(event.currentTarget.dataset.key, false);
    }

    toggleDesc(key, isHovering) {
        this.heightOptions = this.heightOptions.map(opt => {
            const shouldShow = (opt.Option_Key__c === key && isHovering) || opt.isSelected;            
            return { ...opt, showDesc: shouldShow };
        });
    }

    handleSelect(event) {
        const key = event.currentTarget.dataset.key; // Using Option_Key__c for internal tracking
        const selectedOption = this.heightOptions.find(opt => opt.Option_Key__c === key);
        
        this.selectedHeight = key;
        this.selectedLabel = selectedOption ? selectedOption.Option_Label__c : '';
        this.uniqueId = selectedOption ? selectedOption.Unique_Identifier__c : '';
        this.showNextButton = true;

        this.heightOptions = this.heightOptions.map(opt => {
            const isSelected = opt.Option_Key__c === key;
            return {
                ...opt,
                isSelected: isSelected,
                showDesc: isSelected, 
                cardClass: isSelected ? 'height-card selected' : 'height-card'
            };
        });

        // Inform the Engine that a selection was made
        this.dispatchEvent(new CustomEvent('heightselected', { 
            detail: { key: key, label: this.selectedLabel, uniqueId: this.uniqueId }
        }));
    }

    handleNext() {
        this.dispatchEvent(new CustomEvent('next', {
            detail: { 
                step: 'Height', 
                payload: { key: this.selectedHeight, label: this.selectedLabel, uniqueId: this.uniqueId } 
            }
        }));
    }
}
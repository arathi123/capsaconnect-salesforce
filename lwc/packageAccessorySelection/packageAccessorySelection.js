import { LightningElement, track, wire, api } from 'lwc';
import getOptionsByIdentifiers from '@salesforce/apex/CartConfiguratorController.getOptionsByIdentifiers';

export default class PackageAccessorySelection extends LightningElement {
    @api options = []; // Unique Identifiers from pathJson
    @track accessoryOptions = [];
    
    @track selectedPackageKey = '';
    @track accessoryNone = false; // Added to track "None" state

    @wire(getOptionsByIdentifiers, { identifiers: '$options' })
    wiredAccessories({ error, data }) {
        if (data) {
            this.accessoryOptions = data;
        } else if (error) {
            console.error('Error fetching accessories:', error);
        }
    }

    get processedOptions() {
        return this.accessoryOptions.map(pkg => {
            // Only show as selected if the key matches AND 'None' is not selected
            const isSelected = pkg.Option_Key__c === this.selectedPackageKey && !this.accessoryNone;
            return {
                ...pkg,
                cardClass: isSelected ? 'package-card selected' : 'package-card'
            };
        });
    }

    // Dynamic class for the None card
    get noneCardClass() {
        return this.accessoryNone ? 'package-card none-card selected' : 'package-card none-card';
    }

    get isNextDisabled() {
        // Next is disabled if neither a package nor "None" is selected
        return !this.selectedPackageKey && !this.accessoryNone;
    }

    handleSelect(event) {
        this.accessoryNone = false; // Deselect "None"
        this.selectedPackageKey = event.currentTarget.dataset.key;
        
        const selected = this.accessoryOptions.find(p => p.Option_Key__c === this.selectedPackageKey);
        
        // Save state in parent immediately
        this.dispatchEvent(new CustomEvent('accessoryselected', { 
            detail: { key: this.selectedPackageKey, label: selected.Option_Label__c, fullRecord: selected, accessoryNone: false } 
        }));
    }

    handleNoneSelect() {
        this.accessoryNone = true; // Select "None"
        this.selectedPackageKey = ''; // Clear package selection

        this.dispatchEvent(new CustomEvent('accessoryselected', { 
            detail: { key: 'NONE', label: 'None', fullRecord: null, accessoryNone: true } 
        }));
    }

    handleNext() {
        let payload = { accessoryNone: this.accessoryNone };

        // Only attach package details if "None" wasn't selected
        if (!this.accessoryNone) {
            const selected = this.accessoryOptions.find(p => p.Option_Key__c === this.selectedPackageKey);
            payload = {
                key: this.selectedPackageKey, 
                label: selected.Option_Label__c, 
                fullRecord: selected,
                accessoryNone: false
            };
        }

        this.dispatchEvent(new CustomEvent('next', {
            detail: {
                step: 'Accessories',
                payload: payload
            }
        }));
    }
}
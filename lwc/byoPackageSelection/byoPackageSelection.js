import { LightningElement, wire, track } from 'lwc';
import getOptionsByStep from '@salesforce/apex/CartConfiguratorController.getOptionsByStep';

export default class ByoPackageSelection extends LightningElement {
    @track rawOptions = [];
    @track selectedPackageKey = '';
    @track packageNone = false; // Tracks the "None" state

    @wire(getOptionsByStep, { stepKey: 'PACKAGE' })
    wiredPackages({ data }) {
        if (data) {
            this.rawOptions = data;
        }
    }

    // Process options to add dynamic classes and labels
    get packageOptions() {
        return this.rawOptions.map(pkg => {
            // Only show as selected if the key matches AND 'None' is not selected
            const isSelected = pkg.Option_Key__c === this.selectedPackageKey && !this.packageNone;
            return {
                ...pkg,
                cardClass: isSelected ? 'package-card selected' : 'package-card',
                buttonText: isSelected ? '✓ Selected' : 'Select This Package'
            };
        });
    }

    // Dynamic class for the None card
    get noneCardClass() {
        return this.packageNone ? 'package-card none-card selected' : 'package-card none-card';
    }

    get isNextDisabled() {
        return !this.selectedPackageKey && !this.packageNone;
    }

    handleSelect(event) {
        this.packageNone = false; // Deselect "None"
        this.selectedPackageKey = event.currentTarget.dataset.key;
    }

    handleNoneSelect() {
        this.packageNone = true; // Select "None"
        this.selectedPackageKey = ''; // Clear package selection
    }

    handleNext() {
        let stepPayload;

        if (this.packageNone) {
            stepPayload = {
                Option_Key__c: 'NONE',
                Option_Label__c: 'None',
                packageNone: true // Optional: Keeping this as a helpful flag for the parent
            };
        } else {
            const selected = this.rawOptions.find(p => p.Option_Key__c === this.selectedPackageKey);
            stepPayload = {
                ...selected,
                packageNone: false
            };
        }

        this.dispatchEvent(new CustomEvent('nextstep', {
            detail: {
                step: 'PACKAGE',
                goTo: 'Results', // Jumps directly to Results page
                payload: stepPayload
            }
        }));
    }
}
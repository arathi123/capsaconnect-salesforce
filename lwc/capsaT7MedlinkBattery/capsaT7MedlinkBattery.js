import { LightningElement, track, api, wire } from 'lwc';
import getOptionsByStepAndFamily from '@salesforce/apex/CartConfiguratorController.getOptionsByStepAndFamily';

export default class CapsaT7MedlinkBattery extends LightningElement {
    @api productType = 'T7MedLink';
    @api selections;

    @track batteryOptions = [];
    @track currentPreviewImage = '/resource/T7MedLink/T7MedLink2/T7MedLink4.png';
    @track isLoading = true;
    @track localSelection = '';

    @wire(getOptionsByStepAndFamily, { stepKey: 'BatteryType', productFamily: '$productType' })
    wiredOptions({ error, data }) {
        if (data) {
            this.batteryOptions = data.map(opt => ({
                ...opt,
                isVisible: false,
                isSelected: false,
                rowClass: 'option-row'
            }));

            if (this.selections && this.selections.BatteryType && this.selections.BatteryType.length > 0) {
                this.localSelection = this.selections.BatteryType[0].key;
                this.syncUI();
            }
            this.isLoading = false;
        } else if (error) {
            console.error('Error fetching battery options:', error);
            this.isLoading = false;
        }
    }

    handleMouseEnter(event) {
        this.toggleDescription(event.currentTarget.dataset.key, true);
    }

    handleMouseLeave(event) {
        this.toggleDescription(event.currentTarget.dataset.key, false);
    }

    toggleDescription(key, isHovering) {
        this.batteryOptions = this.batteryOptions.map(opt => ({
            ...opt,
            isVisible: (opt.Option_Key__c === key && isHovering) || opt.isSelected
        }));
    }

    handleSelect(event) {
        this.localSelection = event.currentTarget.dataset.key;
        this.syncUI();
    }

    syncUI() {
        this.batteryOptions = this.batteryOptions.map(opt => {
            const isSelected = opt.Option_Key__c === this.localSelection;
            if (isSelected && opt.Preview_Image_URL__c) {
                this.currentPreviewImage = opt.Preview_Image_URL__c;
            }
            return {
                ...opt,
                isSelected,
                isVisible: isSelected,
                rowClass: isSelected ? 'option-row selected' : 'option-row'
            };
        });
    }

    get isStepComplete() { return this.localSelection !== ''; }

    handleNext() {
        const selectedOpt = this.batteryOptions.find(opt => opt.Option_Key__c === this.localSelection);

        const payloadArray = selectedOpt ? [{
            key: selectedOpt.Option_Key__c,
            label: selectedOpt.Option_Label__c,
            sku: null
        }] : [];

        this.dispatchEvent(new CustomEvent('stepcomplete', {
            detail: { BatteryType: payloadArray }
        }));
    }
}
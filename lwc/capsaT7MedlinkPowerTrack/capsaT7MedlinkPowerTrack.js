import { LightningElement, track, api, wire } from 'lwc';
import getOptionsByStepAndFamily from '@salesforce/apex/CartConfiguratorController.getOptionsByStepAndFamily';

export default class CapsaT7MedlinkPowerTrack extends LightningElement {
    @api productType = 'T7MedLink';
    @api selections;

    @track powerTrackOptions = [];
    @track currentPreviewImage = '/resource/T7MedLink/T7MedLink2/T7MedLink4.png';
    @track isLoading = true;
    @track localSelection = '';

    @wire(getOptionsByStepAndFamily, { stepKey: 'PowerTrack', productFamily: '$productType' })
    wiredOptions({ error, data }) {
        if (data) {
            this.powerTrackOptions = data.map(opt => ({
                ...opt,
                isVisible: false,
                isSelected: false,
                rowClass: 'option-row'
            }));

            if (this.selections && this.selections.PowerTrack && this.selections.PowerTrack.length > 0) {
                this.localSelection = this.selections.PowerTrack[0].key;
                this.syncUI();
            }
            this.isLoading = false;
        } else if (error) {
            console.error('Error fetching power track options:', error);
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
        this.powerTrackOptions = this.powerTrackOptions.map(opt => ({
            ...opt,
            isVisible: (opt.Option_Key__c === key && isHovering) || opt.isSelected
        }));
    }

    handleSelect(event) {
        this.localSelection = event.currentTarget.dataset.key;
        this.syncUI();
    }

    syncUI() {
        this.powerTrackOptions = this.powerTrackOptions.map(opt => {
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
        const selectedOpt = this.powerTrackOptions.find(opt => opt.Option_Key__c === this.localSelection);

        const payloadArray = selectedOpt ? [{
            key: selectedOpt.Option_Key__c,
            label: selectedOpt.Option_Label__c,
            sku: null
        }] : [];

        this.dispatchEvent(new CustomEvent('stepcomplete', {
            detail: { PowerTrack: payloadArray }
        }));
    }
}
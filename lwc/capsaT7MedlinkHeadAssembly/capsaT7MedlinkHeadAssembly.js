import { LightningElement, track, api } from 'lwc';
import getOptionsByStepAndFamily from '@salesforce/apex/CartConfiguratorController.getOptionsByStepAndFamily';

export default class CapsaT7MedlinkHeadAssembly extends LightningElement {
    @api productType = 'T7MedLink';
    @api selections;

    @track headAssemblyOptions = [];
    @track currentPreviewImage = '/resource/T7MedLink/T7MedLink2/T7MedLink4.png';
    @track isLoading = true;
    @track localSelection = '';

    connectedCallback() {
        getOptionsByStepAndFamily({ stepKey: 'HeadAssemblyType', productFamily: this.productType || 'T7MedLink' })
            .then(data => {
                this.headAssemblyOptions = data.map(opt => ({
                    ...opt, isVisible: false, isSelected: false, rowClass: 'option-row'
                }));
                if (this.selections && this.selections.HeadAssemblyType && this.selections.HeadAssemblyType.length > 0) {
                    this.localSelection = this.selections.HeadAssemblyType[0].key;
                    this.syncUI();
                }
                this.isLoading = false;
            })
            .catch(error => {
                console.error('Error fetching head assembly options:', error);
                this.isLoading = false;
            });
    }

    handleMouseEnter(event) { this.toggleDescription(event.currentTarget.dataset.key, true); }
    handleMouseLeave(event) { this.toggleDescription(event.currentTarget.dataset.key, false); }

    toggleDescription(key, isHovering) {
        this.headAssemblyOptions = this.headAssemblyOptions.map(opt => ({
            ...opt, isVisible: (opt.Option_Key__c === key && isHovering) || opt.isSelected
        }));
    }

    handleSelect(event) {
        this.localSelection = event.currentTarget.dataset.key;
        this.syncUI();
    }

    syncUI() {
        this.headAssemblyOptions = this.headAssemblyOptions.map(opt => {
            const isSelected = opt.Option_Key__c === this.localSelection;
            if (isSelected && opt.Preview_Image_URL__c) this.currentPreviewImage = opt.Preview_Image_URL__c;
            return { ...opt, isSelected, isVisible: isSelected, rowClass: isSelected ? 'option-row selected' : 'option-row' };
        });
    }

    get isStepComplete() { return this.localSelection !== ''; }

    handleNext() {
        const selectedOpt = this.headAssemblyOptions.find(opt => opt.Option_Key__c === this.localSelection);
        const payloadArray = selectedOpt ? [{ key: selectedOpt.Option_Key__c, label: selectedOpt.Option_Label__c, sku: null }] : [];
        this.dispatchEvent(new CustomEvent('stepcomplete', { detail: { HeadAssemblyType: payloadArray } }));
    }
}
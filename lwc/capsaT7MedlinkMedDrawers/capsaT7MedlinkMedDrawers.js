import { LightningElement, track, api } from 'lwc';
import getOptionsFresh from '@salesforce/apex/CartConfiguratorController.getOptionsFresh';

export default class CapsaT7MedlinkMedDrawers extends LightningElement {
    @api productType = 'T7MedLink';
    @api selections;

    @track medDrawerOptions = [];
    @track rawKitOptions = [];

    @track currentPreviewImage = '/resource/T7MedLink/T7MedLink2/T7MedLink4.png';
    @track isLoading = true;
    @track localSelection = '';
    @track selectedKit = '';
    @track hoveredKitKey = '';

    connectedCallback() {
        Promise.all([
            getOptionsFresh({ stepKey: 'MedicationDrawers', productFamily: this.productType || 'T7MedLink' }),
            getOptionsFresh({ stepKey: 'MedlinkDrawerKits', productFamily: this.productType || 'T7MedLink' })
        ])
        .then(([drawerData, kitData]) => {
            this.medDrawerOptions = (drawerData || []).map(opt => ({
                ...opt, isVisible: false, isSelected: false, rowClass: 'option-row'
            }));
            this.rawKitOptions = kitData || [];

            if (this.selections && this.selections.MedicationDrawers && this.selections.MedicationDrawers.length > 0) {
                this.localSelection = this.selections.MedicationDrawers[0].key;
                this.syncUI();
            }
            if (this.selections && this.selections.MedlinkDrawerKits && this.selections.MedlinkDrawerKits.length > 0) {
                this.selectedKit = this.selections.MedlinkDrawerKits[0].key;
            }
            this.isLoading = false;
        })
        .catch(error => {
            console.error('Error fetching medication drawer options:', error);
            this.isLoading = false;
        });
    }

    handleMouseEnter(event) { this.toggleDescription(event.currentTarget.dataset.key, true); }
    handleMouseLeave(event) { this.toggleDescription(event.currentTarget.dataset.key, false); }

    toggleDescription(key, isHovering) {
        this.medDrawerOptions = this.medDrawerOptions.map(opt => ({
            ...opt, isVisible: (opt.Option_Key__c === key && isHovering) || opt.isSelected
        }));
    }

    handleSelect(event) {
        const key = event.currentTarget.dataset.key;
        if (this.localSelection === key) return;
        this.localSelection = key;
        this.selectedKit = '';
        this.syncUI();
    }

    syncUI() {
        this.medDrawerOptions = this.medDrawerOptions.map(opt => {
            const isSelected = opt.Option_Key__c === this.localSelection;
            if (isSelected && opt.Preview_Image_URL__c) this.currentPreviewImage = opt.Preview_Image_URL__c;
            return { ...opt, isSelected, isVisible: isSelected, rowClass: isSelected ? 'option-row selected' : 'option-row' };
        });
    }

    get showKitSection() {
        return this.localSelection !== '' && this.localSelection !== '00';
    }

    get visibleKitOptions() {
        if (!this.showKitSection) return [];
        return this.rawKitOptions.map(opt => {
            const isSelected = opt.Option_Key__c === this.selectedKit;
            return {
                ...opt,
                isSelected,
                isVisible: isSelected || opt.Option_Key__c === this.hoveredKitKey,
                rowClass: isSelected ? 'option-row selected' : 'option-row'
            };
        });
    }

    handleKitSelect(event) {
        this.selectedKit = event.currentTarget.dataset.key;
    }

    handleKitMouseEnter(event) {
        this.hoveredKitKey = event.currentTarget.dataset.key;
    }

    handleKitMouseLeave() {
        this.hoveredKitKey = '';
    }

    get isStepComplete() {
        if (!this.localSelection) return false;
        if (this.localSelection === '00') return true;
        return this.selectedKit !== '';
    }

    handleNext() {
        const selectedDrawerOpt = this.medDrawerOptions.find(opt => opt.Option_Key__c === this.localSelection);
        const drawerPayload = selectedDrawerOpt
            ? [{ key: selectedDrawerOpt.Option_Key__c, label: selectedDrawerOpt.Option_Label__c, sku: null }]
            : [];

        const selectedKitOpt = this.rawKitOptions.find(opt => opt.Option_Key__c === this.selectedKit);
        const kitPayload = selectedKitOpt
            ? [{ key: selectedKitOpt.Option_Key__c, label: selectedKitOpt.Option_Label__c, sku: null }]
            : [];

        this.dispatchEvent(new CustomEvent('stepcomplete', {
            detail: { MedicationDrawers: drawerPayload, MedlinkDrawerKits: kitPayload }
        }));
    }
}
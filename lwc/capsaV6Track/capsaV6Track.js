import { LightningElement, track, api, wire } from 'lwc';
import getOptionsByStepAndFamily from '@salesforce/apex/CartConfiguratorController.getOptionsByStepAndFamily';
import V6_TRACK from '@salesforce/resourceUrl/v6_track';

export default class CapsaV6Track extends LightningElement {
    @api productType = 'V6';
    @api selections;

    @track useCaseOptions = [];
    @track trackArmOptions = [];
    @track currentPreviewImage = '/resource/v6_main_ind/V6_WallArm_With_V-Desk2(Right)2.png';
    v612Img = V6_TRACK + '/V6_12in_Track_V612-0000-00000.png';
    v627Img = V6_TRACK + '/V6_27in_Track_V627-0000-00000.png';
    v637Img = V6_TRACK + '/V6_37in_Track_V637-0000-00000.png';
    v647Img = V6_TRACK + '/V6_47in_Track_V647-0000-00000.png';
    v657Img = V6_TRACK + '/V6_57in_Track_V657-0000-00000.png';

    @track isLoading = true;

    // Internal UI tracker
    @track localSelection = '';
    @track selectedV612 = false;
    @track selectedV627 = false;
    @track selectedV637 = false;
    @track selectedV647 = false;
    @track selectedV657 = false;
    @track selectedArmMount = '';

    @wire(getOptionsByStepAndFamily, { stepKey: 'CART TYPE', productFamily: '$productType' })
    wiredOptions({ error, data }) {
        if (data) {
            this.useCaseOptions = data.map(opt => ({
                ...opt,
                isVisible: false,
                isSelected: false,
                rowClass: 'option-row'
            }));

            // Restore state if jumping backward
            if (this.selections && this.selections.TRACK && this.selections.TRACK.length > 0) {
                this.localSelection = this.selections.TRACK[0].key;
                this.syncUI();
            }
            this.isLoading = false;
        }
    }

    @wire(getOptionsByStepAndFamily, { stepKey: 'V6 TRACK ARM', productFamily: '$productType' })
    wiredArmOptions({ error, data }) {
        if (data) {
            this.trackArmOptions = data.map(opt => ({
                ...opt,
                isVisible: false,
                isSelected: false,
                rowClass: 'option-row'
            }));

            // Restore state if jumping backward
            if (this.selections && this.selections.TRACK && this.selections.TRACK.length > 0) {
                this.selectedArmMount = this.selections.TRACK[0].key;
                this.syncARM();
            }
            this.isLoading = false;
        }
    }

    get hasBaseImage() {
        return !!this.currentPreviewImage;
    }

    get isStepComplete() {
        if (this.selectedV612) {
            return this.selectedArmMount !== '';
        } else {
            return this.localSelection !== '';
        }
    }
    connectedCallback() {
        console.log('inside V6 cartype 1');
    }

    handleMouseEnter(event) {
        this.toggleDescription(event.currentTarget.dataset.key, true);
    }

    handleMouseLeave(event) {
        this.toggleDescription(event.currentTarget.dataset.key, false);
    }

    toggleDescription(key, isHovering) {
        if (this.selectedV612) {
            this.trackArmOptions = this.trackArmOptions.map(opt => ({
                ...opt,
                isVisible: (opt.Option_Key__c === key && isHovering) || opt.isSelected
            }));
        } else {
            this.useCaseOptions = this.useCaseOptions.map(opt => ({
                ...opt,
                isVisible: (opt.Option_Key__c === key && isHovering) || opt.isSelected
            }));
        }
    }

    handleSelect(event) {
        this.localSelection = event.currentTarget.dataset.key;
        console.log('inside cord event: ' + this.localSelection);
        if (this.localSelection === '12" - V612-0000-00000') {
            this.selectedV612 = true;
            this.currentPreviewImage = this.v612Img;
        } else if (this.localSelection === '27" - V627-0000-00000') {
            this.selectedV627 = true;
            this.selectedV612 = false;
            this.currentPreviewImage = this.v627Img;
        }
        else if (this.localSelection === '37" - V637-0000-00000') {
            this.selectedV637 = true;
            this.selectedV612 = false;
            this.currentPreviewImage = this.v637Img;
        }
        else if (this.localSelection === '47" - V647-0000-00000') {
            this.selectedV647 = true;
            this.selectedV612 = false;
            this.currentPreviewImage = this.v647Img;
        }
        else if (this.localSelection === '57" - V657-0000-00000') {
            this.selectedV657 = true;
            this.selectedV612 = false;
            this.currentPreviewImage = this.v657Img;
        }
        this.syncUI();
    }
    syncUI() {
        this.useCaseOptions = this.useCaseOptions.map(opt => {
            const isSelected = opt.Option_Key__c === this.localSelection;
            if (isSelected && opt.Preview_Image_URL__c) {
                this.currentPreviewImage = opt.Preview_Image_URL__c;
            }
            return {
                ...opt,
                isSelected: isSelected,
                isVisible: isSelected, // Permanent show when selected
                rowClass: isSelected ? 'option-row selected' : 'option-row'
            };
        });
    }

    handleArmMountSelect(event) {
        this.selectedArmMount = event.currentTarget.dataset.key;
        console.log('@selectedArmMount: ' + this.selectedArmMount);
        this.currentPreviewImage = this.v612Img;
        this.syncARM();
    }

    syncARM() {
        this.trackArmOptions = this.trackArmOptions.map(opt => {
            const isSelected = opt.Option_Key__c === this.selectedArmMount;
            if (isSelected && opt.Preview_Image_URL__c) {
                this.currentPreviewImage = opt.Preview_Image_URL__c;
            }
            return {
                ...opt,
                isSelected: isSelected,
                isVisible: isSelected, // Permanent show when selected
                rowClass: isSelected ? 'option-row selected' : 'option-row'
            };
        });
    }

    handleNext() {
        // 1. Locate the selected record metadata
        let selectedOpt;
        if (this.selectedV612) {
            selectedOpt = this.trackArmOptions.find(opt => opt.Option_Key__c === this.selectedArmMount);
        } else {
            selectedOpt = this.useCaseOptions.find(opt => opt.Option_Key__c === this.localSelection);
        }

        // 2. Build the unified payload array
        const payloadArray = [{
            key: selectedOpt.Option_Key__c,
            label: selectedOpt.Option_Label__c,
            sku: null
        }];

        // 3. Dispatch perfectly structured state
        this.dispatchEvent(new CustomEvent('stepcomplete', {
            detail: {
                TRACK: payloadArray,
                previewImage: this.currentPreviewImage,
                layeredPreview: {
                    baseImage: this.currentPreviewImage,
                    overlays: []
                },
                localSelection: this.localSelection,
                selectedV612: this.selectedV612,
                selectedV627: this.selectedV627,
                selectedV637: this.selectedV637,
                selectedV647: this.selectedV647,
                selectedV657: this.selectedV657,
                selectedArmMount: this.selectedArmMount
            }
        }));
    }
}
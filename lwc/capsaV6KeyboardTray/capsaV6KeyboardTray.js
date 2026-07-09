import { LightningElement, track, api, wire } from 'lwc';
import getOptionsByStepAndFamily from '@salesforce/apex/CartConfiguratorController.getOptionsByStepAndFamily';

export default class CapsaV6KeyboardTray extends LightningElement {
    @api productType = 'V6';
    @api selections;

    @track keyTrayOpts = [];
    @track selectedKeyTrack = '';
    @track currentPreviewImage;//keep pic label
    @track isLoading = true;
    @track currentkeyBoardTrayValue = '';
    @track baseImage;

    @wire(getOptionsByStepAndFamily, { stepKey: 'V6 KEYB TRAY', productFamily: '$productType' })
    wiredOptions({ error, data }) {
        if (data) {
            this.keyTrayOpts = data.map(opt => ({
                ...opt,
                isVisible: false,
                isSelected: false,
                rowClass: 'option-row'
            }));

            // Restore state if jumping backward
            if (this.selections && this.selections.KEYBOARD_TRAY && this.selections.KEYBOARD_TRAY.length > 0) {
                this.selectedKeyTrack = this.selections.KEYBOARD_TRAY[0].key;
                this.syncUI();
            }
            this.isLoading = false;
        }
    }

    get isStepComplete() {
        return this.selectedKeyTrack !== '';
    }

    get currentkeyBoardTray () {
        return this.currentkeyBoardTrayValue;
    }

    get localSelection() {
        return this.selections && this.selections.localSelection;
    }

    get currentArmSelection () {
        return this.selections && this.selections.currentArmSelection;
    }

    get currentkeyBoardArm () {
        return this.selections && this.selections.currentkeyBoardArm;
    }

    connectedCallback() {
		this.baseImage =  this.selections?.layeredPreview?.baseImage;
		console.log('@connected V6 keyBoard Tray: ' + this.baseImage);
    }

    handleMouseEnter(event) {
        this.toggleDescription(event.currentTarget.dataset.key, true);
    }

    handleMouseLeave(event) {
        this.toggleDescription(event.currentTarget.dataset.key, false);
    }

    toggleDescription(key, isHovering) {
            this.keyTrayOpts = this.keyTrayOpts.map(opt => ({
                ...opt,
                isVisible: (opt.Option_Key__c === key && isHovering) || opt.isSelected
            }));
    }

    handleSelect(event) {
        this.selectedKeyTrack = event.currentTarget.dataset.key;
        this.currentkeyBoardTrayValue = this.selectedKeyTrack;
        if (this.selectedKeyTrack === 'Open - V6SHP') {
			this.currentPreviewImage = '/resource/v6_kb_tray/V6_Open_Keyboard_Platform_SHP_V6SHP.png';
		} else if (this.selectedKeyTrack === 'Enclosed - V6VDK') {
			this.currentPreviewImage = '/resource/v6_kb_tray/V6_Enclosed_Keyboard_VDesk_1_V6VDK.png';
		} else if (this.selectedKeyTrack === 'Enclosed - V6VD2S') {
			this.currentPreviewImage = '/resource/v6_kb_tray/V6_Enclosed_Keyboard_VDesk2_V6VD2S_A.png';
		}
        this.syncUI();
    }
    syncUI() {
        this.keyTrayOpts = this.keyTrayOpts.map(opt => {
            const isSelected = opt.Option_Key__c === this.selectedKeyTrack;
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

    get incomingOverlays() {
        return this.selections?.layeredPreview?.overlays || [];
    }

    // getImageClass(key) {
    //     if (key === 'arm') {
    //         return 'arm-overlay';
    //     } else if (key === 'keyboardArm') {
    //         return 'kbarm-overlay';
    //     } else {
    //         return '';
    //     }
    // }
    get incomingOverlays() {
        return this.selections?.layeredPreview?.overlays.map(ov => {
            let overlayClass = '';
            if (ov.key === 'arm') {
                overlayClass = 'arm-overlay';
            } else if (ov.key === 'keyboardArm') {
                overlayClass = 'kbarm-overlay';
            }
            return { ...ov, class: overlayClass };
        }) || [];
    }
    get overlayData() {
		if (this.selectedKeyTrack === 'Enclosed - V6VD2S') {
			return { image: this.currentPreviewImage, style: 'kbT1-overlay' };
		} else {
			return { image: this.currentPreviewImage, style: 'kbT2-overlay' };
		}
		return { image: '', style: '' };
	}

    handleNext() {
        // 1. Locate the selected record metadata
        const selectedOpt = this.keyTrayOpts.find(opt => opt.Option_Key__c === this.selectedKeyTrack);

        // 2. Build the unified payload array
        const payloadArray = [{
            key: selectedOpt.Option_Key__c,
            label: selectedOpt.Option_Label__c,
            sku: null
        }];

        const kbTrayOverlay = {
            key: 'keyboardTray',
            url: this.currentPreviewImage,
            style: 'position:absolute;top:0;left:0;width:100%;height:100%;object-fit:contain;'
            // swap in a real positioning class like Arm's overlay aclasses if you need per-item offsets
        };

        // 3. Dispatch perfectly structured state
        this.dispatchEvent(new CustomEvent('stepcomplete', {
            detail: {
                KEYBOARD_TRAY: payloadArray,
                previewImage: this.currentPreviewImage,
                layeredPreview: {
					baseImage: this.baseImage,
					overlays: [...this.incomingOverlays, kbTrayOverlay]
				},
				selectedKeyTrack: this.selectedKeyTrack,
				currentkeyBoardTray: this.currentkeyBoardTray
            }
        }));
    }
}
import { LightningElement, track, api, wire } from 'lwc';
import getOptionsByStepAndFamily from '@salesforce/apex/CartConfiguratorController.getOptionsByStepAndFamily';

export default class CapsaV6KeyboardArm extends LightningElement {
	@api productType = 'V6';
	@api selections;

	@track keyBoardOpts = [];
	@track fixHeightOpts = [];
	@track heightAdjOpts = [];
	@track currentPreviewImage;//keep pic label
	@track isLoading = true;
	@track currentkeyBoardArmValue = '';

	// Internal UI tracker
	@track keyBoardArm = '';
	@track fixHeightArm = '';
	@track heightAdjArm = '';
	@track selectedFix = false;
	@track selectedHeight = false;
	@track baseImage;

	@wire(getOptionsByStepAndFamily, { stepKey: 'V6 KEYB ARM', productFamily: '$productType' })
	wiredkeyOptions({ error, data }) {
		if (data) {
			this.keyBoardOpts = data.map(opt => ({
				...opt,
				isVisible: false,
				isSelected: false,
				rowClass: 'option-row'
			}));

			// Restore state if jumping backward
			if (this.selections && this.selections.KEYBOARD_ARM && this.selections.KEYBOARD_ARM.length > 0) {
				this.keyBoardArm = this.selections.KEYBOARD_ARM[0].key;
				this.syncUI();
			}
			this.isLoading = false;
		}
	}

	@wire(getOptionsByStepAndFamily, { stepKey: 'V6 KEYB ARM FIX', productFamily: '$productType' })
	wiredFixOptions({ error, data }) {
		if (data) {
			this.fixHeightOpts = data.map(opt => ({
				...opt,
				isVisible: false,
				isSelected: false,
				rowClass: 'option-row'
			}));

			// Restore state if jumping backward
			if (this.selections && this.selections.KEYBOARD_ARM && this.selections.KEYBOARD_ARM.length > 0) {
				this.fixHeightArm = this.selections.KEYBOARD_ARM[0].key;
				this.syncFIX();
			}
			this.isLoading = false;
		}
	}

	@wire(getOptionsByStepAndFamily, { stepKey: 'V6 KEYB HGT ADJ', productFamily: '$productType' })
	wiredHeightOptions({ error, data }) {
		if (data) {
			this.heightAdjOpts = data.map(opt => ({
				...opt,
				isVisible: false,
				isSelected: false,
				rowClass: 'option-row'
			}));

			// Restore state if jumping backward
			if (this.selections && this.selections.KEYBOARD_ARM && this.selections.KEYBOARD_ARM.length > 0) {
				this.heightAdjArm = this.selections.KEYBOARD_ARM[0].key;
				this.syncADJ();
			}
			this.isLoading = false;
		}
	}
	get isStepComplete() {
		return (this.selectedFix && this.fixHeightArm) || (this.selectedHeight && this.heightAdjArm);
	}

	get currentkeyBoardArm() {
		return this.currentkeyBoardArmValue;
	}

	get localSelection() {
		return this.selections && this.selections.localSelection;
	}

	get currentArmSelection() {
		return this.selections && this.selections.currentArmSelection;
	}
	connectedCallback() {
		this.baseImage =  this.selections?.layeredPreview?.baseImage;
		console.log('@connected V6 keyBoard Arm: ' + this.baseImage);
	}

	handleMouseEnter(event) {
		this.toggleDescription(event.currentTarget.dataset.key, true);
	}

	handleMouseLeave(event) {
		this.toggleDescription(event.currentTarget.dataset.key, false);
	}

	toggleDescription(key, isHovering) {
		if (this.selectedFix) {
			this.fixHeightOpts = this.fixHeightOpts.map(opt => ({
				...opt,
				isVisible: (opt.Option_Key__c === key && isHovering) || opt.isSelected
			}));
		} else if (this.selectedHeight) {
			this.heightAdjOpts = this.heightAdjOpts.map(opt => ({
				...opt,
				isVisible: (opt.Option_Key__c === key && isHovering) || opt.isSelected
			}));
		}
	}

	handleKeySelect(event) {
		this.keyBoardArm = event.currentTarget.dataset.key;
		console.log('inside cord event: ' + this.keyBoardArm);
		if (this.keyBoardArm === 'Fixed Height') {
			this.selectedFix = true;
			this.selectedHeight = false;
		} else if (this.keyBoardArm === 'Height Adjustable') {
			this.selectedHeight = true;
			this.selectedFix = false;
		}
		this.syncUI();
	}
	syncUI() {
		this.keyBoardOpts = this.keyBoardOpts.map(opt => {
			const isSelected = opt.Option_Key__c === this.keyBoardArm;
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

	handleFixSelect(event) {
		this.fixHeightArm = event.currentTarget.dataset.key;
		this.currentkeyBoardArmValue = this.fixHeightArm;
		if (this.fixHeightArm === 'V6 Keyboard Mount Only - V600-0001-00000') {
			this.currentPreviewImage = '/resource/v6_kb_arm_fix/V6_Keyboard_Mount_Only_V600-0001-00000.png';
		} else if (this.fixHeightArm === 'V6 Keyboard 9in Straight Arm - V600-0002-00000') {
			this.currentPreviewImage = '/resource/v6_kb_arm_fix/V6_Keyboard_9in_Straight_Arm_V600-0002-00000.png';
		} else if (this.fixHeightArm === 'V6 Keyboard Two 9in Straight Arm - V600-0003-00000') {
			this.currentPreviewImage = '/resource/v6_kb_arm_fix/V6_Keyboard_Two_9in_Straight_Arm_V600-0003-00000.png';
		} else if (this.fixHeightArm === 'V6 Keyboard 12in Straight Arm - V600-0004-00000') {
			this.currentPreviewImage = '/resource/v6_kb_arm_fix/V6_Keyboard_12in_Straight_Arm_V600-0004-00000.png';
		} else if (this.fixHeightArm === 'V6 Keyboard Two 12in Straight Arm - V600-0005-00000') {
			this.currentPreviewImage = '/resource/v6_kb_arm_fix/V6_Keyboard_Two_12in_Straight_Arm_V600-0005-00000.png';
		}
		this.heightAdjArm = false;
		this.syncFIX();
	}

	syncFIX() {
		this.fixHeightOpts = this.fixHeightOpts.map(opt => {
			const isSelected = opt.Option_Key__c === this.fixHeightArm;
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

	handleHAdjSelect(event) {
		this.heightAdjArm = event.currentTarget.dataset.key;
		this.currentkeyBoardArmValue = this.heightAdjArm;
		if (this.heightAdjArm === 'Keyboard 12in Dynamic Arm - V600-0006-00000') {
			this.currentPreviewImage = '/resource/v6_kb_arm_adj/V6_Keyboard_12in_Dynamic_Arm_V600-0006-00000.png';
		} else if (this.heightAdjArm === 'Keyboard 9in Straight, 12in Dynamic Arm - V600-0007-00000') {
			this.currentPreviewImage = '/resource/v6_kb_arm_adj/V6_Keyboard_9in_Strt_12in_Dynm_Arm_V600-0007-00000.png';
		} else if (this.heightAdjArm === 'Keyboard 12in Straight, 12in Dynamic Arm - V600-0008-00000') {
			this.currentPreviewImage = '/resource/v6_kb_arm_adj/V6_Keyboard_12in_Strt_12in_Dynm_Arm_V600-0008-00000.png';
		} else if (this.heightAdjArm === 'Keyboard 20in Dynamic Arm - V600-0009-00000') {
			this.currentPreviewImage = '/resource/v6_kb_arm_adj/V6_Keyboard_20in_Dynamic_Arm_V600-0009-00000.png';
		} else if (this.heightAdjArm === 'Keyboard 20in HD Dynamic Arm - V600-0010-00000') {
			this.currentPreviewImage = '/resource/v6_kb_arm_adj/V6_Keyboard_20in_HD_Dynamic_Arm_V600-0010-00000.png';
		} else if (this.heightAdjArm === 'Keyboard 9in Straight, 20in Dynamic Arm - V600-0011-00000') {
			this.currentPreviewImage = '/resource/v6_kb_arm_adj/V6_Keyboard_9in_Strt_20in_Dynm_Arm_V600-0011-00000.png';
		} else if (this.heightAdjArm === 'Keyboard 12in Straight, 20in Dynamic Arm - V600-0012-00000') {
			this.currentPreviewImage = '/resource/v6_kb_arm_adj/V6_Keyboard_12in_Strt_20in_Dynm_Arm_V600-0012-00000.png';
		} else if (this.heightAdjArm === 'Keyboard 9in Straight, 20in HD Dynamic Arm - V600-0013-00000') {
			this.currentPreviewImage = '/resource/v6_kb_arm_adj/V6_Keyboard_9in_Strt_20in_HD_Dynm_Arm_V600-0013-00000.png';
		} else if (this.heightAdjArm === 'Keyboard 12in Straight, 20in HD Dynamic Arm - V600-0014-00000') {
			this.currentPreviewImage = '/resource/v6_kb_arm_adj/V6_Keyboard_12in_Strt_20in_HD_Dynm_Arm_V600-0014-00000.png';
		}
		this.fixHeightArm = false;
		this.syncADJ();
	}

	syncADJ() {
		this.heightAdjOpts = this.heightAdjOpts.map(opt => {
			const isSelected = opt.Option_Key__c === this.heightAdjArm;
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

	get overlayData() {
		if (this.fixHeightArm) {
			return { image: this.currentPreviewImage, style: 'kbFix-overlay' };
		} else if (this.heightAdjArm) {
			return { image: this.currentPreviewImage, style: 'kbAdj-overlay' };
		}
		return { image: '', style: '' };
	}

	handleNext() {
		let selectedOpt;
		if (this.selectedFix) {
			selectedOpt = this.fixHeightOpts.find(opt => opt.Option_Key__c === this.fixHeightArm);
		} else if (this.selectedHeight) {
			selectedOpt = this.heightAdjOpts.find(opt => opt.Option_Key__c === this.heightAdjArm);
		}

		const payloadArray = [{
			key: selectedOpt.Option_Key__c,
			label: selectedOpt.Option_Label__c,
			sku: null
		}];

		const kbArmOverlay = {
			key: 'keyboardArm',
			url: this.currentPreviewImage,
			style: 'position:absolute;top:0;left:0;width:100%;height:100%;object-fit:contain;'
			// swap in a real positioning class like Arm's overlay aclasses if you need per-item offsets
		};

		this.dispatchEvent(new CustomEvent('stepcomplete', {
			detail: {
				KEYBOARD_ARM: payloadArray,
				previewImage: this.overlayData.image,
				layeredPreview: {
					baseImage: this.baseImage,
					overlays: [...this.incomingOverlays, kbArmOverlay]
				},
				fixHeightArm: this.fixHeightArm,
				heightAdjArm: this.heightAdjArm,
				currentkeyBoardArm: this.currentkeyBoardArm
			}
		}));
	}
}
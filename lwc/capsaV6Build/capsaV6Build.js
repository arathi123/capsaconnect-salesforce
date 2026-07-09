import { LightningElement, api, track } from 'lwc';

const STEPS = [
	{ name: 'Track', label: 'Track' },
	{ name: 'Arm', label: 'Arm' },
	{ name: 'KeyboardArm', label: 'Keyboard Arm' },
	{ name: 'KeyboardTray', label: 'Keyboard Tray' },
	{ name: 'Accessories', label: 'Accessories' },
	{ name: 'Results', label: 'Results' }
];

export default class CapsaV6Build extends LightningElement {
	@api opportunityId;
	@api productType = 'V6';
	@api quoteId;

	@track currentStep = 'Track';

	@track selections = {
		TRACK: [],
		ARM: [],
		KEYBOARD_ARM: [],
		KEYBOARD_TRAY: [],
		ACCESSORIES: [],
		RESULTS: [],
		layeredPreview: { baseImage: null, overlays: [] }
	};

	// @track selections = {
	// 	TRACK: [],
	// 	ARM: [],
	// 	KEYBOARD_ARM: [],
	// 	KEYBOARD_TRAY: [],
	// 	ACCESSORIES: [],
	// 	RESULTS: [],
	// 	// Image layer state
	// 	layeredPreview: { baseImage: null, overlays: [] }
	// };
	// Step visibility getters
	get isTrack() { return this.currentStep === 'Track'; }
	get isArm() { return this.currentStep === 'Arm'; }
	get isKeyboardArm() { return this.currentStep === 'KeyboardArm'; }
	get isKeyboardTray() { return this.currentStep === 'KeyboardTray'; }
	get isAccessories() { return this.currentStep === 'Accessories'; }
	get isResults() { return this.currentStep === 'Results'; }

	@api jumpToStep(stepName) {
		this.currentStep = stepName;
		const targetIdx = STEPS.findIndex(s => s.name === stepName);

		if (targetIdx !== -1) {
			// Clear selection arrays downstream of the jump target
			if (targetIdx <= STEPS.findIndex(s => s.name === 'Arm'))
				this.selections.ARM = [];
			if (targetIdx <= STEPS.findIndex(s => s.name === 'KeyboardArm'))
				this.selections.KEYBOARD_ARM = [];
			if (targetIdx <= STEPS.findIndex(s => s.name === 'KeyboardTray'))
				this.selections.KEYBOARD_TRAY = [];
			if (targetIdx <= STEPS.findIndex(s => s.name === 'Accessories'))
				this.selections.ACCESSORIES = [];
			if (targetIdx <= STEPS.findIndex(s => s.name === 'Results'))
				this.selections.RESULTS = [];

			// Truncate the layered preview to match how far back we jumped.
			// layeredPreview only has real content after Track has fired stepcomplete at least once.
			if (this.selections?.layeredPreview) {
				if (targetIdx === 0) {
					// Jumped back to Track — wipe layeredPreview entirely
					this.selections = {
						...this.selections,
						layeredPreview: { baseImage: null, overlays: [] }
					};
				} else {
					// Keep only overlays that belong to steps BEFORE the jump target.
					// Track(0)=baseImage, Arm(1)=overlays[0], KeyboardArm(2)=overlays[1], KeyboardTray(3)=overlays[2]
					const keepOverlays = targetIdx - 1;
					this.selections = {
						...this.selections,
						layeredPreview: {
							baseImage: this.selections.layeredPreview.baseImage,
							overlays: (this.selections.layeredPreview.overlays || []).slice(0, keepOverlays)
						}
					};
				}
			}
		}
	}

	handleStepComplete(event) {
		const incomingData = event.detail;

		// Merge all incoming keys into selections
		for (let key in incomingData) {
			this.selections[key] = incomingData[key];
		}

		// Determine next step
		const currentIndex = STEPS.findIndex(s => s.name === this.currentStep);
		let nextStepName = STEPS[currentIndex + 1].name;

		// Skip logic based on Track selections
		if (this.currentStep === 'Track') {
			if (this.selections.selectedV612 && this.selections.selectedArmMount === 'Monitor Arm Only (fixed or adjustable)') {
				if (
					(this.selections.fixedHgtArm && this.selections.fixedHgtArm !== '') ||
					(this.selections.heightAdjArm && this.selections.heightAdjArm !== '' &&
						((this.selections.singleMonitor && this.selections.singleMonitor !== '') ||
							(this.selections.dualMonitor && this.selections.dualMonitor !== '')))
				) {
					nextStepName = 'Accessories';
				}
			} else if (this.selections.selectedV612 && this.selections.selectedArmMount === 'Keyboard Arm Only (fixed or adjustable)') {
				nextStepName = 'KeyboardArm';
			} else if (this.selections.selectedV612 && this.selections.selectedArmMount === 'Solo Arm – Single Arm Supports Keyboard and Monitor (fixed)') {
				if (this.selections.soloArm && this.selections.soloArm !== '') {
					nextStepName = 'KeyboardTray';
				}
			} else if (
				(this.selections.selectedV627 || this.selections.selectedV637 ||
					this.selections.selectedV647 || this.selections.selectedV657) &&
				this.selections.soloArm && this.selections.soloArm !== ''
			) {
				nextStepName = 'KeyboardTray';
			}
		} else if (this.currentStep === 'Arm') {
			if (this.selections.selectedV612 && this.selections.selectedArmMount === 'Monitor Arm Only (fixed or adjustable)') {
				if (
					(this.selections.fixedHgtArm && this.selections.fixedHgtArm !== '') ||
					(this.selections.heightAdjArm && this.selections.heightAdjArm !== '' &&
						((this.selections.singleMonitor && this.selections.singleMonitor !== '') ||
							(this.selections.dualMonitor && this.selections.dualMonitor !== '')))
				) {
					nextStepName = 'Accessories';
				}
			} else if (this.selections.selectedV612 && this.selections.selectedArmMount === 'Solo Arm – Single Arm Supports Keyboard and Monitor (fixed)') {
				if (this.selections.soloArm && this.selections.soloArm !== '') {
					nextStepName = 'KeyboardTray';
				}
			} else if (
				(this.selections.selectedV627 || this.selections.selectedV637 ||
					this.selections.selectedV647 || this.selections.selectedV657) &&
				this.selections.soloArm && this.selections.soloArm !== ''
			) {
				nextStepName = 'KeyboardTray';
			}
		}

		this.currentStep = nextStepName;
		this.dispatchEvent(new CustomEvent('stepchange', { detail: { nextStep: nextStepName } }));
	}
}
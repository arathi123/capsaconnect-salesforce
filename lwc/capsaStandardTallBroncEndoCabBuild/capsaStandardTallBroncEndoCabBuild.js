import { LightningElement, track, api } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

const STEPS = [
    { name: 'TypeSelection', label: 'Cabinet Line' },
    { name: 'OlympusSecureAScope', label: 'Olympus Secure A Scope' },
    { name: 'J Hooks', label: 'J Hooks' },
    { name: 'Door with Lock', label: 'Door with Lock' },
    { name: 'Lock', label: 'Lock' },
    { name: 'Top', label: 'Top' },
    { name: 'Results', label: 'Results' }
];

export default class CapsaStandardTallBroncEndoCabBuild extends LightningElement {

    @api opportunityId;
    @api productType = 'Standard Tall Bronc Endo Cab';

    @track stepIndex = 1;

    isLoading = false;

    @track selections = {
        cabinetLine: {},
        olympus: {},
        jHooks: {},
        doorWithLock: {},
        lock: {},
        top: {}
    };

    get currentStep() {
        return STEPS[this.stepIndex].name;
    }

    // ===== STEP CHECKS =====

    get isCabinetLineStep() {
        return this.currentStep === 'CabinetLine';
    }

    get isOlympusStep() {
        return this.currentStep === 'OlympusSecureAScope';
    }

    get isJHooksStep() {
        return this.currentStep === 'J Hooks';
    }

    get isDoorWithLockStep() {
        return this.currentStep === 'Door with Lock';
    }

    get isLockStep() {
        return this.currentStep === 'Lock';
    }

    get isTopStep() {
        return this.currentStep === 'Top';
    }

    get isResultStep() {
        return this.currentStep === 'Results';
    }

    // ===== NAVIGATION =====

    @api
    jumpToStep(stepName) {

        const newIndex = STEPS.findIndex(
            s => s.name === stepName
        );

        if (newIndex !== -1) {
            this.stepIndex = newIndex;
        }
    }

    // ===== HANDLERS =====

    handleCabinetSelection(event) {
        this.selections.cabinetLine = event.detail;
    }

    handleOlympusSelection(event) {
        this.selections.olympus = event.detail;
    }

    handleJHooksSelection(event) {
        this.selections.jHooks = event.detail;
    }

    handleDoorSelection(event) {
        this.selections.doorWithLock = event.detail;
    }

    handleLockSelection(event) {
        this.selections.lock = event.detail;
    }

    handleTopSelection(event) {
        this.selections.top = event.detail;
    }

    // ===== NEXT BUTTON =====

    handleNextButton() {

        this.isLoading = true;

        setTimeout(() => {

            let nextStepName =
                STEPS[this.stepIndex + 1].name;

            this.dispatchEvent(
                new CustomEvent('stepchange', {
                    detail: {
                        nextStep: nextStepName
                    }
                })
            );

            this.jumpToStep(nextStepName);

            this.isLoading = false;

        }, 300);
    }

    // ===== SUMMARY =====

    get summaryData() {

        return {
            selections: this.selections
        };
    }

    // ===== TOAST =====

    showToast(title, message, variant) {

        this.dispatchEvent(
            new ShowToastEvent({
                title,
                message,
                variant
            })
        );
    }
}
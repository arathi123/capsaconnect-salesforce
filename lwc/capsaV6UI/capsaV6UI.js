import { LightningElement, api, track, wire } from 'lwc';
import { CurrentPageReference } from 'lightning/navigation';
import V6_TRACK from '@salesforce/resourceUrl/v6_main_ind';

export default class CapsaV6UI extends LightningElement {
    @api opportunityId;
    @api productType = 'V6';
    quoteId;
    currentPreviewImage = V6_TRACK + '/V6_WallArm_With_V-Desk2(Right)2.png';
    @track visitedSteps = ['TypeSelection'];
    currentStep = 'TypeSelection';

    showLandingPage = true;
    showBuildYourOwn = false;
    isLoading = false;

    // get allowedSteps() {
    //     return [...this.visitedSteps, this.currentStep];
    // }

    get allowedSteps() {
        const STEP_ORDER = ['Track', 'Arm', 'KeyboardArm', 'KeyboardTray', 'Accessories'];
        if (this.currentStep === 'TypeSelection') {
            return ['TypeSelection'];
        }
        const idx = STEP_ORDER.indexOf(this.currentStep);
        if (idx === -1) {
            return [...this.visitedSteps, this.currentStep];
        }
        return STEP_ORDER.slice(0, idx + 1);
    }
    @wire(CurrentPageReference)
    getStateParameters(currentPageReference) {
        if (currentPageReference) {
            this.quoteId = currentPageReference.state?.c__quoteid;
            this.opportunityId = currentPageReference.state?.c__oppid;

            // RESET FLOW ON LOAD
            this.currentStep = 'TypeSelection';
            this.visitedSteps = ['TypeSelection'];
            this.showLandingPage = true;
            this.showBuildYourOwn = false;
        }
    }
    connectedCallback() {
        console.log('I am V6');
    }
    handleBuildClick() {
        this.isLoading = true;
        this.showLandingPage = false;
        this.showBuildYourOwn = true;

        // Move to the first actual step of the V6 flow
        this.currentStep = 'Track';
        if (!this.visitedSteps.includes('TypeSelection')) {
            this.visitedSteps.push('TypeSelection');
        }

        setTimeout(() => { this.isLoading = false; }, 800);
    }
    handleStepChange(event) {
        const next = event.detail.nextStep;
        if (!this.visitedSteps.includes(this.currentStep)) {
            this.visitedSteps = [...this.visitedSteps, this.currentStep];
        }
        this.currentStep = next;
    }

    handlePathSelection(event) {
        const target = event.detail.currentStep;
        if (target === 'TypeSelection') {
            this.showLandingPage = true;
            this.showBuildYourOwn = false;
            this.visitedSteps = ['TypeSelection'];
            this.currentStep = target;
            return;
        }

        // Truncate History
        const idx = this.visitedSteps.indexOf(target);
        if (idx !== -1) {
            this.visitedSteps = this.visitedSteps.slice(0, idx + 1);
        }
        this.currentStep = target;

        // Tell the active engine to update its internal state
        const engine = this.template.querySelector('c-capsa-v-6-build');
        if (engine) engine.jumpToStep(target);
    }

    handleResetFlow() {
        this.dispatchEvent(new CustomEvent('resetflow'));
        this.showLandingPage = true;
        this.showBuildYourOwn = false;
        this.currentStep = 'TypeSelection';
        this.visitedSteps = ['TypeSelection'];
    }
}
import { LightningElement, api, track,wire } from 'lwc';
import { CurrentPageReference } from 'lightning/navigation';
export default class capsaWoodBlendTreatmentUI extends LightningElement {
    // Passed in from the parent Product Selector tab
    @api opportunityId; 
    
    // Hardcoded to Medication so the path bar and child components fetch the right data
    @api productType;
    quoteId;

    @track visitedSteps = ['TypeSelection'];
    currentStep = 'TypeSelection';
    
    showLandingPage = true;
    showBuildYourOwn = false;
    isLoading = false;

    @wire(CurrentPageReference)

    getStateParameters(currentPageReference) {

        if (currentPageReference) {

            console.log(
                '🟢 WOODBLEND FULL STATE =>',
                JSON.stringify(currentPageReference.state)
            );

            this.quoteId =
                currentPageReference.state?.c__quoteid;

            this.opportunityId =
                currentPageReference.state?.c__oppid;

            console.log(
                '🟢 WoodBlend Quote Id =>',
                this.quoteId
            );

            console.log(
                '🟢 WoodBlend Opportunity Id =>',
                this.opportunityId
            );

            // IMPORTANT RESET
            this.currentStep = 'TypeSelection';

            this.visitedSteps = ['TypeSelection'];

            this.showLandingPage = true;

            this.showBuildYourOwn = false;
        }
    }

    get allowedSteps() {
        return [...this.visitedSteps, this.currentStep];
    }

    handleBuildClick() {
        this.isLoading = true;
        this.showLandingPage = false;
        this.showBuildYourOwn = true;
        
        // Move to the second step in your metadata sequence (Use Case)
        this.currentStep = 'UseCase'; 
        if(!this.visitedSteps.includes('TypeSelection')) {
            this.visitedSteps.push('TypeSelection');
        }

        setTimeout(() => { this.isLoading = false; }, 800);
    }

    // Capture "Next" from Children
    handleStepChange(event) {
        const next = event.detail.nextStep;
        if (!this.visitedSteps.includes(this.currentStep)) {
            this.visitedSteps = [...this.visitedSteps, this.currentStep];
        }
        this.currentStep = next;
    }

    // Capture Path Bar Clicks
    handlePathSelection(event) {
        const target = event.detail.currentStep;
        
        const idx = this.visitedSteps.indexOf(target);
        if (idx !== -1) {
            this.visitedSteps = this.visitedSteps.slice(0, idx + 1);
        }

        this.currentStep = target;

        if (target === 'TypeSelection') {
            this.showLandingPage = true;
            this.showBuildYourOwn = false;
            this.visitedSteps = ['TypeSelection'];
        } else {
            const engine = this.template.querySelector('c-capsa-wood-blend-build');
            if (engine) engine.jumpToStep(target);
        }
    }

    handleResetFlow() {
        this.dispatchEvent(new CustomEvent('resetflow'));

        this.showLandingPage = true;
        this.showBuildYourOwn = false;
        
        this.currentStep = 'TypeSelection';
        this.visitedSteps = ['TypeSelection'];
    }
}
import { LightningElement, api, track,wire } from 'lwc';
import { CurrentPageReference } from 'lightning/navigation';

export default class CapsaPAUI extends LightningElement {
    // Passed in from the parent Product Selector tab
    @api opportunityId; 
    quoteId;
    
    // Hardcoded to PA so the path bar and child components fetch the right data
    @api productType = 'PA';

    @track visitedSteps = ['TypeSelection'];
    currentStep = 'TypeSelection';

    // Hides the Service step from the path bar without removing the step/component itself.
    hiddenSteps = ['Service'];

    showLandingPage = true;
    showBuildYourOwn = false;
    isLoading = false;

    get allowedSteps() {
        return [...this.visitedSteps, this.currentStep];
    }

    @wire(CurrentPageReference)
    getStateParameters(currentPageReference) {

        if (currentPageReference) {

            console.log(
                '🟢 PA FULL STATE =>',
                JSON.stringify(currentPageReference.state)
            );

            this.quoteId =
                currentPageReference.state?.c__quoteid;

            this.opportunityId =
                currentPageReference.state?.c__oppid;

            console.log(
                '🟢 PA Quote Id =>',
                this.quoteId
            );

            console.log(
                '🟢 PA Opportunity Id =>',
                this.opportunityId
            );

            // RESET FLOW
            this.currentStep = 'TypeSelection';

            this.visitedSteps = ['TypeSelection'];

            this.showLandingPage = true;

            this.showBuildYourOwn = false;
        }
    }

    handleBuildClick() {
        this.isLoading = true;
        this.showLandingPage = false;
        this.showBuildYourOwn = true;
        
        // Move to the second step in your metadata sequence (Use Case)
        this.currentStep = 'TableTopUnit'; 
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
        
        // Truncate History if moving backward
        const idx = this.visitedSteps.indexOf(target);
        if (idx !== -1) {
            this.visitedSteps = this.visitedSteps.slice(0, idx + 1);
        }

        this.currentStep = target;

        // Logic to go back to the welcome landing page
        if (target === 'TypeSelection') {
            this.showLandingPage = true;
            this.showBuildYourOwn = false;
            this.visitedSteps = ['TypeSelection'];
        } else {
            // Tell the active engine to update its internal index
            const engine = this.template.querySelector('c-capsa-p-a-u-i-build');
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
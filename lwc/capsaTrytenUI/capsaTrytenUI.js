import { LightningElement, api, track, wire } from 'lwc';
import { CurrentPageReference } from 'lightning/navigation';
// import getPreconfiguredCarts from '@salesforce/apex/CartConfiguratorController.getPreconfiguredCarts';

export default class CapsaTrytenUI extends LightningElement {
    @api opportunityId;
    @api productType = 'Tryten';
    quoteId;

    @track packageConfigs = null; // Scope for future packages
    @track visitedSteps = ['TypeSelection'];
    currentStep = 'TypeSelection';

    showLandingPage = true;
    showBuildYourOwn = false;
    isLoading = false;

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

    get allowedSteps() {
        return [...this.visitedSteps, this.currentStep];
    }

    // Future wire for Packages can be uncommented here when needed.

    handleBuildClick() {
        this.startFlow('BYO');
    }

    startFlow(type) {
        this.isLoading = true;
        this.showLandingPage = false;
        this.showBuildYourOwn = (type === 'BYO');
        
        // Move to the first actual step of the Tryten flow
        if(this.showBuildYourOwn) this.currentStep = 'UseCase'; 
        if(!this.visitedSteps.includes('TypeSelection')) this.visitedSteps.push('TypeSelection');

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
        
        // Truncate History
        const idx = this.visitedSteps.indexOf(target);
        if (idx !== -1) {
            this.visitedSteps = this.visitedSteps.slice(0, idx + 1);
        }

        this.currentStep = target;

        // Route back to landing page if TypeSelection is clicked
        if (target === 'TypeSelection') {
            this.showLandingPage = true;
            this.showBuildYourOwn = false;
            this.visitedSteps = ['TypeSelection'];
        } else {
            // Tell the active engine to update its internal state
            const engine = this.template.querySelector('c-capsa-tryten-build');
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
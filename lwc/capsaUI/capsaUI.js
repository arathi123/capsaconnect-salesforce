import { LightningElement, wire, track, api } from 'lwc';
import { CurrentPageReference } from 'lightning/navigation';
import getPreconfiguredCarts from '@salesforce/apex/CartConfiguratorController.getPreconfiguredCarts';

export default class CapsaUI extends LightningElement {
    @api opportunityId; // Now fully controlled by the parent component
    @api productType = 'Medical';
    quoteId;

    @track packageConfigs;
    @track visitedSteps = ['TypeSelection'];
    currentStep = 'TypeSelection';
    
    showLandingPage = true;
    showBuildYourOwn = false;
    showPackageFlow = false;
    isLoading = false;

    selectedCartLabel = '';
    selectedCartId = '';
    selectedCartPath = '';
    selectedCartUniqueId = '';

    // connectedCallback has been completely removed as it's no longer needed

    get allowedSteps() {
        return [...this.visitedSteps, this.currentStep];
    }

    @wire(CurrentPageReference)

    getStateParameters(currentPageReference) {

        if (currentPageReference) {

            // IMPORTANT RESET
            this.resetConfiguratorState();

            this.quoteId =
                currentPageReference.state?.c__quoteid;

            this.opportunityId =
                currentPageReference.state?.c__oppid;

            console.log(
                '🟢 MEDICAL Quote Id =>',
                this.quoteId
            );

            console.log(
                '🟢 MEDICAL Opp Id =>',
                this.opportunityId
            );

            console.log(
                '🟢 MEDICAL STATE RESET DONE'
            );
        }
    }

    @wire(getPreconfiguredCarts, { productFamily: '$productType' })
    wiredPackages({ error, data }) {
        if (data) this.packageConfigs = data;
    }

    handleBuildClick() {
        this.startFlow('BYO');
    }

    handleSelect(event) {
        this.selectedCartUniqueId = event.target.dataset.id;
        this.selectedCartLabel = this.packageConfigs.find(pkg => pkg.Unique_Identifier__c === this.selectedCartUniqueId)?.Option_Label__c || 'Selected Package';
        this.selectedCartId = this.packageConfigs.find(pkg => pkg.Unique_Identifier__c === this.selectedCartUniqueId)?.Option_Key__c || event.target.dataset.id;
        this.selectedCartPath = event.target.dataset.path;
        this.startFlow('PKG');
    }

    startFlow(type) {
        this.isLoading = true;
        this.showLandingPage = false;
        this.showBuildYourOwn = (type === 'BYO');
        this.showPackageFlow = (type === 'PKG');
        
        // Move to the first actual step of the flows
        if(this.showBuildYourOwn) this.currentStep = 'UseCase'; 
        if(!this.visitedSteps.includes('TypeSelection')) this.visitedSteps.push('TypeSelection');

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
        
        // Truncate History
        const idx = this.visitedSteps.indexOf(target);
        if (idx !== -1) {
            this.visitedSteps = this.visitedSteps.slice(0, idx + 1);
        }

        this.currentStep = target;

        // Logic to go back to landing page
        if (target === 'TypeSelection') {
            this.showLandingPage = true;
            this.showBuildYourOwn = false;
            this.showPackageFlow = false;
            this.visitedSteps = ['TypeSelection'];
        } else {
            // Tell the active engine to update its internal index
            const engine = this.template.querySelector('c-capsa-build-your-own') || 
                           this.template.querySelector('c-capsa-package-flow');
            if (engine) engine.jumpToStep(target);
        }
    }

    handleResetFlow() {
        // Broadcast to the topmost parent to reset the flow
        this.dispatchEvent(new CustomEvent('resetflow'));
        
        // Reset the UI toggles
        this.showLandingPage = true;
        this.showBuildYourOwn = false;
        this.showPackageFlow = false;
        
        // Reset the Path Bar and history
        this.currentStep = 'TypeSelection';
        this.visitedSteps = ['TypeSelection'];
        
        // Clear cached IDs
        this.selectedCartId = '';
        this.selectedCartPath = '';
    }

    resetConfiguratorState() {

        this.showLandingPage = true;

        this.showBuildYourOwn = false;

        this.showPackageFlow = false;

        this.currentStep = 'TypeSelection';

        this.visitedSteps = ['TypeSelection'];

        this.selectedCartLabel = '';

        this.selectedCartId = '';

        this.selectedCartPath = '';

        this.selectedCartUniqueId = '';
    }
}
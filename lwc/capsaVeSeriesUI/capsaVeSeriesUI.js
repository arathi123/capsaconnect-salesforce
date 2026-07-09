import { LightningElement, api, track, wire } from 'lwc';
import { CurrentPageReference } from 'lightning/navigation';
import getPreconfiguredCarts from '@salesforce/apex/CartConfiguratorController.getPreconfiguredCarts';

export default class CapsaVeSeriesUI extends LightningElement {
    @api opportunityId;
    @api productType = 'VE-Series';
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

    @wire(CurrentPageReference)

    getStateParameters(currentPageReference) {

        if (currentPageReference) {
            console.log(
                '🟢 VE FULL STATE =>',
                JSON.stringify(currentPageReference.state)
            );

            this.quoteId =
                currentPageReference.state?.c__quoteid;

            this.opportunityId =
                currentPageReference.state?.c__oppid;

            console.log(
                '🟢 VE Quote Id =>',
                this.quoteId
            );

            console.log(
                '🟢 VE Opportunity Id =>',
                this.opportunityId
            );

            // RESET FLOW
            this.currentStep = 'TypeSelection';
            this.visitedSteps = ['TypeSelection'];
            this.showLandingPage = true;
            this.showBuildYourOwn = false;
            this.showPackageFlow = false;
        }
    }

    get allowedSteps() {
        return [...this.visitedSteps, this.currentStep];
    }

    @wire(getPreconfiguredCarts, { productFamily: '$productType' })
    wiredPackages({ error, data }) {
        if (data) {
            this.packageConfigs = data;
        } else if (error) {
            console.error('🔴 Package Error:', error);
        }
    }

    handleBuildClick() {
        this.startFlow('BYO');
    }

    handleSelect(event) {
        this.selectedCartUniqueId = event.target.dataset.id;
        this.selectedCartLabel = this.packageConfigs.find(pkg => pkg.Unique_Identifier__c === this.selectedCartUniqueId)?.Option_Label__c || 'Selected Package';
        this.selectedCartId = this.packageConfigs.find(pkg => pkg.Unique_Identifier__c === this.selectedCartUniqueId)?.Option_Key__c || event.target.dataset.id;
        this.selectedCartPath = event.target.dataset.path; // Crucial for parsing JSON!
        this.startFlow('PKG');
    }

    startFlow(type) {
        this.isLoading = true;
        this.showLandingPage = false;
        this.showBuildYourOwn = (type === 'BYO');
        this.showPackageFlow = (type === 'PKG');
        
       if(this.showBuildYourOwn)
                   this.currentStep = 'UseCase';
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
        
        const idx = this.visitedSteps.indexOf(target);
        if (idx !== -1) {
            this.visitedSteps = this.visitedSteps.slice(0, idx + 1);
        }

        this.currentStep = target;

        if (target === 'TypeSelection') {
            this.showLandingPage = true;
            this.showBuildYourOwn = false;
            this.showPackageFlow = false;
            this.visitedSteps = ['TypeSelection'];
        } else {
            const engine = this.template.querySelector('c-capsa-ve-series-build') || 
                           this.template.querySelector('c-capsa-ve-series-package-flow');
            if (engine) engine.jumpToStep(target);
        }
    }

    handleResetFlow() {
        this.dispatchEvent(new CustomEvent('resetflow'));
        this.showLandingPage = true;
        this.showBuildYourOwn = false;
        this.showPackageFlow = false;
        this.currentStep = 'TypeSelection';
        this.visitedSteps = ['TypeSelection'];
        this.selectedCartId = '';
        this.selectedCartPath = '';
    }
}
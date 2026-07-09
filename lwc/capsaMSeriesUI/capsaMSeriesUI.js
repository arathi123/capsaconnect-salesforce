import { LightningElement, api, track, wire } from 'lwc';
import {CurrentPageReference} from 'lightning/navigation';

import getPreconfiguredCarts from '@salesforce/apex/CartConfiguratorController.getPreconfiguredCarts';

export default class CapsaMSeriesUI extends LightningElement {

    @api opportunityId;
    @api productType = 'M-Series';
    quoteId;

    @track packageConfigs;

    @track visitedSteps = ['TypeSelection'];

    currentStep = 'TypeSelection';

    showLandingPage = true;
    showBuildYourOwn = false;

    // ✅ NEW
    showPackageFlow = false;

    isLoading = false;

    // ✅ NEW
    selectedCartLabel = '';
    selectedCartId = '';
    selectedCartPath = '';
    selectedCartUniqueId = '';

    @wire(CurrentPageReference)
    getStateParameters(currentPageReference) {

        if (currentPageReference) {

            console.log(
                'FULL STATE =>',
                JSON.stringify(currentPageReference.state)
            );

            this.quoteId =
                currentPageReference.state?.c__quoteid;

            this.opportunityId =
                currentPageReference.state?.c__oppid;

            console.log(
                ' Quote Id =>',
                this.quoteId
            );

            console.log(
                ' Opportunity Id =>',
                this.opportunityId
            );

            console.log(
                '🟢 RESETTING FLOW TO LANDING PAGE'
            );

            // RESET COMPLETE FLOW
            this.currentStep = 'TypeSelection';

            this.visitedSteps = ['TypeSelection'];

            this.showLandingPage = true;

            this.showBuildYourOwn = false;

            this.showPackageFlow = false;

            this.selectedCartLabel = '';

            this.selectedCartId = '';

            this.selectedCartPath = '';

            this.selectedCartUniqueId = '';

            console.log(
                ' showLandingPage =>',
                this.showLandingPage
            );

            console.log(
                ' showBuildYourOwn =>',
                this.showBuildYourOwn
            );

            console.log(
                ' showPackageFlow =>',
                this.showPackageFlow
            );

            console.log(
                ' currentStep =>',
                this.currentStep
            );
        }
    }

    get allowedSteps() {
        return [...this.visitedSteps, this.currentStep];
    }

    //  NEW
    @wire(getPreconfiguredCarts, { productFamily: '$productType' })
    wiredPackages({ error, data }) {

        if (data) {
            this.packageConfigs = data;
        } else if (error) {
            console.error(' Package Error:', error);
        }
    }


    handleBuildClick() {

        this.isLoading = true;

        this.showLandingPage = false;

        this.showBuildYourOwn = true;

        this.showPackageFlow = false;

        this.currentStep = 'UseCase';

        if (!this.visitedSteps.includes('TypeSelection')) {
            this.visitedSteps.push('TypeSelection');
        }

        setTimeout(() => {
            this.isLoading = false;
        }, 800);
    }

    //  NEW PACKAGE SELECT
    handleSelect(event) {

        this.selectedCartUniqueId =
            event.target.dataset.id;

        const selectedPkg =
            this.packageConfigs.find(
                pkg =>
                    pkg.Unique_Identifier__c ===
                    this.selectedCartUniqueId
            );

        this.selectedCartLabel =
            selectedPkg?.Option_Label__c || '';

        this.selectedCartId =
            selectedPkg?.Option_Key__c || '';

        this.selectedCartPath =
            selectedPkg?.Path__c || '';

        console.log(
            'Selected Package:',
            this.selectedCartLabel
        );

        this.isLoading = true;

        this.showLandingPage = false;

        this.showBuildYourOwn = false;

        //  PACKAGE FLOW
        this.showPackageFlow = true;

        //  FIRST STEP
        this.currentStep = 'AccessoryKit';

        setTimeout(() => {

            this.isLoading = false;

        }, 500);
    }

    handleStepChange(event) {

        const next = event.detail.nextStep;

        if (!this.visitedSteps.includes(this.currentStep)) {

            this.visitedSteps = [
                ...this.visitedSteps,
                this.currentStep
            ];
        }

        this.currentStep = next;
    }

    handlePathSelection(event) {

        const target = event.detail.currentStep;

        const idx = this.visitedSteps.indexOf(target);

        if (idx !== -1) {

            this.visitedSteps =
                this.visitedSteps.slice(0, idx + 1);
        }

        this.currentStep = target;

        if (target === 'TypeSelection') {

            this.showLandingPage = true;

            this.showBuildYourOwn = false;

            // ✅ NEW
            this.showPackageFlow = false;

            this.visitedSteps = ['TypeSelection'];

        } else {

            const engine =
                this.template.querySelector(
                    'c-capsa-mseries-build'
                ) ||
                this.template.querySelector(
                    'c-capsa-mseries-package-flow'
                );

            if (engine) {

                engine.jumpToStep(target);
            }
        }
    }

    handleResetFlow() {

        this.dispatchEvent(
            new CustomEvent('resetflow')
        );

        this.showLandingPage = true;

        this.showBuildYourOwn = false;

        // ✅ NEW
        this.showPackageFlow = false;

        this.currentStep = 'TypeSelection';

        this.visitedSteps = ['TypeSelection'];
    }
}
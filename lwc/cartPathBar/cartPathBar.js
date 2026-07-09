import { LightningElement, api, track } from 'lwc';
import getConfiguratorStepsFresh from '@salesforce/apex/CartConfiguratorController.getConfiguratorStepsFresh';

export default class CartPathBar extends LightningElement {
    @api currentStep;
    @api productFamily = 'Medical';
    @api enabledSteps = [];
    @api hiddenSteps = [];
    @track allSteps = [];
    error;

    connectedCallback() {
        getConfiguratorStepsFresh({ productFamily: this.productFamily || 'Medical' })
            .then(data => {
                this.allSteps = data || [];
                // @@DEBUG — compare the two key sources directly
                console.log('@@DEBUG allSteps Step_Key__c values:', JSON.stringify(this.allSteps.map(s => s.Step_Key__c)));
                console.log('@@DEBUG enabledSteps passed in:', JSON.stringify(this.enabledSteps));
            })
            .catch(err => {
                this.error = err && err.body ? err.body.message : JSON.stringify(err);
            });
    }

    get computedSteps() {
        const visibleSteps = this.allSteps.filter(s => !this.hiddenSteps.includes(s.Step_Key__c));
        const currentIndex = visibleSteps.findIndex(s => s.Step_Key__c === this.currentStep);
        // @@DEBUG — log every render to see live enabled/disabled resolution
        console.log('@@DEBUG computedSteps currentStep:', this.currentStep, 'enabledSteps:', JSON.stringify(this.enabledSteps));
        return visibleSteps.map((step, index) => {
            let classes = 'slds-path__item ';
            const isEnabled = this.enabledSteps.includes(step.Step_Key__c);
            // @@DEBUG — flag any step whose key didn't match enabledSteps
            if (!isEnabled) {
                console.log('@@DEBUG step DISABLED — Step_Key__c:', step.Step_Key__c, '| not found in enabledSteps:', JSON.stringify(this.enabledSteps));
            }
            if (index < currentIndex) {
                classes += 'slds-is-complete';
            } else if (index === currentIndex) {
                classes += 'slds-is-current slds-is-active';
            } else {
                classes += 'slds-is-incomplete';
            }
            if (!isEnabled) {
                classes += ' step-disabled';
            }
            return {
                label: step.Step_Label__c,
                key: step.Step_Key__c,
                classList: classes
            };
        });
    }

    handleClick(event) {
        const requestedStep = event.currentTarget.dataset.key;
        if (requestedStep === this.currentStep) return;
        if (!this.enabledSteps.includes(requestedStep)) {
            console.log('@@DEBUG click blocked — requestedStep:', requestedStep, 'not in enabledSteps:', JSON.stringify(this.enabledSteps));
            return;
        }
        const allKeys = this.allSteps.map(s => s.Step_Key__c);
        if (allKeys.indexOf(requestedStep) > allKeys.indexOf(this.currentStep)) {
            return;
        }
        let alertMessage = this.getAlertMessage(requestedStep);
        if (confirm(alertMessage)) {
            this.dispatchEvent(new CustomEvent("childevent", {
                detail: {
                    currentStep: requestedStep
                }
            }));
        }
    }

    getAlertMessage(step) {
        const messages = {
            'Height': 'Are you sure you want to move back? Progress will be lost.',
            'Accessories': 'Going back requires a restart. Continue?',
            'TypeSelection': 'Restarting will clear all current selections. Are you sure?'
        };
        return messages[step] || `Return to ${step}?`;
    }

    handleBack() {
        if (confirm('Return to the product selector? Any unsaved progress will be lost.')) {
            this.dispatchEvent(
                new CustomEvent('backtoproducts')
            );
        }
    }
}
import { LightningElement, api, track } from 'lwc';

const STEPS = [
    { name: 'CartType', label: 'Cart Type' },
    { name: 'Storage', label: 'Storage' },
    { name: 'Accessories', label: 'Accessories' },
    { name: 'Assembly', label: 'Assembly' },
    { name: 'Warranty', label: 'Warranty' },
    { name: 'Results', label: 'Results' }
];
export default class CapsaSlimCartBuild extends LightningElement {

    @api opportunityId;
    @api productType;
    @api quoteId;
    
    @track currentStep = 'CartType';

     // THE CLEAN STATE TRACKER: Everything is an Array
    @track selections = {
        Cart_Type: [],
        Storage: [],
        Accessories: [],
        Assembly: [],
        Warranty: [],
        Results: [] 
    };

    // Step Getters 
    get isCartType() { return this.currentStep === 'CartType'; }
    get isStorage() { return this.currentStep === 'Storage'; }
    get isAccessories() { return this.currentStep === 'Accessories'; }
    get isAssembly() { return this.currentStep === 'Assembly'; }
    get isWarranty() { return this.currentStep === 'Warranty'; }
    get isResults() { return this.currentStep === 'Results'; }

     @api jumpToStep(stepName) {
            this.currentStep = stepName;
            
            const targetIdx = STEPS.findIndex(s => s.name === stepName);
            
            if (targetIdx !== -1) {
                // Clear arrays downstream of the jump
                if (targetIdx < STEPS.findIndex(s => s.name === 'CartType')) this.selections.Cart_Type =[];
                if (targetIdx < STEPS.findIndex(s => s.name === 'Storage')) this.selections.Storage = [];
                if (targetIdx < STEPS.findIndex(s => s.name === 'Accessories')) this.selections.Accessories = [];
                if (targetIdx < STEPS.findIndex(s => s.name === 'Assembly')) this.selections.Assembly = [];
                if (targetIdx < STEPS.findIndex(s => s.name === 'Warranty')) this.selections.Warranty = [];
                if (targetIdx < STEPS.findIndex(s => s.name === 'Results')) this.selections.Results = [];
            }
        }
    
        // ==========================================
        // THE MASTER STEP HANDLER
        // ==========================================
        handleStepComplete(event) {
           const incomingData = event.detail;
            for (let key in incomingData) {
                this.selections[key] = incomingData[key];
            }
    
            console.log('=== ENGINE STATE1 ===');
             console.log(JSON.parse(JSON.stringify(this.selections)));

    
            const currentIndex = STEPS.findIndex(s => s.name === this.currentStep);
            let nextStepName = 'Results'; 
    
           //  Extract the selected Use Case key from the unified array (Safely)
            const useCaseKey = this.selections.Cart_Type.length > 0 ? this.selections.Cart_Type[0].key : '';
            if (currentIndex !== -1 && currentIndex < STEPS.length - 1) {
                console.log('cur index'+currentIndex);
                console.log('step length'+STEPS.length);
               
                nextStepName = STEPS[currentIndex + 1].name;
            }
    
            this.currentStep = nextStepName;
            
            this.dispatchEvent(new CustomEvent('stepchange', {
                detail: { nextStep: nextStepName }
            }));
        }
}
import { LightningElement, api, track } from 'lwc';

export default class CapsaTrytenBuild extends LightningElement {
    @api opportunityId;
    @api productType;
    @api quoteId;

    @track currentStep = 'UseCase'; // Matches your path bar step

    // Update to natively hold the new architecture keys
    @track selections = {
        APP: '',
        ARM: '',
        SIZE: '',
        CASE: '',
        FOOTPRINT: '',
        CONFIG: '',
        MOUNT: '',
        accessories: []
    };

    @api jumpToStep(stepName) {
        this.currentStep = stepName;
    }

    get isUseCase() { return this.currentStep === 'UseCase'; }
    get isAccessories() { return this.currentStep === 'Accessories'; }
    get isResults() { return this.currentStep === 'Results'; }

    handleUseCaseNext(event) {
        const useCaseData = event.detail.selections;
        
        this.selections.APP = useCaseData.APP;
        this.selections.ARM = useCaseData.ARM;
        this.selections.SIZE = useCaseData.SIZE;
        this.selections.CASE = useCaseData.CASE;
        this.selections.FOOTPRINT = useCaseData.FOOTPRINT;
        this.selections.CONFIG = useCaseData.CONFIG;
        this.selections.MOUNT = useCaseData.MOUNT;
        
        // Save the image!
        this.selections.previewImage = event.detail.previewImage; 

        this.currentStep = 'Accessories';
        this.dispatchEvent(new CustomEvent('stepchange', {
            detail: { nextStep: 'Accessories' }
        }));
    }

    handleAccessoryNext(event) {
        // Capture accessories and move to results
        this.selections.accessories = event.detail;
        
        this.currentStep = 'Results';
        this.dispatchEvent(new CustomEvent('stepchange', {
            detail: { nextStep: 'Results' }
        }));
    }
}
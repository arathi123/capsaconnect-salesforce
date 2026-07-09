import { LightningElement, track, api } from 'lwc';
import getOptionsByStepAndFamily from '@salesforce/apex/CartConfiguratorController.getOptionsByStepAndFamily';

export default class CarelinkUseCase extends LightningElement {
    @api productType = 'CareLink';
    @api selections;

    @track rawCartTypes = [];
    @track rawSpecialties = [];

    @track currentPreviewImage = '/resource/carelinkImagesPart1/carelinkImagesPart1/carelink.jpg';
    @track isLoading = true;
    
    // Internal UI trackers
    @track selectedCartType = '';
    @track selectedSpecialty = '';
    @track hoveredCartTypeKey = '';
    @track hoveredSpecialtyKey = '';

    connectedCallback() {
        this.fetchAllMetadata();
    }

    async fetchAllMetadata() {
        try {
            const [cartData, specData] = await Promise.all([
                getOptionsByStepAndFamily({ stepKey: 'CART TYPE', productFamily: this.productType }),
                getOptionsByStepAndFamily({ stepKey: 'SPECIALTY', productFamily: this.productType })
            ]);

            this.rawCartTypes = cartData || [];
            this.rawSpecialties = specData || [];

            // Restore state from Unified Array Architecture
            if (this.selections && this.selections.USE_CASE && this.selections.USE_CASE.length > 0) {
                this.selectedCartType = this.selections.USE_CASE[0].key;
                
                // If it's a specialty cart, the specific specialty is the second item in the array
                if (this.selectedCartType === 'Specialty' && this.selections.USE_CASE.length > 1) {
                    this.selectedSpecialty = this.selections.USE_CASE[1].key;
                }
                
                this.updatePreviewImage();
            }
        } catch (error) {
            console.error('Error fetching CareLink Use Case options:', error);
        } finally {
            this.isLoading = false;
        }
    }

    // --- Hover Logic ---
    handleCartTypeMouseEnter(event) { this.hoveredCartTypeKey = event.currentTarget.dataset.key; }
    handleCartTypeMouseLeave() { this.hoveredCartTypeKey = ''; }
    
    handleSpecialtyMouseEnter(event) { this.hoveredSpecialtyKey = event.currentTarget.dataset.key; }
    handleSpecialtyMouseLeave() { this.hoveredSpecialtyKey = ''; }

    // --- Selection Logic ---
    handleCartTypeSelect(event) {
        const key = event.currentTarget.dataset.key;
        if (this.selectedCartType === key) return;

        this.selectedCartType = key;
        
        // Reset specialty if they changed top-level cart type
        if (key !== 'Specialty') {
            this.selectedSpecialty = '';
        }
        
        this.updatePreviewImage();
    }

    handleSpecialtySelect(event) {
        this.selectedSpecialty = event.currentTarget.dataset.key;
        this.updatePreviewImage();
    }

    // --- Image Updater ---
    updatePreviewImage() {
        if (this.selectedCartType === 'Specialty') {
            if (this.selectedSpecialty) {
                const specOpt = this.rawSpecialties.find(opt => opt.Option_Key__c === this.selectedSpecialty);
                this.currentPreviewImage = specOpt?.Preview_Image_URL__c || this.currentPreviewImage;
            }
        } else if (this.selectedCartType) {
            const cartOpt = this.rawCartTypes.find(opt => opt.Option_Key__c === this.selectedCartType);
            this.currentPreviewImage = cartOpt?.Preview_Image_URL__c || this.currentPreviewImage;
        }
    }

    // --- LWC Getters ---
    get cartTypeOptions() {
        return this.rawCartTypes.map(opt => {
            const isSelected = opt.Option_Key__c === this.selectedCartType;
            return {
                ...opt,
                isSelected: isSelected,
                isVisible: isSelected || opt.Option_Key__c === this.hoveredCartTypeKey,
                rowClass: isSelected ? 'option-row selected' : 'option-row'
            };
        });
    }

    get showSpecialtyOptions() {
        return this.selectedCartType === 'Specialty';
    }

    get specialtyOptions() {
        return this.rawSpecialties.map(opt => {
            const isSelected = opt.Option_Key__c === this.selectedSpecialty;
            return {
                ...opt,
                isSelected: isSelected,
                isVisible: isSelected || opt.Option_Key__c === this.hoveredSpecialtyKey,
                rowClass: isSelected ? 'option-row selected' : 'option-row'
            };
        });
    }

    get isStepComplete() {
        if (this.selectedCartType === 'Specialty') {
            return this.selectedSpecialty !== '';
        }
        return this.selectedCartType !== '';
    }

    // --- Output Generator ---
    handleNext() {
        const parentOpt = this.rawCartTypes.find(opt => opt.Option_Key__c === this.selectedCartType);
        
        // Build Unified Array
        let payloadArray = [];
        
        // 1. Add Base Cart Type (Routing Key)
        if (parentOpt) {
            payloadArray.push({
                key: parentOpt.Option_Key__c,      
                label: parentOpt.Option_Label__c,  
                sku: null                          
            });
        }

        // 2. Add Specialty Option if applicable (Routing Key)
        if (this.selectedCartType === 'Specialty' && this.selectedSpecialty) {
            const childOpt = this.rawSpecialties.find(opt => opt.Option_Key__c === this.selectedSpecialty);
            if (childOpt) {
                payloadArray.push({
                    key: childOpt.Option_Key__c,
                    label: childOpt.Option_Label__c,
                    sku: null
                });
            }
        }

        // Dispatch perfectly structured state
        this.dispatchEvent(new CustomEvent('stepcomplete', {
            detail: { 
                USE_CASE: payloadArray, 
                previewImage: this.currentPreviewImage 
            }
        }));
    }
}
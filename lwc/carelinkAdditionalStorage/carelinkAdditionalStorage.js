import { LightningElement, track, api } from 'lwc';
import getOptionsByStepAndFamily from '@salesforce/apex/CartConfiguratorController.getOptionsByStepAndFamily';

export default class CarelinkAdditionalStorage extends LightningElement {
    @api productType = 'CareLink';
    @api selections; 

    @track rawOptions = [];
    @track selectedKeys = []; 
    
    @track layeredPreview = null;
    @track isLoading = true;
    @track isModalOpen = false;

    connectedCallback() {
        if (this.selections?.layeredPreview) {
            this.layeredPreview = this.selections.layeredPreview;
        }

        this.extractPreviousState();
        this.fetchAllMetadata();
    }

    extractPreviousState() {
        const prevSelections = this.selections?.ADDITIONAL_STORAGE || [];
        if (prevSelections.length > 0) {
            this.selectedKeys = prevSelections.map(opt => opt.key);
        }
    }

    async fetchAllMetadata() {
        try {
            const data = await getOptionsByStepAndFamily({ stepKey: 'ADDITIONAL STORAGE', productFamily: this.productType });
            this.rawOptions = data || [];
        } catch (error) {
            console.error('Error fetching CareLink Additional Storage options:', error);
        } finally {
            this.isLoading = false;
        }
    }

    // Modal Handlers
    openModal() { this.isModalOpen = true; }
    closeModal() { this.isModalOpen = false; }

    // --- CHECKBOX LOGIC (Handling 'None') ---
    handleCheckboxChange(event) {
        const key = event.target.dataset.key;
        const isChecked = event.target.checked;
        
        let currentSelections = [...this.selectedKeys];

        if (key === 'None') {
            if (isChecked) {
                currentSelections = ['None'];
            } else {
                currentSelections = [];
            }
        } else {
            if (isChecked) {
                currentSelections = currentSelections.filter(k => k !== 'None');
                currentSelections.push(key);
            } else {
                currentSelections = currentSelections.filter(k => k !== key);
            }
        }

        this.selectedKeys = currentSelections;
    }

    // None Option Getters
    get isNoneSelected() { return this.selectedKeys.includes('None'); }
    get noneRowClass() { return this.isNoneSelected ? 'option-row selected' : 'option-row'; }

    get displayOptions() {
        return this.rawOptions
            .filter(opt => opt.Option_Key__c !== 'None') // Exclude if mistakenly added to metadata
            .map(opt => {
                const isSelected = this.selectedKeys.includes(opt.Option_Key__c);
                return {
                    ...opt,
                    isSelected: isSelected,
                    rowClass: isSelected ? 'option-row selected' : 'option-row'
                };
            });
    }

    get isStepComplete() {
        return this.selectedKeys.length > 0;
    }

    // --- OUTPUT & DYNAMIC ROUTING ---
    handleNext() {
        let payloadArray = [];
        this.selectedKeys.forEach(key => {
            if (key === 'None') {
                payloadArray.push({ key: 'None', label: 'None', sku: null });
            } else {
                const opt = this.rawOptions.find(o => o.Option_Key__c === key);
                if (opt) {
                    payloadArray.push({ key: opt.Option_Key__c, label: opt.Option_Label__c, sku: opt.Option_Key__c });
                }
            }
        });

        let nextStepTarget = 'Accessories'; // Default Fallback

        const specialtyData = this.selections?.USE_CASE || [];
        const specialtyKey = specialtyData.length > 1 ? specialtyData[1].key : '';

        if (specialtyKey === 'Telemedicine' || specialtyKey === 'Telepresence') {
            nextStepTarget = 'Telehealth';
        }

        this.dispatchEvent(new CustomEvent('stepcomplete', {
            detail: { 
                ADDITIONAL_STORAGE: payloadArray,
                overrideNext: nextStepTarget 
            }
        }));
    }
}
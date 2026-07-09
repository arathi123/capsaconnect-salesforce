import { LightningElement, track, api } from 'lwc';
import getOptionsByStepAndFamily from '@salesforce/apex/CartConfiguratorController.getOptionsByStepAndFamily';

// THE MAXBIN MATH CONTROL CENTER
// Calculated exactly from the original 350x633px rendering ratio from the legacy code
const MAXBIN_TOPS = [
    '43.25%', // Tier 1 (Index 0)
    '48.5%', // Tier 2 (Index 1)
    '53.95%', // Tier 3 (Index 2)
    '59.25%', // Tier 4 (Index 3)
    '65.5%', // Tier 5 (Index 4)
    '70.9%'  // Tier 6 (Index 5)
];

export default class CarelinkMaxBinBuilder extends LightningElement {
    @api productType = 'CareLink';
    @api selections; 

    @track rawMaxBinOptions = [];
    @track addedBins = []; 
    @track baseCartImage = '';
    @track isLoading = true;
    maxCapacity = 1;

    connectedCallback() {
        this.baseCartImage = this.selections?.previewImage || '/resource/carelinkImagesPart1/carelinkImagesPart1/documentation.jpg';
        this.extractCapacity();
        this.fetchAllMetadata();
    }

    extractCapacity() {
        const storData = this.selections?.STORAGE || [];
        const moduleOpt = storData.length > 0 ? storData[storData.length - 1] : null;
        if (moduleOpt && moduleOpt.key && moduleOpt.key.startsWith('MB')) {
            const tiers = parseInt(moduleOpt.key.replace('MB', ''), 10);
            this.maxCapacity = isNaN(tiers) ? 1 : tiers;
        } else {
            this.maxCapacity = 1; // Fallback
        }
    }

    async fetchAllMetadata() {
        try {
            const data = await getOptionsByStepAndFamily({ stepKey: 'MAXBIN', productFamily: this.productType });
            this.rawMaxBinOptions = data || [];

            // Restore state if going backward through the configurator
            if (this.selections && this.selections.BUILDER_SLOTS && this.selections.BUILDER_SLOTS.length > 0) {
                this.addedBins = JSON.parse(JSON.stringify(this.selections.BUILDER_SLOTS));
            }
        } catch (error) {
            console.error('Error fetching CareLink MaxBin options:', error);
        } finally {
            this.isLoading = false;
        }
    }

    get usedCapacity() { return this.addedBins.reduce((total, bin) => total + bin.size, 0); }
    get progressBarWidth() { return `width: ${(this.usedCapacity / this.maxCapacity) * 100}%;`; }
    get isStepComplete() { return this.usedCapacity === this.maxCapacity; }

    get availableOptions() {
        return this.rawMaxBinOptions.map(opt => {
            const size = parseInt(opt.Description__c, 10) || 1;
            const isDisabled = (this.usedCapacity + size) > this.maxCapacity;
            return { ...opt, size, isDisabled, btnClass: isDisabled ? 'add-btn disabled' : 'add-btn' };
        });
    }

    get processedAddedBins() {
        return this.addedBins.map((bin, index) => ({
            ...bin,
            isLast: index === this.addedBins.length - 1
        }));
    }

    handleAddBin(event) {
        const key = event.currentTarget.dataset.key;
        const opt = this.rawMaxBinOptions.find(o => o.Option_Key__c === key);
        if (!opt) return;

        const size = parseInt(opt.Description__c, 10) || 1;
        if (this.usedCapacity + size <= this.maxCapacity) {
            const topPos = MAXBIN_TOPS[this.usedCapacity];
            const height = size === 2 ? '10.10%' : '5.05%';
            const zIndex = 20 - this.usedCapacity;

            this.addedBins.push({
                id: this.addedBins.length + 1,
                slotNumber: this.usedCapacity + 1, // Marks the starting tier slot for the results page
                key: opt.Option_Key__c,
                label: `Tier ${this.usedCapacity + 1}: ${opt.Option_Label__c}`,
                sku: null, // SKUs for MaxBin are derived entirely from the chassis selection in Step 6
                selectedImage: opt.Image_URL__c,
                size: size,
                cssStyle: `top: ${topPos}; left: 25.15%; width: 50.5%; height: ${height}; z-index: ${zIndex}; position: absolute;`,
                crossStyle: `top: ${topPos}; left: 78%; width: 20px; height: 20px; z-index: ${zIndex + 1}; position: absolute;`
            });
            this.addedBins = [...this.addedBins];
        }
    }

    handleRemoveBin() {
        this.addedBins.pop();
        this.addedBins = [...this.addedBins];
    }

    handleReset() { this.addedBins = []; }

    handleNext() {
        const stepPayload = {
                BUILDER_SLOTS: this.addedBins, 
            
            layeredPreview: {
                baseImage: this.baseCartImage,
                overlays: this.addedBins.map(bin => ({
                    url: bin.selectedImage,
                    style: bin.cssStyle
                }))
            }
        };

        let nextStepTarget = 'Accessories'; // Default
        
        // Extract Chassis and Specialty from state
        const storData = this.selections?.STORAGE || [];
        const moduleOptKey = storData.length > 0 ? storData[storData.length - 1].key : '';
        const specialtyData = this.selections?.USE_CASE || [];
        const specialtyKey = specialtyData.length > 1 ? specialtyData[1].key : '';

        if (moduleOptKey === 'RX' || moduleOptKey === 'DRX') {
            nextStepTarget = 'AdditionalStorage';
        } else if (specialtyKey === 'Telemedicine' || specialtyKey === 'Telepresence') {
            nextStepTarget = 'Telehealth';
        }

        // Add the override to the dispatch
        this.dispatchEvent(new CustomEvent('stepcomplete', { 
            detail: {
                ...stepPayload,
                overrideNext: nextStepTarget
            } 
        }));
    }
}
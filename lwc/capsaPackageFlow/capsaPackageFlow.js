import { LightningElement, api, track } from 'lwc';

export default class CapsaPackageFlow extends LightningElement {
    @api quoteId;
    @api cartLabel;
    @api cartId;
    @api cartUniqueId;
    @api pathJson;
    @api opportunityId;

    @track pathData = {};
    @track currentSequence = 1;
    @track selections = {
        height: { key: '', label: '', uniqueId: '' },
        lock: { key: '', label: '' },
        accessories: { key: '', label: '', fullRecord: {} }
    };

    colorCodeMapping = {
        'C-EM_RED': 'RED',
        'C-EM_BLUE': 'BLUE',
        'C-PD_EM': 'PED',
        'C-AN_GR': 'GR',
        'C-AN_BLUE': 'B',
        'C-ISL': 'NOLOK', // Since ISL has no lock option, but the code contains Lock Code so are marking color with "NOLOCK"
        'C-PRC': ''
    };
    
    connectedCallback() {
        if (this.pathJson) {
            this.pathData = JSON.parse(this.pathJson);
            this.updateParentStep();
        }
    }

    updateParentStep() {
        const stepName = this.pathData[this.currentSequence]?.key;
        if (stepName) {
            this.dispatchEvent(new CustomEvent('stepchange', {
                detail: { nextStep: stepName }
            }));
        } else if (this.currentSequence === 99) {
            this.dispatchEvent(new CustomEvent('stepchange', {
                detail: { nextStep: 'Results' }
            }));
        }
    }

    @api jumpToStep(stepName) {
        const sequence = Object.keys(this.pathData).find(key => 
            this.pathData[key].key === stepName
        );
        if (sequence) {
            this.currentSequence = parseInt(sequence, 10);
        }
    }

    // Individual Handlers for State Persistence
    handleHeightSelection(event) { this.selections.height = event.detail; }
    handleLockSelection(event) { this.selections.lock = event.detail; }
    handleAccessorySelection(event) { this.selections.accessories = event.detail; }

    // Unified Next Handler
    handleNext(event) {
        const data = event.detail;
        
        // Final sync of data
        if (data.step === 'Height') this.selections.height = data.payload;
        if (data.step === 'Lock') this.selections.lock = data.payload;
        if (data.step === 'Accessories') this.selections.accessories = data.payload;

        // Move Sequence
        if (this.pathData[this.currentSequence + 1]) {
            this.currentSequence++;
            this.updateParentStep();
        } else {
            this.currentSequence = 99; // Final Results
            this.updateParentStep();
        }
    }

    get currentStepKey() { return this.pathData[this.currentSequence]?.key; }
    get currentOptions() { return this.pathData[this.currentSequence]?.options || []; }

    get isHeight() { return this.currentStepKey === 'Height'; }
    get isLock() { return this.currentStepKey === 'Lock'; }
    get isAccessory() { return this.currentStepKey === 'Accessories'; }
    get isResults() { return this.currentSequence === 99; }

    generateProductConfig() {
        const cartCode = this.cartId; 
        const heightCode = this.selections.height.key || 'STD';
        const lockCode = this.selections.lock.key;
        const colorCode = this.colorCodeMapping[this.cartUniqueId] || '';

        const result = `${cartCode}-${heightCode}${lockCode ? '-' + lockCode : ''}${colorCode ? '-' + colorCode : ''}`;
        return result.substring(0, 16);
    }

    get packageSummaryData() {
        return {
            cartLabel: this.cartLabel,
            packageSku: this.generateProductConfig(),
            height: this.selections.height,
            lock: this.selections.lock,
            accessories: this.selections.accessories,
            cartPreviewUniqueId: this.selections.height.uniqueId ? this.selections.height.uniqueId : this.cartUniqueId // If the cart has not gone thorugh height selection, use the cart unique id for preview (since height selection determines the preview image)
        };
    }
}
import { LightningElement, track, wire } from 'lwc';
import getOptionsByStep from '@salesforce/apex/CartConfiguratorController.getOptionsByStep';

export default class ByoBridgeSelection extends LightningElement {
    @track bridgeOptions = [];
    @track tiltBins = [];
    @track bulkBins = [];
    @track shelfOptions = [];
    
    @track selectedBridge = null;
    @track tiltNone = false;
    @track bulkNone = false;
    @track shelfNone = false;

    /**
     * Fetch BRIDGE options (hidden from UI, used for payload only)
     */
    @wire(getOptionsByStep, { stepKey: 'BRIDGE' })
    wiredBridge({ data }) {
        if (data) {
            this.bridgeOptions = data;
            // Auto-select the first bridge option if available
            if (data.length > 0) {
                this.selectedBridge = data[0];
            }
        }
    }

    @wire(getOptionsByStep, { stepKey: 'TILT BIN' })
    wiredTilt({ data }) {
        if (data) this.tiltBins = this.formatOptions(data);
    }

    @wire(getOptionsByStep, { stepKey: 'BRIDGE STORAGE BIN' })
    wiredBulk({ data }) {
        if (data) this.bulkBins = this.formatOptions(data);
    }

    @wire(getOptionsByStep, { stepKey: 'STORAGE SHELF' })
    wiredShelf({ data }) {
        if (data) this.shelfOptions = this.formatOptions(data);
    }

    /**
     * Centralized formatter to handle new Metadata fields
     * Now includes Option_Key__c in the formatted data
     */
    formatOptions(data) {
        return data.map(opt => {
            const isQtyRequired = opt.Is_Quantity_Required__c || false;
            const min = opt.Minimum_Quantity__c || 1;
            const max = opt.Maximum_Quantity__c || 15;

            return {
                ...opt,
                uiKey: opt.Option_Key__c || opt.MasterLabel || opt.Id,
                optionKey: opt.Option_Key__c,  // Store the key separately for payload
                optionLabel: opt.Option_Label__c,  // Store the label separately for payload
                isSelected: false,
                quantity: '',
                isQtyRequired: isQtyRequired,
                isQtyDisabled: true, // Remains disabled until checkbox is checked
                wrapperClass: 'option-wrapper',
                // Generates array from Min to Max
                qtyArray: isQtyRequired 
                    ? Array.from({ length: (max - min) + 1 }, (_, i) => i + min) 
                    : []
            };
        });
    }

    handleTiltToggle(e) {
        const key = e.target.dataset.id;
        this.tiltNone = false;
        this.tiltBins = this.tiltBins.map(opt => {
            if (opt.uiKey === key) {
                const selected = !opt.isSelected;
                return { ...opt, isSelected: selected, wrapperClass: selected ? 'option-wrapper selected' : 'option-wrapper' };
            }
            return opt;
        });
    }

    handleTiltNone(e) {
        this.tiltNone = e.target.checked;
        if (this.tiltNone) {
            this.tiltBins = this.tiltBins.map(opt => ({ ...opt, isSelected: false, wrapperClass: 'option-wrapper' }));
        }
    }

    handleBulkToggle(e) {
        const key = e.target.dataset.id;
        this.bulkNone = false;
        this.bulkBins = this.bulkBins.map(opt => {
            if (opt.uiKey === key) {
                const selected = !opt.isSelected;
                return { 
                    ...opt, 
                    isSelected: selected, 
                    isQtyDisabled: !(selected && opt.isQtyRequired),
                    quantity: selected ? opt.quantity : '', 
                    wrapperClass: selected ? 'option-wrapper selected' : 'option-wrapper' 
                };
            }
            return opt;
        });
    }

    handleBulkQtyChange(e) {
        const key = e.target.dataset.id;
        const val = e.target.value;
        this.bulkBins = this.bulkBins.map(opt => opt.uiKey === key ? { ...opt, quantity: val } : opt);
    }

    handleBulkNone(e) {
        this.bulkNone = e.target.checked;
        if (this.bulkNone) {
            this.bulkBins = this.bulkBins.map(opt => ({ 
                ...opt, 
                isSelected: false, 
                isQtyDisabled: true, 
                quantity: '', 
                wrapperClass: 'option-wrapper' 
            }));
            
            // Imperatively reset all select elements
            const selects = this.template.querySelectorAll('select');
            selects.forEach(select => {
                select.value = '';
            });
        }
    }

    handleShelfChange(e) {
        const key = e.target.value;
        if (key === 'NONE') {
            this.shelfNone = true;
            this.shelfOptions = this.shelfOptions.map(opt => ({ ...opt, isSelected: false, wrapperClass: 'option-wrapper' }));
        } else {
            this.shelfNone = false;
            this.shelfOptions = this.shelfOptions.map(opt => {
                const isSel = opt.uiKey === key;
                return { ...opt, isSelected: isSel, wrapperClass: isSel ? 'option-wrapper selected' : 'option-wrapper' };
            });
        }
    }

    get showNextButton() {
        const tiltValid = this.tiltNone || this.tiltBins.some(b => b.isSelected);
        
        const bulkValid = this.bulkNone || (
            this.bulkBins.some(b => b.isSelected) && 
            this.bulkBins.filter(b => b.isSelected).every(b => !b.isQtyRequired || (b.isQtyRequired && b.quantity))
        );

        const shelfValid = this.shelfNone || this.shelfOptions.some(s => s.isSelected);
        
        return tiltValid && bulkValid && shelfValid;
    }

    /**
     * Format selected items with both label and key
     */
    formatSelectedItems(items) {
        return items.map(item => ({
            optionLabel: item.optionLabel || item.Option_Label__c,
            optionKey: item.optionKey || item.Option_Key__c,
            quantity: item.quantity || ''
        }));
    }

    handleNext() {
        // Get selected tilt bins with label and key
        const selectedTiltBins = this.tiltBins.filter(b => b.isSelected).map(b => ({
            optionLabel: b.optionLabel || b.Option_Label__c,
            optionKey: b.optionKey || b.Option_Key__c,
            quantity: b.quantity || ''
        }));

        // Get selected bulk bins with label and key
        const selectedBulkBins = this.bulkBins.filter(b => b.isSelected).map(b => ({
            optionLabel: b.optionLabel || b.Option_Label__c,
            optionKey: b.optionKey || b.Option_Key__c,
            quantity: b.quantity || ''
        }));

        // Get selected shelf with label and key
        const selectedShelf = this.shelfNone 
            ? { optionLabel: 'None', optionKey: 'NONE' }
            : this.shelfOptions.find(s => s.isSelected);

        const shelfData = selectedShelf ? {
            optionLabel: selectedShelf.optionLabel || selectedShelf.Option_Label__c,
            optionKey: selectedShelf.optionKey || selectedShelf.Option_Key__c
        } : { optionLabel: 'None', optionKey: 'NONE' };

        // Format bridge data with label and key
        const bridgeData = this.selectedBridge ? {
            optionLabel: this.selectedBridge.Option_Label__c,
            optionKey: this.selectedBridge.Option_Key__c,
            displayValue: `${this.selectedBridge.Option_Label__c} - ${this.selectedBridge.Option_Key__c}`
        } : { optionLabel: 'None', optionKey: 'NONE', displayValue: 'None' };

        const payload = {
            bridge: bridgeData,
            tiltBins: selectedTiltBins,
            bulkBins: selectedBulkBins,
            optionalStorageShelf: shelfData,
            tiltNone: this.tiltNone,
            bulkNone: this.bulkNone,
            shelfNone: this.shelfNone
        };

        console.log('Bridge Selection Payload:', payload.optionalStorageShelf.optionKey);

        this.dispatchEvent(new CustomEvent('nextstep', {
            detail: { step: 'BRIDGE', payload: payload }
        }));
    }
}
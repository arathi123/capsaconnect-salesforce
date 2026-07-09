import { LightningElement, track, api } from 'lwc';
import getOptionsByStepAndFamily from '@salesforce/apex/CartConfiguratorController.getOptionsByStepAndFamily';

// THE MATH CONTROL CENTER (Coordinates for physical placement on the image)
const SLOT_CONFIG = [
    { top: '45.25%', left: '32%', width: '37.5%', zIndex: 14 }, // Position 1 (Top)
    { top: '54.05%', left: '32%', width: '37.5%', zIndex: 13 }, // Position 2
    { top: '64.25%', left: '32%', width: '37.5%', zIndex: 12 }, // Position 3
    { top: '73%', left: '32%', width: '37.5%', zIndex: 11 }     // Position 4 (Bottom)
];

// THE CONFIGURATION DICTIONARY
const BIN_RULES = {
    '1794561': { slots: 1, startIdx: 0 },             // Telepresence / XP Non-Lock
    'M06033601': { slots: 2, startIdx: 0 },           // RX Module (Electric)
    '1822078': { slots: 2, startIdx: 0 },             // RX Module (Non-Locking)
    '1889701': { slots: 1, startIdx: 0 },             // XP Locking Module
    'M06033601 + 207289': { slots: 3, startIdx: 0 },  // RX & XP Modules
    '1781374 + M06033601': { slots: 4, startIdx: 0 }, // DRX Module
    '1975160 + 1889701': { slots: 1, startIdx: 1 },   // 3" Add-on + XP Module (Elock)
    '1975155 + 1794561': { slots: 1, startIdx: 1 },   // 3" VX + XP Module (Non-Lock)
};

export default class M38eStorageBuilder extends LightningElement {
    @api productType = 'M38e';
    @api selections; 

    @track rawDrawerOptions = [];
    @track activeSlotIndex = 0; 
    @track _slotData = []; // Internal array of our Unified Objects
    
    @track baseCartImage = '';
    @track isLoading = true;

    connectedCallback() {
        this.initializeSlots();
        this.fetchAllMetadata();
    }

    initializeSlots() {
        this.baseCartImage = this.selections?.previewImage || '/resource/m38eImagesPart1/m38eImagesPart1/documentation.jpg';

        // 1. Safely unpack the Bin SKU from the Unified Array
        const storageArr = this.selections?.STORAGE || [];
        const selectedBinSku = storageArr.length > 1 ? storageArr[1].key : '';
        
        // 2. Look up the rules for this SKU
        const rule = BIN_RULES[selectedBinSku] || { slots: 1, startIdx: 0 };

        // 3. Build the initial Slot Data array with unified properties
        const initialSlots = [];
        for (let i = 0; i < rule.slots; i++) {
            const physicalConfig = SLOT_CONFIG[i + rule.startIdx]; 
            
            initialSlots.push({
                index: i,
                id: i + 1, // Logical ID for the UI (Module 1, 2, 3)
                key: '',
                label: '',
                sku: '',
                selectedImage: '',
                cssStyle: `top: ${physicalConfig.top}; left: ${physicalConfig.left}; width: ${physicalConfig.width}; z-index: ${physicalConfig.zIndex};`
            });
        }
        this._slotData = initialSlots;
    }

    async fetchAllMetadata() {
        try {
            const data = await getOptionsByStepAndFamily({ stepKey: 'DRAWER', productFamily: this.productType });
            this.rawDrawerOptions = data || [];

            // Only restore if we actually have configured slots saved in state
            if (this.selections && this.selections.BUILDER_SLOTS && this.selections.BUILDER_SLOTS.length > 0) {
                this._slotData = JSON.parse(JSON.stringify(this.selections.BUILDER_SLOTS));
            }
        } catch (error) {
            console.error('Error fetching M38e Drawer options:', error);
        } finally {
            this.isLoading = false;
        }
    }

    // --- INTERACTION LOGIC ---
    handleSlotClick(event) {
        const clickedIndex = parseInt(event.currentTarget.dataset.index, 10);
        if (this.activeSlotIndex === clickedIndex) {
            this.activeSlotIndex = -1; // Closes all
        } else {
            this.activeSlotIndex = clickedIndex;
        }
    }

    handleDrawerSelect(event) {
        const clickedKey = event.currentTarget.dataset.key;
        const imgUrl = event.currentTarget.dataset.url;
        
        // Find the metadata to get the proper label
        const selectedOpt = this.rawDrawerOptions.find(opt => opt.Option_Key__c === clickedKey);
        const label = selectedOpt ? selectedOpt.Option_Label__c : '';
        
        // Update the slot with unified properties
        this._slotData = this._slotData.map(slot => {
            if (slot.index === this.activeSlotIndex) {
                return { 
                    ...slot, 
                    key: clickedKey, 
                    label: label, 
                    sku: clickedKey, 
                    selectedImage: imgUrl 
                };
            }
            return slot;
        });

        // Auto-advance
        if (this.activeSlotIndex < this._slotData.length - 1) {
            this.activeSlotIndex++;
        } else {
            this.activeSlotIndex = -1;
        }
    }

    evaluateFilter(filterStr, stateObj) {
        if (!filterStr) return true; 
        
        const orGroups = filterStr.split('||').map(s => s.trim());
        
        for (let group of orGroups) {
            const andConditions = group.split(';').map(s => s.trim());
            let groupPassed = true;
            
            for (let cond of andConditions) {
                if (!cond) continue;
                
                let [key, val] = cond.split('=');
                let isNotEqual = false;
                
                if (key.endsWith('!')) {
                    isNotEqual = true;
                    key = key.slice(0, -1);
                }
                
                const stateVal = stateObj[key];
                
                if (isNotEqual) {
                    if (stateVal && stateVal.toLowerCase() === val.toLowerCase()) {
                        groupPassed = false;
                        break;
                    }
                } else {
                    if (!stateVal || stateVal.toLowerCase() !== val.toLowerCase()) {
                        groupPassed = false;
                        break;
                    }
                }
            }
            if (groupPassed) return true;
        }
        return false; 
    }

    // --- LWC GETTERS ---
    get slotData() {
        return this._slotData.map(s => ({
            ...s,
            isActive: s.index === this.activeSlotIndex,
            hasSelection: s.key !== '',
            tabClass: s.index === this.activeSlotIndex ? 'accordion-header active' : 'accordion-header',
            icon: s.index === this.activeSlotIndex ? '▲' : '▼'
        }));
    }

    get drawerOptions() {
        const currentSlot = this._slotData[this.activeSlotIndex];
        const activeKey = currentSlot ? currentSlot.key : '';

        // Safely extract the Storage Type (routing key) from the new array structure
        const storageArr = this.selections?.STORAGE || [];
        const storageType = storageArr.length > 0 ? storageArr[0].key : '';

        const state = {
            STORAGE: storageType
        };

        return this.rawDrawerOptions
            .filter(opt => this.evaluateFilter(opt.Visibility_Filter__c, state))
            .map(opt => {
                const isSelected = opt.Option_Key__c === activeKey;
                return {
                    ...opt,
                    isSelected: isSelected,
                    cardClass: isSelected ? 'drawer-card selected' : 'drawer-card'
                };
            });
    }

    get isStepComplete() {
        return this._slotData.length > 0 && this._slotData.every(slot => slot.key !== '');
    }

    handleNext() {
        const stepPayload = {
            BUILDER_SLOTS: this._slotData, // Array already unified with { key, label, sku }
            
            layeredPreview: {
                baseImage: this.baseCartImage,
                overlays: this._slotData.filter(s => s.selectedImage).map(s => ({
                    url: s.selectedImage,
                    style: s.cssStyle
                }))
            }
        };

        this.dispatchEvent(new CustomEvent('stepcomplete', { detail: stepPayload }));
    }
}
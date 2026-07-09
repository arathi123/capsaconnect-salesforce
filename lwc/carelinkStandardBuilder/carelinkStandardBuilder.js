import { LightningElement, track, api } from 'lwc';
import getOptionsByStepAndFamily from '@salesforce/apex/CartConfiguratorController.getOptionsByStepAndFamily';

// THE MATH CONTROL CENTER (Coordinates for CareLink physical placement)
// Adjust top/left percentages slightly if CareLink cart dimensions differ from M38e
const SLOT_CONFIG = [
    { top: '44%', left: '31.5%', width: '37.5%', zIndex: 14 }, // Position 1 (Top)
    { top: '52.75%', left: '31.5%', width: '37.5%', zIndex: 13 }, // Position 2
    { top: '62%', left: '31.5%', width: '37.5%', zIndex: 12 }, // Position 3
    { top: '70.75%', left: '31.5%', width: '37.5%', zIndex: 11 },  // Position 4 (Bottom)
    // --- EXCEPTIONS ---
    { top: '55.75%', left: '31.5%', width: '37.5%', zIndex: 14 }
];

// CARELINK CONFIGURATION DICTIONARY
// Maps the Module Key chosen in Step 6 to the number of available drawer slots
const BIN_RULES = {
    'XP':          { slots: 1, startIdx: 0 },
    'RX':          { slots: 2, startIdx: 0 },
    'RXXP':        { slots: 3, startIdx: 0 },
    'DRX':         { slots: 4, startIdx: 0 },
    'TeleMed Cab': { slots: 1, startIdx: 4 },
    'TelePres XP': { slots: 1, startIdx: 0 }
};

export default class CarelinkStandardBuilder extends LightningElement {
    @api productType = 'CareLink';
    @api selections; 

    @track rawDrawerOptions = [];
    @track activeSlotIndex = 0; 
    @track _slotData = []; 
    
    @track baseCartImage = '';
    @track isLoading = true;

    storageLockType = ''; // 'Electric' or 'Non Locking'

    connectedCallback() {
        this.initializeSlots();
        this.fetchAllMetadata();
    }

    initializeSlots() {
        // Carry over the chassis image constructed in Step 6
        this.baseCartImage = this.selections?.previewImage || '/resource/carelinkImagesPart1/carelinkImagesPart1/documentation.jpg';

        const storageArr = this.selections?.STORAGE || [];
        
        // Extract locking type (first element) to filter drawers
        if (storageArr.length > 0) {
            this.storageLockType = storageArr[0].key; 
        }

        // Extract module chassis (last element) to calculate slots
        const selectedModuleKey = storageArr.length > 0 ? storageArr[storageArr.length - 1].key : '';
        
        const rule = BIN_RULES[selectedModuleKey] || { slots: 1, startIdx: 0 };

        const initialSlots = [];
        for (let i = 0; i < rule.slots; i++) {
            const physicalConfig = SLOT_CONFIG[i + rule.startIdx]; 
            
            initialSlots.push({
                index: i,
                id: i + 1, 
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

            if (this.selections && this.selections.BUILDER_SLOTS && this.selections.BUILDER_SLOTS.length > 0) {
                this._slotData = JSON.parse(JSON.stringify(this.selections.BUILDER_SLOTS));
            }
        } catch (error) {
            console.error('Error fetching CareLink Drawer options:', error);
        } finally {
            this.isLoading = false;
        }
    }

    // --- INTERACTION LOGIC ---
    handleSlotClick(event) {
        const clickedIndex = parseInt(event.currentTarget.dataset.index, 10);
        if (this.activeSlotIndex === clickedIndex) {
            this.activeSlotIndex = -1; 
        } else {
            this.activeSlotIndex = clickedIndex;
        }
    }

    handleDrawerSelect(event) {
        const clickedKey = event.currentTarget.dataset.key;
        const imgUrl = event.currentTarget.dataset.url;
        
        const selectedOpt = this.rawDrawerOptions.find(opt => opt.Option_Key__c === clickedKey);
        const label = selectedOpt ? selectedOpt.Option_Label__c : '';
        
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

        // Auto-advance accordion
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
                
                const stateVal = stateObj[key.trim()] || '';
                const targetVal = val ? val.trim() : '';
                
                if (isNotEqual) {
                    if (stateVal.toLowerCase() === targetVal.toLowerCase()) { groupPassed = false; break; }
                } else {
                    if (stateVal.toLowerCase() !== targetVal.toLowerCase()) { groupPassed = false; break; }
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

        // Safely extract the Storage Type (routing key)
        const state = { STORAGE: this.storageLockType };

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
            BUILDER_SLOTS: this._slotData, // Array unified with { key, label, sku }
            
            layeredPreview: {
                baseImage: this.baseCartImage,
                overlays: this._slotData.filter(s => s.selectedImage).map(s => ({
                    url: s.selectedImage,
                    style: s.cssStyle
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
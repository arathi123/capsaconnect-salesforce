import { LightningElement, api, track, wire } from 'lwc';
import getOptionsByStepAndFamily from '@salesforce/apex/CartConfiguratorController.getOptionsByStepAndFamily';
import Drawer_Types from '@salesforce/resourceUrl/Drawer_Types';
import BASE_LCY from '@salesforce/resourceUrl/Tiers_LCY';
import BASE_LCR from '@salesforce/resourceUrl/Tiers_LCR';
import BASE_LCG from '@salesforce/resourceUrl/Tiers_LCG';
import BASE_LCD from '@salesforce/resourceUrl/Tiers_LCD';
import BASE_LCB from '@salesforce/resourceUrl/Tiers_LCB';
import BASE_EY from '@salesforce/resourceUrl/Tiers_EY';
import BASE_ER from '@salesforce/resourceUrl/Tiers_ER';
import BASE_EG from '@salesforce/resourceUrl/Tiers_EG';
import BASE_EB from '@salesforce/resourceUrl/Tiers_EB';

import BASE_RB from '@salesforce/resourceUrl/Tiers_RB';     
import BASE_BG from '@salesforce/resourceUrl/Tiers_BG';
import BASE_PM from '@salesforce/resourceUrl/Tiers_PM';
import BASE_CB from '@salesforce/resourceUrl/Tiers_CB';
import BASE_TL from '@salesforce/resourceUrl/Tiers_TL';

import BASE_WA from '@salesforce/resourceUrl/Tiers_WA';
import BASE_BC from '@salesforce/resourceUrl/Tiers_BC';
import BASE_AW from '@salesforce/resourceUrl/Tiers_AW';

export default class ByoStorageSelection extends LightningElement {
    @api productType;
    @api selectedHeight; 
    @api selectedColor;
    @api isExtended;

    @track drawerStack = [];
    @track dividerOptions = [];
    
    showDividerModal = false;
    editingDrawerId = null;
    totalTiers = 0;
    remainingTiers = 0;
    currentPrecedence = 1;

    resourceMap = {}

    connectedCallback() {
        
        if(this.selectedHeight =='CAN')
        {
        this.totalTiers = 9;
        }
        else{
            this.totalTiers = this.selectedHeight;
        }
        
        this.remainingTiers = this.totalTiers;

        if (this.productType === 'Medical') {
            this.resourceMap = { 
                'LCY': BASE_LCY, 
                'LCR': BASE_LCR, 
                'LCG': BASE_LCG, 
                'LCD': BASE_LCD, 
                'LCB': BASE_LCB, 
                'EY': BASE_EY, 
                'ER': BASE_ER, 
                'EG': BASE_EG, 
                'EB': BASE_EB
            };
        }
        else if (this.productType === 'M-Series') {
            this.resourceMap = { 
                'RB': BASE_RB, 
                'BG': BASE_BG, 
                'PM': BASE_PM,
                'CB': BASE_CB,
                'TL': BASE_TL
            };
        }
        else if (this.productType === 'VE-Series') {
            this.resourceMap = { 
                'WA': BASE_WA, 
                'BC': BASE_BC, 
                'AW': BASE_AW
                
            };
        }
         else if (this.productType === 'Medication') {
            this.resourceMap = { 
                'EY': BASE_LCD, 
                'CL': BASE_LCD, 
                'PL': BASE_LCD,
                'HB': BASE_LCD,
                'LV': BASE_LCD,
                'DC': BASE_LCD
            };
            this.selectedColor = 'LCD';
        } else {
            this.resourceMap = { 
                'NC': BASE_LCD, 
                'MA': BASE_LCD
            };
            this.selectedColor = 'LCD';
        }

        console.log('Product Type:', this.productType);
        console.log('Selected Color:', this.selectedColor);
        console.log('Resource:', this.resourceMap[this.selectedColor]);
        console.log('Image URL:', this.cartBaseImage);
    }

    @wire(getOptionsByStepAndFamily, { stepKey: '3 INCH DRAWER', productFamily: '$productType'  })
    wiredDividers({ data }) { 
        if (data) this.dividerOptions = data; 
    }

    get cartBaseImage() {
        const res = this.resourceMap[this.selectedColor] || BASE_LCD;
        return `${res}/${this.selectedColor}/${this.selectedColor}-${this.totalTiers}.png`;
    }
  /*
    get cartBaseImage() {

    if (
        this.productType === 'Medication' ||
        this.productType === 'M-Series' ||
        this.productType === 'VE-Series'
    ) {
        return `${BASE_LCD}/LCD/LCD-${this.totalTiers}.png`;
        }

        const res = this.resourceMap[this.selectedColor] || BASE_LCD;
        return `${res}/${this.selectedColor}/${this.selectedColor}-${this.totalTiers}.png`;
    }
 
   */
    get threeInchThumb() { 
         return `${Drawer_Types}/3_Inch_Drawer.png`;
         
    }

    get sixInchThumb() { 
                return `${Drawer_Types}/6_Inch_Drawer.png`;

    }

    get tenInchThumb() { 
                 return `${Drawer_Types}/10_Inch_Drawer.png`;

    }

    get isAdd3Disabled() { 
        return this.remainingTiers < 1 || this.currentPrecedence > 1; 
    }

    get isAdd6Disabled() { 
        return this.remainingTiers < 2 || this.currentPrecedence > 2; 
    }

    get isAdd10Disabled() { 
        return this.remainingTiers < 3 || this.currentPrecedence > 3; 
    }
    
    /**
     * Validation: Check if all 3" drawers have dividers selected
     * and all tiers are filled
     */
    get isNextDisabled() {
        // Check if all tiers are filled
        if (this.remainingTiers > 0) {
            return true;
        }
        if (this.isExtended) {
            return false;
        }

        // Check if all 3" drawers have dividers selected
        const threeInchDrawers = this.drawerStack.filter(d => d.size === 1);
        const allThreeInchHaveDividers = threeInchDrawers.every(d => d.dividerSelected === true);
        
        return !allThreeInchHaveDividers;
    }

    get showDividerValidationError() {
        //  NEW: no error for Extended Storage
        if (this.isExtended) {
            return false;
        }
        if (this.remainingTiers === 0) {
            const threeInchDrawers = this.drawerStack.filter(d => d.size === 1);
            return threeInchDrawers.some(d => d.dividerSelected !== true);
        }
        return false;
    }

    get popButtonTop() {
        const topPositions = [47, 81, 115, 148, 182, 215, 249, 282, 316, 349];
        const offset = 10 - this.totalTiers;
        const currentFilledSlots = this.totalTiers - this.remainingTiers;
        const currentSlotIndex = offset + currentFilledSlots - 1;
        if (currentSlotIndex >= 0) {
            return `top: ${topPositions[currentSlotIndex]}px;`;
        }
        return 'display: none;';
    }

    handleAddClick(e) {
        const size = parseInt(e.target.dataset.size, 10);
        this.addDrawer(size);
    }

    addDrawer(size) {
        const allTopPositions = [47, 81, 115, 148, 182, 215, 249, 282, 316, 349];
        const offset = 10 - this.totalTiers;
        const currentFilledSlots = this.totalTiers - this.remainingTiers;
        const targetIndex = offset + currentFilledSlots;

        const fileNameMap = { 
            1: '3_Inch_Drawer.png', 
            2: '6_Inch_Drawer.png', 
            3: '10_Inch_Drawer.png' 
        };
        if (allTopPositions[targetIndex] !== undefined) {

            console.log(
    'Storage Product Type =>',
    this.productType
);

console.log(
    'Drawer Size =>',
    size
);

console.log(
    'Show Pencil =>',
    (
        size === 1 &&
        !this.isExtended &&
        this.productType !== 'M-Series' &&
        this.productType !== 'VE-Series'
    )
);
            const newDrawer = {
                id: Date.now(),
                size: size,
                topStyle: `top: ${allTopPositions[targetIndex]}px;`, 
                isThreeInch: size === 1,
                // NEW LINE (MAIN LOGIC)
              //  isEditable: size === 1 && !this.isExtended,
              isEditable:
                size === 1 &&
                !this.isExtended &&
                this.productType !== 'M-Series' &&
                this.productType !== 'VE-Series',

                img: `${Drawer_Types}/${fileNameMap[size]}`,
                dividerLabel: 'No Dividers - Empty',
                hasDivider: size === 1 ? false : true,
                dividerSelected:
                this.productType === 'M-Series' ||
                this.productType === 'VE-Series'
                    ? true
                    : false,
                pencilClass: 'edit-btn pencil-grey'
            };
            this.drawerStack = [...this.drawerStack, newDrawer];
            this.remainingTiers -= size;
            this.currentPrecedence = size === 1 ? 1 : (size === 2 ? 2 : 3);
        }
    }

    handleEditClick(e) {
         if (this.isExtended) {
                return; //  block for Extended Storage
            }
        this.editingDrawerId = e.target.dataset.id;
        this.showDividerModal = true;
    }

    handleModalSave(e) {
        const selected = e.detail;
        this.drawerStack = this.drawerStack.map(d => {
            if (d.id == this.editingDrawerId) {
                return { 
                    ...d, 
                    dividerLabel: selected.Option_Label__c, 
                    dividerKey: selected.Option_Key__c,
                    hasDivider: true,
                    dividerSelected: true,
                    pencilClass: 'edit-btn pencil-red'
                };
            }
            return d;
        });
        this.showDividerModal = false;
    }

    handlePop() {
        const removed = this.drawerStack.pop();
        if (removed) {
            this.remainingTiers += removed.size;
            this.drawerStack = [...this.drawerStack];
            if (!this.drawerStack.length) {
                this.currentPrecedence = 1;
            } else {
                const last = this.drawerStack[this.drawerStack.length - 1];
                this.currentPrecedence = last.size; 
            }
        }
    }

    handleReset() {
        this.drawerStack = [];
        this.remainingTiers = this.totalTiers;
        this.currentPrecedence = 1;
    }

    closeModal() { 
        this.showDividerModal = false; 
    }

    /**
     * Handle next step - Groups drawers by size
     * Example: 3x3", 1x6", 1x10" = DR321
     * Slots: 1,2,3,4,6,9
     */
    handleNext() {
        const count3 = this.drawerStack.filter(d => d.size === 1).length;
        const count6 = this.drawerStack.filter(d => d.size === 2).length;
        const count10 = this.drawerStack.filter(d => d.size === 3).length;

        const configCode = `${count3}${count6}${count10}`;

        let currentSlot = 1;
        const configurationSummary = this.drawerStack.map((drawer) => {
            const slotStart = currentSlot;
            
            let sizeLabel = '';
            let sizeKey = '';
            if (drawer.size === 1) {
                sizeLabel = drawer.dividerLabel;
                sizeKey = drawer.dividerKey;
                currentSlot += 1;
            } else if (drawer.size === 2) {
                sizeLabel = '6" Supply Drawer';
                currentSlot += 2;
            } else if (drawer.size === 3) {
                sizeLabel = '10" Supply Drawer';
                currentSlot += 3;
            }

            return {
                slot: slotStart,
                sizeLabel: sizeLabel,
                sizeKey: sizeKey,
                sizeValue: drawer.size,
                divider: drawer.isThreeInch ? drawer.dividerLabel : ''
            };
        });

        this.dispatchEvent(new CustomEvent('nextstep', {
            detail: {
                step: 'STORAGE',
                payload: {
                    configCode: configCode,
                    details: configurationSummary,
                    totalTiers: this.totalTiers
                    // storageTiers: this.formatStorageTiers(configurationSummary)
                }
            }
        }));
    }

    /**
     * Format storage tiers for results display
     */
    // formatStorageTiers(summary) {
    //     return summary.map(item => {
    //         return `Tier ${item.slot} - ${item.sizeLabel}`;
    //     });
    // }
}
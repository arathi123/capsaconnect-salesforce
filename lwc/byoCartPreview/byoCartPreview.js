import { LightningElement, api, track } from 'lwc';

// Drawer Images
import Drawer_Types from '@salesforce/resourceUrl/Drawer_Types';

// Base Cart Folders (Static Resources)
import BASE_LCY from '@salesforce/resourceUrl/Tiers_LCY';
import BASE_LCR from '@salesforce/resourceUrl/Tiers_LCR';
import BASE_LCG from '@salesforce/resourceUrl/Tiers_LCG';
import BASE_LCD from '@salesforce/resourceUrl/Tiers_LCD';
import BASE_LCB from '@salesforce/resourceUrl/Tiers_LCB';
import BASE_EY from '@salesforce/resourceUrl/Tiers_EY';
import BASE_ER from '@salesforce/resourceUrl/Tiers_ER';
import BASE_EG from '@salesforce/resourceUrl/Tiers_EG';
import BASE_EB from '@salesforce/resourceUrl/Tiers_EB';

export default class ByoCartPreview extends LightningElement {
    @api summaryData = {}; // Full selection object from parent
    @track previewDrawers = [];
    @track baseCartImage = '';
    @api isReconfigureMode = false;

    // Mapping keys to their respective Static Resource imports
    resourceMap = { 
        'LCY': BASE_LCY, 'LCR': BASE_LCR, 'LCG': BASE_LCG, 'LCD': BASE_LCD, 
        'LCB': BASE_LCB, 'EY': BASE_EY, 'ER': BASE_ER, 'EG': BASE_EG, 'EB': BASE_EB 
    };

    /**
     * Vertical Y-coordinates for the 10 possible slots on a cart.
     * These pixels align with the physical drawer openings in the base images.
     */
    topPositions = [47, 81, 115, 148, 182, 215, 249, 282, 316, 349];
    
    // Config for the drawing logic
    // These match your CSS: .drawer-layer { left: 43px }
    DRAWER_X_OFFSET = 43; 
    CANVAS_WIDTH = 350; // Width of your .cart-frame
    CANVAS_HEIGHT = 500; // Approx height needed (adjust if your cart is taller)

    connectedCallback() {
        this.generateCartPreview();
    }

    /**
     * Main logic to build the visual state
     */
    generateCartPreview() {
        if (!this.summaryData) return;

        const heightKey = this.summaryData.height?.key || '10';
        const colorKey = this.summaryData.color?.key || 'LCD';
        const tiers = this.summaryData.storageTiers || [];

        // 1. Set the Base Cart Image URL
        const resource = this.resourceMap[colorKey] || BASE_LCD;
        this.baseCartImage = `${resource}/${colorKey}/${colorKey}-${heightKey}.png`;

        // 2. Map Tiers to Visual Drawer Objects
        this.previewDrawers = this.calculateDrawerPositions(tiers, heightKey);
    }

    /**
     * Calculates exactly where each drawer image should sit.
     * Uses an 'offset' because an 8-high cart is physically shorter than a 10-high.
     */
    calculateDrawerPositions(tiers, heightKey) {
        const height = parseInt(heightKey, 10);
        const offset = 10 - height;
        
        const fileNameMap = {
            1: '3_Inch_Drawer.png',
            2: '6_Inch_Drawer.png',
            3: '10_Inch_Drawer.png'
        };

        return tiers.map((tier, index) => {
            const size = this.getDrawerSize(tier.sizeLabel);
            const visualIndex = (parseInt(tier.slot, 10) - 1) + offset;
            
            return {
                id: `drawer-${index}`,
                label: tier.sizeLabel,
                imgUrl: `${Drawer_Types}/${fileNameMap[size]}`,
                topPos: this.topPositions[visualIndex], // Store raw number for canvas
                topStyle: `top: ${this.topPositions[visualIndex]}px;`,
                slot: tier.slot
            };
        });
    }

    /**
     * Helper to determine height units based on the label
     */
    getDrawerSize(label) {
        const text = label.toLowerCase();
        if (text.includes('10"')) return 3;
        if (text.includes('6"')) return 2;
        return 1;
    }

    handleQuoteClick() {
        this.dispatchEvent(new CustomEvent('requestquote'));
    }

    handleUpdateClick() {

        this.dispatchEvent(
            new CustomEvent('updatequote')
        );
    }

}
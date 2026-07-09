import { LightningElement, api, track } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import createQuoteFromConfiguration from '@salesforce/apex/QuoteGeneratorController.createQuoteFromConfiguration';
import updateExistingQuote from '@salesforce/apex/QuoteGeneratorController.updateExistingQuote';

export default class CarelinkResults extends NavigationMixin(LightningElement) {
    @api opportunityId;
    @api selections;
    @api quoteId; 

    @track isLoading = false;

    // Preview Variables
    @track baseCartImage = '';
    @track overlays = [];
    @track chassisSku = 'CARELINK-CUSTOM';

    connectedCallback() {
        this.restorePreviewState();
        this.chassisSku = this.calculateChassisSku();
    }

    get isReconfigureMode() {
        return this.quoteId != null && this.quoteId !== undefined && this.quoteId !== '';
    }

    restorePreviewState() {
        if (this.selections && this.selections.layeredPreview) {
            this.baseCartImage = this.selections.layeredPreview.baseImage;
            this.overlays = this.selections.layeredPreview.overlays || [];
        } else {
            this.baseCartImage = this.selections?.previewImage || '/resource/carelinkImagesPart1/carelinkImagesPart1/documentation.jpg';
        }
    }

    // --- SUMMARY UI BUILDER ---
    get summarySections() {
        // Formats builder slots (Drawers/MaxBins)
        const formattedSlots = (this.selections?.BUILDER_SLOTS || [])
            .map(slot => ({
                label: slot.label,
                sku: slot.sku
            }));

        // Groups all storage into one visual block for the user
        const fullStorageArr = [
            ...(this.selections?.STORAGE || []), 
            ...formattedSlots,
            ...(this.selections?.ADDITIONAL_STORAGE || [])
        ];

        return [
            { title: 'Use Case', items: this.selections?.USE_CASE || [], hasData: (this.selections?.USE_CASE || []).length > 0 },
            { title: 'Power', items: this.selections?.POWER || [], hasData: (this.selections?.POWER || []).length > 0 },
            { title: 'Lift', items: this.selections?.LIFT || [], hasData: (this.selections?.LIFT || []).length > 0 },
            { title: 'Monitor', items: this.selections?.MONITOR || [], hasData: (this.selections?.MONITOR || []).length > 0 },
            { title: 'Keyboard Tray', items: this.selections?.KEYBOARD || [], hasData: (this.selections?.KEYBOARD || []).length > 0 },
            { title: 'Storage and Security', items: fullStorageArr, hasData: fullStorageArr.length > 0 },
            { title: 'Telehealth Accessories', items: this.selections?.TELEHEALTH || [], hasData: (this.selections?.TELEHEALTH || []).length > 0 },
            { title: 'Accessories', items: this.selections?.ACCESSORIES || [], hasData: (this.selections?.ACCESSORIES || []).length > 0 },
            { title: 'Warranty', items: this.selections?.WARRANTY || [], hasData: (this.selections?.WARRANTY || []).length > 0 }
        ];
    }

    // --- CARELINK SKU ENGINE ---
    calculateChassisSku() {
        const storArr = this.selections?.STORAGE || [];
        
        // Find the chassis module (usually the last item in the array that has a SKU)
        const chassisItem = [...storArr].reverse().find(item => item.sku);
        
        if (chassisItem) {
            // If it has multiple SKUs combined (e.g. RX/DRX), just take the first primary one for the record header
            return chassisItem.sku.split(/&|\+|,/)[0].trim();
        }
        
        // Fallback for "No Storage" configurations
        return 'CARELINK-BASE'; 
    }

    // --- PAYLOAD GENERATOR FOR APEX ---
    buildProductRequests() {
        let requests = [];

        if (this.chassisSku) {
            requests.push({ code: this.chassisSku, qty: 1, imgUrl: '' });
        }
        
        // Flatten all selections into one array
        const allSelections = [
            ...(this.selections?.POWER || []),
            ...(this.selections?.LIFT || []),
            ...(this.selections?.MONITOR || []),
            ...(this.selections?.KEYBOARD || []),
            ...(this.selections?.STORAGE || []),
            ...(this.selections?.BUILDER_SLOTS || []),
            ...(this.selections?.ADDITIONAL_STORAGE || []),
            ...(this.selections?.TELEHEALTH || []),
            ...(this.selections?.ACCESSORIES || []),
            ...(this.selections?.WARRANTY || [])
        ];

        // Filter out items that do not have an orderable SKU
        const billableItems = allSelections.filter(item => item.sku !== null && item.sku !== '' && item.sku !== 'None');

        billableItems.forEach(item => {
            // Advanced Splitter: CareLink metadata sometimes uses '&', '+', or ',' to group required SKUs
            let skus = [item.sku];
            if (item.sku.includes('&')) {
                skus = item.sku.split('&');
            } else if (item.sku.includes('+')) {
                skus = item.sku.split('+');
            } else if (item.sku.includes(',')) {
                skus = item.sku.split(',');
            }

            // Push each individual SKU into the Apex request
            skus.forEach(p => {
                const cleanSku = p.trim();
                if(cleanSku) {
                    requests.push({ 
                        code: cleanSku, 
                        qty: 1, 
                        imgUrl: ''
                    });
                }
            });
        });

        return JSON.stringify(requests);
    }

    // --- NAVIGATION HELPER ---
    navigateToRecord(recordId) {
        this[NavigationMixin.Navigate]({
            type: 'standard__recordPage',
            attributes: {
                recordId: recordId,
                objectApiName: 'Quote',
                actionName: 'view'
            }
        });
    }

    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }

    // --- SUBMISSION LOGIC ---
    async handleGenerateQuote() {
        this.isLoading = true;
        try {
            const configJson = this.buildProductRequests();

            if (this.isReconfigureMode) {
                // UPDATE EXISTING QUOTE
                await updateExistingQuote({
                    quoteId: this.quoteId,
                    configJson: configJson
                });
                
                this.showToast('Success', 'Quote updated successfully.', 'success');
                this.dispatchEvent(new CustomEvent('resetflow', { bubbles: true, composed: true }));
                this.navigateToRecord(this.quoteId);

            } else {
                // CREATE NEW QUOTE
                const newQuoteId = await createQuoteFromConfiguration({
                    configJson: configJson,
                    opportunityId: this.opportunityId,
                    cartSKU: this.chassisSku
                });

                this.showToast('Success', 'Quote created successfully.', 'success');
                this.dispatchEvent(new CustomEvent('resetflow', { bubbles: true, composed: true }));
                this.navigateToRecord(newQuoteId);
            }

        } catch (error) {
            console.error('Quote Generation Error:', error);
            this.showToast('Error', error.body ? error.body.message : error.message, 'error');
            this.isLoading = false; 
        }
    }
}
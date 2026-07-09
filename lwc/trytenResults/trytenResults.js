import { LightningElement, api, track } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getOptionsByStepAndFamily from '@salesforce/apex/CartConfiguratorController.getOptionsByStepAndFamily';
import createQuote from '@salesforce/apex/QuoteGeneratorController.createQuoteFromConfiguration';
import updateExistingQuote from '@salesforce/apex/QuoteGeneratorController.updateExistingQuote'; // NEW: Import update method

export default class TrytenResults extends NavigationMixin(LightningElement) {
    @api selections;
    @api opportunityId;
    @api quoteId;
    @api productType = 'Tryten';

    @track allOptions = [];
    @track isLoading = true;
    @track isSubmitting = false;

    connectedCallback() {
        this.fetchAllOptions();
    }

    async fetchAllOptions() {
        try {
            const steps = ['APP', 'ARM', 'SIZE', 'CASE', 'FOOTPRINT', 'CONFIG', 'MOUNT'];
            const promises = steps.map(step => getOptionsByStepAndFamily({ stepKey: step, productFamily: this.productType }));
            const results = await Promise.all(promises);
            this.allOptions = results.flat();
        } catch (error) {
            console.error('Error loading metadata for summary:', error);
        } finally {
            this.isLoading = false;
        }
    }

    getLabel(key) {
        const opt = this.allOptions.find(o => o.Option_Key__c === key);
        return opt ? opt.Option_Label__c : key;
    }

    // --- SUMMARY DISPLAY GETTERS ---
    
    get summaryItems() {
        if (!this.selections) return [];
        const s = this.selections;
        let items = [];

        items.push({label: 'Cart SKU', value: this.getCartSKUs().base});
        if (s.APP) items.push({ label: 'Type of Cart', value: this.getLabel(s.APP) });
        if (s.ARM) items.push({ label: 'Articulating Arm', value: this.getLabel(s.ARM) });
        if (s.SIZE) items.push({ label: 'Arm Size', value: this.getLabel(s.SIZE) });
        if (s.CASE) items.push({ label: 'Tablet Case', value: this.getLabel(s.CASE) });
        if (s.FOOTPRINT) items.push({ label: 'Footprint', value: this.getLabel(s.FOOTPRINT) });
        if (s.CONFIG) items.push({ label: 'Column Configuration', value: this.getLabel(s.CONFIG) });
        if (this.getCartSKUs().mount) items.push({label: 'Mount SKU', value: this.getLabel(s.MOUNT) + ' - ' + this.getCartSKUs().mount || 'N/A'});

        return items;
    }

    get hasAccessories() {
        return this.selections?.accessories && 
               this.selections.accessories.length > 0 && 
               this.selections.accessories[0].key !== 'NONE';
    }

    // NEW: Reconfigure Logic Getter
    get isReconfigureMode() {
        return this.quoteId != null && this.quoteId !== undefined && this.quoteId !== '';
    }

    // =====================================
    // TRYTEN EXACT SKU MATRIX
    // =====================================
    getCartSKUs() {
        const s = this.selections;
        let skus = { base: '', mount: '' };

        // 1. TABLET PATHS
        if (s.APP === 'TAB') {
            if (s.ARM === 'ARM-N') {
                skus.base = 'T2600';
            } else if (s.ARM === 'ARM-Y') {
                if (s.SIZE === 'SIZE-7') skus.base = 'T2700';
                else if (s.SIZE === 'SIZE-14') {
                    skus.base = (s.CASE === 'CASE-Y') ? 'T3023' : 'T3022';
                }
            }
        } 
        // 2. MONITOR PATHS
        else if (s.APP === 'MON') {
            if (s.ARM === 'ARM-Y') {
                if (s.SIZE === 'SIZE-7') skus.base = 'T3011';
                else if (s.SIZE === 'SIZE-14') skus.base = 'T3021';
            } else if (s.ARM === 'ARM-N') {
                
                // A. Base Cart Determination
                if (s.FOOTPRINT === 'FP-L') skus.base = 'T2500';
                else if (s.FOOTPRINT === 'FP-H') skus.base = 'T2900';
                else if (s.FOOTPRINT === 'FP-M') {
                    if (s.CONFIG === 'CFG-S') skus.base = 'T3050';
                    else if (s.CONFIG === 'CFG-O') skus.base = 'T3060';
                }

                // B. Add-on Mount Determination (Requires both Base + Add-on)
                const mountMap = {
                    'MT-TILT': 'T2545',
                    'MT-HD': 'T2584',
                    'MT-ART': 'T2574',
                    'MT-FIX': 'T2570'
                };
                if (s.MOUNT) {
                    skus.mount = mountMap[s.MOUNT] || '';
                }
            }
        }
        return skus;
    }

    // --- QUOTE GENERATION LOGIC ---

    generateProductData() {
        let items = [];

        const processItems = (rawCode) => {
            if (!rawCode || rawCode === 'NONE' || rawCode === 'None' || rawCode === '') return;
            
            // Split by '+' to handle compound accessory SKUs (e.g. "T2557 + T3218")
            const codes = String(rawCode).split('+');
            codes.forEach(code => {
                const trimmedCode = code.trim();
                if (trimmedCode) {
                    items.push({
                        code: trimmedCode,
                        qty: 1,
                        position: '',
                        imgUrl: '' 
                    });
                }
            });
        };

        const resolvedSKUs = this.getCartSKUs();
        
        if (resolvedSKUs.base) processItems(resolvedSKUs.base);
        if (resolvedSKUs.mount) processItems(resolvedSKUs.mount);

        if (this.hasAccessories) {
            this.selections.accessories.forEach(acc => {
                processItems(acc.key);
            });
        }

        console.log('Final Payload For Quote:', JSON.stringify(items));
        return JSON.stringify(items);
    }

    handleQuoteRequest() {
        this.isSubmitting = true;
        
        const configJson = this.generateProductData();
        const baseCartSKU = this.getCartSKUs().base; 
        
        createQuote({ 
            configJson: configJson, 
            opportunityId: this.opportunityId,
            cartSKU: baseCartSKU || 'Tryten Custom Cart' 
        })
        .then(quoteId => {
            this.isSubmitting = false;
            this.showToast('Success', 'Quote created successfully.', 'success');
            
            this.dispatchEvent(new CustomEvent('resetflow', {
                bubbles: true,
                composed: true
            }));
            
            this.navigateToRecord(quoteId);
        })
        .catch(error => {
            this.isSubmitting = false;
            console.error('Error creating quote:', error);
            this.showToast('Error', error.body?.message || 'An error occurred while creating the quote.', 'error');
        });
    }

    // NEW: Handle Update Quote
    handleUpdateQuote() {
        this.isSubmitting = true;

        const configJson = this.generateProductData();
        const baseCartSKU = this.getCartSKUs().base;

        updateExistingQuote({
            quoteId: this.quoteId,
            configJson: configJson,
            cartSKU: baseCartSKU || 'Tryten Custom Cart'
        })
        .then(() => {
            this.isSubmitting = false;
            this.showToast('Success', 'Quote updated successfully.', 'success');
            
            // Optionally, reset the flow or just navigate back to the quote
            this.dispatchEvent(new CustomEvent('resetflow', {
                bubbles: true,
                composed: true
            }));

            this.navigateToRecord(this.quoteId);
        })
        .catch(error => {
            this.isSubmitting = false;
            console.error('UPDATE ERROR =>', JSON.stringify(error));
            this.showToast('Error', error.body?.message || 'Update failed', 'error');
        });
    }

    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }

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
}
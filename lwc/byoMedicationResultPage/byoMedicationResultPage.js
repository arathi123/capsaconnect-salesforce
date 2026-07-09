import { LightningElement, api, track } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import createQuote from '@salesforce/apex/QuoteGeneratorController.createQuoteFromConfiguration';
import updateExistingQuote from '@salesforce/apex/QuoteGeneratorController.updateExistingQuote';

export default class ByoMedicationResultPage extends NavigationMixin(LightningElement) {
    @api opportunityId;
    @api summaryData = {};
    @track isLoading = false;
    @api isUnlistedCart;
    @api quoteId;


    connectedCallback() {
        if (this.isUnlistedCart) {
            this.showToast(
                'Configuration Not Found',
                'We dont have product Against this cart, therefor it will come under unlisted cart field and Quote line will be created against this',
                'warning'
            );
        }
    }

    get hasAccessories() {
        return this.summaryData.accessories && this.summaryData.accessories.length > 0;
    }

    // getter added dip
    get hasTray() {
        return this.summaryData.tray && this.summaryData.tray.label;
    }

    get isReconfigureMode() {

        return this.quoteId != null
            && this.quoteId != undefined
            && this.quoteId !== '';
    }

    // Aggregates cart code and accessories into the payload for Apex (Now includes Position)
    generateProductData() {
        let items = [];

        const processItems = (rawCode, multiplier = 1, pos = '') => {
            if (!rawCode || rawCode === 'NONE' || rawCode === 'None' || rawCode === '') return;

            if (pos === 'Both' && (rawCode === 'UG-AVWS-12400-LC' || rawCode === 'UG-AVWS-12400-CM')) {
                
                // 1. Add the primary upgrade code and assign it to the Left
                items.push({
                    code: rawCode.trim(),
                    qty: 2,
                    position: 'Both'
                });

              /*  // 2. Derive the secondary code by stripping the prefix, and assign it to the Right
                const secondaryCode = rawCode.replace('UG-AVWS-', '').trim();
                
                items.push({
                    code: secondaryCode,
                    qty: parseInt(multiplier) || 1,
                    position: 'Both'
                });*/

                return; 
            }

            // Split by comma (handles bundles like "SKU1, SKU2, SKU2")
            const codes = String(rawCode).split(',');

            codes.forEach(code => {
                const trimmedCode = code.trim();
                if (trimmedCode) {
                    // Check if we already have this exact code + position combination
                    let existingItem = items.find(i => i.code === trimmedCode && i.position === pos);
                    
                    if (existingItem) {
                        existingItem.qty += parseInt(multiplier) || 1;
                    } else {
                        items.push({
                            code: trimmedCode,
                            qty: parseInt(multiplier) || 1,
                            position: pos
                        });
                    }
                }
            });
        };

        // 1. Add Main Cart SKU (No position needed for the base cart)
        processItems(this.summaryData.packageSku, 1, '');

        // 2. Add Accessories (Pass the position!)
        if (this.summaryData.accessories) {
            this.summaryData.accessories.forEach(acc => {
                processItems(acc.optionKey, acc.quantity, acc.position);
            });
        }

       // BLOCK for Tray(LaptopOption)
        if (this.summaryData.tray && this.summaryData.tray.key) {
            processItems(this.summaryData.tray.key, 1, '');
        }

        console.log('Aggregated Items for Quote:', JSON.stringify(items));
        return JSON.stringify(items); // Array is already in the exact format Apex expects
    }

    handleQuoteRequest() {
        this.isLoading = true;
        const configJson = this.generateProductData();
        
        createQuote({ 
            configJson: configJson, 
            opportunityId: this.opportunityId,
            cartSKU: this.summaryData.packageSku
        })
        .then(quoteId => {
            this.isLoading = false;
            this.showToast('Success', 'Quote created successfully.', 'success');
            
            // Tell parent to reset
            this.dispatchEvent(new CustomEvent('resetflow', { bubbles: true, composed: true }));
            
            // Navigate to Quote
            this[NavigationMixin.Navigate]({
                type: 'standard__recordPage',
                attributes: { recordId: quoteId, objectApiName: 'Quote', actionName: 'view' }
            });
        })
        .catch(error => {
            this.isLoading = false;
            console.error('Error:', error);
            this.showToast('Error', error.body?.message || 'Check console for details.', 'error');
        });
    }

    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }

    handleUpdateQuote() {

        console.log(
            '🟢 Updating Existing Medication Quote =>',
            this.quoteId
        );

        this.isLoading = true;

        const configJson =
            this.generateProductData();

        console.log(
            '🟢 Medication Update Payload =>',
            configJson
        );

        updateExistingQuote({

            quoteId: this.quoteId,

            configJson: configJson,

            cartSKU: this.summaryData.packageSku
        })

        .then(() => {

            this.isLoading = false;

            this.showToast(
                'Success',
                'Quote updated successfully.',
                'success'
            );

            this[NavigationMixin.Navigate]({

                type: 'standard__recordPage',

                attributes: {
                    recordId: this.quoteId,
                    objectApiName: 'Quote',
                    actionName: 'view'
                }
            });
        })

        .catch(error => {

            this.isLoading = false;

            console.error(
                'Medication Update Error =>',
                JSON.stringify(error)
            );

            this.showToast(
                'Error',
                error.body?.message ||
                'Something went wrong',
                'error'
            );
        });
    }
}
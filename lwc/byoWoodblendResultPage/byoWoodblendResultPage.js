import { LightningElement, api, track } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import createQuote from '@salesforce/apex/QuoteGeneratorController.createQuoteFromConfiguration';
import updateExistingQuote from '@salesforce/apex/QuoteGeneratorController.updateExistingQuote';

export default class ByoWoodblendResultPage extends NavigationMixin(LightningElement) {
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

    // --- GETTERS FOR UI DISPLAY ---
    get handle() { return this.summaryData.handle; }
    get hasHandle() { return this.handle && this.handle.optionKey && this.handle.optionKey !== 'NONE'; }

    get pullOutSurface() { return this.summaryData.pullOutSurface; }
    get hasPullOutSurface() { return this.pullOutSurface && this.pullOutSurface.optionKey && this.pullOutSurface.optionKey !== 'NONE'; }

    get hasOptions() { return this.hasHandle || this.hasPullOutSurface; }

    get hasAccessories() {
        return this.summaryData.accessories && this.summaryData.accessories.length > 0;
    }
    //  ADD THIS BLOCK HERE (for Tray display)
    get hasTray() {
        return this.summaryData.tray && this.summaryData.tray.label;
    }
    get isReconfigureMode() {

        return this.quoteId != null
            && this.quoteId != undefined
            && this.quoteId !== '';
    }

    // --- QUOTE LOGIC ---
    generateProductData() {
        let items = [];

        const processItems = (rawCode, multiplier = 1, pos = '') => {
            if (!rawCode || rawCode === 'NONE' || rawCode === 'None' || rawCode === '') return;

            if (pos === 'Both' && rawCode === 'UG-AWWS-12400-AW-SG') {
                
                // 1. Add the primary upgrade code and assign it to the Left
                items.push({
                    code: rawCode.trim(),
                    qty: 2,
                    position: 'Both'
                });

                // 2. Derive the secondary code by stripping the prefix, and assign it to the Right
              /*  const secondaryCode = rawCode.replace('UG-AWWS-', '').trim();
                
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

        // 2. Add Options (Handle & Surface)
        processItems(this.summaryData.handle?.optionKey, 1, '');
        processItems(this.summaryData.pullOutSurface?.optionKey, 1, this.summaryData.pullOutSurface?.position || '');

        // 3. Add Accessories & Trays
        if (this.summaryData.accessories) {
            this.summaryData.accessories.forEach(acc => {
                // Add the main accessory and its position
                processItems(acc.optionKey, acc.quantity, acc.position);
                
                // Add independent tray if selected (Tray acts as a separate Quote Line Item)
                if (acc.tray) {
                    processItems(acc.tray, acc.quantity, '');
                }
            });
        }

        // 4. Add Tray (IMPORTANT FIX)
        if (this.summaryData.tray && this.summaryData.tray.key) {
            processItems(this.summaryData.tray.key, 1, '');
        }

        console.log('Aggregated Items for Quote:', JSON.stringify(items));
        return JSON.stringify(items);
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
            ' Updating Existing WoodBlend Quote =>',
            this.quoteId
        );

        this.isLoading = true;

        const configJson =
            this.generateProductData();

        console.log(
            ' WoodBlend Update Payload =>',
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
                'WoodBlend Update Error => ',
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
import { LightningElement, api, track } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import createQuote from '@salesforce/apex/QuoteGeneratorController.createQuoteFromConfiguration';
import updateExistingQuote from '@salesforce/apex/QuoteGeneratorController.updateExistingQuote';

export default class ByoResultPage extends NavigationMixin(LightningElement) {
    @api opportunityId;
    @api isUnlistedCart;
    @api summaryData = {};
    @track isLoading = false;
    @api quoteId;

    connectedCallback() {

         console.log(
            '🟢 MEDICAL BYO QUOTE ID =>',
            this.quoteId
        );

        console.log(
            '🟢 MEDICAL BYO RECONFIGURE =>',
            this.isReconfigureMode
        );
        
    if (this.isUnlistedCart) {
            this.showToast(
                'Configuration Not Found',
                'We dont have have product Against this cart, therefor it will come under unlisted cart field and Quote line will not be created against this.',
                'warning'
            );
        }
    }

    // --- CLEAN GETTERS (Display Only) ---
    get packageType() {
        return this.summaryData.isCustom 
            ? `Build Your Own - ${this.summaryData.packageSku}` 
            : (this.summaryData.packageType || '');
    }

    get useCase() { return this.summaryData.cartType?.label || ''; }
    get height() { return this.summaryData.height?.label || ''; }
    get lock() { return this.summaryData.lock?.label || ''; }
    get color() { return this.summaryData.color?.label || ''; }

    get storageTiers() {
        return (this.summaryData.storageTiers || []).map(tier => ({
            ...tier,
            displayLabel: tier.sizeKey ? `${tier.sizeLabel} - ${tier.sizeKey}` : tier.sizeLabel
        }));
    }
    get hasStorageTiers() { return this.storageTiers.length > 0; }

    get handle() { return this.summaryData.handle; }
    get labels() { return this.summaryData.labels; }
    get pullOutSurface() { return this.summaryData.pullOutSurface; }
    get hasOptions() { return this.handle || this.labels || this.pullOutSurface; }

    get bridge() { return this.summaryData.bridge; }
    get hasBridge() { 
        return this.bridge && this.bridge.optionKey != '';
    }

    get bins() { return this.summaryData.bins || []; }
    get hasBins() { return this.bins.length > 0; }

    get optionalStorageShelff() {
        return this.summaryData.optionalStorageShelf?.optionLabel;
    }

    get hasOptionalStorageShelf() {
        const shelf = this.optionalStorageShelff;
        if (shelf && shelf != 'None') {
            return true;
        }
        return false;
    }

    get accessories() { return this.summaryData.accessories || []; }
    get hasAccessories() { return this.accessories.length > 0; }

    // --- NEW: TRAY GETTERS ---
    get tray() { return this.summaryData.tray; }
    get hasTray() { return this.tray && this.tray.key && this.tray.key !== ''; }

    // --- QUOTE LOGIC ---

    get isReconfigureMode() {

        return this.quoteId != null
            && this.quoteId != undefined
            && this.quoteId != '';
    }

    generateProductData() {
        let items = [];

        const processItems = (rawCode, multiplier = 1, pos = '') => {
            if (!rawCode || rawCode === 'NONE' || rawCode === 'None' || rawCode === '') {
                return;
            }

            if (pos === 'Both' && rawCode === 'UG-AVWS-12400-LC') {
                
                // 1. Add the primary upgrade code and assign it to Both
                items.push({
                    code: rawCode.trim(),
                    qty: 2,
                    position: 'Both'
                });

             /*   // 2. Derive the secondary code by stripping the prefix
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

        // 1. Package SKU (Qty 1, no position)
        processItems(this.summaryData.packageSku, 1, '');

        // 2. Storage Tiers (Qty 1, no position)
        if (this.summaryData.storageTiers) {
            this.summaryData.storageTiers.forEach(tier => processItems(tier.sizeKey, 1, ''));
        }

        // 3. Single-choice Options (No position)
        processItems(this.summaryData.handle?.optionKey, 1, '');
        processItems(this.summaryData.labels?.optionKey, 1, '');
        processItems(this.summaryData.pullOutSurface?.optionKey, 1, this.summaryData.pullOutSurface?.position || '');
        processItems(this.summaryData.bridge?.optionKey, 1, '');
        processItems(this.summaryData.optionalStorageShelf?.optionKey, 1, '');

        // 4. Bins (No position)
        if (this.summaryData.bins) {
            this.summaryData.bins.forEach(bin => {
                processItems(bin.optionKey, bin.quantity, '');
            });
        }

        // 5. Accessories (INCLUDE POSITION)
        if (this.summaryData.accessories) {
            this.summaryData.accessories.forEach(acc => {
                processItems(acc.optionKey, acc.quantity, acc.position);
            });
        }

        // 6. NEW: Process Dedicated Tray Selection (No position needed)
        if (this.summaryData.tray) {
            processItems(this.summaryData.tray.key, 1, '');
        }

        console.log('Aggregated Items for Quote:', JSON.stringify(items));
        return JSON.stringify(items);
    }

    handleQuoteRequest(event) {
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
            this.dispatchEvent(new CustomEvent('resetflow', {
                bubbles: true,
                composed: true
            }));
            this.navigateToRecord(quoteId);
        })
        .catch(error => {
            this.isLoading = false;
            console.error('Error:', error);
            this.showToast('Error', error.body?.message || 'Check console.', 'error');
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

    handleUpdateQuote() {

        this.isLoading = true;

        const configJson =
            this.generateProductData();

        updateExistingQuote({

            quoteId: this.quoteId,

            configJson: configJson
        })

        .then(() => {

            this.isLoading = false;

            this.showToast(
                'Success',
                'Quote updated successfully.',
                'success'
            );

            this.navigateToRecord(
                this.quoteId
            );
        })

        .catch(error => {

            this.isLoading = false;

            console.error(
                'UPDATE ERROR =>',
                JSON.stringify(error)
            );

            this.showToast(
                'Error',
                error.body?.message || 'Update failed',
                'error'
            );
        });
    }
}
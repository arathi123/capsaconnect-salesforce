import { LightningElement, api, track } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import createQuote from '@salesforce/apex/QuoteGeneratorController.createQuoteFromConfiguration';

export default class CapsaAvaloTechReadyResultPage extends NavigationMixin(LightningElement) {
    @api opportunityId;
    @api summaryData = {};
    @api isUnlistedCart;
    
    @track isLoading = false;

    connectedCallback() {
        if (this.isUnlistedCart) {
            this.showToast(
                'Configuration Not Found',
                'We don\'t have a standard product against this cart. It will be submitted as an unlisted cart for review.',
                'warning'
            );
        }
    }

    get hasAccessories() {
        return this.summaryData.accessories && this.summaryData.accessories.length > 0;
    }

    get hasTray() {
        return this.summaryData.tray && this.summaryData.tray.key;
    }

    generateProductData() {
        let items = [];

        const processItems = (rawCode, multiplier = 1, pos = '') => {
            if (!rawCode || rawCode === 'NONE' || rawCode === 'None' || rawCode === '') return;

            if (pos === 'Both' && (rawCode === 'UG-AVWS-12400-LC' || rawCode === 'UG-AVWS-12400-CM')) {
                items.push({
                    code: rawCode.trim(),
                    qty: 2,
                    position: 'Both'
                });
                return; 
            }

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

        // 1. Base Cart SKU
        processItems(this.summaryData.packageSku, 1, '');

        // 2. Accessories
        if (this.summaryData.accessories) {
            this.summaryData.accessories.forEach(acc => {
                processItems(acc.optionKey, acc.quantity, acc.position);
            });
        }

        // 3. Tray
        if (this.summaryData.tray && this.summaryData.tray.key) {
            processItems(this.summaryData.tray.key, 1, '');
        }

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
            
            this.dispatchEvent(new CustomEvent('resetflow', { bubbles: true, composed: true }));
            
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
}
import { LightningElement, api, track } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import createQuote from '@salesforce/apex/QuoteGeneratorController.createQuoteFromConfiguration';
import updateExistingQuote from '@salesforce/apex/QuoteGeneratorController.updateExistingQuote';

export default class CapsaNonPoweredLX5Result extends NavigationMixin(LightningElement) {
    @api opportunityId;
    @api summaryData = {};
    @api quoteId;
    @track isLoading = false;

    get hasStorage()        { return (this.summaryData.storage || []).length > 0; }
    get hasWarrantyService() { return (this.summaryData.warrantyService || []).length > 0; }
    get hasAccessories()    { return (this.summaryData.accessories || []).length > 0; }

    get isReconfigureMode() {
        return this.quoteId != null && this.quoteId !== undefined && this.quoteId !== '';
    }

    generateProductData() {
        const items = [];

        const addItems = (arr) => {
            (arr || []).forEach(i => {
                if (i && i.key && i.key.trim()) {
                    items.push({ code: i.key.trim(), qty: 1, position: '' });
                }
            });
        };

        addItems(this.summaryData.storage);
        addItems(this.summaryData.warrantyService);

        (this.summaryData.accessories || []).forEach(acc => {
            if (acc.optionKey && acc.optionKey.trim()) {
                items.push({ code: acc.optionKey.trim(), qty: acc.quantity || 1, position: '' });
            }
        });

        return JSON.stringify(items);
    }

    handleQuoteRequest() {
        this.isLoading = true;
        const configJson = this.generateProductData();

        createQuote({ configJson, opportunityId: this.opportunityId, cartSKU: '' })
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
                this.showToast('Error', error.body?.message || 'Check console for details.', 'error');
            });
    }

    handleUpdateQuote() {
        this.isLoading = true;
        const configJson = this.generateProductData();

        updateExistingQuote({ quoteId: this.quoteId, configJson, cartSKU: '' })
            .then(() => {
                this.isLoading = false;
                this.showToast('Success', 'Quote updated successfully.', 'success');
                this[NavigationMixin.Navigate]({
                    type: 'standard__recordPage',
                    attributes: { recordId: this.quoteId, objectApiName: 'Quote', actionName: 'view' }
                });
            })
            .catch(error => {
                this.isLoading = false;
                this.showToast('Error', error.body?.message || 'Something went wrong', 'error');
            });
    }

    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }
}
import { LightningElement, api, track } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import createQuote from '@salesforce/apex/QuoteGeneratorController.createQuoteFromConfiguration';
import updateExistingQuote from '@salesforce/apex/QuoteGeneratorController.updateExistingQuote';

export default class CapsaPAResult extends NavigationMixin(LightningElement) {
    @api opportunityId;
    @api summaryData = {};
    @api quoteId;
    @track isLoading = false;

    get hasTableTopUnit() {
        return this.summaryData && this.summaryData.tableTopUnit && !!this.summaryData.tableTopUnit.key;
    }

    get hasWarranty() {
        return this.summaryData && this.summaryData.warranty && !!this.summaryData.warranty.key;
    }

    get hasService() {
        return this.summaryData && this.summaryData.service && !!this.summaryData.service.key;
    }

    get isReconfigureMode() {
        return this.quoteId != null && this.quoteId !== undefined && this.quoteId !== '';
    }

    generateProductData() {
        const items = [];

        const addItem = (key) => {
            if (key && key.trim()) {
                items.push({ code: key.trim(), qty: 1, position: '' });
            }
        };

        if (this.summaryData) {
            if (this.summaryData.tableTopUnit) addItem(this.summaryData.tableTopUnit.key);
            if (this.summaryData.warranty)     addItem(this.summaryData.warranty.key);
            if (this.summaryData.service)      addItem(this.summaryData.service.key);
        }

        return JSON.stringify(items);
    }

    handleQuoteRequest() {
        this.isLoading = true;
        const configJson = this.generateProductData();
        const cartSku = (this.summaryData && this.summaryData.tableTopUnit)
            ? this.summaryData.tableTopUnit.key || ''
            : '';

        createQuote({
            configJson: configJson,
            opportunityId: this.opportunityId,
            cartSKU: cartSku
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
            console.error('PA Quote Error:', error);
            this.showToast('Error', error.body?.message || 'Check console for details.', 'error');
        });
    }

    handleUpdateQuote() {
        this.isLoading = true;
        const configJson = this.generateProductData();
        const cartSku = (this.summaryData && this.summaryData.tableTopUnit)
            ? this.summaryData.tableTopUnit.key || ''
            : '';

        updateExistingQuote({
            quoteId: this.quoteId,
            configJson: configJson,
            cartSKU: cartSku
        })
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
            console.error('PA Update Error:', JSON.stringify(error));
            this.showToast('Error', error.body?.message || 'Something went wrong', 'error');
        });
    }

    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }
}
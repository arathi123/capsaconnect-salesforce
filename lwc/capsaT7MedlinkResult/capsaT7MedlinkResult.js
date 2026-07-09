import { LightningElement, api, track } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import createQuote from '@salesforce/apex/QuoteGeneratorController.createQuoteFromConfiguration';
import updateExistingQuote from '@salesforce/apex/QuoteGeneratorController.updateExistingQuote';

export default class CapsaT7MedlinkResult extends NavigationMixin(LightningElement) {
    @api opportunityId;
    @api summaryData = {};
    @api quoteId;
    @track isLoading = false;

    get hasUseCases()     { return (this.summaryData.useCases || []).length > 0; }
    get hasPower()        { return (this.summaryData.power || []).length > 0; }
    get hasBatteryType()  { return (this.summaryData.batteryType || []).length > 0; }
    get hasPowerTrack()   { return (this.summaryData.powerTrack || []).length > 0; }
    get hasGantry()       { return (this.summaryData.gantry || []).length > 0; }
    get hasHeadAssembly() { return (this.summaryData.headAssembly || []).length > 0; }
    get hasMedDrawers()   { return (this.summaryData.medDrawers || []).length > 0; }
    get hasDrawerKits()   { return (this.summaryData.drawerKits || []).length > 0; }
    get hasAccessories()  { return (this.summaryData.accessories || []).length > 0; }

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

        addItems(this.summaryData.useCases);
        addItems(this.summaryData.power);
        addItems(this.summaryData.powerInputCable);
        addItems(this.summaryData.batteryType);
        addItems(this.summaryData.powerTrack);
        addItems(this.summaryData.gantry);
        addItems(this.summaryData.headAssembly);
        addItems(this.summaryData.medDrawers);
        addItems(this.summaryData.drawerKits);

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
                console.error('T7MedLink Quote Error:', error);
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
                console.error('T7MedLink Update Error:', JSON.stringify(error));
                this.showToast('Error', error.body?.message || 'Something went wrong', 'error');
            });
    }

    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }
}
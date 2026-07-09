import { LightningElement, api, track,wire } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import createQuoteFromConfiguration from '@salesforce/apex/QuoteGeneratorController.createQuoteFromConfiguration';
import updateExistingQuote from '@salesforce/apex/QuoteGeneratorController.updateExistingQuote';
import LAPTOP_STORAGE from '@salesforce/resourceUrl/laptopstorage';

export default class SlimCartResults extends NavigationMixin(LightningElement) {
    @api opportunityId;
    @api selections;
    @api quoteId; // Needed to support reconfiguring an existing quote
    @track currentPreviewImage = LAPTOP_STORAGE+'/laptop_drawer.jpg';

    @track isLoading = false;


    get isReconfigureMode() {
        return this.quoteId != null && this.quoteId !== undefined && this.quoteId !== '';
    }

        // --- SUMMARY UI BUILDER ---
    get summarySections() {

        return [
            { title: 'CART TYPE', items: this.selections?.Cart_Type || [], hasData: (this.selections?.Cart_Type || []).length > 0 },
            { title: 'Storage', items: this.selections?.Storage || [], hasData: (this.selections?.Storage || []).length > 0 },
            { title: 'Accessories', items: this.selections?.Accessories || [], hasData: (this.selections?.Accessories || []).length > 0 },
            { title: 'Assembly', items: this.selections?.Assembly || [], hasData: (this.selections?.Assembly || []).length > 0 },
            { title: 'Warranty', items: this.selections?.Warranty || [], hasData: (this.selections?.Warranty || []).length > 0 }
        ];
    }

    // --- PAYLOAD GENERATOR FOR APEX ---
    buildProductRequests() {
        let requests = [];
        const allSelections = [
            ...(this.selections?.Cart_Type || []),
            ...(this.selections?.Storage || []),
            ...(this.selections?.Accessories || []),
            ...(this.selections?.Assembly || []),
            ...(this.selections?.Warranty || [])
        ];

         const billableItems = allSelections.filter(item => item.sku !== null && item.sku !== '');

        billableItems.forEach(item => {
            if (item.sku.includes('+')) {
                const parts = item.sku.split('+');
                parts.forEach(p => {
                    requests.push({ code: p.trim(), qty: 1, imgUrl: '', position: item.id ? `Slot ${item.id}` : '' });
                });
            } else {
                requests.push({ code: item.sku.trim(), qty: 1, imgUrl: '', position: item.id ? `Slot ${item.id}` : '' });
            }
        });

        return JSON.stringify(requests)
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
            this.isLoading = false; // Only stop loading if there's an error (so spinner stays up during redirect)
        }
    }
}
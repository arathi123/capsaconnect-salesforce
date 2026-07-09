import { LightningElement, api, track } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import createQuote from '@salesforce/apex/QuoteGeneratorController.createQuoteFromConfiguration';

export default class ByoPackageResult extends NavigationMixin(LightningElement) {
    @api opportunityId;
    @api packageSummaryData = {}; 
    @track isLoading = false;

    cartImageUrl = '/resource/Packages/Packages/Pediatric.jpg';

    get useCaseLabel() {
        return this.packageSummaryData.cartType?.label || 'Pediatric Crash';
    }

    get selectedPackageLabel() {
        const pkg = this.packageSummaryData.packageSelected;
        return pkg ? pkg.Option_Key__c : 'N/A';
    }

    get packageImage() {
        const pkg = this.packageSummaryData.packageSelected;
        return pkg && pkg.Image_URL__c ? pkg.Image_URL__c : this.cartImageUrl;
    }

    get hasAccessories() {
        return this.packageSummaryData.packageSelected.Option_Key__c != 'NONE';
    }

    handleQuoteRequest() {
        this.isLoading = true;
        
        const mainCartCode = this.packageSummaryData.packageSku || 'AM-EM-STD-PED';
        const selectedPackageCode = this.packageSummaryData.packageSelected?.Option_Key__c;
        
        const items = [];
        
        // 1. Add Main Cart
        if (mainCartCode) {
            items.push({ 
                code: mainCartCode, 
                qty: 1 
            });
        }
        
        // 2. Add Selected Package with its Context Image
        if (selectedPackageCode) {
            items.push({ 
                code: selectedPackageCode, 
                qty: 1,
                imgUrl: this.packageImage
            });
        }

        const configJson = JSON.stringify(items);
        
        createQuote({ 
            configJson: configJson, 
            opportunityId: this.opportunityId, 
            cartSKU: mainCartCode 
        })
        .then(quoteId => {
            this.isLoading = false;
            this.showToast('Success', 'Quote created for Pediatric Configuration.', 'success');
            this.dispatchEvent(new CustomEvent('resetflow', {
                bubbles: true,
                composed: true
            }));
            this.navigateToRecord(quoteId);
        })
        .catch(error => {
            this.isLoading = false;
            this.showToast('Error', error.body?.message || 'Failed to create quote.', 'error');
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
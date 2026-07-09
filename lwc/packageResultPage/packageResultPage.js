import { LightningElement, api, track, wire } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getOptionsByIdentifiers from '@salesforce/apex/CartConfiguratorController.getOptionsByIdentifiers';
import updateExistingQuote from '@salesforce/apex/QuoteGeneratorController.updateExistingQuote';
import createQuote from '@salesforce/apex/QuoteGeneratorController.createQuoteFromConfiguration';

export default class PackageResultPage extends NavigationMixin(LightningElement) {
    @api opportunityId;
    @api packageSummaryData; 
    @track isLoading = false;
    @track cartImageUrl = '';
    @api quoteId;

    connectedCallback() {

        console.log(
            '🟢 PACKAGE RESULT quoteId =>',
            this.quoteId
        );

        console.log(
            '🟢 PACKAGE RESULT isReconfigureMode =>',
            this.isReconfigureMode
        );

        console.log(
            '🟢 PACKAGE RESULT packageSummaryData =>',
            JSON.stringify(this.packageSummaryData)
        );
    }

    // Fetch the Main Cart Image based on the Unique ID determined by Height selection
    @wire(getOptionsByIdentifiers, { identifiers: '$cartPreviewIdList' })
    wiredCartMetadata({ error, data }) {
        if (data && data.length > 0) {
            this.cartImageUrl = data[0].Image_URL__c;
        } else if (error) {
            console.error('Error fetching cart preview image:', error);
        }
    }

    get cartPreviewIdList() {
        console.log('Fetching cart preview with Unique ID:', this.packageSummaryData?.cartPreviewUniqueId);
        return this.packageSummaryData?.cartPreviewUniqueId ? [this.packageSummaryData.cartPreviewUniqueId] : [];
    }

    // Accessors for clean UI rendering
    get hasHeight() { return !!this.packageSummaryData?.height?.label; }
    get hasLock() { return !!this.packageSummaryData?.lock?.label; }
    get hasAccessory() {return !!this.packageSummaryData?.accessories?.label; }
    
    get accessoryImageUrl() {
        return this.packageSummaryData?.accessories?.fullRecord?.Image_URL__c;
    }

    get isReconfigureMode() {

        return !!this.quoteId;
    }

    handleQuoteRequest() {
        this.isLoading = true;

        // Construct the line items with the specific context images
        const items = [];
        
        // Push the Main Package SKU with its dynamically fetched cart image
        if (this.packageSummaryData.packageSku) {
            items.push({ 
                code: this.packageSummaryData.packageSku, 
                qty: 1, 
                imgUrl: this.cartImageUrl 
            });
        }
        
        // Push the Accessory Package with its specific image from metadata
        if (this.packageSummaryData.accessories && this.packageSummaryData.accessories.key) {
            items.push({ 
                code: this.packageSummaryData.accessories.key, 
                qty: 1, 
                imgUrl: this.accessoryImageUrl 
            });
        }

        createQuote({ 
            configJson: JSON.stringify(items), 
            opportunityId: this.opportunityId,
            cartSKU: this.packageSummaryData.packageSku
        })
        .then(quoteId => {
            this.isLoading = false;
            this.showToast('Success', 'Quote generated for ' + this.packageSummaryData.cartLabel, 'success');
            this.dispatchEvent(new CustomEvent('resetflow', {
                bubbles: true,
                composed: true
            }));
            
            this[NavigationMixin.Navigate]({
                type: 'standard__recordPage',
                attributes: {
                    recordId: quoteId,
                    objectApiName: 'Quote',
                    actionName: 'view'
                }
            });
        })
        .catch(error => {
            this.isLoading = false;
            this.showToast('Error', error.body?.message || 'Failed to create quote.', 'error');
        });
    }

    handleUpdateQuote() {

        this.isLoading = true;

        const items = [];

        if (this.packageSummaryData.packageSku) {

            items.push({
                code:
                    this.packageSummaryData.packageSku,
                qty: 1,
                imgUrl: this.cartImageUrl
            });
        }

        if (
            this.packageSummaryData.accessories &&
            this.packageSummaryData.accessories.key
        ) {

            items.push({
                code:
                    this.packageSummaryData.accessories.key,
                qty: 1,
                imgUrl: this.accessoryImageUrl
            });
        }

        updateExistingQuote({

            quoteId: this.quoteId,

            configJson:
                JSON.stringify(items),

            cartSKU:
                this.packageSummaryData.packageSku
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
                'Update Quote Error => ',
                JSON.stringify(error)
            );

            this.showToast(
                'Error',
                error.body?.message ||
                'Failed to update quote.',
                'error'
            );
        });
    }

    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }
}
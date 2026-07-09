import { LightningElement, api, track } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import createQuoteFromConfiguration from '@salesforce/apex/QuoteGeneratorController.createQuoteFromConfiguration';
import updateExistingQuote from '@salesforce/apex/QuoteGeneratorController.updateExistingQuote';

export default class CapsaV6Results extends NavigationMixin(LightningElement) {
    @api opportunityId;
    @api selections;
    @api quoteId;
    @track isLoading = false;
    @track baseCartImage = '';
    @track overlays = [];

    connectedCallback() {
        this.restorePreviewState();
    }

    get isReconfigureMode() {
        return this.quoteId != null && this.quoteId !== undefined && this.quoteId !== '';
    }

    restorePreviewState() {
        if (this.selections && this.selections.layeredPreview) {
            this.baseCartImage = this.selections.layeredPreview.baseImage;
            this.overlays = this.selections.layeredPreview.overlays || [];
        } else {
            this.baseCartImage = this.selections?.previewImage || '/resource/m38eImagesPart1/m38eImagesPart1/documentation.jpg';
        }
    }

    get summarySections() {
        return [
            { title: 'Wall Arm Track', items: this.selections?.TRACK || [], hasData: (this.selections?.TRACK || []).length > 0 },
            { title: 'Wall Arm Option', items: this.selections?.ARM || [], hasData: (this.selections?.ARM || []).length > 0 },
            { title: 'Keyboard Arm', items: this.selections?.KEYBOARD_ARM || [], hasData: (this.selections?.KEYBOARD_ARM || []).length > 0 },
            { title: 'Keyboard Tray', items: this.selections?.KEYBOARD_TRAY || [], hasData: (this.selections?.KEYBOARD_TRAY || []).length > 0 },
            { title: 'Accessories', items: this.selections?.ACCESSORIES || [], hasData: (this.selections?.ACCESSORIES || []).length > 0 },
            { title: 'Results', items: this.selections?.RESULTS || [], hasData: (this.selections?.RESULTS || []).length > 0 }
        ];
    }

    // --- PAYLOAD GENERATOR FOR APEX ---
    buildProductRequests() {
        let requests = [];
        const allSelections = [
            ...(this.selections?.TRACK || []),
            ...(this.selections?.ARM || []),
            ...(this.selections?.KEYBOARD_ARM || []),
            ...(this.selections?.KEYBOARD_TRAY || []),
            ...(this.selections?.ACCESSORIES || []),
            ...(this.selections?.RESULTS || [])
        ];

         const billableItems = allSelections.filter(item => item.key !== null && item.key !== '');

        billableItems.forEach(item => {
            if (item.key.includes('+')) {
                const parts = item.key.split('+');
                parts.forEach(p => {
                    requests.push({ code: p.trim(), qty: 1, imgUrl: '', position: item.id ? `Slot ${item.id}` : '' });
                });
            } else {
                requests.push({ code: item.key.trim(), qty: 1, imgUrl: '', position: item.id ? `Slot ${item.id}` : '' });
            }
        });

        return JSON.stringify(requests)
    }

    async handleGenerateQuote() {
        this.isLoading = true;
        try {
            const configJson = this.buildProductRequests();
            if (this.isReconfigureMode) {
                await updateExistingQuote({ quoteId: this.quoteId, configJson: configJson });
                this.showToast('Success', 'Quote updated successfully.', 'success');
                this.dispatchEvent(new CustomEvent('resetflow', { bubbles: true, composed: true }));
                this.navigateToRecord(newQuoteId);
            } else {
                const newQuoteId = await createQuoteFromConfiguration({ configJson: configJson, opportunityId: this.opportunityId });
                this.showToast('Success', 'Quote created successfully.', 'success');
                this.dispatchEvent(new CustomEvent('resetflow', { bubbles: true, composed: true }));
                this.navigateToRecord(this.isReconfigureMode ? this.quoteId : newQuoteId);
            }
        } catch (error) {
            console.error('Quote Generation Error:', error);
            this.showToast('Error', error.body ? error.body.message : error.message, 'error');
        } finally {
            this.isLoading = false;
        }
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

    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }
}
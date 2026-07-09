import { LightningElement, api, wire } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import { getRelatedListRecords } from 'lightning/uiRelatedListApi';
import { deleteRecord, getRecordNotifyChange } from 'lightning/uiRecordApi';
import { refreshApex } from '@salesforce/apex';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import DeleteConfirmModal from 'c/deleteConfirmModal';
import NewServiceQuoteModal from 'c/newServiceQuoteModal';

const COLUMNS = [
    {
        label: 'Quote Name',
        fieldName: 'quoteUrl',
        type: 'url',
        typeAttributes: { label: { fieldName: 'Name' }, target: '_self' }
    },
    { label: 'Quote Number', fieldName: 'QuoteNumber', type: 'text' },
    { label: 'Status', fieldName: 'Status', type: 'text' },
    { label: 'Grand Total', fieldName: 'GrandTotal', type: 'currency', typeAttributes: { currencyCode: 'USD' } },
    { label: 'Expiration Date', fieldName: 'ExpirationDate', type: 'date' },
    {
        type: 'action',
        typeAttributes: {
            rowActions: [
                { label: 'Edit', name: 'edit' },
                { label: 'Delete', name: 'delete' }
            ]
        }
    }
];

export default class CaseQuoteRelatedList extends NavigationMixin(LightningElement) {
    @api recordId;

    isLoading = true;
    quotes = [];
    columns = COLUMNS;
    error;
    _wiredResult;

    @wire(getRelatedListRecords, {
        parentRecordId: '$recordId',
        relatedListId: 'Quotes__r',
        fields: [
            'Quote.Id',
            'Quote.Name',
            'Quote.QuoteNumber',
            'Quote.Status',
            'Quote.GrandTotal',
            'Quote.ExpirationDate'
        ],
        pageSize: 6
    })
    wiredQuotes(result) {
        this._wiredResult = result;
        this.isLoading = false;
        const { data, error } = result;
        if (data) {
            this.error = undefined;
            this.quotes = data.records.map(record => ({
                id: record.id,
                Name: record.fields.Name?.value,
                QuoteNumber: record.fields.QuoteNumber?.value,
                Status: record.fields.Status?.value,
                GrandTotal: record.fields.GrandTotal?.value,
                ExpirationDate: record.fields.ExpirationDate?.value,
                quoteUrl: `/lightning/r/Quote/${record.id}/view`
            }));
        } else if (error) {
            this.error = error;
            this.quotes = [];
        }
    }

    get cardTitle() {
        return this.quotes.length > 0 ? `Quotes (${this.quotes.length})` : 'Quotes';
    }

    get hasQuotes() {
        return this.quotes.length > 0;
    }

    get hasError() {
        return !!this.error;
    }

    async handleNewQuote() {
        const quoteId = await NewServiceQuoteModal.open({
            size: 'medium',
            recordId: this.recordId
        });
        if (quoteId) {
            refreshApex(this._wiredResult);
            this[NavigationMixin.Navigate]({
                type: 'standard__recordPage',
                attributes: { recordId: quoteId, actionName: 'view' }
            });
        }
    }

    async handleRowAction(event) {
        const actionName = event.detail.action.name;
        const recordId = event.detail.row.id;
        if (actionName === 'delete') {
            if (event.detail.row.Status === 'Approved') {
                this.dispatchEvent(new ShowToastEvent({
                    title: 'Cannot Delete Quote',
                    message: 'Approved quotes cannot be deleted. Recall the approval before deleting.',
                    variant: 'error',
                    mode: 'sticky'
                }));
                return;
            }
            const confirmed = await DeleteConfirmModal.open({ size: 'small' });
            if (confirmed) {
                try {
                    await deleteRecord(recordId);
                    getRecordNotifyChange([{ recordId: this.recordId }]);
                    await refreshApex(this._wiredResult);
                    this.dispatchEvent(new ShowToastEvent({
                        title: 'Success',
                        message: 'Quote deleted successfully.',
                        variant: 'success'
                    }));
                } catch (err) {
                    this.dispatchEvent(new ShowToastEvent({
                        title: 'Error deleting quote',
                        message: err.body?.message || err.message || 'Unknown error',
                        variant: 'error'
                    }));
                }
            }
        } else {
            this[NavigationMixin.Navigate]({
                type: 'standard__recordPage',
                attributes: { recordId, objectApiName: 'Quote', actionName }
            });
        }
    }

    handleViewAll() {
        this[NavigationMixin.Navigate]({
            type: 'standard__relatedList',
            attributes: {
                parentRecordId: this.recordId,
                relatedListId: 'Quotes__r'
            }
        });
    }
}
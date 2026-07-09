import { LightningElement, api, track, wire } from 'lwc';
import { NavigationMixin, CurrentPageReference } from 'lightning/navigation';
import getInvoiceDetail from '@salesforce/apex/CapsaB2bInvoiceDetailController.getInvoiceDetail';

// Status → badge style (mirrors capsaB2bInvoiceList; see CSS)
const STATUS_BADGE = {
    Open: 'qbadge qbadge--open',
    Paid: 'qbadge qbadge--paid',
    Overdue: 'qbadge qbadge--overdue'
};

export default class CapsaB2bInvoiceDetails extends NavigationMixin(LightningElement) {

    // ── Design properties ───────────────────────────────────────────
    @api heading = 'Invoice Details';
    @api currencyCode = 'USD';
    // API name of the community page that hosts capsaB2bInvoiceList. Used for
    // the "Back to invoices" link. Leave blank to fall back to browser history.
    @api backPageApiName = '';

    // ── State ───────────────────────────────────────────────────────
    @track invoice;
    @track isLoading = false;
    @track hasLoaded = false;
    recordId;

    // The invoice id arrives as a URL query param (?invoiceId=<id>) set by the
    // list component's navigation. CurrentPageReference exposes it via state.
    @wire(CurrentPageReference)
    setPageReference(pageRef) {
        if (!pageRef) {
            return;
        }
        const state = pageRef.state || {};
        const id = state.invoiceId || state.recordId || state.c__invoiceId;
        if (id && id !== this.recordId) {
            this.recordId = id;
            this.loadInvoice();
        } else if (!id && !this.hasLoaded) {
            this.hasLoaded = true; // nothing to load → show empty state
        }
    }

    // ── Server fetch ────────────────────────────────────────────────
    async loadInvoice() {
        this.isLoading = true;
        try {
            const data = await getInvoiceDetail({ invoiceId: this.recordId });
            this.invoice = data
                ? { ...data, badgeClass: STATUS_BADGE[data.status] || 'qbadge qbadge--open' }
                : null;
        } catch (error) {
            this.invoice = null;
            // eslint-disable-next-line no-console
            console.error('getInvoiceDetail failed', error);
        } finally {
            this.isLoading = false;
            this.hasLoaded = true;
        }
    }

    // ── View-state getters ──────────────────────────────────────────
    get showSpinner() {
        return this.isLoading;
    }
    get showDetail() {
        return !this.isLoading && !!this.invoice;
    }
    get showEmpty() {
        return this.hasLoaded && !this.isLoading && !this.invoice;
    }

    // ── Navigation ──────────────────────────────────────────────────
    handleBack() {
        if (this.backPageApiName) {
            this[NavigationMixin.Navigate]({
                type: 'comm__namedPage',
                attributes: { name: this.backPageApiName }
            });
            return;
        }
        // eslint-disable-next-line no-restricted-globals
        if (typeof window !== 'undefined' && window.history) {
            window.history.back();
        }
    }
}
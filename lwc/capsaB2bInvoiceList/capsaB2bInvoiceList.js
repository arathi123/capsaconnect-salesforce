import { LightningElement, api, track, wire } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import { SessionContextAdapter } from 'commerce/contextApi';
import getInvoices from '@salesforce/apex/CapsaB2bInvoiceListController.getInvoices';

// Wait this long after the last keystroke before querying the server.
const SEARCH_DEBOUNCE_MS = 350;

// Status → badge style (see CSS)
const STATUS_BADGE = {
    Open: 'qbadge qbadge--open',
    Paid: 'qbadge qbadge--paid',
    Overdue: 'qbadge qbadge--overdue'
};

export default class CapsaB2bInvoiceList extends NavigationMixin(LightningElement) {

    // ── Design properties ───────────────────────────────────────────
    @api heading = 'Invoices';
    @api currencyCode = 'USD';
    @api pageSize = 10;
    // API name of the Experience Builder page that hosts capsaB2bInvoiceDetails
    // (the page whose URL is /invoice-details). Configurable so the same code
    // works across sandbox and production without hardcoding a URL path.
    @api detailPageApiName = 'Invoice_Details__c';

    // ── Search state ────────────────────────────────────────────────
    // Searching is server-side: the client only ever holds one page, so
    // filtering `rows` here would only ever search the page on screen.
    // `searchKey` is the term currently applied to the query; `searchDraft`
    // tracks what is in the input so the clear button can appear immediately.
    @track searchKey = '';
    @track searchDraft = '';
    searchTimer = null;

    // ── Filter / sort / paging state ────────────────────────────────
    @track filterType = 'all';
    @track sortBy = 'invoiceDate';
    @track sortDirection = 'desc';

    // Keyset (cursor) paging: pageCursors[i] = "after this id" for page i+1
    // (page 1 = null). Avoids SOQL OFFSET, which caps at 2000 rows.
    @track pageIndex = 0;
    pageCursors = [null];

    // ── Data / status flags ─────────────────────────────────────────
    @track rows = [];
    @track totalCount = 0;
    @track summary = { openBalance: 0, openCount: 0, pastDue: 0, paid90: 0 };
    @track isLoading = false;
    @track hasLoaded = false;

    isGuest = false;

    @wire(SessionContextAdapter)
    setSessionContext({ data }) {
        if (data) {
            this.isGuest = !!data.guestUser;
        }
    }

    connectedCallback() {
        this.loadInvoices();
    }

    disconnectedCallback() {
        clearTimeout(this.searchTimer);
    }

    // ── Server fetch ────────────────────────────────────────────────
    async loadInvoices() {
        if (this.isGuest) {
            this.hasLoaded = true;
            return;
        }
        this.isLoading = true;
        try {
            const res = await getInvoices({
                searchKey: this.searchKey || null,
                filterType: this.filterType,
                sortBy: this.sortBy,
                sortDirection: this.sortDirection,
                pageSize: this.pageSize,
                afterId: this.pageCursors[this.pageIndex] || null
            });
            this.rows = (res.rows || []).map((r) => this.decorateRow(r));
            this.totalCount = res.totalCount || 0;
            this.summary = res.summary || { openBalance: 0, openCount: 0, pastDue: 0, paid90: 0 };
        } catch (error) {
            this.rows = [];
            this.totalCount = 0;
            // eslint-disable-next-line no-console
            console.error('getInvoices failed', error);
        } finally {
            this.isLoading = false;
            this.hasLoaded = true;
        }
    }

    // Shapes a raw server row into the view model: status badge, Pay button
    // visibility, and the expandable "Items" state (collapsed by default).
    decorateRow(r, expanded = false) {
        const count = r.itemCount || 0;
        return {
            ...r,
            badgeClass: STATUS_BADGE[r.status] || 'qbadge qbadge--open',
            showPay: r.status === 'Open' || r.status === 'Overdue',
            itemCount: count,
            hasItems: count > 0,
            itemsLabel: `${count} ${count === 1 ? 'Item' : 'Items'}`,
            expanded,
            detailKey: `${r.id}-detail`,
            itemsBtnClass: expanded ? 'items-toggle items-toggle--open' : 'items-toggle',
            itemsAriaExpanded: expanded ? 'true' : 'false'
        };
    }

    // Toggle the inline line-item detail row for one invoice. Line items are
    // already in memory (fetched with the page), so expanding is instant.
    handleToggleItems(event) {
        event.stopPropagation();
        const id = event.currentTarget.dataset.id;
        this.rows = this.rows.map((row) =>
            row.id === id ? this.decorateRow(row, !row.expanded) : row
        );
    }

    // ── Search (server-side, debounced) ─────────────────────────────
    // The input is deliberately uncontrolled (no `value` binding): a re-render
    // between keystrokes would otherwise reset it to the last applied term.
    handleSearchInput(event) {
        this.searchDraft = event.target.value;
        clearTimeout(this.searchTimer);
        // eslint-disable-next-line @lwc/lwc/no-async-operation
        this.searchTimer = setTimeout(
            () => this.applySearch(this.searchDraft),
            SEARCH_DEBOUNCE_MS
        );
    }

    handleSearchKeydown(event) {
        if (event.key === 'Enter') {
            clearTimeout(this.searchTimer);
            this.applySearch(this.searchDraft);
        } else if (event.key === 'Escape' && this.searchDraft) {
            this.handleClearSearch();
        }
    }

    handleClearSearch() {
        clearTimeout(this.searchTimer);
        const input = this.template.querySelector('.search-input');
        if (input) {
            input.value = '';
            input.focus();
        }
        this.searchDraft = '';
        this.applySearch('');
    }

    applySearch(term) {
        const next = (term || '').trim();
        if (next === this.searchKey) {
            return; // nothing changed (e.g. trailing whitespace only)
        }
        this.searchKey = next;
        this.resetPaging();
        this.loadInvoices();
    }

    get hasSearchText() {
        return this.searchDraft.length > 0;
    }
    get isSearching() {
        return this.searchKey.length > 0;
    }
    get searchResultLabel() {
        const n = this.totalCount;
        return `${n} ${n === 1 ? 'result' : 'results'}`;
    }

    // ── Segmented filter (All / Open / Paid) ────────────────────────
    handleFilter(event) {
        const next = event.currentTarget.dataset.filter;
        if (!next || next === this.filterType) {
            return;
        }
        this.filterType = next;
        this.resetPaging();
        this.loadInvoices();
    }

    get allBtnClass() {
        return this.filterType === 'all' ? 'seg-btn seg-btn--active' : 'seg-btn';
    }
    get openBtnClass() {
        return this.filterType === 'open' ? 'seg-btn seg-btn--active' : 'seg-btn';
    }
    get paidBtnClass() {
        return this.filterType === 'paid' ? 'seg-btn seg-btn--active' : 'seg-btn';
    }

    // ── Summary card display values ─────────────────────────────────
    get openCountLabel() {
        const n = this.summary.openCount || 0;
        return `${n} ${n === 1 ? 'invoice' : 'invoices'}`;
    }

    // ── Sorting (server-side) ───────────────────────────────────────
    handleSort(event) {
        const column = event.currentTarget.dataset.column;
        if (!column) {
            return;
        }
        if (this.sortBy === column) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortBy = column;
            this.sortDirection = 'asc';
        }
        this.resetPaging();
        this.loadInvoices();
    }

    sortIcon(column) {
        if (this.sortBy !== column) {
            return '';
        }
        return this.sortDirection === 'asc' ? '▲' : '▼';
    }
    get sortIconNumber() { return this.sortIcon('invoiceNumber'); }
    get sortIconOrder() { return this.sortIcon('orderNumber'); }
    get sortIconInvDate() { return this.sortIcon('invoiceDate'); }
    get sortIconAmount() { return this.sortIcon('amount'); }
    get sortIconStatus() { return this.sortIcon('status'); }

    // ── Navigation / actions ────────────────────────────────────────
    handleInvoiceClick(event) {
        this.navigateToInvoice(event.currentTarget.dataset.id);
    }

    // Placeholder: navigate to the invoice record. Wire to a real payment
    // flow once confirmed.
    handlePay(event) {
        event.stopPropagation();
        this.navigateToInvoice(event.currentTarget.dataset.id);
    }

    handleDownloadPdf(event) {
        event.stopPropagation();
        const recordId = event.currentTarget.dataset.id;
        if (!recordId) {
            return;
        }
        // TODO: replace with your org's invoice PDF endpoint.
        this[NavigationMixin.Navigate]({
            type: 'standard__webPage',
            attributes: { url: `/apex/CapsaInvoicePdf?id=${recordId}` }
        });
    }

    navigateToInvoice(recordId) {
        if (!recordId) {
            return;
        }
        // Navigate to the custom Experience Builder page (/invoice-details) by
        // its API name and pass the invoice id as a URL param (?invoiceId=...).
        // Targeting the page's API name — not a hardcoded URL — keeps the link
        // working after a sandbox → production deployment.
        this[NavigationMixin.Navigate]({
            type: 'comm__namedPage',
            attributes: {
                name: this.detailPageApiName
            },
            state: {
                invoiceId: recordId
            }
        });
    }

    // ── Pagination (keyset / cursor) ────────────────────────────────
    resetPaging() {
        this.pageCursors = [null];
        this.pageIndex = 0;
    }

    get pageNumber() {
        return this.pageIndex + 1;
    }
    get totalPages() {
        return Math.max(1, Math.ceil(this.totalCount / this.pageSize));
    }
    get isFirstPage() {
        return this.pageIndex <= 0;
    }
    get isLastPage() {
        return this.pageNumber >= this.totalPages;
    }
    get showPagination() {
        return this.totalPages > 1;
    }
    get rangeStart() {
        return this.totalCount === 0 ? 0 : this.pageIndex * this.pageSize + 1;
    }
    get rangeEnd() {
        return Math.min(this.pageNumber * this.pageSize, this.totalCount);
    }
    get pageSummary() {
        return `${this.rangeStart}–${this.rangeEnd} of ${this.totalCount}`;
    }

    handlePrev() {
        if (this.isFirstPage) return;
        this.pageIndex -= 1;
        this.loadInvoices();
    }
    handleNext() {
        if (this.isLastPage) return;
        // Cursor for the next page = id of the last row currently shown.
        const lastId = this.rows.length ? this.rows[this.rows.length - 1].id : null;
        if (!lastId) return;
        this.pageCursors = this.pageCursors.slice(0, this.pageIndex + 1);
        this.pageCursors.push(lastId);
        this.pageIndex += 1;
        this.loadInvoices();
    }

    // ── View-state getters ──────────────────────────────────────────
    get showSpinner() {
        return this.isLoading;
    }
    // The table stays mounted while a search/sort/page request is in flight —
    // the spinner overlays it — so the search input never loses focus.
    get showTable() {
        return this.rows.length > 0;
    }
    get showToolbar() {
        return !this.isGuest;
    }
    get showEmptyState() {
        return this.hasLoaded && !this.isLoading && this.rows.length === 0 && !this.isGuest;
    }
    get showGuestState() {
        return this.hasLoaded && this.isGuest;
    }
    get emptyTitle() {
        return this.isSearching ? 'No matching invoices' : 'No invoices found';
    }
    get emptyText() {
        return this.isSearching
            ? 'No invoice or order number matches your search. Try a different term.'
            : 'There are no invoices for this filter.';
    }
}
import { LightningElement, api, track, wire } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import { SessionContextAdapter } from 'commerce/contextApi';
import { refreshCartSummary } from 'commerce/cartApi';
import getQuotes from '@salesforce/apex/CapsaB2bQuoteListController.getQuotes';
import reorderQuote from '@salesforce/apex/CapsaB2bQuoteReorderController.reorderQuote';

// Wait this long after the last keystroke before querying the server.
const SEARCH_DEBOUNCE_MS = 350;

// Derived status → badge style (see CSS)
const STATUS_BADGE = {
    Won: 'qbadge qbadge--won',
    Lost: 'qbadge qbadge--lost',
    Expired: 'qbadge qbadge--expired',
    Open: 'qbadge qbadge--open'
};

export default class CapsaB2bQuoteList extends NavigationMixin(LightningElement) {

    // ── Design properties (configurable in Experience Builder) ──────
    @api breadcrumbRoot = 'Capsa Connect';
    @api breadcrumbParent = 'Account';
    @api heading = 'Quotes';
    @api currencyCode = 'USD';
    @api pageSize = 10;
    // API name of the Experience Builder page hosting capsaB2bQuoteDetails
    // (URL /quote-details). Configurable so the link survives sandbox → prod.
    @api detailPageApiName = 'Quote_Details__c';

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
    @track sortBy = 'createdDate';
    @track sortDirection = 'desc';

    // Keyset (cursor) paging: pageCursors[i] is the "after this id" boundary for
    // page i+1 (page 1 = null). Avoids SOQL OFFSET, which caps at 2000 rows and
    // was leaving Next with a spinner but no rows on large result sets.
    @track pageIndex = 0;
    pageCursors = [null];

    // ── Data / status flags ─────────────────────────────────────────
    @track rows = [];
    @track totalCount = 0;
    @track isLoading = false;
    @track hasLoaded = false;

    // ── Reorder / add-to-cart state ─────────────────────────────────
    @track addingId = null;          // quote id currently being reordered
    @track reorderMsg = null;        // failure banner message (null = hidden)
    @track reorderKind = 'error';    // warning | error
    @track skippedLines = [];        // lines that could not be reordered

    isGuest = false;

    @wire(SessionContextAdapter)
    setSessionContext({ data }) {
        if (data) {
            this.isGuest = !!data.guestUser;
        }
    }

    connectedCallback() {
        this.loadQuotes();
    }

    disconnectedCallback() {
        clearTimeout(this.searchTimer);
    }

    // ── Server fetch ────────────────────────────────────────────────
    async loadQuotes() {
        if (this.isGuest) {
            this.hasLoaded = true;
            return;
        }
        this.isLoading = true;
        try {
            const res = await getQuotes({
                searchKey: this.searchKey || null,
                filterType: this.filterType,
                sortBy: this.sortBy,
                sortDirection: this.sortDirection,
                pageSize: this.pageSize,
                afterId: this.pageCursors[this.pageIndex] || null
            });
            this.rows = (res.rows || []).map((r) => ({
                ...r,
                badgeClass: STATUS_BADGE[r.status] || 'qbadge qbadge--open'
            }));
            this.totalCount = res.totalCount || 0;
        } catch (error) {
            this.rows = [];
            this.totalCount = 0;
            // Errors are rare here (system-mode read); fail to the empty state.
            // eslint-disable-next-line no-console
            console.error('getQuotes failed', error);
        } finally {
            this.isLoading = false;
            this.hasLoaded = true;
        }
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
        this.loadQuotes();
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

    // ── Segmented filter (All / Open / Closed) ──────────────────────
    handleFilter(event) {
        const next = event.currentTarget.dataset.filter;
        if (!next || next === this.filterType) {
            return;
        }
        this.filterType = next;
        this.resetPaging();
        this.loadQuotes();
    }

    get allBtnClass() {
        return this.filterType === 'all' ? 'seg-btn seg-btn--active' : 'seg-btn';
    }
    get openBtnClass() {
        return this.filterType === 'open' ? 'seg-btn seg-btn--active' : 'seg-btn';
    }
    get closedBtnClass() {
        return this.filterType === 'closed' ? 'seg-btn seg-btn--active' : 'seg-btn';
    }

    get isAllActive() { return this.filterType === 'all'; }
    get isOpenActive() { return this.filterType === 'open'; }
    get isClosedActive() { return this.filterType === 'closed'; }

    get breadcrumbLabel() {
        return `${this.breadcrumbRoot} / ${this.breadcrumbParent}`;
    }

    // ── Sorting (server-side, subtle indicators) ────────────────────
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
        this.loadQuotes();
    }

    sortIcon(column) {
        if (this.sortBy !== column) {
            return '';
        }
        return this.sortDirection === 'asc' ? '▲' : '▼';
    }
    get sortIconQuote() { return this.sortIcon('quoteNumber'); }
    get sortIconName() { return this.sortIcon('name'); }
    get sortIconCreated() { return this.sortIcon('createdDate'); }
    get sortIconValid() { return this.sortIcon('validUntil'); }
    get sortIconAmount() { return this.sortIcon('amount'); }
    get sortIconStatus() { return this.sortIcon('status'); }

    // ── Navigation / actions ────────────────────────────────────────
    handleQuoteClick(event) {
        this.navigateToQuote(event.currentTarget.dataset.id);
    }

    // Reorder: validate the quote's products are sellable for this buyer, then
    // add the sellable ones to the current cart (server does the validation).
    async handleAddToCart(event) {
        event.stopPropagation();
        const quoteId = event.currentTarget.dataset.id;
        if (!quoteId || this.addingId) {
            return; // ignore double-clicks / a reorder already in flight
        }

        this.addingId = quoteId;
        this.reorderMsg = null;
        try {
            const res = await reorderQuote({ quoteId });
            if (res && res.addedCount > 0) {
                // Items added → refresh the cart badge and redirect to the cart.
                try {
                    await refreshCartSummary();
                } catch (e) {
                    // Badge refresh is non-critical; the item is already in the cart.
                }
                this.handleGoToCart();
                return;
            }
            // Nothing could be added → stay on the page and explain why.
            this.showReorderFailure(res);
        } catch (error) {
            this.reorderKind = 'error';
            this.skippedLines = [];
            this.reorderMsg = this.readError(error);
        } finally {
            this.addingId = null;
        }
    }

    showReorderFailure(res) {
        this.skippedLines = ((res && res.skipped) || []).map((s) => ({
            key: s.productId,
            productName: s.productName,
            reason: s.reason
        }));
        if (this.skippedLines.length > 0) {
            this.reorderKind = 'error';
            this.reorderMsg = 'None of the items on this quote can be reordered right now.';
        } else {
            this.reorderKind = 'warning';
            this.reorderMsg = 'This quote has no items to reorder.';
        }
    }

    readError(error) {
        return error && error.body && error.body.message
            ? error.body.message
            : 'Something went wrong. Please try again.';
    }

    handleGoToCart() {
        this[NavigationMixin.Navigate]({
            type: 'comm__namedPage',
            attributes: { name: 'Current_Cart' }
        });
    }

    dismissReorder() {
        this.reorderMsg = null;
        this.skippedLines = [];
    }

    // Rows decorated with per-row reorder state (spinner / disabled button).
    get displayRows() {
        return this.rows.map((r) => ({
            ...r,
            adding: r.id === this.addingId,
            addBtnLabel: r.id === this.addingId ? 'Adding…' : 'Add to cart'
        }));
    }

    get hasSkipped() {
        return this.skippedLines.length > 0;
    }

    get reorderBannerClass() {
        return `reorder-banner reorder-banner--${this.reorderKind}`;
    }

    navigateToQuote(recordId) {
        if (!recordId) {
            return;
        }
        // Open the custom Experience Builder page (/quote-details) by API name
        // and pass the quote id as a URL param (?quoteId=...). Targeting the
        // page's API name — not a hardcoded URL — keeps the link working after
        // a sandbox → production deployment.
        this[NavigationMixin.Navigate]({
            type: 'comm__namedPage',
            attributes: {
                name: this.detailPageApiName
            },
            state: {
                quoteId: recordId
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
        this.loadQuotes();
    }
    handleNext() {
        if (this.isLastPage) return;
        // Cursor for the next page = id of the last row currently shown.
        const lastId = this.rows.length ? this.rows[this.rows.length - 1].id : null;
        if (!lastId) return;
        this.pageCursors = this.pageCursors.slice(0, this.pageIndex + 1);
        this.pageCursors.push(lastId);
        this.pageIndex += 1;
        this.loadQuotes();
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
        return this.isSearching ? 'No matching quotes' : 'No quotes found';
    }
    get emptyText() {
        return this.isSearching
            ? 'No quote number or description matches your search. Try a different term.'
            : 'There are no quotes for this filter.';
    }
}
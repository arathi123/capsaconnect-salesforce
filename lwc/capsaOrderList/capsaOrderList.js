import { LightningElement, api, track } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import getOrders from '@salesforce/apex/CapsaOrderListController.getOrders';
import { recordRef } from 'c/capsaNav';

const ORDER_SUMMARY_OBJECT = 'OrderSummary';

// Wait this long after the last keystroke before querying the server.
const SEARCH_DEBOUNCE_MS = 350;

export default class CapsaOrderList extends NavigationMixin(LightningElement) {
    @api heading = 'Orders';
    @api pageSize = 10;

    // ── Search state ────────────────────────────────────────────────
    // Search, sort, the tab filter and paging are all server-side. The client
    // only ever holds one page, so filtering `rows` here would only ever search
    // the page on screen — and the old "fetch up to 1000 rows and filter in the
    // browser" approach silently dropped everything past the 1000th order.
    // `searchKey` is the term currently applied to the query; `searchDraft`
    // tracks what is in the input so the clear button can appear immediately.
    @track searchKey = '';
    @track searchDraft = '';
    searchTimer = null;

    // ── Filter / sort / paging state ────────────────────────────────
    @track activeTab = 'all';
    @track sortBy = 'orderedDate';
    @track sortDirection = 'desc';

    // Keyset (cursor) paging: pageCursors[i] = "after this id" for page i+1
    // (page 1 = null). Avoids SOQL OFFSET, which caps at 2000 rows.
    @track pageIndex = 0;
    pageCursors = [null];

    // ── Data / status flags ─────────────────────────────────────────
    @track rows = [];
    @track totalCount = 0;
    @track loading = true;
    @track hasLoaded = false;
    @track error;

    // OrderSummary id -> generated href (built via NavigationMixin so it is
    // correct in any org and supports open-in-new-tab).
    @track urlById = {};

    connectedCallback() {
        this.loadOrders();
    }

    disconnectedCallback() {
        clearTimeout(this.searchTimer);
    }

    // ── Server fetch ────────────────────────────────────────────────
    async loadOrders() {
        this.loading = true;
        try {
            const res = await getOrders({
                searchKey: this.searchKey || null,
                filterType: this.activeTab,
                sortBy: this.sortBy,
                sortDirection: this.sortDirection,
                pageSize: this.pageSize,
                afterId: this.pageCursors[this.pageIndex] || null
            });
            this.rows = res.rows || [];
            this.totalCount = res.totalCount || 0;
            this.error = undefined;
            this.generateUrls();
        } catch (error) {
            this.error = error;
            this.rows = [];
            this.totalCount = 0;
        } finally {
            this.loading = false;
            this.hasLoaded = true;
        }
    }

    // Build environment-independent hrefs for the current page's orders.
    generateUrls() {
        this.rows.forEach((r) => {
            if (!r.orderSummaryId || this.urlById[r.orderSummaryId]) {
                return;
            }
            this[NavigationMixin.GenerateUrl](
                recordRef(r.orderSummaryId, ORDER_SUMMARY_OBJECT)
            )
                .then((url) => {
                    this.urlById = { ...this.urlById, [r.orderSummaryId]: url };
                })
                .catch(() => {
                    // GenerateUrl failed — the click handler still navigates by id.
                });
        });
    }

    get displayRows() {
        return this.rows.map((r) => ({
            ...r,
            dateText: this.formatDate(r.orderedDate),
            totalText: this.formatCurrency(r.total),
            itemsText: `${r.units} units · ${r.products} products`,
            badgeClass: this.badgeClass(r.status),
            url: this.urlById[r.orderSummaryId] || '#'
        }));
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
        this.loadOrders();
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

    // ── Tabs (All / Active / History) ───────────────────────────────
    handleTab(event) {
        const next = event.currentTarget.dataset.tab;
        if (!next || next === this.activeTab) {
            return;
        }
        this.activeTab = next;
        this.resetPaging();
        this.loadOrders();
    }

    tabClass(tab) {
        return this.activeTab === tab ? 'tab tab--selected' : 'tab';
    }
    get allClass() {
        return this.tabClass('all');
    }
    get activeClass() {
        return this.tabClass('active');
    }
    get historyClass() {
        return this.tabClass('history');
    }

    // ── Sorting (server-side) ───────────────────────────────────────
    // "Items" is a per-row aggregate of the order's line items, so there is no
    // field to sort it by; it is the one column left non-sortable.
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
        this.loadOrders();
    }

    sortIcon(column) {
        if (this.sortBy !== column) {
            return '';
        }
        return this.sortDirection === 'asc' ? '▲' : '▼';
    }
    get sortIconOrder() {
        return this.sortIcon('orderNumber');
    }
    get sortIconDate() {
        return this.sortIcon('orderedDate');
    }
    get sortIconTotal() {
        return this.sortIcon('total');
    }
    get sortIconStatus() {
        return this.sortIcon('status');
    }

    sortAria(column) {
        if (this.sortBy !== column) {
            return 'none';
        }
        return this.sortDirection === 'asc' ? 'ascending' : 'descending';
    }
    get ariaSortOrder() {
        return this.sortAria('orderNumber');
    }
    get ariaSortDate() {
        return this.sortAria('orderedDate');
    }
    get ariaSortTotal() {
        return this.sortAria('total');
    }
    get ariaSortStatus() {
        return this.sortAria('status');
    }

    // ── Navigation ──────────────────────────────────────────────────
    handleOrderClick(event) {
        event.preventDefault();
        const { id } = event.currentTarget.dataset;
        if (!id) return;
        this[NavigationMixin.Navigate](recordRef(id, ORDER_SUMMARY_OBJECT));
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
        this.loadOrders();
    }
    handleNext() {
        if (this.isLastPage) return;
        // Cursor for the next page = id of the last row currently shown.
        const lastId = this.rows.length
            ? this.rows[this.rows.length - 1].orderSummaryId
            : null;
        if (!lastId) return;
        this.pageCursors = this.pageCursors.slice(0, this.pageIndex + 1);
        this.pageCursors.push(lastId);
        this.pageIndex += 1;
        this.loadOrders();
    }

    // ── View-state getters ──────────────────────────────────────────
    get showCard() {
        return !this.error;
    }
    // The table stays mounted while a search/sort/page request is in flight —
    // the spinner overlays it — so the search input never loses focus.
    get hasRows() {
        return this.rows.length > 0;
    }
    get showEmpty() {
        return this.hasLoaded && !this.loading && !this.error && this.rows.length === 0;
    }
    get emptyTitle() {
        return this.isSearching ? 'No matching orders' : 'No orders to show';
    }
    get emptyText() {
        return this.isSearching
            ? 'No order or PO number matches your search. Try a different term.'
            : 'Orders you place will appear here.';
    }

    formatDate(dt) {
        if (!dt) return '';
        return new Date(dt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    }

    formatCurrency(val) {
        if (val === null || val === undefined) return '';
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0
        }).format(val);
    }

    badgeClass(status) {
        const s = (status || '').toLowerCase();
        if (s.includes('deliver')) return 'badge badge--green';
        if (s.includes('ship')) return 'badge badge--amber';
        if (s.includes('pending')) return 'badge badge--amber';
        if (s.includes('process')) return 'badge badge--blue';
        if (s.includes('cancel')) return 'badge badge--red';
        return 'badge badge--gray';
    }
}
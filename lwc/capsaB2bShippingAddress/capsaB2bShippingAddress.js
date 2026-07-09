import { wire, track, LightningElement } from "lwc";
import {CheckoutInformationAdapter, useCheckoutComponent,
        createContactPointAddress, updateContactPointAddress} from 'commerce/checkoutApi';
import { SessionContextAdapter } from 'commerce/contextApi';
import CapsaB2bShippingAddressModal from 'c/capsaB2bShippingAddressModal';
import getAddresses from '@salesforce/apex/CapsaB2bShippingAddressController.getAddresses';
import invalidateAddressCache from '@salesforce/apex/CapsaB2bShippingAddressController.invalidateAddressCache';

const AddressTypes = { SHIPPING: 'Shipping' };

const CheckoutStage = {
    CHECK_VALIDITY_UPDATE: 'CHECK_VALIDITY_UPDATE',
    REPORT_VALIDITY_SAVE: 'REPORT_VALIDITY_SAVE'
};

const SHIPPING_ADDRESS_GROUP_CODE = 'ShippingAddress';

export default class CapsaB2bShippingAddress extends useCheckoutComponent(LightningElement) {

    @track allAddresses = [];        // full dataset — source of truth
    @track filteredAddresses = [];   // current view — recomputed only on search change
    @track selectedRows = [];
    @track isSummary = false;
    @track showError = false;
    @track errorMessage = '';

    // ── Pagination state ──────────────────────────────────────
    @track currentPage = 1;
    @track pageSize = 10;
    @track gotoPage = 1;
    @track selectedAddressId = null;
    // totalCount / totalPages are derived getters (see below)

    // ── Search state ──────────────────────────────────────────
    @track searchTerm = '';
    searchColumn = 'name';           // not reactive; read inside _applyFilter
    _addressById = new Map();        // O(1) id lookups
    _searchTimer;

    workingAddress = {};
    sessionContext;
    accountId;

    deliveryAddressLoaded = false;

    @track isPreview = false;

    connectedCallback() {
        this.isPreview = this.isInSitePreview();
    }

    isInSitePreview() {
        let url = document.URL;
        return (url.indexOf('sitepreview') > 0
            || url.indexOf('livepreview') > 0
            || url.indexOf('live-preview') > 0
            || url.indexOf('live.') > 0
            || url.indexOf('.builder.') > 0);
    }

    // ─── Wire: get session context ──────────────────────────
    @wire(SessionContextAdapter)
    setSessionContext({ data }) {
        if (data) this.sessionContext = data;
    }

    // ─── Wire: get current checkout state ──────────────────
    @wire(CheckoutInformationAdapter, {})
    checkoutInfo({ data }) {
        if (this.isPreview) return;
        if (data && data.checkoutStatus === 200) {
            this.workingAddress = data.deliveryGroups.items[0]?.deliveryAddress || {};
            this.deliveryAddressLoaded = true;

            // Extract accountId and load all addresses once via Apex cursor
            const newAccountId = data.cartSummary?.accountId;
            if (newAccountId && newAccountId !== this.accountId) {
                this.accountId = newAccountId;
                this.loadAllAddresses();
            } else if (this.allAddresses.length > 0) {
                this.syncSelection();
            }
        }
    }

    // ─── Load ALL addresses once by draining the Apex cursor ────
    //  The server-side cursor is session-cached, so the SOQL runs
    //  only on the first fetch; each subsequent page is a cheap
    //  cursor.fetch with no extra query. After this, search and
    //  pagination are pure client-side (zero Apex round-trips).
    async loadAllAddresses() {
        if (!this.accountId) return;
        try {
            const FETCH_SIZE = 200;
            let page = 1;
            let total = Infinity;
            let collected = [];
            while (collected.length < total) {
                const res = await getAddresses({
                    accountId: this.accountId,
                    pageNumber: page,
                    pageSize: FETCH_SIZE
                });
                const batch = res.addresses || [];
                collected = collected.concat(batch);
                total = (res.totalCount !== undefined && res.totalCount !== null)
                    ? res.totalCount
                    : collected.length;
                if (batch.length === 0) break;   // safety: avoid infinite loop
                page++;
            }
            this.allAddresses = collected;
            this._addressById = new Map(collected.map(a => [a.addressId, a]));
            this._applyFilter();                 // populates filteredAddresses
            this.showError = false;
            this.syncSelection();
        } catch (error) {
            console.error('loadAllAddresses error', error);
            this.showErrorMsg('Failed to load addresses.');
        }
    }

    // ─── Apply current search filter (prefix match, case-insensitive) ──
    //  Runs ONLY when the search term/column changes — never inside a
    //  getter — so the full-array scan stays off the render path.
    _applyFilter() {
        const term = this.searchTerm.trim().toLowerCase();
        if (!term) {
            this.filteredAddresses = this.allAddresses;   // reference, no scan
        } else {
            const col = this.searchColumn;
            this.filteredAddresses = this.allAddresses.filter(
                a => (a[col] || '').toLowerCase().startsWith(term)
            );
        }
        this.currentPage = 1;
    }

    // ─── Search handlers ────────────────────────────────────────
    handleSearchTermChange(event) {
        this.searchTerm = event.target.value;             // cheap, keeps input controlled
        clearTimeout(this._searchTimer);
        this._searchTimer = setTimeout(() => this._applyFilter(), 200);  // debounce the scan
    }

    handleSearchColumnChange(event) {
        this.searchColumn = event.target.value;
        if (this.searchTerm.trim()) this._applyFilter();  // re-filter on column switch
    }

    handleClearSearch() {
        clearTimeout(this._searchTimer);
        this.searchTerm = '';
        this._applyFilter();
    }

    get hasSearchTerm() {
        return !!this.searchTerm;
    }

    // ─── Aspect handler ─────────────────────────────────────
    setAspect(newAspect) {
        this.isSummary = newAspect?.summary || false;
    }

    // ─── Match delivery address to a saved one ──────────────
    syncSelection() {
        if (this.deliveryAddressLoaded && this.allAddresses.length > 0) {
            const match = this.allAddresses.find(a =>
                a.street === this.workingAddress.street &&
                a.city === this.workingAddress.city &&
                a.postalCode === this.workingAddress.postalCode
            );
            if (match) {
                this.selectedRows = [match.addressId];
                this.selectedAddressId = match.addressId;
            } else {
                this.selectedRows = [];
                this.selectedAddressId = null;
            }
        }
    }

    // ─── Checkbox / row click from custom table ─────────────
    async handleCheckboxChange(event) {
        const id = event.target.dataset.id;
        await this._selectById(id);
    }

    async handleRowClick(event) {
        const id = event.currentTarget.dataset.id;
        await this._selectById(id);
    }

    async _selectById(id) {
        if (!id || this.selectedAddressId === id) return;
        const selected = this._addressById.get(id);
        if (!selected) return;
        this.workingAddress = { ...selected };
        this.selectedRows = [id];
        this.selectedAddressId = id;
        await this.pushAddressToCart(this.workingAddress);
    }

    // ─── User selects a row (kept for backward compat) ──────
    async handleRowSelection(event) {
        const selectedId = event.detail.selectedRows[0]?.addressId;
        if (!selectedId) return;

        const selected = this._addressById.get(selectedId);
        if (!selected) return;

        this.workingAddress = { ...selected };
        this.selectedRows = [selectedId];
        this.selectedAddressId = selectedId;

        await this.pushAddressToCart(this.workingAddress);
    }

    // ─── Edit button click from custom table row ─────────────
    async handleEditClick(event) {
        event.stopPropagation();
        const id = event.currentTarget.dataset.id;
        const row = this._addressById.get(id);
        if (!row) return;
        await this.handleRowAction({
            detail: { action: { name: 'edit' }, row: { ...row } }
        });
    }

    // ─── Edit row action ─────────────────────────────────────
    async handleRowAction(event) {
        const actionName = event.detail.action.name;
        const row = event.detail.row;

        if (actionName === 'edit') {
            const updated = await CapsaB2bShippingAddressModal.open({
                size: 'small',
                label: 'Edit Shipping Address',
                address: { ...row }
            });

            if (updated?.changed) {
                const updatedAddress = { ...row, ...updated.address };
                try {
                    await updateContactPointAddress(updatedAddress);
                    if (row.addressId === this.workingAddress.addressId) {
                        this.workingAddress = updatedAddress;
                        await this.pushAddressToCart(this.workingAddress);
                    }
                    // Invalidate cache and reload — address data changed
                    await this._refreshAfterChange();
                } catch (error) {
                    this.showErrorMsg('Failed to update address.');
                }
            }
        }
    }

    // ─── Add new address ─────────────────────────────────────
    async handleAddNew() {
        const result = await CapsaB2bShippingAddressModal.open({
            size: 'small',
            label: 'Add Shipping Address',
            address: {}
        });

        if (result?.changed) {
            try {
                this.workingAddress = { ...result.address };
                if (!this.sessionContext?.guestUser) {
                    await createContactPointAddress({
                        ...this.workingAddress,
                        addressType: AddressTypes.SHIPPING
                    });
                }
                await this.pushAddressToCart(this.workingAddress);
                // Invalidate cache and reload — new address added
                await this._refreshAfterChange();
            } catch (error) {
                this.showErrorMsg('Failed to add address.');
            }
        }
    }

    // ─── Invalidate cursor cache and reload the full dataset ────
    async _refreshAfterChange() {
        try {
            await invalidateAddressCache();
        } catch (e) {
            // Cache might not be configured — safe to ignore
        }
        await this.loadAllAddresses();
    }

    // ─── Push address to cart ────────────────────────────────
    async pushAddressToCart(address) {
        try {
            await this.dispatchUpdateAsync({
                defaultDeliveryGroup: { deliveryAddress: address }
            });
            this.dispatchCommit();
            this.showError = false;
        } catch (error) {
            this.showErrorMsg('Failed to update delivery address.');
        }
    }

    // ─── Stage actions ───────────────────────────────────────
    stageAction(checkoutStage) {
        switch (checkoutStage) {
            case CheckoutStage.CHECK_VALIDITY_UPDATE:
                return Promise.resolve(this.checkValidity());
            case CheckoutStage.REPORT_VALIDITY_SAVE:
                return Promise.resolve(this.reportValidity());
            default:
                return Promise.resolve(true);
        }
    }

    checkValidity() {
        const a = this.workingAddress;
        return Boolean(a.street && a.city && a.region && a.postalCode && a.country);
    }

    reportValidity() {
        if (this.checkValidity()) return true;
        this.dispatchUpdateErrorAsync({
            groupId: SHIPPING_ADDRESS_GROUP_CODE,
            type: '/commerce/errors/checkout-failure',
            exception: 'Please select a shipping address.'
        });
        return false;
    }

    showErrorMsg(msg) {
        this.showError = true;
        this.errorMessage = msg;
    }

    // ══════════════════════════════════════════════════════════
    //  PAGINATION — client-side over the filtered dataset
    // ══════════════════════════════════════════════════════════

    get totalCount() {
        return this.filteredAddresses.length;
    }

    get totalPages() {
        return Math.max(1, Math.ceil(this.totalCount / this.pageSize));
    }

    get isFirstPage() {
        return this.currentPage <= 1;
    }

    get isLastPage() {
        return this.currentPage >= this.totalPages;
    }

    get itemRangeStart() {
        if (!this.totalCount) return 0;
        return (this.currentPage - 1) * this.pageSize + 1;
    }

    get itemRangeEnd() {
        return Math.min(this.currentPage * this.pageSize, this.totalCount);
    }

    get pagedAddresses() {
        const start = (this.currentPage - 1) * this.pageSize;
        const selId = this.selectedAddressId;
        return this.filteredAddresses
            .slice(start, start + this.pageSize)
            .map(addr => ({
                ...addr,
                isSelected: addr.addressId === selId,
                rowClass: addr.addressId === selId ? 'selected' : ''
            }));
    }

    get pageButtons() {
        const total = this.totalPages;
        const cur = this.currentPage;
        const buttons = [];

        const addBtn = (page) => ({
            key: `pg-${page}`,
            page,
            isEllipsis: false,
            btnClass: page === cur ? 'pg-btn active' : 'pg-btn'
        });
        const addEllipsis = (key) => ({ key, isEllipsis: true });

        if (total <= 9) {
            for (let i = 1; i <= total; i++) { buttons.push(addBtn(i)); }
        } else {
            buttons.push(addBtn(1));
            if (cur > 4) { buttons.push(addEllipsis('e1')); }
            const start = Math.max(2, cur - 2);
            const end = Math.min(total - 1, cur + 2);
            for (let i = start; i <= end; i++) { buttons.push(addBtn(i)); }
            if (cur < total - 3) { buttons.push(addEllipsis('e2')); }
            buttons.push(addBtn(total));
        }
        return buttons;
    }

    get proceedDisabled() {
        return !this.selectedAddressId;
    }

    // ── Handlers — client-side page changes, no Apex calls ────

    handleFirst() {
        if (this.isFirstPage) return;
        this.currentPage = 1;
    }

    handlePrev() {
        if (this.isFirstPage) return;
        this.currentPage -= 1;
    }

    handleNext() {
        if (this.isLastPage) return;
        this.currentPage += 1;
    }

    handleLast() {
        if (this.isLastPage) return;
        this.currentPage = this.totalPages;
    }

    handlePageClick(event) {
        const page = parseInt(event.target.dataset.page, 10);
        if (isNaN(page) || page === this.currentPage) return;
        this.currentPage = page;
    }

    handleGotoChange(event) {
        this.gotoPage = parseInt(event.target.value, 10);
    }

    handleGoto() {
        const target = this.gotoPage;
        if (!target || target < 1 || target === this.currentPage) return;
        // Clamp client-side: never exceed the available page count
        this.currentPage = Math.min(Math.max(1, target), this.totalPages);
    }

    handlePageSizeChange(event) {
        const newSize = parseInt(event.target.value, 10);
        if (!newSize || newSize < 1) return;
        this.pageSize = newSize;
    }

    handlePageSizeApply() {
        this.currentPage = 1;
    }
}
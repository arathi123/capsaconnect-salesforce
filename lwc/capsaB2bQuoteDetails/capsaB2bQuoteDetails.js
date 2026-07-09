import { LightningElement, api, track, wire } from 'lwc';
import { NavigationMixin, CurrentPageReference } from 'lightning/navigation';
import { refreshCartSummary } from 'commerce/cartApi';
import COMMUNITY_BASE_PATH from '@salesforce/community/basePath';
import getQuoteDetail from '@salesforce/apex/CapsaB2bQuoteDetailController.getQuoteDetail';
import addLinesToCart from '@salesforce/apex/CapsaB2bQuoteReorderController.addLinesToCart';

// Derived status → badge style (mirrors capsaB2bQuoteList; see CSS)
const STATUS_BADGE = {
    Won: 'qbadge qbadge--won',
    Lost: 'qbadge qbadge--lost',
    Expired: 'qbadge qbadge--expired',
    Open: 'qbadge qbadge--open'
};

export default class CapsaB2bQuoteDetails extends NavigationMixin(LightningElement) {

    // ── Design properties ───────────────────────────────────────────
    @api heading = 'Quote Details';
    @api currencyCode = 'USD';
    // API name of the community page hosting capsaB2bQuoteList ("Back" link).
    @api backPageApiName = '';
    // API name of the cart page to open after items are added.
    @api cartPageApiName = 'Current_Cart';

    // ── State ───────────────────────────────────────────────────────
    @track quote;
    @track lines = [];
    @track isLoading = false;
    @track hasLoaded = false;
    @track isAdding = false;

    // Baseline captured at load so the bottom totals can move with the edited
    // line quantities while preserving the quote's tax/shipping/discounts.
    baseSubtotal = 0;
    baseGrandTotal = 0;

    // Add-to-cart result banner (mirrors the list's reorder feedback)
    @track reorderMsg = null;
    @track reorderKind = 'error'; // warning | error
    @track skippedLines = [];

    recordId;

    // Quote id arrives as ?quoteId=<id> via the list's navigation state.
    @wire(CurrentPageReference)
    setPageReference(pageRef) {
        if (!pageRef) {
            return;
        }
        const state = pageRef.state || {};
        const id = state.quoteId || state.recordId || state.c__quoteId;
        if (id && id !== this.recordId) {
            this.recordId = id;
            this.loadQuote();
        } else if (!id && !this.hasLoaded) {
            this.hasLoaded = true;
        }
    }

    // ── Server fetch ────────────────────────────────────────────────
    async loadQuote() {
        this.isLoading = true;
        try {
            const data = await getQuoteDetail({ quoteId: this.recordId });
            if (data) {
                this.quote = this.decorateQuote(data);
                this.lines = (data.lines || []).map((l) => this.decorateLine(l));
                // Baseline: subtotal = sum of the original line totals; grand
                // total = the quote's stored grand total (or subtotal + tax +
                // shipping when it isn't stored). Live totals shift from here.
                this.baseSubtotal = this.lines.reduce((s, l) => s + (l.lineTotal || 0), 0);
                this.baseGrandTotal = data.grandTotal != null
                    ? data.grandTotal
                    : this.baseSubtotal + (data.tax || 0) + (data.shippingHandling || 0);
            } else {
                this.quote = null;
                this.lines = [];
            }
        } catch (error) {
            this.quote = null;
            this.lines = [];
            // eslint-disable-next-line no-console
            console.error('getQuoteDetail failed', error);
        } finally {
            this.isLoading = false;
            this.hasLoaded = true;
        }
    }

    decorateQuote(data) {
        return {
            ...data,
            badgeClass: STATUS_BADGE[data.status] || 'qbadge qbadge--open',
            hasAccount: !!data.accountName,
            hasEmail: !!data.email,
            hasStatus: !!data.status,
            hasDescription: !!data.description,
            hasSubtotal: data.subtotal != null,
            hasTax: data.tax != null,
            hasShipping: data.shippingHandling != null,
            hasGrandTotal: data.grandTotal != null
        };
    }

    decorateLine(l) {
        const qty = l.quantity && l.quantity >= 1 ? Math.round(l.quantity) : 1;
        const unit = l.unitPrice || 0;
        return {
            id: l.id,
            productId: l.productId,
            productName: l.productName,
            productCode: l.productCode,
            unitPrice: unit,
            quantity: qty,
            lineTotal: unit * qty,
            hasImage: !!l.imageContentKey,
            imageUrl: l.imageContentKey
                ? `${COMMUNITY_BASE_PATH}/sfsites/c/cms/delivery/media/${l.imageContentKey}`
                : null
        };
    }

    // ── Quantity steppers ───────────────────────────────────────────
    handleDecrement(event) {
        this.changeQty(event.currentTarget.dataset.id, -1);
    }
    handleIncrement(event) {
        this.changeQty(event.currentTarget.dataset.id, 1);
    }
    handleQtyInput(event) {
        const value = parseInt(event.target.value, 10);
        this.setQty(event.currentTarget.dataset.id, Number.isNaN(value) ? 1 : value);
    }

    changeQty(id, delta) {
        const line = this.lines.find((l) => l.id === id);
        if (line) {
            this.setQty(id, line.quantity + delta);
        }
    }

    setQty(id, nextQty) {
        const q = nextQty < 1 ? 1 : Math.round(nextQty);
        this.lines = this.lines.map((l) =>
            l.id === id ? { ...l, quantity: q, lineTotal: l.unitPrice * q } : l
        );
    }

    // Hide a broken CMS image and fall back to the placeholder.
    handleImageError(event) {
        const id = event.currentTarget.dataset.id;
        this.lines = this.lines.map((l) =>
            l.id === id ? { ...l, hasImage: false, imageUrl: null } : l
        );
    }

    // ── Add to cart (all lines at the on-screen quantities) ─────────
    async handleAddToCart() {
        if (this.isAdding || !this.hasLines) {
            return;
        }
        this.isAdding = true;
        this.reorderMsg = null;
        this.skippedLines = [];
        try {
            // Parallel primitive arrays — object properties on a wrapper list
            // don't reliably bind across the LWC → Apex boundary.
            const productIds = this.lines.map((l) => l.productId);
            const quantities = this.lines.map((l) => l.quantity);
            const res = await addLinesToCart({
                quoteId: this.recordId,
                productIds,
                quantities
            });
            if (res && res.addedCount > 0) {
                try {
                    await refreshCartSummary();
                } catch (e) {
                    // Badge refresh is non-critical; items are already in the cart.
                }
                this.goToCart();
                return;
            }
            this.showFailure(res);
        } catch (error) {
            this.reorderKind = 'error';
            this.skippedLines = [];
            this.reorderMsg = this.readError(error);
        } finally {
            this.isAdding = false;
        }
    }

    showFailure(res) {
        this.skippedLines = ((res && res.skipped) || []).map((s) => ({
            key: s.productId,
            productName: s.productName,
            reason: s.reason
        }));
        this.reorderKind = this.skippedLines.length > 0 ? 'error' : 'warning';
        this.reorderMsg = this.skippedLines.length > 0
            ? 'None of these items can be added to the cart right now.'
            : 'There are no items to add to the cart.';
    }

    readError(error) {
        return error && error.body && error.body.message
            ? error.body.message
            : 'Something went wrong. Please try again.';
    }

    dismissReorder() {
        this.reorderMsg = null;
        this.skippedLines = [];
    }

    // ── Navigation ──────────────────────────────────────────────────
    goToCart() {
        this[NavigationMixin.Navigate]({
            type: 'comm__namedPage',
            attributes: { name: this.cartPageApiName }
        });
    }

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

    // ── View-state getters ──────────────────────────────────────────
    get showSpinner() {
        return this.isLoading;
    }
    get showDetail() {
        return !this.isLoading && !!this.quote;
    }
    get showEmpty() {
        return this.hasLoaded && !this.isLoading && !this.quote;
    }
    get hasLines() {
        return this.lines.length > 0;
    }
    get estimatedTotal() {
        return this.lines.reduce((sum, l) => sum + (l.lineTotal || 0), 0);
    }
    // Grand total that tracks the edited quantities: baseline grand total plus
    // the change in subtotal (keeps the quote's tax / shipping / discounts).
    get liveGrandTotal() {
        return this.baseGrandTotal + (this.estimatedTotal - this.baseSubtotal);
    }
    get addBtnLabel() {
        return this.isAdding ? 'Adding…' : 'Add all to cart';
    }
    get addDisabled() {
        return this.isAdding || !this.hasLines;
    }
    get hasSkipped() {
        return this.skippedLines.length > 0;
    }
    get reorderBannerClass() {
        return `reorder-banner reorder-banner--${this.reorderKind}`;
    }
}
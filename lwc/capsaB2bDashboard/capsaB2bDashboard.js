import { LightningElement, api, wire } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import getOpenOrders from '@salesforce/apex/CapsaB2bDashboardController.getOpenOrders';
import { recordRef, destinationRef, orderListRef } from 'c/capsaNav';

const ORDER_SUMMARY_OBJECT = 'OrderSummary';

const BADGE_BY_STATUS = {
    created: 'badge badge--blue',
    activated: 'badge badge--blue',
    processing: 'badge badge--blue',
    shipped: 'badge badge--amber',
    open: 'badge badge--amber',
    delivered: 'badge badge--green',
    fulfilled: 'badge badge--green',
    completed: 'badge badge--green'
};

export default class CapsaB2bDashboard extends NavigationMixin(LightningElement) {
    // ── Stat cards (configurable in Experience Builder) ──
    @api activeOrders = '0';
    @api activeOrdersSub = 'Open orders';
    @api outstandingBalance = '$51,840';
    @api outstandingSub = '2 open invoices';
    @api openQuotes = '2';
    @api openQuotesSub = '$68,740 in pipeline';
    @api openCases = '2';
    @api openCasesSub = 'Avg. resolve 2.4 days';

    // "All orders" opens the standard Order Summary list (see orderListRef).
    // Leave blank to use it; set a custom route API name to override.
    @api allOrdersPage = '';
    // Legacy URL config retained so old saved values still bind. Unused.
    @api allOrdersUrl = '';

    openOrders = [];
    ordersLoaded = false;
    loadError = false;

    // Generated href for the "All orders" link (correct in any org).
    allOrdersHref = '#';

    connectedCallback() {
        this[NavigationMixin.GenerateUrl](this.allOrdersRef())
            .then((url) => {
                this.allOrdersHref = url;
            })
            .catch(() => {
                /* onclick still navigates */
            });
    }

    allOrdersRef() {
        return this.allOrdersPage ? destinationRef(this.allOrdersPage) : orderListRef();
    }

    @wire(getOpenOrders)
    wiredOrders({ data, error }) {
        if (data) {
            this.openOrders = data.map((o) => ({
                ...o,
                badgeClass: BADGE_BY_STATUS[(o.status || '').toLowerCase()] || 'badge badge--blue'
            }));
            this.ordersLoaded = true;
            this.loadError = false;
        } else if (error) {
            this.openOrders = [];
            this.ordersLoaded = true;
            this.loadError = true;
        }
    }

    get hasOrders() {
        return this.ordersLoaded && this.openOrders.length > 0;
    }

    get isLoading() {
        return !this.ordersLoaded;
    }

    get showEmpty() {
        return this.ordersLoaded && !this.loadError && this.openOrders.length === 0;
    }

    get displayActiveOrders() {
        return this.ordersLoaded ? String(this.openOrders.length) : this.activeOrders;
    }

    navigateToOrder(event) {
        const orderId = event.currentTarget.dataset.id;
        if (!orderId) {
            return;
        }
        this[NavigationMixin.Navigate](recordRef(orderId, ORDER_SUMMARY_OBJECT));
    }

    navigateToAllOrders(event) {
        if (event) {
            event.preventDefault();
        }
        this[NavigationMixin.Navigate](this.allOrdersRef());
    }
}
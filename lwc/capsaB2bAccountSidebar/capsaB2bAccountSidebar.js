import { LightningElement, track, wire } from 'lwc';
import { NavigationMixin, CurrentPageReference } from 'lightning/navigation';
import getSidebarData from '@salesforce/apex/CapsaB2bAccountSidebarController.getSidebarData';
import { PAGE, pageRef, orderListRef } from 'c/capsaNav';

// Build the page reference for a nav item: the Orders item targets the standard
// Order Summary list (a path-param route reached by base-path URL); all other
// items are custom named pages.
function navRef(item) {
    return item.orderList ? orderListRef() : pageRef(item.page);
}

// Nav model. `page` is the Experience route API name (resolved to the correct
// URL at run time — environment independent, see c/capsaNav). `badgeField` maps
// to a count on the Apex payload (null = no badge); `match` is matched against
// the URL to highlight the active item; `paths` are the inline-SVG icon paths.
const NAV = [
    { key: 'dashboard', label: 'Dashboard', page: PAGE.DASHBOARD, match: 'dashboard', badgeField: null,
      paths: ['M3 3h7v7H3z', 'M14 3h7v7h-7z', 'M14 14h7v7h-7z', 'M3 14h7v7H3z'] },
    { key: 'orders', label: 'Orders', orderList: true, match: 'ordersummary', badgeField: 'ordersCount',
      paths: ['M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z', 'M3 6h18', 'M16 10a4 4 0 0 1-8 0'] },
    { key: 'invoices', label: 'Invoices', page: PAGE.INVOICES, match: 'my-invoices', badgeField: 'invoicesCount',
      paths: ['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', 'M14 2v6h6', 'M16 13H8', 'M16 17H8', 'M10 9H8'] },
    { key: 'quotes', label: 'Quotes', page: PAGE.QUOTES, match: 'my-quotes', badgeField: 'quotesCount',
      paths: ['M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z'] },
    { key: 'cases', label: 'Support cases', page: PAGE.CASES, match: 'my-cases', badgeField: 'casesCount',
      paths: ['M3 18v-5a9 9 0 0 1 18 0v5', 'M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z', 'M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z'] },
    { key: 'lists', label: 'My Lists', page: PAGE.LISTS, match: 'mylists', badgeField: null,
      paths: ['M8 6h13', 'M8 12h13', 'M8 18h13', 'M3 6h.01', 'M3 12h.01', 'M3 18h.01'] },
    { key: 'addresses', label: 'Addresses', page: PAGE.ADDRESSES, match: 'addresses', badgeField: null,
      paths: ['M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z', 'M15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0z'] },
    { key: 'profile', label: 'Profile', page: PAGE.PROFILE, match: 'myprofile', badgeField: null,
      paths: ['M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2', 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0z'] }
];

export default class CapsaB2bAccountSidebar extends NavigationMixin(LightningElement) {
    @track data = {};
    @track _activeKey = '';
    // nav key -> generated href (correct in any org; supports open-in-new-tab).
    @track urlByKey = {};

    @wire(getSidebarData)
    wiredData({ data }) {
        if (data) {
            this.data = data;
        }
    }

    // Fires on every navigation (incl. SPA), so the active highlight stays in
    // sync even though this component persists in the theme layout.
    @wire(CurrentPageReference)
    setPageRef() {
        this.readPath();
    }

    connectedCallback() {
        this.readPath();
        this.injectSearchStyles();
        this.generateUrls();
    }

    // Build environment-independent hrefs for each nav item from its route API
    // name, so the same links resolve correctly in sandbox and production.
    generateUrls() {
        NAV.forEach((n) => {
            this[NavigationMixin.GenerateUrl](navRef(n))
                .then((url) => {
                    this.urlByKey = { ...this.urlByKey, [n.key]: url };
                })
                .catch(() => {
                    // onclick still navigates via the page reference.
                });
        });
    }

    // The account-header search button renders white-on-white (invisible icon).
    // Give it a grey background so the magnifying-glass icon is visible. The
    // button is in the standard component's shadow DOM, so we use both direct
    // selectors and SLDS styling hooks (which cross the shadow boundary).
    injectSearchStyles() {
        const STYLE_ID = 'capsa-b2b-search-style';
        // Intentional document-level access: the target button lives in the
        // standard search component's shadow DOM, so the override style is
        // injected once into <head>.
        // eslint-disable-next-line @lwc/lwc/no-document-query
        if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) {
            return;
        }
        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = `
            commerce_builder-search-input button[type="submit"],
            commerce_builder-search-input button:last-of-type {
                background-color: #16314e !important;
                color: #ffffff !important;
            }
            commerce_builder-search-input button[type="submit"] svg,
            commerce_builder-search-input button:last-of-type svg {
                fill: #ffffff !important;
                color: #ffffff !important;
            }
        `;
        document.head.appendChild(style);
    }

    readPath() {
        const p = (typeof window !== 'undefined' && window.location
            ? window.location.pathname : '').toLowerCase();
        const match = NAV.find((n) => p.indexOf(n.match) !== -1);
        if (match) {
            this._activeKey = match.key;
        }
    }

    // Highlight immediately and navigate via a typed page reference (so links
    // work regardless of the site URL prefix). readPath keeps the highlight in
    // sync on each page load.
    handleNavClick(event) {
        const key = event.currentTarget.dataset.key;
        if (!key) {
            return;
        }
        this._activeKey = key;
        const item = NAV.find((n) => n.key === key);
        if (item) {
            event.preventDefault();
            this[NavigationMixin.Navigate](navRef(item));
        }
    }

    get initials() {
        return this.data.initials || '';
    }

    get accountName() {
        return this.data.accountName || '';
    }

    get accountSub() {
        const parts = [];
        if (this.data.typeLabel) {
            parts.push(this.data.typeLabel);
        }
        if (this.data.accountNumber) {
            parts.push('#' + this.data.accountNumber);
        }
        return parts.join(' · ');
    }

    get navItems() {
        return NAV.map((n) => {
            const count = n.badgeField ? this.data[n.badgeField] : null;
            const active = this._activeKey === n.key;
            return {
                key: n.key,
                label: n.label,
                url: this.urlByKey[n.key] || '#',
                badge: count && count > 0 ? count : null,
                cssClass: active ? 'nav-item nav-item--active' : 'nav-item',
                icon: n.paths.map((d, i) => ({ k: `${n.key}-${i}`, d }))
            };
        });
    }
}
import { LightningElement, api } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import isGuest from '@salesforce/user/isGuest';
import { PAGE, loginRef, destinationRef, orderListRef } from 'c/capsaNav';

/**
 * Capsa Connect home-page hero banner.
 *
 * Unified banner: headline + subtitle, two guest-only CTAs, and four
 * quick-access account cards (Orders, Invoices, Quotes, Support cases).
 *
 *  - Guest CTAs (Request Account / Already Have an Account) show for GUESTS ONLY
 *    and route to the register / login pages.
 *  - Account cards always show. Guest -> login page; logged-in -> the card's
 *    own destination page.
 *
 * NAVIGATION: every destination is a route API name (see c/capsaNav), navigated
 * as a typed page reference. Salesforce resolves it to the correct URL in any
 * org, so the same code works in sandbox and production — no hardcoded site
 * prefix, no per-org edits.
 */
export default class CapsaHomeHero extends NavigationMixin(LightningElement) {
    @api headline = 'Explore our Healthcare Solutions';
    @api subheadline =
        'Power your pharmacy and clinical operations with integrated automation, medication management, and point-of-care technology, genuine parts, accessories, and supplies for the full Healthcare lineup, fast shipping, expert support, and effortless customer ordering.';

    @api primaryLabel = 'New Customer';
    @api secondaryLabel = 'Already Capsa Customer';

    // Destination pages as Experience route API names (environment independent).
    // Configurable in Builder; the defaults already point at the right pages.
    @api registerPage = PAGE.REGISTER;
    // Orders opens the standard Order Summary list (see orderListRef). Leave
    // blank to use it; set a custom route API name here only to override.
    @api ordersPage = '';
    @api invoicesPage = PAGE.INVOICES;
    @api quotesPage = PAGE.QUOTES;
    @api supportPage = PAGE.CASES;

    // Retained for backward compatibility with the published Experience Site
    // (older URL-style config). No longer used for navigation, but kept so any
    // saved values still bind without error. Login uses the typed login page.
    @api registerUrl = '';
    @api loginUrl = '';
    @api loginPage = '';
    @api ordersUrl = '';
    @api invoicesUrl = '';
    @api quotesUrl = '';
    @api supportUrl = '';
    @api primaryUrl = '';
    @api secondaryUrl = '';

    isGuest = isGuest;

    // Real hrefs for the guest CTAs (generated so open-in-new-tab works in any
    // org). Clicks are handled by the onclick handlers below; '#' is only a
    // placeholder until the async URLs resolve.
    registerHref = '#';
    loginHref = '#';

    connectedCallback() {
        if (!this.isGuest) {
            return;
        }
        this[NavigationMixin.GenerateUrl](
            destinationRef(this.registerPage || this.registerUrl || PAGE.REGISTER)
        )
            .then((url) => {
                this.registerHref = url;
            })
            .catch(() => {
                /* onclick still navigates */
            });
        this[NavigationMixin.GenerateUrl](loginRef())
            .then((url) => {
                this.loginHref = url;
            })
            .catch(() => {
                /* onclick still navigates */
            });
    }

    get cards() {
        return [
            {
                key: 'orders',
                label: 'Orders',
                description: 'Track active shipments and reorder from full order history.',
                page: this.ordersPage,
                icon: 'M4 6h16v2H4V6zm0 5h16v2H4v-2zm0 5h10v2H4v-2z'
            },
            {
                key: 'invoices',
                label: 'Invoices',
                description: 'View open balances, download PDFs, and pay online.',
                page: this.invoicesPage,
                icon: 'M6 2h8l4 4v16H6V2zm7 1.5V7h3.5L13 3.5zM8 11h8v1.6H8V11zm0 3.2h8v1.6H8v-1.6zm0 3.2h5v1.6H8v-1.6z'
            },
            {
                key: 'quotes',
                label: 'Quotes',
                description: 'Review open & closed quotes and convert to an order in a click.',
                page: this.quotesPage,
                icon: 'M3 3h18v13H8l-5 5V3zm5 5v1.8h10V8H8zm0 3.4v1.8h7v-1.8H8z'
            },
            {
                key: 'support',
                label: 'Support cases',
                description: 'Open service cases and follow every resolution.',
                page: this.supportPage,
                icon: 'M12 3a8 8 0 0 0-8 8v4.5A2.5 2.5 0 0 0 6.5 18H8v-7H6v-.5a6 6 0 0 1 12 0v.5h-2v7h1.5a2.5 2.5 0 0 1-2.5 2.5h-2v2h2a4.5 4.5 0 0 0 4.5-4.5V11a8 8 0 0 0-8-8z'
            }
        ];
    }

    handleRegister(event) {
        event.preventDefault();
        // Prefer the page API name; fall back to any legacy URL still configured.
        this[NavigationMixin.Navigate](
            destinationRef(this.registerPage || this.registerUrl || PAGE.REGISTER)
        );
    }

    handleLogin(event) {
        event.preventDefault();
        this[NavigationMixin.Navigate](loginRef());
    }

    handleCardClick(event) {
        // Guests go to login; logged-in users go to the card's destination.
        if (this.isGuest) {
            this[NavigationMixin.Navigate](loginRef());
            return;
        }
        const ref = this.cardRef(event.currentTarget.dataset.key);
        if (ref) {
            this[NavigationMixin.Navigate](ref);
        }
    }

    // The Orders card opens the standard Order Summary list (path-param route,
    // reached via a base-path URL); the other cards open custom named pages.
    cardRef(key) {
        switch (key) {
            case 'orders':
                return this.ordersPage ? destinationRef(this.ordersPage) : orderListRef();
            case 'invoices':
                return destinationRef(this.invoicesPage);
            case 'quotes':
                return destinationRef(this.quotesPage);
            case 'support':
                return destinationRef(this.supportPage);
            default:
                return null;
        }
    }
}
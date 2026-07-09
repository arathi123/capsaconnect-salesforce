import { LightningElement, api } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import isGuest from '@salesforce/user/isGuest';
import { PAGE, destinationRef, loginRef } from 'c/capsaNav';

/**
 * Capsa Connect account panel.
 *
 * Renders four quick-access cards (Orders, Invoices, Quotes, Support cases).
 *  - Guest user  -> the Experience Site login page.
 *  - Logged-in   -> each card navigates to its destination page.
 *
 * Destinations are Experience route API names (see c/capsaNav), navigated as
 * typed page references, so the same code works in sandbox and production with
 * no hardcoded site prefix.
 */
export default class CapsaAccountPanel extends NavigationMixin(LightningElement) {
    @api eyebrow = 'Your account, in real time';
    @api heading = 'One login for your entire Capsa relationship';

    // Per-tile destinations as route API names. Configurable in Builder; the
    // defaults already point at real account pages.
    @api ordersPage = PAGE.OPEN_ORDERS;
    @api invoicesPage = PAGE.INVOICES;
    @api quotesPage = PAGE.QUOTES;
    @api supportPage = PAGE.CASES;

    // Retained for backward compatibility with older URL-style config (no longer
    // used for navigation, but kept so saved values still bind without error).
    @api ordersUrl = '';
    @api invoicesUrl = '';
    @api quotesUrl = '';
    @api supportUrl = '';

    isGuest = isGuest;

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

    handleCardClick(event) {
        if (this.isGuest) {
            this[NavigationMixin.Navigate](loginRef());
            return;
        }
        const key = event.currentTarget.dataset.key;
        const card = this.cards.find((c) => c.key === key);
        const dest = card && card.page;
        if (!dest) {
            return;
        }
        this[NavigationMixin.Navigate](destinationRef(dest));
    }
}
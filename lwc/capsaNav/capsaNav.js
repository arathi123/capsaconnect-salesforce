/**
 * capsaNav — shared, environment-independent navigation helpers for the
 * Capsa Connect Experience site.
 *
 * WHY THIS EXISTS
 * ---------------
 * Hardcoded URLs like `/Capsaconnect/my-invoices` embed the site's URL path
 * prefix (and, for detail links, org-specific record ids). Both differ between
 * sandbox and production, so those links break the moment the component is
 * deployed to another org.
 *
 * Every helper here builds a *typed* page reference instead. Salesforce
 * resolves it to the correct URL at run time in any org, using stable API
 * names — never a literal path or id. The route API names below match the
 * `sfdc_cms__route` developer names in the Experience site metadata; those are
 * identical across sandbox and production because they deploy as metadata.
 *
 * This module is not exposed to Experience Builder (isExposed=false); it is a
 * plain utility imported by the site's LWCs.
 */

import basePath from '@salesforce/community/basePath';

// Experience site page (route) API names — the single source of truth.
// If a route is ever renamed, update it here only.
export const PAGE = {
    HOME: 'Home',
    REGISTER: 'Register',
    // Account dashboard page (route "AddPaymentMethods", URL prefix "dashboard").
    DASHBOARD: 'AddPaymentMethods',
    // Standard Order Summary list ("/OrderSummary/OrderSummary/Default").
    ORDER_SUMMARY_LIST: 'Order_Summary_List',
    OPEN_ORDERS: 'Open_Order_Summaries__c',
    INVOICES: 'MyInvoices__c',
    QUOTES: 'MyQuotes__c',
    CASES: 'MyCases__c',
    CART: 'Current_Cart',
    // Account-area pages used by the account sidebar.
    LISTS: 'Wishlist', // route "Wishlist" (URL prefix "mylists")
    ADDRESSES: 'Address_List',
    PROFILE: 'My_Profile'
};

/**
 * A named Experience page, optionally with query-string state.
 * @param {string} name  route API name (see PAGE)
 * @param {object} [state] query params, e.g. { invoiceId: '...' }
 */
export function pageRef(name, state) {
    const ref = { type: 'comm__namedPage', attributes: { name } };
    if (state) {
        ref.state = state;
    }
    return ref;
}

/** The site's login page — canonical typed reference (never hardcode /login). */
export function loginRef() {
    return { type: 'comm__loginPage', attributes: { actionName: 'login' } };
}

/**
 * A record detail page (e.g. OrderSummary, ProductCategory). The record id is
 * supplied by the caller — resolved at run time — so no org-specific id is ever
 * baked into the component.
 */
export function recordRef(recordId, objectApiName, actionName = 'view') {
    return {
        type: 'standard__recordPage',
        attributes: { recordId, objectApiName, actionName }
    };
}

/** A raw relative/absolute URL (legacy fallback for old URL-style config). */
export function webRef(url) {
    return { type: 'standard__webPage', attributes: { url } };
}

/**
 * The standard Order Summary list page ("/OrderSummary/OrderSummary/Default").
 *
 * This is a standard object-list route whose URL carries path parameters
 * (/OrderSummary/:objectApiName/:filterName), so comm__namedPage cannot reach
 * it. We build the URL from the site's own base path (resolved at run time per
 * org) so there is no hardcoded site prefix — the same approach the account
 * sidebar has always used successfully.
 */
export function orderListRef() {
    return webRef(`${basePath}/OrderSummary/OrderSummary/Default`);
}

/**
 * True when a configured value is a page API name rather than a URL. Lets a
 * component keep honouring old URL-style Builder config (starts with "/" or has
 * a scheme) while treating everything else as a route API name.
 */
export function isApiName(value) {
    return !!value && !value.startsWith('/') && !value.includes('://');
}

/**
 * Build the best page reference for a configured destination value:
 *  - a route API name  -> comm__namedPage (environment independent)
 *  - a legacy URL      -> standard__webPage (as-is, for backward compatibility)
 * @param {string} value  page API name or URL
 * @param {object} [state] optional query state for named pages
 */
export function destinationRef(value, state) {
    return isApiName(value) ? pageRef(value, state) : webRef(value);
}
import { LightningElement, api } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import isGuest from '@salesforce/user/isGuest';
import { PAGE, destinationRef, loginRef } from 'c/capsaNav';

/**
 * Centered "unified login" call-to-action on a white background.
 *  - Logged-in user -> account dashboard page.
 *  - Guest          -> login page.
 *
 * Navigation is by typed page reference (route API name / typed login page), so
 * it resolves correctly in sandbox and production with no hardcoded site URL.
 */
export default class CapsaDashboardCta extends NavigationMixin(LightningElement) {
    @api eyebrow = 'Your Account · Real Time';
    @api heading = 'Your Unified Login for Every Capsa Service';
    @api buttonLabel = 'Go to Dashboard';

    // Destination page (Experience route API name) for logged-in users.
    // Environment independent; defaults to the account dashboard page.
    @api dashboardPage = PAGE.DASHBOARD;

    // Legacy URL-style config retained so any previously saved values still bind
    // without error. No longer used for navigation.
    @api dashboardUrl = '';
    @api loginUrl = '';

    isGuest = isGuest;

    // Real href for the CTA (generated so open-in-new-tab works in any org).
    linkHref = '#';

    connectedCallback() {
        this[NavigationMixin.GenerateUrl](this.targetRef())
            .then((url) => {
                this.linkHref = url;
            })
            .catch(() => {
                /* onclick still navigates */
            });
    }

    targetRef() {
        return this.isGuest
            ? loginRef()
            : destinationRef(this.dashboardPage || this.dashboardUrl || PAGE.DASHBOARD);
    }

    handleClick(event) {
        event.preventDefault();
        this[NavigationMixin.Navigate](this.targetRef());
    }
}
import { LightningElement, api, track, wire } from 'lwc';
import {
    CheckoutInformationAdapter,
    postAuthorizePayment,
    useCheckoutComponent
} from 'commerce/checkoutApi';
import getPaymentConfiguration from '@salesforce/apex/BridgePayController.getPaymentConfiguration';
import createPaymentSession from '@salesforce/apex/BridgePayController.createPaymentSession';
import authorizeCardApex from '@salesforce/apex/BridgePayController.authorizeCard';
import SIMULATOR_PAGE from '@salesforce/resourceUrl/BridgePaySimulator';

/**
 * bridgePayPayment
 * -----------------------------------------------------------------------------
 * PROOF OF CONCEPT — credit-card payment for B2B Commerce LWR checkout via the
 * BridgePay hosted-iframe + Salesforce Commerce Payments framework.
 *
 * PCI posture (SAQ-A): the PAN/CVV are entered ONLY inside BridgePay's iframe.
 * The browser receives an opaque token via postMessage; that token is the only
 * value handed to Salesforce. No card data ever reaches this component or Apex.
 *
 * Checkout integration (matches the project's existing custom-checkout pattern):
 *   - registers via useCheckoutComponent + stageAction(stage)
 *   - BEFORE_PAYMENT : ensure a hosted session exists
 *   - PAYMENT        : postAuthorizePayment(checkoutId, token, billing)
 *
 * Once validated, this code can be merged into capsaB2bPaymentMethod (e.g. as a
 * "Credit Card" option alongside Purchase Order) with minimal change.
 */

// Defined locally to match the existing component (avoids version-specific imports).
const CheckoutStage = {
    CHECK_VALIDITY_UPDATE: 'CHECK_VALIDITY_UPDATE',
    REPORT_VALIDITY_SAVE: 'REPORT_VALIDITY_SAVE',
    BEFORE_PAYMENT: 'BEFORE_PAYMENT',
    PAYMENT: 'PAYMENT'
};

const STATUS_READY = 200;
const STATUS_PROCESSING = 202;

// postMessage contract from the BridgePay hosted iframe.
// TODO[BridgePay]: align these `type` values with BridgePay's actual HPP events.
const MSG_TOKEN = 'BRIDGEPAY_TOKEN';
const MSG_ERROR = 'BRIDGEPAY_ERROR';
const MSG_READY = 'BRIDGEPAY_READY';

export default class BridgePayPayment extends useCheckoutComponent(LightningElement) {
    // ---- Checkout session state ----
    @track checkoutId;
    @track checkoutStatus;
    @track amount;
    @track currencyCode;
    @track billingAddress;

    // ---- Hosted-iframe / payment state ----
    @track config;            // BridgePayController.PaymentConfig (cacheable display config)
    @track hostedConfig;      // BridgePayTokenService.HostedConfig (per-session)
    @track iframeUrl;
    @track paymentToken;
    @track cardBrand;
    @track maskedCard;
    @track authorized = false; // auth-only runs at Proceed; Place Order never charges

    // ---- UI state ----
    @track isLoadingSession = false;
    @track iframeReady = false;
    @track isAuthorizing = false;
    @track showError = false;
    @track errorMessage;
    @track isSummary = false;
    isPreview = false;

    _messageHandler;
    _sessionRequested = false;

    // -------------------------------------------------------------------------
    // Lifecycle
    // -------------------------------------------------------------------------
    connectedCallback() {
        this.isPreview = this.isInSitePreview();
        if (this.isPreview) {
            return;
        }
        // Bind once so we can remove the exact reference on disconnect.
        this._messageHandler = this.handleIframeMessage.bind(this);
        window.addEventListener('message', this._messageHandler);
    }

    disconnectedCallback() {
        if (this._messageHandler) {
            window.removeEventListener('message', this._messageHandler);
        }
    }

    isInSitePreview() {
        const url = document.URL;
        return (
            url.indexOf('sitepreview') > 0 ||
            url.indexOf('livepreview') > 0 ||
            url.indexOf('live-preview') > 0 ||
            url.indexOf('live.') > 0 ||
            url.indexOf('.builder.') > 0
        );
    }

    // Aspect handler — same contract used by the existing checkout components.
    setAspect(newAspect) {
        this.isSummary = newAspect?.summary === true;
    }

    // -------------------------------------------------------------------------
    // Cacheable display config (brands, origin) — safe to load eagerly.
    // -------------------------------------------------------------------------
    @wire(getPaymentConfiguration)
    wiredConfig({ data, error }) {
        if (data) {
            this.config = data;
        } else if (error) {
            // Non-fatal: brand chips simply won't render. Session creation still works.
            // eslint-disable-next-line no-console
            console.error('BridgePay getPaymentConfiguration error', error);
        }
    }

    // -------------------------------------------------------------------------
    // Checkout information — drives amount/currency/address and readiness.
    // -------------------------------------------------------------------------
    @wire(CheckoutInformationAdapter, {})
    checkoutInfo({ data, error }) {
        if (this.isPreview || error || !data) {
            return;
        }
        this.checkoutStatus = data.checkoutStatus;
        this.checkoutId = data.checkoutId;

        const summary = data.cartSummary || {};
        // Field names are defensive: different API versions expose grand total differently.
        this.amount = Number(
            summary.grandTotalAmount ?? summary.totalAmount ?? summary.totalProductAmount ?? 0
        );
        this.currencyCode = summary.currencyIsoCode || 'USD';

        const firstGroup = data?.deliveryGroups?.items?.[0];
        this.billingAddress = firstGroup?.deliveryAddress;

        // Lazily start the hosted session once we know the amount and are ready.
        if (this.isReady && !this._sessionRequested && this.amount > 0) {
            this.initSession();
        }
    }

    // -------------------------------------------------------------------------
    // Readiness getters (template)
    // -------------------------------------------------------------------------
    get isReady() {
        return !this.isPreview && this.checkoutStatus === STATUS_READY && !this.isSummary;
    }
    get isProcessing() {
        return this.checkoutStatus === STATUS_PROCESSING || this.isAuthorizing;
    }
    get showSummary() {
        return !this.isPreview && this.isSummary;
    }
    get hasToken() {
        return !!this.paymentToken;
    }
    get acceptedBrands() {
        return this.config?.acceptedBrands || [];
    }
    get isSimulation() {
        return this.config?.simulationMode === true;
    }
    get summaryLabel() {
        if (!this.maskedCard) {
            return 'Credit Card';
        }
        return `${this.cardBrand || 'Card'} ${this.maskedCard}`;
    }
    get tileLabel() {
        return this.authorized
            ? `${this.summaryLabel} — authorized`
            : `${this.summaryLabel} — ready to authorize`;
    }

    // -------------------------------------------------------------------------
    // Hosted session bootstrap
    // -------------------------------------------------------------------------
    async initSession() {
        this._sessionRequested = true;
        this.isLoadingSession = true;
        this.clearError();
        try {
            const hc = await createPaymentSession({
                amount: this.amount,
                currencyCode: this.currencyCode
            });
            this.hostedConfig = hc;
            this.iframeUrl = this.buildIframeUrl(hc);
        } catch (err) {
            this.setError(this._extractMessage(err));
            this._sessionRequested = false; // allow retry
        } finally {
            this.isLoadingSession = false;
        }
    }

    /**
     * Build the hosted-iframe URL from session config.
     * TODO[BridgePay]: confirm the exact query-parameter names against the
     * BridgePay Hosted Payment Page documentation.
     */
    buildIframeUrl(hc) {
        if (!hc?.sessionToken) {
            return null;
        }
        // SIMULATION: the "hosted page" is the BridgePaySimulator static resource
        // served from this site's own origin — no BridgePay needed.
        if (this.isSimulation) {
            const simParams = new URLSearchParams({
                sessionToken: hc.sessionToken,
                amount: String(hc.amount ?? this.amount ?? ''),
                currency: hc.currencyCode || this.currencyCode || 'USD'
            });
            return `${SIMULATOR_PAGE}?${simParams.toString()}`;
        }
        if (!hc.iframeBaseUrl) {
            return null;
        }
        const params = new URLSearchParams({
            sessionToken: hc.sessionToken,
            merchantId: hc.merchantId || '',
            terminalId: hc.terminalId || '',
            storeId: hc.storeId || '',
            amount: String(hc.amount ?? this.amount ?? ''),
            currency: hc.currencyCode || this.currencyCode || 'USD'
        });
        const sep = hc.iframeBaseUrl.indexOf('?') >= 0 ? '&' : '?';
        return `${hc.iframeBaseUrl}${sep}${params.toString()}`;
    }

    handleIframeReady() {
        this.iframeReady = true;
    }

    // -------------------------------------------------------------------------
    // postMessage from the BridgePay iframe — the ONLY way the token arrives.
    // -------------------------------------------------------------------------
    handleIframeMessage(event) {
        // Security: only trust messages from the expected origin. In simulation
        // the simulator page is served from THIS site's origin; in real mode it
        // must be the configured BridgePay origin.
        const allowed = this.isSimulation
            ? window.location.origin
            : (this.hostedConfig?.allowedOrigin || this.config?.allowedOrigin);
        if (!allowed || event.origin !== allowed) {
            return;
        }
        let payload = event.data;
        if (typeof payload === 'string') {
            try {
                payload = JSON.parse(payload);
            } catch (e) {
                return;
            }
        }
        if (!payload || !payload.type) {
            return;
        }

        switch (payload.type) {
            case MSG_READY:
                this.handleIframeReady();
                break;
            case MSG_TOKEN:
                this.paymentToken = payload.token;
                this.cardBrand = payload.brand || payload.cardBrand;
                this.maskedCard = payload.last4
                    ? `••••${String(payload.last4).slice(-4)}`
                    : (payload.maskedAccount || '');
                this.authorized = false; // a new card requires a new authorization
                this.clearError();
                break;
            case MSG_ERROR:
                this.setError(payload.message || 'Card entry failed. Please check your details.');
                this.paymentToken = null;
                break;
            default:
                break;
        }
    }

    // -------------------------------------------------------------------------
    // Container-driven checkout contract
    // -------------------------------------------------------------------------
    // ARCHITECTURE: authorization (auth-only card verification) runs at the
    // FINAL Place Order click (PAYMENT stage) — an abandoned order review never
    // leaves a card hold. Proceed only validates that a tokenized card exists.
    // No capture ever happens in Salesforce; SyteLine charges the
    // freight-adjusted amount later via the BridgePay vault token.
    stageAction(checkoutStage) {
        switch (checkoutStage) {
            case CheckoutStage.CHECK_VALIDITY_UPDATE:
                return Promise.resolve(this.checkValidity());
            case CheckoutStage.REPORT_VALIDITY_SAVE:
                return Promise.resolve(this.reportValidity());
            case CheckoutStage.BEFORE_PAYMENT:
                return Promise.resolve(true);
            case CheckoutStage.PAYMENT:
                return this.authorizePayment();
            default:
                return Promise.resolve(true);
        }
    }

    /** Place Order: verify + authorize the card once; failure surfaces in the
     *  summary view and forces re-entry. */
    async authorizePayment() {
        if (this.isPreview) {
            return true;
        }
        if (!this.reportValidity()) {
            return false;
        }
        if (this.authorized) {
            return true; // same card already authorized — don't double-auth
        }
        return this.completePayment();
    }

    @api
    checkValidity() {
        return this.isPreview ? true : this.hasToken;
    }

    @api
    reportValidity() {
        if (this.isPreview || this.hasToken) {
            this.clearError();
            return true;
        }
        this.setError('Please enter your card details to continue.');
        return false;
    }

    /** Auth-only: hand the opaque token to Salesforce for gateway authorization. */
    async completePayment() {
        if (this.isPreview) {
            return true;
        }
        if (!this.reportValidity()) {
            return false;
        }
        if (this.isAuthorizing) {
            return false; // duplicate-submission guard
        }
        this.isAuthorizing = true;
        this.clearError();
        try {
            // VERIFIED client-side flow: authorize server-side via Apex, then hand
            // the gateway TRANSACTION id (not the token) to postAuthorizePayment.
            const auth = await authorizeCardApex({
                token: this.paymentToken,
                amount: this.amount,
                currencyCode: this.currencyCode
            });
            await postAuthorizePayment(this.checkoutId, auth.id);
            this.authorized = true;
            return true;
        } catch (err) {
            // Full diagnostic to the browser console (F12) — the UI shows a friendly message.
            // eslint-disable-next-line no-console
            console.error('BridgePay postAuthorizePayment failed:', JSON.stringify(err, Object.getOwnPropertyNames(err)));
            const message = this._extractMessage(err);
            // Token is single-use; force re-entry on failure so the buyer can retry.
            this.paymentToken = null;
            this._sessionRequested = false;
            await this.initSession(); // refresh the iframe for the retry
            this.setError(message);   // AFTER initSession, which clears errors
            return false;
        } finally {
            this.isAuthorizing = false;
        }
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------
    normalizeBillingAddress(addr) {
        if (!addr) {
            return undefined;
        }
        const out = {};
        if (addr.street) out.street = addr.street;
        if (addr.city) out.city = addr.city;
        if (addr.region) out.region = addr.region;
        if (addr.postalCode) out.postalCode = addr.postalCode;
        if (addr.country) out.country = addr.country;
        if (addr.firstName) out.firstName = addr.firstName;
        if (addr.lastName) out.lastName = addr.lastName;
        if (addr.companyName) out.companyName = addr.companyName;
        return out;
    }

    setError(message) {
        this.showError = true;
        this.errorMessage = message || 'An unexpected error occurred.';
    }
    clearError() {
        this.showError = false;
        this.errorMessage = null;
    }

    _extractMessage(err) {
        if (!err) return 'An error occurred.';
        if (typeof err === 'string') return err;
        if (err.body?.message) return err.body.message;
        // LWR webruntime apex-execute envelope: { error: [ { message } ] }
        if (err.body?.error?.[0]?.message) return err.body.error[0].message;
        // Connect API errors often arrive as an array of {errorCode, message}.
        if (Array.isArray(err.body) && err.body[0]?.message) return err.body[0].message;
        if (err.body?.errors?.[0]?.detail?.message) return err.body.errors[0].detail.message;
        if (err.message) return err.message;
        return 'An error occurred while processing your card.';
    }
}
import { LightningElement, wire, api, track } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import {
    CheckoutInformationAdapter,
    simplePurchaseOrderPayment,
    postAuthorizePayment,
    useCheckoutComponent
} from 'commerce/checkoutApi';
import { publish, MessageContext } from 'lightning/messageService';
import POFILE_CHANNEL from '@salesforce/messageChannel/poFileChannel__c';
import BILLING_CHANNEL from '@salesforce/messageChannel/billingAddressChannel__c';
import getPaymentConfiguration from '@salesforce/apex/BridgePayController.getPaymentConfiguration';
import createPaymentSession from '@salesforce/apex/BridgePayController.createPaymentSession';
import authorizeCardApex from '@salesforce/apex/BridgePayController.authorizeCard';
import SIMULATOR_PAGE from '@salesforce/resourceUrl/BridgePaySimulator';
import TOKENPAY_HOST_PAGE from '@salesforce/resourceUrl/BridgePayTokenPayHost';

/**
 * capsaB2bPaymentMethod — MERGED payment component.
 *
 * Radio choice: Purchase Order (default, unchanged behavior) | Credit Card.
 *  - PO mode: PO number REQUIRED, file upload optional; proceeding saves the PO
 *    payment via simplePurchaseOrderPayment (exactly the pre-merge behavior).
 *  - CC mode: card entered in the BridgePay hosted iframe (PAN never touches
 *    Salesforce); Proceed only confirms a tokenized card exists. The auth-only
 *    verification runs at the FINAL Place Order click (PAYMENT stage), so an
 *    abandoned review screen never leaves a card hold. PO number + file become
 *    OPTIONAL references in CC mode.
 *  - Only the SELECTED method attaches a payment to the checkout — a checkout
 *    holds exactly one payment, so the method choice locks once applied.
 *
 * Capture never happens in Salesforce; SyteLine charges later (freight-adjusted)
 * via the BridgePay vault token.
 */

// Defined locally (matches the official reference pattern — avoids an import
// that may not exist depending on API version).
const CheckoutStage = {
    CHECK_VALIDITY_UPDATE: 'CHECK_VALIDITY_UPDATE',
    REPORT_VALIDITY_SAVE: 'REPORT_VALIDITY_SAVE',
    BEFORE_PAYMENT: 'BEFORE_PAYMENT',
    PAYMENT: 'PAYMENT'
};

const STATUS_READY = 200;
const STATUS_PROCESSING = 202;
const MAX_FILE_SIZE_BYTES = 4 * 1024 * 1024;

const METHOD_PO = 'PO';
const METHOD_CC = 'CC';

// Error group code for dispatchUpdateErrorAsync — this is the mechanism the
// shipping component uses to actually HALT Proceed; a bare `return false` from
// reportValidity does not block on its own.
const PAYMENT_GROUP_CODE = 'PaymentInformation';

// postMessage contract from the BridgePay hosted iframe / simulator.
const MSG_TOKEN = 'BRIDGEPAY_TOKEN';
const MSG_ERROR = 'BRIDGEPAY_ERROR';
const MSG_READY = 'BRIDGEPAY_READY';

export default class CapsaB2bPaymentMethod
    extends useCheckoutComponent(NavigationMixin(LightningElement)) {

    // ---- Method selection ----
    @track paymentType = METHOD_PO; // default preserves existing PO behavior
    @track poSaved = false;         // PO payment applied to checkout
    @track authorized = false;      // card authorized on checkout

    // ---- PO form state (unchanged) ----
    @track poNumber = '';
    poFileName;
    @track poFileSize;
    @track poFileType;

    // ---- CC / hosted-iframe state ----
    @track ccConfig;          // cacheable display config (simulationMode, origin)
    @track hostedConfig;      // per-session config from createPaymentSession
    @track iframeUrl;
    @track paymentToken;
    @track cardBrand;
    @track maskedCard;
    @track isLoadingSession = false;
    @track isAuthorizing = false;
    _sessionRequested = false;
    _messageHandler;

    // ---- Checkout session state ----
    @track checkoutId;
    @track shippingAddress;
    @track checkoutStatus;
    @track cartId;
    @track amount;
    @track currencyCode;

    // ---- Billing address (chosen in the embedded capsaB2bBillingAddress book) ----
    // When the buyer picks a Billing-type ContactPointAddress it lands here and is
    // applied to the order's payment call. If left empty the shipping address is
    // used as billing (preserves the pre-billing-book behavior + guest users).
    @track selectedBillingAddress;

    // ---- Error display state (shared) ----
    @track showError = false;
    @track errorMessage;

    // ---- Aspect / preview state ----
    isPreview = false;
    isSummary = false;

    connectedCallback() {
        this.isPreview = this.isInSitePreview();
        if (this.isPreview) { return; }
        this._messageHandler = this.handleIframeMessage.bind(this);
        window.addEventListener('message', this._messageHandler);
    }

    disconnectedCallback() {
        if (this._messageHandler) {
            window.removeEventListener('message', this._messageHandler);
        }
    }

    @wire(MessageContext) messageContext;

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

    // ---- Aspect handler (unchanged contract) ----
    setAspect(newAspect) {
        this.isSummary = newAspect?.summary === true;
    }

    // ---- Cacheable CC display config ----
    @wire(getPaymentConfiguration)
    wiredCcConfig({ data, error }) {
        if (data) {
            this.ccConfig = data;
        } else if (error) {
            // Non-fatal: PO mode is unaffected; CC session still initializes on demand.
            // eslint-disable-next-line no-console
            console.error('CapsaB2bPaymentMethod getPaymentConfiguration error', error);
        }
    }

    // ---- CheckoutInformationAdapter (unchanged payload usage + amounts for CC) ----
    @wire(CheckoutInformationAdapter, {})
    checkoutInfo({ data, error }) {
        if (this.isPreview) { return; }
        if (error) {
            // eslint-disable-next-line no-console
            console.error('CapsaB2bPaymentMethod CheckoutInformationAdapter error', error);
            return;
        }
        if (!data) { return; }

        this.checkoutStatus = data.checkoutStatus;
        this.checkoutId = data.checkoutId;
        this.cartId = data.cartSummary?.cartId;

        const summary = data.cartSummary || {};
        this.amount = Number(
            summary.grandTotalAmount ?? summary.totalAmount ?? summary.totalProductAmount ?? 0
        );
        this.currencyCode = summary.currencyIsoCode || 'USD';

        const firstGroup = data?.deliveryGroups?.items?.[0];
        this.shippingAddress = firstGroup?.deliveryAddress;

        // Keep order review's Bill-to in sync — for PO (and CC before a pick) the
        // effective billing is the shipping address.
        this._publishBilling();

        // Buyer picked CC before the amount arrived — start the session now.
        if (this.isCcSelected && this.isReady && !this._sessionRequested && this.amount > 0) {
            this.initCcSession();
        }
    }

    // ---- Readiness getters ----
    get isReady() {
        return !this.isPreview
            && this.checkoutStatus === STATUS_READY
            && !this.isSummary;
    }
    get isProcessing() {
        return this.checkoutStatus === STATUS_PROCESSING;
    }
    get showSummary() {
        return !this.isPreview && this.isSummary;
    }

    // ---- Method selection ----
    get methodOptions() {
        return [
            { label: 'Purchase Order', value: METHOD_PO },
            { label: 'Credit Card', value: METHOD_CC }
        ];
    }
    get isPoSelected() { return this.paymentType === METHOD_PO; }
    get isCcSelected() { return this.paymentType === METHOD_CC; }

    /** A checkout holds exactly one payment — once applied, lock the choice. */
    get isMethodLocked() { return this.poSaved || this.authorized; }

    get poFieldLabel() {
        return this.isCcSelected
            ? 'Purchase Order Number (optional)'
            : 'Purchase Order Number';
    }

    handleMethodChange(event) {
        if (this.isMethodLocked) { return; }
        this.paymentType = event.detail.value;
        this.clearError();
        if (this.isCcSelected) {
            if (!this._sessionRequested && this.amount > 0) {
                this.initCcSession();
            }
        } else {
            // Billing selection is a credit-card-only concern; PO bills to the
            // shipping address, so drop any address picked while CC was active.
            this.selectedBillingAddress = undefined;
        }
        this._publishBilling();
    }

    // ---- PO: file handling (unchanged) ----
    get hasSelectedFile() { return !!this.poFileName; }
    get fileSizeDisplay() {
        if (!this.poFileSize) { return ''; }
        if (this.poFileSize < 1024) { return this.poFileSize + ' B'; }
        if (this.poFileSize < 1024 * 1024) { return (this.poFileSize / 1024).toFixed(1) + ' KB'; }
        return (this.poFileSize / (1024 * 1024)).toFixed(2) + ' MB';
    }

    handleFileSelect(event) {
        const file = event.target.files?.[0];
        if (!file) { return; }

        if (file.size > MAX_FILE_SIZE_BYTES) {
            this.setError('File size exceeds 4 MB. Please select a smaller file.');
            event.target.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const base64 = (e.target.result || '').split(',')[1];
            this.poFileName = file.name;
            this.poFileSize = file.size;
            this.poFileType = file.type || 'application/octet-stream';

            // Publish to capsaOrderReview. File stays in browser memory only.
            publish(this.messageContext, POFILE_CHANNEL, {
                base64: base64,
                fileName: file.name,
                fileType: this.poFileType,
                fileSize: file.size,
                cleared: false
            });
            this.clearError();
        };
        reader.onerror = () => {
            this.setError('Could not read the selected file.');
        };
        reader.readAsDataURL(file);
    }

    handleClearFile() {
        this.poFileName = null;
        this.poFileSize = null;
        this.poFileType = null;
        const input = this.template.querySelector('input[type="file"]');
        if (input) { input.value = ''; }
        publish(this.messageContext, POFILE_CHANNEL, {
            base64: null, fileName: null, fileType: null, fileSize: null, cleared: true
        });
    }

    handlePoChange(event) {
        this.poNumber = event.target.value?.trim();
        this._publishBilling();   // keep order review's PO number in sync
    }

    // ---- CC: hosted session + iframe ----
    get isSimulation() {
        return this.ccConfig?.simulationMode === true;
    }
    get hasToken() { return !!this.paymentToken; }
    get cardLabel() {
        if (!this.maskedCard) { return 'Credit Card'; }
        return `${this.cardBrand || 'Card'} ${this.maskedCard}`;
    }
    get ccTileLabel() {
        return this.authorized
            ? `${this.cardLabel} — authorized`
            : `${this.cardLabel} — ready to authorize`;
    }

    async initCcSession() {
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

    buildIframeUrl(hc) {
        if (!hc?.sessionToken) { return null; }
        if (this.isSimulation) {
            const simParams = new URLSearchParams({
                sessionToken: hc.sessionToken,
                amount: String(hc.amount ?? this.amount ?? ''),
                currency: hc.currencyCode || this.currencyCode || 'USD'
            });
            return `${SIMULATOR_PAGE}?${simParams.toString()}`;
        }
        // REAL MODE: our TokenPay host page (same-origin static resource) loads
        // BridgePay's tokenPay.js, which injects THEIR hosted card fields. The
        // page posts the payment token back with the same message contract the
        // simulator uses, so nothing else in this component changes.
        const params = new URLSearchParams({
            pk: hc.tokenPayPublicKey || '',
            js: hc.tokenPayJsUrl || '',
            amount: String(hc.amount ?? this.amount ?? ''),
            currency: hc.currencyCode || this.currencyCode || 'USD'
        });
        return `${TOKENPAY_HOST_PAGE}?${params.toString()}`;
    }

    handleIframeMessage(event) {
        // Security: the card-entry page is OUR static resource in both modes
        // (simulator or TokenPay host), so the only trusted origin is our own.
        const allowed = window.location.origin;
        if (!allowed || event.origin !== allowed) { return; }

        let payload = event.data;
        if (typeof payload === 'string') {
            try { payload = JSON.parse(payload); } catch (e) { return; }
        }
        if (!payload || !payload.type) { return; }

        switch (payload.type) {
            case MSG_READY:
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

    // ---- Container-driven checkout contract ----
    // TIMING: BOTH payment methods apply only at the FINAL Place Order click
    // (PAYMENT stage), never at Proceed. CC authorizes; PO saves via
    // simplePurchaseOrderPayment. This keeps the method choice switchable when the
    // buyer navigates back from review (applying the PO payment at Proceed used to
    // set poSaved=true and lock the radio, trapping the buyer on PO), and it
    // guarantees only ONE payment is ever applied so PO and CC never conflict.
    stageAction(checkoutStage) {
        switch (checkoutStage) {
            case CheckoutStage.CHECK_VALIDITY_UPDATE:
                // Documented return shape { isValid } — the framework aggregates
                // every component's isValid to enable/disable Place Order. This is
                // the mechanism capsaB2bOrderReview's T&C gate uses (proven to
                // block). For CC this is false until a billing address is picked
                // AND a card token exists, so the order cannot be placed without
                // a billing address.
                return Promise.resolve({ isValid: this.checkValidity() });
            case CheckoutStage.REPORT_VALIDITY_SAVE:
                // Proceed only VALIDATES — no payment is applied yet for either method.
                return Promise.resolve(this.reportValidity());
            case CheckoutStage.PAYMENT:
                if (this.isPreview) { return Promise.resolve(true); }
                // Apply the selected method's payment at Place Order.
                return this.isCcSelected ? this.authorizeCard() : this.savePayment();
            default:
                return Promise.resolve(true);
        }
    }

    @api
    checkValidity() {
        if (this.isPreview) { return true; }
        if (this.isCcSelected) {
            // Card payments require a billing address AND a tokenized card.
            return this.hasToken && !!this.selectedBillingAddress;
        }
        return Boolean(this.poNumber);
    }

    @api
    reportValidity() {
        if (this.isPreview) { return true; }
        if (this.isCcSelected) {
            if (!this.selectedBillingAddress) {
                this._reportBlockingError('Please select a billing address for your card payment.');
                return false;
            }
            if (!this.hasToken) {
                this._reportBlockingError('Please enter your card details to continue.');
                return false;
            }
            this.clearError();
            return true;
        }
        if (this.poNumber) { this.clearError(); return true; }
        this._reportBlockingError('Please enter a purchase order number.');
        return false;
    }

    // Surface a blocking checkout error the same way the shipping component does.
    // dispatchUpdateErrorAsync is what actually HALTS Proceed / Place Order — a
    // bare `return false` alone does not. setError also shows it inline.
    _reportBlockingError(message) {
        this.setError(message);
        this.dispatchUpdateErrorAsync({
            groupId: PAYMENT_GROUP_CODE,
            type: '/commerce/errors/checkout-failure',
            exception: message
        });
    }

    // ---- PO save (UNCHANGED existing behavior) ----
    async savePayment() {
        if (this.isPreview) { return true; }
        if (!this.reportValidity()) { return false; }
        try {
            await this.completePayment();
            this.poSaved = true;
            return true;
        } catch (err) {
            // eslint-disable-next-line no-console
            console.error('CapsaB2bPaymentMethod savePayment error', err);
            this.setError(this._extractMessage(err));
            return false;
        }
    }

    // ---- Payment call: simplePurchaseOrderPayment with normalized billing ----
    async completePayment() {
        const billing = this._normalizeBillingAddress(this.billingAddressForOrder);
        return simplePurchaseOrderPayment(this.checkoutId, this.poNumber, billing);
    }

    // ---- CC authorize at Place Order (auth-only; no capture in Salesforce) ----
    async authorizeCard() {
        if (this.isPreview) { return true; }
        if (!this.reportValidity()) { return false; }
        if (this.authorized) { return true; } // same card already authorized
        if (this.isAuthorizing) { return false; } // duplicate-submission guard

        this.isAuthorizing = true;
        this.clearError();
        try {
            // VERIFIED client-side flow (platform reference implementation):
            // 1) authorize server-side via Apex — the gateway (or simulator) runs
            //    the auth-only verification and returns the gateway TRANSACTION id.
            // 2) hand that small id to postAuthorizePayment; the adapter's
            //    PostAuth branch validates it and the platform creates the
            //    PaymentAuthorization. postAuthorizePayment cannot carry the raw
            //    gateway token — that caused the earlier NoOp/parser failures.
            const auth = await authorizeCardApex({
                token: this.paymentToken,
                amount: this.amount,
                currencyCode: this.currencyCode
            });
            // postAuthorizePayment(checkoutId, gatewayTxnId, billingAddress?): the
            // 2nd arg stays the small gateway transaction id (the verified contract);
            // the optional 3rd arg sets the order's billing address. The platform
            // consumes the billing address — the gateway adapter's PostAuth branch
            // reads only the txn id — so this does not alter the auth flow. Card
            // AVS/billing was already captured in BridgePay's hosted iframe.
            const billing = this._normalizeBillingAddress(this.billingAddressForOrder);
            await postAuthorizePayment(this.checkoutId, auth.id, billing);
            this.authorized = true;
            return true;
        } catch (err) {
            // Full diagnostic to the console; friendly message in the UI.
            // eslint-disable-next-line no-console
            console.error('CapsaB2bPaymentMethod card authorization failed:',
                JSON.stringify(err, Object.getOwnPropertyNames(err)));
            const message = this._extractMessage(err);
            this.paymentToken = null;    // single-use token: force re-entry
            this._sessionRequested = false;
            await this.initCcSession();  // fresh iframe for the retry
            this.setError(message);
            return false;
        } finally {
            this.isAuthorizing = false;
        }
    }

    // ---- Billing address selection (from the embedded billing-address book) ----
    handleBillingSelect(event) {
        this.selectedBillingAddress = event.detail?.address;
        this.clearError();
        this._publishBilling();
    }

    // Publish the effective billing address (what will actually be stamped on the
    // order) so capsaB2bOrderReview's "Bill to" shows exactly the same address.
    // CC = the buyer's selected billing address; PO = the shipping address
    // (billingAddressForOrder already resolves this). Both components are mounted
    // together during checkout, so LMS delivers live.
    _publishBilling() {
        // CC bills to the SELECTED address only (mandatory — no shipping fallback
        // in the display); PO bills to the shipping address.
        const a = (this.isCcSelected ? this.selectedBillingAddress : this.shippingAddress) || {};
        publish(this.messageContext, BILLING_CHANNEL, {
            name: a.name || null,
            street: a.street || null,
            city: a.city || null,
            state: a.region || null,
            postalCode: a.postalCode || null,
            country: a.country || null,
            paymentMethod: this.isCcSelected ? 'Credit Card' : 'Purchase Order',
            poNumber: this.poNumber || null,
            hasBilling: !!(a.street || a.city)
        });
    }

    /** The address applied as billing on the order: the buyer's chosen billing
     *  address, or the shipping address when none has been selected. */
    get billingAddressForOrder() {
        return this.selectedBillingAddress || this.shippingAddress;
    }

    get isBillingSameAsShipping() {
        return !this.selectedBillingAddress;
    }

    /** Formatted billing address for the summary / confirmation line. */
    get billingDisplay() {
        const a = this.billingAddressForOrder;
        if (!a || !(a.street || a.city)) { return null; }
        return {
            name: a.name,
            street: a.street,
            cityLine: [a.city, a.region, a.postalCode].filter(Boolean).join(', '),
            country: a.country
        };
    }

    // ---- Billing address normalization (unchanged) ----
    // Strip empty strings; exclude `name` (Salesforce docs: imperative APIs
    // strip name properties before calling Checkout Connect endpoints).
    _normalizeBillingAddress(addr) {
        if (!addr) { return undefined; }
        const out = {};
        if (addr.street)      { out.street = addr.street; }
        if (addr.city)        { out.city = addr.city; }
        // The payments API expects ISO codes for region/country (AVS/gateway
        // validation). Billing-book records carry stateCode/countryCode ("NY"/"US");
        // the delivery-group address only has region/country, already codes — so
        // prefer the code and fall back to the existing value.
        const region = addr.stateCode || addr.region;
        if (region)           { out.region = region; }
        if (addr.postalCode)  { out.postalCode = addr.postalCode; }
        const country = addr.countryCode || addr.country;
        if (country)          { out.country = country; }
        if (addr.firstName)   { out.firstName = addr.firstName; }
        if (addr.lastName)    { out.lastName = addr.lastName; }
        if (addr.companyName) { out.companyName = addr.companyName; }
        return out;
    }

    // ---- Shared error helpers ----
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
        if (Array.isArray(err.body) && err.body[0]?.message) return err.body[0].message;
        if (err.body?.errors?.[0]?.detail) {
            const d = err.body.errors[0].detail;
            return typeof d === 'string' ? d : (d.message || 'An error occurred.');
        }
        // FetchError from a Checkout Connect endpoint (e.g. POST .../payments):
        // often carries a numeric status with an empty message/errors array.
        if (Array.isArray(err.errors) && err.errors[0]?.detail) return err.errors[0].detail;
        if (err.message) return err.message;
        if (err.status) {
            return `The payment could not be processed (status ${err.status}). Please check your billing details and try again.`;
        }
        return 'An error occurred.';
    }
}
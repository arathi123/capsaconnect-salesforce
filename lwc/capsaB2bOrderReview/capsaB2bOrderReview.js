import { LightningElement, wire, track } from 'lwc';
import {
    useCheckoutComponent,
    CheckoutInformationAdapter,
    CheckoutStage
} from 'commerce/checkoutApi';
import { CartItemsAdapter, CartSummaryAdapter } from 'commerce/cartApi';
import { subscribe, unsubscribe, MessageContext } from 'lightning/messageService';
import { NavigationMixin } from 'lightning/navigation';
import TERMS_PDF from '@salesforce/resourceUrl/CapsaTermsAndConditions';
import POFILE_CHANNEL from '@salesforce/messageChannel/poFileChannel__c';
import BILLING_CHANNEL from '@salesforce/messageChannel/billingAddressChannel__c';
import getOrderReviewData
    from '@salesforce/apex/CapsaB2bOrderReviewController.getOrderReviewData';
import uploadAndStampPoFile
    from '@salesforce/apex/CapsaB2bOrderReviewController.uploadAndStampPoFile';

export default class CapsaB2bOrderReview extends NavigationMixin(useCheckoutComponent(LightningElement)) {

    isAccepted = false;
    termsError = '';

    isPreview = false;
    isSummary = false;

    cartId;
    checkoutId;
    shippingAddress;
    shippingMethod;

    @track cartItems = [];
    @track cartSummary;
    @track reviewData;

    // PO file received from capsaB2bPaymentMethod via LMS, held in memory
    poFileBase64;
    poFileName;
    poFileType;
    poFileSize;

    // Effective billing address received from capsaB2bPaymentMethod via LMS —
    // the SAME address the payment component will stamp on the order (CC = the
    // selected billing address; PO = the shipping address).
    @track billingFromPayment;

    @wire(MessageContext) messageContext;
    subscription;
    billingSubscription;

    connectedCallback() {
        this.isPreview = this.isInSitePreview();
        this.subscribeToPoFileChannel();
        this.subscribeToBillingChannel();
    }

    disconnectedCallback() {
        if (this.subscription) {
            unsubscribe(this.subscription);
            this.subscription = null;
        }
        if (this.billingSubscription) {
            unsubscribe(this.billingSubscription);
            this.billingSubscription = null;
        }
    }

    subscribeToPoFileChannel() {
        if (this.subscription) { return; }
        this.subscription = subscribe(this.messageContext, POFILE_CHANNEL, (msg) => {
            if (msg?.cleared) {
                this.poFileBase64 = null;
                this.poFileName = null;
                this.poFileType = null;
                this.poFileSize = null;
                return;
            }
            this.poFileBase64 = msg?.base64;
            this.poFileName = msg?.fileName;
            this.poFileType = msg?.fileType;
            this.poFileSize = msg?.fileSize;
        });
    }

    subscribeToBillingChannel() {
        if (this.billingSubscription) { return; }
        this.billingSubscription = subscribe(this.messageContext, BILLING_CHANNEL, (msg) => {
            this.billingFromPayment = msg;
        });
    }

    isInSitePreview() {
        const url = document.URL;
        return url.indexOf('sitepreview') > 0
            || url.indexOf('livepreview') > 0
            || url.indexOf('live-preview') > 0
            || url.indexOf('live.') > 0
            || url.indexOf('.builder.') > 0;
    }

    setAspect(newAspect) {
        //const wasSummary = this.isSummary;
        this.isSummary = newAspect?.summary === true;

        if (!this.isSummary && this.cartId) {
            this.loadReviewData();
        }
    }

    async loadReviewData() {
        try {
            this.reviewData = await getOrderReviewData({ cartId: this.cartId });
        } catch (error) {
            console.error('CapsaOrderReview getOrderReviewData', error);
        }
    }

    @wire(CheckoutInformationAdapter, {})
    handleCheckoutInfo({ data, error }) {
        if (this.isPreview || error || !data) {
            if (error) console.error('CapsaOrderReview CheckoutInformationAdapter', error);
            return;
        }
        this.cartId = data.cartSummary.cartId;
        this.checkoutId = data.checkoutId;
        const firstGroup = data?.deliveryGroups?.items?.[0];
        this.shippingAddress = firstGroup?.deliveryAddress;
        this.shippingMethod = firstGroup?.selectedDeliveryMethod;
    }

    @wire(CartItemsAdapter, {})
    handleCartItems({ data, error }) {
        if (this.isPreview || error || !data) {
            if (error) console.error('CapsaOrderReview CartItemsAdapter', error);
            return;
        }
        this.cartItems = data?.cartItems || [];
        console.log('cartItems=>'+JSON.stringify(this.cartItems));
    }

    @wire(CartSummaryAdapter, {})
    handleCartSummary({ data, error }) {
        if (this.isPreview || error || !data) {
            if (error) console.error('CapsaOrderReview CartSummaryAdapter', error);
            return;
        }
        this.cartSummary = data;
        console.log('cartSummary=>'+JSON.stringify(this.cartSummary));
    }

    /*@wire(getOrderReviewData, { cartId: '$cartId' })
    handleReviewData({ data, error }) {
        if (error) {
            console.error('CapsaOrderReview getOrderReviewData', error);
            return;
        }
        if (data) { this.reviewData = data; }
    }*/

    get showContent() { return !this.isPreview && !this.isSummary; }
    get hasItems() { return this.cartItems && this.cartItems.length > 0; }
    get hasPoFile() { return !!this.poFileName && !!this.poFileBase64; }
    // ── Bill-to address ──────────────────────────────────────────
    //  Prefer the effective billing address published by capsaB2bPaymentMethod
    //  (what actually gets stamped on the order); fall back to the account
    //  billing address only until that message arrives.
    get billToStreet() {
        const b = this.billingFromPayment;
        if (b && b.hasBilling) { return b.street || ''; }
        return this.reviewData?.billingStreet || '';
    }

    get billingLine() {
        const b = this.billingFromPayment;
        if (b && b.hasBilling) {
            return [b.city, b.state, b.postalCode].filter(Boolean).join(', ');
        }
        const d = this.reviewData;
        if (!d) { return ''; }
        return [d.billingCity, d.billingState, d.billingPostalCode]
            .filter(Boolean).join(', ');
    }

    get billToCountry() {
        const b = this.billingFromPayment;
        if (b && b.hasBilling) { return b.country || ''; }
        return this.reviewData?.billingCountry || '';
    }

    // ── Payment method / PO number ───────────────────────────────
    //  Prefer the live selection from capsaB2bPaymentMethod (LMS). The payment
    //  is applied only at Place Order now, so WebCart.PoNumber (what
    //  getOrderReviewData reads) isn't set yet during review.
    get reviewPaymentMethod() {
        return this.billingFromPayment?.paymentMethod
            || this.reviewData?.paymentMethod || '';
    }

    get reviewPoNumber() {
        return this.billingFromPayment?.poNumber
            || this.reviewData?.poNumber || '';
    }
    get fileSizeDisplay() {
        if (!this.poFileSize) { return ''; }
        if (this.poFileSize < 1024) { return this.poFileSize + ' B'; }
        if (this.poFileSize < 1024 * 1024) { return (this.poFileSize / 1024).toFixed(1) + ' KB'; }
        return (this.poFileSize / (1024 * 1024)).toFixed(2) + ' MB';
    }

    handleAcceptChange(event) {
        this.isAccepted = event.target.checked;
        if (this.isAccepted) { this.termsError = ''; }
    }

    // Terms and Conditions PDF, hosted as a Salesforce static resource so it no
    // longer depends on the legacy external shop URL. Rendered via a native
    // target="_blank" anchor, so it opens the PDF in a new tab (the browser's
    // PDF viewer) without navigating the buyer away from checkout.
    get termsUrl() {
        return TERMS_PDF;
    }

    // ---- useCheckoutComponent stageAction ----
    // CHECK_VALIDITY_UPDATE: T&C gate — disables the standard Place Order Button
    // REPORT_VALIDITY_SAVE: surfaces T&C error
    // BEFORE_PLACE_ORDER: uploads the PO file (only if buyer selected one) and
    //   stamps WebCart.PO_Content_Document_Id__c. Cart-to-order auto-mapping
    //   then carries the field to Order/OrderSummary at PLACE_ORDER, and the
    //   after-insert triggers create the buyer-visible/internal CDLs.
    //   If upload fails, throwing halts the Place Order — buyer can retry.
    async stageAction(checkoutStage) {
        if (this.isPreview) { return Promise.resolve(true); }

        switch (checkoutStage) {
            case CheckoutStage.CHECK_VALIDITY_UPDATE:
                return Promise.resolve({ isValid: this.isAccepted });

            case CheckoutStage.REPORT_VALIDITY_SAVE:
                if (!this.isAccepted) {
                    this.termsError = 'You must accept the Terms and Conditions to place an order.';
                    return Promise.resolve(false);
                }
                this.termsError = '';
                return Promise.resolve(true);

            case CheckoutStage.BEFORE_PLACE_ORDER:
                if (!this.hasPoFile) {
                    return Promise.resolve(true);  // No PO file — nothing to upload
                }
                try {
                    console.log('cartId=>'+this.cartId+' base64=>'+this.poFileBase64+' poFileName=>'+this.poFileName+' poFileType=>'+this.poFileType);
                    await uploadAndStampPoFile({
                        cartId: this.cartId,
                        base64: this.poFileBase64,
                        fileName: this.poFileName,
                        fileType: this.poFileType
                    });
                    return true;
                } catch (e) {
                    console.error('CapsaOrderReview BEFORE_PLACE_ORDER upload error', e);
                    const msg = e?.body?.message || e?.message || 'PO document upload failed.';
                    // Throwing halts the order placement so the buyer can retry.
                    throw new Error(msg);
                }

            default:
                return Promise.resolve(true);
        }
    }

    handleBack() {
        // Navigate to cart page — Experience Builder named page 'Current_Cart'
        // is the standard B2B cart page. Adjust name if your site uses a custom route.
        this[NavigationMixin.Navigate]({
            type: 'comm__namedPage',
            attributes: { name: 'Current_Cart' }
        });
    }
}
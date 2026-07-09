import { wire } from 'lwc';
import { LightningElement } from 'lwc';
import { useCheckoutComponent,
    CheckoutInformationAdapter,
    updateDeliveryMethod,
    CheckoutStage, waitForCheckout
} from 'commerce/checkoutApi';

// Switch the import + the call in _persist() between Option A and B.
import saveFreightTermsOnGroup from '@salesforce/apex/CapsaB2BShippingMethodController.saveFreightTermsOnGroup';     // Option A
// import saveFreightTermsOnMethod from '@salesforce/apex/B2BShippingMethodController.saveFreightTermsOnMethod'; // Option B

const FREIGHT_TERMS = Object.freeze({
    'FedEx Ground (FDEG)':   ['Third Party Billing', 'Prepaid and Charge'],
    'FedEx Express (FEPL)':  ['Third Party Billing', 'Prepaid and Charge'],
    'UPS':                   ['Third Party Billing'],
    'CPU (Customer Pickup)': ['Fixed Freight'],
    'DHL':                   ['Prepaid and Charge', 'Third Party Billing']
});

const STATUS_READY = 200;
const STATUS_PROCESSING = 202;

export default class CapsaB2bShippingMethod extends useCheckoutComponent(LightningElement) {

    isPreview = false;
    isSummary = false;          // driven by the framework via setAspect()
    checkoutStatus;
    deliveryGroupId;
    availableMethods = [];
    selectedCarrier;
    selectedClass;
    selectedFreight;
    errorMessage;
    lastSavedMethodId;
    lastSavedFreight;
    cartId;
    connectedCallback() {
        this.isPreview = this.isInSitePreview();
    }

    // Framework lifecycle. The checkout layout invokes this on the section's
    // child components when the section toggles between edit and summary.
    // We mirror the flag into local state so getters can react.
    setAspect(newAspect) {
        this.isSummary = newAspect?.summary === true;
    }

    @wire(CheckoutInformationAdapter, {})
    checkoutInfo({ data, error }) {
        if (this.isPreview) { return; }
        if (error) { this.errorMessage = this._err(error); return; }
        if (!data) { return; }

        this.checkoutStatus = data.checkoutStatus;
        this.cartId = data.cartSummary.cartId;
        const group = data.deliveryGroups?.items?.[0];
        if (!group) { return; }

        this.deliveryGroupId = group.id;
        this.availableMethods = group.availableDeliveryMethods || [];
        console.log('availableMethods=>'+JSON.stringify(this.availableMethods));
        const sel = group.selectedDeliveryMethod;
        if (sel) {
            this.selectedCarrier = sel.carrier;
            this.selectedClass = sel.classOfService;
            this.lastSavedMethodId = sel.id;
        }
    }

    // Editable only when adapter is ready, not in builder preview,
    // and the framework hasn't switched us to summary mode.
    get isReady() {
        return !this.isPreview
            && this.checkoutStatus === STATUS_READY
            && !this.isSummary;
    }
    get isProcessing() { return this.checkoutStatus === STATUS_PROCESSING; }

    get carrierOptions() {
        const seen = new Set(); const out = [];
        for (const m of this.availableMethods) {
            if (m.carrier && !seen.has(m.carrier)) {
                seen.add(m.carrier);
                out.push({ label: m.carrier, value: m.carrier });
            }
        }
        return out;
    }
    get classOptions() {
        if (!this.selectedCarrier) return [];
        return this.availableMethods
            .filter(m => m.carrier === this.selectedCarrier && m.classOfService)
            .map(m => ({ label: m.classOfService, value: m.classOfService }));
    }
    get freightOptions() {
        if (!this.selectedCarrier) return [];
        return (FREIGHT_TERMS[this.selectedCarrier] || [])
            .map(v => ({ label: v, value: v }));
    }

    get carrierDisabled() { return !this.isReady; }
    get classDisabled()   { return !this.isReady || !this.selectedCarrier; }
    get freightDisabled() { return !this.isReady || !this.selectedCarrier; }

    get methodId() {
        return this.availableMethods.find(m =>
            m.carrier === this.selectedCarrier &&
            m.classOfService === this.selectedClass)?.id;
    }
    get complete()    { return !!(this.methodId && this.selectedFreight); }
    get showSummary() { return this.isSummary && this.complete; }

    // Hide the freight-charge disclaimer when Third Party Billing is selected
    get showDisclaimer() {
        return (this.selectedFreight || '').toLowerCase() !== 'third party billing';
    }

    handleCarrierChange(e) {
        this.selectedCarrier = e.detail.value;
        this.selectedClass = undefined;
        this.selectedFreight = undefined;
    }
    handleClassChange(e)   { this.selectedClass = e.detail.value; }
    handleFreightChange(e) { this.selectedFreight = e.detail.value; }

    stageAction(checkoutStage) {
        switch (checkoutStage) {
            case CheckoutStage?.CHECK_VALIDITY_UPDATE:
                return Promise.resolve(this.complete);
            case CheckoutStage?.REPORT_VALIDITY_SAVE:
                return this._persist();
            default:
                return Promise.resolve(true);
        }
    }

    async _persist() {
        if (!this.complete) { return false; }
        this.errorMessage = null;

        const methodUnchanged  = this.methodId       === this.lastSavedMethodId;
        const freightUnchanged = this.selectedFreight === this.lastSavedFreight;

        if (methodUnchanged && freightUnchanged) {
            console.log('_persist: no change, skipping all saves');
            return true;
        }

        try {
            // 1. Update delivery method via storefront API — only if it changed
            if (!methodUnchanged) {
                console.log('inside _persist - updateDeliveryMethod');
                await updateDeliveryMethod(this.methodId);
                console.log('post updateDeliveryMethod');
                await waitForCheckout();
                this.lastSavedMethodId = this.methodId;   // <-- moved here
            }

            // 2. Save freight terms via Apex — only if it changed
            if (!freightUnchanged) {
                console.log('inside _persist - saveFreightTermsOnGroup');
                await saveFreightTermsOnGroup({
                    cartDeliveryGroupId: this.deliveryGroupId,
                    freightTerms: this.selectedFreight,
                    cartId : this.cartId
                });
                console.log('post saveFreightTermsOnGroup');
                this.lastSavedFreight = this.selectedFreight;   // <-- moved here
            }

            return true;
        } catch (err) {
            this.errorMessage = this._err(err);
            return false;
        }
    }

    isInSitePreview() {
        const url = document.URL;
        return url.indexOf('sitepreview') > 0
            || url.indexOf('livepreview') > 0
            || url.indexOf('live-preview') > 0
            || url.indexOf('live.') > 0
            || url.indexOf('.builder.') > 0;
    }

    _err(e) { return e?.body?.message || e?.message || 'Could not load checkout.'; }
}
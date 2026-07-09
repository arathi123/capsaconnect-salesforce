import { api, wire, track } from 'lwc';
import LightningModal from 'lightning/modal';
import { getObjectInfo, getPicklistValues } from 'lightning/uiObjectInfoApi';
import CONTACTPOINTADDRESS_OBJECT from '@salesforce/schema/ContactPointAddress';
import STATE_CODE_FIELD from '@salesforce/schema/ContactPointAddress.StateCode';

export default class CapsaB2bShippingAddressModal extends LightningModal {
    @api address = {};

    @track name = '';
    country = 'US';        // hardcoded + disabled
    @track street = '';
    @track city = '';
    @track region = '';
    @track postalCode = '';
    @track isDefault = false;

    @track allStateOptions = [];
    cpaRecordTypeId;

    connectedCallback() {
        const a = this.address || {};
        this.name       = a.name       || '';
        this.street     = a.street     || '';
        this.city       = a.city       || '';
        // region may arrive as a state name ("California") or code ("CA");
        // stateOptions / regionCode normalize either form for display + save.
        this.region     = a.region     || '';
        this.postalCode = a.postalCode || '';
        this.isDefault  = a.isDefault  || false;
    }

    // ─── Get default record type for ContactPointAddress ──
    @wire(getObjectInfo, { objectApiName: CONTACTPOINTADDRESS_OBJECT })
    objectInfo({ data }) {
        if (data) this.cpaRecordTypeId = data.defaultRecordTypeId;
    }

    // ─── Get state picklist values (dependent on country) ──
    @wire(getPicklistValues, {
        recordTypeId: '$cpaRecordTypeId',
        fieldApiName: STATE_CODE_FIELD
    })
    statePicklistValues({ data }) {
        if (data) {
            // Filter only states valid for US
            const usValidForIndex = data.controllerValues['US'];
            this.allStateOptions = data.values
                .filter(v => v.validFor.includes(usValidForIndex))
                .map(v => ({ label: v.label, value: v.value }));
        }
    }

    // State options for the native <select>, with --None-- and the
    // currently-selected value flagged (native select needs `selected`
    // on the option, not a value attribute). Match on code OR name so a
    // stored State name ("California") selects the right option even though
    // the picklist values are codes ("CA").
    get stateOptions() {
        const opts = [{ label: '--None--', value: '', selected: !this.region }];
        for (const o of this.allStateOptions) {
            const isSelected = o.value === this.region || o.label === this.region;
            opts.push({ label: o.label, value: o.value, selected: isSelected });
        }
        return opts;
    }

    // Normalize the working region (name or code) to the StateCode value the
    // ContactPointAddress adapters expect on save.
    get regionCode() {
        if (!this.region) return '';
        const match = this.allStateOptions.find(
            o => o.value === this.region || o.label === this.region
        );
        return match ? match.value : this.region;
    }

    get isSaveDisabled() {
        return !(this.name &&
                 this.street && this.city && this.region && this.postalCode);
    }

    handleChange(event) {
        const field = event.target.dataset.field;
        this[field] = event.target.value;
    }

    handleDefaultChange(event) {
        this.isDefault = event.target.checked;
    }

    handleCancel() {
        this.close({ changed: false });
    }

    handleSave() {
        if (this.isSaveDisabled) return;

        this.close({
            changed: true,
            address: {
                name:       this.name,
                country:    this.country,
                street:     this.street,
                city:       this.city,
                region:     this.regionCode,
                postalCode: this.postalCode,
                isDefault:  this.isDefault
            }
        });
    }
}
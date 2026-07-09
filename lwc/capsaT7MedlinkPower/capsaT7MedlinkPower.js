import { LightningElement, track, api } from 'lwc';
import getOptionsByStepAndFamily from '@salesforce/apex/CartConfiguratorController.getOptionsByStepAndFamily';

export default class CapsaT7MedlinkPower extends LightningElement {

    @api productType = 'T7MedLink';

    @track rawPowerOptions = [];
    @track rawCableOptions = [];

    @track selectedPower = '';
    @track selectedCable = '';

    @track hoveredCableKey = '';
    @track isLoading = true;

    @track currentPreviewImage =
        '/resource/T7MedLink/T7MedLink2/T7MedLink4.png';

    connectedCallback() {
        this.fetchAllMetadata();
    }

    // -----------------------------
    // FETCH
    // -----------------------------
    async fetchAllMetadata() {
        try {
            const [powerData, cableData] = await Promise.all([
                getOptionsByStepAndFamily({
                    stepKey: 'Power',
                    productFamily: this.productType
                }),
                getOptionsByStepAndFamily({
                    stepKey: 'Power Input Cable',
                    productFamily: this.productType
                })
            ]);

            this.rawPowerOptions = (powerData || []).map(opt => ({
                ...opt,
                isSelected: false,
                isVisible: false,
                rowClass: 'option-row'
            }));

            this.rawCableOptions = cableData || [];

        } finally {
            this.isLoading = false;
        }
    }

    // -----------------------------
    // POWER
    // -----------------------------
    handlePowerSelect(event) {
        const key = event.currentTarget.dataset.key;

        if (this.selectedPower === key) return;

        this.selectedPower = key;
        this.selectedCable = '';

        this.rawPowerOptions = this.rawPowerOptions.map(opt => ({
            ...opt,
            isSelected: opt.Option_Key__c === key,
            isVisible: opt.Option_Key__c === key,
            rowClass: opt.Option_Key__c === key
                ? 'option-row selected'
                : 'option-row'
        }));
    }

    handlePowerMouseEnter(e) {
        const key = e.currentTarget.dataset.key;

        this.rawPowerOptions = this.rawPowerOptions.map(opt => ({
            ...opt,
            isVisible:
                opt.Option_Key__c === key ||
                opt.Option_Key__c === this.selectedPower
        }));
    }

    handlePowerMouseLeave() {
        this.rawPowerOptions = this.rawPowerOptions.map(opt => ({
            ...opt,
            isVisible: opt.Option_Key__c === this.selectedPower
        }));
    }

    // -----------------------------
    // ✅ FULL CABLE FILTER
    // -----------------------------
    get visibleCableOptions() {

        if (!this.selectedPower) return [];

        let filtered = [];

        if (this.selectedPower === 'N') {
            filtered = this.rawCableOptions.filter(o => o.Option_Key__c === 'N');
        }
        else if (this.selectedPower === 'I') {
            filtered = this.rawCableOptions.filter(o =>
                !['N','P','Q'].includes(o.Option_Key__c)
            );
        }
        else if (this.selectedPower === '-') {
            filtered = this.rawCableOptions.filter(o =>
                ['P','Q'].includes(o.Option_Key__c)
            );
        }

        return filtered.map(opt => {
            const isSelected = opt.Option_Key__c === this.selectedCable;

            return {
                ...opt,
                isSelected,
                isVisible:
                    isSelected || opt.Option_Key__c === this.hoveredCableKey,
                rowClass: isSelected
                    ? 'option-row selected'
                    : 'option-row'
            };
        });
    }

    // -----------------------------
    // CABLE EVENTS
    // -----------------------------
    handleCableSelect(e) {
        this.selectedCable = e.currentTarget.dataset.key;
    }

    handleCableMouseEnter(e) {
        this.hoveredCableKey = e.currentTarget.dataset.key;
    }

    handleCableMouseLeave() {
        this.hoveredCableKey = '';
    }

    // -----------------------------
    // VALIDATION
    // -----------------------------
    get isStepComplete() {
        return this.selectedPower &&
               (this.selectedPower === '-' || this.selectedCable);
    }

    // -----------------------------
    // NEXT
    // -----------------------------
    handleNext() {

        const payload = [];

        const power = this.rawPowerOptions.find(
            p => p.Option_Key__c === this.selectedPower
        );

        const cable = this.rawCableOptions.find(
            c => c.Option_Key__c === this.selectedCable
        );

        if (power) {
            payload.push({
                key: power.Option_Key__c,
                label: power.Option_Label__c,
                sku: null
            });
        }

        if (cable) {
            payload.push({
                key: cable.Option_Key__c,
                label: cable.Option_Label__c,
                sku: cable.Option_Key__c
            });
        }

        this.dispatchEvent(new CustomEvent('stepcomplete', {
            detail: { POWER: payload, overrideNext: 'BatteryType' }
        }));
    }

    get filteredPowerOptions() {
        return this.rawPowerOptions;
    }
}
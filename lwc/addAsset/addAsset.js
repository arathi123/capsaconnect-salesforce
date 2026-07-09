import { LightningElement, api, wire, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { refreshApex } from '@salesforce/apex';
import LightningConfirm from 'lightning/confirm';
import createCaseAsset  from '@salesforce/apex/AddAssetController.createCaseAsset';
import deleteCaseAsset  from '@salesforce/apex/AddAssetController.deleteCaseAsset';
import getCaseAssets    from '@salesforce/apex/AddAssetController.getCaseAssets';
import computeWarranty    from '@salesforce/apex/AddAssetController.computeWarranty';
import getAssetDetails    from '@salesforce/apex/AddAssetController.getAssetDetails';
import getCasesForAsset      from '@salesforce/apex/AddAssetController.getCasesForAsset';
import getCaseCountsByAsset  from '@salesforce/apex/AddAssetController.getCaseCountsByAsset';

export default class AddAsset extends LightningElement {
    @api recordId;

    // ─── Asset Picker State ───────────────────────────────────────
    @track selectedAssetId;
    @track selectedAssetDetails = null;

    // ─── Mandatory Case_Asset__c Fields ──────────────────────────
    @track technicianRequired = false;
    @track warranty           = false;

    // ─── Add-button Loading State ─────────────────────────────────
    @track isAdding = false;

    // ─── Related Case Assets State ────────────────────────────────
    @track caseAssets = [];
    @track wireError;

    // ─── Inline Edit State ────────────────────────────────────────
    @track expandedRowId = null;

    // ─── Cases Hover Popover State ────────────────────────────────
    @track popoverAssetId   = null;
    @track hoveredCases     = [];
    @track isLoadingCases   = false;
    _caseCache              = new Map();
    _caseCounts             = {};

    _wiredResult;

    // ─── Wire ─────────────────────────────────────────────────────
    @wire(getCaseAssets, { caseId: '$recordId' })
    wiredCaseAssets(result) {
        this._wiredResult = result;
        if (result.data) {
            this.caseAssets = result.data.map(ca => this._flattenCaseAsset(ca));
            this.wireError  = undefined;
            const assetIds  = [...new Set(result.data.map(ca => ca.Asset__c))];
            if (assetIds.length > 0) this._loadCaseCounts(assetIds);
        } else if (result.error) {
            this.wireError  = result.error;
            this.caseAssets = [];
        }
    }

    _loadCaseCounts(assetIds) {
        getCaseCountsByAsset({ assetIds })
            .then(counts => {
                const map = {};
                counts.forEach(c => { map[c.assetId] = c.caseCount; });
                this._caseCounts = map;
                if (this._wiredResult.data) {
                    this.caseAssets = this._wiredResult.data.map(ca => this._flattenCaseAsset(ca));
                }
            })
            .catch(() => {});
    }

    // ─── Handlers ─────────────────────────────────────────────────

    handleAssetSelection(event) {
        this.selectedAssetId      = event.detail.recordId || null;
        this.technicianRequired   = false;
        this.warranty             = false;
        this.selectedAssetDetails = null;

        if (this.selectedAssetId) {
            computeWarranty({ caseId: this.recordId, assetId: this.selectedAssetId })
                .then(result => { this.warranty = result; })
                .catch(() => { this.warranty = false; });

            getAssetDetails({ assetId: this.selectedAssetId })
                .then(result => { this.selectedAssetDetails = result; })
                .catch(() => { this.selectedAssetDetails = null; });
        }
    }

    handleTechnicianRequired(event) {
        this.technicianRequired = event.target.checked;
    }

    handleWarranty(event) {
        this.warranty = event.target.checked;
    }

    handleToggleExpand(event) {
        const id = event.currentTarget.dataset.id;
        this.expandedRowId = this.expandedRowId === id ? null : id;
    }

    async handleDelete(event) {
        const id = event.currentTarget.dataset.id;
        const confirmed = await LightningConfirm.open({
            message: 'Remove this asset from the case? This cannot be undone.',
            variant: 'headerless',
            label:   'Confirm Delete'
        });
        if (!confirmed) return;
        try {
            await deleteCaseAsset({ caseAssetId: id });
            if (this.expandedRowId === id) this.expandedRowId = null;
            this._showToast('Deleted', 'Asset removed from case.', 'success');
            await refreshApex(this._wiredResult);
        } catch (error) {
            this._showToast('Error', this._extractMessage(error), 'error');
        }
    }

    handleCaseHoverEnter(event) {
        const assetId = event.currentTarget.dataset.assetid;
        this.popoverAssetId = assetId;
        if (this._caseCache.has(assetId)) {
            this.hoveredCases   = this._caseCache.get(assetId);
            this.isLoadingCases = false;
            return;
        }
        this.isLoadingCases = true;
        this.hoveredCases   = [];
        getCasesForAsset({ assetId })
            .then(result => {
                this._caseCache.set(assetId, result);
                if (this.popoverAssetId === assetId) {
                    this.hoveredCases = result;
                }
            })
            .catch(() => { this.hoveredCases = []; })
            .finally(() => { this.isLoadingCases = false; });
    }

    handleCaseHoverLeave() {
        this.popoverAssetId = null;
    }

    handleEditSuccess() {
        this.expandedRowId = null;
        this._showToast('Saved', 'Case asset updated successfully.', 'success');
        refreshApex(this._wiredResult);
    }

    closeInlineEdit() {
        this.expandedRowId = null;
    }

    handleAddAsset() {
        if (!this.selectedAssetId || this.isAdding) return;
        this.isAdding = true;
        createCaseAsset({
            caseId:             this.recordId,
            assetId:            this.selectedAssetId,
            technicianRequired: this.technicianRequired,
            warranty:           this.warranty
        })
            .then(() => {
                this._showToast('Success', 'Asset linked to case successfully.', 'success');
                this.selectedAssetId      = null;
                this.technicianRequired   = false;
                this.warranty             = false;
                this.selectedAssetDetails = null;
                this.template.querySelector('lightning-record-picker').clearSelection();
                return refreshApex(this._wiredResult);
            })
            .catch(error => {
                this._showToast('Error', this._extractMessage(error), 'error');
            })
            .finally(() => {
                this.isAdding = false;
            });
    }

    // ─── Private Helpers ──────────────────────────────────────────

    _flattenCaseAsset(ca) {
        const asset = ca.Asset__r || {};
        return {
            Id:                                  ca.Id,
            assetId:                             ca.Asset__c,
            caseCount:                           this._caseCounts[ca.Asset__c] ?? null,
            assetName:                           asset.Name || '—',
            assetUrl:                            '/' + ca.Asset__c,
            assetRecordType:                     asset.RecordType?.DeveloperName || '',
            warranty:                            ca.Warrenty__c || false,
            technicianRequired:                  ca.Technician_Required__c || false,
            standardMechanicalEndDate:           asset.Standard_Mechanical_End_Date__c || null,
            extendedMechanicalEndDate:           asset.Extended_Mechanical_End_Date__c || null,
            standardElectricalEndDate:           asset.Standard_Electrical_End_Date__c || null,
            extendedElectricalEndDate:           asset.Extended_Electrical_End_Date__c || null,
            standardBatteryEndDate:              asset.Standard_Battery_End_Date__c || null,
            extendedBatteryEndDate:              asset.Extended_Battery_End_Date__c || null,
            hardwareWarrantyEnd:                 asset.Warranty_End__c || null,
            extendedSoftwareHardwareWarrantyEnd: asset.Extended_Warranty_End__c || null,
            standardDrugImagingEnd:              asset.Standard_Drug_Imaging_End__c || null,
            extendedDrugImagingEnd:              asset.Extended_Drug_Imaging_End__c || null
        };
    }

    _showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }

    _extractMessage(error) {
        if (!error) return 'An unknown error occurred.';
        if (typeof error === 'string') return error;
        if (error.body) {
            if (Array.isArray(error.body)) return error.body.map(e => e.message).join(', ');
            if (typeof error.body === 'object') return error.body.message || 'An unknown error occurred.';
        }
        return error.message || 'An unknown error occurred.';
    }

    // ─── Getters ──────────────────────────────────────────────────

    _enrichRows(rows) {
        return rows.map((row, idx) => {
            const expanded = row.Id === this.expandedRowId;
            return {
                ...row,
                rowNumber:        idx + 1,
                isExpanded:       expanded,
                editKey:          row.Id + '_edit',
                toggleIcon:       expanded ? 'utility:chevrondown' : 'utility:chevronright',
                toggleTitle:      expanded ? 'Collapse' : 'Expand',
                showCasesPopover:  row.assetId === this.popoverAssetId,
                caseCountLabel:    row.caseCount !== null ? '' + row.caseCount : '…'
            };
        });
    }

    get noCasesFound() {
        return !this.isLoadingCases && this.hoveredCases.length === 0;
    }

    get popoverCasesTitle() {
        if (this.isLoadingCases) return 'Cases';
        return 'Cases (' + this.hoveredCases.length + ')';
    }

    get capsaAssets() {
        return this.caseAssets.filter(ca => ca.assetRecordType === 'Capsa_Asset');
    }

    get kirbyAssets() {
        return this.caseAssets.filter(ca => ca.assetRecordType === 'Kirby_Asset');
    }

    get capsaRows() {
        return this._enrichRows(this.capsaAssets);
    }

    get kirbyRows() {
        return this._enrichRows(this.kirbyAssets);
    }

    get hasCapsaAssets() {
        return this.capsaAssets.length > 0;
    }

    get hasKirbyAssets() {
        return this.kirbyAssets.length > 0;
    }

    get hasAssets() {
        return this.hasCapsaAssets || this.hasKirbyAssets;
    }

    get isAddDisabled() {
        return !this.selectedAssetId || this.isAdding;
    }

    get hasWireError() {
        return !!this.wireError;
    }

    get wireErrorMessage() {
        return this._extractMessage(this.wireError);
    }

    get selectedAssetRecordTypeName() {
        return this.selectedAssetDetails?.RecordType?.Name || null;
    }

    get isCapsaAsset() {
        return this.selectedAssetDetails?.RecordType?.DeveloperName === 'Capsa_Asset';
    }

    get isKirbyAsset() {
        return this.selectedAssetDetails?.RecordType?.DeveloperName === 'Kirby_Asset';
    }
}
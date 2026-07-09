import { LightningElement, api, track } from 'lwc';
import getOptionsByStepAndFamily
from '@salesforce/apex/CartConfiguratorController.getOptionsByStepAndFamily';

const STORAGE_LABEL_MAP = {

    XP_LOCK    : 'XP Locking Module',
    RX_LOCK    : 'RX Locking Module',
    RX_XP_LOCK : 'RX & XP Locking Module',

    MAXBIN_1 : 'MaxBin 1 Tier Storage',
    MAXBIN_2 : 'MaxBin 2 Tier Storage',
    MAXBIN_3 : 'MaxBin 3 Tier Storage',
    MAXBIN_4 : 'MaxBin 4 Tier Storage',
    MAXBIN_5 : 'MaxBin 5 Tier Storage'

};

const STORAGE_SKU_MAP = {

    XP_LOCK    : '207126',
    RX_LOCK    : '207127',
    RX_XP_LOCK : '207127 & 207126',

    MAXBIN_1 : '207106',
    MAXBIN_2 : '207107',
    MAXBIN_3 : '207108',
    MAXBIN_4 : '207109',
    MAXBIN_5 : '207110 & 207110 & 207104'

};

export default class TrioStorageSecurity extends LightningElement {

    @api productType = 'Trio';
    @api selections;

    @track storageOptions = [];
    @track binSystemOptions = [];
    @track dualLockOptions = [];
    @track binColorOptions = [];
    @track binTypeOptions = [];

    @track selectedStorage = '';
    @track selectedBinSystem = '';
    @track selectedDualLock = '';
    @track selectedBinColor = '';
    @track selectedBinType = '';

    @track currentPreviewImage =
        '/resource/trioImagePart1/trioImagePart1/documentation.jpg';

    @track isLoading = true;

    connectedCallback() {
        this.loadMetadata();
    }

    async loadMetadata() {

        try {

            const [
                storageData,
                binSystemData,
                dualLockData,
                binColorData,
                binTypeData
            ] = await Promise.all([

                getOptionsByStepAndFamily({
                    stepKey: 'STORAGE TYPE',
                    productFamily: this.productType
                }),

                getOptionsByStepAndFamily({
                    stepKey: 'BIN SYSTEM',
                    productFamily: this.productType
                }),

                getOptionsByStepAndFamily({
                    stepKey: 'DUAL LOCKING',
                    productFamily: this.productType
                }),

                getOptionsByStepAndFamily({
                    stepKey: 'BIN COLOR',
                    productFamily: this.productType
                }),

                getOptionsByStepAndFamily({
                    stepKey: 'BIN TYPE',
                    productFamily: this.productType
                })
            ]);

            this.storageOptions =
                (storageData || []).map(opt => ({
                    ...opt,
                    isVisible: false,
                    isSelected: false,
                    rowClass: 'option-row'
                }));

            this.binSystemOptions =
                (binSystemData || []).map(opt => ({
                    ...opt,
                    isVisible: false,
                    isSelected: false,
                    rowClass: 'option-row'
                }));

            this.dualLockOptions =
                (dualLockData || []).map(opt => ({
                    ...opt,
                    isVisible: false,
                    isSelected: false,
                    rowClass: 'option-row'
                }));

            this.binColorOptions =
                (binColorData || []).map(opt => ({
                    ...opt,
                    isVisible: false,
                    isSelected: false,
                    rowClass: 'option-row'
                }));

            this.binTypeOptions =
                (binTypeData || []).map(opt => ({
                    ...opt,
                    isSelected: false,
                    cardClass: 'drawer-card'
                }));

        }
        catch(error) {

            console.error(
                'TRIO STORAGE ERROR',
                JSON.stringify(error)
            );
        }
        finally {

            this.isLoading = false;
        }
    }

    // =====================================
    // STORAGE
    // =====================================

    handleStorageSelect(event) {

        this.selectedStorage =
            event.currentTarget.dataset.key;

        this.selectedBinSystem = '';
        this.selectedDualLock = '';
        this.selectedBinColor = '';
        this.selectedBinType = '';

        this.syncStorageUI();
        this.resetChildrenUI();
    }

    syncStorageUI() {

        this.storageOptions =
            this.storageOptions.map(opt => {

                const isSelected =
                    opt.Option_Key__c ===
                    this.selectedStorage;

                return {
                    ...opt,
                    isSelected,
                    isVisible: isSelected,
                    rowClass:
                        isSelected
                            ? 'option-row selected'
                            : 'option-row'
                };
            });
    }

    // =====================================
    // BIN SYSTEM
    // =====================================

    handleBinSystemSelect(event) {

        this.selectedBinSystem =
            event.currentTarget.dataset.key;

        this.selectedDualLock = '';
        this.selectedBinColor = '';
        this.selectedBinType = '';

        this.syncBinSystemUI();
    }

    syncBinSystemUI() {

        this.binSystemOptions =
            this.binSystemOptions.map(opt => {

                const isSelected =
                    opt.Option_Key__c ===
                    this.selectedBinSystem;

                return {
                    ...opt,
                    isSelected,
                    isVisible: isSelected,
                    rowClass:
                        isSelected
                            ? 'option-row selected'
                            : 'option-row'
                };
            });
    }

    // =====================================
    // DUAL LOCK
    // =====================================

    handleDualLockSelect(event) {

        this.selectedDualLock =
            event.currentTarget.dataset.key;

        this.selectedBinType = '';

        this.syncDualLockUI();
    }

    syncDualLockUI() {

        this.dualLockOptions =
            this.dualLockOptions.map(opt => {

                const isSelected =
                    opt.Option_Key__c ===
                    this.selectedDualLock;

                return {
                    ...opt,
                    isSelected,
                    isVisible: isSelected,
                    rowClass:
                        isSelected
                            ? 'option-row selected'
                            : 'option-row'
                };
            });
    }

    // =====================================
    // BIN COLOR
    // =====================================

    handleBinColorSelect(event) {

        this.selectedBinColor =
            event.currentTarget.dataset.key;

        this.selectedBinType = '';

        this.syncBinColorUI();
    }

    syncBinColorUI() {

        this.binColorOptions =
            this.binColorOptions.map(opt => {

                const isSelected =
                    opt.Option_Key__c ===
                    this.selectedBinColor;

                return {
                    ...opt,
                    isSelected,
                    isVisible: isSelected,
                    rowClass:
                        isSelected
                            ? 'option-row selected'
                            : 'option-row'
                };
            });
    }

    // =====================================
    // BIN TYPE
    // =====================================

    handleBinTypeSelect(event) {

        this.selectedBinType =
            event.currentTarget.dataset.key;

        this.syncBinTypeUI();
    }

    syncBinTypeUI() {

        this.binTypeOptions =
            this.binTypeOptions.map(opt => {

                const isSelected =
                    opt.Option_Key__c ===
                    this.selectedBinType;

                return {
                    ...opt,
                    isSelected,
                    cardClass:
                        isSelected
                            ? 'drawer-card selected'
                            : 'drawer-card'
                };
            });
    }

    resetChildrenUI() {

        this.syncBinSystemUI();
        this.syncDualLockUI();
        this.syncBinColorUI();
        this.syncBinTypeUI();
    }

        // =====================================
    // SECTION VISIBILITY
    // =====================================

    get showBinSystemSection() {

        return (
            this.selectedStorage === 'NON_LOCK' ||
            this.selectedStorage === 'ELECTRIC_LOCK'
        );
    }

    get showDualLockSection() {

        return (
            this.selectedStorage === 'ELECTRIC_LOCK' &&
            this.selectedBinSystem === 'MAXBIN'
        );
    }

    get showBinColorSection() {

        if (
            this.selectedStorage === 'NON_LOCK' &&
            this.selectedBinSystem
        ) {
            return true;
        }

        if (
            this.selectedStorage === 'ELECTRIC_LOCK' &&
            this.selectedBinSystem === 'STANDARD'
        ) {
            return true;
        }

        return false;
    }

    get showBinTypeSection() {

        if (
            this.selectedStorage === 'NO_STORAGE'
        ) {
            return true;
        }

        if (
            this.selectedStorage === 'NON_LOCK' &&
            this.selectedBinColor
        ) {
            return true;
        }

        if (
            this.selectedStorage === 'ELECTRIC_LOCK' &&
            this.selectedBinSystem === 'STANDARD' &&
            this.selectedBinColor
        ) {
            return true;
        }

        if (
            this.selectedStorage === 'ELECTRIC_LOCK' &&
            this.selectedBinSystem === 'MAXBIN' &&
            this.selectedDualLock
        ) {
            return true;
        }

        return false;
    }

    // =====================================
    // FILTER BIN TYPES
    // =====================================

    get filteredBinTypes() {

        let keys = [];

        if (this.selectedStorage === 'NO_STORAGE') {

            keys = [
                'DOC_CART'
            ];
        }

        else if (
            this.selectedStorage === 'NON_LOCK' &&
            this.selectedBinSystem === 'STANDARD'
        ) {

            keys = [
                'XP_NON_LOCK',
                'RX_NON_LOCK',
                'RX_XP_LOCK'
            ];
        }

        else if (
            this.selectedStorage === 'ELECTRIC_LOCK' &&
            this.selectedBinSystem === 'STANDARD'
        ) {

            keys = [
                'XP_LOCK',
                'RX_LOCK',
                'RX_XP_LOCK'
            ];
        }

        else if (
            this.selectedStorage === 'NON_LOCK' &&
            this.selectedBinSystem === 'MAXBIN'
        ) {

            keys = [
                'MAXBIN_1',
                'MAXBIN_2',
                'MAXBIN_3',
                'MAXBIN_4',
                'MAXBIN_5'
            ];
        }

        else if (
            this.selectedStorage === 'ELECTRIC_LOCK' &&
            this.selectedBinSystem === 'MAXBIN' &&
            this.selectedDualLock === 'NO'
        ) {

            keys = [
                'MAXBIN_1',
                'MAXBIN_2',
                'MAXBIN_3',
                'MAXBIN_4',
                'MAXBIN_5'
            ];
        }

        else if (
            this.selectedStorage === 'ELECTRIC_LOCK' &&
            this.selectedBinSystem === 'MAXBIN' &&
            this.selectedDualLock === 'YES'
        ) {

            keys = [
                'MAXBIN_1',
                'MAXBIN_2',
                'MAXBIN_3',
                'MAXBIN_4',
                'MAXBIN_5'
            ];
        }

        return this.binTypeOptions
            .filter(opt =>
                keys.includes(opt.Option_Key__c)
            )
            .map(opt => {

                const isSelected =
                    opt.Option_Key__c ===
                    this.selectedBinType;

                return {
                    ...opt,
                    isSelected,
                    cardClass:
                        isSelected
                            ? 'drawer-card selected'
                            : 'drawer-card'
                };
            });
    }
    // =====================================
    // STEP COMPLETE
    // =====================================

    get isStepComplete() {

        if (
            this.selectedStorage === 'NO_STORAGE'
        ) {

            return (
                this.selectedBinType !== ''
            );
        }

        if (
            this.selectedStorage === 'NON_LOCK'
        ) {

            return (
                this.selectedBinSystem !== '' &&
                this.selectedBinColor !== '' &&
                this.selectedBinType !== ''
            );
        }

        if (
            this.selectedStorage === 'ELECTRIC_LOCK' &&
            this.selectedBinSystem === 'STANDARD'
        ) {

            return (
                this.selectedBinColor !== '' &&
                this.selectedBinType !== ''
            );
        }

        if (
            this.selectedStorage === 'ELECTRIC_LOCK' &&
            this.selectedBinSystem === 'MAXBIN'
        ) {

            return (
                this.selectedDualLock !== '' &&
                this.selectedBinType !== ''
            );
        }

        return false;
    }

    // =====================================
    // NEXT
    // =====================================

    handleNext() {

        const payload = [];

        const addItem = (options, key, prefix = '', useKeyAsSku = false) => {

            if (!key) {
                return;
            }

            const rec = options.find(
                x => x.Option_Key__c === key
            );

            if (!rec) {
                return;
            }

            payload.push({

                key: rec.Option_Key__c,

                label: prefix
                    ? `${prefix}: ${rec.Option_Label__c}`
                    : rec.Option_Label__c,

                sku: useKeyAsSku
                    ? rec.Option_Key__c
                    : null

            });

        };

        // Storage Type
        addItem(
            this.storageOptions,
            this.selectedStorage
        );

        // Bin System
        addItem(
            this.binSystemOptions,
            this.selectedBinSystem,
            'Bin System'
        );

        // Dual Lock
        if(this.selectedDualLock){

            addItem(
                this.dualLockOptions,
                this.selectedDualLock,
                'Dual Lock'
            );

        }

        // Bin Color
        addItem(
            this.binColorOptions,
            this.selectedBinColor,
            'Bin Color'
        );

        // Bin Type
        if (this.selectedBinType) {

            const rec =
                this.binTypeOptions.find(
                    x => x.Option_Key__c === this.selectedBinType
                );

            payload.push({

                key: rec.Option_Key__c,

                label:
                    STORAGE_LABEL_MAP[rec.Option_Key__c]
                    || rec.Option_Label__c,

                sku:
                    STORAGE_SKU_MAP[rec.Option_Key__c]
                    || rec.Option_Key__c

            });

        }

        console.log(
            'STORAGE PAYLOAD',
            JSON.stringify(payload)
        );

        this.dispatchEvent(

            new CustomEvent(

                'stepcomplete',

                {

                    detail:{

                        STORAGE: payload,

                        previewImage: this.currentPreviewImage

                    }

                }

            )

        );

    }
}
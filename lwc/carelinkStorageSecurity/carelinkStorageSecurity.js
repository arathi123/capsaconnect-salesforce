import { LightningElement, track, api } from 'lwc';
import getOptionsByStepAndFamily from '@salesforce/apex/CartConfiguratorController.getOptionsByStepAndFamily';

export default class CarelinkStorageSecurity extends LightningElement {
    @api productType = 'CareLink';
    @api selections; 

    @track rawStorageTypeOptions = [];
    @track rawBinSystemOptions = [];
    @track rawDualLockingOptions = [];
    @track rawColorOptions = [];
    @track rawModuleOptions = [];
    
    @track selectedStorageType = '';
    @track selectedBinSystem = '';
    @track selectedDualLocking = '';
    @track selectedColor = '';
    @track selectedModule = '';

    @track currentPreviewImage = '';
    @track isLoading = true;

    // Derived State Variables for Filter Engine
    useCaseKey = '';
    specialtyKey = '';
    powerKey = '';
    liftKey = '';
    monitorSuffix = 'M'; // 'M' = Single, 'D' = Dual, 'L' = Laptop

    connectedCallback() {
        this.currentPreviewImage = this.selections?.previewImage || '/resource/carelinkImagesPart1/carelinkImagesPart1/documentation.jpg';
        this.extractPreviousState();
        this.fetchAllMetadata();
    }

    extractPreviousState() {
        const u = this.selections?.USE_CASE || [];
        if (u.length > 0) this.useCaseKey = u[0].key;
        if (u.length > 1) this.specialtyKey = u[1].key;

        const p = this.selections?.POWER || [];
        if (p.length > 0) this.powerKey = p[0].key;

        const l = this.selections?.LIFT || [];
        if (l.length > 0) this.liftKey = l[0].key;

        const m = this.selections?.MONITOR || [];
        if (m.length > 0) {
            if (m[0].key === '1970419') {
                this.monitorSuffix = 'L'; // Laptop
            } else if (m.length > 1 && m[1].key === 'Dual') {
                this.monitorSuffix = 'D'; // Dual
            } else {
                this.monitorSuffix = 'M'; // Single Monitor
            }
        }
    }

    async fetchAllMetadata() {
        try {
            const [storData, binData, dualData, colData, modData] = await Promise.all([
                getOptionsByStepAndFamily({ stepKey: 'STORAGE TYPE', productFamily: this.productType }),
                getOptionsByStepAndFamily({ stepKey: 'BIN SYSTEM', productFamily: this.productType }),
                getOptionsByStepAndFamily({ stepKey: 'DUAL LOCKING', productFamily: this.productType }),
                getOptionsByStepAndFamily({ stepKey: 'BIN COLOR', productFamily: this.productType }),
                getOptionsByStepAndFamily({ stepKey: 'STORAGE MODULE', productFamily: this.productType })
            ]);

            this.rawStorageTypeOptions = storData || [];
            this.rawBinSystemOptions = binData || [];
            this.rawDualLockingOptions = dualData || [];
            this.rawColorOptions = colData || [];
            this.rawModuleOptions = modData || [];

            this.applyDynamicImageSuffixes();

            // Restore state if going backwards
            if (this.selections && this.selections.STORAGE && this.selections.STORAGE.length > 0) {
                const s = this.selections.STORAGE;
                this.selectedStorageType = s[0].key;
                
                if (s.length > 1 && this.selectedStorageType !== 'No Storage') {
                    this.selectedBinSystem = s[1].key;
                    
                    const dualOpt = s.find(opt => opt.key === 'Yes' || opt.key === 'No');
                    if (dualOpt) this.selectedDualLocking = dualOpt.key;

                    const colOpt = s.find(opt => opt.key === 'Gray' || opt.key === 'Blue');
                    if (colOpt) this.selectedColor = colOpt.key;

                    // Module is the last item
                    this.selectedModule = s[s.length - 1].key;
                }
                
                this.updatePreviewImage();
            }
        } catch (error) {
            console.error('Error fetching CareLink Storage options:', error);
        } finally {
            this.isLoading = false;
        }
    }

    // Replace the placeholders in image URLs based on monitor selection
    applyDynamicImageSuffixes() {
        this.rawModuleOptions = this.rawModuleOptions.map(mod => {
            let imgUrl = mod.Image_URL__c;
            let previewUrl = mod.Preview_Image_URL__c;

            if (imgUrl) {
                if (imgUrl.includes('MB_')) {
                    // E.g., replace 'MB_1TM.png' with 'MB_1TL.png'
                    imgUrl = imgUrl.replace('TM.png', `T${this.monitorSuffix}.png`);
                    if (previewUrl) previewUrl = previewUrl.replace('TM.png', `T${this.monitorSuffix}.png`);
                } else if (this.monitorSuffix !== 'M') {
                    // Standard Modules: Append 'DM' or 'LP' before .png
                    const inject = this.monitorSuffix === 'D' ? 'DM' : 'LP';
                    imgUrl = imgUrl.replace('.png', `${inject}.png`);
                    if (previewUrl) previewUrl = previewUrl.replace('.png', `${inject}.png`);
                }
            }
            return { 
                ...mod, 
                Image_URL__c: imgUrl, 
                Preview_Image_URL__c: previewUrl,
                Visibility_Filter__c: mod.Visibility_Filter__c // Ensures proxy copy doesn't drop it
            };
        });
    }

    // --- Hardened Visibility Evaluator ---
    evaluateFilter(filterStr, stateObj) {
        if (!filterStr) return true; 
        
        const orGroups = filterStr.split('||').map(s => s.trim());
        for (let group of orGroups) {
            const andConditions = group.split(';').map(s => s.trim());
            let groupPassed = true;
            
            for (let cond of andConditions) {
                if (!cond) continue;
                
                let [key, val] = cond.split('=');
                let isNotEqual = false;
                
                if (key.endsWith('!')) {
                    isNotEqual = true;
                    key = key.slice(0, -1);
                }
                
                key = key.trim();
                val = (val || '').trim(); // Safeguard against undefined
                
                // Convert stateObj value to string safely, resolving undefined to ''
                const stateVal = (stateObj[key] || '').toString().trim();
                
                if (isNotEqual) {
                    // If they are identical, the 'NOT EQUAL' condition fails
                    if (stateVal.toLowerCase() === val.toLowerCase()) { 
                        groupPassed = false; 
                        break; 
                    }
                } else {
                    // If they don't match, the 'EQUAL' condition fails
                    if (stateVal.toLowerCase() !== val.toLowerCase()) { 
                        groupPassed = false; 
                        break; 
                    }
                }
            }
            // If any 'OR' group passes all its 'AND' conditions, the item is visible
            if (groupPassed) return true;
        }
        return false; 
    }

    // --- Dynamic Filters State ---
    get currentStateForFilters() {
        let hideRx = 'false';
        if (this.useCaseKey === 'Medication' && this.liftKey === 'Manual' && this.selectedStorageType === 'Non Locking') {
            hideRx = 'true';
        }

        return {
            USE_CASE: this.useCaseKey,
            SPECIALTY: this.specialtyKey,
            POWER: this.powerKey,
            LIFT: this.liftKey,
            STORAGE: this.selectedStorageType,
            BIN_SYSTEM: this.selectedBinSystem,
            HIDE_RX: hideRx
        };
    }

    // --- Selection Logic ---
    handleStorageSelect(event) {
        const key = event.currentTarget.dataset.key;
        if (this.selectedStorageType === key) return;
        
        this.selectedStorageType = key;
        this.selectedBinSystem = '';
        this.selectedDualLocking = '';
        this.selectedColor = '';
        this.selectedModule = '';

        this.updatePreviewImage();
    }

    handleBinSystemSelect(event) {
        const key = event.currentTarget.dataset.key;
        if (this.selectedBinSystem === key) return;

        this.selectedBinSystem = key;
        this.selectedDualLocking = '';
        this.selectedColor = '';
        this.selectedModule = '';
    }

    handleDualLockingSelect(event) { this.selectedDualLocking = event.currentTarget.dataset.key; }
    handleBinColorSelect(event) { this.selectedColor = event.currentTarget.dataset.key; }
    
    handleModuleSelect(event) {
        this.selectedModule = event.currentTarget.dataset.key;
        this.updatePreviewImage();
    }

    updatePreviewImage() {
        if (this.selectedStorageType === 'No Storage') {
            this.currentPreviewImage = this.selections?.previewImage || '/resource/carelinkImagesPart1/carelinkImagesPart1/documentation.jpg';
        } else if (this.selectedModule) {
            const modOpt = this.rawModuleOptions.find(o => o.Option_Key__c === this.selectedModule);
            if (modOpt && modOpt.Preview_Image_URL__c) {
                this.currentPreviewImage = modOpt.Preview_Image_URL__c; 
            }
        }
    }

    // --- HTML Getters ---
    get filteredStorageOptions() {
        return this.rawStorageTypeOptions
            .filter(opt => this.evaluateFilter(opt.Visibility_Filter__c, this.currentStateForFilters))
            .map(opt => ({
                ...opt,
                isSelected: opt.Option_Key__c === this.selectedStorageType,
                rowClass: opt.Option_Key__c === this.selectedStorageType ? 'option-row selected' : 'option-row'
            }));
    }

    get showBinSystemOptions() { return this.selectedStorageType && this.selectedStorageType !== 'No Storage'; }

    get filteredBinSystemOptions() {
        return this.rawBinSystemOptions
            .filter(opt => this.evaluateFilter(opt.Visibility_Filter__c, this.currentStateForFilters))
            .map(opt => ({
                ...opt,
                isSelected: opt.Option_Key__c === this.selectedBinSystem,
                rowClass: opt.Option_Key__c === this.selectedBinSystem ? 'option-row selected' : 'option-row'
            }));
    }

    get showDualLockingOptions() { return this.selectedBinSystem === 'MaxBin' && this.selectedStorageType === 'Electric'; }
    get visibleDualLockingOptions() {
        return this.rawDualLockingOptions
            .filter(opt => this.evaluateFilter(opt.Visibility_Filter__c, this.currentStateForFilters))
            .map(opt => ({
                ...opt,
                isSelected: opt.Option_Key__c === this.selectedDualLocking,
                rowClass: opt.Option_Key__c === this.selectedDualLocking ? 'option-row selected' : 'option-row'
            }));
    }

    get showBinColorOptions() { return this.selectedBinSystem === 'Standard' && this.selectedStorageType === 'Non Locking'; }
    get visibleBinColorOptions() {
        return this.rawColorOptions
            .filter(opt => this.evaluateFilter(opt.Visibility_Filter__c, this.currentStateForFilters))
            .map(opt => ({
                ...opt,
                isSelected: opt.Option_Key__c === this.selectedColor,
                rowClass: opt.Option_Key__c === this.selectedColor ? 'option-row selected' : 'option-row'
            }));
    }

    get showModuleOptions() {
        if (!this.selectedBinSystem) return false;
        if (this.showDualLockingOptions && !this.selectedDualLocking) return false;
        if (this.showBinColorOptions && !this.selectedColor) return false;
        return true;
    }

    get filteredModuleOptions() {
        return this.rawModuleOptions
            .filter(opt => this.evaluateFilter(opt.Visibility_Filter__c, this.currentStateForFilters))
            .map(opt => ({
                ...opt,
                isSelected: opt.Option_Key__c === this.selectedModule,
                cardClass: opt.Option_Key__c === this.selectedModule ? 'module-card selected' : 'module-card'
            }));
    }

    get isStepComplete() {
        if (this.selectedStorageType === 'No Storage') return true;
        if (this.showModuleOptions && this.selectedModule) return true;
        return false;
    }

    // --- Dynamic SKU Resolution for Standard Modules ---
    resolveModuleSku(modKey) {
        const isLocking = this.selectedStorageType === 'Electric';
        
        // Standard Modules
        if (modKey === 'XP') return isLocking ? '1883100' : '1970158';
        if (modKey === 'RX') return isLocking ? '1817922' : '1970456';
        if (modKey === 'RXXP') return '1817922, 1883162'; 
        if (modKey === 'DRX') return isLocking ? '1817922, 1889698' : '1970456, 1889698'; 
        if (modKey === 'TeleMed Cab') return '207021, ' + (isLocking ? '1883100' : '1970158'); 
        if (modKey === 'TelePres XP') return isLocking ? '1883100' : '207021';
        
        // MaxBin Modules
        if (modKey === 'MB1') return isLocking ? '207094' : '207294';
        if (modKey === 'MB2') return isLocking ? '207108' : '207292';
        if (modKey === 'MB3') return isLocking ? '207108, 207147' : '207292, 207294';
        if (modKey === 'MB4') return isLocking ? '207108, 207148' : '207292, 207292';
        if (modKey === 'MB5') return isLocking ? '207108, 207147, 207148' : '207292, 207292, 207294';
        if (modKey === 'MB6') return isLocking ? '207108, 207148, 207148' : '207292, 207292, 207292';

        return null;
    }

    // --- Output Generator & Dynamic Routing ---
    handleNext() {
        let payloadArray = [];
        let nextStepTarget = 'Builder'; // Default fallback
        
        // 1. Storage Type
        const storOpt = this.rawStorageTypeOptions.find(o => o.Option_Key__c === this.selectedStorageType);
        if (storOpt) {
            payloadArray.push({ key: storOpt.Option_Key__c, label: storOpt.Option_Label__c, sku: null });
            if (this.selectedStorageType === 'No Storage') {
                if (this.specialtyKey === 'Telemedicine' || this.specialtyKey === 'Telepresence') {
                    nextStepTarget = 'Telehealth';
                } else {
                    nextStepTarget = 'Accessories';
                }
            }
        }

        if (this.selectedStorageType !== 'No Storage') {
            // 2. Bin System
            const binOpt = this.rawBinSystemOptions.find(o => o.Option_Key__c === this.selectedBinSystem);
            if (binOpt) {
                payloadArray.push({ key: binOpt.Option_Key__c, label: binOpt.Option_Label__c, sku: null });
                if (binOpt.Next_Step_Override__c) nextStepTarget = binOpt.Next_Step_Override__c; 
            }

            // 3. Sub-options
            if (this.showDualLockingOptions && this.selectedDualLocking) {
                const dualOpt = this.rawDualLockingOptions.find(o => o.Option_Key__c === this.selectedDualLocking);
                payloadArray.push({ key: dualOpt.Option_Key__c, label: `Dual Locking: ${dualOpt.Option_Label__c}`, sku: null });
            }
            if (this.showBinColorOptions && this.selectedColor) {
                const colOpt = this.rawColorOptions.find(o => o.Option_Key__c === this.selectedColor);
                payloadArray.push({ key: colOpt.Option_Key__c, label: `Bin Color: ${colOpt.Option_Label__c}`, sku: null });
            }

            // 4. Module Chassis
            if (this.selectedModule) {
                const modOpt = this.rawModuleOptions.find(o => o.Option_Key__c === this.selectedModule);
                const resolvedSku = this.resolveModuleSku(this.selectedModule);
                payloadArray.push({ key: modOpt.Option_Key__c, label: modOpt.Option_Label__c, sku: resolvedSku });
            }
        }

        this.dispatchEvent(new CustomEvent('stepcomplete', {
            detail: { 
                STORAGE: payloadArray, 
                previewImage: this.currentPreviewImage,
                overrideNext: nextStepTarget 
            }
        }));
    }
}
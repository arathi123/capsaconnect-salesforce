import { LightningElement, track, api } from 'lwc';
import getOptionsByStepAndFamily from '@salesforce/apex/CartConfiguratorController.getOptionsByStepAndFamily';

export default class CarelinkMonitor extends LightningElement {
    @api productType = 'CareLink';
    @api selections; 

    @track rawMonitorOptions = [];
    @track rawTypeOptions = [];
    @track rawMountSingleOptions = [];
    @track rawMountDualOptions = [];
    
    @track selectedMonitor = '';
    @track selectedMonitorType = '';
    @track selectedMount = '';

    @track hoveredMonitorKey = '';
    @track hoveredTypeKey = '';
    @track hoveredMountKey = '';

    @track currentPreviewImage = '';
    @track isLoading = true;

    connectedCallback() {
        this.updateDynamicImage(); 
        this.fetchAllMetadata();
    }

    async fetchAllMetadata() {
        try {
            const [monitorData, typeData, mountSingleData, mountDualData] = await Promise.all([
                getOptionsByStepAndFamily({ stepKey: 'MONITOR', productFamily: this.productType }),
                getOptionsByStepAndFamily({ stepKey: 'MONITOR TYPE', productFamily: this.productType }),
                getOptionsByStepAndFamily({ stepKey: 'MOUNT SINGLE', productFamily: this.productType }),
                getOptionsByStepAndFamily({ stepKey: 'MOUNT DUAL', productFamily: this.productType })
            ]);

            this.rawMonitorOptions = monitorData || [];
            this.rawTypeOptions = typeData || [];
            this.rawMountSingleOptions = mountSingleData || [];
            this.rawMountDualOptions = mountDualData || [];

            if (this.selections && this.selections.MONITOR && this.selections.MONITOR.length > 0) {
                this.selectedMonitor = this.selections.MONITOR[0].key;
                
                if (this.selectedMonitor === 'Monitor') {
                    if (this.selections.MONITOR.length > 1) this.selectedMonitorType = this.selections.MONITOR[1].key;
                    if (this.selections.MONITOR.length > 2) this.selectedMount = this.selections.MONITOR[2].key;
                }
                
                this.updateDynamicImage();
            }

        } catch (error) {
            console.error('Error fetching CareLink Monitor options:', error);
        } finally {
            this.isLoading = false;
        }
    }

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
                val = val.trim();
                const stateVal = stateObj[key];
                
                if (isNotEqual) {
                    if (stateVal && stateVal.toLowerCase() === val.toLowerCase()) { groupPassed = false; break; }
                } else {
                    if (!stateVal || stateVal.toLowerCase() !== val.toLowerCase()) { groupPassed = false; break; }
                }
            }
            if (groupPassed) return true;
        }
        return false; 
    }

    updateDynamicImage() {
        const useCaseArr = this.selections?.USE_CASE || [];
        
        let baseStr = 'documentation'; // Default
        if (useCaseArr.length > 0) {
            if (useCaseArr[0].key === 'Specialty' && useCaseArr.length > 1) {
                baseStr = useCaseArr[1].key.toLowerCase(); // telemedicine, telepresence
            } else {
                baseStr = useCaseArr[0].key.toLowerCase(); // documentation, medication
            }
        }

        let suffix = '';
        if (this.selectedMonitor === '1970419') { 
            suffix = '_laptop';
        } else if (this.selectedMonitor === 'Monitor') {
            suffix = this.selectedMonitorType === 'Dual' ? '_dual' : '_single'; 
        }

        // e.g. /resource/carelinkImagesPart1/carelinkImagesPart1/medication_single.jpg
        this.currentPreviewImage = `/resource/carelinkImagesPart1/carelinkImagesPart1/${baseStr}${suffix}.jpg`;
    }

    // --- Hover Logic ---
    handleMonitorMouseEnter(event) { this.hoveredMonitorKey = event.currentTarget.dataset.key; }
    handleMonitorMouseLeave() { this.hoveredMonitorKey = ''; }
    
    handleTypeMouseEnter(event) { this.hoveredTypeKey = event.currentTarget.dataset.key; }
    handleTypeMouseLeave() { this.hoveredTypeKey = ''; }
    
    handleMountMouseEnter(event) { this.hoveredMountKey = event.currentTarget.dataset.key; }
    handleMountMouseLeave() { this.hoveredMountKey = ''; }

    handleMonitorSelect(event) {
        const key = event.currentTarget.dataset.key;
        if (this.selectedMonitor === key) return;
        
        this.selectedMonitor = key;
        this.selectedMonitorType = ''; 
        this.selectedMount = '';
        this.updateDynamicImage();
    }

    handleTypeSelect(event) {
        const key = event.currentTarget.dataset.key;
        if (this.selectedMonitorType === key) return;

        this.selectedMonitorType = key;
        this.selectedMount = ''; 
        this.updateDynamicImage();
    }

    handleMountSelect(event) {
        this.selectedMount = event.currentTarget.dataset.key;
    }

    get filteredMonitorOptions() {
        const useCaseArr = this.selections?.USE_CASE || [];
        const useCaseKey = useCaseArr.length > 0 ? useCaseArr[0].key : '';
        
        return this.rawMonitorOptions
            .filter(opt => this.evaluateFilter(opt.Visibility_Filter__c, { USE_CASE: useCaseKey }))
            .map(opt => ({
                ...opt,
                isSelected: opt.Option_Key__c === this.selectedMonitor,
                isVisible: opt.Option_Key__c === this.selectedMonitor || opt.Option_Key__c === this.hoveredMonitorKey,
                rowClass: opt.Option_Key__c === this.selectedMonitor ? 'option-row selected' : 'option-row'
            }));
    }

    get showMonitorTypeOptions() {
        return this.selectedMonitor === 'Monitor';
    }

    get visibleTypeOptions() {
        return this.rawTypeOptions.map(opt => ({
            ...opt,
            isSelected: opt.Option_Key__c === this.selectedMonitorType,
            isVisible: opt.Option_Key__c === this.selectedMonitorType || opt.Option_Key__c === this.hoveredTypeKey,
            rowClass: opt.Option_Key__c === this.selectedMonitorType ? 'option-row selected' : 'option-row'
        }));
    }

    get showMountOptions() {
        return this.selectedMonitor === 'Monitor' && this.selectedMonitorType !== '';
    }

    get visibleMountOptions() {
        const targetList = this.selectedMonitorType === 'Single' ? this.rawMountSingleOptions : this.rawMountDualOptions;
        
        return targetList.map(opt => ({
            ...opt,
            isSelected: opt.Option_Key__c === this.selectedMount,
            isVisible: opt.Option_Key__c === this.selectedMount || opt.Option_Key__c === this.hoveredMountKey,
            rowClass: opt.Option_Key__c === this.selectedMount ? 'option-row selected' : 'option-row'
        }));
    }

    get isStepComplete() {
        if (this.selectedMonitor === 'Monitor') {
            return this.selectedMonitorType !== '' && this.selectedMount !== '';
        }
        return this.selectedMonitor !== ''; // E.g., Laptop
    }

    handleNext() {
        let payloadArray = [];
        
        if (this.selectedMonitor === '1970419') { 
            const lapOpt = this.rawMonitorOptions.find(o => o.Option_Key__c === '1970419');
            payloadArray.push({
                key: lapOpt.Option_Key__c,
                label: lapOpt.Option_Label__c,
                sku: lapOpt.Option_Key__c 
            });
        } else if (this.selectedMonitor === 'Monitor') {
            const monOpt = this.rawMonitorOptions.find(o => o.Option_Key__c === 'Monitor');
            const typeOpt = this.rawTypeOptions.find(o => o.Option_Key__c === this.selectedMonitorType);
            
            const targetList = this.selectedMonitorType === 'Single' ? this.rawMountSingleOptions : this.rawMountDualOptions;
            const mountOpt = targetList.find(o => o.Option_Key__c === this.selectedMount);

            payloadArray.push({ key: monOpt.Option_Key__c, label: monOpt.Option_Label__c, sku: null });
            
            if (typeOpt) {
                payloadArray.push({ key: typeOpt.Option_Key__c, label: typeOpt.Option_Label__c, sku: null });
            }

            if (mountOpt) {
                payloadArray.push({ key: mountOpt.Option_Key__c, label: mountOpt.Option_Label__c, sku: mountOpt.Option_Key__c });
            }
        }

        this.dispatchEvent(new CustomEvent('stepcomplete', {
            detail: { 
                MONITOR: payloadArray, 
                previewImage: this.currentPreviewImage 
            }
        }));
    }
}
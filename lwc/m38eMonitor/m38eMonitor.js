import { LightningElement, track, api } from 'lwc';
import getOptionsByStepAndFamily from '@salesforce/apex/CartConfiguratorController.getOptionsByStepAndFamily';

export default class M38eMonitor extends LightningElement {
    @api productType = 'M38e';
    @api selections; 

    @track rawMonitorTypes = [];
    @track rawMountOptions = [];
    
    @track selectedType = '';
    @track selectedMount = '';
    @track currentPreviewImage = '';
    
    @track hoveredTypeKey = '';
    @track hoveredMountKey = '';
    
    @track isLoading = true;

    connectedCallback() {
        this.currentPreviewImage = this.selections?.previewImage || '/resource/m38eImagesPart1/m38eImagesPart1/documentation.jpg';
        this.fetchAllMetadata();
    }

    async fetchAllMetadata() {
        try {
            const [typeData, mountData] = await Promise.all([
                getOptionsByStepAndFamily({ stepKey: 'MONITOR', productFamily: this.productType }),
                getOptionsByStepAndFamily({ stepKey: 'MOUNT', productFamily: this.productType })
            ]);

            this.rawMonitorTypes = typeData || [];
            this.rawMountOptions = mountData || [];

            if (this.selections && this.selections.MONITOR && this.selections.MONITOR.length > 0) {
                this.selectedType = this.selections.MONITOR[0].key;
                
                if (this.selectedType === 'MONITOR' && this.selections.MONITOR.length > 1) {
                    this.selectedMount = this.selections.MONITOR[1].key;
                }
            }

        } catch (error) {
            console.error('Error fetching M38e Monitor options:', error);
        } finally {
            this.isLoading = false;
        }
    }

    updatePreviewImage(suffix) {
        if (!suffix) return;
        
        const useCaseArr = this.selections?.USE_CASE || [];
        const baseUseCase = useCaseArr.length > 0 ? useCaseArr[0].key.toLowerCase() : 'documentation';
        
        this.currentPreviewImage = `/resource/m38eImagesPart1/m38eImagesPart1/${baseUseCase}_${suffix}.jpg`;
    }

    handleTypeMouseEnter(event) {
        this.hoveredTypeKey = event.currentTarget.dataset.key;
    }
    handleTypeMouseLeave() {
        this.hoveredTypeKey = '';
    }

    handleMountMouseEnter(event) {
        this.hoveredMountKey = event.currentTarget.dataset.key;
    }
    handleMountMouseLeave() {
        this.hoveredMountKey = '';
    }

    handleTypeSelect(event) {
        const key = event.currentTarget.dataset.key;
        const suffix = event.currentTarget.dataset.suffix;
        
        if (this.selectedType === key) return;
        
        this.selectedType = key;
        this.selectedMount = ''; 
        
        this.updatePreviewImage(suffix);
    }

    handleMountSelect(event) {
        this.selectedMount = event.currentTarget.dataset.key;
    }


    get filteredMonitorTypes() {
        const useCaseArr = this.selections?.USE_CASE || [];
        const useCaseKey = useCaseArr.length > 0 ? useCaseArr[0].key : '';
        
        return this.rawMonitorTypes
            .filter(opt => {
                if (!opt.Visibility_Filter__c) return true;
                return opt.Visibility_Filter__c.includes(`USE_CASE=${useCaseKey}`);
            })
            .map(opt => {
                const isSelected = opt.Option_Key__c === this.selectedType;
                return {
                    ...opt,
                    isSelected: isSelected,
                    isVisible: isSelected || opt.Option_Key__c === this.hoveredTypeKey,
                    rowClass: isSelected ? 'option-row selected' : 'option-row'
                };
            });
    }

    get showMountOptions() {
        return this.selectedType === 'MONITOR';
    }

    get mountOptions() {
        return this.rawMountOptions.map(opt => {
            const isSelected = opt.Option_Key__c === this.selectedMount;
            return {
                ...opt,
                isSelected: isSelected,
                isVisible: isSelected || opt.Option_Key__c === this.hoveredMountKey,
                rowClass: isSelected ? 'option-row selected' : 'option-row'
            };
        });
    }

    get isStepComplete() {
        if (this.selectedType === 'MONITOR') {
            return this.selectedType !== '' && this.selectedMount !== '';
        }
        return this.selectedType !== '';
    }

    handleNext() {
        const typeOpt = this.rawMonitorTypes.find(opt => opt.Option_Key__c === this.selectedType);
        const mountOpt = this.rawMountOptions.find(opt => opt.Option_Key__c === this.selectedMount);

        let payloadArray = [];

        if (typeOpt) {
            payloadArray.push({
                key: typeOpt.Option_Key__c,
                label: typeOpt.Option_Label__c,
                sku: typeOpt.Option_Key__c === 'MONITOR' ? null : typeOpt.Option_Key__c
            });
        }

        if (this.selectedType === 'MONITOR' && mountOpt && mountOpt.Option_Key__c !== 'NONE') {
            payloadArray.push({
                key: mountOpt.Option_Key__c,
                label: mountOpt.Option_Label__c,
                sku: mountOpt.Option_Key__c
            });
        }

        this.dispatchEvent(new CustomEvent('stepcomplete', {
            detail: { 
                MONITOR: payloadArray, 
                previewImage: this.currentPreviewImage 
            }
        }));
    }
}
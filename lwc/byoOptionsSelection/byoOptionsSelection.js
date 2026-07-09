import { LightningElement, track, wire, api } from 'lwc';
import getOptionsByStepAndFamily from '@salesforce/apex/CartConfiguratorController.getOptionsByStepAndFamily';

export default class ByoOptionsSelection extends LightningElement {
    @api productType;
    @api selectedHeight = '10';
    @api selectedColor = 'ER'; 

    @track handleOptions = [];
    @track subHandleOptions = []; 
    @track labelOptions = [];
    @track subLabelOptions = [];
    
    selectedMainHandle = { label: '', key: '' };
    selectedMainLabel = { label: '', key: '' }; 
    selectedSubLabel = { label: '', key: '', description: '' };
    
    // Updated Surface Tracking for Dynamic Metadata
    @track surfaceOptions = [];
    @track selectedSurface = '';
    selectedSurfacePosition = '';
    isSurfacePositionRequired = false;
    positionOptions = [];

    selectedBridge = { optionLabel: '', optionKey: '' };

    _handlesLoaded = false;
    _labelsLoaded = false;
    _surfaceLoaded = false;
    _bridgeLoaded = false;

    labelExampleImg = '/resource/Options/Options/CartLabelExample.jpg';
    surfaceImg = '/resource/Options/Options/PullOutShelf_Creme.jpg';
    bridgeImg = '/resource/Options/Options/12146_Storage_Tower.jpg';

    get handleColorSuffix() {
        const colorMap = {
            'EB': 'EB', 'EG': 'EG', 'ER': 'ER', 'EY': 'EY',
            'LCD': 'LC', 'LCB': 'LC', 'LCG': 'LC', 'LCY': 'LC', 'LCR': 'LC'
        };
        return colorMap[this.selectedColor] || 'LC'; 
    }

    get autoDerivedSubHandle() {
        if (!this.selectedMainHandle.key || this.selectedMainHandle.label === 'None') {
            return { key: 'NONE', displayValue: 'None' };
        }

        const targetSuffix = `-${this.handleColorSuffix}`;
        const matchedHandle = this.subHandleOptions.find(opt => 
            opt.Option_Key__c && opt.Option_Key__c.endsWith(targetSuffix)
        );

        if (matchedHandle) {
            return {
                key: matchedHandle.Option_Key__c,
                displayValue: `${this.selectedMainHandle.label} - ${matchedHandle.Option_Key__c}`
            };
        }
        return { key: '', displayValue: '' };
    }

    get isMetadataLoading() {
        return !(this._handlesLoaded && this._labelsLoaded && this._surfaceLoaded && this._bridgeLoaded);
    }

    get dynamicHandleStepKey() {
        if (!this.selectedMainHandle.key || this.selectedMainHandle.label === 'None') return '';
        return `${this.selectedMainHandle.key} ${this.selectedHeight}`; 
    }

    get showLabelSubtype() {
        return this.selectedMainLabel.label && 
               this.selectedMainLabel.label !== 'No Labels' && 
               this.selectedMainLabel.key;
    }

    get subtypePlaceholder() {
        return `Select the ${this.selectedMainLabel.label} subtype`;
    }

    // Toggle for the Position Dropdown
    get showSurfacePositionDropdown() {
        return this.selectedSurface && 
               this.selectedSurface.optionKey !== 'NONE' && 
               this.isSurfacePositionRequired;
    }

    // Updated Validation
    get isNextDisabled() {
        const handleComplete = this.selectedMainHandle.label === 'None' || 
                              (this.selectedMainHandle.label && this.autoDerivedSubHandle.key);

        const labelComplete = this.selectedMainLabel.label === 'No Labels' || 
                             (this.selectedMainLabel.label && this.selectedSubLabel.key);
                             
        // Surface is complete if it's "No" OR if "Yes" but no position needed OR if "Yes" and position is filled
        let surfaceComplete = false;
        if (this.selectedSurface) {
            if (this.selectedSurface.optionKey === 'NONE') {
                surfaceComplete = true;
            } else if (!this.isSurfacePositionRequired) {
                surfaceComplete = true;
            } else if (this.isSurfacePositionRequired && this.selectedSurfacePosition !== '') {
                surfaceComplete = true;
            }
        }

        return !(handleComplete && labelComplete && surfaceComplete && this.selectedBridge.optionLabel);
    }

    // --- Wires ---
    @wire(getOptionsByStepAndFamily, { stepKey: 'HANDLE', productFamily: '$productType' })
    wiredHandles({ data, error }) {
        if (data) {
            this.handleOptions = data.map(opt => ({
                ...opt, uiKey: opt.Id, isSelected: false, wrapperClass: 'option-wrapper',
            }));
        }
        if (data || error) this._handlesLoaded = true;
    }

    @wire(getOptionsByStepAndFamily, { stepKey: '$dynamicHandleStepKey', productFamily: '$productType' })
    wiredSubHandles({ data }) {
        this.subHandleOptions = data ? data : [];
    }
    
    @wire(getOptionsByStepAndFamily, { stepKey: 'LABEL', productFamily: '$productType' })
    wiredLabels({ data, error }) {
        if (data) {
            this.labelOptions = data.map(opt => ({
                ...opt, uiKey: opt.Id, optionKey: opt.Option_Key__c, optionLabel: opt.Option_Label__c  
            }));
        }
        if (data || error) this._labelsLoaded = true;
    }

    @wire(getOptionsByStepAndFamily, { stepKey: '$selectedMainLabel.key', productFamily: '$productType' })
    wiredSubLabels({ data }) {
        if (data) {
            this.subLabelOptions = data.map(opt => ({
                ...opt, fullDisplay: `${opt.Option_Label__c} - ${opt.Description__c}`
            }));
        } else {
            this.subLabelOptions = [];
        }
    }

    @wire(getOptionsByStepAndFamily, { stepKey: 'PULL OUT SURFACE', productFamily: '$productType' })
    wiredSurface({ data, error }) {
        if (data) {
            this.surfaceOptions = data.map(opt => {
                // --- NEW: Parse Dynamic Position Metadata ---
                const isPosReq = opt.Is_Position_Required__c || false;
                let posOptions = [{ label: '-- Select Position --', value: '' }];
                
                if (isPosReq && opt.Position_Options__c) {
                    opt.Position_Options__c.split(',').forEach(item => {
                        const parts = item.split(':');
                        if (parts.length === 2) {
                            posOptions.push({ label: parts[1].trim(), value: parts[0].trim() });
                        } else {
                            posOptions.push({ label: parts[0].trim(), value: parts[0].trim() });
                        }
                    });
                }

                return {
                    ...opt, 
                    uiKey: opt.Id, 
                    optionKey: opt.Option_Key__c, 
                    optionLabel: opt.Option_Label__c,
                    isPositionRequired: isPosReq,
                    positionOptions: posOptions
                };
            });
        }
        if (data || error) this._surfaceLoaded = true;
        if(data && data.length > 0) this.surfaceImg = data[0].Image_URL__c;
    }

    @wire(getOptionsByStepAndFamily, { stepKey: 'BRIDGE', productFamily: '$productType' })
    wiredBridge({ data, error }) {
        if (data) {
            this.bridgeOptions = data.map(opt => ({
                ...opt, uiKey: opt.Id, optionKey: opt.Option_Key__c, optionLabel: opt.Option_Label__c
            }));
        }
        if (data || error) this._bridgeLoaded = true;
        if(data && data.length === 1) this.bridgeImg = data[0].Image_URL__c;
    }

    // --- Handlers ---
    handleHandleChange(event) {
        const selectedId = event.target.value;
        const selectedOption = this.handleOptions.find(opt => opt.uiKey === selectedId);
        
        this.selectedMainHandle = { label: selectedOption.Option_Label__c, key: selectedOption.Option_Key__c };
        this.handleOptions = this.handleOptions.map(opt => ({
            ...opt, isSelected: opt.uiKey === selectedId, 
            wrapperClass: opt.uiKey === selectedId ? 'option-wrapper selected' : 'option-wrapper'
        }));
    }

    handleLabelChange(event) {
        const selectedId = event.target.value;
        const found = this.labelOptions.find(opt => opt.Id === selectedId);

        if (found) {
            this.selectedMainLabel = { label: found.Option_Label__c, key: found.Option_Key__c };
            this.selectedSubLabel = { label: '', key: '', description: '' }; 
        } else {
            this.selectedMainLabel = { label: '', key: '' };
            this.selectedSubLabel = { label: '', key: '', description: '' };
        }
    }

    handleSubLabelChange(event) {
        const selectedId = event.target.value;
        const found = this.subLabelOptions.find(opt => opt.Id === selectedId);

        if (found) {
            this.selectedSubLabel = { label: found.Option_Label__c, key: found.Option_Key__c, description: found.Description__c };
        } else {            
            this.selectedSubLabel = { label: '', key: '', description: '' };
        }
    }

    handleSurfaceChange(event) {
        const selectedKey = event.target.value;
        
        if (selectedKey === 'No') {
            this.selectedSurfacePosition = ''; 
            this.isSurfacePositionRequired = false;
            this.positionOptions = [];
            this.selectedSurface = {
                optionLabel: 'No',
                optionKey: 'NONE',
                displayValue: 'No Pull Out Surface'
            };
        } else {
            const selectedOption = this.surfaceOptions.find(opt => opt.optionLabel === selectedKey);
            if (selectedOption) {
                this.isSurfacePositionRequired = selectedOption.isPositionRequired;
                this.positionOptions = selectedOption.positionOptions;
                this.selectedSurfacePosition = ''; // Reset position when toggling
                
                this.selectedSurface = {
                    optionLabel: selectedOption.optionLabel,
                    optionKey: selectedOption.optionKey,
                    displayValue: `${selectedOption.optionLabel} - ${selectedOption.optionKey}`
                };
            }
        }
    }

    handleSurfacePositionChange(event) {
        this.selectedSurfacePosition = event.target.value;
    }

    handleBridgeChange(event) {
        const selectedValue = event.target.value;
        const selectedOption = this.bridgeOptions.find(opt => opt.Option_Label__c === selectedValue);
        
        if (selectedOption) {
            this.selectedBridge = { optionLabel: selectedOption.optionLabel, optionKey: selectedOption.optionKey, displayValue: `${selectedOption.optionLabel} - ${selectedOption.optionKey}` };
        } else {
            this.selectedBridge = { optionLabel: selectedValue, optionKey: 'NONE', displayValue: selectedValue };
        }
    }

    handleNext() {
        const nextStep = this.selectedBridge.optionLabel.includes('Accessory') ? 'Bridge' : 'Accessories';
        
        // Append Position to display value if applicable
        let surfaceDisplay = this.selectedSurface.displayValue;
        if (this.isSurfacePositionRequired && this.selectedSurfacePosition) {
            surfaceDisplay += ` (${this.selectedSurfacePosition})`;
        }

        const payload = {
            handle: {
                optionLabel: this.selectedMainHandle.label,
                optionKey: this.autoDerivedSubHandle.key, 
                displayValue: this.autoDerivedSubHandle.displayValue
            },
            labels: {
                optionLabel: this.selectedMainLabel.label,
                optionKey: this.selectedSubLabel.key || 'NONE',
                displayValue: this.selectedMainLabel.label === 'No Labels' ? 'No Labels' : `${this.selectedMainLabel.label} - ${this.selectedSubLabel.key}`
            },
            surface: {
                ...this.selectedSurface,
                position: this.selectedSurfacePosition, // Inject the position into the payload
                displayValue: surfaceDisplay
            },
            bridge: this.selectedBridge
        };

        this.dispatchEvent(new CustomEvent('nextstep', { detail: { step: 'OPTIONS', payload: payload, goTo: nextStep } }));
    }
}
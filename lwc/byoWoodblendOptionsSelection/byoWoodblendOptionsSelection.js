import { LightningElement, track, wire, api } from 'lwc';
import getOptionsByStepAndFamily from '@salesforce/apex/CartConfiguratorController.getOptionsByStepAndFamily';

export default class ByoWoodblendOptionsSelection extends LightningElement {
    @api productType = 'WoodBlendTreatment';
    @api selectedHeight = '10'; // Defaults, overridden by parent
    @api selectedColor = 'MA';  // Woodblend colors: MA or NC

    @track handleOptions = [];
    @track subHandleOptions = []; 
    
    selectedMainHandle = { label: '', key: '' };
    
    // Updated Surface Tracking
    @track surfaceOptions = [];
    @track selectedSurface = { optionLabel: 'No', optionKey: 'NONE', displayValue: 'No Pull Out Surface' };
    selectedSurfacePosition = '';
    isSurfacePositionRequired = false;
    positionOptions = [];

    _handlesLoaded = false;
    _surfaceLoaded = false;

    // Default Images
    surfaceImg = '/resource/Options/Options/PullOutShelf_Creme.jpg'; // We'll update this if metadata has images

    get isMetadataLoading() {
        return !(this._handlesLoaded && this._surfaceLoaded);
    }

    get dynamicHandleStepKey() {
        if (!this.selectedMainHandle.key || this.selectedMainHandle.label === 'None') return '';
        return `${this.selectedMainHandle.key} ${this.selectedHeight}`; 
    }

    // Woodblend automatically maps MA or NC from the selected bumper color
    get autoDerivedSubHandle() {
        if (!this.selectedMainHandle.key || this.selectedMainHandle.label === 'None') {
            return { key: 'NONE', displayValue: 'None' };
        }

        const targetSuffix = `-${this.selectedColor}`;
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

    // Toggle for the Position Dropdown
    get showSurfacePositionDropdown() {
        return this.selectedSurface && 
               this.selectedSurface.optionKey !== 'NONE' && 
               this.isSurfacePositionRequired;
    }

    get isNextDisabled() {
        // Handle must be resolved
        const handleComplete = this.selectedMainHandle.label === 'None' || 
                              (this.selectedMainHandle.label && this.autoDerivedSubHandle.key);

        // Surface must be resolved (Either None, or Selected + Position if required)
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

        return !(handleComplete && surfaceComplete);
    }

    // --- WIRES ---
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
    
    @wire(getOptionsByStepAndFamily, { stepKey: 'PULL OUT SURFACE', productFamily: '$productType' })
    wiredSurface({ data, error }) {
        if (data) {
            this.surfaceOptions = data.map(opt => {
                // Parse Dynamic Position Metadata
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
    }

    // --- HANDLERS ---
    handleHandleChange(event) {
        const selectedId = event.target.value;
        const selectedOption = this.handleOptions.find(opt => opt.uiKey === selectedId);
        
        this.selectedMainHandle = { label: selectedOption.Option_Label__c, key: selectedOption.Option_Key__c };
        this.handleOptions = this.handleOptions.map(opt => ({
            ...opt, isSelected: opt.uiKey === selectedId, 
            wrapperClass: opt.uiKey === selectedId ? 'option-wrapper selected' : 'option-wrapper'
        }));
    }

    handleSurfaceChange(event) {
        const selectedKey = event.target.value;
        
        if (selectedKey === 'None') {
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
                
                // Update image if available in metadata
                if (selectedOption.Image_URL__c) {
                    this.surfaceImg = selectedOption.Image_URL__c;
                }
                
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

    handleNext() {
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
            surface: {
                ...this.selectedSurface,
                position: this.selectedSurfacePosition,
                displayValue: surfaceDisplay
            }
        };

        this.dispatchEvent(new CustomEvent('nextstep', { 
            detail: { 
                step: 'OPTIONS', 
                payload: payload, 
                goTo: 'Accessories' // As requested, Options goes directly to Accessories
            } 
        }));
    }
}
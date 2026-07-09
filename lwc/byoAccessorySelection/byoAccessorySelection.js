import { LightningElement, track, wire, api } from 'lwc';
import getOptionsByStepAndFamily from '@salesforce/apex/CartConfiguratorController.getOptionsByStepAndFamily';

export default class ByoAccessorySelection extends LightningElement {
    @api productType;
    @track accessories = [];
    @track accessoryNone = false;
    @track openSections = {};    //NEW: section open/close state

    @wire(getOptionsByStepAndFamily, { stepKey: 'ACCESSORY', productFamily: '$productType' })
    wiredAccessories({ data, error }) {
        if (data) {
            this.accessories = this.formatOptions(data);
        } else if (error) {
            console.error(error);
        }
    }

    // NEW: group accessories into sections
    get sectionedAccessories() {
        let grouped = {};

        this.accessories.forEach(opt => {
            const section = opt.Section__c || 'Accessories';

            if (!grouped[section]) {
                grouped[section] = [];
            }

            grouped[section].push(opt);
        });

        return Object.keys(grouped).map(section => {
            const isOpen = this.openSections[section] || false;

            //  count selected
            const selectedCount = grouped[section].filter(opt => opt.isSelected).length;

            //  total count
            const totalCount = grouped[section].length;

            return {
                sectionName: section,
                options: grouped[section],
                isOpen: isOpen,
                icon: isOpen ? '▼' : '▶',
                selectedCount: selectedCount,
                totalCount: totalCount
            };
        });
    }

    // NEW: toggle section
    handleToggleSection(event) {
        const sectionName = event.currentTarget.dataset.section;

        this.openSections = {
            ...this.openSections,
            [sectionName]: !this.openSections[sectionName]
        };
    }

    formatOptions(data) {
        return data.map(opt => {
            const isQtyRequired = opt.Is_Quantity_Required__c || false;
            const min = opt.Minimum_Quantity__c || 1;
            const max = opt.Maximum_Quantity__c || 8;

            // --- Parse Position Metadata ---
            const isPosRequired = opt.Is_Position_Required__c || false;
            let posOptions = [{ label: '-- Select Position --', value: '' }];
            
            if (isPosRequired && opt.Position_Options__c) {
                opt.Position_Options__c.split(',').forEach(item => {
                    const parts = item.split(':');
                    if (parts.length === 2) {
                        posOptions.push({ label: parts[1].trim(), value: parts[0].trim() });
                    } else {
                        posOptions.push({ label: parts[0].trim(), value: parts[0].trim() });
                    }
                });
            }

            // --- Keep the Tray Required Flag for Skip Logic ---
            const isTrayReq = opt.Is_Tray_Required__c || false;

            return {
                ...opt,
                uiKey: opt.Option_Key__c + opt.MasterLabel || opt.Id,
                isSelected: false,
                quantity: isQtyRequired ? min : '',
                isQtyRequired: isQtyRequired,
                isQtyDisabled: true,
                wrapperClass: 'accessory-item',
                qtyArray: isQtyRequired ? Array.from({ length: (max - min) + 1 }, (_, i) => i + min) : [],
                isPositionRequired: isPosRequired,
                positionOptions: posOptions,
                selectedPosition: '',
                isTrayRequired: isTrayReq // Used to tell parent if Tray page is needed
            };
        });
    }

    handleToggle(e) {
        const key = e.target.dataset.id;
        this.accessoryNone = false;

        this.accessories = this.accessories.map(opt => {
            if (opt.uiKey === key) {
                const selected = e.target.checked;
                return { 
                    ...opt, 
                    isSelected: selected, 
                    isQtyDisabled: !selected,
                    selectedPosition: selected ? opt.selectedPosition : '', 
                    wrapperClass: selected ? 'accessory-item selected' : 'accessory-item'
                };
            }
            return opt;
        });
    }

    handleNoneToggle(e) {
        this.accessoryNone = e.target.checked;
        if (this.accessoryNone) {
            this.accessories = this.accessories.map(opt => ({
                ...opt, isSelected: false, isQtyDisabled: true, selectedPosition: '', wrapperClass: 'accessory-item'
            }));
        }

        const selects = this.template.querySelectorAll('select');
        selects.forEach(select => { select.value = ''; });
    }

    handleQtyChange(e) {
        const key = e.target.dataset.id;
        const val = e.target.value;
        this.accessories = this.accessories.map(opt => opt.uiKey === key ? { ...opt, quantity: val } : opt);
    }

    handlePositionChange(e) {
        const key = e.target.dataset.id;
        const val = e.target.value;
        this.accessories = this.accessories.map(opt => opt.uiKey === key ? { ...opt, selectedPosition: val } : opt);
    }

    // Validation checks ONLY position now
    get showNextButton() {
        if (this.accessoryNone) return true;
        
        const selectedAccessories = this.accessories.filter(a => a.isSelected);
        if (selectedAccessories.length === 0) return false;

        return selectedAccessories.every(a => {
            return a.isPositionRequired ? a.selectedPosition !== '' : true;
        });
    }

    handleNext() {
        const selectedAccessories = this.accessories
            .filter(a => a.isSelected)
            .map(a => {
                let display = `${a.Option_Label__c} - ${a.Option_Key__c}`;
                
                if (a.isPositionRequired && a.selectedPosition) {
                    display += ` (${a.selectedPosition})`;
                }

                return {
                    optionLabel: a.Option_Label__c,
                    optionKey: a.Option_Key__c,
                    quantity: a.quantity || '',
                    position: a.selectedPosition, 
                    requiresTrayPage: a.isTrayRequired, // PASS FLAG TO PARENT
                    displayValue: display
                };
            });

        const payload = {
            accessories: selectedAccessories,
            accessoryNone: this.accessoryNone
        };

        this.dispatchEvent(new CustomEvent('nextstep', { detail: { step: 'ACCESSORIES', payload: payload } }));
    }
}
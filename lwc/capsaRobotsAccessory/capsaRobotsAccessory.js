import { LightningElement, api, track } from 'lwc';
import getOptionsByStepAndFamily from '@salesforce/apex/CartConfiguratorController.getOptionsFresh';

export default class CapsaRobotsAccessory extends LightningElement {
    @api productType = 'Robots';
    @api selections;

    @track _options = [];
    @track _sectionOpenState = {};
    @track accessoryNone = false;
    @track isLoading = true;

    connectedCallback() {
        getOptionsByStepAndFamily({ stepKey: 'Accessories', productFamily: this.productType || 'Robots' })
            .then(data => {
                this._options = data.map(opt => ({
                    ...opt,
                    uiKey: opt.Option_Key__c,
                    isSelected: false,
                    wrapperClass: 'accessory-item'
                }));
                const sections = [...new Set(this._options.map(o => o.Section__c || 'Other'))];
                sections.forEach(s => { this._sectionOpenState[s] = true; });
                this._sectionOpenState = { ...this._sectionOpenState };
                this.isLoading = false;
            })
            .catch(error => {
                console.error('Error fetching Accessory options:', error);
                this.isLoading = false;
            });
    }

    get sectionedAccessories() {
        const sectionMap = {};
        this._options.forEach(opt => {
            const secName = opt.Section__c || 'Other';
            if (!sectionMap[secName]) {
                sectionMap[secName] = {
                    sectionName: secName,
                    isOpen: this._sectionOpenState[secName] !== false,
                    options: [],
                    selectedCount: 0,
                    totalCount: 0
                };
            }
            sectionMap[secName].options.push(opt);
            sectionMap[secName].totalCount += 1;
            if (opt.isSelected) sectionMap[secName].selectedCount += 1;
        });
        return Object.values(sectionMap).map(sec => ({
            ...sec,
            icon: sec.isOpen ? '▲' : '▼'
        }));
    }

    get showNextButton() {
        return this._options.some(o => o.isSelected) || this.accessoryNone;
    }

    handleToggleSection(event) {
        const sectionName = event.currentTarget.dataset.section;
        this._sectionOpenState = {
            ...this._sectionOpenState,
            [sectionName]: !this._sectionOpenState[sectionName]
        };
    }

    handleToggle(event) {
        const key = event.target.dataset.id;
        this.accessoryNone = false;
        this._options = this._options.map(opt => {
            if (opt.uiKey !== key) return opt;
            const isSelected = !opt.isSelected;
            return { ...opt, isSelected, wrapperClass: isSelected ? 'accessory-item selected' : 'accessory-item' };
        });
    }

    handleNoneToggle(event) {
        this.accessoryNone = event.target.checked;
        if (this.accessoryNone) {
            this._options = this._options.map(opt => ({
                ...opt,
                isSelected: false,
                wrapperClass: 'accessory-item'
            }));
        }
    }

    handleNext() {
        const accessories = this._options
            .filter(o => o.isSelected)
            .map(o => ({
                optionKey: o.Option_Key__c,
                optionLabel: o.Option_Label__c,
                section: o.Section__c,
                quantity: 1
            }));

        this.dispatchEvent(new CustomEvent('stepcomplete', {
            detail: {
                ACCESSORIES: { accessories, accessoryNone: this.accessoryNone }
            }
        }));
    }
}
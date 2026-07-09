import { LightningElement, track, api, wire } from 'lwc';
import getOptionsByStepAndFamily from '@salesforce/apex/CartConfiguratorController.getOptionsByStepAndFamily';
import SLIMCART_REP from '@salesforce/resourceUrl/slimcartrep';
import Monitor_IMG from '@salesforce/resourceUrl/Monitor';
import TABLET_IMG from '@salesforce/resourceUrl/Tablet';
import laptop_img from '@salesforce/resourceUrl/laptopsecuritybar';

export default class SlimCartCartType extends LightningElement {
    @api productType = 'slimcart';
    @api selections;

    @track useCaseOptions = [];
    @track tabletMountOptions = [];
    @track yesNoOptions = [];
    @track monitorMount = [];
    @track laptopSecurityOptions=[];
    @track monitorKeyboardOptions=[];
    @track isLoading = true;
    @track selectedYesNoLaptop = '';
    @track selectedMonitorMount = '';
    @track selectedTabletOptions='';
    @track showMonitorKeyboard = false;
    @track selectedMonitorYesNo ='';
    currentPreviewImage = SLIMCART_REP+'/laptop.jpg';
    laptopimage = laptop_img;
@track cartTypeText = '';
@track securityBarText = '';
@track securityBarText = false;
@track monitorMountdesc = false;
@track monitorKeyboard = false;

    // Internal UI tracker
    @track localSelection = '';
    @track selectedLaptop = false;
    @track selectedTablet = false;
    @track selectedMonitor = false;



    @wire(getOptionsByStepAndFamily, { stepKey: 'SLIM CART TYPE', productFamily: '$productType' })
    wiredOptions({ error, data }) {
        if (data) {
            this.useCaseOptions = data.map(opt => ({
                ...opt,
                isVisible: false,
                isSelected: false,
                rowClass: 'option-row'
            }));

            // Restore state if jumping backward
            if (this.selections && this.selections.Cart_Type && this.selections.Cart_Type.length > 0) {
                this.localSelection = this.selections.Cart_Type[0].key;
                this.syncUI();
            }
            this.isLoading = false;
        }
    }
    @wire(getOptionsByStepAndFamily, { stepKey: 'YESNO', productFamily: '$productType' })
    wiredOptions1({ error, data }) {
        if (data) {
            this.options = data.map(opt => ({
                ...opt,
                isVisible: false,
                isSelected: false,
                rowClass: 'option-row'
            }));

            // Restore state if jumping backward
            /*if (this.selections && this.selections.Cart_Type && this.selections.Cart_Type.length > 0) {
                this.yesNoSelection = this.selections.Cart_Type[0].key;
                this.syncYesNo();
            }*/
            this.laptopSecurityOptions=[...this.options];
            this.monitorKeyboardOptions = [...this.options];
            this.isLoading = false;
        }
    }
    @wire(getOptionsByStepAndFamily, { stepKey: 'MONITOR MOUNT', productFamily: '$productType' })
    wiredOptions2({ error, data }) {
        if (data) {
            this.monitorMount = data.map(opt => ({
                ...opt,
                isVisible: false,
                isSelected: false,
                rowClass: 'option-row'
            }));

            // Restore state if jumping backward
            if (this.selections && this.selections.Cart_Type && this.selections.Cart_Type.length > 0) {
                this.selectedMonitorMount = this.selections.Cart_Type[0].key;
                this.syncMonitorMount();
            }
            this.isLoading = false;
        }
    }
    @wire(getOptionsByStepAndFamily, { stepKey: 'TABLET MOUNT', productFamily: '$productType' })
    wiredTabletOptions({ error, data }) {
        if (data) {
            this.tabletMountOptions = data.map(opt => ({
                ...opt,
                isVisible: false,
                isSelected: false,
                rowClass: 'option-row'
            }));

            // Restore state if jumping backward
            if (this.selections && this.selections.Cart_Type && this.selections.Cart_Type.length > 0) {
                this.selectedTabletOptions = this.selections.Cart_Type[0].key;
                this.syncTablet();
            }
            this.isLoading = false;
        }
    }

    connectedCallback() {
        console.log('inside slim cart cartype 1');

    }

    handleMouseEnter(event) {
        this.toggleDescription(event.currentTarget.dataset.key, true);
    }

    handleMouseLeave(event) {
        this.toggleDescription(event.currentTarget.dataset.key, false);
    }

    toggleDescription(key, isHovering) {
        this.useCaseOptions = this.useCaseOptions.map(opt => ({
            ...opt,
            isVisible: (opt.Option_Key__c === key && isHovering) || opt.isSelected
        }));
         this.tabletMountOptions = this.tabletMountOptions.map(opt => ({
            ...opt,
            isVisible: (opt.Option_Key__c === key && isHovering) || opt.isSelected
        }));
         this.monitorMount = this.monitorMount.map(opt => ({
            ...opt,
            isVisible: (opt.Option_Key__c === key && isHovering) || opt.isSelected
        }));
    }

    handleSelect(event) {
        this.localSelection = event.currentTarget.dataset.key;
        this.monitorMountdesc = false;
        this.cartTypeText = 'Laptop - 207048';
        console.log('inside cord event' + this.localSelection);
        this.showKeyboard = false;
        this.monitorKeyboard = false;
        this.selectedLaptop = false;
        this.showMonitorKeyboard = false;
        this.securityBarText = false;
        if (this.localSelection === 'Laptop') {
            this.selectedLaptop = true;
            this.selectedTablet = false;
            this.selectedMonitor = false;
            this.currentPreviewImage = SLIMCART_REP+'/laptop.jpg';// replace with exact filename
        }
        else if (this.localSelection === 'Tablet') {
            this.selectedTablet = true;
            this.selectedLaptop = false;
            this.selectedMonitor = false;
            this.currentPreviewImage = TABLET_IMG+'/tablet.jpg';// replace with exact filename
        }
        else if (this.localSelection === 'Monitor') {
            this.selectedMonitor = true;
            this.selectedTablet = false;
            this.selectedLaptop = false;
            this.currentPreviewImage = Monitor_IMG+'/monitor.jpg';// replace with exact filename
        }

        this.syncUI();
    }
    handleMonitorMount(event){
        this.selectedMonitorMount = event.currentTarget.dataset.key;
        this.monitorMountdesc = true;
        this.showMonitorKeyboard = true;
        this.currentPreviewImage = Monitor_IMG+'/monitor.jpg';// replace with exact filename
        this.syncMonitorMount();
    }
   handleYesNo(event) {
    this.selectedYesNoLaptop = event.currentTarget.dataset.key;
    this.securityBarVisible = true;
    if (this.selectedYesNoLaptop === 'Yes') {
        this.currentPreviewImage = SLIMCART_REP + '/laptop.jpg';
        this.cartTypeText = 'Laptop - 207048';
        this.securityBarText = 'Yes - 207057';
    } else {
        this.currentPreviewImage = SLIMCART_REP + '/laptop.jpg';
        this.cartTypeText = 'Laptop - 207048';
        this.securityBarText = 'No';
    }
    this.syncLaptopSecurity(); // CHANGED
}

handleMonitorYesNo(event) {
    this.selectedMonitorYesNo = event.currentTarget.dataset.key;
    this.monitorKeyboard = true;
    if (this.selectedMonitorYesNo === 'Yes') {
        this.monitorkeyBoardText = 'Yes - 207410';
        this.currentPreviewImage = Monitor_IMG + '/monitor_keyboard_tray.jpg';
    } else {
        this.monitorkeyBoardText = 'No';
        this.currentPreviewImage = Monitor_IMG + '/monitor.jpg';
    }
    this.syncMonitorKeyboard(); // CHANGED
}
   
    handleTablet(event) {
        this.selectedTabletOptions = event.currentTarget.dataset.key;
        this.currentPreviewImage = TABLET_IMG+'/tablet.jpg';// replace with exact filename
        console.log('fdsf'+this.selectedTabletOptions);
        if(this.selectedTabletOptions === 'Medium Clip-In Tablet Holder' || this.selectedTabletOptions === 'Large Clip-In Tablet Holder'){
            this.currentPreviewImage = TABLET_IMG+'/tablet_SlimCartFlex.jpg';// replace with exact filename
        }
        
        this.syncTablet();
    }

    syncUI() {
        this.useCaseOptions = this.useCaseOptions.map(opt => {
            const isSelected = opt.Option_Key__c === this.localSelection;
            return {
                ...opt,
                isSelected: isSelected,
                isVisible: isSelected, // Permanent show when selected
                rowClass: isSelected ? 'option-row selected' : 'option-row'
            };
        });
    }
    syncTablet() {
        this.tabletMountOptions = this.tabletMountOptions.map(opt => {
            const isSelected = opt.Option_Key__c === this.selectedTabletOptions;
            return {
                ...opt,
                isSelected: isSelected,
                isVisible: isSelected, // Permanent show when selected
                rowClass: isSelected ? 'option-row selected' : 'option-row'
            };
        });
    }
    

syncLaptopSecurity() {
    this.laptopSecurityOptions = this.laptopSecurityOptions.map(opt => {
        const isSelected = opt.Option_Key__c === this.selectedYesNoLaptop;
        return {
           ...opt,
            isSelected: isSelected,
            isVisible: isSelected,
            rowClass: isSelected ? 'option-row selected' : 'option-row'
        };
    });
}

syncMonitorKeyboard() {
    this.monitorKeyboardOptions = this.monitorKeyboardOptions.map(opt => {
        const isSelected = opt.Option_Key__c === this.selectedMonitorYesNo;
        return {
           ...opt,
            isSelected: isSelected,
            isVisible: isSelected,
            rowClass: isSelected ? 'option-row selected' : 'option-row'
        };
    });
}
    syncMonitorMount() {
        this.monitorMount = this.monitorMount.map(opt => {
            const isSelected = opt.Option_Key__c === this.selectedMonitorMount;
            return {
                ...opt,
                isSelected: isSelected,
                isVisible: isSelected, // Permanent show when selected
                rowClass: isSelected ? 'option-row selected' : 'option-row'
            };
        });
    }

    get isStepComplete() {
        if (this.localSelection === 'Laptop') {
            return this.selectedYesNoLaptop !== '';
        }
        else if (this.localSelection === 'Tablet') {
            return this.selectedTabletOptions !== '';
        }
        else if (this.localSelection === 'Monitor') {
            if (this.selectedMonitorMount) {
                console.log('inside monitor');
                
                return this.selectedMonitorYesNo !== '';
            }}
        return false;
    }

   handleNext() {
        // 1. Locate the selected record metadata

        let selectedOpt ;
        if(this.localSelection){
        selectedOpt = this.useCaseOptions.find(opt => opt.Option_Key__c === this.localSelection);
        }else if(this.selectedLaptop){
            selectedOpt = this.laptopSecurityOptions.find(opt => opt.Option_Key__c === this.selectedYesNoLaptop);
        }else if(this.selectedTablet){
            selectedOpt = this.tabletMountOptions.find(opt => opt.Option_Key__c === this.selectedTabletOptions);
        }
        else if(this.selectedMonitor){
            selectedOpt = this.monitorMount.find(opt => opt.Option_Key__c === this.selectedMonitor); 
        }else if(this.showMonitorKeyboard){
            selectedOpt = this.monitorKeyboardOptions.find(opt => opt.Option_Key__c === this.selectedMonitorYesNo); 
        }


        // 2. Build the unified payload array
        let payloadArray = [];
        if (selectedOpt) {
            payloadArray.push({
                key: selectedOpt.Option_Key__c,      // Used by internal LWC logic/filters
                label: selectedOpt.Option_Label__c,  // Used by the Results UI
                sku: null                            // Not a billable item
            });
        }

        // 3. Dispatch perfectly structured state
        this.dispatchEvent(new CustomEvent('stepcomplete', {
            detail: {
                Cart_Type: payloadArray,
                previewImage: this.currentPreviewImage
            }
        }));
    }
}
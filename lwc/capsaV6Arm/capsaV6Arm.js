import { LightningElement, track, api, wire } from 'lwc';
import getOptionsByStepAndFamily from '@salesforce/apex/CartConfiguratorController.getOptionsByStepAndFamily';

export default class CapsaV6Arm extends LightningElement {
    @api productType = 'V6';
    @api selections;
	@api previewImage;

    @track armOptions = [];
    @track soloArmOptions = [];
    @track independentOpts = [];
    @track fixedHgtOptions = [];
    @track heightAdjOpts = [];
    @track singleMonitorOpts = [];
    @track dualMonitorOpts = [];

    @track currentPreviewImage;
    @track baseImage;
    @track currentArmSelectionValue = '';
    @track isLoading = true;
    @track armSelection = '';
    @track selectedSolo = false;
    @track soloArm = '';
    @track selectedInd = false;
    @track monitorSelection = '';
    @track selectedFixHgt = false;
    @track fixedHgtArm = '';
    @track selectedhgtAdj = false;
    @track heightAdjArm = '';
    @track selSingleMonitor = false;
    @track singleMonitor = '';
    @track selDualMonitor = false;
    @track dualMonitor = '';

    get filteredArmOptions() {
        if (this.selV612ArmMount) {
            return this.armOptions.slice(1);
        } else {
            return this.armOptions;
        }
    }
    get localSelection() {
        return this.selections && this.selections.localSelection;
    }

    get selectedV612() {
        console.log('@@ getter selectedV612: '+ (this.selections && this.selections.selectedV612));
        return this.selections && this.selections.selectedV612;
    }

    get showWallArm(){
        return this.selectedV612 && !this.selV612ArmMount;
    }
    get selV612ArmMount() {
        console.log('@@ getter selectedArmMount: '+ (this.selections && this.selections.selectedArmMount));
        return this.selections && this.selections.selectedArmMount === 'Solo Arm – Single Arm Supports Keyboard and Monitor (fixed)';
    }

    get showArmOptions() {
        return this.selectedInd || (this.selectedV612 && !this.selV612ArmMount);
    }

    get showSolo(){
        return this.selectedSolo || (this.selectedV612 && this.selV612ArmMount);
    }

    get currentArmSelection() {
        return this.currentArmSelectionValue;
    }

    @wire(getOptionsByStepAndFamily, { stepKey: 'V6 ARM', productFamily: '$productType' })
    wiredOptions1({ error, data }) {
        if (data) {
            this.armOptions = data.map(opt => ({ ...opt, isVisible: false, isSelected: false, rowClass: 'option-row' }));
            if (this.selections && this.selections.ARM && this.selections.ARM.length > 0) {
                this.armSelection = this.selections.ARM[0].key;
                this.syncUI();
            }
            this.isLoading = false;
        }
    }

    @wire(getOptionsByStepAndFamily, { stepKey: 'V6 SOLO ARM', productFamily: '$productType' })
    wiredOptions2({ error, data }) {
        if (data) {
            this.soloArmOptions = data.map(opt => ({ ...opt, isVisible: false, isSelected: false, rowClass: 'option-row' }));
            if (this.selections && this.selections.ARM && this.selections.ARM.length > 0) {
                this.soloArm = this.selections.ARM[0].key;
                this.syncSOLO();
            }
            this.isLoading = false;
        }
    }

    @wire(getOptionsByStepAndFamily, { stepKey: 'V6 MONITOR ARM', productFamily: '$productType' })
    wiredOptions3({ error, data }) {
        if (data) {
            this.independentOpts = data.map(opt => ({ ...opt, isVisible: false, isSelected: false, rowClass: 'option-row' }));
            if (this.selections && this.selections.ARM && this.selections.ARM.length > 0) {
                this.monitorSelection = this.selections.ARM[0].key;
                this.syncIND();
            }
            this.isLoading = false;
        }
    }

    @wire(getOptionsByStepAndFamily, { stepKey: 'V6 ARM FX HGT', productFamily: '$productType' })
    wiredOptions4({ error, data }) {
        if (data) {
            this.fixedHgtOptions = data.map(opt => ({ ...opt, isVisible: false, isSelected: false, rowClass: 'option-row' }));
            if (this.selections && this.selections.ARM && this.selections.ARM.length > 0) {
                this.fixedHgtArm = this.selections.ARM[0].key;
                this.syncFIX();
            }
            this.isLoading = false;
        }
    }

    @wire(getOptionsByStepAndFamily, { stepKey: 'V6 ARM HGT ADJ', productFamily: '$productType' })
    wiredOptions5({ error, data }) {
        if (data) {
            this.heightAdjOpts = data.map(opt => ({ ...opt, isVisible: false, isSelected: false, rowClass: 'option-row' }));
            if (this.selections && this.selections.ARM && this.selections.ARM.length > 0) {
                this.heightAdjArm = this.selections.ARM[0].key;
                this.syncHEIGHT();
            }
            this.isLoading = false;
        }
    }

    @wire(getOptionsByStepAndFamily, { stepKey: 'V6 S MONITOR', productFamily: '$productType' })
    wiredOptions6({ error, data }) {
        if (data) {
            this.singleMonitorOpts = data.map(opt => ({ ...opt, isVisible: false, isSelected: false, rowClass: 'option-row' }));
            if (this.selections && this.selections.ARM && this.selections.ARM.length > 0) {
                this.singleMonitor = this.selections.ARM[0].key;
                this.syncSINGLE();
            }
            this.isLoading = false;
        }
    }

    @wire(getOptionsByStepAndFamily, { stepKey: 'V6 D MONITOR', productFamily: '$productType' })
    wiredOptions7({ error, data }) {
        if (data) {
            this.dualMonitorOpts = data.map(opt => ({ ...opt, isVisible: false, isSelected: false, rowClass: 'option-row' }));
            if (this.selections && this.selections.ARM && this.selections.ARM.length > 0) {
                this.dualMonitor = this.selections.ARM[0].key;
                this.syncDUAL();
            }
            this.isLoading = false;
        }
    }

    get isStepComplete() {
        console.log('@@NEXTBUT: isStepComplete');
        if (this.selections && this.selections.selectedV612) {
            console.log('@@NEXTBUT: selectedV612 condition');
            if (this.selV612ArmMount) {
                return this.soloArm !== '';
            } else {
                return (this.monitorSelection !== '' && (this.fixedHgtArm !== '' || (this.heightAdjArm !== '' && this.singleMonitor !== '' || this.dualMonitor !== '')));
            }
        }
        if (this.armSelection === 'Solo Arm') {
            console.log('@@NEXTBUT: Solo Arm condition');
            return this.soloArm !== '';
        } else if (this.armSelection === 'Independent Monitor and Keyboard Arms') {
            console.log('@@NEXTBUT: Independent Monitor and Keyboard Arms condition');
            if (this.monitorSelection === 'Fixed Height') {
                console.log('@@NEXTBUT: Fixed Height condition');
                return this.fixedHgtArm !== '';
            } else if (this.monitorSelection === 'Height Adjustable') {
                console.log('@@NEXTBUT: Height Adjustable condition');
                if (this.heightAdjArm === 'Single Monitor') {
                    console.log('@@NEXTBUT: Single Monitor condition');
                    return this.singleMonitor !== '';
                } else if (this.heightAdjArm === 'Dual Monitor') {
                    console.log('@@NEXTBUT: Dual Monitor condition');
                    return this.dualMonitor !== '';
                }
            }
        } else {
            console.log('@@NEXTBUT: Default condition');
            return this.armSelection !== '';
        }
        return false;
    }

    get overlayData() {
        if (this.soloArm) {
            return { image: this.currentPreviewImage, style: 'solo-overlay' };
        } else if (this.fixedHgtArm) {
            return { image: this.currentPreviewImage, style: 'fixH-overlay' };
        } else if (this.singleMonitor) {
            return { image: this.currentPreviewImage, style: 'single-overlay' };
        } else if (this.dualMonitor) {
            return { image: this.currentPreviewImage, style: 'dual-overlay' };
        }
        return { image: '', style: '' };
    }
    
    connectedCallback() {
        this.baseImage = this.selections?.layeredPreview?.baseImage || this.selections?.previewImage;
        // this.currentPreviewImage = this.selections?.previewImage;
        console.log('@@DEBUG resolved baseImage:' + this.baseImage);
    }

    handleMouseEnter(event) {
        this.toggleDescription(event.currentTarget.dataset.key, true);
    }

    handleMouseLeave(event) {
        this.toggleDescription(event.currentTarget.dataset.key, false);
    }

    toggleDescription(key, isHovering) {
        this.armOptions = this.armOptions.map(opt => ({
            ...opt,
            isVisible: (opt.Option_Key__c === key && isHovering) || opt.isSelected
        }));
        this.soloArmOptions = this.soloArmOptions.map(opt => ({
            ...opt,
            isVisible: (opt.Option_Key__c === key && isHovering) || opt.isSelected
        }));
        this.independentOpts = this.independentOpts.map(opt => ({
            ...opt,
            isVisible: (opt.Option_Key__c === key && isHovering) || opt.isSelected
        }));
        this.fixedHgtOptions = this.fixedHgtOptions.map(opt => ({
            ...opt,
            isVisible: (opt.Option_Key__c === key && isHovering) || opt.isSelected
        }));
        this.heightAdjOpts = this.heightAdjOpts.map(opt => ({
            ...opt,
            isVisible: (opt.Option_Key__c === key && isHovering) || opt.isSelected
        }));
        this.singleMonitorOpts = this.singleMonitorOpts.map(opt => ({
            ...opt,
            isVisible: (opt.Option_Key__c === key && isHovering) || opt.isSelected
        }));
        this.dualMonitorOpts = this.dualMonitorOpts.map(opt => ({
            ...opt,
            isVisible: (opt.Option_Key__c === key && isHovering) || opt.isSelected
        }));
    }

    handleSelect(event) {
        this.armSelection = event.currentTarget.dataset.key;
        console.log('inside cord event: ' + this.armSelection);
        if (this.armSelection === 'Independent Monitor and Keyboard Arms') {
            this.selectedInd = true;
            this.selectedSolo = false;
        } else if (this.armSelection === 'Solo Arm') {
            this.selectedSolo = true;
            this.selectedInd = false;
        }
        this.syncUI();
    }

    syncUI() {
        this.armOptions = this.armOptions.map(opt => {
            const isSelected = opt.Option_Key__c === this.armSelection;
            return { ...opt, isSelected: isSelected, isVisible: isSelected, rowClass: isSelected ? 'option-row selected' : 'option-row' };
        });
    }

    handleSoloEvent(event) {
        this.soloArm = event.currentTarget.dataset.key;
        this.currentArmSelectionValue = this.soloArm;
		if (this.soloArm === 'Solo - V600-S1XX-00000') {
			this.currentPreviewImage = '/resource/v6_solo/V6_Solo_on_Track_V600-S1XX-00000.png';
		} else if (this.soloArm === 'Solo - V600-S2XX-00000') {
			this.currentPreviewImage = '/resource/v6_solo/V6_Solo_12in_Dynamic_Arm_V600-S2XX-00000.png';
		} else if (this.soloArm === 'Solo - V600-S3XX-00000') {
			this.currentPreviewImage = '/resource/v6_solo/V6_Solo_9in_Straight_12in_Dynamic_Arm_V600-S3XX-00000.png';
		} else if (this.soloArm === 'Solo - V600-S4XX-00000') {
			this.currentPreviewImage = '/resource/v6_solo/V6_Solo_12in_Straight_Arm_V600-S4XX-00000.png';
		} else if (this.soloArm === 'Solo - V600-S5XX-00000') {
			this.currentPreviewImage = '/resource/v6_solo/V6_Solo_Two_12in_Straight_Arm_V600-S5XX-00000.png';
		} else if (this.soloArm === 'Solo - V600-S6XX-00000') {
			this.currentPreviewImage = '/resource/v6_solo/V6_Solo_20in_HD_Dynamic_Arm_V600-S6XX-00000.png';
		}
        this.fixedHgtArm = false;
        this.singleMonitor = false;
        this.dualMonitor = false;
        this.syncSOLO();
    }

    syncSOLO() {
        this.soloArmOptions = this.soloArmOptions.map(opt => {
            const isSelected = opt.Option_Key__c === this.soloArm;
            return { ...opt, isSelected: isSelected, isVisible: isSelected, rowClass: isSelected ? 'option-row selected' : 'option-row' };
        });
    }

    handleIndEvent(event) {
        this.monitorSelection = event.currentTarget.dataset.key;
        if (this.monitorSelection === 'Fixed Height') {
            this.selectedFixHgt = true;
            this.selectedhgtAdj = false;
        } else if (this.monitorSelection === 'Height Adjustable') {
            this.selectedhgtAdj = true;
            this.selectedFixHgt = false;
        }
        this.syncIND();
    }

    syncIND() {
        this.independentOpts = this.independentOpts.map(opt => {
            const isSelected = opt.Option_Key__c === this.monitorSelection;
            return { ...opt, isSelected: isSelected, isVisible: isSelected, rowClass: isSelected ? 'option-row selected' : 'option-row' };
        });
    }

    handleFixEvent(event) {
        this.fixedHgtArm = event.currentTarget.dataset.key;
        this.currentArmSelectionValue = this.fixedHgtArm;
		if (this.fixedHgtArm === 'Monitor Ball Joint - V600-0100-00000') {
			this.currentPreviewImage = '/resource/v6_arm_ind_fix/V6_Monitor_Ball_Joint_V600-0100-00000.png';
		} else if (this.fixedHgtArm === 'Monitor 9in Straight Arm - V600-0200-00000') {
			this.currentPreviewImage = '/resource/v6_arm_ind_fix/V6_Monitor_9in_Straight_Arm_V600-0200-00000.png';
		} else if (this.fixedHgtArm === 'Monitor Two 9in Straight Arms - V600-0300-00000') {
			this.currentPreviewImage = '/resource/v6_arm_ind_fix/V6_Monitor_Two_9in_Straight_Arm_V600-0300-00000.png';
		} else if (this.fixedHgtArm === 'Monitor 12in Straight Arm - V600-0400-00000') {
			this.currentPreviewImage = '/resource/v6_arm_ind_fix/V6_Monitor_12in_Straight_Arm_V600-0400-00000.png';
		} else if (this.fixedHgtArm === 'Monitor Two 12in Straight Arms - V600-0500-00000') {
			this.currentPreviewImage = '/resource/v6_arm_ind_fix/V6_Monitor_Two_12in_Straight_Arm_V600-0500-00000.png';
		}
        this.soloArm = false;
        this.singleMonitor = false;
        this.dualMonitor = false;
        this.syncFIX();
    }

    syncFIX() {
        this.fixedHgtOptions = this.fixedHgtOptions.map(opt => {
            const isSelected = opt.Option_Key__c === this.fixedHgtArm;
            if (isSelected && opt.Preview_Image_URL__c) {
                this.currentPreviewImage = opt.Preview_Image_URL__c;
            }
            return {
                ...opt,
                isSelected: isSelected,
                isVisible: isSelected, // Permanent show when selected
                rowClass: isSelected ? 'option-row selected' : 'option-row'
            };
        });
    }

    handleHeightEvent(event) {
        this.heightAdjArm = event.currentTarget.dataset.key;
        this.currentArmSelectionValue = this.heightAdjArm;
        if (this.heightAdjArm === 'Single Monitor') {
            this.selSingleMonitor = true;
            this.selDualMonitor = false;
        } else if (this.heightAdjArm === 'Dual Monitor') {
            this.selDualMonitor = true;
            this.selSingleMonitor = false;
        }
        this.syncHEIGHT();
    }

    syncHEIGHT() {
        this.heightAdjOpts = this.heightAdjOpts.map(opt => {
            const isSelected = opt.Option_Key__c === this.heightAdjArm;
            if (isSelected && opt.Preview_Image_URL__c) {
                this.currentPreviewImage = opt.Preview_Image_URL__c;
            }
            return {
                ...opt,
                isSelected: isSelected,
                isVisible: isSelected, // Permanent show when selected
                rowClass: isSelected ? 'option-row selected' : 'option-row'
            };
        });
    }

    handleSingleEvent(event) {
        this.singleMonitor = event.currentTarget.dataset.key;
        this.currentArmSelectionValue = this.singleMonitor;
		if (this.singleMonitor === 'V6 Monitor 12in Dynamic Arm - V600-0600-00000') {
			this.currentPreviewImage = '/resource/v6_ind_adj_sing/V6_Monitor_12in_Dynamic_Arm_V600-0600-00000.png';
		} else if (this.singleMonitor === 'V6 Monitor 9in Straight 12in Dynamic Arm - V600-0700-00000') {
			this.currentPreviewImage = '/resource/v6_ind_adj_sing/V6_Monitor_9in_Straight_12in_Dynamic_Arm_V600-0700-00000.png';
		} else if (this.singleMonitor === 'V6 Monitor 12in Straight 12in Dynamic Arm - V600-0800-00000') {
			this.currentPreviewImage = '/resource/v6_ind_adj_sing/V6_Monitor_12in_Straight_12in_Dynamic_Arm_V600-0800-00000.png';
		} else if (this.singleMonitor === 'V6 Monitor 20in Dynamic Arm - V600-0900-00000') {
			this.currentPreviewImage = '/resource/v6_ind_adj_sing/V6_Monitor_20in_Dyanmic_Arm_V600-0900-00000.png';
		} else if (this.singleMonitor === 'V6 Monitor 20in HD Dynamic Arm - V600-1000-00000') {
			this.currentPreviewImage = '/resource/v6_ind_adj_sing/V6_Monitor_20in_HD_Dynamic_Arm_V600-1000-00000.png';
		} else if (this.singleMonitor === 'V6 Monitor 9in Strt 20in Dynm Arm - V600-1100-00000') {
			this.currentPreviewImage = '/resource/v6_ind_adj_sing/V6_Monitor_9in_Strt_20in_Dynm_Arm_V600-1100-00000.png';
		} else if (this.singleMonitor === 'V6 Monitor 12in Strt 20in Dynm Arm - V600-1200-00000') {
			this.currentPreviewImage = '/resource/v6_ind_adj_sing/V6_Monitor_12in_Strt_20in_Dynm_Arm_V600-1200-00000.png';
		} else if (this.singleMonitor === 'V6 Monitor 9in Strt 20in HD Dynm Arm - V600-1300-00000') {
			this.currentPreviewImage = '/resource/v6_ind_adj_sing/V6_Monitor_12in_Strt_20in_HD_Dynm_Arm_V600-1300-00000.png';
		} else if (this.singleMonitor === 'V6 Monitor 12in Strt 20in HD Dynm Arm - V600-1400-00000') {
			this.currentPreviewImage = '/resource/v6_ind_adj_sing/V6_Monitor_12in_Strt_20in_HD_Dynm_Arm_V600-1400-00000.png';
		}
        this.fixedHgtArm = false;
        this.soloArm = false;
        this.dualMonitor = false;
        this.syncSINGLE();
    }

    syncSINGLE() {
        this.singleMonitorOpts = this.singleMonitorOpts.map(opt => {
            const isSelected = opt.Option_Key__c === this.singleMonitor;
            if (isSelected && opt.Preview_Image_URL__c) {
                this.currentPreviewImage = opt.Preview_Image_URL__c;
            }
            return {
                ...opt,
                isSelected: isSelected,
                isVisible: isSelected, // Permanent show when selected
                rowClass: isSelected ? 'option-row selected' : 'option-row'
            };
        });
    }

    handleDualEvent(event) {
        this.dualMonitor = event.currentTarget.dataset.key;
        this.currentArmSelectionValue = this.dualMonitor;
		if (this.dualMonitor === 'V6 Dual Monitor 9in Straight 12in Dynamic Arm - V600-1500-00000') {
			this.currentPreviewImage = '/resource/v6_ind_adj_dual/V6_Dual_Monitor_9in_Strt_12in_Dynm_Arm_V600-1500-00000.png';
		} else if (this.dualMonitor === 'V6 Dual Monitor 12in Dynamic Arm - V600-1600-00000') {
			this.currentPreviewImage = '/resource/v6_ind_adj_dual/V6_Dual_Monitor_12in_Dynm_Arm_V600-1600-00000.png';
		}
        this.fixedHgtArm = false;
        this.singleMonitor = false;
        this.soloArm = false;
        this.syncDUAL();
    }

    syncDUAL() {
        this.dualMonitorOpts = this.dualMonitorOpts.map(opt => {
            const isSelected = opt.Option_Key__c === this.dualMonitor;
            if (isSelected && opt.Preview_Image_URL__c) {
                this.currentPreviewImage = opt.Preview_Image_URL__c;
            }
            return {
                ...opt,
                isSelected: isSelected,
                isVisible: isSelected, // Permanent show when selected
                rowClass: isSelected ? 'option-row selected' : 'option-row'
            };
        });
    }

    handleNext() {
        // 1. Locate the selected record metadata
        let selectedOpt;
        if (this.selectedSolo || this.showSolo) {
            selectedOpt = this.soloArmOptions.find(opt => opt.Option_Key__c === this.soloArm);
        } else if (this.selectedFixHgt) {
            selectedOpt = this.fixedHgtOptions.find(opt => opt.Option_Key__c === this.fixedHgtArm);
        } else if (this.selSingleMonitor) {
            selectedOpt = this.singleMonitorOpts.find(opt => opt.Option_Key__c === this.singleMonitor);
        } else if (this.selDualMonitor) {
            selectedOpt = this.dualMonitorOpts.find(opt => opt.Option_Key__c === this.dualMonitor);
        }

		const payloadArray = [{
            key: selectedOpt.Option_Key__c,
            label: selectedOpt.Option_Label__c,
            sku: null
        }];

        // Stack this arm's own image as overlay[0], on top of the inherited Track base
        const armOverlay = {
            key: 'arm',
            url: this.currentPreviewImage,
            style: 'position:absolute;top:0;left:0;width:100%;height:100%;object-fit:contain;'
        };

        // const trackBaseImage = this.selections?.layeredPreview?.baseImage;
        // 3. Dispatch perfectly structured state
        this.dispatchEvent(new CustomEvent('stepcomplete', {
            detail: {
                ARM: payloadArray,
                previewImage: this.overlayData.image,
                layeredPreview: { baseImage: this.baseImage, overlays: [armOverlay] },
                // layeredPreview : this.trackBaseImage,
                soloArm: this.soloArm,
                // monitorSelection: this.monitorSelection,
                fixedHgtArm: this.fixedHgtArm,
                heightAdjArm: this.heightAdjArm,
                singleMonitor: this.singleMonitor,
                dualMonitor: this.dualMonitor,
                currentArmSelection: this.currentArmSelection
            }
        }));
    }
}
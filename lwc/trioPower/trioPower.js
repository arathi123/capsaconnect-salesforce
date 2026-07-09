import { LightningElement, api, track } from 'lwc';
import getOptionsByStepAndFamily
    from '@salesforce/apex/CartConfiguratorController.getOptionsByStepAndFamily';

export default class TrioPower extends LightningElement {

    @api productType = 'Trio';
    @api selections;
    selectedBattery = '';
    selectedExternalBattery = '';
    @track batteryOptions = [];
    @track externalBatteryOptions = [];

    @track powerOptions = [];
    @track cordOptions = [];

    @track externalBatteryComponentOptions = [];
    @track electronicLockOptions = [];
    @track fleetOptions = [];

    selectedExternalBatteryComponent = '';
    selectedElectronicLock = '';
    selectedFleet = '';
    @track batteryCount = '1';

    @track selectedBatteryComponentKeys = [];

    @track selectedPower = '';
    @track selectedCord = '';

    @track hoveredCordKey = '';

    @track currentPreviewImage =
        '/resource/trioImagePart1/trioImagePart1/documentation.jpg';

    @track isLoading = true;

    connectedCallback() {

        this.currentPreviewImage =
        this.selections?.previewImage ||
        '/resource/trioImagePart1/trioImagePart1/documentation.jpg';

        this.loadMetadata();
            this.loadMetadata();
    }

    async loadMetadata() {

        try {

           const [
            powerData,
            cordData,
            batteryData,
            externalBatteryData,
            externalBatteryComponentData,
            electronicLockData,
            fleetData
            ] = await Promise.all([

                getOptionsByStepAndFamily({
                    stepKey: 'POWER OPTION',
                    productFamily: this.productType
                }),

                getOptionsByStepAndFamily({
                    stepKey: 'POWER CORD',
                    productFamily: this.productType
                }),

                getOptionsByStepAndFamily({
                    stepKey: 'BATTERY OPTION',
                    productFamily: this.productType
                }),

                getOptionsByStepAndFamily({
                    stepKey: 'EXTERNAL BATTERY',
                    productFamily: this.productType
                }),

                getOptionsByStepAndFamily({
                    stepKey: 'EXTERNAL BATTERY COMPONENTS',
                    productFamily: this.productType
                }),

                getOptionsByStepAndFamily({
                    stepKey: 'ELECTRONIC LOCK',
                    productFamily: this.productType
                }),

                getOptionsByStepAndFamily({
                    stepKey: 'FLEET MANAGEMENT',
                    productFamily: this.productType
                })
            ]);

            console.log('POWER DATA', JSON.stringify(powerData));
            console.log('CORD DATA', JSON.stringify(cordData));
            console.log('BATTERY DATA', JSON.stringify(batteryData));
            console.log('EXTERNAL BATTERY DATA', JSON.stringify(externalBatteryData));
            console.log('EXTERNAL BATTERY COMPONENT DATA', JSON.stringify(externalBatteryComponentData));
            console.log('ELECTRONIC LOCK DATA', JSON.stringify(electronicLockData));
            console.log('FLEET DATA', JSON.stringify(fleetData));
            this.powerOptions =
                (powerData || []).map(opt => ({
                    ...opt,
                    isVisible: false,
                    isSelected: false,
                    rowClass: 'option-row'
                }));

             this.batteryOptions =
                (batteryData || []).map(opt => ({
                    ...opt,
                    isVisible: false,
                    isSelected: false,
                    rowClass: 'option-row'
                }));

             this.externalBatteryOptions =
                (externalBatteryData || []).map(opt => ({
                    ...opt,
                    isVisible: false,
                    isSelected: false,
                    rowClass: 'option-row'
                }));    

    this.externalBatteryComponentOptions =
        (externalBatteryComponentData || []).map(opt => ({

            ...opt,

            isVisible:false,

            isSelected:false,

            rowClass:'option-row',

            isBattery:
                opt.Option_Key__c === '900164'

        }));

        this.electronicLockOptions =
            (electronicLockData || []).map(opt => ({
                ...opt,
                isVisible: false,
                isSelected: false,
                rowClass: 'option-row'
            }));

            this.fleetOptions =
                (fleetData || []).map(opt => ({
                    ...opt,
                    isVisible: false,
                    isSelected: false,
                    rowClass: 'option-row'
                }));

            console.log(
                'externalBatteryComponentOptions',
                JSON.stringify(this.externalBatteryComponentOptions)
            );

            console.log(
                'electronicLockOptions',
                JSON.stringify(this.electronicLockOptions)
            );

            console.log(
                'fleetOptions',
                JSON.stringify(this.fleetOptions)
            );

                    this.cordOptions =
                        cordData || [];

            }
            catch(error) {

                console.error(
                    'TRIO POWER ERROR',
                    error
                );
            }
            finally {

                this.isLoading = false;
            }
        }

        get batteryCountOptions() {

            return [
                { label: '1', value: '1' },
                { label: '2', value: '2' },
                { label: '3', value: '3' },
                { label: '4', value: '4' }
            ];
        }

        handleBatteryCountChange(event) {

            this.batteryCount = event.detail.value;

        }

        handlePowerMouseEnter(event) {

            const key =
                event.currentTarget.dataset.key;

            this.powerOptions =
                this.powerOptions.map(opt => ({
                    ...opt,
                    isVisible:
                        (
                            opt.Option_Key__c === key
                        ) ||
                        opt.isSelected
                }));
        }

        handlePowerMouseLeave() {

            this.syncPowerUI();
        }


        syncPowerUI() {

            this.powerOptions =
                this.powerOptions.map(opt => {

                    const isSelected =
                        opt.Option_Key__c ===
                        this.selectedPower;

                    if (
                        isSelected &&
                        opt.Image_URL__c
                    ) {
                        this.currentPreviewImage =
                            opt.Image_URL__c;
                    }

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

        handleCordMouseEnter(event) {

            this.hoveredCordKey =
                event.currentTarget.dataset.key;
        }

        handleCordMouseLeave() {

            this.hoveredCordKey = '';
        }

        handleCordSelect(event) {

            this.selectedCord =
                event.currentTarget.dataset.key;

            const selectedCord =
                this.cordOptions.find(
                    x => x.Option_Key__c === this.selectedCord
                );

            if(selectedCord && selectedCord.Image_URL__c){

                this.currentPreviewImage =
                    selectedCord.Image_URL__c;
            }

            this.selectedBattery = '';
            this.selectedExternalBattery = '';
            this.selectedExternalBatteryComponent = '';
            this.selectedElectronicLock = '';
            this.selectedFleet = '';

            this.syncBatteryUI();
            this.syncExternalBatteryUI();
        }

        get visibleCordOptions() {

            let filteredOptions = [];

            if (this.selectedPower === 'PWR_NA') {

                filteredOptions =
                    this.cordOptions.filter(
                        opt =>
                            opt.Option_Key__c === '207168' ||
                            opt.Option_Key__c === '1975120'
                    );
            }
            else if (this.selectedPower === 'PWR_INTL') {

                filteredOptions =
                    this.cordOptions.filter(
                        opt =>
                            opt.Option_Key__c === '207193' ||
                            opt.Option_Key__c === '207192' ||
                            opt.Option_Key__c === '207194'
                    );
            }
            else if (this.selectedPower === 'PWR_NONE') {

                filteredOptions =
                    [...this.cordOptions];
            }

            return filteredOptions.map(opt => {

                const isSelected =
                    opt.Option_Key__c === this.selectedCord;

                return {
                    ...opt,
                    isSelected,
                    isVisible:
                        isSelected ||
                        opt.Option_Key__c === this.hoveredCordKey,
                    rowClass:
                        isSelected
                            ? 'option-row selected'
                            : 'option-row'
                };
            });
        }

        get showCordSection() {

            return this.selectedPower !== '';
        }

        get powerCordTitle() {

            if (this.selectedPower === 'PWR_NA') {
                return 'Select Power Cord - North America';
            }

            if (this.selectedPower === 'PWR_INTL') {
                return 'Select Power Cord Kit - International';
            }

            if (this.selectedPower === 'PWR_NONE') {
                return 'Select Power Cord';
            }

            return '';
        }

        get isStepComplete() {

            if(this.selectedPower === 'PWR_NONE'){

                return (
                    this.selectedPower &&
                    this.selectedCord
                );
            }

            if(this.selectedExternalBattery === 'YES'){

                if(this.selectedBatteryComponentKeys.length !== 3){

                    return false;

                }

                if(this.selectedElectronicLock === 'YES'){

                    return true;
                }

                if(this.selectedElectronicLock === 'NO'){

                    return this.selectedFleet !== '';
                }

                return false;
            }

            if(this.selectedExternalBattery === 'NO'){

                if(this.selectedElectronicLock === 'YES'){

                    return true;
                }

                if(this.selectedElectronicLock === 'NO'){

                    return this.selectedFleet !== '';
                }

                return false;
            }

            return false;
        }

        get showBatterySection() {

            return (
                this.selectedCord !== '' &&
                this.selectedPower !== 'PWR_NONE'
            );
        }
        get showExternalBatterySection() {

            return (
                this.selectedBattery !== '' &&
                this.selectedPower !== 'PWR_NONE'
            );
        }

        get showExternalBatteryComponentsSection() {

            console.log(
                'showExternalBatteryComponentsSection',
                this.selectedExternalBattery
            );

            return this.selectedExternalBattery === 'YES';
        }

        get showElectronicLockSection() {

            if(this.selectedExternalBattery === 'YES') {

                return this.selectedBatteryComponentKeys.length === 3;

            }

            return this.selectedExternalBattery === 'NO';
        }

        get showFleetSection() {

            return this.selectedElectronicLock === 'NO';
        }
        handleBatterySelect(event) {

                this.selectedBattery =
                    event.currentTarget.dataset.key;

                this.syncBatteryUI();
            }

        handleNext() {

            const payload = [];

            const addSelection = (options, selectedKey, useKeyAsSku = false) => {

                if (!selectedKey) {
                    return;
                }

                const record = options.find(
                    x => x.Option_Key__c === selectedKey
                );

                if (record) {

                    payload.push({
                        key: record.Option_Key__c,
                        label: record.Option_Label__c,
                        sku: useKeyAsSku
                            ? record.Option_Key__c
                            : record.SKU__c || null
                    });
                }
            };

            addSelection(this.powerOptions, this.selectedPower);

            addSelection(this.cordOptions, this.selectedCord, true);

            addSelection(this.batteryOptions, this.selectedBattery);

            addSelection(this.externalBatteryOptions, this.selectedExternalBattery);

            this.selectedBatteryComponentKeys.forEach(key=>{

                if(key === '900164'){

                    payload.push({

                        key:'900164',

                        label:'Number of Batteries: ' + this.batteryCount,

                        sku:'900164'

                    });

                }else{

                    const rec =
                        this.externalBatteryComponentOptions.find(
                            x => x.Option_Key__c === key
                        );

                    payload.push({

                        key:rec.Option_Key__c,

                        label:rec.Option_Label__c + ': Yes',

                        sku:rec.Option_Key__c

                    });

                }

            });

            addSelection(
                this.electronicLockOptions,
                this.selectedElectronicLock
            );

            addSelection(
                this.fleetOptions,
                this.selectedFleet
            );

            console.log(
                'POWER RESULT',
                JSON.stringify(payload)
            );

            this.dispatchEvent(
                new CustomEvent(
                    'stepcomplete',
                    {
                        detail:{
                            POWER:payload,
                            previewImage:this.currentPreviewImage
                        }
                    }
                )
            );
        }

        syncBatteryUI() {

            this.batteryOptions =
                this.batteryOptions.map(opt => ({
                    ...opt,
                    isSelected:
                        opt.Option_Key__c === this.selectedBattery,
                    isVisible:
                        opt.Option_Key__c === this.selectedBattery,
                    rowClass:
                        opt.Option_Key__c === this.selectedBattery
                            ? 'option-row selected'
                            : 'option-row'
                }));
        }

        handleExternalBatteryComponentSelect(event) {

            const key = event.currentTarget.dataset.key;

            const selected =
                this.externalBatteryComponentOptions.find(
                    x => x.Option_Key__c === key
                );

            if(selected && selected.Image_URL__c){
                this.currentPreviewImage =
                    selected.Image_URL__c;
            }

            if(this.selectedBatteryComponentKeys.includes(key)){

                this.selectedBatteryComponentKeys =
                    this.selectedBatteryComponentKeys.filter(
                        x => x !== key
                    );

            }else{

                this.selectedBatteryComponentKeys = [
                    ...this.selectedBatteryComponentKeys,
                    key
                ];
            }

            this.externalBatteryComponentOptions =
                this.externalBatteryComponentOptions.map(opt=>({

                    ...opt,

                    isSelected:
                        this.selectedBatteryComponentKeys.includes(
                            opt.Option_Key__c
                        ),

                    rowClass:
                        this.selectedBatteryComponentKeys.includes(
                            opt.Option_Key__c
                        )
                            ? 'option-row selected'
                            : 'option-row'

                }));
        }
        handleExternalBatterySelect(event) {

            this.selectedExternalBattery =
                event.currentTarget.dataset.key;

            console.log(
                'selectedExternalBattery =>',
                this.selectedExternalBattery
            );

            this.selectedExternalBatteryComponent = '';
            this.selectedElectronicLock = '';
            this.selectedFleet = '';

            this.syncExternalBatteryUI();
        }

        syncExternalBatteryUI() {

            this.externalBatteryOptions =
                this.externalBatteryOptions.map(opt => ({
                    ...opt,
                    isSelected:
                        opt.Option_Key__c === this.selectedExternalBattery,
                    isVisible:
                        opt.Option_Key__c === this.selectedExternalBattery,
                    rowClass:
                        opt.Option_Key__c === this.selectedExternalBattery
                            ? 'option-row selected'
                            : 'option-row'
                }));
        }
        handlePowerSelect(event) {

            this.selectedPower =
                event.currentTarget.dataset.key;

            // Reset all downstream selections
            this.selectedCord = '';
            this.selectedBattery = '';
            this.selectedExternalBattery = '';
            this.selectedExternalBatteryComponent = '';
            this.selectedElectronicLock = '';
            this.selectedFleet = '';

            // Reset UI arrays

            this.syncPowerUI();

            this.syncBatteryUI();
            this.syncExternalBatteryUI();

            this.externalBatteryComponentOptions =
                this.externalBatteryComponentOptions.map(opt => ({
                    ...opt,
                    isSelected: false,
                    rowClass: 'option-row'
                }));

            this.electronicLockOptions =
                this.electronicLockOptions.map(opt => ({
                    ...opt,
                    isSelected: false,
                    rowClass: 'option-row'
                }));

            this.fleetOptions =
                this.fleetOptions.map(opt => ({
                    ...opt,
                    isSelected: false,
                    rowClass: 'option-row'
                }));

            console.log('POWER CHANGED');
            console.log('selectedPower', this.selectedPower);
        }

    handleElectronicLockSelect(event) {

        this.selectedElectronicLock =
            event.currentTarget.dataset.key;

        this.selectedFleet = '';

        this.syncElectronicLockUI();

        this.fleetOptions =
            this.fleetOptions.map(opt=>({

                ...opt,

                isSelected:false,

                rowClass:'option-row'

            }));

    }

    syncElectronicLockUI() {

        this.electronicLockOptions =
            this.electronicLockOptions.map(opt => ({

                ...opt,

                isSelected:
                    opt.Option_Key__c ===
                    this.selectedElectronicLock,

                rowClass:
                    opt.Option_Key__c ===
                    this.selectedElectronicLock
                        ? 'option-row selected'
                        : 'option-row'
            }));
    }

    handleFleetSelect(event) {

        this.selectedFleet =
            event.currentTarget.dataset.key;

        this.syncFleetUI();

        console.log(
            'selectedFleet',
            this.selectedFleet
        );
    }

    syncFleetUI() {

        this.fleetOptions =
            this.fleetOptions.map(opt => ({

                ...opt,

                isSelected:
                    opt.Option_Key__c ===
                    this.selectedFleet,

                rowClass:
                    opt.Option_Key__c ===
                    this.selectedFleet
                        ? 'option-row selected'
                        : 'option-row'
            }));
    }
}
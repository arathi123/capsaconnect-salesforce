import { LightningElement, api, track } from 'lwc';
import getOptionsByStepAndFamily
from '@salesforce/apex/CartConfiguratorController.getOptionsByStepAndFamily';

export default class TrioMonitor extends LightningElement {

    @api productType = 'Trio';
    @api selections;

    @track displayTypeOptions = [];
    @track displayMountOptions = [];
    @track workSurfaceOptions = [];

    selectedDisplayType = '';
    selectedDisplayMount = '';
    selectedWorkSurface = '';

    currentPreviewImage =
        '/resource/trioImagePart1/trioImagePart1/documentation.jpg';

    isLoading = true;

    connectedCallback() {
        this.loadMetadata();
    }

    async loadMetadata() {

        try {

            const [
                displayTypeData,
                displayMountData,
                workSurfaceData
            ] = await Promise.all([

                getOptionsByStepAndFamily({
                    stepKey : 'DISPLAY TYPE',
                    productFamily : this.productType
                }),

                getOptionsByStepAndFamily({
                    stepKey : 'DISPLAY MOUNT',
                    productFamily : this.productType
                }),

                getOptionsByStepAndFamily({
                    stepKey : 'WORK SURFACE LIGHT',
                    productFamily : this.productType
                })
            ]);

            this.displayTypeOptions =
                (displayTypeData || []).map(opt => ({
                    ...opt,
                    isVisible : false,
                    isSelected : false,
                    rowClass : 'option-row'
                }));

            this.displayMountOptions =
                (displayMountData || []).map(opt => ({
                    ...opt,
                    isVisible : false,
                    isSelected : false,
                    rowClass : 'option-row'
                }));

            this.workSurfaceOptions =
                (workSurfaceData || []).map(opt => ({
                    ...opt,
                    isVisible : false,
                    isSelected : false,
                    rowClass : 'option-row'
                }));

        }
        catch(error) {

            console.error(
                'MONITOR ERROR',
                error
            );
        }
        finally {

            this.isLoading = false;
        }
    }

    handleDisplayTypeSelect(event) {

        this.selectedDisplayType =
            event.currentTarget.dataset.key;

        this.selectedDisplayMount = '';
        this.selectedWorkSurface = '';

        const selected =
          this.displayTypeOptions.find(
                x => x.Option_Key__c === this.selectedDisplayType
            );

        if(selected && selected.Image_URL__c){

            this.currentPreviewImage =
                selected.Image_URL__c;
        }

        this.syncDisplayTypeUI();
    }

    syncDisplayTypeUI() {

        this.displayTypeOptions =
            this.displayTypeOptions.map(opt => {

                const isSelected =
                    opt.Option_Key__c ===
                    this.selectedDisplayType;

                return {
                    ...opt,
                    isSelected,
                    isVisible : isSelected,
                    rowClass :
                        isSelected
                            ? 'option-row selected'
                            : 'option-row'
                };
            });
    }

    handleDisplayMountSelect(event) {

        this.selectedDisplayMount =
            event.currentTarget.dataset.key;

        const selected =
            this.displayMountOptions.find(
                x => x.Option_Key__c === this.selectedDisplayMount
            );

        if(selected && selected.Image_URL__c){

            this.currentPreviewImage =
                selected.Image_URL__c;
        }

        this.syncDisplayMountUI();
    }

    syncDisplayMountUI() {

        this.displayMountOptions =
            this.displayMountOptions.map(opt => {

                const isSelected =
                    opt.Option_Key__c ===
                    this.selectedDisplayMount;

                return {
                    ...opt,
                    isSelected,
                    isVisible : isSelected,
                    rowClass :
                        isSelected
                            ? 'option-row selected'
                            : 'option-row'
                };
            });
    }

    handleWorkSurfaceSelect(event){

        this.selectedWorkSurface =
            event.currentTarget.dataset.key;

        const selected =
            this.workSurfaceOptions.find(
                x=>x.Option_Key__c===this.selectedWorkSurface
            );

        if(selected && selected.Image_URL__c){

            this.currentPreviewImage =
                selected.Image_URL__c;
        }

        this.syncWorkSurfaceUI();
    }

    syncWorkSurfaceUI() {

        this.workSurfaceOptions =
            this.workSurfaceOptions.map(opt => {

                const isSelected =
                    opt.Option_Key__c ===
                    this.selectedWorkSurface;

                return {
                    ...opt,
                    isSelected,
                    isVisible : isSelected,
                    rowClass :
                        isSelected
                            ? 'option-row selected'
                            : 'option-row'
                };
            });
    }

    get showDisplayMountSection() {

        return this.selectedDisplayType === 'MONITOR';
    }

    get showWorkSurfaceSection() {

        return (
            this.selectedDisplayType === 'MONITOR' &&
            this.selectedDisplayMount !== ''
        );
    }

    get isStepComplete() {

        if(this.selectedDisplayType === 'LAPTOP') {

            return true;
        }

        return (
            this.selectedDisplayType === 'MONITOR' &&
            this.selectedDisplayMount !== '' &&
            this.selectedWorkSurface !== ''
        );
    }

    handleNext() {

        let payload = [];

        // Display Type
        const displayType =
            this.displayTypeOptions.find(
                item => item.Option_Key__c === this.selectedDisplayType
            );

        if (displayType) {
            payload.push({
                key: displayType.Option_Key__c,
                label: displayType.Option_Label__c,
                sku: displayType.Option_Key__c
            });
        }

        // Display Mount
        const displayMount =
            this.displayMountOptions.find(
                item => item.Option_Key__c === this.selectedDisplayMount
            );

        if (displayMount) {
            payload.push({
                key: displayMount.Option_Key__c,
                label: displayMount.Option_Label__c,
                sku: displayMount.Option_Key__c
            });
        }

        // Work Surface
        const workSurface =
            this.workSurfaceOptions.find(
                item => item.Option_Key__c === this.selectedWorkSurface
            );

        if (workSurface) {
            payload.push({
                key: workSurface.Option_Key__c,
                label: workSurface.Option_Label__c,
                sku: workSurface.Option_Key__c
            });
        }

        this.dispatchEvent(
            new CustomEvent(
                'stepcomplete',
                {
                    detail: {
                        MONITOR: payload,
                        previewImage: this.currentPreviewImage
                    }
                }
            )
        );
    }
}
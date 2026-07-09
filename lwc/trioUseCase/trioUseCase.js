import { LightningElement, track, api, wire } from 'lwc';
import getOptionsByStepAndFamily
    from '@salesforce/apex/CartConfiguratorController.getOptionsByStepAndFamily';

export default class TrioUseCase extends LightningElement {

    @api productType = 'Trio';
    @api selections;

    @track useCaseOptions = [];
    @track currentPreviewImage =
        '/resource/trioImagePart1/trioImagePart1/documentation.jpg';

    @track isLoading = true;
    @track localSelection = '';

    @wire(getOptionsByStepAndFamily, {
        stepKey: 'CART TYPE',
        productFamily: '$productType'
    })
    wiredOptions({ error, data }) {

        console.log('TRIO DATA =>', JSON.stringify(data));
        console.log('TRIO ERROR =>', JSON.stringify(error));

        if (data) {

            this.useCaseOptions = data.map(opt => ({
                ...opt,
                isVisible: false,
                isSelected: false,
                rowClass: 'option-row'
            }));

            if (
                this.selections &&
                this.selections.USE_CASE &&
                this.selections.USE_CASE.length > 0
            ) {
                this.localSelection =
                    this.selections.USE_CASE[0].key;

                this.syncUI();
            }

            this.isLoading = false;
        }
        else if (error) {

            console.error(
                'Error Loading Trio Use Cases',
                error
            );

            this.isLoading = false;
        }
    }

    handleMouseEnter(event) {
        this.toggleDescription(
            event.currentTarget.dataset.key,
            true
        );
    }

    handleMouseLeave(event) {
        this.toggleDescription(
            event.currentTarget.dataset.key,
            false
        );
    }

    toggleDescription(key, isHovering) {

        this.useCaseOptions =
            this.useCaseOptions.map(opt => ({
                ...opt,
                isVisible:
                    (
                        opt.Option_Key__c === key &&
                        isHovering
                    ) ||
                    opt.isSelected
            }));
    }

    handleSelect(event) {

        this.localSelection =
            event.currentTarget.dataset.key;

        this.syncUI();
    }

    syncUI() {

        this.useCaseOptions =
            this.useCaseOptions.map(opt => {

                const isSelected =
                    opt.Option_Key__c ===
                    this.localSelection;

                if (
                    isSelected &&
                    opt.Image_URL__c
                ) {
                    console.log(
                        'Selected Image =>',
                        opt.Image_URL__c
                    );

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

    get isStepComplete() {
        return this.localSelection !== '';
    }

    handleNext() {

        const selectedOpt =
            this.useCaseOptions.find(
                opt =>
                    opt.Option_Key__c ===
                    this.localSelection
            );

        let payloadArray = [];

        if (selectedOpt) {

            payloadArray.push({
                key: selectedOpt.Option_Key__c,
                label: selectedOpt.Option_Label__c,
                sku: null
            });
        }

        this.dispatchEvent(
            new CustomEvent(
                'stepcomplete',
                {
                    detail: {
                        USE_CASE: payloadArray,
                        previewImage:
                            this.currentPreviewImage
                    }
                }
            )
        );
    }
}
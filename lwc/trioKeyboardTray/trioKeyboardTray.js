import { LightningElement, api, track } from 'lwc';
import getOptionsByStepAndFamily
from '@salesforce/apex/CartConfiguratorController.getOptionsByStepAndFamily';

export default class TrioKeyboardTray extends LightningElement {

    @api productType = 'Trio';
    @api selections;

    @track keyboardOptions = [];
    @track wristColorOptions = [];

    selectedKeyboard = '';
    selectedWristColor = '';

    currentPreviewImage =
        '/resource/trioImagePart1/trioImagePart1/documentation.jpg';

    isLoading = true;

    connectedCallback() {
        this.loadMetadata();
    }

    async loadMetadata() {

        try {

            const [
                keyboardData,
                wristColorData
            ] = await Promise.all([

                getOptionsByStepAndFamily({
                    stepKey : 'KEYBOARD TRAY',
                    productFamily : this.productType
                }),

                getOptionsByStepAndFamily({
                    stepKey : 'WRIST REST COLOR',
                    productFamily : this.productType
                })
            ]);

            this.keyboardOptions =
                (keyboardData || []).map(opt => ({
                    ...opt,
                    isVisible : false,
                    isSelected : false,
                    rowClass : 'option-row'
                }));

            this.wristColorOptions =
                (wristColorData || []).map(opt => ({
                    ...opt,
                    isVisible : false,
                    isSelected : false,
                    rowClass : 'option-row'
                }));

        }
        catch(error) {

            console.error(
                'KEYBOARD ERROR',
                error
            );
        }
        finally {

            this.isLoading = false;
        }
    }

    handleKeyboardSelect(event) {

        this.selectedKeyboard =
            event.currentTarget.dataset.key;

        this.selectedWristColor = '';
        const selected =
            this.keyboardOptions.find(
                x => x.Option_Key__c === this.selectedKeyboard
            );

        if (selected && selected.Image_URL__c) {
            this.currentPreviewImage = selected.Image_URL__c;
        }

        this.syncKeyboardUI();
        this.syncWristUI();
    }

    syncKeyboardUI() {

        this.keyboardOptions =
            this.keyboardOptions.map(opt => {

                const isSelected =
                    opt.Option_Key__c ===
                    this.selectedKeyboard;

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

    handleWristSelect(event) {

        this.selectedWristColor =
            event.currentTarget.dataset.key;

        const selected =
            this.wristColorOptions.find(
                x => x.Option_Key__c === this.selectedWristColor
            );

        if (selected && selected.Image_URL__c) {
            this.currentPreviewImage = selected.Image_URL__c;
        }

        this.syncWristUI();
    }

    syncWristUI() {

        this.wristColorOptions =
            this.wristColorOptions.map(opt => {

                const isSelected =
                    opt.Option_Key__c ===
                    this.selectedWristColor;

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

    get showWristSection() {

        return this.selectedKeyboard !== '';
    }

    get isStepComplete() {

        return (
            this.selectedKeyboard !== '' &&
            this.selectedWristColor !== ''
        );
    }

    handleNext() {

        const keyboard =
            this.keyboardOptions.find(
                x => x.Option_Key__c === this.selectedKeyboard
            );

        const wrist =
            this.wristColorOptions.find(
                x => x.Option_Key__c === this.selectedWristColor
            );

        let sku = keyboard.Option_Key__c;

        // Add wrist suffix
        if (wrist && wrist.Option_Key__c === 'GRAY') {

            sku += '-GRY';

        }

        const payload = [

            {

                key: keyboard.Option_Key__c,

                label: keyboard.Option_Label__c,

                sku: sku

            }

        ];

        this.dispatchEvent(

            new CustomEvent(

                'stepcomplete',

                {

                    detail: {

                        KEYBOARD_TRAY: payload,

                        previewImage: this.currentPreviewImage

                    }

                }

            )

        );

    }
}
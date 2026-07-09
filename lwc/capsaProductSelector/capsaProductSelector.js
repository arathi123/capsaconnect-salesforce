import { LightningElement } from 'lwc';

export default class CapsaProductSelector extends LightningElement {

    opportunityId;

    hasError = false;

    selectedProduct = null;

    connectedCallback() {

        console.log(
            ' PRODUCT SELECTOR LOADED'
        );

        // IMPORTANT RESET
        this.selectedProduct = null;

        const urlParams =
            new URLSearchParams(
                window.location.search
            );

        this.opportunityId =
            urlParams.get('c__oppid');

        console.log(
            ' Opp Id =>',
            this.opportunityId
        );

        console.log(
            ' Current Selected Product =>',
            this.selectedProduct
        );

        if (!this.opportunityId) {

            this.hasError = true;
        }
    }

    // MAIN SELECTOR

    get showSelector() {

        return this.selectedProduct === null;
    }


    get isMedical() {

        return this.selectedProduct === 'Medical';
    }

    get isMedication() {

        return this.selectedProduct === 'Medication';
    }

    get isWoodBlendTreatment() {

        return this.selectedProduct === 'WoodBlendTreatment';
    }

    get isMSeries() {

        return this.selectedProduct === 'MSeries';
    }

    get isVESeries() {

        return this.selectedProduct === 'VESeries';
    }

    // get isStandardTallBroncEndoCab() {

    //     return this.selectedProduct ===
    //         'StandardTallBroncEndoCab';
    // }


    get isMassSeriesMenu() {

        return this.selectedProduct ===
            'MassSeriesMenu';
    }


    get isSASCabinets() {

        return this.selectedProduct ===
            'SASCabinets';
    }

    get isOlympusCabAccessories() {

        return this.selectedProduct ===
            'OlympusCabAccessories';
    }

    get isFLXCabinet() {

        return this.selectedProduct ===
            'FLXCabinet';
    }

    get isSmallEndoWallCab() {

        return this.selectedProduct ===
            'SmallEndoWallCab';
    }

    get isTransportCart() {

        return this.selectedProduct ===
            'TransportCart';
    }

    get isAdditionalCSAccessories() {

        return this.selectedProduct ===
            'AdditionalCSAccessories';
    }

    get isTryten() {
        return this.selectedProduct === 'Tryten';
    }

    get isM38e() {
        return this.selectedProduct === 'M38e';
    }

    get isTrio() {
        return this.selectedProduct === 'Trio';
    }
    
     get isT7MedLink() {
        return this.selectedProduct === 'T7MedLink';
    }
     get isPA() {
        return this.selectedProduct === 'PA';
    }
get isRobots() {
        return this.selectedProduct === 'Robots';
    }
     get isNonPoweredLX5() {
        return this.selectedProduct === 'NonPoweredLX5';
    }

    get isNonPoweredM40() {
        return this.selectedProduct === 'NonPoweredM40';
    }
    get isCareLink() {
        return this.selectedProduct === 'CareLink';
    }

    get isAvaloTechReady() {
        return this.selectedProduct === 'AvaloTechReady';
    }
    
    get isSlimCart() {
        return this.selectedProduct === 'SlimCart';
    }

    get isV6() {
        return this.selectedProduct === 'V6';
    }

    handleSelect(event) {

        this.selectedProduct =
            event.target.dataset.type;

        console.log(
            'Selected Product:',
            this.selectedProduct
        );
    }


    handleBack() {

        this.selectedProduct = null;
    }

    renderedCallback() {

        console.log(
            ' Rendered Product =>',
            this.selectedProduct
        );
    }


    handleResetFlow() {

        console.log(
            ' RESET FLOW TRIGGERED'
        );

        this.selectedProduct = null;

        console.log(
            ' Product Reset Complete'
        );
    }
}
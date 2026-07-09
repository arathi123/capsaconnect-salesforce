import { LightningElement, api, track, wire } from 'lwc';
import getOptionsByStepAndFamily
from '@salesforce/apex/CartConfiguratorController.getOptionsByStepAndFamily';

export default class TrioLift extends LightningElement {

    @api productType = 'Trio';
    @api selections;

    @track liftOptions = [];

    @track currentPreviewImage =
        '/resource/trioImagePart1/trioImagePart1/documentation.jpg';

    @track localSelection = '';
    @track isLoading = true;

    @wire(getOptionsByStepAndFamily,{
        stepKey:'LIFT OPTION',
        productFamily:'$productType'
    })
    wiredLift({data,error}){

        if(data){

            this.liftOptions =
                data.map(opt => ({
                    ...opt,
                    isVisible:false,
                    isSelected:false,
                    rowClass:'option-row'
                }));

            if(
                this.selections &&
                this.selections.LIFT &&
                this.selections.LIFT.length > 0
            ){
                this.localSelection =
                    this.selections.LIFT[0].key;

                this.syncUI();
            }

            this.isLoading = false;
        }
        else if(error){

            console.error(error);
            this.isLoading = false;
        }
    }

    handleMouseEnter(event){

        const key =
            event.currentTarget.dataset.key;

        this.liftOptions =
            this.liftOptions.map(opt => ({
                ...opt,
                isVisible:
                    (
                        opt.Option_Key__c === key
                    ) ||
                    opt.isSelected
            }));
    }

    handleMouseLeave(){
        this.syncUI();
    }

    handleSelect(event){

        this.localSelection =
            event.currentTarget.dataset.key;

        this.syncUI();
    }

    syncUI(){

        this.liftOptions =
            this.liftOptions.map(opt => {

                const isSelected =
                    opt.Option_Key__c ===
                    this.localSelection;

                return{
                    ...opt,
                    isSelected,
                    isVisible:isSelected,
                    rowClass:
                        isSelected
                        ? 'option-row selected'
                        : 'option-row'
                };
            });
    }

    get isStepComplete(){
        return this.localSelection !== '';
    }

    handleNext(){

        const selectedOpt =
            this.liftOptions.find(
                opt =>
                    opt.Option_Key__c ===
                    this.localSelection
            );

        let payload = [];

        if(selectedOpt){

            payload.push({
                key:selectedOpt.Option_Key__c,
                label:selectedOpt.Option_Label__c,
                sku:null
            });
        }

        this.dispatchEvent(
            new CustomEvent(
                'stepcomplete',
                {
                    detail:{
                        LIFT:payload,
                        previewImage:
                            this.currentPreviewImage
                    }
                }
            )
        );
    }
}
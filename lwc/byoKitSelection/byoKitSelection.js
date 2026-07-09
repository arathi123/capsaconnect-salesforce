import { LightningElement, track, wire, api } from 'lwc';
import getOptionsByStepAndFamily from '@salesforce/apex/CartConfiguratorController.getOptionsByStepAndFamily';

export default class ByoKitSelection extends LightningElement {

    @api productType;
    @api selections;
    @track kitNone = false;
    @track kitOptions = [];
    @track allKitOptions = [];

    // CHANGED
    @track selectedItems = [];

    showNextButton = false;

        get noneCardClass() {
        return this.kitNone
            ? 'height-card selected'
            : 'height-card';
    }

    @wire(getOptionsByStepAndFamily, {
        stepKey: 'Accessory Kit',
        productFamily: '$productType'
    })
    wiredOptions({ error, data }) {

        if (data) {

            this.allKitOptions = data;

            this.setOptions();

        } else if (error) {

            console.error(error);
        }
    }

    setOptions() {

        this.kitOptions = this.allKitOptions.map(opt => ({

            ...opt,

            showDesc: false,

            isSelected: false,

            cardClass: 'height-card'
        }));
    }

    handleMouseEnter(event) {

        this.toggleDesc(
            event.currentTarget.dataset.key,
            true
        );
    }

    handleMouseLeave(event) {

        this.toggleDesc(
            event.currentTarget.dataset.key,
            false
        );
    }

    toggleDesc(key, isHovering) {

        this.kitOptions = this.kitOptions.map(opt => {

            const show =
                (opt.Option_Key__c === key && isHovering)
                || opt.isSelected;

            return {
                ...opt,
                showDesc: show
            };
        });
    }



    handleSelect(event) {
        
        this.kitNone = false;

        const key =
            event.currentTarget.dataset.key;

        const selected =
            this.kitOptions.find(
                o => o.Option_Key__c === key
            );

        // TOGGLE
        const alreadySelected =
            this.selectedItems.some(
                item => item.key === key
            );

        if (alreadySelected) {

            this.selectedItems =
                this.selectedItems.filter(
                    item => item.key !== key
                );

        } else {

            this.selectedItems = [

                ...this.selectedItems,

                {
                    key: selected.Option_Key__c,
                    label: selected.Option_Label__c
                }
            ];
        }

        this.showNextButton =
            this.selectedItems.length > 0 ||
            this.kitNone;

        // UPDATE UI
        this.kitOptions = this.kitOptions.map(opt => {

            const isSel =
                this.selectedItems.some(
                    item =>
                        item.key === opt.Option_Key__c
                );

            return {

                ...opt,

                isSelected: isSel,

                showDesc: isSel,

                cardClass: isSel
                    ? 'height-card selected'
                    : 'height-card'
            };
        });

        console.log(
            'Selected Kits:',
            JSON.stringify(this.selectedItems)
        );
    }

   handleNext() {

        this.dispatchEvent(
            new CustomEvent(
                'nextstep',
                {
                    detail: {

                        step: 'ACCESSORY KIT',

                        payload: {

                            kits: this.selectedItems,

                            noneSelected: this.kitNone
                        }
                    }
                }
            )
        );
    }

    handleNoneSelection() {

        this.kitNone = true;

        this.selectedItems = [];

        this.showNextButton = true;

        this.kitOptions = this.kitOptions.map(opt => ({
            ...opt,
            isSelected: false,
            showDesc: false,
            cardClass: 'height-card'
        }));
    }
}
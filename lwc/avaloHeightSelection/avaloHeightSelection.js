import { LightningElement, api } from 'lwc';
import capsaUI2 from '@salesforce/resourceUrl/capsaUI2';
import capsaUI1 from '@salesforce/resourceUrl/capsaUI1';

export default class AvaloHeightSelection extends LightningElement {
    @api selectedCart;
    @api selectedHeight = '';
    showpackages;
    showcartHeight;
    standardImg;
    intermediateImg;
    compactImg;
    showcompact = true;
    showTypeSelection =false;
    showLockSection = false;
    cart;
    isLoading=false;

    connectedCallback(){
        if(this.selectedCart == 'red'){
            this.showcartHeight = true;
            this.standardImg = capsaUI1 + '/Medical_Cart_Packages/Medical_Cart_Packages/Emergency_Cart_Red/Standard.jpg';
            this.intermediateImg = capsaUI1 + '/Medical_Cart_Packages/Medical_Cart_Packages/Emergency_Cart_Red/Intermediate.jpg';
            this.showcompact = true;
            this.compactImg = capsaUI1 + '/Medical_Cart_Packages/Medical_Cart_Packages/Emergency_Cart_Red/Compact.jpg';
        }
        if(this.selectedCart == 'blue'){
            console.log('selectedCart:',this.selectedCart);
            this.standardImg = capsaUI1 + '/Medical_Cart_Packages/Medical_Cart_Packages/Emergency_Cart_Blue/Standard.jpg';
            this.intermediateImg = capsaUI1 + '/Medical_Cart_Packages/Medical_Cart_Packages/Emergency_Cart_Blue/Intermediate.jpg';
            this.showcompact = true;
            this.compactImg = capsaUI1 + '/Medical_Cart_Packages/Medical_Cart_Packages/Emergency_Cart_Blue/Compact.jpg';
            this.showcartHeight = true;
        }
        if(this.selectedCart == 'pediatric'){
            console.log('selectedCart:',this.selectedCart);
            /*this.standardImg = capsaUI1 + '/Medical_Cart_Packages/Medical_Cart_Packages/Emergency_Cart_Red/Standard.jpg';
            this.intermediateImg = capsaUI1 + '/Medical_Cart_Packages/Medical_Cart_Packages/Emergency_Cart_Red/Intermediate.jpg';
            this.compactImg = capsaUI1 + '/Medical_Cart_Packages/Medical_Cart_Packages/Emergency_Cart_Red/Compact.jpg';*/
            this.showcartHeight = true;
        }
        if(this.selectedCart == 'green'){
            console.log('selectedCart:',this.selectedCart);
            this.standardImg = capsaUI1 + '/Medical_Cart_Packages/Medical_Cart_Packages/Anesthesia_Cart_Green/Standard.jpg';
            this.intermediateImg = capsaUI1 + '/Medical_Cart_Packages/Medical_Cart_Packages/Anesthesia_Cart_Green/Intermediate.jpg';
            this.showcompact = true;
            this.compactImg = capsaUI1 + '/Medical_Cart_Packages/Medical_Cart_Packages/Anesthesia_Cart_Green/Compact.jpg';
            this.showcartHeight = true;
        }
        if(this.selectedCart == 'blue-an'){
            console.log('selectedCart:',this.selectedCart);
            this.standardImg = capsaUI1 + '/Medical_Cart_Packages/Medical_Cart_Packages/Anesthesia_Cart_Blue/Standard.jpg';
            this.intermediateImg = capsaUI1 + '/Medical_Cart_Packages/Medical_Cart_Packages/Anesthesia_Cart_Blue/Intermediate.jpg';
            this.showcompact = false;
            this.compactImg = capsaUI1 + '/Medical_Cart_Packages/Medical_Cart_Packages/Anesthesia_Cart_Blue/Compact.jpg';
            this.showcartHeight = true;
        }
        if(this.selectedCart == 'iso'){
            console.log('selectedCart:',this.selectedCart);
            this.standardImg = capsaUI1 + '/Medical_Cart_Packages/Medical_Cart_Packages/Isolation_Cart/Standard.jpg';
            this.intermediateImg = capsaUI1 + '/Medical_Cart_Packages/Medical_Cart_Packages/Isolation_Cart/Intermediate.jpg';
            this.showcompact = true;
            this.compactImg = capsaUI1 + '/Medical_Cart_Packages/Medical_Cart_Packages/Isolation_Cart/Compact.jpg';
            this.showcartHeight = true;
        }
        if(this.selectedCart == 'proc'){
            console.log('selectedCart:',this.selectedCart);
            this.standardImg = capsaUI2 + '/Medical_Cart_Packages2/Medical_Cart_Packages_2/Procedure_Cart/Standard.jpg';
            this.intermediateImg = capsaUI2 + '/Medical_Cart_Packages2/Medical_Cart_Packages_2/Procedure_Cart/Intermediate.jpg';
            this.showcompact = true;
            this.compactImg = capsaUI2 + '/Medical_Cart_Packages2/Medical_Cart_Packages_2/Procedure_Cart/Compact.jpg';
            this.showcartHeight = true;
        }
    }
    handleStepChange(event) {
    const step = event.detail;

    // send event up to parent
    const navEvent = new CustomEvent("navigate", {
        detail: step
    });

    this.dispatchEvent(navEvent);
}
 showNext = false;

    handleSelect(event) {
         this.selectedHeight = event.target.value;
        this.showNext = true; // Show NEXT button once any radio is selected
       
       
    }
   
    handlenext(event) {
       this.isLoading=true;
       
        this.showcartHeight = false;
       // this.heightType=event.currentTarget.dataset.id;
         const heightEvent = new CustomEvent("heightselected", {
        detail: { selectedHeight: this.selectedHeight }
    });
    this.dispatchEvent(heightEvent);
        if(this.selectedCart == 'proc' || this.selectedCart == 'iso' || this.selectedCart == 'green' || this.selectedCart == 'blue-an'){
            this.showpackages = false;
            if(this.selectedCart != 'iso') {
                this.showLockSection = true;
                this.cart = this.selectedCart;
            }
            else{
                this.showpackages = true;
            }
            // console.log('selectedCart:',this.selectedCart);
            // console.log('showLockSection:',this.showLockSection);
        }else{
            this.showpackages = true;
            this.showLockSection = false;
        }
         setTimeout(() => {
            this.isLoading = false; // Hide spinner after data loads
            // Process data here
        }, 2000); 
        
    }
   
    handlePathselection(event) {
        this.showcartHeight = false;
        this.showTypeSelection = event.detail.showTypeSelection;
        this.currentStep = event.detail.currentStep;
    }

}
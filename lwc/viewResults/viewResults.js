import { LightningElement,api } from 'lwc';
import capsaUI1 from '@salesforce/resourceUrl/capsaUI1';
import capsaUI2 from '@salesforce/resourceUrl/capsaUI2';

export default class ResultsSummary extends LightningElement {
     @api selectedAccessories = [ ];
      @api selectedHeight ; 
      @api selectedAccessoryCodes = [];
    showResults = true;
    showTypeSelection =false;
    summary = {
        packageType: 'Emergency Cart (Red) - AM-EM-STD-RED',
        height: '',
        accessories: ['AM-EM-ACCPK1'],
        mainImage: capsaUI1 + '/Medical_Cart_Packages/Medical_Cart_Packages/Emergency_Cart_Red/Standard.jpg',
       
    };
// renderedCallback() {
//         if (this.selectedHeight && this.summary.height !== this.selectedHeight) {
//             this.summary = {
//                 ...this.summary,
//                 height: this.selectedHeight.charAt(0).toUpperCase() + this.selectedHeight.slice(1)
//             };
//         }
//     }
   connectedCallback() {
    if (this.selectedHeight) {
        this.summary.height = 
             this.selectedHeight.charAt(0).toUpperCase() +
             this.selectedHeight.slice(1);
    }
    //    if (this.selectedAccessoryCodes.length > 0) {
    //   this.summary.accessories = this.selectedAccessoryCodes;   // <-- NEW
    // }
    console.log('Selected Height:'+this.selectedHeight);
}
    // selectedPackages = [
    //     { id: 'p1', image: pkg1 },
    //     { id: 'p2', image: pkg2 },
    //     { id: 'p3', image: pkg3 }
    // ];
    handlePathselection(event) {
        this.showResults = false;
        this.showTypeSelection = event.detail.showTypeSelection;
        this.currentStep = event.detail.currentStep;
    }
}
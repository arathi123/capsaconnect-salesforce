import { LightningElement,api } from 'lwc';
import capsaUI2 from '@salesforce/resourceUrl/capsaUI2';
import capsaUI1 from '@salesforce/resourceUrl/capsaUI1';

export default class LockSection extends LightningElement {

    @api selectedCart;
    showAutoLock = false;
    showKeyLock = false;
    showpackages;
    showcartLock = true;
    keyLock;
    electronicLock;
    autoLock;
    showpackages = false;
    showNext = false;
    isLoading=false;

    connectedCallback(){
        
        if(this.selectedCart == 'green'){
            console.log('selectedCart Lock:',this.selectedCart);
            this.showKeyLock = true;
            this.keyLock = capsaUI1 + '/Medical_Cart_Packages/Medical_Cart_Packages/Anesthesia_Cart_Green/Key_lock.png';
            this.electronicLock = capsaUI1 + '/Medical_Cart_Packages/Medical_Cart_Packages/Anesthesia_Cart_Green/Electronic_Lock.png';
            this.showAutoLock = true;
            this.autoLock = capsaUI1 + '/Medical_Cart_Packages/Medical_Cart_Packages/Anesthesia_Cart_Green/Auto_Lock.png';
            this.showcartLock = true;
        }
        if(this.selectedCart == 'blue-an'){
            console.log('selectedCart Lock:',this.selectedCart);
            this.showKeyLock = false;
            this.electronicLock = capsaUI1 + '/Medical_Cart_Packages/Medical_Cart_Packages/Anesthesia_Cart_Blue/Electronic_Lock.png';
            this.showAutoLock = true;
            this.autoLock = capsaUI1 + '/Medical_Cart_Packages/Medical_Cart_Packages/Anesthesia_Cart_Blue/Auto_Lock.png';
            this.showcartLock = true;
        }
        
        if(this.selectedCart == 'proc'){
            console.log('selectedCart Lock:',this.selectedCart);
            this.showKeyLock = true;
            this.keyLock = capsaUI2 + '/Medical_Cart_Packages2/Medical_Cart_Packages_2/Procedure_Cart/Key_lock.png';
            this.electronicLock = capsaUI2 + '/Medical_Cart_Packages2/Medical_Cart_Packages_2/Procedure_Cart/Electronic_Lock.png';
            this.showAutoLock = false;
            this.showcartLock = true;
        }
    }

    handleSelect(event) {
        this.showNext = true; // Show NEXT button once any radio is selected
       
    }
    handlenext() {
        this.isLoading=true;
         setTimeout(() => {
            this.isLoading = false; // Hide spinner after data loads
            // Process data here
        }, 2000); 
        this.showcartLock = false;
        this.showpackages = true;
    }
}
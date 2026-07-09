import { LightningElement,api } from 'lwc';
import capsaUI1 from '@salesforce/resourceUrl/capsaUI1';
import capdaUI2 from '@salesforce/resourceUrl/capsaUI2';
export default class AccessoryPackages extends LightningElement {
  @api accessoryPackage;
  @api selectedHeight; 
  @api selectedCart;
  package1;
  package2;
  package3;
  heightToSend;
    
     selectedAccessories = []; 
     selectedAccessoryCodes = [];
  showAccessoryPackages = true; 
  showViewResults = false;
  isLoading=false;
  
  connectedCallback() {
    // if(this.accessoryPackage == 'Standard' ){
      this.package1 = capsaUI1 + '/Medical_Cart_Packages/Medical_Cart_Packages/Emergency_Cart_Red/Package_1.jpg';
      this.package2 = capsaUI1 + '/Medical_Cart_Packages/Medical_Cart_Packages/Emergency_Cart_Red/Package_2.jpg';
      this.package3 = capsaUI1 + '/Medical_Cart_Packages/Medical_Cart_Packages/Emergency_Cart_Red/Package_3.jpg';
    // }else if(this.accessoryPackage == 'Intermediate'){
    //   this.package1 = capsaUI1 + '/Medical_Cart_Packages/Medical_Cart_Packages/Emergency_Cart_Red/Package_1.jpg';
    //   this.package2 = capsaUI1 + '/Medical_Cart_Packages/Medical_Cart_Packages/Emergency_Cart_Red/Package_2.jpg';
    //   this.package3 = capsaUI1 + '/Medical_Cart_Packages/Medical_Cart_Packages/Emergency_Cart_Red/Package_3.jpg';
    // }else if(this.accessoryPackage == 'Compact'){
    //   this.package1 = capsaUI1 + '/Medical_Cart_Packages/Medical_Cart_Packages/Emergency_Cart_Red/Package_1.jpg';
    //   this.package2 = capsaUI1 + '/Medical_Cart_Packages/Medical_Cart_Packages/Emergency_Cart_Red/Package_2.jpg';
    //   this.package3 = capsaUI1 + '/Medical_Cart_Packages/Medical_Cart_Packages/Emergency_Cart_Red/Package_3.jpg';
    // }
    console.log('selected height::'+this.selectedHeight);
  }
  handleSelectPackage(event) {

    const selectedId = event.currentTarget.dataset.id;
    //   this.selectedAccessories = [
    //     this.packageAccessoryCodes[selectedId]
    // ];
     if (selectedId === 'package1') {
            this.selectedAccessories = [{ id: 'p1', image: this.package1 }];
             this.selectedAccessoryCodes = ['AM-EM-ACCPK1'];
        } else if (selectedId === 'package2') {
            this.selectedAccessories = [{ id: 'p2', image: this.package2 }];
            this.selectedAccessoryCodes = ['AM-EM-ACCPK2']; 
        } else if (selectedId === 'package3') {
            this.selectedAccessories = [{ id: 'p3', image: this.package3 }];
             this.selectedAccessoryCodes = ['AM-EM-ACCPK3'];
        }
        
    // remove highlight from all images
    this.template.querySelectorAll('div[data-id="'+selectedId+'"]')
        .forEach(img => img.classList.add('selected'));
  }

  handleViewResults() {
    //this.heightType=event.currentTarget.dataset.id;
     this.isLoading=true;
      
    this.showViewResults = true;
    this.showAccessoryPackages = false;
   this.heightToSend = this.selectedHeight;
     setTimeout(() => {
            this.isLoading = false; // Hide spinner after data loads
            // Process data here
        }, 2000); 
  }
}
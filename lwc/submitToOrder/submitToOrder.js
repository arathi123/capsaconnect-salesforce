import { LightningElement } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { CloseActionScreenEvent } from 'lightning/actions';

export default class SubmitToOrder extends LightningElement {

    connectedCallback() {
        this.dispatchEvent(
            new ShowToastEvent({
                title: 'Success',
                message: 'Quote submitted for Order Processing',
                variant: 'success'
            })
        );
  setTimeout(() => {
            this.dispatchEvent(new CloseActionScreenEvent());
        }, 100);
        // Close the Quick Action screen
       // this.dispatchEvent(new CloseActionScreenEvent());
    }
}

/*({
    doInit : function(component, event, helper) {
        // Show toast
        var toastEvent = $A.get("e.force:showToast");
        if (toastEvent) {
            toastEvent.setParams({
                "title": "Success",
                "message": "Quote submitted for Order Processing",
                "type": "success",
                "mode": "dismissible"
            });
            toastEvent.fire();
        } else {
            // fallback for places where toast event might not be available
            alert('Quote submitted for Order Processing');
        }

        // Close the quick action modal
        var closeQA = $A.get("e.force:closeQuickAction");
        if (closeQA) closeQA.fire();
    }
}) */
import { LightningElement, api } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { CloseActionScreenEvent } from 'lightning/actions';
import resubmitOrders from '@salesforce/apex/QuoteResubmitController.resubmitOrders';

export default class RetryOrderPush extends LightningElement {
    @api recordId;

    handleRetry() {
        resubmitOrders({ quoteId: this.recordId })
            .then(() => {

                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Success',
                        message: 'Order submitted successfully.',
                        variant: 'success'
                    })
                );

                this.dispatchEvent(new CloseActionScreenEvent());

                setTimeout(() => {
                    location.reload();
                }, 1500);
            })
            .catch(error => {

                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Error',
                        message:
                            error?.body?.message ||
                            error?.message ||
                            'Failed to submit order.',
                        variant: 'error'
                    })
                );

                this.dispatchEvent(new CloseActionScreenEvent());

                setTimeout(() => {
                    location.reload();
                }, 1500);
            });
    }
}
import { LightningElement, api } from 'lwc';
import syncAccount from '@salesforce/apex/AccountSyncController.syncAccount';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class AccountSyncQuickAction extends LightningElement {

    @api recordId;

    connectedCallback() {
        this.syncAccount();
    }

    syncAccount() {
        syncAccount({ accId: this.recordId })
            .then(() => {
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Success',
                        message: 'Account sync started',
                        variant: 'success'
                    })
                );
            })
            .catch(error => {
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Error',
                        message: error.body?.message || 'Something went wrong',
                        variant: 'error'
                    })
                );
            });
    }
}
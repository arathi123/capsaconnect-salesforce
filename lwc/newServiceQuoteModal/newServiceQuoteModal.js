import { api } from 'lwc';
import LightningModal from 'lightning/modal';

export default class NewServiceQuoteModal extends LightningModal {
    @api recordId;

    get flowInputVariables() {
        return [{ name: 'recordId', type: 'String', value: this.recordId }];
    }

    handleStatusChange(event) {
        if (event.detail.status === 'FINISHED') {
            const outputVars = event.detail.outputVariables || [];
            const quoteIdVar = outputVars.find(v => v.name === 'varNewQuoteId');
            this.close(quoteIdVar ? quoteIdVar.value : null);
        }
    }
}
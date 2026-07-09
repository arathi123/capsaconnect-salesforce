import { LightningElement, api, wire } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import { getRecord, getFieldValue } from 'lightning/uiRecordApi';
import OPPORTUNITY_ID_FIELD from '@salesforce/schema/Quote.OpportunityId';

const FIELDS = [OPPORTUNITY_ID_FIELD];

// ─── IMPORTANT ──────────────────────────────────────────────────────────────
// Replace the value below with the Developer Name of your Capsa Configurator
// Lightning Tab as it appears in Setup → Tabs (e.g. "Capsa_Product_Configurator").
const CONFIGURATOR_TAB_API_NAME = 'Product_Selector';
// ────────────────────────────────────────────────────────────────────────────

export default class CapsaQuoteEditAction extends NavigationMixin(LightningElement) {
    @api recordId;

    hasError = false;
    errorMessage = '';

    @wire(getRecord, { recordId: '$recordId', fields: FIELDS })
    wiredQuote({ data, error }) {
        if (data) {
            const oppId = getFieldValue(data, OPPORTUNITY_ID_FIELD);
            if (oppId) {
                this[NavigationMixin.Navigate]({
                    type: 'standard__navItemPage',
                    attributes: {
                        apiName: CONFIGURATOR_TAB_API_NAME
                    },
                    state: {
                        c__oppid: oppId,
                        c__quoteid: this.recordId
                    }
                });
            } else {
                this.hasError = true;
                this.errorMessage = 'This Quote is not linked to an Opportunity. The configurator requires an Opportunity to generate a quote.';
            }
        } else if (error) {
            this.hasError = true;
            this.errorMessage = error.body?.message || 'Failed to load Quote details.';
        }
    }
}
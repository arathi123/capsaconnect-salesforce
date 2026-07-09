import { LightningElement, api } from 'lwc';

export default class CapsaB2bApplyAccount extends LightningElement {
    // Retained for backward compatibility with saved Experience Builder config.
    // The button now opens the in-page request form instead of navigating here.
    @api applyUrl = '/SelfRegister';
    @api description = 'Request your Business Account to get pricing terms and allow your Purchase Agents to check out using a PO or Credit Card.';
    @api buttonLabel = 'Sign Up for Capsa Connect Account';

    // Open the nested capsaB2bNewAccountCase modal form.
    handleOpen() {
        const form = this.template.querySelector('c-capsa-b2b-new-account-case');
        if (form) {
            form.open();
        }
    }
}
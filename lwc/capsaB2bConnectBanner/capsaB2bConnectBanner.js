import { LightningElement, api } from 'lwc';

export default class CapsaB2bConnectBanner extends LightningElement {
    // URL the "Request a Quote" button points to (editable in Experience Builder)
    @api quoteUrl = '#';
}
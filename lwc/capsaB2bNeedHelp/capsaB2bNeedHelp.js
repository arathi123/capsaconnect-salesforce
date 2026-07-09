import { LightningElement, api } from 'lwc';

export default class CapsaB2bNeedHelp extends LightningElement {
    @api email = 'info@capsahealthcare.com';
    @api phone = '855.734.4142';

    get emailHref() {
        return 'mailto:' + this.email;
    }

    get phoneHref() {
        return 'tel:' + this.phone.replace(/[^0-9]/g, '');
    }
}
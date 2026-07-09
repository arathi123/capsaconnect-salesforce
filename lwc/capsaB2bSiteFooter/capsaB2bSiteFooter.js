import { LightningElement, api, track } from 'lwc';

export default class CapsaB2bSiteFooter extends LightningElement {
    @api quoteUrl = '#';
    @track newsletterEmail = '';
    @track newsletterIndustry = '';

    get currentYear() {
        return new Date().getFullYear();
    }

    handleEmailInput(event) {
        this.newsletterEmail = event.target.value;
    }

    handleIndustryChange(event) {
        this.newsletterIndustry = event.target.value;
    }

    submitNewsletter() {
        if (!this.newsletterEmail.trim()) return;
        // Placeholder — wire to Apex or Marketing Cloud as needed
        this.newsletterEmail = '';
        this.newsletterIndustry = '';
        const emailInput = this.template.querySelector('.newsletter-input');
        const select = this.template.querySelector('.newsletter-select');
        if (emailInput) emailInput.value = '';
        if (select) select.value = '';
    }
}
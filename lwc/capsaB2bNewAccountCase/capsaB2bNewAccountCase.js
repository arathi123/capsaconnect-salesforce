import { LightningElement, api, track } from 'lwc';
import submitAccountRequest from '@salesforce/apex/CapsaB2bNewAccountCaseController.submitAccountRequest';

/**
 * Public "Request a Capsa Connect Account" form.
 *
 * Rendered (hidden) inside capsaB2bApplyAccount on the login page and opened as
 * a modal when the user clicks that card's button. An existing Capsa customer
 * who has no online portal login fills in their details; on submit a Case is
 * created (guest / unauthenticated) via CapsaB2bNewAccountCaseController.
 *
 * Self-contained modal: own backdrop, brand styling, validation, loading and
 * success states — no dependency on lightning/modal so it works reliably for
 * guest users on the Experience site.
 */
const US_STATES = [
    'Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut',
    'Delaware','District of Columbia','Florida','Georgia','Hawaii','Idaho','Illinois',
    'Indiana','Iowa','Kansas','Kentucky','Louisiana','Maine','Maryland','Massachusetts',
    'Michigan','Minnesota','Mississippi','Missouri','Montana','Nebraska','Nevada',
    'New Hampshire','New Jersey','New Mexico','New York','North Carolina','North Dakota',
    'Ohio','Oklahoma','Oregon','Pennsylvania','Rhode Island','South Carolina',
    'South Dakota','Tennessee','Texas','Utah','Vermont','Virginia','Washington',
    'West Virginia','Wisconsin','Wyoming'
];

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export default class CapsaB2bNewAccountCase extends LightningElement {
    // Configurable copy (Experience Builder can override).
    @api modalTitle = 'Request a Capsa Connect Account';
    @api modalIntro =
        'Already a Capsa customer? Tell us a bit about your business and our team will set up your Capsa Connect online account.';

    @track form = {
        email: '',
        phone: '',
        companyName: '',
        customerNumber: '',
        street: '',
        city: '',
        state: '',
        zip: '',
        country: 'United States',
        comments: ''
    };

    @track isOpen = false;
    @track isSubmitting = false;
    @track showErrors = false;
    @track errorMessage = '';
    @track successCaseNumber = '';

    // ── Public API: parent (capsaB2bApplyAccount) calls open() ──
    @api open() {
        this.resetState();
        this.isOpen = true;
        // Focus the first field once the modal has rendered.
        // eslint-disable-next-line @lwc/lwc/no-async-operation
        window.requestAnimationFrame(() => {
            const first = this.template.querySelector('[data-field="email"]');
            if (first) {
                first.focus();
            }
        });
    }

    @api close() {
        this.isOpen = false;
    }

    resetState() {
        this.form = {
            email: '', phone: '', companyName: '', customerNumber: '',
            street: '', city: '', state: '', zip: '',
            country: 'United States', comments: ''
        };
        this.isSubmitting = false;
        this.showErrors = false;
        this.errorMessage = '';
        this.successCaseNumber = '';
    }

    // ── Options ──
    get stateOptions() {
        return [{ label: 'Select a state…', value: '', selected: !this.form.state }].concat(
            US_STATES.map((s) => ({ label: s, value: s, selected: s === this.form.state }))
        );
    }

    // ── Derived UI state ──
    get showForm() {
        return !this.successCaseNumber;
    }

    get emailValid() {
        return EMAIL_RE.test((this.form.email || '').trim());
    }

    get requiredFilled() {
        const f = this.form;
        return [
            f.email, f.phone, f.companyName, f.customerNumber,
            f.street, f.city, f.state, f.zip, f.country
        ].every((v) => v && v.trim());
    }

    get isSubmitDisabled() {
        return this.isSubmitting;
    }

    /** Per-field CSS class, adding .has-error after a failed submit attempt. */
    get fieldClass() {
        const blank = (v) => this.showErrors && !(v && v.trim());
        const emailBad = this.showErrors && (!this.form.email.trim() || !this.emailValid);
        return {
            email: 'nac-input' + (emailBad ? ' has-error' : ''),
            phone: 'nac-input' + (blank(this.form.phone) ? ' has-error' : ''),
            companyName: 'nac-input' + (blank(this.form.companyName) ? ' has-error' : ''),
            customerNumber: 'nac-input' + (blank(this.form.customerNumber) ? ' has-error' : ''),
            street: 'nac-input' + (blank(this.form.street) ? ' has-error' : ''),
            city: 'nac-input' + (blank(this.form.city) ? ' has-error' : ''),
            state: 'nac-select' + (blank(this.form.state) ? ' has-error' : ''),
            zip: 'nac-input' + (blank(this.form.zip) ? ' has-error' : ''),
            country: 'nac-input' + (blank(this.form.country) ? ' has-error' : '')
        };
    }

    // ── Handlers ──
    handleChange(event) {
        const field = event.target.dataset.field;
        this.form = { ...this.form, [field]: event.target.value };
    }

    handleBackdropClick() {
        // Click on the dimmed backdrop closes (only when not mid-submit).
        if (!this.isSubmitting) {
            this.close();
        }
    }

    stopPropagation(event) {
        event.stopPropagation();
    }

    handleKeydown(event) {
        if (event.key === 'Escape' && !this.isSubmitting) {
            this.close();
        }
    }

    handleCancel() {
        this.close();
    }

    async handleSubmit() {
        this.errorMessage = '';

        if (!this.requiredFilled || !this.emailValid) {
            this.showErrors = true;
            this.errorMessage = !this.emailValid && this.form.email.trim()
                ? 'Please enter a valid email address.'
                : 'Please complete all required fields.';
            return;
        }

        this.isSubmitting = true;
        try {
            const result = await submitAccountRequest({
                email: this.form.email.trim(),
                phone: this.form.phone.trim(),
                companyName: this.form.companyName.trim(),
                customerNumber: this.form.customerNumber.trim(),
                street: this.form.street.trim(),
                city: this.form.city.trim(),
                state: this.form.state.trim(),
                zip: this.form.zip.trim(),
                country: this.form.country.trim(),
                comments: this.form.comments ? this.form.comments.trim() : ''
            });
            this.successCaseNumber = result && result.caseNumber ? result.caseNumber : 'submitted';
        } catch (e) {
            this.errorMessage = this.readError(e);
        } finally {
            this.isSubmitting = false;
        }
    }

    handleDone() {
        this.close();
    }

    readError(e) {
        if (e && e.body && e.body.message) {
            return e.body.message;
        }
        if (e && e.message) {
            return e.message;
        }
        return 'Something went wrong submitting your request. Please try again.';
    }
}
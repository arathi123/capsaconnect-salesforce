import { LightningElement, api, track } from 'lwc';
import submitApplication from '@salesforce/apex/CapsaB2bNewAccountController.submitApplication';

const CAPTCHA_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export default class CapsaB2bNewAccount extends LightningElement {
    @api downloadUrl = '#';

    @track email = '';
    @track phone = '';
    @track message = '';
    @track captchaCode = '';
    @track captchaEntry = '';
    @track selectedFileName = '';
    @track errorMsg = '';
    @track successMsg = '';
    @track isSubmitting = false;

    _fileBase64 = null;
    _fileName = null;

    get submitBtnLabel() {
        return this.isSubmitting ? 'Submitting...' : 'SUBMIT COMPLETED APPLICATION';
    }

    connectedCallback() {
        this.captchaCode = this._generateCaptcha();
    }

    _generateCaptcha() {
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += CAPTCHA_CHARS.charAt(Math.floor(Math.random() * CAPTCHA_CHARS.length));
        }
        return code;
    }

    refreshCaptcha() {
        this.captchaCode = this._generateCaptcha();
        this.captchaEntry = '';
    }

    handleEmailChange(e)   { this.email = e.target.value; }
    handlePhoneChange(e)   { this.phone = e.target.value; }
    handleMessageChange(e) { this.message = e.target.value; }
    handleCaptchaEntry(e)  { this.captchaEntry = e.target.value; }

    handleFileChange(e) {
        const file = e.target.files[0];
        if (!file) return;
        this.selectedFileName = file.name;
        this._fileName = file.name;
        const reader = new FileReader();
        reader.onloadend = () => {
            this._fileBase64 = reader.result.split(',')[1];
        };
        reader.readAsDataURL(file);
    }

    handleSubmit() {
        this.errorMsg = '';
        this.successMsg = '';

        if (!this.email) {
            this.errorMsg = 'Please enter your email address.';
            return;
        }
        if (!this.phone) {
            this.errorMsg = 'Please enter your phone number.';
            return;
        }
        if (!this.captchaEntry || this.captchaEntry.toUpperCase() !== this.captchaCode) {
            this.errorMsg = 'Security code does not match. Please try again.';
            this.refreshCaptcha();
            return;
        }

        this.isSubmitting = true;
        submitApplication({
            email:    this.email,
            phone:    this.phone,
            message:  this.message,
            fileName: this._fileName,
            fileBody: this._fileBase64
        })
        .then(() => {
            this.successMsg = 'Your application has been submitted successfully. Our team will contact you within 24-48 hours.';
            this.email = '';
            this.phone = '';
            this.message = '';
            this.captchaEntry = '';
            this.selectedFileName = '';
            this._fileBase64 = null;
            this._fileName = null;
            this.captchaCode = this._generateCaptcha();
        })
        .catch(error => {
            this.errorMsg = (error.body && error.body.message) ? error.body.message : 'An error occurred. Please try again.';
        })
        .finally(() => {
            this.isSubmitting = false;
        });
    }
}
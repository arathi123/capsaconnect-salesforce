import { LightningElement, api, track } from 'lwc';
import doLogin from '@salesforce/apex/CapsaB2bLoginController.doLogin';
import basePath from '@salesforce/community/basePath';

export default class CapsaB2bLoginForm extends LightningElement {
    @api usernameLabel = 'Email';
    @api passwordLabel = 'Password';
    @api loginButtonLabel = 'Log In';
    @api forgotPasswordLabel = 'Forget your password?';
    @api forgotPasswordUrl = '/ForgotPassword';
    @api requestLoginLabel = 'Request a New Login';
    @api requestLoginUrl = '/SelfRegister';
    @api existingCustomerText = 'Are you an existing customer without a login?';
    @api startUrl = '';

    @track showError = false;
    @track errorMessage = '';
    @track isLoading = false;

    handleKeyUp(event) {
        if (event.key === 'Enter' || event.keyCode === 13) {
            this.handleLogin();
        }
    }

    handleLogin() {
        const usernameInput = this.template.querySelector('[data-id="username"]');
        const passwordInput = this.template.querySelector('[data-id="password"]');
        const username = usernameInput ? usernameInput.value.trim() : '';
        const password = passwordInput ? passwordInput.value : '';

        if (!username || !password) {
            this.errorMessage = 'Please enter your email and password.';
            this.showError = true;
            return;
        }

        this.showError = false;
        this.isLoading = true;

        const startUrl = this.startUrl ? decodeURIComponent(this.startUrl) : '';

        doLogin({ username, password, startUrl })
            .then(redirectUrl => {
                this.isLoading = false;
                window.location.href = redirectUrl || (basePath + '/');
            })
            .catch(error => {
                this.isLoading = false;
                this.errorMessage = (error && error.body && error.body.message)
                    ? error.body.message
                    : 'Invalid username or password. Please try again.';
                this.showError = true;
            });
    }
}
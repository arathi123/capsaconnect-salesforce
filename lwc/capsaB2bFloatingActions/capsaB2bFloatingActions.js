import { LightningElement, track } from 'lwc';

export default class CapsaB2bFloatingActions extends LightningElement {
    @track showFeedback = false;
    @track showChat = false;
    @track feedbackText = '';
    @track feedbackSubmitted = false;

    // Chat flow: 'options' -> 'form' -> 'chat'
    @track chatView = 'options';
    @track selectedProduct = '';

    // Pre-chat form fields
    @track firstName = '';
    @track lastName = '';
    @track email = '';
    @track mobile = '';
    @track subject = '';

    // Live chat conversation
    @track messages = [];
    @track newMessage = '';
    _msgId = 0;

    chatOptions = [
        { id: '1', label: 'M48 N-Sight' },
        { id: '2', label: 'Trio N-Sight' },
        { id: '3', label: 'Avalo N-Sight' },
        { id: '4', label: 'Nexsys' }
    ];

    get isFeedbackEmpty() {
        return !this.feedbackText.trim();
    }

    get isOptionsView() {
        return this.chatView === 'options';
    }

    get isFormView() {
        return this.chatView === 'form';
    }

    get isChatView() {
        return this.chatView === 'chat';
    }

    get isFormIncomplete() {
        const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email.trim());
        return (
            !this.firstName.trim() ||
            !this.lastName.trim() ||
            !emailOk ||
            !this.mobile.trim() ||
            !this.subject.trim()
        );
    }

    // ── Feedback ──────────────────────────────
    toggleFeedback() {
        this.showFeedback = !this.showFeedback;
        if (this.showFeedback) {
            this.showChat = false;
        }
    }

    closeFeedback() {
        this.showFeedback = false;
        this.feedbackText = '';
        this.feedbackSubmitted = false;
    }

    handleFeedbackInput(event) {
        this.feedbackText = event.target.value;
    }

    submitFeedback() {
        if (!this.feedbackText.trim()) return;
        this.feedbackSubmitted = true;
        // eslint-disable-next-line @lwc/lwc/no-async-operation
        setTimeout(() => {
            this.closeFeedback();
        }, 2500);
    }

    // ── Chat open / close ─────────────────────
    toggleChat() {
        this.showChat = !this.showChat;
        if (this.showChat) {
            this.showFeedback = false;
        }
    }

    closeChat() {
        this.showChat = false;
    }

    resetChat() {
        // "New Chat" — clear everything and return to product options
        this.chatView = 'options';
        this.selectedProduct = '';
        this.firstName = '';
        this.lastName = '';
        this.email = '';
        this.mobile = '';
        this.subject = '';
        this.messages = [];
        this.newMessage = '';
    }

    // ── Step 1 → 2: product selected, show pre-chat form ──
    handleChatOption(event) {
        this.selectedProduct = event.currentTarget.dataset.label;
        if (!this.subject.trim()) {
            this.subject = `${this.selectedProduct} Support`;
        }
        this.chatView = 'form';
    }

    backToOptions() {
        this.chatView = 'options';
    }

    handleFieldChange(event) {
        const field = event.target.dataset.field;
        this[field] = event.target.value;
    }

    // ── Step 2 → 3: start the live chat ───────
    startChatting() {
        if (this.isFormIncomplete) return;
        this.messages = [
            {
                id: ++this._msgId,
                cssClass: 'msg msg--agent',
                sender: 'Capsa Support',
                text: `Hi ${this.firstName}, thanks for reaching out about ${this.selectedProduct}. An agent will be with you shortly.`
            },
            {
                id: ++this._msgId,
                cssClass: 'msg msg--user',
                sender: 'You',
                text: this.subject
            }
        ];
        this.chatView = 'chat';
    }

    handleMessageInput(event) {
        this.newMessage = event.target.value;
    }

    handleMessageKey(event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            this.sendMessage();
        }
    }

    sendMessage() {
        const text = this.newMessage.trim();
        if (!text) return;
        this.messages = [
            ...this.messages,
            { id: ++this._msgId, cssClass: 'msg msg--user', sender: 'You', text }
        ];
        this.newMessage = '';
        this.scrollThreadToBottom();
        // Simulated agent acknowledgement so the panel behaves like a live chat
        // eslint-disable-next-line @lwc/lwc/no-async-operation
        setTimeout(() => {
            this.messages = [
                ...this.messages,
                {
                    id: ++this._msgId,
                    cssClass: 'msg msg--agent',
                    sender: 'Capsa Support',
                    text: 'Thanks for the details — an agent is reviewing your message and will respond shortly.'
                }
            ];
            this.scrollThreadToBottom();
        }, 1200);
    }

    scrollThreadToBottom() {
        // eslint-disable-next-line @lwc/lwc/no-async-operation
        setTimeout(() => {
            const thread = this.template.querySelector('.livechat-thread');
            if (thread) {
                thread.scrollTop = thread.scrollHeight;
            }
        }, 0);
    }
}
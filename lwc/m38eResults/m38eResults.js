import { LightningElement, api, track } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import createQuoteFromConfiguration from '@salesforce/apex/QuoteGeneratorController.createQuoteFromConfiguration';
import updateExistingQuote from '@salesforce/apex/QuoteGeneratorController.updateExistingQuote';

export default class M38eResults extends NavigationMixin(LightningElement) {
    @api opportunityId;
    @api selections;
    @api quoteId; // Needed to support reconfiguring an existing quote

    @track isLoading = false;

    // Preview Variables
    @track baseCartImage = '';
    @track overlays = [];
    @track chassisSku = '19750';

    connectedCallback() {
        this.restorePreviewState();
        this.chassisSku = this.calculateChassisSku();
    }

    get isReconfigureMode() {
        return this.quoteId != null && this.quoteId !== undefined && this.quoteId !== '';
    }

    restorePreviewState() {
        if (this.selections && this.selections.layeredPreview) {
            this.baseCartImage = this.selections.layeredPreview.baseImage;
            this.overlays = this.selections.layeredPreview.overlays || [];
        } else {
            this.baseCartImage = this.selections?.previewImage || '/resource/m38eImagesPart1/m38eImagesPart1/documentation.jpg';
        }
    }

    // --- SUMMARY UI BUILDER ---
    get summarySections() {
        const formattedSlots = (this.selections?.BUILDER_SLOTS || [])
            .filter(slot => slot.sku)
            .map(slot => ({
                label: `Bin ${slot.id}: ${slot.label}`,
                sku: slot.sku
            }));

        const fullStorageArr = [...(this.selections?.STORAGE || []), ...formattedSlots];

        return [
            { title: 'Use Case', items: this.selections?.USE_CASE || [], hasData: (this.selections?.USE_CASE || []).length > 0 },
            { title: 'Power', items: this.selections?.POWER || [], hasData: (this.selections?.POWER || []).length > 0 },
            { title: 'Lift', items: this.selections?.LIFT || [], hasData: (this.selections?.LIFT || []).length > 0 },
            { title: 'Monitor', items: this.selections?.MONITOR || [], hasData: (this.selections?.MONITOR || []).length > 0 },
            { title: 'Keyboard Tray', items: this.selections?.KEYBOARD || [], hasData: (this.selections?.KEYBOARD || []).length > 0 },
            { title: 'Casters', items: this.selections?.CASTERS || [], hasData: (this.selections?.CASTERS || []).length > 0 },
            { title: 'Storage and Security', items: fullStorageArr, hasData: fullStorageArr.length > 0 },
            { title: 'Telepresence Accessories', items: this.selections?.TELE_ACCESSORIES || [], hasData: (this.selections?.TELE_ACCESSORIES || []).length > 0 },
            { title: 'Accessories', items: this.selections?.ACCESSORIES || [], hasData: (this.selections?.ACCESSORIES || []).length > 0 },
            { title: 'Warranty', items: this.selections?.WARRANTY || [], hasData: (this.selections?.WARRANTY || []).length > 0 }
        ];
    }

    // --- PAYLOAD GENERATOR FOR APEX ---
    buildProductRequests() {
        let requests = [];

        if (this.chassisSku) {
            requests.push({ code: this.chassisSku, qty: 1, imgUrl: '' });
        }
        
        const allSelections = [
            ...(this.selections?.POWER || []),
            ...(this.selections?.LIFT || []),
            ...(this.selections?.MONITOR || []),
            ...(this.selections?.KEYBOARD || []),
            ...(this.selections?.CASTERS || []),
            ...(this.selections?.STORAGE || []),
            ...(this.selections?.BUILDER_SLOTS || []),
            ...(this.selections?.TELE_ACCESSORIES || []),
            ...(this.selections?.ACCESSORIES || []),
            ...(this.selections?.WARRANTY || [])
        ];

        const billableItems = allSelections.filter(item => item.sku !== null && item.sku !== '');

        billableItems.forEach(item => {
            if (item.sku.includes('+')) {
                const parts = item.sku.split('+');
                parts.forEach(p => {
                    requests.push({ code: p.trim(), qty: 1, imgUrl: ''});
                });
            } else {
                requests.push({ code: item.sku.trim(), qty: 1, imgUrl: ''});
            }
        });

        return JSON.stringify(requests);
    }

    // --- CHASSIS SKU ENGINE ---
    calculateChassisSku() {
        const pwrArr = this.selections?.POWER || [];
        const pwr = pwrArr.length > 0 ? pwrArr[0].key.toLowerCase() : '';
        
        const liftArr = this.selections?.LIFT || [];
        const lift = liftArr.length > 0 ? liftArr[0].key.toLowerCase() : '';
        
        const storArr = this.selections?.STORAGE || [];
        const storType = storArr.length > 0 ? storArr[0].key.toLowerCase() : '';
        const binType = storArr.length > 1 ? storArr[1].key.toLowerCase() : '';
        
        const useCaseArr = this.selections?.USE_CASE || [];
        const useCase = useCaseArr.length > 0 ? useCaseArr[0].key.toLowerCase() : '';

        const isPowered = pwr.includes('power') && !pwr.includes('non');
        const isNonPowered = !isPowered; 
        const isIntl = pwr.includes('international') || pwr.includes('intl');
        const isMed = useCase.includes('medication');
        const isElecLift = lift.includes('electronic') || lift.includes('electric');
        const isManLift = !isElecLift;
        const isElecLock = storType.includes('electric');
        const isNonLock = storType.includes('non locking') || storType.includes('non-locking');
        const isNoStor = storType.includes('no storage') || storType.includes('none');
        
        const isDrx = binType.includes('1781374'); 
        const isRxXp = binType.includes('207289'); 
        const is088 = binType.includes('m06033601') || binType.includes('1889701'); 

        let sku = "19750";

        if (isPowered && isElecLift && isIntl && isMed && (!is088 || isDrx)) {
            sku = '1975198';
        } else if (isPowered && isElecLift && (isElecLock || isNonLock)) {
            if (isIntl) {
                if (isDrx) sku += "92";
                else if (isRxXp) sku = "1975198";
                else sku += "88";
            } else {
                if (isDrx) sku += "83";
                else sku += "74";
            }
        } else if (isPowered && isElecLift && isNoStor) {
            if (isIntl) sku += "89";
            else sku += "75";
        } else if (isPowered && isManLift && (isNonLock || isNoStor)) {
            if (isIntl) sku += "90";
            else sku += "76";
        } else if (isPowered && isManLift && isElecLock) {
            if (isIntl) sku += "91";
            else sku += "77";
        } else if (isNonPowered && isManLift && (isNonLock || isNoStor)) {
            sku += "81";
        } else if (isNonPowered && isElecLift && (isElecLock || isNonLock)) {
            sku += "78";
        } else if (isNonPowered && isElecLift && isNoStor) {
            sku += "79";
        } else if (isNonPowered && isManLift && isElecLock) {
            sku += "80";
        }

        return sku;
    }

    // --- NAVIGATION HELPER ---
    navigateToRecord(recordId) {
        this[NavigationMixin.Navigate]({
            type: 'standard__recordPage',
            attributes: {
                recordId: recordId,
                objectApiName: 'Quote',
                actionName: 'view'
            }
        });
    }

    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }

    // --- SUBMISSION LOGIC ---
    async handleGenerateQuote() {
        this.isLoading = true;
        try {
            const configJson = this.buildProductRequests();

            if (this.isReconfigureMode) {
                // UPDATE EXISTING QUOTE
                await updateExistingQuote({
                    quoteId: this.quoteId,
                    configJson: configJson
                });
                
                this.showToast('Success', 'Quote updated successfully.', 'success');
                this.dispatchEvent(new CustomEvent('resetflow', { bubbles: true, composed: true }));
                this.navigateToRecord(this.quoteId);

            } else {
                // CREATE NEW QUOTE
                console.log('Creating new quote with configJson:', configJson);
                const newQuoteId = await createQuoteFromConfiguration({
                    configJson: configJson,
                    opportunityId: this.opportunityId,
                    cartSKU: this.chassisSku
                });

                this.showToast('Success', 'Quote created successfully.', 'success');
                this.dispatchEvent(new CustomEvent('resetflow', { bubbles: true, composed: true }));
                this.navigateToRecord(newQuoteId);
            }

        } catch (error) {
            console.error('Quote Generation Error:', error);
            this.showToast('Error', error.body ? error.body.message : error.message, 'error');
            this.isLoading = false; // Only stop loading if there's an error (so spinner stays up during redirect)
        }
    }
}
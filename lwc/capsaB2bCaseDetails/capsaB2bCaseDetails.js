import { LightningElement, api, track, wire } from 'lwc';
import { NavigationMixin, CurrentPageReference } from 'lightning/navigation';
import { refreshApex } from '@salesforce/apex';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import LightningConfirm from 'lightning/confirm';
import basePath from '@salesforce/community/basePath';
import getCaseDetail from '@salesforce/apex/CapsaB2bCaseDetailController.getCaseDetail';
import getCaseFiles from '@salesforce/apex/CapsaB2bCaseDetailController.getCaseFiles';
import updateCaseComment from '@salesforce/apex/CapsaB2bCaseDetailController.updateCaseComment';
import uploadCaseFile from '@salesforce/apex/CapsaB2bCaseDetailController.uploadCaseFile';
import deleteCaseFile from '@salesforce/apex/CapsaB2bCaseDetailController.deleteCaseFile';

// Priority → badge style (mirrors capsaB2bCaseList; see CSS)
function priorityBadge(priority) {
    if (priority === 'High' || priority === 'Critical') {
        return 'qbadge qbadge--high';
    }
    if (priority === 'Medium') {
        return 'qbadge qbadge--med';
    }
    return 'qbadge qbadge--low';
}

// Status → badge style, categorised (the Case status picklist is large).
function statusBadge(status) {
    const s = (status || '').toLowerCase();
    if (s === 'new') {
        return 'qbadge qbadge--new';
    }
    if (
        s.includes('closed') || s.includes('resolved') ||
        s.includes('complete') || s.includes('shipped')
    ) {
        return 'qbadge qbadge--done';
    }
    if (s.includes('escalat')) {
        return 'qbadge qbadge--esc';
    }
    return 'qbadge qbadge--prog';
}

// Accepted upload types: Excel, Word, images, PDF, email.
const ACCEPTED_EXT = [
    'xls', 'xlsx', 'csv',
    'doc', 'docx',
    'pdf',
    'png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'heic',
    'eml', 'msg'
];
const ACCEPT_ATTR = ACCEPTED_EXT.map((e) => '.' + e).join(',');

// Synchronous Apex heap is 6 MB and the base64 string + decoded blob both live
// there during upload, so cap each file conservatively (~2 MB raw).
const MAX_BYTES = 2 * 1024 * 1024;

// Extension → icon glyph bucket for the file list.
function extBucket(ext) {
    const e = (ext || '').toLowerCase();
    if (['xls', 'xlsx', 'csv'].includes(e)) return 'excel';
    if (['doc', 'docx'].includes(e)) return 'word';
    if (e === 'pdf') return 'pdf';
    if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'heic'].includes(e)) return 'image';
    if (['eml', 'msg'].includes(e)) return 'email';
    return 'file';
}

function humanSize(bytes) {
    if (!bytes && bytes !== 0) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export default class CapsaB2bCaseDetails extends NavigationMixin(LightningElement) {

    // ── Design properties ───────────────────────────────────────────
    @api heading = 'Case Details';
    // API name of the community page that hosts capsaB2bCaseList. Used for the
    // "Back to cases" link. Leave blank to fall back to browser history.
    @api backPageApiName = '';

    // ── State ───────────────────────────────────────────────────────
    @track caseRecord;
    @track isLoading = false;
    @track hasLoaded = false;
    recordId;

    // Comment editing
    @track isEditingComment = false;
    @track commentDraft = '';
    @track isSavingComment = false;

    // Files
    @track files = [];
    @track isUploading = false;
    @track isDragging = false;
    @track uploadError = '';
    filesResult; // wired result handle for refreshApex

    acceptAttr = ACCEPT_ATTR;

    // The case id arrives as a URL query param (?caseId=<id>) set by the list
    // component's navigation. CurrentPageReference exposes it via state.
    @wire(CurrentPageReference)
    setPageReference(pageRef) {
        if (!pageRef) {
            return;
        }
        const state = pageRef.state || {};
        const id = state.caseId || state.recordId || state.c__caseId;
        if (id && id !== this.recordId) {
            this.recordId = id;
            this.loadCase();
        } else if (!id && !this.hasLoaded) {
            this.hasLoaded = true; // nothing to load → show empty state
        }
    }

    @wire(getCaseFiles, { caseId: '$recordId' })
    wiredFiles(result) {
        this.filesResult = result;
        const { data } = result;
        if (data) {
            this.files = data.map((f) => this.decorateFile(f));
        } else {
            this.files = [];
        }
    }

    decorateFile(f) {
        const bucket = extBucket(f.fileExtension);
        return {
            ...f,
            sizeLabel: humanSize(f.sizeBytes),
            bucket,
            iconClass: 'file-ico file-ico--' + bucket,
            extLabel: (f.fileExtension || '').toUpperCase(),
            downloadUrl:
                basePath +
                '/sfc/servlet.shepherd/document/download/' +
                f.contentDocumentId
        };
    }

    // ── Server fetch ────────────────────────────────────────────────
    async loadCase() {
        this.isLoading = true;
        try {
            const data = await getCaseDetail({ caseId: this.recordId });
            this.caseRecord = data
                ? {
                      ...data,
                      priorityClass: priorityBadge(data.priority),
                      statusClass: statusBadge(data.status)
                  }
                : null;
        } catch (error) {
            this.caseRecord = null;
            // eslint-disable-next-line no-console
            console.error('getCaseDetail failed', error);
        } finally {
            this.isLoading = false;
            this.hasLoaded = true;
        }
    }

    // ── View-state getters ──────────────────────────────────────────
    get showSpinner() {
        return this.isLoading;
    }
    get showDetail() {
        return !this.isLoading && !!this.caseRecord;
    }
    get showEmpty() {
        return this.hasLoaded && !this.isLoading && !this.caseRecord;
    }
    get hasDescription() {
        return !!(this.caseRecord && this.caseRecord.description);
    }
    get hasLastComment() {
        return !!(this.caseRecord && this.caseRecord.lastCaseComment);
    }
    get hasFiles() {
        return this.files && this.files.length > 0;
    }
    get editLabel() {
        return this.hasLastComment ? 'Edit' : 'Add comment';
    }
    get dropZoneClass() {
        return this.isDragging ? 'dropzone dropzone--active' : 'dropzone';
    }

    // ── Comment editing ─────────────────────────────────────────────
    handleEditComment() {
        this.commentDraft = (this.caseRecord && this.caseRecord.lastCaseComment) || '';
        this.isEditingComment = true;
    }
    handleCommentChange(event) {
        this.commentDraft = event.target.value;
    }
    handleCancelComment() {
        this.isEditingComment = false;
        this.commentDraft = '';
    }
    async handleSaveComment() {
        this.isSavingComment = true;
        try {
            const saved = await updateCaseComment({
                caseId: this.recordId,
                comment: this.commentDraft
            });
            this.caseRecord = { ...this.caseRecord, lastCaseComment: saved };
            this.isEditingComment = false;
            this.toast('Saved', 'Case comment updated.', 'success');
        } catch (error) {
            this.toast('Save failed', this.errMsg(error), 'error');
        } finally {
            this.isSavingComment = false;
        }
    }

    // ── File upload: drag & drop + picker ───────────────────────────
    handleDragOver(event) {
        event.preventDefault();
        this.isDragging = true;
    }
    handleDragLeave(event) {
        event.preventDefault();
        this.isDragging = false;
    }
    handleDrop(event) {
        event.preventDefault();
        this.isDragging = false;
        const dropped = event.dataTransfer && event.dataTransfer.files;
        if (dropped && dropped.length) {
            this.processFiles(Array.from(dropped));
        }
    }
    handleBrowse() {
        const input = this.template.querySelector('input[type="file"]');
        if (input) {
            input.click();
        }
    }
    handlePicker(event) {
        const picked = event.target.files;
        if (picked && picked.length) {
            this.processFiles(Array.from(picked));
        }
        event.target.value = null; // allow re-selecting the same file
    }

    async processFiles(fileList) {
        this.uploadError = '';
        const valid = [];
        for (const file of fileList) {
            const ext = (file.name.split('.').pop() || '').toLowerCase();
            if (!ACCEPTED_EXT.includes(ext)) {
                this.uploadError = `"${file.name}" is not an accepted type.`;
                continue;
            }
            if (file.size > MAX_BYTES) {
                this.uploadError = `"${file.name}" is larger than 2 MB.`;
                continue;
            }
            valid.push(file);
        }
        if (!valid.length) {
            return;
        }

        this.isUploading = true;
        let uploaded = 0;
        for (const file of valid) {
            try {
                // eslint-disable-next-line no-await-in-loop
                const base64 = await this.readAsBase64(file);
                // eslint-disable-next-line no-await-in-loop
                await uploadCaseFile({
                    caseId: this.recordId,
                    base64,
                    fileName: file.name
                });
                uploaded += 1;
            } catch (error) {
                this.uploadError = this.errMsg(error);
            }
        }
        this.isUploading = false;

        if (uploaded > 0) {
            await refreshApex(this.filesResult);
            this.toast(
                'Uploaded',
                `${uploaded} file${uploaded > 1 ? 's' : ''} attached to this case.`,
                'success'
            );
        }
    }

    readAsBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                // strip the data:*/*;base64, prefix
                const result = reader.result || '';
                const comma = result.indexOf(',');
                resolve(comma >= 0 ? result.substring(comma + 1) : result);
            };
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(file);
        });
    }

    handleDownload(event) {
        const url = event.currentTarget.dataset.url;
        if (url) {
            this[NavigationMixin.Navigate](
                {
                    type: 'standard__webPage',
                    attributes: { url }
                },
                false
            );
        }
    }

    async handleDelete(event) {
        const { id, title } = event.currentTarget.dataset;
        if (!id) {
            return;
        }
        const confirmed = await LightningConfirm.open({
            message: `Remove "${title}" from this case? This can't be undone.`,
            label: 'Remove file',
            theme: 'warning'
        });
        if (!confirmed) {
            return;
        }
        try {
            await deleteCaseFile({
                caseId: this.recordId,
                contentDocumentId: id
            });
            await refreshApex(this.filesResult);
            this.toast('Removed', 'File removed from this case.', 'success');
        } catch (error) {
            this.toast('Remove failed', this.errMsg(error), 'error');
        }
    }

    // ── Navigation ──────────────────────────────────────────────────
    handleBack() {
        if (this.backPageApiName) {
            this[NavigationMixin.Navigate]({
                type: 'comm__namedPage',
                attributes: { name: this.backPageApiName }
            });
            return;
        }
        // eslint-disable-next-line no-restricted-globals
        if (typeof window !== 'undefined' && window.history) {
            window.history.back();
        }
    }

    // ── Utilities ───────────────────────────────────────────────────
    toast(title, message, variant) {
        this.dispatchEvent(
            new ShowToastEvent({ title, message, variant })
        );
    }
    errMsg(error) {
        if (error && error.body && error.body.message) {
            return error.body.message;
        }
        if (error && error.message) {
            return error.message;
        }
        return 'Something went wrong. Please try again.';
    }
}
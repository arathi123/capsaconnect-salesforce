import { LightningElement, api, track, wire } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { SessionContextAdapter } from 'commerce/contextApi';
import getCases from '@salesforce/apex/CapsaB2bCaseListController.getCases';
import getUserContext from '@salesforce/apex/CapsaB2bCaseListController.getUserContext';
import createCase from '@salesforce/apex/CapsaB2bCaseListController.createCase';
import createCaseWithFiles from '@salesforce/apex/CapsaB2bCaseListController.createCaseWithFiles';
import stageCaseFile from '@salesforce/apex/CapsaB2bCaseListController.stageCaseFile';
import discardStagedFiles from '@salesforce/apex/CapsaB2bCaseListController.discardStagedFiles';

const NEW_CASE_PRIORITY_OPTIONS = ['Low', 'Medium', 'High', 'Critical'];

// Wait this long after the last keystroke before querying the server.
const SEARCH_DEBOUNCE_MS = 350;

// Accepted attachment types: Excel, Word, images, PDF, email.
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

// Extension → icon glyph bucket for the staged-file chips.
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

// Priority → badge style (see CSS)
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

export default class CapsaB2bCaseList extends NavigationMixin(LightningElement) {

    // ── Design properties ───────────────────────────────────────────
    @api heading = 'Support cases';
    @api pageSize = 10;
    // API name of the Experience Builder page that hosts capsaB2bCaseDetails
    // (the page whose URL is /case-details). Configurable so the same code
    // works across sandbox and production without hardcoding a URL path.
    @api detailPageApiName = 'Case_Details__c';

    // ── Search state ────────────────────────────────────────────────
    // Searching is server-side: the client only ever holds one page, so
    // filtering `rows` here would only ever search the page on screen.
    // `searchKey` is the term currently applied to the query; `searchDraft`
    // tracks what is in the input so the clear button can appear immediately.
    @track searchKey = '';
    @track searchDraft = '';
    searchTimer = null;

    // ── Sort / paging state ─────────────────────────────────────────
    @track sortBy = 'createdDate';
    @track sortDirection = 'desc';

    // Keyset (cursor) paging: pageCursors[i] = "after this id" for page i+1
    // (page 1 = null). Avoids SOQL OFFSET, which caps at 2000 rows.
    @track pageIndex = 0;
    pageCursors = [null];

    // ── Data / status flags ─────────────────────────────────────────
    @track rows = [];
    @track totalCount = 0;
    @track isLoading = false;
    @track hasLoaded = false;

    isGuest = false;

    // ── New-case modal state ────────────────────────────────────────
    @track showNewCaseModal = false;
    @track isSavingCase = false;
    @track newSubject = '';
    @track newPriority = 'Medium';
    @track newDescription = '';
    @track newCaseError = '';
    accountId = null;
    contactId = null;

    // ── Attachment staging (files exist in the org before the case does) ──
    // Each entry: { contentDocumentId, name, sizeLabel, iconClass, extLabel }
    @track stagedFiles = [];
    @track isUploadingFiles = false;
    @track isDragging = false;
    @track fileError = '';
    acceptAttr = ACCEPT_ATTR;

    // Priority options for the native <select> (selected flag drives the
    // controlled value so it stays in sync with newPriority).
    get priorityOptions() {
        return NEW_CASE_PRIORITY_OPTIONS.map((p) => ({
            label: p,
            value: p,
            selected: p === this.newPriority
        }));
    }

    get hasStagedFiles() {
        return this.stagedFiles.length > 0;
    }
    get dropZoneClass() {
        return this.isDragging ? 'dropzone dropzone--active' : 'dropzone';
    }
    get stagedDocIds() {
        return this.stagedFiles.map((f) => f.contentDocumentId);
    }

    @wire(SessionContextAdapter)
    setSessionContext({ data }) {
        if (data) {
            this.isGuest = !!data.guestUser;
        }
    }

    @wire(getUserContext)
    wiredUserContext({ data }) {
        if (data) {
            this.accountId = data.accountId;
            this.contactId = data.contactId;
        }
    }

    connectedCallback() {
        this.loadCases();
    }

    disconnectedCallback() {
        clearTimeout(this.searchTimer);
    }

    // ── Server fetch ────────────────────────────────────────────────
    async loadCases() {
        if (this.isGuest) {
            this.hasLoaded = true;
            return;
        }
        this.isLoading = true;
        try {
            const res = await getCases({
                searchKey: this.searchKey || null,
                status: null,
                priority: null,
                startDate: null,
                endDate: null,
                sortBy: this.sortBy,
                sortDirection: this.sortDirection,
                pageSize: this.pageSize,
                afterId: this.pageCursors[this.pageIndex] || null
            });
            this.rows = (res.rows || []).map((r) => ({
                ...r,
                priorityClass: priorityBadge(r.priority),
                statusClass: statusBadge(r.status)
            }));
            this.totalCount = res.totalCount || 0;
        } catch (error) {
            this.rows = [];
            this.totalCount = 0;
            // eslint-disable-next-line no-console
            console.error('getCases failed', error);
        } finally {
            this.isLoading = false;
            this.hasLoaded = true;
        }
    }

    // ── Search (server-side, debounced) ─────────────────────────────
    // The input is deliberately uncontrolled (no `value` binding): a re-render
    // between keystrokes would otherwise reset it to the last applied term.
    handleSearchInput(event) {
        this.searchDraft = event.target.value;
        clearTimeout(this.searchTimer);
        // eslint-disable-next-line @lwc/lwc/no-async-operation
        this.searchTimer = setTimeout(
            () => this.applySearch(this.searchDraft),
            SEARCH_DEBOUNCE_MS
        );
    }

    handleSearchKeydown(event) {
        if (event.key === 'Enter') {
            clearTimeout(this.searchTimer);
            this.applySearch(this.searchDraft);
        } else if (event.key === 'Escape' && this.searchDraft) {
            this.handleClearSearch();
        }
    }

    handleClearSearch() {
        clearTimeout(this.searchTimer);
        const input = this.template.querySelector('.search-input');
        if (input) {
            input.value = '';
            input.focus();
        }
        this.searchDraft = '';
        this.applySearch('');
    }

    applySearch(term) {
        const next = (term || '').trim();
        if (next === this.searchKey) {
            return; // nothing changed (e.g. trailing whitespace only)
        }
        this.searchKey = next;
        this.resetPaging();
        this.loadCases();
    }

    get hasSearchText() {
        return this.searchDraft.length > 0;
    }
    get isSearching() {
        return this.searchKey.length > 0;
    }
    get searchResultLabel() {
        const n = this.totalCount;
        return `${n} ${n === 1 ? 'result' : 'results'}`;
    }

    // ── Sorting (server-side) ───────────────────────────────────────
    handleSort(event) {
        const column = event.currentTarget.dataset.column;
        if (!column) {
            return;
        }
        if (this.sortBy === column) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortBy = column;
            this.sortDirection = 'asc';
        }
        this.resetPaging();
        this.loadCases();
    }

    sortIcon(column) {
        if (this.sortBy !== column) {
            return '';
        }
        return this.sortDirection === 'asc' ? '▲' : '▼';
    }
    get sortIconCaseNumber() { return this.sortIcon('caseNumber'); }
    get sortIconSubject() { return this.sortIcon('subject'); }
    get sortIconProduct() { return this.sortIcon('product'); }
    get sortIconOpened() { return this.sortIcon('createdDate'); }
    get sortIconPriority() { return this.sortIcon('priority'); }
    get sortIconStatus() { return this.sortIcon('status'); }

    // ── Navigation ──────────────────────────────────────────────────
    handleCaseClick(event) {
        this.navigateToCase(event.currentTarget.dataset.id);
    }

    navigateToCase(recordId) {
        if (!recordId) {
            return;
        }
        // Navigate to the custom Experience Builder page (/case-details) by its
        // API name and pass the case id as a URL param (?caseId=...). Targeting
        // the page's API name — not a hardcoded URL — keeps the link working
        // after a sandbox → production deployment.
        this[NavigationMixin.Navigate]({
            type: 'comm__namedPage',
            attributes: {
                name: this.detailPageApiName
            },
            state: {
                caseId: recordId
            }
        });
    }

    // ── New Case modal ──────────────────────────────────────────────
    handleNewCase() {
        this.resetNewCaseForm();
        this.showNewCaseModal = true;
    }

    // Cancelling the modal removes any files that were already uploaded to the
    // org while staging, so nothing is left orphaned.
    handleCloseModal() {
        if (this.isSavingCase) {
            return;
        }
        this.discardStaged();
        this.showNewCaseModal = false;
    }

    // Close when the click lands on the overlay itself, not the dialog card.
    handleBackdropClick(event) {
        if (event.target === event.currentTarget && !this.isSavingCase) {
            this.handleCloseModal();
        }
    }

    resetNewCaseForm() {
        this.newSubject = '';
        this.newPriority = 'Medium';
        this.newDescription = '';
        this.newCaseError = '';
        this.stagedFiles = [];
        this.fileError = '';
        this.isDragging = false;
        this.isUploadingFiles = false;
    }

    // Delete staged files from the org (fire-and-forget) and clear the list.
    discardStaged() {
        const ids = this.stagedDocIds;
        if (ids.length) {
            discardStagedFiles({ contentDocumentIds: ids }).catch((error) => {
                // eslint-disable-next-line no-console
                console.error('discardStagedFiles failed', error);
            });
        }
        this.stagedFiles = [];
    }

    handleSubjectChange(event) {
        this.newSubject = event.target.value;
    }
    handlePriorityChange(event) {
        this.newPriority = event.target.value;
    }
    handleDescriptionChange(event) {
        this.newDescription = event.target.value;
    }

    // ── Attachment staging (drag & drop + picker) ───────────────────
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
            this.stageFiles(Array.from(dropped));
        }
    }
    handleBrowseFiles() {
        const input = this.template.querySelector('input[type="file"]');
        if (input) {
            input.click();
        }
    }
    handleFilePicker(event) {
        const picked = event.target.files;
        if (picked && picked.length) {
            this.stageFiles(Array.from(picked));
        }
        event.target.value = null; // allow re-selecting the same file
    }

    async stageFiles(fileList) {
        this.fileError = '';
        const valid = [];
        for (const file of fileList) {
            const ext = (file.name.split('.').pop() || '').toLowerCase();
            if (!ACCEPTED_EXT.includes(ext)) {
                this.fileError = `"${file.name}" is not an accepted type.`;
                continue;
            }
            if (file.size > MAX_BYTES) {
                this.fileError = `"${file.name}" is larger than 2 MB.`;
                continue;
            }
            valid.push(file);
        }
        if (!valid.length) {
            return;
        }

        this.isUploadingFiles = true;
        for (const file of valid) {
            try {
                // eslint-disable-next-line no-await-in-loop
                const base64 = await this.readAsBase64(file);
                // eslint-disable-next-line no-await-in-loop
                const contentDocumentId = await stageCaseFile({
                    base64,
                    fileName: file.name
                });
                const ext = (file.name.split('.').pop() || '').toLowerCase();
                const bucket = extBucket(ext);
                this.stagedFiles = [
                    ...this.stagedFiles,
                    {
                        contentDocumentId,
                        name: file.name,
                        sizeLabel: humanSize(file.size),
                        extLabel: ext.toUpperCase(),
                        iconClass: 'file-ico file-ico--' + bucket
                    }
                ];
            } catch (error) {
                this.fileError =
                    (error && error.body && error.body.message) ||
                    (error && error.message) ||
                    `Couldn't upload "${file.name}".`;
            }
        }
        this.isUploadingFiles = false;
    }

    readAsBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const result = reader.result || '';
                const comma = result.indexOf(',');
                resolve(comma >= 0 ? result.substring(comma + 1) : result);
            };
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(file);
        });
    }

    // Remove a single staged file — deletes it from the org immediately.
    async handleRemoveStaged(event) {
        const id = event.currentTarget.dataset.id;
        if (!id) {
            return;
        }
        this.stagedFiles = this.stagedFiles.filter(
            (f) => f.contentDocumentId !== id
        );
        try {
            await discardStagedFiles({ contentDocumentIds: [id] });
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('discardStagedFiles failed', error);
        }
    }

    async handleCreateCase() {
        if (!this.newSubject || !this.newSubject.trim()) {
            this.newCaseError = 'Please enter a subject for your case.';
            const subjectInput = this.template.querySelector('.cfield__input');
            if (subjectInput) {
                subjectInput.focus();
            }
            return;
        }

        this.isSavingCase = true;
        this.newCaseError = '';
        try {
            const docIds = this.stagedDocIds;
            if (docIds.length) {
                await createCaseWithFiles({
                    subject: this.newSubject,
                    description: this.newDescription,
                    priority: this.newPriority,
                    contentDocumentIds: docIds
                });
            } else {
                await createCase({
                    subject: this.newSubject,
                    description: this.newDescription,
                    priority: this.newPriority
                });
            }
            // Files are now linked to the case — clear staging WITHOUT deleting.
            this.stagedFiles = [];
            this.showNewCaseModal = false;
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Case created',
                    message: 'Your support case has been submitted.',
                    variant: 'success'
                })
            );
            this.sortBy = 'createdDate';
            this.sortDirection = 'desc';
            this.resetPaging();
            this.loadCases();
        } catch (error) {
            this.newCaseError =
                (error && error.body && error.body.message) ||
                (error && error.message) ||
                'Something went wrong while creating the case. Please try again.';
        } finally {
            this.isSavingCase = false;
        }
    }

    // ── Pagination (keyset / cursor) ────────────────────────────────
    resetPaging() {
        this.pageCursors = [null];
        this.pageIndex = 0;
    }

    get pageNumber() {
        return this.pageIndex + 1;
    }
    get totalPages() {
        return Math.max(1, Math.ceil(this.totalCount / this.pageSize));
    }
    get isFirstPage() {
        return this.pageIndex <= 0;
    }
    get isLastPage() {
        return this.pageNumber >= this.totalPages;
    }
    get showPagination() {
        return this.totalPages > 1;
    }
    get rangeStart() {
        return this.totalCount === 0 ? 0 : this.pageIndex * this.pageSize + 1;
    }
    get rangeEnd() {
        return Math.min(this.pageNumber * this.pageSize, this.totalCount);
    }
    get pageSummary() {
        return `${this.rangeStart}–${this.rangeEnd} of ${this.totalCount}`;
    }

    handlePrev() {
        if (this.isFirstPage) return;
        this.pageIndex -= 1;
        this.loadCases();
    }
    handleNext() {
        if (this.isLastPage) return;
        // Cursor for the next page = id of the last row currently shown.
        const lastId = this.rows.length ? this.rows[this.rows.length - 1].id : null;
        if (!lastId) return;
        this.pageCursors = this.pageCursors.slice(0, this.pageIndex + 1);
        this.pageCursors.push(lastId);
        this.pageIndex += 1;
        this.loadCases();
    }

    // ── View-state getters ──────────────────────────────────────────
    get showSpinner() {
        return this.isLoading;
    }
    // The table stays mounted while a search/sort/page request is in flight —
    // the spinner overlays it — so the search input never loses focus.
    get showTable() {
        return this.rows.length > 0;
    }
    get showToolbar() {
        return !this.isGuest;
    }
    get showEmptyState() {
        return this.hasLoaded && !this.isLoading && this.rows.length === 0 && !this.isGuest;
    }
    get showGuestState() {
        return this.hasLoaded && this.isGuest;
    }
    get canCreateCase() {
        return !this.isGuest;
    }
    get emptyTitle() {
        return this.isSearching ? 'No matching cases' : 'No cases yet';
    }
    get emptyText() {
        return this.isSearching
            ? 'No case number or subject matches your search. Try a different term.'
            : 'Open a case and your support requests will appear here.';
    }
}
import LightningModal from 'lightning/modal';

export default class DeleteConfirmModal extends LightningModal {
    handleConfirm() {
        this.close(true);
    }
    handleCancel() {
        this.close(false);
    }
}
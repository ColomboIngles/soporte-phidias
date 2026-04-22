import Modal from "./ui/Modal";

export default function ModalShell({
    open,
    onClose,
    title,
    description,
    children,
    actions,
    icon: Icon,
    widthClassName = "max-w-xl",
}) {
    return (
        <Modal
            open={open}
            onClose={onClose}
            title={title}
            description={description}
            actions={actions}
            icon={Icon}
            widthClassName={widthClassName}
        >
            {children}
        </Modal>
    );
}

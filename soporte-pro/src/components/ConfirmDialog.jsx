import { AlertTriangle } from "lucide-react";
import ModalShell from "./ModalShell";
import Button from "./ui/Button";

export default function ConfirmDialog({
    open,
    onClose,
    onConfirm,
    title,
    description,
    confirmLabel = "Confirmar",
    cancelLabel = "Cancelar",
    tone = "danger",
    busy = false,
}) {
    return (
        <ModalShell
            open={open}
            onClose={busy ? undefined : onClose}
            title={title}
            description={description}
            icon={AlertTriangle}
            widthClassName="max-w-lg"
            actions={
                <>
                    <Button
                        variant="secondary"
                        onClick={onClose}
                        disabled={busy}
                    >
                        {cancelLabel}
                    </Button>
                    <Button
                        variant={tone === "danger" ? "danger" : "primary"}
                        onClick={onConfirm}
                        disabled={busy}
                    >
                        {busy ? "Procesando..." : confirmLabel}
                    </Button>
                </>
            }
        >
            <div className="app-surface-muted rounded-[1.5rem] px-4 py-4 text-sm leading-7 text-[color:var(--app-text-secondary)]">
                Esta accion modifica informacion del sistema. Verifica que corresponde al flujo correcto antes de continuar.
            </div>
        </ModalShell>
    );
}

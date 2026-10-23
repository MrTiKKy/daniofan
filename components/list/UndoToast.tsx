/* Toast „Produs scos · Anulează” — 5s. */
'use client';

interface Props {
  open: boolean;
  onUndo: () => void;
  onDismiss: () => void;
}

export default function UndoToast({ open, onUndo, onDismiss }: Props) {
  if (!open) return null;
  return (
    <div className="slist-toast" role="status" aria-live="polite">
      <span className="slist-toast__msg">Produs scos</span>
      <button
        type="button"
        className="slist-toast__undo"
        onClick={() => {
          onUndo();
          onDismiss();
        }}
      >
        Anulează
      </button>
    </div>
  );
}

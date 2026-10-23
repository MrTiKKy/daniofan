/* Toast global „Produs scos · Anulează” (și când lista e închisă). */
'use client';
import UndoToast from './UndoToast';
import { useShoppingList } from './ShoppingListProvider';

export default function ListUndoHost() {
  const { undoItem, undo, dismissUndo } = useShoppingList();
  if (!undoItem) return null;
  return (
    <div className="slist-toast-host">
      <UndoToast open onUndo={undo} onDismiss={dismissUndo} />
    </div>
  );
}

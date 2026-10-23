/* Bloc produs pe bon. */
'use client';
import {
  formatLei,
  isOfferExpired,
  receiptItemTitle,
  receiptLineDiscount,
  receiptLineTotal,
  receiptQtyUnit,
  type ShoppingListItem,
} from '@/lib/shoppingList';

interface Props {
  item: ShoppingListItem;
  now: Date;
  index: number;
  onOpen: (item: ShoppingListItem) => void;
}

export default function ReceiptLine({ item, now, index, onOpen }: Props) {
  const expired = isOfferExpired(item, now);
  const discount = receiptLineDiscount(item);
  const delay = Math.min(index, 9) * 30;

  return (
    <button
      type="button"
      className={'receipt__line' + (expired ? ' is-expired' : '')}
      style={{ animationDelay: `${delay}ms` }}
      onClick={() => onOpen(item)}
      disabled={expired}
    >
      <span className="receipt__line-title">{receiptItemTitle(item)}</span>
      {expired ? (
        <span className="receipt__line-ended">OFERTĂ ÎNCHEIATĂ</span>
      ) : (
        <>
          <span className="receipt__line-row">
            <span>{receiptQtyUnit(item)}</span>
            <span className="receipt__dots" aria-hidden />
            <span>{receiptLineTotal(item)}</span>
          </span>
          {discount > 0.001 ? (
            <span className="receipt__line-disc">
              REDUCERE -{formatLei(discount)}
            </span>
          ) : null}
        </>
      )}
    </button>
  );
}

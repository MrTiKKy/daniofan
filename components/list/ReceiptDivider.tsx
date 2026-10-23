/* Linie punctată / dublă pe bon. */
'use client';

export default function ReceiptDivider({ double = false }: { double?: boolean }) {
  return (
    <div
      className={'receipt__div' + (double ? ' is-double' : '')}
      aria-hidden
    />
  );
}

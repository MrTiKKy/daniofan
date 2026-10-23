/* Teste shoppingList — npx tsx --test lib/shoppingList.test.ts */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  activeItems,
  buildWhatsAppText,
  clear,
  countQty,
  decrementItem,
  emptyList,
  fmtLei,
  formatLei,
  hasSlot,
  incrementItem,
  isOfferExpired,
  parseList,
  receiptItemTitle,
  receiptQtyPriceLine,
  remove,
  restore,
  savings,
  serializeList,
  setQty,
  toggleItem,
  totalOld,
  totalPromo,
  type ShoppingListDraft,
  type ShoppingListItem,
} from './shoppingList';

function draft(slotId: string, promo = 10, old = 12): ShoppingListDraft {
  return {
    slotId,
    productId: `p-${slotId}`,
    magazineType: 'weekend',
    name: 'Produs',
    brand: 'Brand',
    size: '1L',
    image: 'img/x.webp',
    promoPrice: promo,
    oldPrice: old,
    validUntil: '2026-12-31',
  };
}

function withQty(d: ShoppingListDraft, qty: number, addedAt = 1000): ShoppingListItem {
  return { ...d, qty, addedAt };
}

describe('shoppingList', () => {
  it('toggle adaugă apoi scoate', () => {
    let list = emptyList();
    const a = toggleItem(list, draft('s1'), 1000);
    assert.equal(a.added, true);
    assert.equal(a.list.length, 1);
    assert.equal(a.list[0].qty, 1);
    assert.equal(a.list[0].addedAt, 1000);
    assert.equal(hasSlot(a.list, 's1'), true);

    const b = toggleItem(a.list, draft('s1'), 2000);
    assert.equal(b.added, false);
    assert.equal(b.list.length, 0);
    assert.equal(hasSlot(b.list, 's1'), false);
  });

  it('count și totale pe mai multe iteme', () => {
    let list = emptyList();
    list = toggleItem(list, draft('a', 2.5, 3)).list;
    list = toggleItem(list, draft('b', 4, 5)).list;
    assert.equal(countQty(list), 2);
    assert.equal(totalPromo(list), 6.5);
    assert.equal(totalOld(list), 8);
  });

  it('setQty crește, plafonează la 99 și scoate la 0', () => {
    let list = toggleItem(emptyList(), draft('a', 2, 3), 1).list;
    list = setQty(list, 'a', 2);
    assert.equal(list[0].qty, 2);
    assert.equal(countQty(list), 2);
    assert.equal(totalPromo(list), 4);

    list = setQty(list, 'a', 200);
    assert.equal(list[0].qty, 99);

    list = setQty(list, 'a', 0);
    assert.equal(list.length, 0);
  });

  it('increment / decrement până la scoatere, max 99', () => {
    let list = emptyList();
    let r = incrementItem(list, draft('a', 3.15, 4), 10);
    assert.equal(r.added, true);
    assert.equal(r.qty, 1);
    list = r.list;

    r = incrementItem(list, draft('a', 3.15, 4), 11);
    assert.equal(r.added, false);
    assert.equal(r.qty, 2);
    list = r.list;

    list = setQty(list, 'a', 99);
    r = incrementItem(list, draft('a', 3.15, 4));
    assert.equal(r.qty, 99);
    assert.equal(r.list[0].qty, 99);

    let d = decrementItem(list, 'a');
    assert.equal(d.qty, 98);
    assert.equal(d.removed, null);
    list = setQty(d.list, 'a', 1);
    d = decrementItem(list, 'a');
    assert.equal(d.qty, 0);
    assert.ok(d.removed);
    assert.equal(d.list.length, 0);
  });

  it('linii bon: titlu și „2 x 3,15 … 6,30”', () => {
    const item = withQty({
      ...draft('u', 3.15, 4),
      brand: 'Ursus',
      name: 'Sticlă',
      size: '0.33L',
    }, 2, 1);
    assert.equal(receiptItemTitle(item), 'URSUS 0.33L STICLĂ');
    assert.equal(receiptQtyPriceLine(item), '2 x 3,15 … 6,30');
  });

  it('remove + restore readuc cantitatea', () => {
    const item = withQty(draft('x', 5, 8), 3, 50);
    let list = [item];
    list = remove(list, 'x');
    assert.equal(list.length, 0);
    list = restore(list, item);
    assert.equal(list.length, 1);
    assert.equal(list[0].qty, 3);
    assert.equal(list[0].addedAt, 50);
  });

  it('clear golește lista', () => {
    let list = toggleItem(emptyList(), draft('a')).list;
    list = toggleItem(list, draft('b')).list;
    assert.equal(clear().length, 0);
    assert.equal(countQty(clear()), 0);
  });

  it('ofertele expirate sunt excluse din totaluri', () => {
    const now = new Date(2026, 9, 23); /* 23 oct 2026 */
    const active = withQty({ ...draft('ok', 10, 15), validUntil: '2026-10-23' }, 2, 1);
    const expired = withQty({ ...draft('old', 7, 9), validUntil: '2026-10-22' }, 5, 2);
    const list = [active, expired];
    assert.equal(isOfferExpired(expired, now), true);
    assert.equal(isOfferExpired(active, now), false);
    assert.equal(activeItems(list, now).length, 1);
    assert.equal(countQty(list), 7);
    assert.equal(totalPromo(list, now), 20);
    assert.equal(totalOld(list, now), 30);
    assert.equal(savings(list, now), 10);
  });

  it('fără preț vechi → old = promo, economie 0 pe produs', () => {
    const list = [withQty({ ...draft('n', 6.5, 0), oldPrice: 0 }, 2, 1)];
    assert.equal(totalPromo(list), 13);
    assert.equal(totalOld(list), 13);
    assert.equal(savings(list), 0);
  });

  it('rotunjire la 2 zecimale', () => {
    const list = [
      withQty(draft('a', 1.005, 2.006), 1, 1),
      withQty(draft('b', 1.005, 2.006), 1, 2),
    ];
    assert.equal(totalPromo(list), 2.01);
    assert.equal(totalOld(list), 4.01);
  });

  it('formatLei / fmtLei cu virgulă', () => {
    assert.equal(fmtLei(24.5), '24,50');
    assert.equal(formatLei(0), '0,00');
    assert.equal(formatLei(22.2), '22,20');
  });

  it('text WhatsApp: linii, total, economie, link', () => {
    const now = new Date(2026, 9, 23);
    const list = [
      withQty({
        ...draft('u', 3.15, 4),
        brand: 'Ursus',
        name: 'Bere',
        size: '0.33L',
        validUntil: '2026-12-01',
      }, 2, 200),
      withQty({
        ...draft('exp', 1, 2),
        brand: 'Expirat',
        size: '1L',
        validUntil: '2026-01-01',
      }, 1, 100),
    ];
    const text = buildWhatsAppText(list, 'https://daniofan.example', now);
    assert.match(text, /^Lista mea Daniofan:/);
    assert.match(text, /2 × Ursus 0\.33L · 6,30 lei/);
    assert.doesNotMatch(text, /Expirat/);
    assert.match(text, /Total: 6,30 lei/);
    assert.match(text, /Ai economisit: 1,70 lei/);
    assert.match(text, /https:\/\/daniofan\.example/);
  });

  it('serialize / parse păstrează datele', () => {
    const { list } = toggleItem(emptyList(), draft('x', 9.99, 12.5), 42);
    const again = parseList(serializeList(list));
    assert.equal(again.length, 1);
    assert.equal(again[0].slotId, 'x');
    assert.equal(again[0].promoPrice, 9.99);
    assert.equal(again[0].addedAt, 42);
  });

  it('parse invalid → listă goală', () => {
    assert.deepEqual(parseList(null), []);
    assert.deepEqual(parseList('{'), []);
    assert.deepEqual(parseList('{}'), []);
  });
});

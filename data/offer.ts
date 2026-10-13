/* Oferta implicită (cele 5 beri din pliantul lor).
   Sursa: data/offer.json — modifici JSON-ul și pagina se actualizează.
   Mai târziu, aici se poate citi dintr-o bază de date sau dintr-un export CSV din SAP. */
import type { OfferData } from '@/lib/types';
import offerJson from './offer.json';

export const DEFAULT_OFFER: OfferData = offerJson satisfies OfferData;

/** Asincron intenționat: același contract ca un viitor fetch() către server / DB. */
export async function loadDefaultOffer(): Promise<OfferData> {
  return JSON.parse(JSON.stringify(DEFAULT_OFFER)) as OfferData;
}

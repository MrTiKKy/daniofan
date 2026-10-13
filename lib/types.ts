/* Tipurile datelor pliantului. Aceeași formă ca data/offer.json — ușor de înlocuit
   mai târziu cu o bază de date sau cu un import CSV din SAP. */

export interface StoreInfo {
  name: string;
  address: string;
  /** număr pentru link-ul tel: (ex. +40700000000) */
  phone: string;
  /** cum se afișează numărul în subsol */
  phoneLabel?: string;
  hours: string;
  mapsUrl: string;
  /** adresa publică a pliantului (QR, WhatsApp, imagini Facebook) */
  publicUrl: string;
}

export interface OfferInfo {
  title: string;
  /** "YYYY-MM-DD" */
  start: string;
  /** "YYYY-MM-DD" */
  end: string;
  /** true = oferta rulează mereu în weekendul curent (vineri–duminică), pentru demo */
  autoDates: boolean;
}

export interface Product {
  id: string;
  name: string;
  size: string;
  oldPrice: number;
  newPrice: number;
  category: string;
  hero: boolean;
  sgr: boolean;
  /** cale relativă (img/products/x.png), URL sau data-URI (poză încărcată din panou) */
  image: string;
  /** "YYYY-MM-DD" sau "" */
  validUntil: string;
}

export interface OfferData {
  store: StoreInfo;
  offer: OfferInfo;
  products: Product[];
}

/** Oferta rezolvată (cu date calculate) */
export interface ResolvedOffer {
  title: string;
  start: Date;
  end: Date;
  autoDates: boolean;
}

export type ProductStatus = 'activ' | 'expirat' | 'pret' | 'incomplet';

export type Countdown =
  | { state: 'ended'; main: string; sub: string }
  | { state: 'soon' | 'live' | 'last'; prefix: string; lead: string; detail: string; sub: string };

export interface LocalStats {
  views: Record<string, number>;
  shares: Record<string, number>;
  calls: number;
  directions: number;
  visits: number;
}

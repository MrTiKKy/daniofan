'use client';
/* Vitrină orizontală — ProductCell din pliant, scroll-snap nativ. */
import Link from 'next/link';
import type { FeaturedSlot } from '@/lib/featured';
import { displayImages } from '@/lib/pageItemDisplay';
import * as DF from '@/lib/store';
import ProductCell from '@/components/magazine/ProductCell';

interface Props {
  slots: FeaturedSlot[];
}

function saveHomeScroll() {
  try {
    sessionStorage.setItem('daniofan.home.scroll', String(window.scrollY));
  } catch { /* */ }
}

export default function FeaturedCarousel({ slots }: Props) {
  if (!slots.length) return null;

  return (
    <section className="feat" aria-label="Cele mai bune oferte">
      <div className="feat__band">
        <h2 className="feat__title">Cele mai bune oferte</h2>
      </div>
      <div className="feat__scroller" tabIndex={0}>
        {slots.map((slot, i) => {
          const href = `/revista/${slot.kind}?pagina=${slot.page}&produs=${encodeURIComponent(slot.slotId)}`;
          const imgs = displayImages(slot.item, slot.product).map((src) => DF.imageSrc(src));
          return (
            <article key={slot.slotId} className="feat__card">
              <Link
                href={href}
                className="feat__link"
                aria-label={`${slot.product.brand || ''} ${slot.product.name} — deschide în revistă`}
                onClick={saveHomeScroll}
              >
                <div className="feat__cell-wrap">
                  {/* Același ProductCell; layout-ul de card e doar CSS (.feat) — fără gesturi din revistă */}
                  <ProductCell
                    p={slot.product}
                    variant="std"
                    interactive={false}
                    eager={i < 2}
                    images={imgs}
                  />
                </div>
                <p className="feat__from">Din: {slot.magazineLabel}</p>
              </Link>
            </article>
          );
        })}
      </div>
    </section>
  );
}

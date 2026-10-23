/* Pastilă „Pagina N din M” / „Final” — deschide cuprinsul. */
'use client';

interface Props {
  page: number;
  pageCount: number;
  isEnd?: boolean;
  onClick: () => void;
}

function GridIcon() {
  return (
    <svg className="pages-btn__icon" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <rect x="1" y="1" width="6" height="6" rx="1.2" fill="currentColor" />
      <rect x="9" y="1" width="6" height="6" rx="1.2" fill="currentColor" />
      <rect x="1" y="9" width="6" height="6" rx="1.2" fill="currentColor" />
      <rect x="9" y="9" width="6" height="6" rx="1.2" fill="currentColor" />
    </svg>
  );
}

export default function PagesButton({ page, pageCount, isEnd, onClick }: Props) {
  if (pageCount <= 0) {
    return <span className="pages-btn pages-btn--empty" aria-hidden="true">—</span>;
  }
  return (
    <button
      type="button"
      className="pages-btn"
      aria-label="Toate paginile"
      onClick={onClick}
    >
      <GridIcon />
      <span className="pages-btn__text">
        {isEnd ? 'Final' : `Pagina ${page} din ${pageCount}`}
      </span>
    </button>
  );
}

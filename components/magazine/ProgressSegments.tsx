/* Segmente tip Stories — câte unul pe pagină; tap → salt. */
'use client';

interface Props {
  pageCount: number;
  /** 1-based */
  currentPage: number;
  onSelect: (page1: number) => void;
}

export default function ProgressSegments({ pageCount, currentPage, onSelect }: Props) {
  if (pageCount <= 0) return null;
  return (
    <div
      className="vtb__progress"
      role="progressbar"
      aria-label="Progres pagini"
      aria-valuemin={1}
      aria-valuemax={pageCount}
      aria-valuenow={currentPage}
      aria-valuetext={`Pagina ${currentPage} din ${pageCount}`}
    >
      {Array.from({ length: pageCount }, (_, i) => {
        const page1 = i + 1;
        const done = page1 <= currentPage;
        return (
          <button
            key={page1}
            type="button"
            className={'vtb__seg' + (done ? ' is-on' : '')}
            aria-label={`Mergi la pagina ${page1}`}
            aria-current={page1 === currentPage ? 'true' : undefined}
            onClick={() => onSelect(page1)}
          />
        );
      })}
    </div>
  );
}

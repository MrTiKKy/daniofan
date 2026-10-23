/* Bară sticky viewer: înapoi, titlu, perioadă, cuprins, progres. */
'use client';
import Link from 'next/link';
import PagesButton from './PagesButton';
import ProgressSegments from './ProgressSegments';

interface Props {
  title: string;
  period: string;
  page: number;
  pageCount: number;
  isEnd?: boolean;
  onGoToPage: (page1: number) => void;
  onOpenPages: () => void;
}

export default function ViewerTopBar({
  title, period, page, pageCount, isEnd, onGoToPage, onOpenPages,
}: Props) {
  return (
    <header className="vtb" data-viewer-chrome>
      <div className="vtb__row">
        <Link
          href="/"
          className="vtb__back"
          aria-label="Înapoi la toate revistele"
        >
          ← Reviste
        </Link>
        <div className="vtb__mid">
          <p className="vtb__title">{title}</p>
          {period ? <p className="vtb__period">{period}</p> : null}
        </div>
        <PagesButton
          page={page}
          pageCount={pageCount}
          isEnd={isEnd}
          onClick={onOpenPages}
        />
      </div>
      <ProgressSegments
        pageCount={pageCount}
        currentPage={isEnd ? pageCount : page}
        onSelect={onGoToPage}
      />
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {isEnd
          ? 'Ai ajuns la finalul revistei'
          : pageCount > 0
            ? `Pagina ${page} din ${pageCount}`
            : ''}
      </span>
    </header>
  );
}

'use client';
/* Panou de jos reutilizabil — animație, backdrop, swipe, history Înapoi. */
import { useCallback, useEffect, useId, useRef } from 'react';

interface Props {
  open: boolean;
  title: string;
  /** Subtitlu sub titlu (ex. „3 produse”) */
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  /** Zonă fixă sub scroll (ex. sumar listă) */
  footer?: React.ReactNode;
  /** Clasă pe panou (ex. înălțime 90dvh) */
  panelClassName?: string;
}

export default function BottomSheet({
  open, title, subtitle, onClose, children, footer, panelClassName,
}: Props) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ y0: number; dy: number } | null>(null);
  const pushedRef = useRef(false);

  const close = useCallback(() => {
    if (pushedRef.current) {
      pushedRef.current = false;
      history.back();
      return;
    }
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    history.pushState({ daniofanSheet: titleId }, '');
    pushedRef.current = true;
    const onPop = () => {
      pushedRef.current = false;
      onClose();
    };
    window.addEventListener('popstate', onPop);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const t = window.setTimeout(() => {
      const root = panelRef.current;
      const focusable = root?.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      focusable?.focus();
    }, 50);
    return () => {
      window.removeEventListener('popstate', onPop);
      document.body.style.overflow = prev;
      window.clearTimeout(t);
      /* Dacă panoul se demontează fără Înapoi (ex. alt sheet), curățăm history. */
      if (pushedRef.current) {
        pushedRef.current = false;
        history.back();
      }
    };
  }, [open, onClose, titleId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
        return;
      }
      if (e.key !== 'Tab' || !panelRef.current) return;
      const nodes = panelRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (!nodes.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);

  if (!open) return null;

  return (
    <div className="bsheet" role="presentation">
      <button
        type="button"
        className="bsheet__scrim"
        aria-label="Închide"
        onClick={close}
      />
      <div
        ref={panelRef}
        className={'bsheet__panel' + (panelClassName ? ` ${panelClassName}` : '')}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        style={dragRef.current ? { transform: `translateY(${Math.max(0, dragRef.current.dy)}px)` } : undefined}
        onPointerDown={(e) => {
          const t = e.target as HTMLElement;
          if (!t.closest('.bsheet__grab') && !t.closest('.bsheet__head')) return;
          dragRef.current = { y0: e.clientY, dy: 0 };
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!dragRef.current) return;
          dragRef.current.dy = e.clientY - dragRef.current.y0;
          e.currentTarget.style.transform = `translateY(${Math.max(0, dragRef.current.dy)}px)`;
        }}
        onPointerUp={(e) => {
          if (!dragRef.current) return;
          const dy = dragRef.current.dy;
          dragRef.current = null;
          e.currentTarget.style.transform = '';
          if (dy > 80) close();
        }}
        onPointerCancel={(e) => {
          dragRef.current = null;
          e.currentTarget.style.transform = '';
        }}
      >
        <div className="bsheet__grab" aria-hidden />
        <div className="bsheet__head">
          <div className="bsheet__head-text">
            <h2 id={titleId} className="bsheet__title">{title}</h2>
            {subtitle ? <p className="bsheet__subtitle">{subtitle}</p> : null}
          </div>
          <button type="button" className="bsheet__x" aria-label="Închide" onClick={close}>✕</button>
        </div>
        <div className={'bsheet__body' + (footer ? ' bsheet__body--with-footer' : '')}>
          {children}
        </div>
        {footer ? <div className="bsheet__footer">{footer}</div> : null}
      </div>
    </div>
  );
}

'use client';
/* SVG pentru o formă de pe foaie (viewBox 0 0 100 100). */
import type { PageShapeKind } from '@/lib/catalogTypes';

interface Props {
  shape: PageShapeKind;
  fill: string;
}

export default function PageShapeSvg({ shape, fill }: Props) {
  const common = { fill, stroke: 'none' as const };
  switch (shape) {
    case 'rect':
      return <rect x="4" y="12" width="92" height="76" {...common} />;
    case 'roundRect':
      return <rect x="4" y="12" width="92" height="76" rx="14" ry="14" {...common} />;
    case 'ellipse':
      return <ellipse cx="50" cy="50" rx="46" ry="36" {...common} />;
    case 'triangle':
      return <polygon points="50,8 94,90 6,90" {...common} />;
    case 'diamond':
      return <polygon points="50,6 94,50 50,94 6,50" {...common} />;
    case 'line':
      return <rect x="4" y="42" width="92" height="16" rx="4" {...common} />;
    case 'arrow':
      return <polygon points="4,35 62,35 62,18 96,50 62,82 62,65 4,65" {...common} />;
    case 'star':
      return (
        <polygon
          points="50,6 61,38 95,38 67,58 78,90 50,70 22,90 33,58 5,38 39,38"
          {...common}
        />
      );
    case 'hexagon':
      return <polygon points="50,6 90,28 90,72 50,94 10,72 10,28" {...common} />;
    case 'pentagon':
      return <polygon points="50,6 95,40 77,94 23,94 5,40" {...common} />;
    case 'octagon':
      return <polygon points="30,6 70,6 94,30 94,70 70,94 30,94 6,70 6,30" {...common} />;
    case 'burst':
      return (
        <polygon
          points="50,4 58,28 84,16 72,40 96,50 72,60 84,84 58,72 50,96 42,72 16,84 28,60 4,50 28,40 16,16 42,28"
          {...common}
        />
      );
    case 'heart':
      return (
        <path
          d="M50 88 C20 62 8 42 8 28 C8 16 18 8 30 8 C38 8 45 12 50 20 C55 12 62 8 70 8 C82 8 92 16 92 28 C92 42 80 62 50 88 Z"
          {...common}
        />
      );
    case 'cross':
      return <polygon points="38,8 62,8 62,38 92,38 92,62 62,62 62,92 38,92 38,62 8,62 8,38 38,38" {...common} />;
    case 'plus':
      return <polygon points="40,12 60,12 60,40 88,40 88,60 60,60 60,88 40,88 40,60 12,60 12,40 40,40" {...common} />;
    case 'chevron':
      return <polygon points="8,20 50,50 8,80 22,80 50,58 78,80 92,80 50,50 92,20 78,20 50,42 22,20" {...common} />;
    case 'parallelogram':
      return <polygon points="22,14 94,14 78,86 6,86" {...common} />;
    case 'trapezoid':
      return <polygon points="22,14 78,14 94,86 6,86" {...common} />;
    case 'semicircle':
      return <path d="M8 72 A42 42 0 0 1 92 72 L92 86 L8 86 Z" {...common} />;
    case 'ring':
      return (
        <path
          d="M50 8 A42 42 0 1 1 49.9 8 Z M50 28 A22 22 0 1 0 50.1 28 Z"
          fillRule="evenodd"
          {...common}
        />
      );
    case 'badge':
      return <polygon points="50,4 62,28 90,28 68,48 76,76 50,60 24,76 32,48 10,28 38,28" {...common} />;
    case 'ribbon':
      return <polygon points="12,20 88,20 88,72 50,56 12,72" {...common} />;
    case 'cloud':
      return (
        <path
          d="M28 72 H74 C86 72 92 62 92 52 C92 40 84 32 72 32 C70 20 60 12 48 12 C34 12 24 22 22 34 C12 36 8 44 8 52 C8 62 16 72 28 72 Z"
          {...common}
        />
      );
    case 'speech':
      return (
        <path
          d="M14 14 H86 A8 8 0 0 1 94 22 V58 A8 8 0 0 1 86 66 H42 L24 88 V66 H14 A8 8 0 0 1 6 58 V22 A8 8 0 0 1 14 14 Z"
          {...common}
        />
      );
    default:
      return <rect x="4" y="12" width="92" height="76" {...common} />;
  }
}

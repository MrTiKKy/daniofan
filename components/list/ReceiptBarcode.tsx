/* Cod de bare decorativ — din hash pe datele listei. */
'use client';
import { useMemo } from 'react';

function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export default function ReceiptBarcode({ seed }: { seed: string }) {
  const bars = useMemo(() => {
    let s = hashSeed(seed || 'daniofan');
    const out: number[] = [];
    for (let i = 0; i < 42; i++) {
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
      out.push(1 + (s % 4));
    }
    return out;
  }, [seed]);

  const code = useMemo(() => {
    const n = hashSeed(seed || 'daniofan') % 100000000;
    return String(n).padStart(8, '0');
  }, [seed]);

  let x = 0;
  const parts = bars.map((w, i) => {
    const el = (
      <rect
        key={i}
        x={x}
        y={0}
        width={w}
        height={36}
        fill={i % 2 === 0 ? '#222' : 'transparent'}
      />
    );
    x += w + 1;
    return el;
  });

  return (
    <div className="receipt__barcode">
      <svg
        viewBox={`0 0 ${x} 36`}
        width="100%"
        height="36"
        aria-hidden
        preserveAspectRatio="none"
      >
        {parts}
      </svg>
      <p className="receipt__barcode-num">{code}</p>
    </div>
  );
}

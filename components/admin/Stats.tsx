/* Secțiunea 5: statistici (cifre DEMO + click-urile reale din acest browser). Port din renderStats() — js/admin.js. */
import type { LocalStats, Product } from '@/lib/types';

/** Cifre simulate pentru prezentare */
export const DEMO_STATS = {
  views: { 'ciucas-05-pet': 412, 'timisoreana-25-pet': 305, 'timisoreana-05-doza': 268, 'heineken-033-sticla': 231, 'ursus-033-sticla': 190 } as Record<string, number>,
  shares: { 'ciucas-05-pet': 31, 'timisoreana-25-pet': 18, 'timisoreana-05-doza': 12, 'heineken-033-sticla': 9, 'ursus-033-sticla': 7, _pliant: 54 } as Record<string, number>,
  visits: 1284, calls: 23, directions: 41,
};

const fmt = (n: number) => n.toLocaleString('ro-RO');
const sum = (o: Record<string, number>) => Object.values(o).reduce((a, b) => a + b, 0);

function Kpi({ val, label, loc }: { val: number; label: string; loc: number }) {
  return <div className="kpi"><b>{fmt(val)}</b><span>{label}</span>{loc ? <><br /><em>{`+${loc} reale, din acest browser`}</em></> : null}</div>;
}
function Bar({ label, n, max, cls }: { label: string; n: number; max: number; cls: string }) {
  return <div className="bar-row"><span>{label}</span><div className="track"><div className={'fill ' + cls} style={{ width: `${Math.max(2, n / max * 100)}%` }}></div></div><span className="n">{fmt(n)}</span></div>;
}

export default function Stats({ s, products }: { s: LocalStats; products: Product[] }) {
  const B = DEMO_STATS;
  const localShares = sum(s.shares);
  const rows = products.map((p) => ({ p, v: (B.views[p.id] || 0) + (s.views[p.id] || 0), sh: (B.shares[p.id] || 0) + (s.shares[p.id] || 0) })).sort((a, b) => b.v - a.v);
  const maxV = Math.max(1, ...rows.map((r) => r.v)), maxS = Math.max(1, ...rows.map((r) => r.sh));
  return (
    <>
      <div className="kpis">
        <Kpi val={B.visits + (s.visits || 0)} label="deschideri ale pliantului" loc={s.visits} />
        <Kpi val={sum(B.shares) + localShares} label="trimiteri pe WhatsApp" loc={localShares} />
        <Kpi val={B.calls + (s.calls || 0)} label={'apăsări pe „Sună la magazin"'} loc={s.calls} />
        <Kpi val={B.directions + (s.directions || 0)} label={'apăsări pe „Cum ajung"'} loc={s.directions} />
      </div>
      <div className="bars"><h3>Cele mai văzute produse</h3>{rows.map((r, i) => <Bar key={i} label={`${r.p.name} ${r.p.size}`} n={r.v} max={maxV} cls="" />)}</div>
      <div className="bars"><h3>Cele mai trimise pe WhatsApp</h3>{rows.slice().sort((a, b) => b.sh - a.sh).map((r, i) => <Bar key={i} label={`${r.p.name} ${r.p.size}`} n={r.sh} max={maxS} cls="wa" />)}</div>
    </>
  );
}

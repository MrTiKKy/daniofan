/* Animație „zboară în listă” — portal + Web Animations API. */
'use client';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

export type FlyRequest = {
  from: DOMRect;
  src: string;
  /** Dimensiune particulă (default 64). */
  size?: number;
};

interface FlyApi {
  fly: (req: FlyRequest) => void;
  /** Incrementează la aterizare — ListFab ascultă pentru bump */
  bumpToken: number;
  fabAnchorRef: React.RefObject<HTMLElement | null>;
}

const FlyCtx = createContext<FlyApi | null>(null);

type Particle = {
  id: number;
  left: number;
  top: number;
  src: string;
  tx: number;
  ty: number;
  size: number;
};

let flyId = 0;

export function FlyToListProvider({ children }: { children: React.ReactNode }) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [bumpToken, setBumpToken] = useState(0);
  const [mounted, setMounted] = useState(false);
  const fabAnchorRef = useRef<HTMLElement | null>(null);
  const reducedRef = useRef(false);

  useEffect(() => {
    setMounted(true);
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    reducedRef.current = mq.matches;
    const onRm = () => { reducedRef.current = mq.matches; };
    mq.addEventListener('change', onRm);
    return () => mq.removeEventListener('change', onRm);
  }, []);

  const fly = useCallback((req: FlyRequest) => {
    if (reducedRef.current) {
      setBumpToken((n) => n + 1);
      return;
    }

    const size = req.size && req.size > 0 ? req.size : 64;
    const half = size / 2;
    const fab = fabAnchorRef.current;
    const to = fab?.getBoundingClientRect();
    const targetX = to
      ? to.left + to.width / 2 - half
      : window.innerWidth / 2 - half;
    const targetY = to
      ? to.top + to.height / 2 - half
      : window.innerHeight - 120;

    const id = ++flyId;
    const startX = req.from.left + req.from.width / 2 - half;
    const startY = req.from.top + req.from.height / 2 - half;
    const tx = targetX - startX;
    const ty = targetY - startY;

    setParticles((prev) => [
      ...prev,
      { id, left: startX, top: startY, src: req.src, tx, ty, size },
    ]);
  }, []);

  const onParticleDone = useCallback((id: number) => {
    setParticles((prev) => prev.filter((p) => p.id !== id));
    setBumpToken((n) => n + 1);
  }, []);

  const api: FlyApi = {
    fly,
    bumpToken,
    fabAnchorRef,
  };

  return (
    <FlyCtx.Provider value={api}>
      {children}
      {mounted
        ? createPortal(
            <div className="fly-layer" aria-hidden="true">
              {particles.map((p) => (
                <FlyParticle key={p.id} particle={p} onDone={onParticleDone} />
              ))}
            </div>,
            document.body,
          )
        : null}
    </FlyCtx.Provider>
  );
}

function FlyParticle({
  particle,
  onDone,
}: {
  particle: Particle;
  onDone: (id: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const { tx, ty } = particle;
    /* Arc: control point deasupra liniei drepte */
    const midX = tx * 0.5;
    const midY = ty * 0.5 - Math.min(120, Math.abs(ty) * 0.35 + 40);

    const anim = el.animate(
      [
        {
          transform: 'translate(0px, 0px) scale(1)',
          opacity: 1,
          offset: 0,
        },
        {
          transform: `translate(${midX}px, ${midY}px) scale(0.7)`,
          opacity: 1,
          offset: 0.45,
        },
        {
          transform: `translate(${tx}px, ${ty}px) scale(0.3)`,
          opacity: 1,
          offset: 0.8,
        },
        {
          transform: `translate(${tx}px, ${ty}px) scale(0.25)`,
          opacity: 0,
          offset: 1,
        },
      ],
      {
        duration: 650,
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
        fill: 'forwards',
      },
    );
    anim.onfinish = () => onDone(particle.id);
    return () => anim.cancel();
  }, [particle, onDone]);

  return (
    <div
      ref={ref}
      className="fly-particle"
      style={{
        left: particle.left,
        top: particle.top,
        width: particle.size,
        height: particle.size,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={particle.src}
        alt=""
        width={particle.size}
        height={particle.size}
        draggable={false}
      />
    </div>
  );
}

export function useFlyToList(): FlyApi {
  const ctx = useContext(FlyCtx);
  if (!ctx) {
    return {
      fly: () => {},
      bumpToken: 0,
      fabAnchorRef: { current: null },
    };
  }
  return ctx;
}

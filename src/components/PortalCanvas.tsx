import { useEffect, useRef } from 'react';

type PortalMode = 'loader' | 'hero' | 'burst';

const TAU = Math.PI * 2;

// Paleta oficial da campanha de 1 ano (campaign-source/extracted/svg-embedded/color-palette.txt).
const BLUE = 'rgba(34, 61, 124';
const BLUE_LIVE = 'rgba(96, 132, 216';
const PAPER = 'rgba(224, 218, 212';
const SEPIA = 'rgba(205, 194, 183';
const WHITE = 'rgba(255, 255, 255';

type Particle = {
  angle: number;
  radius: number;
  speed: number;
  size: number;
  twinkle: number;
  phase: number;
  warm: boolean;
  drift: number;
};

const MODE_TUNING: Record<PortalMode, { particles: number; speed: number; core: number; dither: number }> = {
  loader: { particles: 118, speed: 1, core: 1, dither: 64 },
  hero: { particles: 132, speed: .8, core: .88, dither: 76 },
  burst: { particles: 96, speed: 1.7, core: 1.25, dither: 48 }
};

function hash(n: number) {
  const s = Math.sin(n) * 43758.5453123;
  return s - Math.floor(s);
}

function makeParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    angle: hash(i * 12.9898) * TAU,
    radius: .84 + hash(i * 39.4253) * .3,
    speed: .55 + hash(i * 7.1317) * .9,
    size: .8 + hash(i * 23.117) * 2.1,
    twinkle: .9 + hash(i * 3.71) * 2.4,
    phase: hash(i * 51.7) * TAU,
    warm: hash(i * 17.23) > .55,
    drift: hash(i * 91.3) * .05
  }));
}

export default function PortalCanvas({ mode = 'loader', className = '' }: { mode?: PortalMode; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const tuning = MODE_TUNING[mode];
    const particles = makeParticles(tuning.particles);
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    let frame = 0;
    let running = true;
    let visible = true;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
    };

    const draw = (t: number) => {
      const w = canvas.width;
      const h = canvas.height;
      if (!w || !h) return;
      ctx.clearRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h / 2;
      const base = Math.min(w, h) / 2;
      const time = t * tuning.speed;
      // Pulsação lenta composta: nunca brusca, nunca perfeitamente cíclica.
      const pulse = 1 + .04 * Math.sin(time * .0011) + .018 * Math.sin(time * .0027 + 1.7);
      const breath = .5 + .5 * Math.sin(time * .0013 + .6);
      const R = base * .58 * pulse;
      const rot = time * .00012; // rotação horária lenta

      // Luz volumétrica ambiente.
      const halo = ctx.createRadialGradient(cx, cy, R * .3, cx, cy, base * 1.02);
      halo.addColorStop(0, `${BLUE}, ${.28 + breath * .1})`);
      halo.addColorStop(.55, `${BLUE}, .12)`);
      halo.addColorStop(1, `${BLUE}, 0)`);
      ctx.fillStyle = halo;
      ctx.fillRect(0, 0, w, h);

      ctx.globalCompositeOperation = 'lighter';

      // Núcleo luminoso pulsando.
      const coreR = R * .62 * tuning.core * (1 + .05 * Math.sin(time * .0019));
      const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR);
      core.addColorStop(0, `${WHITE}, ${.62 + breath * .22})`);
      core.addColorStop(.32, `${PAPER}, ${.3 + breath * .12})`);
      core.addColorStop(.68, `${BLUE_LIVE}, .16)`);
      core.addColorStop(1, `${BLUE}, 0)`);
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.arc(cx, cy, coreR, 0, TAU);
      ctx.fill();

      // Anel principal em três passagens (energia difusa -> borda viva).
      const ringPasses: Array<[number, string, number]> = [
        [R * .16, `${BLUE_LIVE}, ${.2 + breath * .08})`, R * .05],
        [R * .05, `${SEPIA}, ${.34 + breath * .12})`, R * .02],
        [R * .016, `${WHITE}, ${.5 + breath * .3})`, R * .012]
      ];
      ringPasses.forEach(([width, stroke, blur]) => {
        ctx.beginPath();
        ctx.arc(cx, cy, R, 0, TAU);
        ctx.strokeStyle = stroke;
        ctx.lineWidth = width;
        ctx.shadowBlur = blur;
        ctx.shadowColor = `${BLUE_LIVE}, .8)`;
        ctx.stroke();
      });
      ctx.shadowBlur = 0;

      // Hotspots prismáticos girando em sentido horário na borda.
      [0, 2.6].forEach((offset, i) => {
        const start = rot + offset;
        ctx.beginPath();
        ctx.arc(cx, cy, R, start, start + 1.15 - i * .25);
        ctx.strokeStyle = `${WHITE}, ${.34 + breath * .3})`;
        ctx.lineWidth = R * .028;
        ctx.lineCap = 'round';
        ctx.shadowBlur = R * .08;
        ctx.shadowColor = `${WHITE}, .9)`;
        ctx.stroke();
      });
      ctx.shadowBlur = 0;

      // Partículas orbitando com jitter orgânico.
      particles.forEach((p) => {
        const a = p.angle + rot * p.speed * 6;
        const wob = Math.sin(time * .001 * p.twinkle + p.phase);
        const r = R * (p.radius + wob * .035 + p.drift * Math.sin(time * .0004 + p.phase));
        const x = cx + Math.cos(a) * r;
        const y = cy + Math.sin(a) * r;
        const alpha = Math.max(0, .12 + .5 * Math.sin(time * .0016 * p.twinkle + p.phase));
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.warm ? `${SEPIA}, .9)` : `${WHITE}, .85)`;
        ctx.beginPath();
        ctx.arc(x, y, p.size * dpr * .72, 0, TAU);
        ctx.fill();
      });

      // Dither prism: poeira quantizada cintilando na banda do anel.
      const step = Math.floor(time / 170);
      const px = Math.max(1, Math.round(dpr));
      for (let i = 0; i < tuning.dither; i++) {
        const h1 = hash(i * 12.9898 + step * 78.233);
        const h2 = hash(i * 39.4253 + step * 11.135);
        const h3 = hash(i * 7.13 + step * 3.7);
        const ang = h1 * TAU;
        const rr = R * (.6 + h2 * .75);
        ctx.globalAlpha = .05 + h3 * .12;
        ctx.fillStyle = h3 > .5 ? `${PAPER}, 1)` : `${WHITE}, 1)`;
        ctx.fillRect(cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr, px, px);
      }

      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    };

    const loop = (t: number) => {
      if (!running) return;
      if (visible && !document.hidden) draw(t);
      frame = window.requestAnimationFrame(loop);
    };

    resize();
    const resizeObserver = new ResizeObserver(() => {
      resize();
      if (reducedMotion) draw(2400);
    });
    resizeObserver.observe(canvas);

    if (reducedMotion) {
      draw(2400);
    } else {
      frame = window.requestAnimationFrame(loop);
    }

    let intersectionObserver: IntersectionObserver | undefined;
    if ('IntersectionObserver' in window) {
      intersectionObserver = new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
      }, { rootMargin: '120px 0px' });
      intersectionObserver.observe(canvas);
    }

    return () => {
      running = false;
      window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      intersectionObserver?.disconnect();
    };
  }, [mode]);

  return <canvas ref={canvasRef} className={`portal-canvas ${className}`} aria-hidden="true" />;
}

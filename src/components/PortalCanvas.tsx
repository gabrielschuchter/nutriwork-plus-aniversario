import { useEffect, useRef } from 'react';

type PortalMode = 'loader' | 'hero' | 'burst';

const TAU = Math.PI * 2;

// Paleta oficial da campanha de 1 ano (campaign-source/extracted/svg-embedded/color-palette.txt).
const BLUE = 'rgba(34, 61, 124';
const BLUE_LIVE = 'rgba(96, 132, 216';
const PAPER = 'rgba(224, 218, 212';
const SEPIA = 'rgba(205, 194, 183';
const WHITE = 'rgba(255, 255, 255';

type Debris = {
  angle: number;
  jitter: number;
  speed: number;
  size: number;
  twinkle: number;
  phase: number;
  warm: boolean;
};

const MODE_TUNING: Record<PortalMode, { debris: number; speed: number; core: number; dither: number }> = {
  loader: { debris: 150, speed: 1, core: 1, dither: 56 },
  hero: { debris: 160, speed: .8, core: .92, dither: 68 },
  burst: { debris: 120, speed: 1.7, core: 1.3, dither: 44 }
};

// Assinatura orgânica de cada fio do anel: raio modulado por harmônicos
// (referência: anéis de energia com fios sobrepostos e bordas vivas do Drive).
const STRANDS = [
  { radius: 1, drift: 1, a1: .02, a2: .013, a3: .008, phase: 0, width: .05, alphaMul: 1 },
  { radius: .965, drift: 1.6, a1: .028, a2: .01, a3: .011, phase: 2.1, width: .034, alphaMul: .8 },
  { radius: 1.04, drift: .7, a1: .016, a2: .017, a3: .006, phase: 4.4, width: .026, alphaMul: .65 }
];

function hash(n: number) {
  const s = Math.sin(n) * 43758.5453123;
  return s - Math.floor(s);
}

function makeDebris(count: number): Debris[] {
  return Array.from({ length: count }, (_, i) => ({
    angle: hash(i * 12.9898) * TAU,
    jitter: (hash(i * 39.4253) - .5) * .16,
    speed: .4 + hash(i * 7.1317) * 1.1,
    size: .7 + Math.pow(hash(i * 23.117), 2.4) * 2.6,
    twinkle: .8 + hash(i * 3.71) * 2.6,
    phase: hash(i * 51.7) * TAU,
    warm: hash(i * 17.23) > .5
  }));
}

export default function PortalCanvas({ mode = 'loader', className = '' }: { mode?: PortalMode; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const tuning = MODE_TUNING[mode];
    const debris = makeDebris(tuning.debris);
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

    const strandRadius = (theta: number, time: number, s: typeof STRANDS[number], R: number) =>
      R * s.radius * (
        1 +
        s.a1 * Math.sin(3 * theta + s.phase + time * .00016 * s.drift) +
        s.a2 * Math.sin(7 * theta - time * .00024 * s.drift + s.phase * 1.7) +
        s.a3 * Math.sin(13 * theta + s.phase * 2.3 + time * .00035)
      );

    const traceStrand = (cx: number, cy: number, time: number, rot: number, s: typeof STRANDS[number], R: number) => {
      ctx.beginPath();
      const steps = 110;
      for (let i = 0; i <= steps; i++) {
        const theta = (i / steps) * TAU;
        const r = strandRadius(theta + rot * s.drift, time, s, R);
        const x = cx + Math.cos(theta) * r;
        const y = cy + Math.sin(theta) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
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
      const pulse = 1 + .038 * Math.sin(time * .0011) + .016 * Math.sin(time * .0027 + 1.7);
      const breath = .5 + .5 * Math.sin(time * .0013 + .6);
      const R = base * .56 * pulse;
      const rot = time * .00012; // rotação horária lenta

      // Luz volumétrica ambiente + leve facho vertical.
      const halo = ctx.createRadialGradient(cx, cy, R * .25, cx, cy, base * 1.02);
      halo.addColorStop(0, `${BLUE}, ${.3 + breath * .1})`);
      halo.addColorStop(.55, `${BLUE}, .13)`);
      halo.addColorStop(1, `${BLUE}, 0)`);
      ctx.fillStyle = halo;
      ctx.fillRect(0, 0, w, h);
      const shaft = ctx.createLinearGradient(cx, 0, cx, h);
      shaft.addColorStop(0, `${PAPER}, 0)`);
      shaft.addColorStop(.5, `${PAPER}, ${.03 + breath * .025})`);
      shaft.addColorStop(1, `${PAPER}, 0)`);
      ctx.fillStyle = shaft;
      ctx.fillRect(cx - R * .9, 0, R * 1.8, h);

      ctx.globalCompositeOperation = 'lighter';

      // Centro extremamente luminoso, com respiração viva.
      const coreR = R * .78 * tuning.core * (1 + .05 * Math.sin(time * .0019));
      const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR);
      core.addColorStop(0, `${WHITE}, ${.94 + breath * .06})`);
      core.addColorStop(.18, `${WHITE}, ${.66 + breath * .16})`);
      core.addColorStop(.42, `${PAPER}, ${.3 + breath * .1})`);
      core.addColorStop(.72, `${BLUE_LIVE}, .15)`);
      core.addColorStop(1, `${BLUE}, 0)`);
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.arc(cx, cy, coreR, 0, TAU);
      ctx.fill();

      // Luz interna viva: correntes tênues girando dentro do núcleo.
      [0, 1].forEach((i) => {
        const swirlR = R * (.34 + i * .16 + .03 * Math.sin(time * .0016 + i));
        const start = -rot * (2.4 + i * 1.3) + i * 2.6;
        ctx.beginPath();
        ctx.arc(cx, cy, swirlR, start, start + 2.2);
        ctx.strokeStyle = `${PAPER}, ${.045 + breath * .05})`;
        ctx.lineWidth = R * .085;
        ctx.stroke();
      });

      // Fios orgânicos do anel: três passagens por fio (energia -> borda viva).
      STRANDS.forEach((s) => {
        traceStrand(cx, cy, time, rot, s, R);
        ctx.strokeStyle = `${BLUE_LIVE}, ${(.16 + breath * .08) * s.alphaMul})`;
        ctx.lineWidth = R * s.width * 3.2;
        ctx.stroke();

        traceStrand(cx, cy, time, rot, s, R);
        ctx.strokeStyle = `${SEPIA}, ${(.3 + breath * .12) * s.alphaMul})`;
        ctx.lineWidth = R * s.width * 1.15;
        ctx.shadowBlur = R * .04;
        ctx.shadowColor = `${BLUE_LIVE}, .8)`;
        ctx.stroke();

        traceStrand(cx, cy, time, rot, s, R);
        ctx.strokeStyle = `${WHITE}, ${(.42 + breath * .3) * s.alphaMul})`;
        ctx.lineWidth = R * s.width * .38;
        ctx.shadowBlur = R * .015;
        ctx.stroke();
        ctx.shadowBlur = 0;
      });

      // Glints estrelados percorrendo a borda em sentido horário.
      [0, 2.2, 4.5].forEach((offset, i) => {
        const a = rot * (1 + i * .12) + offset;
        const s = STRANDS[i % STRANDS.length];
        const r = strandRadius(a + rot * s.drift, time, s, R);
        const gx = cx + Math.cos(a) * r;
        const gy = cy + Math.sin(a) * r;
        const glow = .4 + .6 * Math.abs(Math.sin(time * .0011 + i * 1.9));
        const len = R * (.1 + glow * .12);

        const spot = ctx.createRadialGradient(gx, gy, 0, gx, gy, len);
        spot.addColorStop(0, `${WHITE}, ${.85 * glow})`);
        spot.addColorStop(.4, `${PAPER}, ${.3 * glow})`);
        spot.addColorStop(1, `${WHITE}, 0)`);
        ctx.fillStyle = spot;
        ctx.beginPath();
        ctx.arc(gx, gy, len, 0, TAU);
        ctx.fill();

        ctx.strokeStyle = `${WHITE}, ${.55 * glow})`;
        ctx.lineWidth = Math.max(1, R * .006);
        ctx.beginPath();
        ctx.moveTo(gx - len * 1.5, gy); ctx.lineTo(gx + len * 1.5, gy);
        ctx.moveTo(gx, gy - len * 1.5); ctx.lineTo(gx, gy + len * 1.5);
        ctx.stroke();
      });

      // Detritos e fagulhas agarrados à borda (aparência física).
      debris.forEach((p) => {
        const a = p.angle + rot * p.speed * 5;
        const wob = Math.sin(time * .001 * p.twinkle + p.phase);
        const r = R * (1 + p.jitter + wob * .02);
        const x = cx + Math.cos(a) * r;
        const y = cy + Math.sin(a) * r;
        const alpha = Math.max(0, .1 + .5 * Math.sin(time * .0016 * p.twinkle + p.phase));
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.warm ? `${SEPIA}, .92)` : `${WHITE}, .88)`;
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
        const rr = R * (.62 + h2 * .72);
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

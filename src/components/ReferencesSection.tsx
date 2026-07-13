import { useCallback, useEffect, useRef } from 'react';
import { usePerformanceMode } from '../performanceMode';
import { referenceProfiles } from '../data/references';
import './ReferencesSection.css';

const wrapOffset = (offset: number, width: number) => ((offset % width) + width) % width;

function ArrowIcon({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d={direction === 'left' ? 'm15 18-6-6 6-6' : 'm9 18 6-6-6-6'} />
    </svg>
  );
}

function ReferenceGroup({ duplicate, groupRef }: { duplicate: boolean; groupRef?: React.RefObject<HTMLDivElement> }) {
  return (
    <div
      className="references-group"
      ref={groupRef}
      role={duplicate ? undefined : 'list'}
      aria-hidden={duplicate ? 'true' : undefined}
    >
      {referenceProfiles.map((profile) => (
        <article className="reference-card" role={duplicate ? undefined : 'listitem'} key={`${duplicate ? 'copy' : 'original'}-${profile.name}`}>
          <div className="reference-card__photo">
            <img
              src={profile.image}
              alt={duplicate ? '' : profile.name}
              width="1080"
              height="1350"
              loading="lazy"
              decoding="async"
              draggable="false"
            />
          </div>
          <div className="reference-card__content">
            <h3>{profile.name}</h3>
            <p>{profile.credential}</p>
          </div>
        </article>
      ))}
    </div>
  );
}

export default function ReferencesSection() {
  const performanceMode = usePerformanceMode();
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const firstGroupRef = useRef<HTMLDivElement>(null);
  const groupWidthRef = useRef(0);
  const offsetRef = useRef(0);
  const nudgeRemainingRef = useRef(0);
  const carouselVisibleRef = useRef(true);

  const applyPosition = useCallback(() => {
    const track = trackRef.current;
    const width = groupWidthRef.current;
    if (!track || width <= 0) return;

    offsetRef.current = wrapOffset(offsetRef.current, width);
    track.style.transform = `translate3d(${-offsetRef.current}px, 0, 0)`;
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    const firstGroup = firstGroupRef.current;
    if (!viewport || !firstGroup) return;

    const measure = () => {
      const previousWidth = groupWidthRef.current;
      const nextWidth = firstGroup.offsetWidth;
      if (nextWidth <= 0) return;

      if (previousWidth > 0) offsetRef.current = (offsetRef.current / previousWidth) * nextWidth;
      groupWidthRef.current = nextWidth;
      applyPosition();
    };

    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(firstGroup);
    resizeObserver.observe(viewport);
    measure();

    let visibilityObserver: IntersectionObserver | undefined;
    if ('IntersectionObserver' in window) {
      carouselVisibleRef.current = false;
      visibilityObserver = new IntersectionObserver(
        ([entry]) => {
          carouselVisibleRef.current = entry.isIntersecting;
        },
        { rootMargin: '320px 0px', threshold: 0.01 }
      );
      visibilityObserver.observe(viewport);
    }

    let frame = 0;
    let previousTime = performance.now();
    const animate = (time: number) => {
      const elapsed = Math.min((time - previousTime) / 1000, 0.05);
      previousTime = time;

      if (carouselVisibleRef.current && groupWidthRef.current > 0) {
        const baseSpeed = viewport.clientWidth <= 720 ? 17 : 21;
        const standardSpeed = performanceMode === 'reduced' ? 0 : performanceMode === 'balanced' ? baseSpeed * .68 : baseSpeed;
        const autoplayDelta = standardSpeed * elapsed;
        const easing = 1 - Math.exp(-7 * elapsed);
        const manualDelta = nudgeRemainingRef.current * easing;

        if (autoplayDelta !== 0 || manualDelta !== 0) {
          offsetRef.current += autoplayDelta + manualDelta;
          nudgeRemainingRef.current -= manualDelta;
          if (Math.abs(nudgeRemainingRef.current) < 0.5) nudgeRemainingRef.current = 0;
          applyPosition();
        }
      }

      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frame);
      visibilityObserver?.disconnect();
      resizeObserver.disconnect();
    };
  }, [applyPosition, performanceMode]);

  const move = (direction: -1 | 1) => {
    const width = groupWidthRef.current;
    if (width <= 0) return;

    const viewportWidth = viewportRef.current?.clientWidth ?? 360;
    const step = Math.min(Math.max(viewportWidth * 0.48, 220), 560);

    nudgeRemainingRef.current += direction * step;
  };

  return (
    <section className="references-section" aria-labelledby="references-title">
      <div className="references-section__header">
        <div>
          <h2 id="references-title">Referências que fazem parte da nossa trajetória</h2>
        </div>
        <a className="references-section__partner-link" href="/#/parceiros">Quero ser parceiro Nutriwork</a>
      </div>

      <div className="references-section__controls" aria-label="Controles do carrossel de referências">
        <button type="button" onClick={() => move(-1)} aria-label="Ver referências anteriores">
          <ArrowIcon direction="left" />
        </button>
        <button type="button" onClick={() => move(1)} aria-label="Ver próximas referências">
          <ArrowIcon direction="right" />
        </button>
      </div>

      <div
        className="references-carousel"
        ref={viewportRef}
        role="region"
        aria-roledescription="carrossel"
        aria-label="Referências profissionais do Nutriwork"
        aria-describedby="references-help"
      >
        <p className="sr-only" id="references-help">
          Carrossel contínuo. Use os botões de anterior e próxima referência para navegar.
        </p>
        <div className="references-track" ref={trackRef}>
          <ReferenceGroup duplicate={false} groupRef={firstGroupRef} />
          <ReferenceGroup duplicate />
        </div>
      </div>
    </section>
  );
}

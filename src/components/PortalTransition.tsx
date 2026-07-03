import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import PortalCanvas from './PortalCanvas';

/*
 * Sistema único de transição da campanha.
 *
 * - SignatureLoading: overlay de carregamento com a assinatura "especial de
 *   1 ano" (escrita + glow sutil). Usado no boot de qualquer URL e nas
 *   trocas de rota comuns (Estude, Parceiros, ...).
 * - PortalTravelLayer: portal como elemento de navegação entre a página
 *   principal e a campanha. FLIP transform-only: parte do portal da hero
 *   atual, cresce até cobrir a viewport, segura a assinatura enquanto a
 *   página real carrega e pousa exatamente no portal da nova hero.
 *
 * Sincronização por transitionend + prontidão real da página (sem timeouts
 * de coreografia); um fallback generoso cobre abas em segundo plano.
 */

export type PortalAnchor = { x: number; y: number; size: number };
export type TravelStage = 'expand' | 'hold' | 'contract';

export function measurePortalAnchor(): PortalAnchor | null {
  const el = document.querySelector<HTMLElement>('[data-portal-anchor]');
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  if (rect.width < 40 || rect.height < 40) return null;
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, size: rect.width };
}

export function centerAnchor(): PortalAnchor {
  return {
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
    size: Math.min(window.innerWidth, window.innerHeight) * .4
  };
}

function anchorTransform(anchor: PortalAnchor, size: number) {
  return `translate3d(${anchor.x - size / 2}px, ${anchor.y - size / 2}px, 0) scale(${anchor.size / size})`;
}

function coverTransform(size: number) {
  const scale = (Math.hypot(window.innerWidth, window.innerHeight) * 2.3) / size;
  return `translate3d(${window.innerWidth / 2 - size / 2}px, ${window.innerHeight / 2 - size / 2}px, 0) scale(${scale})`;
}

export function SignatureLoading({ visible, backdrop = true }: { visible: boolean; backdrop?: boolean }) {
  const [present, setPresent] = useState(visible);

  useEffect(() => {
    if (visible) {
      setPresent(true);
      return;
    }
    const timer = window.setTimeout(() => setPresent(false), 620);
    return () => window.clearTimeout(timer);
  }, [visible]);

  if (!present) return null;

  return (
    <div className={`signature-loading ${visible ? 'signature-loading--visible' : ''} ${backdrop ? 'signature-loading--backdrop' : ''}`} aria-hidden="true">
      <span className="signature-loading__script">especial de 1 ano</span>
    </div>
  );
}

export function PortalTravelLayer({ stage, from, to, onStageEnd }: {
  stage: TravelStage;
  from: PortalAnchor;
  to: PortalAnchor | null;
  onStageEnd: (stage: TravelStage) => void;
}) {
  const portalRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef(stage);
  stageRef.current = stage;
  const size = useRef(from.size).current;

  // Coreografia FLIP: posiciona no portal de origem e, no frame seguinte,
  // transiciona o transform para o destino do estágio atual.
  useLayoutEffect(() => {
    const portal = portalRef.current;
    if (!portal) return;

    if (stage === 'expand') {
      portal.style.transition = 'none';
      portal.style.transform = anchorTransform(from, size);
      // reflow para ancorar o ponto de partida antes de animar
      void portal.offsetWidth;
      portal.style.transition = '';
      portal.style.transform = coverTransform(size);
    } else if (stage === 'contract') {
      portal.style.transform = anchorTransform(to ?? centerAnchor(), size);
    }
  }, [stage, from, to, size]);

  // Avanço sincronizado com o fim real da animação (+ fallback p/ abas ocultas).
  useEffect(() => {
    if (stage === 'hold') return;
    const portal = portalRef.current;
    if (!portal) return;

    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      onStageEnd(stage);
    };
    const handleEnd = (event: TransitionEvent) => {
      if (event.propertyName === 'transform') finish();
    };
    portal.addEventListener('transitionend', handleEnd);
    const fallback = window.setTimeout(finish, 1400);
    return () => {
      portal.removeEventListener('transitionend', handleEnd);
      window.clearTimeout(fallback);
    };
  }, [stage, onStageEnd]);

  return (
    <div className={`portal-travel portal-travel--${stage}`} aria-hidden="true">
      <div className="portal-travel__backdrop" />
      <div ref={portalRef} className="portal-travel__portal" style={{ width: size, height: size }}>
        <PortalCanvas mode="routeLite" className="portal-travel__canvas" />
      </div>
      <div className="portal-travel__signature">
        <span className="signature-loading__script">especial de 1 ano</span>
      </div>
    </div>
  );
}

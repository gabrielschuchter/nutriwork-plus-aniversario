import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import {
  comparison,
  courses,
  estudeAudience,
  estudeBenefits,
  estudeObjections,
  evidenceLearning,
  extras,
  faqItems,
  navItems,
  promises
} from './data';
import ReferencesSection from './components/ReferencesSection';
import PortalCanvas from './components/PortalCanvas';
import { PortalTravelLayer, SignatureLoading, centerAnchor, measurePortalAnchor, type PortalAnchor, type TravelStage } from './components/PortalTransition';
import { AnimatedGradient } from '@/components/ui/animated-gradient';
import type { GalleryItem } from './components/PartnersEventsGallery';
import { usePerformanceMode } from './performanceMode';

const checkout = {
  complete: 'https://pay.kiwify.com.br/GS3PDk8',
  guide: 'https://pay.kiwify.com.br/fPEAkDX',
  monthly: 'https://pay.kiwify.com.br/pO6p0QM',
  quarterly: 'https://pay.kiwify.com.br/bfYt1Pt',
  semiannual: 'https://pay.kiwify.com.br/8hYyxj2'
};

const contactEmail = 'equipenutriwork@gmail.com';
const partnerForm = 'https://forms.gle/avn9yrBdbEHkaGg8A';
const whatsappContact = `https://wa.me/5512997505188?text=${encodeURIComponent('Olá, equipe Nutriwork! Vim pelo site e gostaria de tirar uma dúvida sobre o Nutriwork Plus.')}`;
type Theme = 'light' | 'dark';
type Page = 'home' | 'estude' | 'partners' | 'anniversary';
type NavOverlay =
  | { kind: 'boot' }
  | { kind: 'fade' }
  | { kind: 'travel'; stage: TravelStage; from: PortalAnchor; to: PortalAnchor | null }
  | null;

// Loading de acesso direto (refresh/URL): exibido = max(4000ms, carregamento real).
const bootMinimumDuration = 4000;

const PartnersMapCard = lazy(() => import('./components/PartnersMapCard'));
const PartnersEventsGallery = lazy(() => import('./components/PartnersEventsGallery'));

function Reveal({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`reveal ${className}`}>{children}</div>;
}

function useScrollReveal(refreshKey: unknown) {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -6% 0px' }
    );

    document.querySelectorAll('.reveal').forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [refreshKey]);
}

function useMobileCtaVisibility(refreshKey: unknown) {
  useEffect(() => {
    const cta = document.querySelector<HTMLElement>('.mobile-cta');
    const protectedSections = document.querySelectorAll('.pricing-section, .campaign-gateway, .faq-section, .footer');
    if (!cta || !protectedSections.length) return;

    const visibleSections = new Set<Element>();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => entry.isIntersecting ? visibleSections.add(entry.target) : visibleSections.delete(entry.target));
        cta.classList.toggle('mobile-cta--hidden', visibleSections.size > 0);
      },
      { threshold: 0.04 }
    );

    protectedSections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [refreshKey]);
}

function getCurrentPage(): Page {
  if (window.location.hash === '#/estude') return 'estude';
  if (window.location.hash === '#/parceiros') return 'partners';
  if (window.location.hash === '#/aniversario' || window.location.hash === '#oferta-aniversario') return 'anniversary';
  return 'home';
}

function useCurrentPage() {
  const [page, setPage] = useState<Page>(() => getCurrentPage());

  useEffect(() => {
    const updatePage = () => setPage(getCurrentPage());
    window.addEventListener('hashchange', updatePage);
    return () => window.removeEventListener('hashchange', updatePage);
  }, []);

  return page;
}

function useHashScroll(page: Page) {
  useEffect(() => {
    if (page !== 'home') {
      window.scrollTo({ top: 0, behavior: 'auto' });
      return;
    }

    const hash = window.location.hash;
    if (!hash || hash.startsWith('#/')) return;

    window.requestAnimationFrame(() => {
      document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' });
    });
  }, [page]);
}

function waitForDelay(delay: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, Math.max(0, delay)));
}

function waitForNextPaint() {
  return new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => resolve()));
  });
}

async function waitForRenderedPage() {
  await waitForNextPaint();

  const fontsReady = document.fonts?.ready ?? Promise.resolve();
  await Promise.allSettled([fontsReady]);
}

function isPortalRoute(from: Page, to: Page) {
  return (from === 'home' && to === 'anniversary') || (from === 'anniversary' && to === 'home');
}

/*
 * Controlador único de navegação da campanha (equivalente a um
 * PortalTransitionProvider): boot com assinatura em qualquer URL, fade de
 * assinatura nas rotas comuns e travessia do portal entre home e campanha.
 */
function useNavigationSystem(page: Page) {
  const hasHandledFirstPage = useRef(false);
  const currentPageRef = useRef(page);
  const bootStartedAt = useRef(performance.now());
  const [renderedPage, setRenderedPage] = useState(page);
  const [overlay, setOverlay] = useState<NavOverlay>({ kind: 'boot' });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('loading-active', overlay?.kind === 'boot');
    return () => root.classList.remove('loading-active');
  }, [overlay]);

  useEffect(() => {
    let cancelled = false;
    let removeLoadListener = () => {};

    const windowReady = document.readyState === 'complete'
      ? Promise.resolve()
      : new Promise<void>((resolve) => {
          const handleLoad = () => resolve();
          window.addEventListener('load', handleLoad, { once: true });
          removeLoadListener = () => window.removeEventListener('load', handleLoad);
        });

    void Promise.all([
      windowReady,
      document.fonts?.ready ?? Promise.resolve(),
      waitForDelay(bootMinimumDuration - (performance.now() - bootStartedAt.current))
    ]).then(() => {
      if (cancelled) return;
      setOverlay((current) => (current?.kind === 'boot' ? null : current));
    });

    return () => {
      cancelled = true;
      removeLoadListener();
    };
  }, []);

  useLayoutEffect(() => {
    if (!hasHandledFirstPage.current) {
      hasHandledFirstPage.current = true;
      currentPageRef.current = page;
      return;
    }
    if (currentPageRef.current === page) return;

    const from = currentPageRef.current;
    currentPageRef.current = page;
    if (isPortalRoute(from, page)) {
      setOverlay({ kind: 'travel', stage: 'expand', from: measurePortalAnchor() ?? centerAnchor(), to: null });
      return;
    }

    let cancelled = false;
    setOverlay({ kind: 'fade' });
    const swapTimer = window.setTimeout(() => {
      setRenderedPage(page);
      void Promise.all([
        waitForRenderedPage(),
        waitForDelay(520)
      ]).then(() => {
        if (cancelled) return;
        setOverlay((current) => (current?.kind === 'fade' ? null : current));
      });
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(swapTimer);
    };
  }, [page]);

  const handleTravelStageEnd = useCallback((stage: TravelStage) => {
    if (stage === 'expand') {
      // Portal cobre a viewport: troca a página real sob a luz e aguarda
      // a prontidão de verdade antes de pousar no portal de destino.
      setOverlay((current) => (current?.kind === 'travel' ? { ...current, stage: 'hold' } : current));
      setRenderedPage(currentPageRef.current);
      void Promise.all([waitForRenderedPage(), waitForDelay(700)]).then(() => {
        window.requestAnimationFrame(() => {
          setOverlay((current) => (
            current?.kind === 'travel' && current.stage === 'hold'
              ? { ...current, stage: 'contract', to: measurePortalAnchor() ?? centerAnchor() }
              : current
          ));
        });
      });
    } else if (stage === 'contract') {
      setOverlay((current) => (current?.kind === 'travel' ? null : current));
    }
  }, []);

  return { renderedPage, overlay, handleTravelStageEnd };
}

function Icon({ name }: { name: string }) {
  const paths: Record<string, ReactNode> = {
    brain: <><path d="M9 5.2a3.2 3.2 0 0 0-5.2 2.5 3.1 3.1 0 0 0 .8 5.9A3.3 3.3 0 0 0 9 18.5V5.2Z"/><path d="M15 5.2a3.2 3.2 0 0 1 5.2 2.5 3.1 3.1 0 0 1-.8 5.9 3.3 3.3 0 0 1-4.4 4.9V5.2Z"/><path d="M9 9H7.2M15 9h1.8M9 14H7m8 0h2"/></>,
    student: <><circle cx="12" cy="7" r="3"/><path d="M5 20v-2.4A5.6 5.6 0 0 1 10.6 12h2.8a5.6 5.6 0 0 1 5.6 5.6V20M3 6l9-4 9 4-9 4-9-4Z"/></>,
    structure: <><rect x="4" y="3" width="16" height="5" rx="1.5"/><rect x="4" y="16" width="7" height="5" rx="1.5"/><rect x="13" y="16" width="7" height="5" rx="1.5"/><path d="M12 8v4M7.5 12h9M7.5 12v4M16.5 12v4"/></>,
    evidence: <><rect x="4" y="3" width="12" height="16" rx="2"/><path d="M8 7h4M8 11h5M8 15h3"/><circle cx="17" cy="16" r="3"/><path d="m19.3 18.3 2.2 2.2"/></>,
    trend: <path d="m3 17 6-6 4 4 8-9M16 6h5v5"/>,
    cap: <><path d="m2 9 10-5 10 5-10 5L2 9Z"/><path d="M6 11.5V16c3.5 2.5 8.5 2.5 12 0v-4.5M22 9v7"/></>,
    light: <><path d="M9 18h6M10 22h4"/><path d="M8.2 14.5A7 7 0 1 1 15.8 14.5 5 5 0 0 0 14 18h-4a5 5 0 0 0-1.8-3.5Z"/></>,
    book: <><path d="M4 5.5A3.5 3.5 0 0 1 7.5 2H12v18H7.5A3.5 3.5 0 0 0 4 23V5.5ZM20 5.5A3.5 3.5 0 0 0 16.5 2H12v18h4.5A3.5 3.5 0 0 1 20 23V5.5Z"/></>,
    podcast: <><circle cx="12" cy="11" r="3"/><path d="M7.2 15.8a6.8 6.8 0 1 1 9.6 0M4.5 18.5a10.5 10.5 0 1 1 15 0M12 14v8M9 22h6"/></>,
    play: <><rect x="3" y="5" width="18" height="14" rx="3"/><path d="m10 9 5 3-5 3V9Z"/></>,
    analysis: <><path d="M5 3h10l4 4v14H5V3Z"/><path d="M15 3v5h5M8 12h7M8 16h4"/><circle cx="16.5" cy="16.5" r="2.5"/></>,
    heart: <path d="M20.8 5.7a5.4 5.4 0 0 0-7.6 0L12 6.9l-1.2-1.2a5.4 5.4 0 1 0-7.6 7.6L12 22l8.8-8.7a5.4 5.4 0 0 0 0-7.6Z"/>,
    check: <path d="m4 12 5 5L20 6"/>,
    instagram: <><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.5 6.5h.01"/></>,
    phone: <><path d="M8 3h8l1 3-2 2a15 15 0 0 0 3 3l2-2 3 1v8c0 1.1-.9 2-2 2C11.1 20 4 12.9 4 4a2 2 0 0 1 2-2l2 1Z"/></>,
    whatsapp: <path fill="currentColor" stroke="none" d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 1.82c2.16 0 4.19.84 5.72 2.37a8.04 8.04 0 0 1 2.37 5.72c0 4.46-3.63 8.09-8.1 8.09a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.11.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.36c0-4.46 3.63-8.09 8.1-8.09Zm-3.34 4.4c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32 .98 2.48c.12.16 1.7 2.6 4.12 3.65.58.25 1.03.4 1.38.51.58.19 1.11.16 1.53.1.47-.07 1.43-.59 1.63-1.15.2-.56.2-1.05.14-1.15-.06-.1-.22-.16-.46-.28-.24-.12-1.43-.7-1.65-.79-.22-.08-.38-.12-.54.12-.16.24-.62.78-.76.94-.14.16-.28.18-.52.06-.24-.12-1.01-.37-1.93-1.19-.71-.64-1.2-1.42-1.34-1.66-.14-.24-.01-.37.11-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.47-.4-.4-.54-.41-.14-.01-.3-.01-.46-.01Z"/>,
    mail: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></>,
    sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41"/></>,
    moon: <path d="M20.7 15.2A8.6 8.6 0 0 1 8.8 3.3 9 9 0 1 0 20.7 15.2Z"/>,
    pause: <><rect x="7" y="5" width="3.5" height="14" rx="1"/><rect x="13.5" y="5" width="3.5" height="14" rx="1"/></>,
    gauge: <><path d="M4 14a8 8 0 0 1 16 0"/><path d="M6.2 19a9.8 9.8 0 0 1-2.2-6 8 8 0 0 1 16 0 9.8 9.8 0 0 1-2.2 6Z"/><path d="m12 14 4-5"/><circle cx="12" cy="14" r="1"/></>,
    volume: <><path d="M4 10v4h4l5 4V6l-5 4H4Z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/></>,
    volumeOff: <><path d="M4 10v4h4l5 4V6l-5 4H4Z"/><path d="m18 9-5 5M13 9l5 5"/></>
  };
  return <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function PricingCheck() {
  return <span className="pricing-check" aria-hidden="true" />;
}

function Button({ href, children, variant = 'primary', className = '', external = false }: { href: string; children: ReactNode; variant?: 'primary' | 'outline'; className?: string; external?: boolean }) {
  return <a className={`button button--${variant} ${className}`} href={href} target={external ? '_blank' : undefined} rel={external ? 'noreferrer' : undefined}>{children}</a>;
}

function Header() {
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>(() => document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');
  const [activeNavHref, setActiveNavHref] = useState(() => {
    const hash = window.location.hash;
    return hash === '#oferta-aniversario' ? '/#/aniversario' : hash && hash !== '#' ? `/${hash}` : '/#inicio';
  });
  const nextTheme = theme === 'dark' ? 'light' : 'dark';

  useEffect(() => {
    const updateActiveNav = () => {
      const hash = window.location.hash;
      setActiveNavHref(hash === '#oferta-aniversario' ? '/#/aniversario' : hash && hash !== '#' ? `/${hash}` : '/#inicio');
    };

    window.addEventListener('hashchange', updateActiveNav);
    return () => window.removeEventListener('hashchange', updateActiveNav);
  }, []);

  const toggleTheme = () => {
    const root = document.documentElement;
    root.classList.add('theme-transition');
    root.dataset.theme = nextTheme;
    root.style.colorScheme = nextTheme;
    document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.setAttribute('content', nextTheme === 'light' ? '#f4f7fc' : '#02040a');
    try {
      localStorage.setItem('nutriwork-theme', nextTheme);
    } catch {
      // The selected theme still applies when storage is unavailable.
    }
    setTheme(nextTheme);
    window.setTimeout(() => root.classList.remove('theme-transition'), 350);
  };

  return (
    <header className="site-header">
      <a className="brand" href="/#inicio" aria-label="Nutriwork Plus, voltar ao início">NUTRIWORK<span>+</span></a>
      <nav className={`nav ${open ? 'nav--open' : ''}`} aria-label="Navegação principal">
        {navItems.map((item) => {
          const active = activeNavHref === item.href;
          const className = [active ? 'is-active' : '', item.featured ? 'nav__anniversary' : ''].filter(Boolean).join(' ');
          return <a key={item.href} className={className || undefined} href={item.href} aria-current={active ? 'page' : undefined} onClick={() => setOpen(false)}>{item.featured && <span aria-hidden="true">✦</span>}{item.label}</a>;
        })}
      </nav>
      <div className="header-actions">
        <button className="theme-toggle" type="button" aria-label={`Tema atual: ${theme === 'dark' ? 'escuro' : 'claro'}. Alternar para tema ${nextTheme === 'dark' ? 'escuro' : 'claro'}.`} title={`Alternar para tema ${nextTheme === 'dark' ? 'escuro' : 'claro'}`} onClick={toggleTheme}>
          <span className="theme-toggle__track" aria-hidden="true">
            <span className="theme-toggle__icon theme-toggle__icon--sun"><Icon name="sun"/></span>
            <span className="theme-toggle__icon theme-toggle__icon--moon"><Icon name="moon"/></span>
            <span className="theme-toggle__thumb"><Icon name={theme === 'dark' ? 'moon' : 'sun'}/></span>
          </span>
        </button>
        <button className="menu-button" type="button" aria-label={open ? 'Fechar menu' : 'Abrir menu'} aria-expanded={open} onClick={() => setOpen((value) => !value)}>
          <span/><span/><span/>
        </button>
      </div>
    </header>
  );
}

function SectionHeading({ children, accent = false }: { children: ReactNode; accent?: boolean }) {
  return <h2 className={`section-heading ${accent ? 'section-heading--accent' : ''}`}>{children}</h2>;
}


// Três posições fixas ao redor do portal; cada slot cicla o próprio conjunto
// de fotos (disjunto entre slots, sem colisão) usando o mesmo fade existente.
const heroPortalSlots = [
  ['/assets/anniversary/memory-team.webp', '/assets/partners-events/event-13.webp'],
  ['/assets/partners-events/event-02.webp', '/assets/anniversary/memory-stage.webp'],
  ['/assets/anniversary/memory-podcast.webp', '/assets/partners-events/event-08.webp']
];

function HeroPortalPhoto({ slot, photos }: { slot: number; photos: string[] }) {
  const [index, setIndex] = useState(0);
  // Troca o conteúdo no fim de cada ciclo de fade (opacidade já em 0).
  const handleIteration = () => setIndex((current) => (current + 1) % photos.length);
  return (
    <img
      className={`hero-portal__photo hero-portal__photo--${slot}`}
      src={photos[index]}
      onAnimationIteration={handleIteration}
      alt=""
      width="360"
      height="240"
      loading="lazy"
      decoding="async"
      draggable="false"
    />
  );
}

function HeroPortal() {
  return (
    <div className="hero-portal" aria-hidden="true" data-portal-anchor>
      <div className="hero-portal__tilt">
        <PortalCanvas mode="hero" className="hero-portal__canvas" />
        <div className="hero-portal__orbit">
          {heroPortalSlots.map((photos, index) => (
            <HeroPortalPhoto key={index} slot={index + 1} photos={photos} />
          ))}
        </div>
      </div>
    </div>
  );
}

function Hero() {
  const enterPortal = () => {
    window.location.hash = '#/aniversario';
  };

  return (
    <section id="inicio" className="hero hero--time">
      <HeroPortal />
      <Reveal className="hero__layout hero__layout--time">
        <div className="hero__content hero__content--time">
          <p className="hero-script-kicker" aria-label="Especial de 1 ano"><span className="hero-script-kicker__text">especial de 1 ano</span></p>
          <h1 className="hero-time-title"><span className="hero-time-title__lead">O Nutriwork</span><strong>voltou no tempo.</strong></h1>
          <p>Para celebrar nosso primeiro ano, trouxemos de volta o valor que marcou o começo de tudo.</p>
          <div className="hero-actions">
            <button type="button" className="button hero-time-cta cta-glow" onClick={enterPortal}>
              Saiba mais
              <span className="cta-sparks" aria-hidden="true"><i /><i /><i /><i /><i /><i /></span>
            </button>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

function Platform() {
  return (
    <section id="sobre" className="section platform-section">
      <div className="page-width">
        <Reveal className="intro-copy">
          <h3>Estudar Nutrição não deveria parecer tão confuso.</h3>
          <p className="intro-copy__support">Existem muitos conteúdos, muitas opiniões e pouca clareza sobre o que realmente merece sua atenção.</p>
          <div className="purpose-callout">
            <p><strong>O Nutriwork existe para dar direção aos seus estudos em Nutrição.</strong></p>
            <span>Uma comunidade para quem quer aprender aquilo que importa com clareza e pensamento crítico.</span>
          </div>
          <p className="promise-kicker">Na prática, isso significa:</p>
        </Reveal>
        <div className="promise-grid">
          {promises.map((item) => <Reveal key={item.title} className="glass-card promise-card"><Icon name={item.icon}/><div><h3>{item.title}</h3><p>{item.description}</p></div></Reveal>)}
        </div>
        <Reveal><p className="mission">Se você já sente que <strong>estuda bastante</strong>, mas ainda não sabe se está <strong>estudando certo</strong>, o Nutriwork foi feito para você.</p></Reveal>
      </div>
    </section>
  );
}

function JoinCta() {
  return (
    <section className="join-cta-section" aria-labelledby="join-cta-title">
      <div className="page-width page-width--narrow">
        <Reveal className="join-cta">
          <div>
            <p className="eyebrow">Seu próximo passo</p>
            <h2 id="join-cta-title">Pare de estudar no improviso.</h2>
            <p className="join-cta__copy">Você não precisa salvar mais 50 posts para sentir que está evoluindo.<br/><br/>Entre no Nutriwork e estude com aulas, materiais e discussões que mostram <strong>o que estudar</strong>, <strong>por que estudar</strong> e <strong>como usar isso na prática</strong>.</p>
          </div>
          <Button href="/#/aniversario" variant="outline">Quero fazer parte</Button>
        </Reveal>
      </div>
    </section>
  );
}

function Courses() {
  const performanceMode = usePerformanceMode();
  const trackRef = useRef<HTMLDivElement>(null);
  const firstGroupRef = useRef<HTMLDivElement>(null);
  const carouselVisibleRef = useRef(true);
  const offsetRef = useRef(0);
  const groupWidthRef = useRef(0);
  const draggingRef = useRef(false);
  const hoverPausedRef = useRef(false);
  const focusPausedRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragStartOffsetRef = useRef(0);
  const lastPointerXRef = useRef(0);
  const lastPointerTimeRef = useRef(0);
  const momentumRef = useRef(0);

  const applyOffset = (nextOffset: number) => {
    const width = groupWidthRef.current;
    if (width > 0) {
      while (nextOffset <= -width) nextOffset += width;
      while (nextOffset > 0) nextOffset -= width;
    }
    offsetRef.current = nextOffset;
    if (trackRef.current) trackRef.current.style.transform = `translate3d(${nextOffset}px, 0, 0)`;
  };

  useEffect(() => {
    const track = trackRef.current;
    const firstGroup = firstGroupRef.current;
    if (!track || !firstGroup) return;

    const measure = () => {
      groupWidthRef.current = firstGroup.offsetWidth;
      applyOffset(offsetRef.current);
    };
    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(firstGroup);
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
      visibilityObserver.observe(track);
    }

    let frame = 0;
    let previousTime = performance.now();
    const animate = (time: number) => {
      const elapsed = Math.min((time - previousTime) / 1000, 0.05);
      previousTime = time;
      const paused = draggingRef.current || hoverPausedRef.current || focusPausedRef.current;

      if (carouselVisibleRef.current && !paused && groupWidthRef.current > 0 && performanceMode !== 'reduced') {
        const baseDuration = window.innerWidth <= 720 ? 44 : 54;
        const cycleDuration = performanceMode === 'balanced' ? baseDuration * 1.35 : baseDuration;
        const autoSpeed = groupWidthRef.current / cycleDuration;
        applyOffset(offsetRef.current + momentumRef.current * elapsed - autoSpeed * elapsed);
        momentumRef.current *= Math.exp(-5 * elapsed);
        if (Math.abs(momentumRef.current) < 2) momentumRef.current = 0;
      }

      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frame);
      visibilityObserver?.disconnect();
      resizeObserver.disconnect();
    };
  }, [performanceMode]);

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    draggingRef.current = true;
    focusPausedRef.current = false;
    momentumRef.current = 0;
    dragStartXRef.current = event.clientX;
    dragStartOffsetRef.current = offsetRef.current;
    lastPointerXRef.current = event.clientX;
    lastPointerTimeRef.current = event.timeStamp;
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.classList.add('is-dragging');
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    const elapsed = Math.max(event.timeStamp - lastPointerTimeRef.current, 1);
    const delta = event.clientX - lastPointerXRef.current;
    momentumRef.current = Math.max(-700, Math.min(700, (delta / elapsed) * 1000));
    lastPointerXRef.current = event.clientX;
    lastPointerTimeRef.current = event.timeStamp;
    applyOffset(dragStartOffsetRef.current + event.clientX - dragStartXRef.current);
  };

  const stopDragging = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    event.currentTarget.classList.remove('is-dragging');
    if (event.pointerType === 'touch') event.currentTarget.blur();
  };

  return (
    <section className="section courses-section">
      <div className="page-width">
        <Reveal><SectionHeading>Enquanto muitos alunos acumulam conteúdo, <strong className="section-heading__soft-strong">você aprende o que realmente importa</strong>:</SectionHeading></Reveal>
        <Reveal>
          <div className="courses-carousel" role="region" aria-roledescription="carrossel" aria-label="Especializações Nutriwork" aria-describedby="courses-help">
            <p className="sr-only" id="courses-help">Carrossel automático com nove especializações. Arraste para navegar. Passe o mouse ou mantenha o foco no carrossel para pausar.</p>
            <div
              className="courses-track"
              ref={trackRef}
              tabIndex={0}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={stopDragging}
              onPointerCancel={stopDragging}
              onPointerEnter={(event) => { if (event.pointerType === 'mouse') hoverPausedRef.current = true; }}
              onPointerLeave={(event) => { if (event.pointerType === 'mouse') hoverPausedRef.current = false; }}
              onFocus={(event) => { focusPausedRef.current = event.currentTarget.matches(':focus-visible'); }}
              onBlur={() => { focusPausedRef.current = false; }}
            >
              {[0, 1].map((group) => (
                <div className="courses-group" ref={group === 0 ? firstGroupRef : undefined} role={group === 0 ? 'list' : undefined} aria-hidden={group === 1} key={group}>
                  {courses.map((course, index) => (
                    <article className="course-card" role={group === 0 ? 'listitem' : undefined} key={`${group}-${course.title}`}>
                      <img src={course.image} alt={group === 0 ? `Capa do curso ${course.title}` : ''} width="536" height="800" loading="lazy" decoding="async" draggable="false" />
                      <div className="course-card__shade" aria-hidden="true" />
                      <div className="course-card__overlay">
                        <span>Especialização {String(index + 1).padStart(2, '0')}</span>
                        <h3>{course.title}</h3>
                        <p>{course.description}</p>
                      </div>
                    </article>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Extras() {
  return (
    <section id="beneficios" className="section extras-section">
      <div className="page-width">
        <Reveal><SectionHeading>Aprenda Nutrição entre uma aula,<br/>um estágio ou uma prova</SectionHeading></Reveal>
        <Reveal><p className="extras-lead">Quando a rotina aperta, você não precisa parar de estudar. Tenha acesso a diferentes formatos para aprender do seu jeito.</p></Reveal>
        <div className="extras-grid">
          {extras.map((extra) => <Reveal key={extra.title}><article className="extra-card"><Icon name={extra.icon}/><div><h3>{extra.title}</h3><p>{extra.label}</p></div></article></Reveal>)}
        </div>
        <Reveal className="path-intro"><p>O que muda quando você estuda com o Nutriwork?</p><h2>Dois caminhos.</h2><span>resultados diferentes.</span></Reveal>
        <Reveal><Comparison /></Reveal>
      </div>
    </section>
  );
}

function Comparison() {
  return (
    <div className="comparison-card" role="table" aria-label="Comparacao entre estudar com e sem o Nutriwork">
      <div className="comparison-grid">
        <div className="comparison-header" role="row">
          <strong className="comparison-heading comparison-heading--foundation" role="columnheader">Fundamentos</strong>
          <span className="comparison-heading comparison-heading--positive" role="columnheader">Com Nutriwork</span>
          <span className="comparison-heading comparison-heading--negative" role="columnheader">Sem Nutriwork</span>
        </div>
        {comparison.map((row) => (
          <div className="comparison-row" role="row" key={row.area}>
            <strong className="comparison-cell comparison-foundation" role="rowheader">{row.area}</strong>
            <p className="comparison-cell comparison-positive" role="cell" data-label="Com Nutriwork"><Icon name="check"/>{row.with}</p>
            <p className="comparison-cell comparison-negative" role="cell" data-label="Sem Nutriwork">{row.without}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function EstudeBookMockup({ variant, decorative = false }: { variant: 'hero' | 'scene'; decorative?: boolean }) {
  return (
    <div
      className={`estude-book-mockup estude-book-mockup--${variant}`}
      aria-hidden={decorative || undefined}
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : 'Livro ESTUDE em apresentação tridimensional'}
    >
      <div className="estude-book-mockup__body">
        <div className="estude-book-mockup__pages" aria-hidden="true" />
        <div className="estude-book-mockup__spine" aria-hidden="true" />
        <div className="estude-book-mockup__front"><img src="/assets/estude-cover.webp" alt="" width="1200" height="1600" decoding="async" /></div>
      </div>
    </div>
  );
}

function EstudeLandingHero() {
  return (
    <section className="section estude-page-hero">
      <div className="page-width">
        <Reveal className="estude-page-hero__grid">
          <div className="estude-page-hero__copy">
            <h1>Pare de estudar no improviso. Construa sua rotina de estudos baseada em evidências.</h1>
            <p>O ESTUDE ajuda você a decidir prioridades, organizar o tempo disponível e transformar esforço em progresso, com estratégias fundamentadas na ciência.</p>
            <div className="estude-page-hero__actions">
              <Button href={checkout.guide} external>Quero organizar meus estudos</Button>
            </div>
          </div>
          <div className="estude-page-hero__visual" aria-hidden="true">
            <EstudeBookMockup variant="hero" decorative />
            <span>prioridades claras</span>
            <span>menos sobrecarga</span>
            <span>constância possível</span>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Estude() {
  const audienceIcons = ['trend', 'cap', 'light', 'book'];
  return (
    <section id="estude" className="section estude-section">
      <div className="page-width">
        <Reveal className="problem-card glass-card"><h2>Quando tudo parece prioridade, estudar vira um ciclo de sobrecarga:</h2><ul><li>Muito conteúdo disputando atenção;</li><li>Pouca clareza sobre o que fazer e como manter o ritmo.</li></ul></Reveal>
        <Reveal><p className="method-copy">O problema nem sempre é falta de esforço. <strong>Muitas vezes,<br/>é a ausência de um método que funcione na vida real.</strong></p></Reveal>
        <Reveal className="estude-hero">
          <div className="estude-hero__copy"><p>Para transformar intenção<br/>em uma rotina possível</p><h2>Estude</h2></div>
          <img className="estude-cover" src="/assets/estude-cover.webp" alt="Capa do guia Estude" width="1200" height="1600" loading="lazy" decoding="async" />
          <span className="note note--one">Organização<br/>eficiente</span><span className="note note--two">Aplicação prática<br/>na rotina</span><span className="note note--three">Planejamento<br/>consciente</span><span className="note note--four">Constância sem<br/>sobrecarga</span>
          <p className="estude-description">Um livro digital prático para você estruturar uma rotina <strong>clara, eficiente e sustentável</strong>, sem depender de motivação constante para continuar avançando.</p>
        </Reveal>
        <Reveal><p className="estude-detail">Você entende como se preparar melhor para provas e como sono, ambiente, exercício, nutrição, cafeína, suplementos e redes sociais interferem no desempenho. Assim, suas escolhas deixam de ser tentativas isoladas e passam a seguir critérios mais conscientes.</p></Reveal>
        <Reveal className="audience"><h2>O ESTUDE foi pensado para quem:</h2>{estudeAudience.map((item, index) => <div key={item}><Icon name={audienceIcons[index]}/><p>{item}</p></div>)}</Reveal>
        <Reveal className="objections"><h2>Especialmente se hoje você...</h2><div>{estudeObjections.map((item, index) => <article className="glass-card" key={item}><span>×</span><Icon name={['evidence','light','gauge'][index]}/><h3>{item}</h3></article>)}</div><p>Você não precisa continuar estudando no improviso.</p></Reveal>
      </div>
    </section>
  );
}

function StudyBenefits() {
  return (
    <section className="section study-benefits">
      <div className="page-width page-width--narrow">
        <Reveal><h2 className="blue-title">Para transformar clareza em prática:</h2><div className="benefits-panel">{estudeBenefits.map((benefit, index) => <article key={benefit.title}><Icon name={['light','evidence','book'][index]}/><div><h3>{benefit.title}</h3><p>{benefit.text}</p></div></article>)}<Button href={checkout.guide} external>Quero organizar meus estudos</Button></div></Reveal>
      </div>
    </section>
  );
}

function EstudePlan() {
  return (
    <section className="section estude-plan-section">
      <div className="page-width page-width--narrow">
        <Reveal className="pricing-card pricing-card--estude">
          <span className="corner-badge">À vista</span>
          <h2>Livro Digital ESTUDE!</h2>
          <h3>Um método prático para organizar sua rotina<br/>e estudar com mais direção.</h3>
          <Price value="77,90"/>
          <ul>{['Conteúdo completo sobre fatores que influenciam o rendimento nos estudos;','Critérios para definir prioridades, invés de tentar estudar tudo;','Estratégias para construir uma rotina de estudos possível de ser mantida;','Tudo isso de forma prática, direta e baseada em evidências.'].map((item) => <li key={item}><PricingCheck />{item}</li>)}</ul>
          <Button href={checkout.guide} external>Quero o livro ESTUDE</Button>
        </Reveal>
      </div>
    </section>
  );
}

function Evidence() {
  return (
    <section className="section evidence-section">
      <div className="evidence-glow" aria-hidden="true" />
      <img className="evidence-shape" src="/assets/evidence-shape.webp" alt="" aria-hidden="true" width="1185" height="1248" loading="lazy" decoding="async" />
      <div className="page-width page-width--narrow">
        <Reveal className="evidence-heading"><h2>Aprenda a usar evidências sem se perder em termos difíceis.</h2><p>No módulo de Nutrição Baseada em Evidências, você aprende a:</p></Reveal>
        <div className="evidence-list">{evidenceLearning.map((item) => <Reveal key={item}><p>{item}</p></Reveal>)}</div>
      </div>
    </section>
  );
}

function Mentor() {
  return (
    <section className="section mentor-section">
      <div className="page-width page-width--narrow">
        <Reveal><p className="mentor-kicker">Com acompanhamento especial e <strong>direto</strong> de</p></Reveal>
        <Reveal className="mentor-card">
          <div className="mentor-copy"><h2>Gabriel Schuchter</h2><h3>Fundador e professor do Nutriwork</h3><p>Bacharel em Nutrição pela Universidade Federal de Uberlândia (UFU), pesquisador com atuação em revisões sistemáticas e meta-análises, dois dos métodos mais importantes para sintetizar evidências na área da saúde.</p><p>É analista do Reviews, plataforma especializada em análise crítica e interpretação técnica de artigos científicos para profissionais da saúde. Também atua como mentor em Prática Baseada em Evidências, orientando estudantes e profissionais na leitura crítica da literatura, construção de raciocínio científico e tomada de decisão clínica.</p><p>Ao longo da sua trajetória, já ministrou aulas e formações para cursos e profissionais de Nutrição, Medicina, Psicologia, Fisioterapia e Enfermagem, levando a Prática Baseada em Evidências para diferentes áreas da saúde.</p><p>No Nutriwork, Gabriel aproxima a ciência da rotina real de quem estuda Nutrição. Ele mostra como olhar para um artigo sem medo, entender o peso de uma evidência e pensar antes de repetir uma conduta pronta.</p></div>
          <figure className="mentor-photo"><img src="/assets/mentor-gabriel.webp" alt="Gabriel Schuchter, fundador e professor do Nutriwork" width="1070" height="1600" loading="lazy" decoding="async" /></figure>
        </Reveal>
      </div>
    </section>
  );
}

function Price({ value, monthly = false }: { value: string; monthly?: boolean }) {
  const [whole, cents] = value.split(',');
  return <div className="price"><span>R$</span>{whole}<small>,{cents}{monthly ? '/mês' : ''}</small></div>;
}


function FaqItem({ item, index }: { item: typeof faqItems[number]; index: number }) {
  const [open, setOpen] = useState(false);
  const contentId = `faq-answer-${index}`;

  return (
    <Reveal>
      <article className={`faq-item ${open ? 'faq-item--open' : ''}`}>
        <button type="button" aria-expanded={open} aria-controls={contentId} onClick={() => setOpen((value) => !value)}>
          {item.question}
          <span aria-hidden="true">+</span>
        </button>
        <div className="faq-answer" id={contentId} role="region">
          <div><p>{item.answer}</p></div>
        </div>
      </article>
    </Reveal>
  );
}

function FAQ() {
  return (
    <>
      <section className="campaign-gateway" aria-labelledby="campaign-gateway-title" data-campaign="anniversary">
        <div className="campaign-gateway__atmosphere" aria-hidden="true">
          <span className="campaign-gateway__orbit" />
          <span className="campaign-gateway__light" />
        </div>
        <div className="page-width campaign-gateway__layout">
          <Reveal className="campaign-gateway__copy">
            <p className="campaign-gateway__eyebrow">Campanha de aniversário · 1 ano</p>
            <h2 id="campaign-gateway-title">A maior oportunidade do ano para entrar no Nutriwork.</h2>
            <p>Na campanha de aniversário, reunimos condições especiais que apareceram apenas uma vez em nossa história. Acesse a página exclusiva e descubra a melhor forma de fazer parte do Nutriwork.</p>
            <Button href="/#/aniversario" className="campaign-gateway__button">
              Conhecer a campanha
              <span className="campaign-gateway__arrow" aria-hidden="true">→</span>
            </Button>
          </Reveal>
          <Reveal className="campaign-gateway__aside">
            <p className="campaign-gateway__aside-intro">Um marco na nossa trajetória. Uma oportunidade para começar a sua.</p>
          </Reveal>
        </div>
      </section>
      <section id="duvidas" className="section faq-section">
        <div className="page-width page-width--narrow">
          <Reveal><SectionHeading>Dúvidas frequentes</SectionHeading><p className="faq-intro">Respostas objetivas para você entender o que recebe, reduzir incertezas e escolher com segurança.</p></Reveal>
          <div className="faq-list">
            {faqItems.map((item, index) => <FaqItem item={item} index={index} key={item.question} />)}
          </div>
        </div>
      </section>
    </>
  );
}

function Footer({ showStatement = true }: { showStatement?: boolean }) {
  return (
    <footer id="contatos" className="footer">
      <div className="footer-orbit" aria-hidden="true" />
      <div className="page-width">
        {showStatement && (
          <Reveal className="footer-statement">
            <h2 aria-label="A plataforma feita para você, estudante de Nutrição.">
              <span aria-hidden="true">A plataforma feita para <span className="footer-word-swap"><span className="footer-word-swap__strike">todo</span><span className="footer-word-swap__insert">você,</span></span> estudante de Nutrição.</span>
            </h2>
          </Reveal>
        )}
        <div className="footer-grid">
          <div className="footer-social">
            <p className="footer-label">Acompanhe de perto</p>
            <a className="contact-link contact-link--featured" href="https://www.instagram.com/gruponutriwork" target="_blank" rel="noreferrer"><Icon name="instagram"/><span><small>Instagram</small>@gruponutriwork</span></a>
          </div>
          <div className="footer-contact">
            <p className="footer-label">Canais de contato</p>
            <h3>Dúvidas, acesso ou próximos passos? Fale com a equipe.</h3>
            <div className="footer-contact__links">
              <a className="contact-link" href={whatsappContact} target="_blank" rel="noreferrer"><Icon name="whatsapp"/><span><small>WhatsApp</small>(12) 99750-5188</span></a>
              <a className="contact-link" href={`mailto:${contactEmail}`} aria-label={`Enviar e-mail para ${contactEmail}`}><Icon name="mail"/><span><small>E-mail</small>{contactEmail}</span></a>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <p className="copyright">© {new Date().getFullYear()} Nutriwork. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
}

function HomePage() {
  return <main><Hero/><ReferencesSection/><Platform/><JoinCta/><Courses/><Extras/><Evidence/><Mentor/><FAQ/></main>;
}

function EstudePage() {
  return <main className="estude-page"><EstudeLandingHero/><Estude/><StudyBenefits/><EstudePlan/></main>;
}

function PartnersPage() {
  return (
    <main className="partners-page">
      <section className="section partners-hero">
        <div className="page-width">
          <Reveal className="partners-hero__grid">
            <div className="partners-hero__copy">
              <h1>Construa uma parceria com uma comunidade que valoriza a Nutrição Baseada em Evidências.</h1>
              <p>Projetos, marcas e instituições que compartilham uma visão séria de educação em saúde são bem-vindas para conversar com o Nutriwork com o intuito de criar iniciativas relevantes.</p>
              <div className="partners-hero__actions">
                <Button href={partnerForm} external>Quero ser parceiro</Button>
                <a className="partners-hero__contact" href={`mailto:${contactEmail}`} aria-label={`Enviar e-mail para ${contactEmail}`}>{contactEmail}</a>
              </div>
            </div>
            <Suspense fallback={<div className="partners-map-card partners-map-card--fallback" aria-hidden="true" />}>
              <PartnersMapCard />
            </Suspense>
          </Reveal>
        </div>
      </section>
      <Suspense fallback={null}>
        <PartnersEventsGallery />
      </Suspense>
    </main>
  );
}

const anniversaryBenefits = [
  'Cursos de todas as áreas da Nutrição.',
  'E-book ESTUDE para resolver sua rotina de estudos.',
  'Aulas ao vivo com especialistas.',
  'Comunidade ativa para trocar dúvidas e obter oportunidades de trabalho.',
  'Análises de artigo, podcasts, Espaço de Conforto e outros recursos.',
  'Valor vitalício sem reajustes futuros!'
];

const anniversarySemesterBenefits = [
  '6 meses de Nutriwork Plus',
  'Cursos, aulas e recursos da plataforma em um só lugar.',
  'Comunidade Nutriwork para dúvidas e trocas.',
  'Acesso pelo computador e celular.',
  'Valor vitalício sem reajustes futuros!'
];

// Papel-selo rasgado da oferta (reprodução da arte oficial): perfuração de
// selo postal + rasgo orgânico via feTurbulence/feDisplacementMap. O `id`
// isola os filtros/máscaras quando há mais de um card na página.
function StampPaper({ id = 'a' }: { id?: string }) {
  const isAnnual = id === 'annual';
  const w = 520;
  const h = 640;
  const tearId = `stamp-tear-${id}`;
  const fillId = `stamp-fill-${id}`;
  const perfId = `stamp-perf-${id}`;
  return (
    <svg className="anniversary-price-card__paper" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <filter id={tearId} x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.013 0.038" numOctaves="2" seed="11" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="16" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <radialGradient id={fillId} cx="28%" cy="6%" r="128%">
          <stop offset="0%" stopColor={isAnnual ? '#2c3f6c' : '#343942'} />
          <stop offset="52%" stopColor={isAnnual ? '#1a2846' : '#242a33'} />
          <stop offset="100%" stopColor={isAnnual ? '#101a30' : '#171b21'} />
        </radialGradient>
        <mask id={perfId}>
          <rect x="6" y="6" width={w - 12} height={h - 12} rx="9" fill="#fff" />
        </mask>
      </defs>
      <rect x="6" y="6" width={w - 12} height={h - 12} rx="9" fill={`url(#${fillId})`} mask={`url(#${perfId})`} filter={`url(#${tearId})`} />
      <rect className="anniversary-price-card__paper-border" x="13" y="13" width={w - 26} height={h - 26} rx="7" fill="none" stroke={isAnnual ? '#e8c576' : '#68717d'} strokeWidth={isAnnual ? '1.5' : '1'} opacity={isAnnual ? '.48' : '.2'} mask={`url(#${perfId})`} />
    </svg>
  );
}

const anniversaryMemoryItems: GalleryItem[] = [
  { number: 'm1', src: '/assets/anniversary/memory-team.webp', caption: 'A primeira turma reunida em sala de aula, onde tudo começou.', width: 1143, height: 914, tone: 'hero' },
  { number: 'm3', src: '/assets/anniversary/memory-podcast.webp', caption: 'Gravação do NW Cast, o podcast que aproximou a comunidade.', width: 1152, height: 775, tone: 'wide' },
  { number: 'm4', src: '/assets/partners-events/event-01.webp', caption: 'A Equipe Nutriwork, responsável por tudo que foi construído até aqui.', width: 1800, height: 1200, tone: 'hero' },
  { number: 'm5', src: '/assets/partners-events/event-11.webp', caption: 'Roda de conversa em um evento oficial Nutriwork.', width: 1400, height: 1867, tone: 'tall' },
  { number: 'm6', src: '/assets/partners-events/event-13.webp', caption: 'Primeira apresentação oficial na Universidade Federal de Uberlândia, 2024.', width: 1400, height: 788, tone: 'wide' }
];

const anniversaryFilmReelPhotos = [
  '/assets/partners-events/event-01.webp',
  '/assets/anniversary/memory-podcast.webp',
  '/assets/partners-events/event-05.webp',
  '/assets/anniversary/memory-team.webp',
  '/assets/partners-events/event-08.webp',
  '/assets/partners-events/event-14.webp',
  '/assets/partners-events/event-03.webp',
  '/assets/anniversary/memory-stage.webp',
  '/assets/partners-events/event-06.webp',
  '/assets/partners-events/event-13.webp'
];

// Comercial de 1 ano: preencha com o ID do vídeo no YouTube para exibir o bloco cinematográfico.
const anniversaryCommercialYoutubeId = '';

function FilmStrip() {
  return <div className="anniversary-filmstrip" aria-hidden="true"><span/><span/><span/><span/><span/><span/><span/><span/><span/><span/><span/><span/></div>;
}

function FilmReel() {
  // A faixa mede a primeira sequência real e anima exatamente essa distância.
  const trackRef = useRef<HTMLDivElement>(null);
  const groupRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const track = trackRef.current;
    const group = groupRef.current;
    if (!track || !group) return;

    const syncReel = () => {
      const distance = group.getBoundingClientRect().width;
      if (distance <= 0) return;

      const isMobile = window.matchMedia('(max-width: 720px)').matches;
      const pixelsPerSecond = isMobile ? 15 : 23;
      const duration = Math.min(Math.max(distance / pixelsPerSecond, isMobile ? 90 : 96), isMobile ? 108 : 124);

      track.style.setProperty('--reel-distance', `${distance}px`);
      track.style.setProperty('--reel-duration', `${duration}s`);
    };

    syncReel();
    const observer = new ResizeObserver(syncReel);
    observer.observe(group);
    window.addEventListener('resize', syncReel);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', syncReel);
    };
  }, []);

  return (
    <div className="anniversary-filmreel" aria-hidden="true">
      <div className="anniversary-filmreel__strip">
        <div className="anniversary-filmreel__track" ref={trackRef}>
          {[0, 1].map((groupIndex) => (
            <div className="anniversary-filmreel__group" ref={groupIndex === 0 ? groupRef : undefined} key={groupIndex}>
              {anniversaryFilmReelPhotos.map((src, i) => (
                <span className="anniversary-filmreel__frame" key={`${groupIndex}-${src}-${i}`}>
                  <img src={src} alt="" width="280" height="187" loading="eager" decoding="async" draggable="false" />
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AnniversaryFilm() {
  const [playing, setPlaying] = useState(false);
  if (!anniversaryCommercialYoutubeId) return null;

  return (
    <section className="anniversary-film" aria-label="Comercial de 1 ano do Nutriwork">
      <div className="page-width page-width--narrow">
        <Reveal className="anniversary-film__frame">
          {playing ? (
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${anniversaryCommercialYoutubeId}?autoplay=1&rel=0`}
              title="Comercial de 1 ano do Nutriwork"
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <button type="button" className="anniversary-film__poster" onClick={() => setPlaying(true)} aria-label="Assistir ao comercial de 1 ano do Nutriwork">
              <img src="/assets/anniversary/memory-podcast.webp" alt="" width="1152" height="775" loading="lazy" decoding="async" />
              <span className="anniversary-film__play" aria-hidden="true" />
              <span className="anniversary-film__label">Assista ao comercial de 1 ano</span>
            </button>
          )}
        </Reveal>
      </div>
    </section>
  );
}

function AnniversaryPage() {
  return (
    <main className="anniversary-page">
      <div className="anniversary-world">
        <section className="anniversary-hero">
          <AnimatedGradient
            config={{
              preset: 'custom',
              color1: '#050B14',
              color2: '#10233D',
              color3: '#C9A96A',
              rotation: 45,
              proportion: 48,
              scale: .28,
              speed: 8,
              distortion: 10,
              swirl: 30,
              swirlIterations: 5,
              softness: 100,
              offset: 0,
              shape: 'Checks',
              shapeSize: 60
            }}
            noise={{
              opacity: .04,
              scale: 1.2
            }}
            className="anniversary-hero__gradient"
          />
          <div className="anniversary-hero__shade" />
          <div className="anniversary-hero__glow" aria-hidden="true" />
          <div className="anniversary-hero__text-shield" aria-hidden="true" />
          <div className="page-width anniversary-hero__content">
            <Reveal>
              <p className="anniversary-kicker">1 ano de Nutriwork +</p>
              <h1>Nosso aniversário.<br/><strong>O seu presente.</strong></h1>
              <Button href="#oferta-aniversario" className="anniversary-hero__cta cta-glow">Clique aqui e seja Plus<span className="cta-sparks" aria-hidden="true"><i/><i/><i/><i/><i/><i/></span></Button>
            </Reveal>
            <div className="anniversary-hero__portal" aria-hidden="true" data-portal-anchor>
              <PortalCanvas mode="hero" className="anniversary-hero__portal-canvas" />
            </div>
          </div>
          <FilmStrip />
        </section>

        <section className="anniversary-story">
          <img className="anniversary-ink anniversary-ink--story" src="/assets/anniversary/ink-texture.webp" alt="" width="460" height="688" loading="lazy" decoding="async" />
          <div className="page-width--narrow">
            <Reveal className="anniversary-story__intro">
              <p>Em nosso primeiro dia, acreditávamos que uma plataforma feita por estudantes e para estudantes poderia <strong>transformar o modo que se estuda Nutrição.</strong></p>
              <p>Um ano depois, continuamos crescendo, aprendendo e inovando, mas sem esquecer de onde viemos.</p>
              <h2><span>1 ano de história,</span><strong>um presente para você.</strong></h2>
              <p>Estamos relembrando o início da nossa jornada, para que você possa garantir benefícios que vão permanecer para sempre.</p>
            </Reveal>
            <div className="anniversary-polaroids">
              <Reveal><article><span className="anniversary-clip"/><h3>Preço garantido<br/>para sempre</h3><p>Entre durante a campanha e mantenha sua assinatura nesse valor de forma <strong className="anniversary-vitalicio">vitalícia.</strong></p></article></Reveal>
              <Reveal><article><span className="anniversary-clip"/><h3>Nutriwork Plus</h3><p>Tenha acesso aos <strong>conteúdos, materiais e recursos exclusivos</strong> da plataforma.</p></article></Reveal>
              <Reveal><article><span className="anniversary-clip"/><h3>Comunidade<br/>que cresce</h3><p>Faça parte de uma plataforma construída por estudantes e para estudantes, com conteúdos práticos e baseados em evidências.</p></article></Reveal>
            </div>
          </div>
        </section>

        <section className="anniversary-memories" aria-labelledby="anniversary-memories-title">
          <div className="page-width">
            <Reveal><h2 id="anniversary-memories-title">Memórias que<br/><strong>construíram o Nutriwork</strong></h2></Reveal>
          </div>
          <Suspense fallback={<div className="anniversary-memories__fallback" aria-hidden="true" />}>
            <PartnersEventsGallery variant="anniversary" items={anniversaryMemoryItems} />
          </Suspense>
        </section>

        <AnniversaryFilm />

        <section id="oferta-aniversario" className="anniversary-offer">
          <img className="anniversary-ink anniversary-ink--offer" src="/assets/anniversary/ink-texture.webp" alt="" width="460" height="688" loading="lazy" decoding="async" />
          <div className="page-width--narrow anniversary-offer__layout">
            <Reveal className="anniversary-offer__copy">
              <div className="anniversary-offer__intro">
                <p>Há 1 ano, o <strong>Nutriwork</strong> nasceu com um propósito: <strong>tornar o conhecimento em nutrição acessível para todos.</strong></p>
                <p>Para celebrar essa trajetória, <strong>trouxemos de volta o valor que marcou o nosso começo.</strong></p>
              </div>
              <h2>Aproveite a campanha e tenha acesso a todos nossos conteúdos!</h2>
              <p className="anniversary-offer__subtitle">Escolha o <strong>plano anual</strong> e também tenha acesso ao <a href="/#/estude">ESTUDE!</a> gratuitamente na campanha de aniversário.</p>
            </Reveal>
            <div className="anniversary-plans">
              <Reveal className="anniversary-price-card anniversary-price-card--annual">
                <span className="anniversary-price-card__aura" aria-hidden="true" />
                <StampPaper id="annual" />
                <span className="anniversary-price-card__seal" aria-hidden="true"><b>Mais</b><span>escolhido</span></span>
                <div className="anniversary-price-card__body">
                  <div className="anniversary-price-card__heading">
                    <h3 className="anniversary-price-card__title">Plano Anual + ESTUDE!</h3>
                  </div>
                  <p className="anniversary-price-card__description">Acesso completo à formação que você sempre quis.</p>
                  <div className="anniversary-price"><span>R$</span><strong>9</strong><sup>,90</sup><small>/ mês</small></div>
                  <ul>{anniversaryBenefits.map((benefit, index) => <li className={index === anniversaryBenefits.length - 1 ? 'anniversary-benefit--lifetime' : undefined} key={benefit}><i className="anniversary-check" aria-hidden="true" />{benefit}</li>)}</ul>
                  <div className="anniversary-price-card__actions">
                    <Button href={checkout.complete} external className="anniversary-price-card__cta">QUERO A EXPERIÊNCIA COMPLETA</Button>
                    <Button href="/#/estude" variant="outline" className="anniversary-price-card__secondary">CONHECER O ESTUDE</Button>
                  </div>
                </div>
              </Reveal>
              <Reveal className="anniversary-price-card anniversary-price-card--semester">
                <StampPaper id="semester" />
                <div className="anniversary-price-card__body">
                  <p className="anniversary-price-card__plan">Plano semestral<span>Acesso ao Nutriwork Plus</span></p>
                  <div className="anniversary-price anniversary-price--center"><span>R$</span><strong>9</strong><sup>,90</sup><small>/ mês</small></div>
                  <ul>{anniversarySemesterBenefits.map((benefit, index) => <li className={index === anniversarySemesterBenefits.length - 1 ? 'anniversary-benefit--lifetime' : undefined} key={benefit}><i className="anniversary-check" aria-hidden="true" />{benefit}</li>)}</ul>
                  <Button href={checkout.semiannual} external className="anniversary-price-card__cta">Assinar</Button>
                </div>
              </Reveal>
            </div>
            <p className="anniversary-offer__note">Pagamento à vista.</p>
            <p className="anniversary-offer__disclaimer">*Oferta por tempo limitado</p>
            <Reveal className="anniversary-offer__closing">
              <h2>O preço é para sempre. A condição, não.</h2>
              <p>Garanta seu acesso ao Nutriwork Plus.</p>
            </Reveal>
          </div>
          <div className="anniversary-grain" aria-hidden="true" />
          <FilmReel />
        </section>
      </div>
    </main>
  );
}

export default function App() {
  const page = useCurrentPage();
  const { renderedPage, overlay, handleTravelStageEnd } = useNavigationSystem(page);
  useScrollReveal(renderedPage);
  useMobileCtaVisibility(renderedPage);
  useHashScroll(renderedPage);

  return (
    <>
      <SignatureLoading visible={overlay?.kind === 'boot' || overlay?.kind === 'fade'} />
      {overlay?.kind === 'travel' && (
        <PortalTravelLayer stage={overlay.stage} from={overlay.from} to={overlay.to} onStageEnd={handleTravelStageEnd} />
      )}
      <div className={`app-shell ${overlay && overlay.kind !== 'travel' ? 'app-shell--loading' : ''}`}>
        <Header/>
        {renderedPage === 'estude' ? <EstudePage/> : renderedPage === 'partners' ? <PartnersPage/> : renderedPage === 'anniversary' ? <AnniversaryPage/> : <HomePage/>}
        {renderedPage !== 'anniversary' && <Footer showStatement={renderedPage !== 'partners'} />}
      </div>
    </>
  );
}

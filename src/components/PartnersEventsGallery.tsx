import './PartnersEventsGallery.css';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties, FocusEvent as ReactFocusEvent } from 'react';

export type GalleryItem = {
  number: string;
  src: string;
  caption: string;
  width: number;
  height: number;
  tone: 'hero' | 'wide' | 'tall' | 'standard';
  focus?: string;
};

type PartnersEventsGalleryProps = {
  variant?: 'partners' | 'anniversary';
  items?: GalleryItem[];
};

const eventGalleryItems: GalleryItem[] = [
  {
    number: '1',
    src: '/assets/partners-events/event-01.webp',
    caption: 'Conheça a Equipe Nutriwork, responsável por tudo que foi construído até aqui.',
    width: 1800,
    height: 1200,
    tone: 'hero',
    focus: 'center center'
  },
  {
    number: '2',
    src: '/assets/partners-events/event-02.webp',
    caption: 'Igor Eckert e Thales Faccin em nosso Simpósio de Nutrição Baseada em Evidências, 2026',
    width: 1800,
    height: 1200,
    tone: 'hero',
    focus: 'center center'
  },
  {
    number: '3',
    src: '/assets/partners-events/event-03.webp',
    caption: 'Igor interagindo com a Equipe Nutriwork',
    width: 1400,
    height: 933,
    tone: 'wide',
    focus: 'center center'
  },
  {
    number: '5',
    src: '/assets/partners-events/event-05.webp',
    caption: 'Recorte de como foi a palestra de Igor Eckert no Simpósio de Nutrição Baseada em Evidências, 2026',
    width: 1400,
    height: 933,
    tone: 'wide',
    focus: 'center center'
  },
  {
    number: '6',
    src: '/assets/partners-events/event-06.webp',
    caption: 'Palestra de Thales Faccin no Simpósio de Nutrição Baseada em Evidências, 2026',
    width: 1400,
    height: 933,
    tone: 'wide',
    focus: 'center center'
  },
  {
    number: '7',
    src: '/assets/partners-events/event-07.webp',
    caption: 'Amplinutri marcando presença em um evento Nutriwork',
    width: 1400,
    height: 933,
    tone: 'standard',
    focus: 'center center'
  },
  {
    number: '8',
    src: '/assets/partners-events/event-08.webp',
    caption: 'Quem sabe um dia não terá seu nome no meio desses crachás? ;)',
    width: 1400,
    height: 933,
    tone: 'standard',
    focus: 'center center'
  },
  {
    number: '10',
    src: '/assets/partners-events/event-10.webp',
    caption: 'Apresentação do Simpósio de Nutrição Esportiva Baseada em Evidências, 2025',
    width: 1400,
    height: 1867,
    tone: 'tall',
    focus: 'center center'
  },
  {
    number: '11',
    src: '/assets/partners-events/event-11.webp',
    caption: 'Roda de conversa em um evento oficial Nutriwork',
    width: 1400,
    height: 1867,
    tone: 'tall',
    focus: 'center center'
  },
  {
    number: '13',
    src: '/assets/partners-events/event-13.webp',
    caption: 'Primeira apresentação oficial do Nutriwork na Universidade Federal de Uberlândia, 2024',
    width: 1400,
    height: 788,
    tone: 'wide',
    focus: 'center center'
  },
  {
    number: '14',
    src: '/assets/partners-events/event-14.webp',
    caption: 'Nossas integrantes marcando presença na Vitaminar, uma clínica de nutrição infantil',
    width: 1400,
    height: 788,
    tone: 'wide',
    focus: 'center center'
  }
];

const AUTOPLAY_DELAY = 5600;

function ArrowIcon({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d={direction === 'left' ? 'm15 18-6-6 6-6' : 'm9 18 6-6-6-6'} />
    </svg>
  );
}

function getShortestOffset(index: number, activeIndex: number, total: number) {
  let offset = index - activeIndex;
  const half = total / 2;

  if (offset > half) offset -= total;
  if (offset < -half) offset += total;

  return offset;
}

export default function PartnersEventsGallery({ variant = 'partners', items = eventGalleryItems }: PartnersEventsGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const carouselRef = useRef<HTMLDivElement>(null);
  const isVisibleRef = useRef(true);
  const totalItems = items.length;

  const move = useCallback((direction: -1 | 1) => {
    setActiveIndex((current) => (current + direction + totalItems) % totalItems);
  }, [totalItems]);

  const pause = () => setIsPaused(true);
  const resume = () => setIsPaused(false);

  const handleBlur = (event: ReactFocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget)) resume();
  };

  useEffect(() => {
    const carousel = carouselRef.current;
    if (!carousel || !('IntersectionObserver' in window)) return;

    isVisibleRef.current = false;
    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisibleRef.current = entry.isIntersecting;
      },
      { rootMargin: '260px 0px', threshold: 0.01 }
    );

    observer.observe(carousel);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (isPaused) return;

    const interval = window.setInterval(() => {
      if (isVisibleRef.current) move(1);
    }, AUTOPLAY_DELAY);

    return () => window.clearInterval(interval);
  }, [isPaused, move]);

  return (
    <section
      className={`section partners-events ${variant === 'anniversary' ? 'partners-events--anniversary' : ''}`}
      aria-labelledby={variant === 'partners' ? 'partners-events-title' : undefined}
      aria-label={variant === 'anniversary' ? 'Galeria de memórias do primeiro ano do Nutriwork' : undefined}
    >
      <div className="page-width">
        {variant === 'partners' && (
          <div className="partners-events__heading">
            <h2 id="partners-events-title">Presença da Comunidade Nutriwork em espaços de formação, ensino e networking</h2>
            <span>Uma seleção de palestras, simpósios, encontros e momentos de troca que mostram o Nutriwork em movimento.</span>
          </div>
        )}
        <div
          className="partners-events__carousel"
          ref={carouselRef}
          role="region"
          aria-roledescription="carrossel"
          aria-label="Galeria de parceiros e eventos Nutriwork"
          aria-describedby="partners-events-help"
          onMouseEnter={pause}
          onMouseLeave={resume}
          onFocus={pause}
          onBlur={handleBlur}
        >
          <p className="sr-only" id="partners-events-help">
            Carrossel automático de imagens. Use os botões de imagem anterior e próxima imagem para navegar.
          </p>
          <div className="partners-events__stage" aria-live="polite">
            {items.map((item, index) => {
              const offset = getShortestOffset(index, activeIndex, totalItems);
              const absOffset = Math.abs(offset);
              const placement = absOffset === 0 ? 'center' : absOffset === 1 ? 'side' : absOffset === 2 ? 'outer' : 'hidden';

              return (
                <figure
                  className={`partners-events__item partners-events__item--${placement}`}
                  key={item.number}
                  style={{
                    '--focus': item.focus ?? 'center center',
                    '--offset': offset,
                    zIndex: 20 - absOffset
                  } as CSSProperties}
                  aria-hidden={absOffset > 1 ? 'true' : undefined}
                >
                  <div className="partners-events__media">
                    <img
                      src={item.src}
                      alt={item.caption}
                      width={item.width}
                      height={item.height}
                      loading={absOffset <= 1 ? 'eager' : 'lazy'}
                      decoding="async"
                      draggable="false"
                      sizes="(max-width: 720px) 82vw, (max-width: 1100px) 68vw, 780px"
                    />
                  </div>
                  <figcaption>{item.caption}</figcaption>
                </figure>
              );
            })}
          </div>

          <div className="partners-events__controls" aria-label="Controles do carrossel de parceiros e eventos">
            <button type="button" onClick={() => move(-1)} aria-label="Imagem anterior" onMouseEnter={pause} onMouseLeave={resume} onFocus={pause} onBlur={resume}>
              <ArrowIcon direction="left" />
            </button>
            <button type="button" onClick={() => move(1)} aria-label="Próxima imagem" onMouseEnter={pause} onMouseLeave={resume} onFocus={pause} onBlur={resume}>
              <ArrowIcon direction="right" />
            </button>
          </div>

          <div className="partners-events__progress" aria-hidden="true">
            <div className="partners-events__progress-track">
              <i style={{ width: `${100 / totalItems}%`, transform: `translateX(${activeIndex * 100}%)` }} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

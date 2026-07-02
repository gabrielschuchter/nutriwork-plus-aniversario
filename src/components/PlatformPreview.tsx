import { useEffect, useState } from 'react';
import './PlatformPreview.css';

/**
 * Prévia da plataforma Nutriwork Plus exibida no monitor da Home.
 * Reconstrói um dashboard premium (estilo SaaS de estudos): sidebar + header
 * com atalhos/notificações/perfil, boas-vindas com indicador de progresso, cards
 * de métricas, grade de cursos e painel de agenda/tarefas, com animações
 * discretas que dão "vida" à interface (rotação de destaque, barras animadas,
 * hover e transições).
 *
 * Componente isolado e reutilizável: escala proporcionalmente ao container
 * (container queries) e acompanha os temas light/dark do site, sem valores
 * fixos dependentes de breakpoint.
 */

type View = 'inicio' | 'cursos' | 'agenda' | 'suporte';
type IconName = 'home' | 'book' | 'play' | 'calendar' | 'headset' | 'instagram' | 'search' | 'bell' | 'check' | 'arrow' | 'clock' | 'flame' | 'trophy' | 'chart' | 'mail' | 'whatsapp';

const contactEmail = 'equipenutriwork@gmail.com';
const whatsappContact = `https://wa.me/5512997505188?text=${encodeURIComponent('Olá, equipe Nutriwork! Vim pelo site e gostaria de tirar uma dúvida sobre o Nutriwork Plus.')}`;
const instagramContact = 'https://www.instagram.com/gruponutriwork';

const navItems: Array<{ id: View; label: string; icon: IconName }> = [
  { id: 'inicio', label: 'Início', icon: 'home' },
  { id: 'cursos', label: 'Meus cursos', icon: 'book' },
  { id: 'agenda', label: 'Agenda', icon: 'calendar' },
  { id: 'suporte', label: 'Suporte', icon: 'headset' },
];


const courses = [
  { id: 'evidence', title: 'Nutrição Baseada em Evidências', category: 'Essencial', progress: 68, image: '/assets/course-evidence.jpg' },
  { id: 'clinical', title: 'Nutrição Clínica', category: 'Prática clínica', progress: 45, image: '/assets/course-clinical.jpg' },
  { id: 'sports', title: 'Nutrição Esportiva', category: 'Performance', progress: 27, image: '/assets/course-sports.jpg' },
  { id: 'behavior', title: 'Nutrição Comportamental', category: 'Adesão', progress: 34, image: '/assets/course-behavior.jpg' },
  { id: 'biochem', title: 'Bioquímica da Nutrição', category: 'Fundamentos', progress: 18, image: '/assets/course-biochemistry.jpg' },
  { id: 'intro', title: 'O começo: como estudar Nutrição', category: 'Trilha inicial', progress: 100, image: '/assets/course-intro.jpg' },
];

const tasks = [
  { text: 'Retomar aula de conduta baseada em evidências', done: false },
  { text: 'Salvar checklist de primeira consulta', done: true },
  { text: 'Responder discussão de caso da semana', done: false },
];

const weekDays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatShortWeekday(date: Date) {
  return capitalize(new Intl.DateTimeFormat('pt-BR', { weekday: 'short' }).format(date).replace('.', ''));
}

function getCalendarData(currentDate: Date) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = currentDate.getDate();
  const eventDays = [today, today + 2, today + 6, today + 9].filter((day) => day <= daysInMonth);

  return {
    label: capitalize(new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(currentDate)),
    monthDays: Array.from({ length: daysInMonth }, (_, i) => i + 1),
    monthOffset: new Date(year, month, 1).getDay(),
    today,
    eventDays: new Set(eventDays),
  };
}

function getAgenda(currentDate: Date) {
  return [
    { time: 'Hoje · 19h', title: 'Aula ao vivo: decidir conduta sem achismo', tag: 'Aula' },
    { time: `${formatShortWeekday(addDays(currentDate, 2))} · 20h`, title: 'NWcast: rotina real de atendimento', tag: 'Podcast' },
    { time: `${formatShortWeekday(addDays(currentDate, 5))} · 10h`, title: 'Mentoria de evidências aplicada', tag: 'Mentoria' },
  ];
}

const supportContacts = [
  { label: 'WhatsApp', value: '(12) 99750-5188', href: whatsappContact, icon: 'whatsapp' as IconName },
  { label: 'E-mail', value: contactEmail, href: `mailto:${contactEmail}`, icon: 'mail' as IconName },
  { label: 'Instagram', value: '@gruponutriwork', href: instagramContact, icon: 'instagram' as IconName },
];

function PreviewIcon({ name }: { name: IconName }) {
  const paths: Record<IconName, JSX.Element> = {
    home: <><path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1Z" /></>,
    book: <><path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5Z" /><path d="M19 18v3H6.5A1.5 1.5 0 0 1 5 19.5" /></>,
    play: <><circle cx="12" cy="12" r="9" /><path d="m10 9 5 3-5 3V9Z" /></>,
    calendar: <><rect x="4" y="5" width="16" height="16" rx="2.5" /><path d="M4 9h16M8 3v4M16 3v4" /></>,
    headset: <><path d="M5 13a7 7 0 0 1 14 0" /><rect x="3.5" y="13" width="3.5" height="6" rx="1.4" /><rect x="17" y="13" width="3.5" height="6" rx="1.4" /><path d="M20.5 19a3 3 0 0 1-3 3H13" /></>,
    instagram: <><rect x="3.5" y="3.5" width="17" height="17" rx="5" /><circle cx="12" cy="12" r="4" /><path d="M17.2 6.8h.01" /></>,
    search: <><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4-4" /></>,
    bell: <><path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z" /><path d="M10 20a2 2 0 0 0 4 0" /></>,
    check: <><path d="m4 12 5 5L20 6" /></>,
    arrow: <><path d="m9 6 6 6-6 6" /></>,
    clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
    flame: <><path d="M12 3c1 3-1.5 4-1.5 6.5A1.5 1.5 0 0 0 12 11a3 3 0 0 0 1.5-3C16 9.5 17 12 17 14a5 5 0 0 1-10 0c0-3 2.5-4.5 5-11Z" /></>,
    trophy: <><path d="M7 4h10v4a5 5 0 0 1-10 0V4Z" /><path d="M7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3M9 20h6M12 13v4" /></>,
    chart: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></>,
    mail: <><rect x="4" y="6" width="16" height="12" rx="2" /><path d="m4.5 7 7.5 6 7.5-6" /></>,
    whatsapp: <><path d="M5.5 19 7 15.7a7 7 0 1 1 2.8 2.4L5.5 19Z" /><path d="M9.4 8.9c.2 2.4 1.9 4.2 4.1 4.9l1.2-1.1 1.8.5c.2 1-.2 1.8-1 2.1-3.7.1-7.2-3.2-7.3-6.9.3-.8 1.1-1.2 2.1-1Z" /></>,
  };
  return (
    <svg className="pp-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

function Brand({ className = '' }: { className?: string }) {
  return <span className={`pp-wordmark ${className}`.trim()}>NUTRIWORK<i>+</i></span>;
}

function useCurrentDate() {
  const [currentDate, setCurrentDate] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setCurrentDate(new Date()), 60 * 1000);
    return () => window.clearInterval(id);
  }, []);

  return currentDate;
}


export default function PlatformPreview() {
  const [view, setView] = useState<View>('inicio');
  const [spotlight, setSpotlight] = useState(0);
  const [selectedCourse, setSelectedCourse] = useState(courses[0].id);
  const currentDate = useCurrentDate();
  const calendar = getCalendarData(currentDate);
  const agenda = getAgenda(currentDate);

  // "Vida" no sistema: alterna o card de curso em destaque automaticamente.
  useEffect(() => {
    if (view !== 'inicio') return;
    const id = window.setInterval(() => {
      if (document.hidden) return;
      setSpotlight((value) => (value + 1) % Math.min(courses.length, 3));
    }, 3000);
    return () => window.clearInterval(id);
  }, [view]);

  const headTitle: Record<View, string> = { inicio: 'Início', cursos: 'Meus cursos', agenda: 'Agenda', suporte: 'Suporte' };
  const openCourse = (courseId: string) => {
    setSelectedCourse(courseId);
    setView('cursos');
  };

  return (
    <div className="platform-preview" role="group" aria-label="Prévia do dashboard do Nutriwork Plus">
      <aside className="pp-sidebar">
        <div className="pp-brand">
          <Brand className="pp-brand__mark" />
          <small>Grupo de Estudos</small>
        </div>
        <nav className="pp-nav" aria-label="Navegação da plataforma">
          {navItems.map((item) => (
            <button key={item.id} type="button" className={view === item.id ? 'is-active' : ''} aria-pressed={view === item.id} onClick={() => setView(item.id)}>
              <PreviewIcon name={item.icon} />
              <span>{item.label}</span>
            </button>
          ))}
          <a className="pp-nav__external" href="https://www.instagram.com/gruponutriwork" target="_blank" rel="noreferrer">
            <PreviewIcon name="instagram" />
            <span>Instagram</span>
          </a>
        </nav>
        <div className="pp-user">
          <span className="pp-user__avatar">EN</span>
          <span className="pp-user__meta"><strong>Equipe Nutriwork</strong><small>Plano anual</small></span>
        </div>
      </aside>

      <div className="pp-shell">
        <header className="pp-header">
          <button type="button" className="pp-shortcut" onClick={() => openCourse(selectedCourse)}>
            <PreviewIcon name="play" />
            <span>Retomar aula prática</span>
          </button>
          <div className="pp-header__actions">
            <button type="button" className="pp-iconbtn" aria-label="Abrir agenda de notificações" onClick={() => setView('agenda')}><PreviewIcon name="bell" /><i className="pp-dot" /></button>
            <span className="pp-profile"><span className="pp-user__avatar">EN</span><span className="pp-profile__name">{headTitle[view]}</span></span>
          </div>
        </header>

        <main className="pp-main" key={view}>
          {view === 'inicio' && (
            <section className="pp-view" aria-label="Início">
              <button type="button" className="pp-banner" aria-label="Retomar estudos no Nutriwork Plus" onClick={() => setView('cursos')}>
                <img src="/assets/nutriwork-banner-pc.webp" alt="" width="2000" height="590" loading="eager" fetchPriority="high" decoding="async" />
                <span className="pp-banner__shade" aria-hidden="true" />
                <span className="pp-banner__action"><PreviewIcon name="play" /> Retomar estudos</span>
              </button>

              <div className="pp-columns">
                <section className="pp-block">
                  <div className="pp-section__head"><h3>Continue assistindo</h3><button type="button" className="pp-link" onClick={() => setView('cursos')}>Ver tudo</button></div>
                  <div className="pp-rail">
                    {courses.slice(0, 3).map((course, index) => (
                      <CourseCard key={course.id} course={course} spotlight={index === spotlight} active={course.id === selectedCourse} onOpen={() => openCourse(course.id)} />
                    ))}
                  </div>
                </section>

                <aside className="pp-side">
                  <MiniCalendar calendar={calendar} />
                  <AgendaList agenda={agenda} />
                </aside>
              </div>
            </section>
          )}

          {view === 'cursos' && (
            <section className="pp-view" aria-label="Meus cursos">
              <header className="pp-view__head"><h2>Meus cursos</h2><p>Sua trilha completa de Nutrição.</p></header>
              <div className="pp-grid pp-grid--courses">
                {courses.map((course) => <CourseCard key={course.id} course={course} active={course.id === selectedCourse} onOpen={() => setSelectedCourse(course.id)} />)}
              </div>
            </section>
          )}

          {view === 'agenda' && (
            <section className="pp-view" aria-label="Agenda">
              <header className="pp-view__head"><h2>Agenda</h2><p>Próximos eventos e lembretes.</p></header>
              <div className="pp-columns pp-columns--agenda">
                <MiniCalendar calendar={calendar} />
                <div className="pp-side">
                  <AgendaList agenda={agenda} />
                  <TaskList />
                </div>
              </div>
            </section>
          )}

          {view === 'suporte' && (
            <section className="pp-view pp-support" aria-label="Suporte">
              <header className="pp-view__head"><h2>Suporte</h2><p>Precisa de ajuda? A equipe responde rápido.</p></header>
              <div className="pp-support__cards">
                <article><span className="pp-kpi__icon"><PreviewIcon name="headset" /></span><strong>Central de ajuda</strong><p>Dúvidas sobre acesso, módulos e trilhas.</p></article>
                <article><span className="pp-kpi__icon"><PreviewIcon name="play" /></span><strong>Como começar</strong><p>Siga o módulo “O começo” e ative sua trilha.</p></article>
              </div>
              <div className="pp-support__contacts" aria-label="Contatos de suporte">
                {supportContacts.map((contact) => (
                  <a key={contact.label} href={contact.href} target={contact.href.startsWith('http') ? '_blank' : undefined} rel={contact.href.startsWith('http') ? 'noreferrer' : undefined}>
                    <span className="pp-kpi__icon"><PreviewIcon name={contact.icon} /></span>
                    <span><small>{contact.label}</small><strong>{contact.value}</strong></span>
                  </a>
                ))}
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

function CourseCard({ course, spotlight = false, active = false, onOpen }: { course: typeof courses[number]; spotlight?: boolean; active?: boolean; onOpen: () => void }) {
  return (
    <article className={`pp-course pp-course--${course.id} ${spotlight ? 'is-spotlight' : ''} ${active ? 'is-active' : ''}`}>
      <span className="pp-course__cover" style={{ backgroundImage: `linear-gradient(180deg, rgba(8, 16, 34, .08), rgba(6, 12, 28, .58)), url(${course.image})` }}>
        {spotlight && <img src={course.image} alt="" loading="eager" fetchPriority="high" decoding="async" aria-hidden="true" />}
        <Brand className="pp-course__brand" />
      </span>
      <div className="pp-course__body">
        <span className="pp-course__cat">{course.category}</span>
        <strong className="pp-course__title">{course.title}</strong>
        <span className="pp-bar pp-bar--anim" style={{ ['--p' as string]: `${course.progress}%` }}><i /></span>
        <div className="pp-course__foot">
          <span>{course.progress}%</span>
          <button type="button" className="pp-btn pp-btn--sm" onClick={onOpen}>{course.progress === 100 ? 'Revisar' : active ? 'Aberto' : 'Continuar'}<PreviewIcon name="arrow" /></button>
        </div>
      </div>
    </article>
  );
}

function MiniCalendar({ calendar }: { calendar: ReturnType<typeof getCalendarData> }) {
  return (
    <article className="pp-calendar">
      <div className="pp-calendar__head"><PreviewIcon name="calendar" /><strong>{calendar.label}</strong></div>
      <div className="pp-calendar__grid">
        {weekDays.map((day, index) => <span key={`w${index}`} className="pp-calendar__wd">{day}</span>)}
        {Array.from({ length: calendar.monthOffset }, (_, i) => <span key={`o${i}`} />)}
        {calendar.monthDays.map((day) => (
          <span key={day} className={`pp-calendar__day ${day === calendar.today ? 'is-today' : ''} ${calendar.eventDays.has(day) ? 'has-event' : ''}`}>{day}</span>
        ))}
      </div>
    </article>
  );
}

function AgendaList({ agenda }: { agenda: ReturnType<typeof getAgenda> }) {
  return (
    <article className="pp-agenda">
      <div className="pp-section__head"><h3>Próximas aulas</h3></div>
      <ul>
        {agenda.map((item) => (
          <li key={item.title}>
            <span className="pp-agenda__time">{item.time}</span>
            <span className="pp-agenda__title">{item.title}</span>
            <span className="pp-agenda__tag">{item.tag}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

function TaskList() {
  return (
    <article className="pp-tasks">
      <div className="pp-section__head"><h3>Lembretes</h3></div>
      <ul>
        {tasks.map((task) => (
          <li key={task.text} className={task.done ? 'is-done' : ''}>
            <span className="pp-tasks__check">{task.done && <PreviewIcon name="check" />}</span>
            {task.text}
          </li>
        ))}
      </ul>
    </article>
  );
}

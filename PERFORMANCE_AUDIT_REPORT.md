# Performance Audit Report

## Backup

- Estado inicial preservado no branch local `backup/performance-audit-bde5d45`.
- Commit base auditado: `bde5d45`.

## Principais gargalos encontrados

- `public/assets/nutriwork-banner-pc.png` tinha cerca de 1.4 MB e era exibido pequeno dentro do mockup da plataforma.
- A galeria de eventos de Parceiros era importada no bundle principal, mesmo sendo usada apenas na rota `#/parceiros`.
- Os carrosseis de referencias e cursos mantinham loops de `requestAnimationFrame` ativos mesmo quando estavam fora da viewport.
- Algumas imagens abaixo da dobra nao declaravam `loading`, `decoding`, `width` e `height`, aumentando risco de carregamento antecipado e layout shift.
- Havia assets versionados sem uso no app: `platform-dashboard.jpg` e `public/assets/references-cutout/*`.
- Havia CSS legado de uma versao antiga do dashboard/video que nao tinha mais JSX correspondente.

## Mudancas feitas

- Convertido `nutriwork-banner-pc.png` para `nutriwork-banner-pc.webp`.
  - Antes: 1,408,995 bytes.
  - Depois: 83,616 bytes.
- Atualizado o mockup da plataforma para usar o WebP otimizado com dimensoes explicitas.
- Movido `PartnersEventsGallery` para lazy loading via `React.lazy`, separando JS e CSS da galeria do bundle inicial.
- Pausada a animacao automatica do carrossel de cursos quando ele esta fora da viewport.
- Pausada a animacao automatica do carrossel de referencias quando ele esta fora da viewport.
- Adicionado `loading="lazy"` e `decoding="async"` em imagens abaixo da dobra.
- Adicionadas dimensoes explicitas em imagens relevantes para reduzir risco de CLS.
- Removidos assets mortos:
  - `public/assets/nutriwork-banner-pc.png`
  - `public/assets/platform-dashboard.jpg`
  - `public/assets/references-cutout/*`
- Removidos seletores e tokens CSS mortos relacionados a `dashboard-shell`, `dashboard-video`, `dashboard-lights`, `video-controls` e `video-control`.
- Evitado re-render do destaque automatico do mockup quando a aba do navegador esta oculta.

## Arquivos alterados

- `src/App.tsx`
- `src/components/PlatformPreview.tsx`
- `src/components/ReferencesSection.tsx`
- `src/styles.css`
- `public/assets/nutriwork-banner-pc.webp`
- `PERFORMANCE_AUDIT_REPORT.md`
- Assets mortos removidos em `public/assets`.

## Metricas observadas

### Assets publicos

- Antes: cerca de 7,131 KB.
- Depois: cerca de 4,837 KB.
- Reducao aproximada: 2,294 KB.

### Build Vite

Antes da auditoria:

- `index` CSS: 133.86 KB.
- `index` JS: 211.93 KB.

Depois da primeira rodada:

- `index` CSS: 129.99 KB.
- `index` JS: 209.22 KB.
- Novo chunk sob demanda:
  - `PartnersEventsGallery` CSS: 3.87 KB.
  - `PartnersEventsGallery` JS: 3.79 KB.

Depois da segunda rodada:

- `index` CSS: 128.03 KB.
- `index` JS: 209.23 KB.

## Validacao

- `tsc --noEmit -p tsconfig.app.json`: passou.
- `vite build`: passou.
- `npm run lint`: nao executado porque o projeto nao possui script `lint`.
- `npm run typecheck`: nao existe como script separado; o typecheck foi executado diretamente via `tsc`.
- Servidor local respondeu `200` em `http://127.0.0.1:4173/`.
- Asset novo `http://127.0.0.1:4173/assets/nutriwork-banner-pc.webp` respondeu `200`.

## Limitacoes

- Lighthouse/PageSpeed nao foi executado porque nao ha ferramenta configurada no projeto e o ambiente esta com rede restrita.
- A tentativa de validacao visual via Chrome headless falhou por erro de GPU do ambiente antes de renderizar as rotas.

## Riscos e trade-offs

- O visual foi preservado: a troca do banner manteve a mesma proporcao e fonte visual, apenas em WebP comprimido.
- Os carrosseis continuam interativos; apenas deixam de gastar animacao continua quando estao longe da viewport.
- Os assets removidos foram removidos apenas apos busca confirmar ausencia de referencias no app.

## Proximos passos recomendados

- Rodar Lighthouse em ambiente local com Chrome funcional para medir LCP, INP, CLS e TBT reais.
- Considerar conversao futura de imagens `.jpg` abaixo da dobra para WebP, em uma etapa separada e visualmente revisada.
- Avaliar lazy loading adicional para secoes grandes da Home se o projeto crescer, mantendo cuidado para nao atrasar conteudo critico.

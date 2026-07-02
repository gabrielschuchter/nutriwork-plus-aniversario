import { brazilMapViewBox, brazilStates } from '../data/brazilStates';

interface BrazilMapProps {
  className?: string;
  /**
   * Camada de marcadores. Mantida vazia por enquanto: a estrutura já está pronta
   * para receber, futuramente, marcadores de parceiros e eventos posicionados
   * com as coordenadas `anchor` (centroide de cada estado, no espaço do viewBox).
   */
  children?: React.ReactNode;
}

/**
 * Mapa do Brasil em SVG com os 27 estados individualmente identificáveis
 * (cada `path` tem `id`, `data-uf` e `data-name`). A camada `.brazil-map__markers`
 * compartilha o mesmo sistema de coordenadas dos estados, permitindo sobrepor
 * marcadores no futuro sem refatorar o componente.
 */
export default function BrazilMap({ className = '', children }: BrazilMapProps) {
  return (
    <div className={`brazil-map ${className}`.trim()}>
      <svg
        className="brazil-map__svg"
        viewBox={brazilMapViewBox}
        role="img"
        aria-labelledby="brazil-map-title brazil-map-desc"
        preserveAspectRatio="xMidYMid meet"
      >
        <title id="brazil-map-title">Mapa do Brasil</title>
        <desc id="brazil-map-desc">
          Mapa do Brasil com os 27 estados, base da rede de parceiros e eventos Nutriwork.
        </desc>
        <g className="brazil-map__states">
          {brazilStates.map((state) => (
            <path
              key={state.uf}
              id={`br-${state.uf.toLowerCase()}`}
              className="brazil-map__state"
              data-uf={state.uf}
              data-name={state.name}
              d={state.path}
            >
              <title>{state.name}</title>
            </path>
          ))}
        </g>
        <g className="brazil-map__markers" aria-hidden="true">
          {children}
        </g>
      </svg>
    </div>
  );
}

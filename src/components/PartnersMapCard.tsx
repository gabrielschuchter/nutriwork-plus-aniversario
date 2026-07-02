import { brazilStates } from '../data/brazilStates';
import BrazilMap from './BrazilMap';
import type { CSSProperties } from 'react';

type MapPoint = {
  uf: string;
  label: string;
  x: number;
  y: number;
};

const hub: MapPoint = {
  uf: 'MG',
  label: 'Sede Nutriwork — Uberlândia, MG',
  x: 416,
  y: 369
};

const destinationUfs = ['RS', 'PR', 'SC', 'SP', 'RJ', 'MT', 'DF'];

const destinations: MapPoint[] = destinationUfs
  .map((uf) => {
    const state = brazilStates.find((item) => item.uf === uf);
    if (!state) return undefined;

    return {
      uf,
      label: `Vínculo — ${state.name}`,
      x: state.anchor.x,
      y: state.anchor.y
    };
  })
  .filter((point): point is MapPoint => Boolean(point));

function routePath(destination: MapPoint) {
  const dx = destination.x - hub.x;
  const dy = destination.y - hub.y;
  const curve = Math.min(Math.max(Math.abs(dx) * 0.34 + Math.abs(dy) * 0.16, 28), 72);
  const lift = destination.y > hub.y ? -curve : curve * 0.58;

  const c1x = hub.x + dx * 0.32;
  const c1y = hub.y + dy * 0.16 + lift;
  const c2x = hub.x + dx * 0.72;
  const c2y = hub.y + dy * 0.84 - lift * 0.32;

  return `M ${hub.x} ${hub.y} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${destination.x} ${destination.y}`;
}

function PartnersNetworkOverlay() {
  return (
    <g className="partners-network" aria-label="Conexões da sede Nutriwork em Uberlândia para estados parceiros">
      <g className="partners-network__routes">
        {destinations.map((destination, index) => (
          <path
            className="partners-network__route"
            d={routePath(destination)}
            key={`route-${destination.uf}`}
            style={{ '--route-index': index } as CSSProperties}
          >
            <title>{`${hub.label} para ${destination.label}`}</title>
          </path>
        ))}
      </g>
      <g className="partners-network__pins">
        {destinations.map((destination) => (
          <g className="partners-network__pin partners-network__pin--destination" key={destination.uf} transform={`translate(${destination.x} ${destination.y})`}>
            <title>{destination.label}</title>
            <circle className="partners-network__pin-glow" r="9" />
            <circle className="partners-network__pin-core" r="4.3" />
            <circle className="partners-network__pin-dot" r="1.5" />
          </g>
        ))}
        <g className="partners-network__pin partners-network__pin--hub" transform={`translate(${hub.x} ${hub.y})`}>
          <title>{hub.label}</title>
          <circle className="partners-network__hub-pulse" r="15" />
          <circle className="partners-network__pin-glow" r="12" />
          <circle className="partners-network__pin-core" r="6.2" />
          <circle className="partners-network__pin-dot" r="2.2" />
        </g>
      </g>
    </g>
  );
}

export default function PartnersMapCard() {
  return (
    <article className="partners-map-card" aria-labelledby="partners-map-title">
      <div className="partners-map-card__copy">
        <h2 id="partners-map-title">Parceiros em todo o Brasil</h2>
        <p>Conectamos empresas, instituições e especialistas em uma rede nacional de colaboração.</p>
      </div>
      <BrazilMap className="partners-map-card__visual">
        <PartnersNetworkOverlay />
      </BrazilMap>
      <p className="partners-map-card__meta"><span>{brazilStates.length}</span> estados prontos para a rede de parceiros</p>
    </article>
  );
}

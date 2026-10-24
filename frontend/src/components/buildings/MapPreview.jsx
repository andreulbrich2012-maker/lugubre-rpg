import TileMapCanvas from '../vtt/TileMapCanvas';
import BuildingSprite from './BuildingSprite';

// Mapa em miniatura com as construcoes do catalogo por cima (ordem pela linha de baixo).
// viewport (opcional, px do conteudo): mapa grande so desenha e so monta as casas da vista.
// De muito longe (celula < 6 px) as casas viram blocos no proprio canvas (nada de mil canvas).
export default function MapPreview({ map, cellSize = 12, viewport }) {
  const far = cellSize < 6;
  const pad = 400;
  const near = (b) => !viewport || ((b.x + b.w) * cellSize > viewport.x - pad && b.x * cellSize < viewport.x + viewport.w + pad
    && (b.y + b.h) * cellSize > viewport.y - pad && (b.y - 6) * cellSize < viewport.y + viewport.h + pad);
  const list = far ? [] : (map.buildings || []).filter((b) => b.design && near(b)).sort((a, b) => a.y + a.h - b.y - b.h);
  return (
    <div className="relative w-max">
      <TileMapCanvas map={map} cellSize={cellSize} viewport={viewport} buildingBlocks={far} />
      {list.map((b) => <BuildingSprite key={b.id} building={b} tiles={map} scale={cellSize / 16} placed className="pointer-events-none" />)}
    </div>
  );
}

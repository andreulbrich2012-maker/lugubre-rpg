import { useEffect, useMemo, useRef } from 'react';
import { buildingPixels } from '../../lib/buildings';

// Desenho da construcao (kit) num canvas no tamanho nativo; o CSS amplia nitido.
// scale = px de tela por px de arte. Usado na galeria e no editor de mapa.
// placed: posiciona sozinho sobre a pegada (building.x/y) num mapa de celula = 16 * scale.
export default function BuildingSprite({ building, tiles, light = 'dia', scale = 1, placed = false, className = '', style }) {
  const ref = useRef(null);
  const img = useMemo(() => buildingPixels(building, tiles, { light }), [building, tiles, light]);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    c.width = img.width;
    c.height = img.height;
    c.getContext('2d').putImageData(new ImageData(img.data, img.width, img.height), 0, 0);
  }, [img]);
  return <canvas ref={ref} aria-hidden="true" className={`pixelated ${className}`} style={{ width: img.width * scale, height: img.height * scale, imageRendering: 'pixelated', ...(placed ? { position: 'absolute', left: (building.x * 16 + (img.offsetX || 0)) * scale, top: (building.y * 16 + img.offsetY) * scale } : {}), ...style }} />;
}

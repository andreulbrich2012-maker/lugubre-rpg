import { useEffect, useState } from 'react';
import GlassD20 from '../glass/GlassD20';

// So envolve o resultado que a ficha ja mostra: quando a rolagem muda, o d20 de vidro gira um instante e assenta no numero natural.
export default function RollGlass({ roll, value, sides = 20, size = 84 }) {
  const [rolling, setRolling] = useState(false);
  useEffect(() => {
    if (!roll) return undefined;
    setRolling(true);
    const timer = setTimeout(() => setRolling(false), 650);
    return () => clearTimeout(timer);
  }, [roll]);
  if (value == null) return null;
  return <GlassD20 value={value} sides={sides} size={size} rolling={rolling} />;
}

import { Download } from 'lucide-react';
import Button from '../Button';

export default function MonsterPngDownloadButton({ monster, onWarning }) {
  function downloadToken() {
    const url = monster.token_url || monster.image_url;
    if (!url) {
      onWarning('Este monstro ainda não possui imagem para download.');
      return;
    }
    const link = document.createElement('a');
    link.href = url;
    link.download = `${monster.name || 'monstro'}.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  return (
    <Button type="button" variant="ghost" className="w-full px-3 py-1.5 text-sm sm:w-auto" onClick={downloadToken}>
      <span className="inline-flex items-center gap-2"><Download size={15} /> Baixar PNG</span>
    </Button>
  );
}

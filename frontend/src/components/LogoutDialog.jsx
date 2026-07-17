import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { LogOut, X } from 'lucide-react';
import Alert from './Alert';
import Button from './Button';
import LoadingButton from './LoadingButton';

const FOCUSABLE_SELECTOR = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function LogoutDialog({ open, onClose, onConfirm }) {
  const dialogRef = useRef(null);
  const cancelRef = useRef(null);
  const previousFocusRef = useRef(null);
  const loadingRef = useRef(false);
  const onCloseRef = useRef(onClose);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  loadingRef.current = loading;
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return undefined;
    previousFocusRef.current = document.activeElement;
    setError('');
    cancelRef.current?.focus();

    const onKeyDown = (event) => {
      if (event.key === 'Escape' && !loadingRef.current) {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = [...(dialogRef.current?.querySelectorAll(FOCUSABLE_SELECTOR) || [])];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previousFocusRef.current?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  async function confirmLogout() {
    if (loading) return;
    setLoading(true);
    setError('');
    try {
      await onConfirm();
    } catch {
      setError('Não foi possível encerrar a sessão. Tente novamente.');
      setLoading(false);
    }
  }

  function requestClose() {
    if (!loading) onClose();
  }

  return createPortal(
    <div className="fixed inset-0 z-[1200] grid place-items-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) requestClose(); }}>
      <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="logout-dialog-title" aria-describedby="logout-dialog-description" className="gothic-panel w-full max-w-md rounded-md p-5 shadow-2xl sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md border border-red-400/30 bg-red-950/35 text-red-200"><LogOut size={20} /></span>
            <div>
              <h2 id="logout-dialog-title" className="font-display text-2xl text-white">Encerrar sessão?</h2>
              <p id="logout-dialog-description" className="mt-2 text-sm leading-relaxed text-mist">Você realmente deseja sair da sua conta?</p>
            </div>
          </div>
          <button type="button" aria-label="Fechar confirmação de logout" className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-ember/20 text-mist hover:border-ember/45 hover:text-white disabled:cursor-not-allowed disabled:opacity-50" onClick={requestClose} disabled={loading}><X size={18} /></button>
        </div>
        {error && <div className="mt-4"><Alert type="error">{error}</Alert></div>}
        <div className="mt-6 grid gap-2 sm:grid-cols-2 sm:justify-end">
          <Button ref={cancelRef} type="button" variant="ghost" className="w-full" onClick={requestClose} disabled={loading}>Cancelar</Button>
          <LoadingButton type="button" loading={loading} loadingText="Encerrando..." className="w-full border-red-800/70 bg-red-900/80 hover:bg-red-800" onClick={confirmLogout}>Sair da conta</LoadingButton>
        </div>
      </section>
    </div>,
    document.body
  );
}

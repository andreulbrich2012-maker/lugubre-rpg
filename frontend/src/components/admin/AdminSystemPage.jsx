import { useEffect, useState } from 'react';
import { Database, Download, ShieldCheck } from 'lucide-react';
import Button from '../Button';
import { api } from '../../lib/api';

// Sistema: copia de seguranca do banco (baixada no PC do admin) e atualizacao para a v2.
// A atualizacao so libera depois da copia, para nenhum dado se perder (23/10, pedido do Andre).
export default function AdminSystemPage() {
  const [status, setStatus] = useState(null);
  const [progress, setProgress] = useState('');
  const [backedUp, setBackedUp] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => api.get('/admin/system/status').then(({ data }) => setStatus(data)).catch((err) => setError(err.response?.data?.message || 'Não foi possível ler o banco.'));
  useEffect(() => { load(); }, []);

  async function backup() {
    setBusy(true);
    setError('');
    try {
      const dump = { created_at: new Date().toISOString(), tables: {} };
      for (const t of status.tables) {
        const rows = [];
        for (let offset = 0; offset < t.rows; offset += 25) {
          setProgress(`Copiando ${t.name}: ${Math.min(offset + 25, t.rows)} de ${t.rows}`);
          const { data } = await api.get(`/admin/system/backup/${t.name}`, { params: { offset, limit: 25 } });
          rows.push(...data.rows);
        }
        dump.tables[t.name] = rows;
      }
      const blob = new Blob([JSON.stringify(dump)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lugubre-backup-${dump.created_at.slice(0, 19).replace(/[:T]/g, '-')}.json`;
      a.click();
      URL.revokeObjectURL(url);
      const total = Object.values(dump.tables).reduce((n, r) => n + r.length, 0);
      setProgress(`Cópia baixada: ${total} registros de ${status.tables.length} tabelas.`);
      setBackedUp(true);
    } catch (err) {
      setError(err.response?.data?.message || 'A cópia falhou. Nada foi alterado.');
    } finally {
      setBusy(false);
    }
  }

  async function migrate() {
    setBusy(true);
    setError('');
    try {
      const { data } = await api.post('/admin/system/migrate', { confirm: 'ATUALIZAR' }, { timeout: 70000 });
      setResult(data);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'A atualização falhou. Os dados continuam lá; a cópia está no seu PC.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="gothic-panel max-w-3xl p-5">
      <h2 className="flex items-center gap-2 font-display text-3xl text-bone"><Database size={24} className="text-ember" /> Banco de dados</h2>
      {!status && !error && <p className="mt-3 text-mist">Lendo o banco…</p>}
      {status && (
        <>
          <p className="mt-2 text-mist">
            {status.tables.length} tabelas, {status.tables.reduce((n, t) => n + t.rows, 0)} registros.
            {status.v2 ? ' Banco já está na versão 2.' : ' Banco ainda na versão 1: precisa atualizar para a mesa virtual e o livro funcionarem.'}
          </p>
          <ol className="mt-5 space-y-4">
            <li className="border-[3px] border-lead p-4">
              <p className="font-bold text-bone">1. Cópia de segurança</p>
              <p className="text-sm text-mist">Baixa todos os dados (contas, fichas, campanhas…) num arquivo para o seu computador.</p>
              <Button className="mt-3" onClick={backup} disabled={busy}><Download size={16} /> Baixar cópia de segurança</Button>
            </li>
            <li className={`border-[3px] border-lead p-4 ${backedUp ? '' : 'opacity-60'}`}>
              <p className="font-bold text-bone">2. Atualizar para a versão 2</p>
              <p className="text-sm text-mist">Só acrescenta tabelas e colunas novas e carrega o livro de regras. Não apaga nada.</p>
              <Button className="mt-3" onClick={migrate} disabled={busy || !backedUp}><ShieldCheck size={16} /> Atualizar banco</Button>
              {!backedUp && <p className="mt-2 text-sm text-mist">Libera depois da cópia de segurança.</p>}
            </li>
          </ol>
        </>
      )}
      {progress && <p className="mt-4 text-sm text-ember" aria-live="polite">{progress}</p>}
      {result && <p className="mt-4 lit border-[3px] border-lead p-3">Banco atualizado: {result.statements} comandos aplicados, livro com {result.rules?.total} seções ({result.rules?.inserted} novas).</p>}
      {error && <p className="mt-4 text-red-200" role="alert">{error}</p>}
    </section>
  );
}

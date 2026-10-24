import { Fragment } from 'react';

// Markdown minimo do livro de regras, montado como elementos React (sem innerHTML, entao sem XSS).
// Cobre o que o livro usa: titulos, paragrafos, negrito/italico, listas, tabelas, citacao, imagem e regra.

function inline(text, keyBase = 'i') {
  const out = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|_[^_]+_|`[^`]+`|!\[[^\]]*\]\([^)]+\)|\[[^\]]+\]\([^)]+\))/g;
  let last = 0;
  let m;
  let n = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const t = m[0];
    const key = `${keyBase}-${n++}`;
    if (t.startsWith('**')) out.push(<strong key={key} className="font-bold text-bone">{t.slice(2, -2)}</strong>);
    else if (t.startsWith('`')) out.push(<code key={key} className="bg-black/50 px-1 text-ember">{t.slice(1, -1)}</code>);
    else if (t.startsWith('![')) {
      const [, alt, src] = t.match(/!\[([^\]]*)\]\(([^)]+)\)/);
      out.push(<img key={key} src={src} alt={alt} loading="lazy" className="my-4 border-4 border-lead" />);
    } else if (t.startsWith('[')) {
      const [, label, href] = t.match(/\[([^\]]+)\]\(([^)]+)\)/);
      const safe = /^(https?:|\/|#)/.test(href) ? href : '#';
      out.push(<a key={key} href={safe} className="text-ember underline">{label}</a>);
    } else out.push(<em key={key}>{t.slice(1, -1)}</em>);
    last = m.index + t.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function slugify(text) {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export function renderMarkdown(md = '') {
  const lines = md.replace(/\r/g, '').split('\n');
  const blocks = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i += 1; continue; }
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      const level = Math.min(h[1].length + 1, 4);
      const Tag = `h${level}`;
      const size = level === 2 ? 'text-3xl mt-10' : level === 3 ? 'text-2xl mt-8' : 'text-xl mt-6';
      blocks.push(<Tag key={i} id={slugify(h[2])} className={`font-display text-bone ${size} mb-3 scroll-mt-28`}>{inline(h[2], `h${i}`)}</Tag>);
      i += 1;
      continue;
    }
    if (/^(-{3,}|\*{3,})$/.test(line.trim())) { blocks.push(<div key={i} className="lead-rule my-8" />); i += 1; continue; }
    if (line.trim().startsWith('|')) {
      const rows = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) { rows.push(lines[i]); i += 1; }
      const cells = rows.filter((r) => !/^\|?\s*:?-{2,}/.test(r.trim().replace(/^\|/, ''))).map((r) => r.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim()));
      const [head, ...body] = cells;
      blocks.push(
        <div key={i} className="my-6 overflow-x-auto border-[3px] border-lead">
          <table className="w-full border-collapse text-left tabular">
            <thead className="bg-black/50"><tr>{head.map((c, k) => <th key={k} className="border-b-[3px] border-lead px-3 py-2 font-bold text-ember">{inline(c, `th${i}${k}`)}</th>)}</tr></thead>
            <tbody>{body.map((r, rk) => <tr key={rk} className="odd:bg-white/[.02]">{r.map((c, k) => <td key={k} className="border-t border-lead px-3 py-2 align-top">{inline(c, `td${i}${rk}${k}`)}</td>)}</tr>)}</tbody>
          </table>
        </div>
      );
      continue;
    }
    if (/^\s*([-*•◆]|\d+[.)])\s+/.test(line)) {
      const ordered = /^\s*\d+[.)]/.test(line);
      const items = [];
      while (i < lines.length && /^\s*([-*•◆]|\d+[.)])\s+/.test(lines[i])) { items.push(lines[i].replace(/^\s*([-*•◆]|\d+[.)])\s+/, '')); i += 1; }
      const Tag = ordered ? 'ol' : 'ul';
      blocks.push(<Tag key={i} className={`my-4 space-y-1.5 pl-6 ${ordered ? 'list-decimal' : 'list-[square]'} marker:text-ember`}>{items.map((it, k) => <li key={k}>{inline(it, `li${i}${k}`)}</li>)}</Tag>);
      continue;
    }
    if (line.startsWith('>')) {
      const quote = [];
      while (i < lines.length && lines[i].startsWith('>')) { quote.push(lines[i].replace(/^>\s?/, '')); i += 1; }
      blocks.push(<blockquote key={i} className="my-6 border-y-[3px] border-lead bg-black/30 px-5 py-4 text-bone">{inline(quote.join(' '), `q${i}`)}</blockquote>);
      continue;
    }
    const para = [];
    while (i < lines.length && lines[i].trim() && !/^(#{1,6}\s|\||>|\s*([-*•◆]|\d+[.)])\s)/.test(lines[i])) { para.push(lines[i]); i += 1; }
    const text = para.join(' ');
    // Linha toda em maiusculas com "=" e formula do livro: destaca como regra.
    const isRule = /=/.test(text) && text === text.toUpperCase() && text.length < 140;
    blocks.push(isRule
      ? <p key={i} className="my-5 border-[3px] border-lead bg-black/40 px-4 py-3 font-bold tracking-wide text-ember tabular">{inline(text, `p${i}`)}</p>
      : <p key={i} className="my-4">{inline(text, `p${i}`)}</p>);
  }
  return <Fragment>{blocks}</Fragment>;
}

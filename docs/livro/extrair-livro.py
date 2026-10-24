#!/usr/bin/env python3
"""Extrai o Livro de Regras (.docx) para Markdown, sem dependencias externas.

Uso: python3 docs/livro/extrair-livro.py <livro.docx> [saida.md] [pasta-imagens]

- Titulo 1/2/3 viram '#', '##', '###'.
- Capitulares (drop caps) sao juntadas ao paragrafo seguinte.
- Negrito/italico preservados; '◆' vira lista; quadros sombreados viram citacao.
- Linhas de progressao 'N1: V 30, M 10, S 18 | ...' viram tabela.
- A capa (image1) e exportada como capa.webp se ffmpeg existir.
"""
import html
import re
import shutil
import subprocess
import sys
import tempfile
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
src = Path(sys.argv[1])
out = Path(sys.argv[2]) if len(sys.argv) > 2 else ROOT / 'docs/livro/livro-0.5-beta-v2.md'
img_dir = Path(sys.argv[3]) if len(sys.argv) > 3 else ROOT / 'frontend/public/images/livro'

with zipfile.ZipFile(src) as z:
    doc = z.read('word/document.xml').decode('utf8')
    cover = z.read('word/media/image1.png') if 'word/media/image1.png' in z.namelist() else None

body = doc[doc.find('<w:body>'):]
paragraphs = re.findall(r'<w:p[ >].*?</w:p>|<w:p/>', body, re.S)


def run_text(run):
    parts = []
    for m in re.finditer(r'<w:t(?: [^>]*)?>(.*?)</w:t>|<w:tab/>|<w:br/>', run, re.S):
        parts.append(html.unescape(m.group(1)) if m.group(1) is not None else ' ')
    return ''.join(parts)


def flag(rpr, tag):
    return bool(re.search(rf'<w:{tag}/>|<w:{tag} w:val="(?:1|true)"/>', rpr))


def para(p):
    ppr = (re.search(r'<w:pPr>.*?</w:pPr>', p, re.S) or [''])[0] if '<w:pPr>' in p else ''
    style = re.search(r'<w:pStyle w:val="([^"]+)"', ppr)
    runs = []
    for r in re.findall(r'<w:r[ >].*?</w:r>', p, re.S):
        rpr = (re.search(r'<w:rPr>.*?</w:rPr>', r, re.S) or [''])[0] if '<w:rPr>' in r else ''
        text = run_text(r)
        if not text:
            continue
        b, i = flag(rpr, 'b'), flag(rpr, 'i')
        if runs and runs[-1][1:] == (b, i):
            runs[-1] = (runs[-1][0] + text, b, i)
        else:
            runs.append((text, b, i))
    return {
        'style': style.group(1) if style else '',
        'dropcap': 'w:dropCap' in ppr,
        'boxed': '<w:shd ' in ppr and '<w:pBdr>' in ppr,
        'runs': runs,
        'plain': ''.join(t for t, _, _ in runs).strip(),
    }


def md_inline(runs, keep_format=True):
    out = []
    for text, b, i in runs:
        if not keep_format or not text.strip():
            out.append(text)
            continue
        lead = text[:len(text) - len(text.lstrip())]
        trail = text[len(text.rstrip()):]
        core = text.strip()
        if b and i:
            core = f'***{core}***'
        elif b:
            core = f'**{core}**'
        elif i:
            core = f'*{core}*'
        out.append(lead + core + trail)
    s = ''.join(out).strip()
    return re.sub(r'\*\*\s*\*\*', ' ', s)


PROG = re.compile(r'N(\d+):\s*V\s*(\d+),\s*M\s*(\d+),\s*S\s*(\d+)')

blocks = []          # lista de strings markdown
pending_drop = ''    # letra capitular
box = None           # linhas do quadro atual
prog_rows = None     # linhas da tabela de progressao


def flush_box():
    global box
    if box:
        blocks.append('\n>\n'.join('> ' + line for line in box))
    box = None


def flush_prog():
    global prog_rows
    if prog_rows:
        lines = ['| Nível | Vida | Mana | Sanidade |', '| ---: | ---: | ---: | ---: |']
        lines += [f'| {n} | {v} | {m} | {s} |' for n, v, m, s in prog_rows]
        blocks.append('\n'.join(lines))
    prog_rows = None


if cover:
    blocks.append('![Capa do Livro de Regras de Lúgubre RPG](/images/livro/capa.webp)')

for raw in paragraphs:
    p = para(raw)
    if not p['plain']:
        continue
    if p['dropcap']:
        pending_drop += p['plain']
        continue
    heading = re.fullmatch(r'Heading([123])', p['style'])
    if heading:
        flush_box(); flush_prog()
        blocks.append('#' * int(heading.group(1)) + ' ' + p['plain'])
        continue

    rows = PROG.findall(p['plain'])
    if rows and re.fullmatch(r'(?:\s*\|?\s*N\d+:\s*V\s*\d+,\s*M\s*\d+,\s*S\s*\d+\s*)+', p['plain']):
        flush_box()
        prog_rows = (prog_rows or []) + rows
        continue
    flush_prog()

    text = md_inline(p['runs'])
    if pending_drop:
        # capitular: a letra solta + o resto da palavra no paragrafo seguinte
        first = p['runs'][0][0] if p['runs'] else ''
        text = pending_drop + (text if not first.startswith(' ') else ' ' + text)
        pending_drop = ''

    habilidades = '  •  ' in p['plain'] and re.match(r'Nível \d+:', p['plain'])
    if p['boxed'] and not habilidades:
        if box is None:
            box = [f"**{p['plain']}**"]   # primeira linha do quadro = titulo
        else:
            box.append(text)
        continue
    flush_box()

    if re.fullmatch(r'—\s*Ω\s*—', p['plain']):
        blocks.append('---')
    elif p['plain'].startswith('◆'):
        blocks.append('- ' + re.sub(r'^(\**)◆\s*', r'\1', text))
    elif '  •  ' in p['plain'] and re.match(r'Nível \d+:', p['plain']):
        blocks.append('\n'.join('- ' + part.strip() for part in p['plain'].split('•')))
    else:
        blocks.append(text)

flush_box(); flush_prog()

# junta itens de lista consecutivos num bloco so
merged = []
for b in blocks:
    if merged and b.startswith('- ') and merged[-1].startswith('- '):
        merged[-1] += '\n' + b
    else:
        merged.append(b)

out.write_text('\n\n'.join(merged) + '\n', encoding='utf8')
print(f'{out}: {len(merged)} blocos')

if cover and shutil.which('ffmpeg'):
    img_dir.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(suffix='.png') as tmp:
        tmp.write(cover); tmp.flush()
        subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', tmp.name, '-vf', 'scale=900:-1',
                        '-quality', '80', str(img_dir / 'capa.webp')], check=True)
    print(f"capa: {img_dir / 'capa.webp'}")

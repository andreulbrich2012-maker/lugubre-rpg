#!/usr/bin/env python3
"""Converte as partes HTML do Livro de Regras (versao 0.8 em diante) para o Markdown do site.

Uso: python3 docs/livro/html-para-md.py <pasta-partes> [saida.md]

- h1 vira '#', h2 '##', h3 '###' (sao as secoes da pagina Regras); h4 vira negrito.
- Tabelas viram tabelas Markdown; quadros e formulas viram citacao.
- Criaturas viram '###' com a linha de numeros; magias viram paragrafos em negrito.
- Capa, sumario, SVG (mapa) e figuras ficam de fora: o site nao mostra mapa.
"""
import re
import sys
from pathlib import Path

from bs4 import BeautifulSoup, NavigableString, Tag

ORDER = ['01-introducao', '02-mundo', '03-criacao', '04-classes', '06-regras',
         '05-magias', '06b-equipamentos', '07-criaturas', '08-mestre', '09-aventuras', '10-apendice']
SKIP_CLASSES = {'cap-num', 'omega', 'sub', 'epi', 'map-title', 'map-note', 'pb'}


def clean(text):
    return re.sub(r'\s+', ' ', text).strip()


def inline(node):
    if isinstance(node, NavigableString):
        return str(node)
    if not isinstance(node, Tag):
        return ''
    if node.name == 'br':
        return ' '
    inner = ''.join(inline(child) for child in node.children)
    if node.name in ('b', 'strong'):
        text = clean(inner)
        return f'**{text}**' if text else ''
    if node.name in ('i', 'em'):
        text = clean(inner)
        return f'*{text}*' if text else ''
    return inner


def text_of(node):
    return clean(inline(node)).replace('** **', ' ')


def table(node):
    rows = []
    for tr in node.find_all('tr'):
        cells = [text_of(c).replace('|', '/') for c in tr.find_all(['td', 'th'])]
        if cells:
            rows.append(cells)
    if not rows:
        return []
    width = max(len(r) for r in rows)
    rows = [r + [''] * (width - len(r)) for r in rows]
    out = ['| ' + ' | '.join(rows[0]) + ' |', '|' + '---|' * width]
    out += ['| ' + ' | '.join(r) + ' |' for r in rows[1:]]
    return out + ['']


def creature(node):
    name = text_of(node.select_one('.cr-name'))
    tier = text_of(node.select_one('.cr-tier')).capitalize()
    stats = ' · '.join(text_of(s) for s in node.select('.cr-stats span'))
    out = [f'### {name}', '', f'**{tier}** · {stats}' if tier else stats, '']
    for child in node.children:
        if isinstance(child, Tag) and not ({'cr-head', 'cr-stats'} & set(child.get('class', []))):
            out += block(child)
    return out


def spell(node):
    name = text_of(node.select_one('.sp-name'))
    circ = text_of(node.select_one('.sp-circ'))
    meta = text_of(node.select_one('.sp-meta'))
    out = [f'**{name}** ({circ})', '', f'*{meta}*', '']
    for p in node.find_all('p'):
        out += [text_of(p), '']
    return out


def block(node):
    if isinstance(node, NavigableString):
        text = clean(str(node))
        return [text, ''] if text else []
    if not isinstance(node, Tag) or node.name in ('svg', 'img', 'figure', 'style', 'script'):
        return []
    classes = set(node.get('class', []))
    if classes & SKIP_CLASSES:
        return []
    name = node.name
    if name in ('h1', 'h2', 'h3'):
        return [f"{'#' * int(name[1])} {text_of(node)}", '']
    if name in ('h4', 'h5'):
        return [f'**{text_of(node)}**', '']
    if name == 'p':
        text = text_of(node)
        return [text, ''] if text else []
    if name in ('ul', 'ol'):
        items = node.find_all('li', recursive=False)
        mark = (lambda i: f'{i + 1}.') if name == 'ol' else (lambda i: '-')
        return [f'{mark(i)} {text_of(li)}' for i, li in enumerate(items)] + ['']
    if name == 'table':
        return table(node)
    if 'creature' in classes:
        return creature(node)
    if 'spell' in classes:
        return spell(node)
    if 'formula' in classes:
        return [f'> {text_of(node)}', '']
    if 'box' in classes or 'quote' in classes:
        parts = []
        for child in node.children:
            if isinstance(child, Tag) and child.name in ('ul', 'ol'):
                parts += [text_of(li) for li in child.find_all('li')]
            elif isinstance(child, Tag) and child.name == 'table':
                return [line for c in node.children for line in block(c)]
            else:
                t = text_of(child) if isinstance(child, Tag) else clean(str(child))
                if t:
                    parts.append(f'**{t}**' if isinstance(child, Tag) and child.name in ('h3', 'h4', 'h5') and not t.startswith('**') else t)
        return [f"> {' '.join(parts)}", ''] if parts else []
    out = []
    for child in node.children:
        out += block(child)
    return out


def convert(folder):
    lines = [
        '## Sobre esta edição', '',
        'Este é o **Livro de Regras 0.8** do Lúgubre RPG, a versão de testes que veio depois do 0.5 Beta. '
        'Regras, números e textos podem mudar até a versão 1.0.', '',
        'Os atributos agora vêm prontos da raça, as perícias são 30, a Esquiva é uma reação '
        '(1d20 + AGI + Reflexos) e a Defesa é 10 + AGI + armadura + escudo.', '',
        'Habilidades de classe, rituais e o sistema de bloqueio ficam para as próximas versões.', ''
    ]
    for part in ORDER:
        soup = BeautifulSoup((Path(folder) / f'{part}.html').read_text(encoding='utf8'), 'html.parser')
        for child in soup.children:
            lines += block(child)
    md = '\n'.join(lines)
    md = re.sub(r'\n{3,}', '\n\n', md).strip() + '\n'
    # o site nao mostra mapa: o texto fala so das regioes
    md = md.replace('A seguir há um **mapa-base** com regiões geográficas, sem reinos. Use-o como está, mude o que quiser ou ignore-o por completo.',
                    'A seguir estão as regiões geográficas do mundo, sem reinos. Use-as como estão, mude o que quiser ou ignore-as por completo. O mapa fica a cargo da mesa.')
    md = md.replace('## Regiões do Mapa-base', '## Regiões do Mundo')
    return md


if __name__ == '__main__':
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    result = convert(sys.argv[1])
    if len(sys.argv) > 2:
        Path(sys.argv[2]).write_text(result, encoding='utf8')
    else:
        sys.stdout.write(result)

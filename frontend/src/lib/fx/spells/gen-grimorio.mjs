const root = process.argv[2];
const { SPELLS, SCHOOLS, DOMAINS, TIERS } = await import(`${root}/frontend/src/lib/fx/spells/catalog.js`);
const { writeFileSync } = await import('node:fs');
const L = [];
L.push('# Grimório', '');
L.push('Catálogo visual de magias do Lúgubre RPG. **Não é regra:** o livro ainda não define escolas, custos nem efeitos mecânicos de magia. Alvo, alcance e elemento são sugestões de cena, usadas para escolher animação e ícone. Um poder cadastrado com o mesmo nome (sem diferenciar acentos e maiúsculas) toca a animação daqui.', '');
L.push(`Fonte de dados: \`frontend/src/lib/fx/spells/catalog.js\`. ${SPELLS.length} magias em ${SCHOOLS.length} escolas, cada uma com animação própria. Para vê-las, abra **Grimório** no menu (rota \`/grimorio\`). Para ligar um poder a uma magia, ponha \`"animation": { "spell": "<id>" }\` no cadastro ou dê ao poder o mesmo nome (ver \`docs/ANIMACOES.md\`).`, '');
L.push('| Escola | Básica | Intermediária | Avançada | Lendária | Total |', '|---|---|---|---|---|---|');
for (const s of SCHOOLS) {
  const l = SPELLS.filter((x) => x.school === s.id);
  L.push(`| ${s.label} | ${[1, 2, 3, 4].map((t) => l.filter((x) => x.tier === t).length).join(' | ')} | ${l.length} |`);
}
L.push(`| **Total** | ${[1, 2, 3, 4].map((t) => SPELLS.filter((x) => x.tier === t).length).join(' | ')} | ${SPELLS.length} |`, '');
for (const d of DOMAINS) {
  L.push(`## ${d.label}`, '');
  for (const s of SCHOOLS.filter((x) => x.domain === d.id)) {
    L.push(`### ${s.label} (${s.title})`, '', `_${s.hint}_`, '');
    L.push('| Magia | Nível | Alvo | Alcance | Elemento | Efeito |', '|---|---|---|---|---|---|');
    for (const x of SPELLS.filter((y) => y.school === s.id)) {
      L.push(`| ${x.name} | ${TIERS.find((t) => t.id === x.tier).label} | ${x.target} | ${x.range} | ${x.element} | ${x.desc} |`);
    }
    L.push('');
  }
}
writeFileSync(`${root}/docs/GRIMORIO.md`, L.join('\n'));
console.log('ok', L.length);

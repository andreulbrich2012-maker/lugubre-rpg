#!/usr/bin/env bash
# Atualiza o banco de PRODUCAO do Lugubre RPG para a v2, sem perder dados.
# 1) faz copia de seguranca completa (pg_dump) em ~/lugubre-backups
# 2) aplica o schema (so cria tabelas/colunas novas) e carrega o livro de regras
# As senhas vem da Vercel para um arquivo temporario 0600 e sao apagadas no fim; nada e impresso.
set -euo pipefail
cd "$(dirname "$0")/.."

# A Vercel nao entrega variaveis marcadas como "sensiveis"; entao o endereco e digitado aqui,
# escondido, e fica so na memoria deste script.
echo "1/4 Endereco do banco de producao"
if [ -z "${DATABASE_URL:-}" ]; then
  echo "    Cole o DATABASE_URL (Neon/Supabase > Connection string). Nao aparece na tela:"
  read -rs DATABASE_URL
  echo
fi
case "$DATABASE_URL" in
  postgres://*|postgresql://*) ;;
  *) echo "Isso nao parece um endereco postgres:// . Nada foi alterado."; exit 1 ;;
esac
case "$DATABASE_URL" in
  *localhost*|*127.0.0.1*) echo "Esse e o banco LOCAL, nao o de producao. Nada foi alterado."; exit 1 ;;
esac

mkdir -p "$HOME/lugubre-backups"; chmod 700 "$HOME/lugubre-backups"
backup="$HOME/lugubre-backups/lugubre-$(date +%Y%m%d-%H%M%S).sql.gz"
echo "2/4 Copia de seguranca completa do banco..."
docker run --rm --network host --entrypoint pg_dump public.ecr.aws/supabase/postgres:17.11.0.004 \
  --no-owner --no-privileges "$DATABASE_URL" | gzip > "$backup"
chmod 600 "$backup"
if ! zcat "$backup" | grep -q "CREATE TABLE"; then
  echo "A copia de seguranca saiu vazia. Nada foi alterado no banco."; exit 1
fi
echo "    Copia salva em: $backup ($(du -h "$backup" | cut -f1))"

# Zera as senhas de seed de proposito: o backend/.env local tem senhas de TESTE que nao podem ir para producao.
run() {
  (cd backend && env DATABASE_URL="$DATABASE_URL" NODE_ENV=production SEED_ADMIN_PASSWORD= SEED_DEMO_PASSWORD= ADMIN_EMAILS= \
    JWT_SECRET=nao-usado-na-migracao node "$@")
}
echo "3/4 Atualizando a estrutura do banco (so acrescenta)..."
run src/db/init.js
echo "4/4 Carregando o livro de regras..."
run src/db/seedRules.js
echo "Pronto. Banco atualizado. Para voltar atras: zcat $backup | psql <DATABASE_URL>"

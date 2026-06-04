# Lúgubre RPG

Sistema web dark fantasy para criação de fichas, campanhas, grupos, chat em tempo real e administração de raças/classes.

## Stack

- Frontend: React + Vite + TailwindCSS + Zustand + React Router
- Backend: Node.js + Express + PostgreSQL + JWT + Socket.io
- Testes: Vitest + Supertest

## Como rodar

1. Crie um banco PostgreSQL.
2. Copie `backend/.env.example` para `backend/.env`.
3. Ajuste `DATABASE_URL` e `JWT_SECRET`.
4. Rode o schema:

```bash
psql "$DATABASE_URL" -f backend/src/db/schema.sql
```

5. Instale dependências e suba:

```bash
npm install
npm run dev
```

Frontend: `http://localhost:5173`
Backend: `http://localhost:3333`

## Usuário admin

Registre um usuário normalmente e altere o papel no banco:

```sql
update users set role = 'admin' where email = 'seu@email.com';
```

## Regras implementadas

- Atributos iniciam em `2`.
- Perícias iniciam em `0`.
- Raças aplicam modificadores de atributos.
- Classes aceitam progressões até nível 20.
- Mana substitui esforço.
- Defesa é editável.
- Esquiva = `15 - agilidade`.
- Armaduras e encantamentos aumentam defesa via itens de inventário.

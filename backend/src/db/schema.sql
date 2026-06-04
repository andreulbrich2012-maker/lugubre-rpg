create extension if not exists "uuid-ossp";

create table if not exists users (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  email text not null unique,
  password_hash text not null,
  role text not null default 'player' check (role in ('player', 'master', 'admin')),
  created_at timestamptz not null default now()
);

create table if not exists races (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  image text,
  attribute_modifiers jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists classes (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  image text,
  progression jsonb not null default '[]',
  created_at timestamptz not null default now()
);

create table if not exists origins (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  skill_modifiers jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists skills (
  id uuid primary key default uuid_generate_v4(),
  "key" text not null unique,
  name text not null,
  attribute text not null default 'presenca',
  created_at timestamptz not null default now()
);

create table if not exists characters (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid not null references users(id) on delete cascade,
  player_name text not null,
  character_name text not null,
  photo text,
  race_id uuid references races(id),
  class_id uuid references classes(id),
  origin_id uuid references origins(id),
  origin text,
  level int not null default 1 check (level between 1 and 20),
  mana int not null default 0,
  defense int not null default 10,
  attributes jsonb not null,
  skills jsonb not null,
  inventory jsonb not null default '[]',
  share_token uuid not null default uuid_generate_v4(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists campaigns (
  id uuid primary key default uuid_generate_v4(),
  master_id uuid not null references users(id) on delete cascade,
  name text not null,
  description text,
  invite_code text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists campaign_members (
  campaign_id uuid not null references campaigns(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  character_id uuid references characters(id) on delete set null,
  role text not null default 'player' check (role in ('player', 'master')),
  joined_at timestamptz not null default now(),
  primary key (campaign_id, user_id)
);

create table if not exists messages (
  id uuid primary key default uuid_generate_v4(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists friends (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  friend_id uuid not null references users(id) on delete cascade,
  status text not null default 'accepted' check (status in ('pending', 'accepted', 'blocked')),
  created_at timestamptz not null default now(),
  unique (user_id, friend_id),
  check (user_id <> friend_id)
);

create table if not exists friend_messages (
  id uuid primary key default uuid_generate_v4(),
  sender_id uuid not null references users(id) on delete cascade,
  receiver_id uuid not null references users(id) on delete cascade,
  message text not null,
  created_at timestamptz not null default now()
);

insert into races (name, image, attribute_modifiers)
values
  ('Humano Sombrio', '/assets/dark-castle.svg', '{"forca":1,"presenca":1}'),
  ('Elfo Crepuscular', '/assets/haunted-ruins.svg', '{"agilidade":2,"vigor":-1}'),
  ('Anão de Cripta', '/assets/crypt-gate.svg', '{"vigor":2,"agilidade":-1}')
on conflict do nothing;

insert into origins (name, description, skill_modifiers)
values
  ('Iniciado do Véu', 'Conhece rumores, símbolos e presságios.', '{"arcana":1,"religiao":1}'),
  ('Sobrevivente', 'Escapou de algo que ainda sussurra seu nome.', '{"sobrevivencia":2}'),
  ('Erudito Oculto', 'Estudou textos que deveriam permanecer fechados.', '{"arcana":2}')
on conflict do nothing;

insert into skills ("key", name, attribute)
values
  ('luta', 'Luta', 'forca'),
  ('pontaria', 'Pontaria', 'agilidade'),
  ('furtividade', 'Furtividade', 'agilidade'),
  ('arcana', 'Arcana', 'intelecto'),
  ('religiao', 'Religião', 'presenca'),
  ('percepcao', 'Percepção', 'presenca'),
  ('sobrevivencia', 'Sobrevivência', 'vigor')
on conflict do nothing;

insert into classes (name, image, progression)
values
  ('Lâmina Funesta', '/assets/crypt-gate.svg', '[{"level":1,"mana":2,"feature":"Golpe sombrio"},{"level":10,"mana":12,"feature":"Corte sepulcral"},{"level":20,"mana":25,"feature":"Executor do abismo"}]'),
  ('Ocultista', '/assets/dark-castle.svg', '[{"level":1,"mana":6,"feature":"Ritual menor"},{"level":10,"mana":22,"feature":"Pacto profano"},{"level":20,"mana":45,"feature":"Arquimago lúgubre"}]')
on conflict do nothing;

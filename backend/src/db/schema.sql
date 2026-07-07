create extension if not exists "uuid-ossp";

create table if not exists users (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  email text not null unique,
  password_hash text not null,
  role text not null default 'user' check (role in ('user', 'player', 'master', 'admin')),
  profile_image_url text,
  theme text not null default 'lugubre' check (theme in ('sombrio', 'lugubre', 'daltonismo')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table users add column if not exists profile_image_url text;
alter table users add column if not exists theme text not null default 'lugubre';
alter table users add column if not exists updated_at timestamptz not null default now();
alter table users alter column role set default 'user';
alter table users drop constraint if exists users_role_check;
alter table users add constraint users_role_check check (role in ('user', 'player', 'master', 'admin'));

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
  description text,
  image text,
  progression jsonb not null default '[]',
  created_at timestamptz not null default now()
);

alter table classes add column if not exists description text;

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
  life_current int not null default 63,
  life_max int not null default 63,
  sanity_current int not null default 52,
  sanity_max int not null default 52,
  mana int not null default 0,
  mana_max int not null default 0,
  defense int not null default 10,
  attributes jsonb not null,
  skills jsonb not null,
  skill_bonuses jsonb not null default '{}',
  inventory jsonb not null default '[]',
  attacks jsonb not null default '[]',
  spells jsonb not null default '[]',
  wallet jsonb not null default '{"bronze":0,"silver":0,"platinum":0,"gold":0}',
  dice_settings jsonb not null default '{"quickRollModifier":0}',
  share_token uuid not null default uuid_generate_v4(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table characters add column if not exists life_current int not null default 63;
alter table characters add column if not exists life_max int not null default 63;
alter table characters add column if not exists sanity_current int not null default 52;
alter table characters add column if not exists sanity_max int not null default 52;
alter table characters add column if not exists mana_max int not null default 0;
alter table characters add column if not exists skill_bonuses jsonb not null default '{}';
alter table characters add column if not exists attacks jsonb not null default '[]';
alter table characters add column if not exists spells jsonb not null default '[]';
alter table characters add column if not exists wallet jsonb not null default '{"bronze":0,"silver":0,"platinum":0,"gold":0}';
alter table characters add column if not exists dice_settings jsonb not null default '{"quickRollModifier":0}';
update characters set mana_max = mana where mana_max = 0 and mana > 0;

create table if not exists character_saves (
  id uuid primary key default uuid_generate_v4(),
  character_id uuid not null references characters(id) on delete cascade,
  label text not null,
  snapshot jsonb not null,
  saved_at timestamptz not null default now()
);

create index if not exists character_saves_recent_idx on character_saves (character_id, saved_at desc);

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

delete from races current
using races duplicate
where lower(current.name) = lower(duplicate.name)
  and current.ctid < duplicate.ctid;

delete from classes current
using classes duplicate
where lower(current.name) = lower(duplicate.name)
  and current.ctid < duplicate.ctid;

delete from origins current
using origins duplicate
where lower(current.name) = lower(duplicate.name)
  and current.ctid < duplicate.ctid;

create unique index if not exists races_name_unique on races (lower(name));
create unique index if not exists classes_name_unique on classes (lower(name));
create unique index if not exists origins_name_unique on origins (lower(name));

insert into races (name, image, attribute_modifiers)
values
  ('Humano', '', '{}'),
  ('Elfo', '', '{"forca":-1,"intelecto":1}'),
  ('Elfo Negro', '', '{"forca":-1,"agilidade":1}'),
  ('Anão', '', '{"forca":1,"agilidade":-1}'),
  ('Tiefling', '', '{"presenca":-1,"intelecto":1}'),
  ('Halfling', '', '{"agilidade":-1,"presenca":1}'),
  ('Genasi', '', '{}'),
  ('Kenku', '', '{"agilidade":1,"vigor":-1}'),
  ('Orc', '', '{"forca":1,"intelecto":-1}'),
  ('Aasimar', '', '{"vigor":-1,"presenca":1}')
on conflict ((lower(name))) do update set image = excluded.image, attribute_modifiers = excluded.attribute_modifiers;

update characters c
set attributes = '{"forca":3,"agilidade":1,"presenca":2,"intelecto":2,"vigor":2}'::jsonb,
    updated_at = now()
from races r
where c.race_id = r.id
  and r.name = 'Anão';

insert into origins (name, description, skill_modifiers)
values
  ('Sobrevivente', 'Escapou de terras hostis e aprendeu a resistir quando tudo desaba.', '{"atletismo":5,"vontade":5}'),
  ('Nobre', 'Cresceu entre intrigas, títulos e ameaças ditas em voz baixa.', '{"enganacao":5,"intimidacao":5}'),
  ('Criminoso', 'Conhece becos, fechaduras e o valor do silêncio.', '{"crime":5,"furtividade":5}'),
  ('Pesquisador', 'Procura respostas em cadáveres, arquivos e vestígios proibidos.', '{"investigacao":5,"medicina":5}'),
  ('Caçador', 'Rastreia presas e perigos antes que eles percebam sua presença.', '{"percepcao":5,"pontaria":5}'),
  ('Soldado', 'Foi treinado para sobreviver ao caos da linha de frente.', '{"atletismo":5,"reflexos":5}'),
  ('Religioso', 'Carrega ritos, fé e cuidado contra horrores do mundo.', '{"vontade":5,"medicina":5}'),
  ('Mercador', 'Aprendeu a ler pessoas e vender verdades convenientes.', '{"enganacao":5,"percepcao":5}')
on conflict ((lower(name))) do update set description = excluded.description, skill_modifiers = excluded.skill_modifiers;

insert into skills ("key", name, attribute)
values
  ('acrobacia', 'Acrobacia', 'agilidade'),
  ('adestramento', 'Adestramento', 'presenca'),
  ('artes', 'Artes', 'presenca'),
  ('atletismo', 'Atletismo', 'forca'),
  ('atualidades', 'Atualidades', 'intelecto'),
  ('ciencias', 'Ciências', 'intelecto'),
  ('crime', 'Crime', 'agilidade'),
  ('diplomacia', 'Diplomacia', 'presenca'),
  ('enganacao', 'Enganação', 'presenca'),
  ('fortitude', 'Fortitude', 'vigor'),
  ('furtividade', 'Furtividade', 'agilidade'),
  ('iniciativa', 'Iniciativa', 'agilidade'),
  ('intimidacao', 'Intimidação', 'presenca'),
  ('intuicao', 'Intuição', 'presenca'),
  ('investigacao', 'Investigação', 'intelecto'),
  ('luta', 'Luta', 'forca'),
  ('medicina', 'Medicina', 'intelecto'),
  ('ocultismo', 'Ocultismo', 'intelecto'),
  ('percepcao', 'Percepção', 'presenca'),
  ('pilotagem', 'Pilotagem', 'agilidade'),
  ('pontaria', 'Pontaria', 'agilidade'),
  ('profissao', 'Profissão', 'intelecto'),
  ('reflexos', 'Reflexos', 'agilidade'),
  ('religiao', 'Religião', 'presenca'),
  ('sobrevivencia', 'Sobrevivência', 'intelecto'),
  ('tatica', 'Tática', 'intelecto'),
  ('tecnologia', 'Tecnologia', 'intelecto'),
  ('vontade', 'Vontade', 'presenca')
on conflict ("key") do update set name = excluded.name, attribute = excluded.attribute;

insert into classes (name, description, image, progression)
values
  ('Cavaleiro', 'Espadas, escudos, defesa e combate corpo a corpo.', '', '[{"level":1,"mana":0,"feature":"Postura defensiva"},{"level":5,"mana":0,"feature":"Mestre de escudo"},{"level":10,"mana":0,"feature":"Golpe de guarda"},{"level":15,"mana":0,"feature":"Muralha viva"},{"level":20,"mana":0,"feature":"Campeão de aço"}]'),
  ('Mago', 'Cajados, magia, conhecimento e mana.', '', '[{"level":1,"mana":2,"feature":"Grimório inicial"},{"level":5,"mana":4,"feature":"Canalização arcana"},{"level":10,"mana":6,"feature":"Círculo ampliado"},{"level":15,"mana":8,"feature":"Domínio ritual"},{"level":20,"mana":10,"feature":"Arquimago"}]'),
  ('Atirador', 'Armas à distância, pontaria e precisão.', '', '[{"level":1,"mana":0,"feature":"Mira calma"},{"level":5,"mana":0,"feature":"Disparo preciso"},{"level":10,"mana":0,"feature":"Olho de caçador"},{"level":15,"mana":0,"feature":"Tiro impossível"},{"level":20,"mana":0,"feature":"Lenda da mira"}]'),
  ('Ladino', 'Furtividade, crime, agilidade e ataques rápidos.', '', '[{"level":1,"mana":0,"feature":"Passos leves"},{"level":5,"mana":0,"feature":"Ataque oportunista"},{"level":10,"mana":0,"feature":"Sombra viva"},{"level":15,"mana":0,"feature":"Mãos invisíveis"},{"level":20,"mana":0,"feature":"Mestre das sombras"}]'),
  ('Paladino', 'Defesa, fé, espada, proteção e habilidades sagradas.', '', '[{"level":1,"mana":1,"feature":"Juramento sagrado"},{"level":5,"mana":2,"feature":"Proteção divina"},{"level":10,"mana":3,"feature":"Lâmina consagrada"},{"level":15,"mana":4,"feature":"Aura protetora"},{"level":20,"mana":5,"feature":"Guardião santo"}]'),
  ('Sacerdote', 'Cura, suporte, fé e proteção espiritual.', '', '[{"level":1,"mana":2,"feature":"Prece de cura"},{"level":5,"mana":4,"feature":"Benção protetora"},{"level":10,"mana":6,"feature":"Rito de purificação"},{"level":15,"mana":8,"feature":"Milagre menor"},{"level":20,"mana":10,"feature":"Voz do santuário"}]'),
  ('Feiticeiro', 'Magia instável, poder bruto e presença arcana.', '', '[{"level":1,"mana":3,"feature":"Surto arcano"},{"level":5,"mana":5,"feature":"Energia instável"},{"level":10,"mana":7,"feature":"Poder bruto"},{"level":15,"mana":9,"feature":"Ruptura mística"},{"level":20,"mana":12,"feature":"Cataclisma pessoal"}]')
on conflict ((lower(name))) do update set description = excluded.description, image = excluded.image, progression = excluded.progression;

insert into users (name, email, password_hash, role)
values
  ('Joao Admin', 'joaogames9909@gmail.com', '$2a$10$Cyj/jAp.xt9hJiv9mO1cUOw.xB6x2AeKIm9c5ZDiZ/5517JtvfvBC', 'admin')
on conflict (email) do update set role = 'admin', updated_at = now();

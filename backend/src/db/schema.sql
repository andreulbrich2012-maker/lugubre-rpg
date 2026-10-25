create extension if not exists "uuid-ossp";

create table if not exists users (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  email text not null unique,
  password_hash text not null,
  token_version integer not null default 0,
  role text not null default 'user' check (role in ('user', 'player', 'master', 'admin')),
  profile_image_url text,
  theme text not null default 'sombrio' check (theme in ('sombrio', 'lugubre', 'daltonismo')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table users add column if not exists profile_image_url text;
alter table users add column if not exists theme text not null default 'sombrio';
alter table users add column if not exists updated_at timestamptz not null default now();
alter table users add column if not exists token_version integer not null default 0;
alter table users alter column role set default 'user';
alter table users alter column theme set default 'sombrio';
alter table users drop constraint if exists users_role_check;
alter table users add constraint users_role_check check (role in ('user', 'player', 'master', 'admin'));
create unique index if not exists users_email_normalized_idx on users (lower(trim(email)));

create table if not exists races (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  image text,
  attribute_modifiers jsonb not null default '{}',
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);
alter table races add column if not exists deleted_at timestamptz;

create table if not exists classes (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  image text,
  progression jsonb not null default '[]',
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

alter table classes add column if not exists description text;
alter table classes add column if not exists deleted_at timestamptz;

create table if not exists origins (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  skill_modifiers jsonb not null default '{}',
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);
alter table origins add column if not exists deleted_at timestamptz;

create table if not exists skills (
  id uuid primary key default uuid_generate_v4(),
  "key" text not null unique,
  name text not null,
  attribute text not null default 'presenca',
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);
alter table skills add column if not exists deleted_at timestamptz;

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
create index if not exists characters_owner_updated_idx on characters (owner_id, updated_at desc);

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
alter table characters add column if not exists appearance jsonb;
-- condicoes (envenenado, caido...) e anotacoes da ficha; o mestre edita pela sala da campanha
alter table characters add column if not exists conditions jsonb not null default '[]';
alter table characters add column if not exists notes text not null default '';
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
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table campaigns add column if not exists updated_at timestamptz not null default now();

create table if not exists campaign_members (
  id uuid not null default uuid_generate_v4(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  character_id uuid references characters(id) on delete set null,
  shared_character_id uuid references characters(id) on delete set null,
  role text not null default 'player' check (role in ('player', 'master')),
  color text not null default '#d6a65f',
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (campaign_id, user_id)
);
create index if not exists campaign_members_user_idx on campaign_members (user_id, campaign_id);

alter table campaign_members add column if not exists id uuid not null default uuid_generate_v4();
alter table campaign_members add column if not exists shared_character_id uuid references characters(id) on delete set null;
alter table campaign_members add column if not exists color text not null default '#d6a65f';
alter table campaign_members add column if not exists updated_at timestamptz not null default now();
update campaign_members set shared_character_id = character_id where shared_character_id is null and character_id is not null;
update campaign_members
set color = (array['#d6a65f', '#9b8ac7', '#4fb6a8', '#cf6f8f', '#8fb3ff', '#d08a3e', '#8bd17c', '#e0d27a'])[1 + ((('x' || substr(md5(user_id::text), 1, 6))::bit(24)::int) % 8)]
where color is null or color = '';

create table if not exists messages (
  id uuid primary key default uuid_generate_v4(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  character_id uuid references characters(id) on delete set null,
  content text not null,
  edited_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table messages add column if not exists character_id uuid references characters(id) on delete set null;
alter table messages add column if not exists edited_at timestamptz;
alter table messages add column if not exists deleted_at timestamptz;
alter table messages add column if not exists updated_at timestamptz not null default now();
create index if not exists messages_campaign_created_idx on messages (campaign_id, created_at);

create table if not exists campaign_diary_entries (
  id uuid primary key default uuid_generate_v4(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  character_id uuid references characters(id) on delete set null,
  title text not null,
  content text not null,
  marker text,
  is_gm_private boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table campaign_diary_entries add column if not exists character_id uuid references characters(id) on delete set null;
alter table campaign_diary_entries add column if not exists marker text;
alter table campaign_diary_entries add column if not exists is_gm_private boolean not null default false;
alter table campaign_diary_entries add column if not exists updated_at timestamptz not null default now();
create index if not exists campaign_diary_entries_campaign_user_idx on campaign_diary_entries (campaign_id, user_id, created_at desc);

create table if not exists campaign_shops (
  id uuid primary key default uuid_generate_v4(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  name text not null,
  description text,
  category text not null,
  visible_to_players boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table campaign_shops add column if not exists visible_to_players boolean not null default true;
alter table campaign_shops add column if not exists updated_at timestamptz not null default now();
create index if not exists campaign_shops_campaign_idx on campaign_shops (campaign_id, category, name);

create table if not exists campaign_shop_items (
  id uuid primary key default uuid_generate_v4(),
  shop_id uuid not null references campaign_shops(id) on delete cascade,
  name text not null,
  description text,
  price_dracmas int not null default 0 check (price_dracmas >= 0),
  stock int not null default 0 check (stock >= 0),
  category text,
  weight numeric not null default 0,
  available boolean not null default true,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table campaign_shop_items add column if not exists available boolean not null default true;
alter table campaign_shop_items add column if not exists note text;
alter table campaign_shop_items add column if not exists updated_at timestamptz not null default now();
create index if not exists campaign_shop_items_shop_idx on campaign_shop_items (shop_id, name);

create table if not exists shop_purchase_requests (
  id uuid primary key default uuid_generate_v4(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  shop_id uuid not null references campaign_shops(id) on delete cascade,
  item_id uuid not null references campaign_shop_items(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  character_id uuid references characters(id) on delete set null,
  quantity int not null default 1 check (quantity > 0),
  total_price int not null default 0 check (total_price >= 0),
  status text not null default 'pending' check (status in ('pending', 'approved', 'denied')),
  gm_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table shop_purchase_requests add column if not exists gm_note text;
alter table shop_purchase_requests add column if not exists updated_at timestamptz not null default now();
create index if not exists shop_purchase_requests_campaign_idx on shop_purchase_requests (campaign_id, status, created_at desc);

create table if not exists power_library (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  type text not null default 'magia' check (type in ('magia', 'poder')),
  element text,
  description text not null default '',
  mana_cost int not null default 0 check (mana_cost >= 0),
  damage_formula text,
  range text,
  duration text,
  requirement text,
  recommended_class text,
  recommended_level int not null default 1 check (recommended_level between 1 and 20),
  image_url text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table power_library add column if not exists image_url text;
alter table power_library add column if not exists deleted_at timestamptz;
alter table power_library add column if not exists updated_at timestamptz not null default now();
alter table power_library drop constraint if exists power_library_type_check;
alter table power_library add constraint power_library_type_check check (type in ('magia', 'poder'));
create unique index if not exists power_library_name_type_unique on power_library (lower(name), type);

create table if not exists character_powers (
  id uuid primary key default uuid_generate_v4(),
  character_id uuid not null references characters(id) on delete cascade,
  power_id uuid references power_library(id) on delete set null,
  custom_name text,
  custom_description text,
  custom_damage_formula text,
  custom_mana_cost int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table character_powers add column if not exists updated_at timestamptz not null default now();
create index if not exists character_powers_character_idx on character_powers (character_id, created_at desc);

create table if not exists friends (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  friend_id uuid not null references users(id) on delete cascade,
  status text not null default 'accepted' check (status in ('pending', 'accepted', 'blocked')),
  created_at timestamptz not null default now(),
  unique (user_id, friend_id),
  check (user_id <> friend_id)
);
create index if not exists friends_user_idx on friends (user_id, created_at desc);
create index if not exists friends_friend_idx on friends (friend_id, created_at desc);

create table if not exists friend_messages (
  id uuid primary key default uuid_generate_v4(),
  sender_id uuid not null references users(id) on delete cascade,
  receiver_id uuid not null references users(id) on delete cascade,
  message text not null,
  created_at timestamptz not null default now()
);
create index if not exists friend_messages_sender_receiver_idx on friend_messages (sender_id, receiver_id, created_at desc);

create table if not exists feedbacks (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  title text not null,
  type text not null check (type in ('Bug', 'Sugestão', 'Ideia', 'Melhoria visual', 'Problema no celular', 'Problema de conta/login', 'Problema em ficha', 'Problema em campanha', 'Outro')),
  description text not null,
  priority text not null default 'Média' check (priority in ('Baixa', 'Média', 'Alta', 'Urgente')),
  status text not null default 'Enviado' check (status in ('Enviado', 'Em análise', 'Em desenvolvimento', 'Resolvido', 'Recusado')),
  page_context text,
  attachment_url text,
  admin_response text,
  admin_id uuid references users(id) on delete set null,
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table feedbacks add column if not exists page_context text;
alter table feedbacks add column if not exists attachment_url text;
alter table feedbacks add column if not exists admin_response text;
alter table feedbacks add column if not exists admin_id uuid references users(id) on delete set null;
alter table feedbacks add column if not exists responded_at timestamptz;
alter table feedbacks add column if not exists updated_at timestamptz not null default now();
create index if not exists feedbacks_user_created_idx on feedbacks (user_id, created_at desc);
create index if not exists feedbacks_admin_filters_idx on feedbacks (status, priority, type, created_at desc);

create table if not exists developer_posts (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  short_description text not null,
  full_description text,
  image_url text,
  category text,
  published_at timestamptz not null default now(),
  is_visible boolean not null default true,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table developer_posts add column if not exists full_description text;
alter table developer_posts add column if not exists image_url text;
alter table developer_posts add column if not exists category text;
alter table developer_posts add column if not exists published_at timestamptz not null default now();
alter table developer_posts add column if not exists is_visible boolean not null default true;
alter table developer_posts add column if not exists created_by uuid references users(id) on delete set null;
alter table developer_posts add column if not exists updated_at timestamptz not null default now();
create index if not exists developer_posts_public_idx on developer_posts (is_visible, published_at desc);

create table if not exists monsters (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  image_url text,
  token_url text,
  category text not null default 'Caos',
  difficulty text not null default 'Média',
  base_health int not null default 8 check (base_health >= 0),
  min_health int not null default 4 check (min_health >= 0),
  max_health int not null default 12 check (max_health >= 0),
  armor int not null default 10 check (armor >= 0),
  items jsonb not null default '[]',
  description text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table monsters add column if not exists image_url text;
alter table monsters add column if not exists token_url text;
alter table monsters add column if not exists category text not null default 'Caos';
alter table monsters add column if not exists difficulty text not null default 'Média';
alter table monsters add column if not exists base_health int not null default 8;
alter table monsters add column if not exists min_health int not null default 4;
alter table monsters add column if not exists max_health int not null default 12;
alter table monsters add column if not exists armor int not null default 10;
alter table monsters add column if not exists items jsonb not null default '[]';
alter table monsters add column if not exists description text;
alter table monsters add column if not exists deleted_at timestamptz;
alter table monsters add column if not exists updated_at timestamptz not null default now();
alter table monsters alter column category set default 'Caos';
update monsters
set category = case
  when category in ('Caos', 'Gaia', 'Ponto', 'Érebo', 'Nix', 'Tártaro', 'Éter', 'Ananque') then category
  when category = 'Feras' then 'Gaia'
  when category in ('Mortos-vivos', 'Demônios', 'Demonios', 'Aberrações', 'Aberracoes') then 'Tártaro'
  when category in ('Humanoides', 'Construtos') then 'Ananque'
  when category in ('Espíritos', 'Espiritos') then 'Nix'
  else 'Caos'
end
where category not in ('Caos', 'Gaia', 'Ponto', 'Érebo', 'Nix', 'Tártaro', 'Éter', 'Ananque');
alter table monsters drop constraint if exists monsters_category_check;
alter table monsters add constraint monsters_category_check check (category in ('Caos', 'Gaia', 'Ponto', 'Érebo', 'Nix', 'Tártaro', 'Éter', 'Ananque'));

create table if not exists monster_attacks (
  id uuid primary key default uuid_generate_v4(),
  monster_id uuid not null references monsters(id) on delete cascade,
  name text not null,
  damage_formula text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table monster_attacks add column if not exists description text;
alter table monster_attacks add column if not exists updated_at timestamptz not null default now();
create index if not exists monster_attacks_monster_idx on monster_attacks (monster_id);

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

delete from monsters current
using monsters duplicate
where lower(current.name) = lower(duplicate.name)
  and current.ctid < duplicate.ctid;

create unique index if not exists races_name_unique on races (lower(name));
create unique index if not exists classes_name_unique on classes (lower(name));
create unique index if not exists origins_name_unique on origins (lower(name));
create unique index if not exists monsters_name_unique on monsters (lower(name));

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
on conflict ((lower(name))) do update set
  image = excluded.image,
  attribute_modifiers = excluded.attribute_modifiers,
  deleted_at = null;

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

insert into monsters (name, image_url, token_url, category, difficulty, base_health, min_health, max_health, armor, items, description)
values
  ('Guardião de Cinzas', '/assets/haunted-ruins.svg', '/assets/haunted-ruins.svg', 'Caos', 'Média', 20, 16, 24, 12, '["Fragmento de Cinza","Núcleo Flamejante"]', 'Uma sentinela de brasas antigas que protege ruínas esquecidas.')
on conflict ((lower(name))) do update set
  image_url = excluded.image_url,
  token_url = excluded.token_url,
  category = excluded.category,
  difficulty = excluded.difficulty,
  base_health = excluded.base_health,
  min_health = excluded.min_health,
  max_health = excluded.max_health,
  armor = excluded.armor,
  items = excluded.items,
  description = excluded.description,
  updated_at = now();

insert into monster_attacks (monster_id, name, damage_formula, description)
select m.id, attack.name, attack.damage_formula, attack.description
from monsters m
cross join (
  values
    ('Punho Ardente', '1d8+2', 'Um golpe pesado envolto em cinzas vivas.'),
    ('Explosão de Cinzas', '2d6+1', 'A criatura libera uma onda breve de calor e fuligem.')
) as attack(name, damage_formula, description)
where m.name = 'Guardião de Cinzas'
  and not exists (
    select 1 from monster_attacks existing
    where existing.monster_id = m.id and lower(existing.name) = lower(attack.name)
  );

insert into power_library (name, type, element, description, mana_cost, damage_formula, range, duration, requirement, recommended_class, recommended_level, image_url)
values
  ('Raio Sombrio', 'magia', 'Érebo', 'Um raio de energia sombria atinge o alvo.', 3, '1d10+2', 'Médio', 'Instantânea', '', 'Mago', 1, ''),
  ('Benção de Éter', 'magia', 'Éter', 'Luz celestial fecha feridas e afasta o desespero.', 4, '1d8+3', 'Curto', 'Instantânea', '', 'Sacerdote', 1, ''),
  ('Golpe Guardião', 'poder', null, 'Uma técnica defensiva que transforma bloqueio em contra-ataque.', 0, '1d8+1', 'Corpo a corpo', 'Instantânea', 'Escudo equipado', 'Cavaleiro', 1, '')
on conflict ((lower(name)), type) do update set
  element = excluded.element,
  description = excluded.description,
  mana_cost = excluded.mana_cost,
  damage_formula = excluded.damage_formula,
  range = excluded.range,
  duration = excluded.duration,
  requirement = excluded.requirement,
  recommended_class = excluded.recommended_class,
  recommended_level = excluded.recommended_level,
  image_url = excluded.image_url,
  updated_at = now();

insert into developer_posts (title, short_description, full_description, image_url, category, published_at, is_visible)
select 'Sistema de Feedback Adicionado',
       'Jogadores agora podem enviar bugs, ideias e sugestões para a administração.',
       'O painel de feedback aproxima a comunidade do desenvolvimento: cada relato pode ser acompanhado, respondido e transformado em melhoria real para o Lúgubre RPG.',
       '/assets/crypt-gate.svg',
       'Sistema',
       now() - interval '1 day',
       true
where not exists (select 1 from developer_posts where lower(title) = lower('Sistema de Feedback Adicionado'));

insert into developer_posts (title, short_description, full_description, image_url, category, published_at, is_visible)
select 'Biblioteca de Magias e Poderes',
       'A biblioteca ganhou elementos, filtros e organização para consulta rápida.',
       'Magias e poderes passaram a viver em uma área própria, pronta para expandir com novas escolas, elementos e vínculos com fichas.',
       '/assets/dark-castle.svg',
       'Novidade',
       now() - interval '2 days',
       true
where not exists (select 1 from developer_posts where lower(title) = lower('Biblioteca de Magias e Poderes'));

insert into users (name, email, password_hash, role)
values
  ('Joao Admin', 'joaogames9909@gmail.com', '$2a$10$Cyj/jAp.xt9hJiv9mO1cUOw.xB6x2AeKIm9c5ZDiZ/5517JtvfvBC', 'admin')
on conflict (email) do update set role = 'admin', updated_at = now();

-- ===== v2: Média com acento nos monstros =====
alter table monsters alter column difficulty set default 'Média';
update monsters set difficulty = 'Média' where difficulty = 'Media';

-- ===== v2: mensagens com tipo (texto/rolagem) =====
alter table messages add column if not exists message_type text not null default 'text';
alter table messages add column if not exists meta jsonb;

-- ===== v2: feed de eventos (substitui sockets em producao) =====
create table if not exists campaign_events (
  id bigserial primary key,
  campaign_id uuid not null references campaigns(id) on delete cascade,
  type text not null,
  payload jsonb not null default '{}',
  audience text not null default 'all',
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists campaign_events_campaign_id_idx on campaign_events (campaign_id, id);
create index if not exists campaign_events_created_idx on campaign_events (created_at);

-- ===== v2: notas =====
create table if not exists campaign_notes (
  id uuid primary key default uuid_generate_v4(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  author_id uuid not null references users(id) on delete cascade,
  character_id uuid references characters(id) on delete set null,
  scope text not null default 'private' check (scope in ('private', 'master', 'party')),
  title text not null,
  body text not null default '',
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists campaign_notes_campaign_idx on campaign_notes (campaign_id, pinned desc, updated_at desc);

-- ===== v2: mesa virtual =====
create table if not exists campaign_scenes (
  id uuid primary key default uuid_generate_v4(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  name text not null,
  map_url text,
  grid_size int not null default 70,
  grid_offset_x int not null default 0,
  grid_offset_y int not null default 0,
  width int not null default 1400,
  height int not null default 1000,
  show_grid boolean not null default false,
  fog_enabled boolean not null default false,
  fog_reveals jsonb not null default '[]',
  initiative jsonb not null default '[]',
  turn_index int not null default 0,
  round int not null default 1,
  is_active boolean not null default false,
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table campaign_scenes add column if not exists map_kind text not null default 'image';
alter table campaign_scenes add column if not exists tiles jsonb;
alter table campaign_scenes add column if not exists move_speed double precision not null default 6;
alter table campaign_scenes add column if not exists move_mode text not null default 'free';
alter table campaign_scenes alter column move_mode set default 'free';
alter table campaign_scenes alter column show_grid set default false;
alter table campaign_scenes drop constraint if exists campaign_scenes_map_kind_check;
alter table campaign_scenes add constraint campaign_scenes_map_kind_check check (map_kind in ('image', 'tiles'));
alter table campaign_scenes drop constraint if exists campaign_scenes_move_mode_check;
alter table campaign_scenes add constraint campaign_scenes_move_mode_check check (move_mode in ('free', 'grid'));
alter table campaign_scenes add column if not exists mode text not null default 'prep';
alter table campaign_scenes add column if not exists movement_per_turn int not null default 6;
-- interior de construcao (pixel art): cena filha ligada a uma construcao da cena-mae (24/10)
alter table campaign_scenes add column if not exists parent_scene_id uuid references campaign_scenes(id) on delete set null;
alter table campaign_scenes add column if not exists parent_building_id text;
-- regras da mesa que o mestre controla: mover, poderes, pegar itens, vez de alguem e excecoes por jogador
alter table campaigns add column if not exists table_rules jsonb not null default '{}';
alter table campaign_scenes add column if not exists turn_state jsonb not null default '{}';
alter table campaign_scenes drop constraint if exists campaign_scenes_mode_check;
alter table campaign_scenes add constraint campaign_scenes_mode_check check (mode in ('prep', 'exploration', 'combat'));
create index if not exists campaign_scenes_campaign_idx on campaign_scenes (campaign_id, position);

create table if not exists campaign_npcs (
  id uuid primary key default uuid_generate_v4(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  name text not null,
  image_url text,
  kind text not null default 'npc' check (kind in ('npc', 'monster')),
  monster_id uuid references monsters(id) on delete set null,
  hp_max int not null default 10 check (hp_max >= 0),
  defense int not null default 10,
  dodge int not null default 13,
  attacks jsonb not null default '[]',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists campaign_npcs_campaign_idx on campaign_npcs (campaign_id, name);

create table if not exists campaign_tokens (
  id uuid primary key default uuid_generate_v4(),
  scene_id uuid not null references campaign_scenes(id) on delete cascade,
  campaign_id uuid not null references campaigns(id) on delete cascade,
  kind text not null check (kind in ('character', 'npc', 'monster', 'marker')),
  character_id uuid references characters(id) on delete cascade,
  npc_id uuid references campaign_npcs(id) on delete set null,
  name text not null default '',
  image_url text,
  x double precision not null default 0,
  y double precision not null default 0,
  size double precision not null default 1,
  color text,
  hidden boolean not null default false,
  hp_current int,
  hp_max int,
  conditions jsonb not null default '[]',
  controlled_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists campaign_tokens_scene_idx on campaign_tokens (scene_id);
create unique index if not exists campaign_tokens_character_scene_unique on campaign_tokens (scene_id, character_id) where character_id is not null;

-- ===== v2: livro de regras =====
create table if not exists rule_sections (
  id uuid primary key default uuid_generate_v4(),
  slug text not null unique,
  parent_id uuid references rule_sections(id) on delete restrict,
  position int not null default 0,
  level int not null default 1,
  title text not null,
  body_md text not null default '',
  seed_hash text,
  updated_at timestamptz not null default now(),
  updated_by uuid references users(id) on delete set null
);
create index if not exists rule_sections_parent_idx on rule_sections (parent_id, position);

create table if not exists rulebook_meta (
  "key" text primary key,
  value text not null default ''
);
insert into rulebook_meta ("key", value) values ('version', '0.5 Beta') on conflict ("key") do nothing;

-- Conteudo extra (proposta beta, 24/10): magias por elemento, armas, tecnicas e monstros.

-- 'on conflict do nothing' / 'where not exists' para nunca sobrescrever o que o admin editou.

insert into power_library (name, type, element, description, mana_cost, damage_formula, range, duration, requirement, recommended_class, recommended_level, image_url)
values
  ('Estilhaço do Caos', 'magia', 'Caos', 'Um fragmento de realidade partida corta o alvo.', 2, '1d8', 'Médio', 'Instantânea', '', 'Feiticeiro', 1, ''),
  ('Faísca Errante', 'magia', 'Caos', 'Uma centelha imprevisível salta entre inimigos próximos.', 2, '1d6+1', 'Curto', 'Instantânea', '', 'Mago', 1, ''),
  ('Fenda Instável', 'magia', 'Caos', 'Uma rachadura no ar explode em energia bruta.', 4, '2d6', 'Médio', 'Instantânea', '', 'Feiticeiro', 4, ''),
  ('Distorção', 'magia', 'Caos', 'O alvo tem dificuldade em agir com precisão enquanto o mundo treme ao seu redor.', 5, null, 'Curto', '2 turnos', '', 'Mago', 6, ''),
  ('Tempestade de Fragmentos', 'magia', 'Caos', 'Estilhaços de realidade chovem sobre uma área.', 7, '3d6+2', 'Área média', 'Instantânea', '', 'Feiticeiro', 9, ''),
  ('Mutação Breve', 'magia', 'Caos', 'Altera o corpo do alvo, concedendo ou retirando uma vantagem física à escolha do mestre.', 8, null, 'Toque', '3 turnos', '', 'Feiticeiro', 11, ''),
  ('Ruptura Primordial', 'magia', 'Caos', 'Um eco da Primeira Ruptura despedaça o alvo.', 11, '4d8', 'Longo', 'Instantânea', '', 'Feiticeiro', 15, ''),
  ('Coração do Caos', 'magia', 'Caos', 'O conjurador libera o desconhecido; tudo ao redor sofre.', 15, '6d8', 'Área grande', 'Instantânea', '', 'Feiticeiro', 20, ''),
  ('Vinhas de Gaia', 'magia', 'Gaia', 'Raízes crescem sob o alvo; se falhar em Agilidade, fica imobilizado por 1 turno.', 2, '1d4', 'Médio', '1 turno', '', 'Sacerdote', 1, ''),
  ('Casca de Árvore', 'magia', 'Gaia', 'A pele endurece como madeira antiga, aumentando a Defesa em 2.', 3, null, 'Pessoal', 'Cena', '', 'Sacerdote', 1, ''),
  ('Lança de Pedra', 'magia', 'Gaia', 'Uma estaca de pedra irrompe do chão contra o alvo.', 3, '1d10+2', 'Médio', 'Instantânea', '', 'Mago', 3, ''),
  ('Esporos Curativos', 'magia', 'Gaia', 'Esporos dourados recuperam Vida de aliados próximos.', 4, '2d6', 'Área pequena', 'Instantânea', '', 'Sacerdote', 5, ''),
  ('Muralha de Espinhos', 'magia', 'Gaia', 'Uma barreira de espinhos fere quem a atravessa.', 6, '1d8', 'Médio', '3 turnos', '', 'Sacerdote', 8, ''),
  ('Pele de Urso', 'magia', 'Gaia', 'Força primitiva aumenta Força e Vigor em 1.', 7, null, 'Pessoal', 'Cena', '', 'Paladino', 10, ''),
  ('Terremoto Menor', 'magia', 'Gaia', 'O chão se abre e derruba inimigos.', 10, '3d10', 'Área grande', 'Instantânea', '', 'Mago', 14, ''),
  ('Fúria da Floresta', 'magia', 'Gaia', 'A floresta desperta e ataca todos os inimigos da área.', 14, '5d8+5', 'Área grande', '2 turnos', '', 'Sacerdote', 20, ''),
  ('Jato de Maré', 'magia', 'Ponto', 'Um jato de água salgada empurra o alvo 1 metro.', 2, '1d6+1', 'Médio', 'Instantânea', '', 'Mago', 1, ''),
  ('Névoa do Abismo', 'magia', 'Ponto', 'Névoa densa dificulta a visão de todos na área.', 3, null, 'Área média', '3 turnos', '', 'Mago', 2, ''),
  ('Lâmina de Água', 'magia', 'Ponto', 'Água comprimida corta como aço.', 4, '2d6', 'Curto', 'Instantânea', '', 'Feiticeiro', 4, ''),
  ('Correnteza', 'magia', 'Ponto', 'Uma onda arrasta o alvo e o derruba se falhar em Força.', 5, '1d8', 'Médio', 'Instantânea', '', 'Mago', 6, ''),
  ('Relâmpago da Tempestade', 'magia', 'Ponto', 'Um raio cai do céu carregado.', 7, '3d8', 'Longo', 'Instantânea', '', 'Feiticeiro', 9, ''),
  ('Respirar nas Profundezas', 'magia', 'Ponto', 'O alvo respira e se move debaixo d''água.', 4, null, 'Toque', 'Cena', '', 'Sacerdote', 7, ''),
  ('Maremoto', 'magia', 'Ponto', 'Uma onda gigante varre a área.', 11, '4d8+4', 'Área grande', 'Instantânea', '', 'Mago', 15, ''),
  ('Olho do Ciclone', 'magia', 'Ponto', 'Uma tempestade gira ao redor do conjurador, ferindo quem se aproxima.', 15, '6d6', 'Área grande', '3 turnos', '', 'Feiticeiro', 20, ''),
  ('Raio Sombrio', 'magia', 'Érebo', 'Um raio de energia sombria atinge o alvo.', 3, '1d10+2', 'Médio', 'Instantânea', '', 'Mago', 1, ''),
  ('Passo Sombrio', 'magia', 'Érebo', 'O conjurador some numa sombra e reaparece até 6 metros dali.', 3, null, 'Pessoal', 'Instantânea', '', 'Ladino', 3, ''),
  ('Silêncio', 'magia', 'Érebo', 'Nenhum som existe na área; magias faladas não funcionam.', 4, null, 'Área pequena', '2 turnos', '', 'Mago', 4, ''),
  ('Abraço do Vazio', 'magia', 'Érebo', 'Sombras agarram a vítima; ela fica imobilizada até vencer um teste de Força.', 5, '1d8+2', 'Curto', 'Até escapar', '', 'Feiticeiro', 5, ''),
  ('Lâmina de Sombra', 'magia', 'Érebo', 'A arma do conjurador se cobre de escuridão cortante.', 5, '2d8', 'Corpo a corpo', 'Instantânea', '', 'Ladino', 7, ''),
  ('Manto da Noite Sem Lua', 'magia', 'Érebo', 'O conjurador fica quase invisível na penumbra.', 7, null, 'Pessoal', 'Cena', '', 'Ladino', 10, ''),
  ('Devorar a Luz', 'magia', 'Érebo', 'Toda luz da área é engolida e a escuridão fere.', 10, '3d10', 'Área média', 'Instantânea', '', 'Feiticeiro', 14, ''),
  ('Segredo Proibido', 'magia', 'Érebo', 'Um conhecimento que não deveria existir rasga a mente do alvo.', 14, '5d10', 'Longo', 'Instantânea', '', 'Mago', 19, ''),
  ('Sussurro do Sono', 'magia', 'Nix', 'O alvo fica sonolento; perde o movimento no próximo turno se falhar em Vigor.', 2, null, 'Médio', '2 turnos', '', 'Mago', 1, ''),
  ('Pesadelo', 'magia', 'Nix', 'Uma visão terrível causa dano à Sanidade do alvo.', 3, '1d8', 'Médio', 'Instantânea', '', 'Feiticeiro', 2, ''),
  ('Poeira Estelar', 'magia', 'Nix', 'Estrelas minúsculas explodem em luz fria.', 4, '2d6', 'Área pequena', 'Instantânea', '', 'Mago', 4, ''),
  ('Presságio', 'magia', 'Nix', 'O conjurador vê um instante do futuro: +5 no próximo teste.', 4, null, 'Pessoal', '1 turno', '', 'Sacerdote', 5, ''),
  ('Sono Profundo', 'magia', 'Nix', 'Criaturas na área adormecem até levar dano.', 6, null, 'Área média', '3 turnos', '', 'Mago', 8, ''),
  ('Lua Negra', 'magia', 'Nix', 'Um disco de noite cai sobre o alvo.', 8, '3d8', 'Longo', 'Instantânea', '', 'Feiticeiro', 11, ''),
  ('Labirinto de Sonhos', 'magia', 'Nix', 'O alvo fica preso num sonho e não age.', 11, null, 'Médio', '3 turnos', '', 'Mago', 15, ''),
  ('Noite Eterna', 'magia', 'Nix', 'A noite cobre o campo; inimigos sofrem e perdem Sanidade.', 15, '4d10+6', 'Área grande', '2 turnos', '', 'Feiticeiro', 20, ''),
  ('Corrente Maldita', 'magia', 'Tártaro', 'Uma corrente de ferro negro chicoteia o alvo.', 2, '1d8', 'Médio', 'Instantânea', '', 'Feiticeiro', 1, ''),
  ('Toque Corrompido', 'magia', 'Tártaro', 'A ferida apodrece e causa 1d4 extra no turno seguinte.', 3, '1d6+2', 'Toque', '2 turnos', '', 'Feiticeiro', 2, ''),
  ('Grilhões do Abismo', 'magia', 'Tártaro', 'Correntes prendem o alvo ao chão.', 5, null, 'Médio', '2 turnos', '', 'Paladino', 5, ''),
  ('Brasa Infernal', 'magia', 'Tártaro', 'Uma brasa do fundo do mundo explode no alvo.', 5, '2d8', 'Médio', 'Instantânea', '', 'Mago', 6, ''),
  ('Maldição Menor', 'magia', 'Tártaro', 'O alvo sofre −2 em todos os testes.', 6, null, 'Médio', 'Cena', '', 'Feiticeiro', 8, ''),
  ('Chamar a Fera', 'magia', 'Tártaro', 'Uma criatura deformada surge por um instante e ataca.', 9, '3d8', 'Curto', 'Instantânea', '', 'Feiticeiro', 12, ''),
  ('Prisão do Tártaro', 'magia', 'Tártaro', 'O alvo é aprisionado numa jaula de correntes.', 12, null, 'Médio', '3 turnos', '', 'Paladino', 16, ''),
  ('Portão Aberto', 'magia', 'Tártaro', 'As barreiras do Tártaro se rompem por um instante.', 15, '6d8', 'Área grande', 'Instantânea', '', 'Feiticeiro', 20, ''),
  ('Benção de Éter', 'magia', 'Éter', 'Luz celestial fecha feridas e afasta o desespero.', 4, '1d8+3', 'Curto', 'Instantânea', '', 'Sacerdote', 1, ''),
  ('Luz Revelada', 'magia', 'Éter', 'Ilumina a área e revela o que está escondido.', 2, null, 'Área média', 'Cena', '', 'Sacerdote', 1, ''),
  ('Lança de Luz', 'magia', 'Éter', 'Um raio de luz divina atravessa o alvo.', 3, '1d10+1', 'Longo', 'Instantânea', '', 'Paladino', 3, ''),
  ('Escudo Celestial', 'magia', 'Éter', 'O aliado ganha +3 de Defesa.', 4, null, 'Toque', '2 turnos', '', 'Paladino', 4, ''),
  ('Purificar', 'magia', 'Éter', 'Remove veneno, maldição menor ou uma condição.', 5, null, 'Toque', 'Instantânea', '', 'Sacerdote', 6, ''),
  ('Asas de Coragem', 'magia', 'Éter', 'Aliados recuperam 2d6 de Sanidade e não podem ser amedrontados.', 6, null, 'Área pequena', 'Cena', '', 'Sacerdote', 9, ''),
  ('Julgamento', 'magia', 'Éter', 'Luz desce dos céus sobre um inimigo corrompido.', 10, '4d8', 'Médio', 'Instantânea', '', 'Paladino', 14, ''),
  ('Renascer', 'magia', 'Éter', 'Traz de volta um aliado caído há menos de 1 minuto com 1 de Vida.', 16, null, 'Toque', 'Instantânea', '', 'Sacerdote', 20, ''),
  ('Fio do Destino', 'magia', 'Ananque', 'Puxa um fio do destino: o alvo rola o próximo teste duas vezes e fica com o pior.', 2, null, 'Médio', '1 turno', '', 'Mago', 1, ''),
  ('Segundo Exato', 'magia', 'Ananque', 'Um golpe no instante perfeito ignora 2 de Defesa.', 3, '1d8', 'Curto', 'Instantânea', '', 'Atirador', 2, ''),
  ('Engrenagem Cortante', 'magia', 'Ananque', 'Engrenagens de luz âmbar giram e cortam.', 4, '2d6', 'Médio', 'Instantânea', '', 'Mago', 4, ''),
  ('Acelerar', 'magia', 'Ananque', 'O aliado ganha movimento extra igual ao dobro do normal.', 5, null, 'Toque', '2 turnos', '', 'Mago', 6, ''),
  ('Retardar', 'magia', 'Ananque', 'O alvo só pode mover ou agir, não os dois.', 5, null, 'Médio', '2 turnos', '', 'Mago', 7, ''),
  ('Profecia', 'magia', 'Ananque', 'O mestre revela uma verdade sobre o futuro próximo.', 7, null, 'Pessoal', 'Cena', '', 'Sacerdote', 10, ''),
  ('Volta no Tempo', 'magia', 'Ananque', 'Desfaz o último dano sofrido pelo alvo nesta rodada.', 12, null, 'Toque', 'Instantânea', '', 'Mago', 15, ''),
  ('Inevitável', 'magia', 'Ananque', 'O golpe já aconteceu antes de ser lançado: não pode ser desviado.', 15, '5d10', 'Longo', 'Instantânea', '', 'Mago', 20, ''),
  ('Clarão do Dia', 'magia', 'Hemera', 'Um clarão cega inimigos próximos por um instante.', 2, '1d6', 'Área pequena', '1 turno', '', 'Sacerdote', 1, ''),
  ('Toque do Sol', 'magia', 'Hemera', 'Calor solar queima o alvo.', 3, '1d8+1', 'Toque', 'Instantânea', '', 'Paladino', 2, ''),
  ('Amanhecer', 'magia', 'Hemera', 'Aliados recuperam Vida e criaturas da noite sofrem dano.', 4, '2d6', 'Área pequena', 'Instantânea', '', 'Sacerdote', 5, ''),
  ('Raio Solar', 'magia', 'Hemera', 'Um feixe de sol atravessa a escuridão.', 6, '3d6', 'Longo', 'Instantânea', '', 'Paladino', 8, ''),
  ('Coroa de Luz', 'magia', 'Hemera', 'Uma auréola ilumina 10 metros e afasta sombras mágicas.', 8, null, 'Pessoal', 'Cena', '', 'Paladino', 11, ''),
  ('Meio-Dia', 'magia', 'Hemera', 'O sol do meio-dia cai sobre a área.', 12, '4d8+4', 'Área média', 'Instantânea', '', 'Sacerdote', 16, ''),
  ('Centelha Torta', 'magia', 'Caos', 'Uma pequena descarga de Caos atinge o alvo.', 2, '1d6', 'Curto', 'Instantânea', '', 'Mago', 1, ''),
  ('Véu Mutável', 'magia', 'Caos', 'Uma proteção de Caos envolve o conjurador: +1 de Defesa.', 2, null, 'Pessoal', 'Cena', '', 'Sacerdote', 2, ''),
  ('Dardo Paradoxal', 'magia', 'Caos', 'Um projétil de Caos viaja até o alvo.', 3, '1d8+1', 'Médio', 'Instantânea', '', 'Feiticeiro', 3, ''),
  ('Remendo Impossível', 'magia', 'Caos', 'A energia de Caos recupera 1d8 de Vida de um aliado.', 3, null, 'Toque', 'Instantânea', '', 'Sacerdote', 3, ''),
  ('Bolha Instável', 'magia', 'Caos', 'Uma explosão de Caos atinge todos numa pequena área.', 4, '2d6', 'Área pequena', 'Instantânea', '', 'Mago', 5, ''),
  ('Marca do Acaso', 'magia', 'Caos', 'O alvo é marcado por Caos e sofre −2 nos testes.', 4, null, 'Médio', '2 turnos', '', 'Feiticeiro', 6, ''),
  ('Gume Caótico', 'magia', 'Caos', 'A arma do conjurador se cobre de Caos por um golpe.', 5, '2d8', 'Corpo a corpo', 'Instantânea', '', 'Paladino', 7, ''),
  ('Campo de Entropia', 'magia', 'Caos', 'Uma zona de Caos dificulta o movimento dos inimigos.', 6, null, 'Área média', '3 turnos', '', 'Mago', 9, ''),
  ('Raio Fractal', 'magia', 'Caos', 'Um feixe concentrado de Caos atravessa a distância.', 8, '3d8', 'Longo', 'Instantânea', '', 'Feiticeiro', 11, ''),
  ('Avatar do Desconhecido', 'magia', 'Caos', 'O conjurador se torna um avatar de Caos: +2 em ataques.', 9, null, 'Pessoal', 'Cena', '', 'Paladino', 13, ''),
  ('Colapso', 'magia', 'Caos', 'Caos desaba sobre a área com força total.', 11, '4d8', 'Área média', 'Instantânea', '', 'Mago', 16, ''),
  ('Prisão Paradoxal', 'magia', 'Caos', 'O alvo é tomado por Caos e não consegue agir.', 13, null, 'Médio', '3 turnos', '', 'Feiticeiro', 18, ''),
  ('Pedrinha Viva', 'magia', 'Gaia', 'Uma pequena descarga de Gaia atinge o alvo.', 2, '1d6', 'Curto', 'Instantânea', '', 'Mago', 1, ''),
  ('Armadura de Musgo', 'magia', 'Gaia', 'Uma proteção de Gaia envolve o conjurador: +1 de Defesa.', 2, null, 'Pessoal', 'Cena', '', 'Sacerdote', 2, ''),
  ('Semente Explosiva', 'magia', 'Gaia', 'Um projétil de Gaia viaja até o alvo.', 3, '1d8+1', 'Médio', 'Instantânea', '', 'Feiticeiro', 3, ''),
  ('Seiva Curativa', 'magia', 'Gaia', 'A energia de Gaia recupera 1d8 de Vida de um aliado.', 3, null, 'Toque', 'Instantânea', '', 'Sacerdote', 3, ''),
  ('Brotar de Espinhos', 'magia', 'Gaia', 'Uma explosão de Gaia atinge todos numa pequena área.', 4, '2d6', 'Área pequena', 'Instantânea', '', 'Mago', 5, ''),
  ('Marca da Hera', 'magia', 'Gaia', 'O alvo é marcado por Gaia e sofre −2 nos testes.', 4, null, 'Médio', '2 turnos', '', 'Feiticeiro', 6, ''),
  ('Punho de Rocha', 'magia', 'Gaia', 'A arma do conjurador se cobre de Gaia por um golpe.', 5, '2d8', 'Corpo a corpo', 'Instantânea', '', 'Paladino', 7, ''),
  ('Pântano Repentino', 'magia', 'Gaia', 'Uma zona de Gaia dificulta o movimento dos inimigos.', 6, null, 'Área média', '3 turnos', '', 'Mago', 9, ''),
  ('Lança de Raiz', 'magia', 'Gaia', 'Um feixe concentrado de Gaia atravessa a distância.', 8, '3d8', 'Longo', 'Instantânea', '', 'Feiticeiro', 11, ''),
  ('Avatar da Montanha', 'magia', 'Gaia', 'O conjurador se torna um avatar de Gaia: +2 em ataques.', 9, null, 'Pessoal', 'Cena', '', 'Paladino', 13, ''),
  ('Avalanche', 'magia', 'Gaia', 'Gaia desaba sobre a área com força total.', 11, '4d8', 'Área média', 'Instantânea', '', 'Mago', 16, ''),
  ('Casulo de Âmbar', 'magia', 'Gaia', 'O alvo é tomado por Gaia e não consegue agir.', 13, null, 'Médio', '3 turnos', '', 'Feiticeiro', 18, ''),
  ('Gota Afiada', 'magia', 'Ponto', 'Uma pequena descarga de Ponto atinge o alvo.', 2, '1d6', 'Curto', 'Instantânea', '', 'Mago', 1, ''),
  ('Pele de Escamas', 'magia', 'Ponto', 'Uma proteção de Ponto envolve o conjurador: +1 de Defesa.', 2, null, 'Pessoal', 'Cena', '', 'Sacerdote', 2, ''),
  ('Bolha de Pressão', 'magia', 'Ponto', 'Um projétil de Ponto viaja até o alvo.', 3, '1d8+1', 'Médio', 'Instantânea', '', 'Feiticeiro', 3, ''),
  ('Água Benta do Mar', 'magia', 'Ponto', 'A energia de Ponto recupera 1d8 de Vida de um aliado.', 3, null, 'Toque', 'Instantânea', '', 'Sacerdote', 3, ''),
  ('Onda Quebrada', 'magia', 'Ponto', 'Uma explosão de Ponto atinge todos numa pequena área.', 4, '2d6', 'Área pequena', 'Instantânea', '', 'Mago', 5, ''),
  ('Marca da Maré', 'magia', 'Ponto', 'O alvo é marcado por Ponto e sofre −2 nos testes.', 4, null, 'Médio', '2 turnos', '', 'Feiticeiro', 6, ''),
  ('Tridente de Espuma', 'magia', 'Ponto', 'A arma do conjurador se cobre de Ponto por um golpe.', 5, '2d8', 'Corpo a corpo', 'Instantânea', '', 'Paladino', 7, ''),
  ('Lamaçal das Marés', 'magia', 'Ponto', 'Uma zona de Ponto dificulta o movimento dos inimigos.', 6, null, 'Área média', '3 turnos', '', 'Mago', 9, ''),
  ('Feixe Abissal', 'magia', 'Ponto', 'Um feixe concentrado de Ponto atravessa a distância.', 8, '3d8', 'Longo', 'Instantânea', '', 'Feiticeiro', 11, ''),
  ('Avatar das Profundezas', 'magia', 'Ponto', 'O conjurador se torna um avatar de Ponto: +2 em ataques.', 9, null, 'Pessoal', 'Cena', '', 'Paladino', 13, ''),
  ('Dilúvio', 'magia', 'Ponto', 'Ponto desaba sobre a área com força total.', 11, '4d8', 'Área média', 'Instantânea', '', 'Mago', 16, ''),
  ('Redemoinho Prisão', 'magia', 'Ponto', 'O alvo é tomado por Ponto e não consegue agir.', 13, null, 'Médio', '3 turnos', '', 'Feiticeiro', 18, ''),
  ('Dardo Escuro', 'magia', 'Érebo', 'Uma pequena descarga de Érebo atinge o alvo.', 2, '1d6', 'Curto', 'Instantânea', '', 'Mago', 1, ''),
  ('Véu de Penumbra', 'magia', 'Érebo', 'Uma proteção de Érebo envolve o conjurador: +1 de Defesa.', 2, null, 'Pessoal', 'Cena', '', 'Sacerdote', 2, ''),
  ('Bola de Breu', 'magia', 'Érebo', 'Um projétil de Érebo viaja até o alvo.', 3, '1d8+1', 'Médio', 'Instantânea', '', 'Feiticeiro', 3, ''),
  ('Sombra Remendada', 'magia', 'Érebo', 'A energia de Érebo recupera 1d8 de Vida de um aliado.', 3, null, 'Toque', 'Instantânea', '', 'Sacerdote', 3, ''),
  ('Explosão Silenciosa', 'magia', 'Érebo', 'Uma explosão de Érebo atinge todos numa pequena área.', 4, '2d6', 'Área pequena', 'Instantânea', '', 'Mago', 5, ''),
  ('Marca do Esquecido', 'magia', 'Érebo', 'O alvo é marcado por Érebo e sofre −2 nos testes.', 4, null, 'Médio', '2 turnos', '', 'Feiticeiro', 6, ''),
  ('Fio da Escuridão', 'magia', 'Érebo', 'A arma do conjurador se cobre de Érebo por um golpe.', 5, '2d8', 'Corpo a corpo', 'Instantânea', '', 'Paladino', 7, ''),
  ('Poço de Trevas', 'magia', 'Érebo', 'Uma zona de Érebo dificulta o movimento dos inimigos.', 6, null, 'Área média', '3 turnos', '', 'Mago', 9, ''),
  ('Lança do Vazio', 'magia', 'Érebo', 'Um feixe concentrado de Érebo atravessa a distância.', 8, '3d8', 'Longo', 'Instantânea', '', 'Feiticeiro', 11, ''),
  ('Avatar da Sombra', 'magia', 'Érebo', 'O conjurador se torna um avatar de Érebo: +2 em ataques.', 9, null, 'Pessoal', 'Cena', '', 'Paladino', 13, ''),
  ('Eclipse', 'magia', 'Érebo', 'Érebo desaba sobre a área com força total.', 11, '4d8', 'Área média', 'Instantânea', '', 'Mago', 16, ''),
  ('Jaula de Sombras', 'magia', 'Érebo', 'O alvo é tomado por Érebo e não consegue agir.', 13, null, 'Médio', '3 turnos', '', 'Feiticeiro', 18, ''),
  ('Estrela Cadente', 'magia', 'Nix', 'Uma pequena descarga de Nix atinge o alvo.', 2, '1d6', 'Curto', 'Instantânea', '', 'Mago', 1, ''),
  ('Manto Estrelado', 'magia', 'Nix', 'Uma proteção de Nix envolve o conjurador: +1 de Defesa.', 2, null, 'Pessoal', 'Cena', '', 'Sacerdote', 2, ''),
  ('Cometa Menor', 'magia', 'Nix', 'Um projétil de Nix viaja até o alvo.', 3, '1d8+1', 'Médio', 'Instantânea', '', 'Feiticeiro', 3, ''),
  ('Sonho Restaurador', 'magia', 'Nix', 'A energia de Nix recupera 1d8 de Vida de um aliado.', 3, null, 'Toque', 'Instantânea', '', 'Sacerdote', 3, ''),
  ('Chuva de Estrelas', 'magia', 'Nix', 'Uma explosão de Nix atinge todos numa pequena área.', 4, '2d6', 'Área pequena', 'Instantânea', '', 'Mago', 5, ''),
  ('Marca do Pesadelo', 'magia', 'Nix', 'O alvo é marcado por Nix e sofre −2 nos testes.', 4, null, 'Médio', '2 turnos', '', 'Feiticeiro', 6, ''),
  ('Lâmina Lunar', 'magia', 'Nix', 'A arma do conjurador se cobre de Nix por um golpe.', 5, '2d8', 'Corpo a corpo', 'Instantânea', '', 'Paladino', 7, ''),
  ('Bruma dos Sonhos', 'magia', 'Nix', 'Uma zona de Nix dificulta o movimento dos inimigos.', 6, null, 'Área média', '3 turnos', '', 'Mago', 9, ''),
  ('Feixe Lunar', 'magia', 'Nix', 'Um feixe concentrado de Nix atravessa a distância.', 8, '3d8', 'Longo', 'Instantânea', '', 'Feiticeiro', 11, ''),
  ('Avatar da Noite', 'magia', 'Nix', 'O conjurador se torna um avatar de Nix: +2 em ataques.', 9, null, 'Pessoal', 'Cena', '', 'Paladino', 13, ''),
  ('Queda da Lua', 'magia', 'Nix', 'Nix desaba sobre a área com força total.', 11, '4d8', 'Área média', 'Instantânea', '', 'Mago', 16, ''),
  ('Transe Profundo', 'magia', 'Nix', 'O alvo é tomado por Nix e não consegue agir.', 13, null, 'Médio', '3 turnos', '', 'Feiticeiro', 18, ''),
  ('Elo Partido', 'magia', 'Tártaro', 'Uma pequena descarga de Tártaro atinge o alvo.', 2, '1d6', 'Curto', 'Instantânea', '', 'Mago', 1, ''),
  ('Couraça de Correntes', 'magia', 'Tártaro', 'Uma proteção de Tártaro envolve o conjurador: +1 de Defesa.', 2, null, 'Pessoal', 'Cena', '', 'Sacerdote', 2, ''),
  ('Bola de Enxofre', 'magia', 'Tártaro', 'Um projétil de Tártaro viaja até o alvo.', 3, '1d8+1', 'Médio', 'Instantânea', '', 'Feiticeiro', 3, ''),
  ('Pacto de Sangue', 'magia', 'Tártaro', 'A energia de Tártaro recupera 1d8 de Vida de um aliado.', 3, null, 'Toque', 'Instantânea', '', 'Sacerdote', 3, ''),
  ('Erupção Profana', 'magia', 'Tártaro', 'Uma explosão de Tártaro atinge todos numa pequena área.', 4, '2d6', 'Área pequena', 'Instantânea', '', 'Mago', 5, ''),
  ('Marca da Corrupção', 'magia', 'Tártaro', 'O alvo é marcado por Tártaro e sofre −2 nos testes.', 4, null, 'Médio', '2 turnos', '', 'Feiticeiro', 6, ''),
  ('Gume Enferrujado', 'magia', 'Tártaro', 'A arma do conjurador se cobre de Tártaro por um golpe.', 5, '2d8', 'Corpo a corpo', 'Instantânea', '', 'Paladino', 7, ''),
  ('Solo Corrompido', 'magia', 'Tártaro', 'Uma zona de Tártaro dificulta o movimento dos inimigos.', 6, null, 'Área média', '3 turnos', '', 'Mago', 9, ''),
  ('Lança Infernal', 'magia', 'Tártaro', 'Um feixe concentrado de Tártaro atravessa a distância.', 8, '3d8', 'Longo', 'Instantânea', '', 'Feiticeiro', 11, ''),
  ('Avatar do Abismo', 'magia', 'Tártaro', 'O conjurador se torna um avatar de Tártaro: +2 em ataques.', 9, null, 'Pessoal', 'Cena', '', 'Paladino', 13, ''),
  ('Colapso do Selo', 'magia', 'Tártaro', 'Tártaro desaba sobre a área com força total.', 11, '4d8', 'Área média', 'Instantânea', '', 'Mago', 16, ''),
  ('Correntes Eternas', 'magia', 'Tártaro', 'O alvo é tomado por Tártaro e não consegue agir.', 13, null, 'Médio', '3 turnos', '', 'Feiticeiro', 18, ''),
  ('Pena de Luz', 'magia', 'Éter', 'Uma pequena descarga de Éter atinge o alvo.', 2, '1d6', 'Curto', 'Instantânea', '', 'Mago', 1, ''),
  ('Halo Protetor', 'magia', 'Éter', 'Uma proteção de Éter envolve o conjurador: +1 de Defesa.', 2, null, 'Pessoal', 'Cena', '', 'Sacerdote', 2, ''),
  ('Orbe Sagrado', 'magia', 'Éter', 'Um projétil de Éter viaja até o alvo.', 3, '1d8+1', 'Médio', 'Instantânea', '', 'Feiticeiro', 3, ''),
  ('Toque Curativo', 'magia', 'Éter', 'A energia de Éter recupera 1d8 de Vida de um aliado.', 3, null, 'Toque', 'Instantânea', '', 'Sacerdote', 3, ''),
  ('Explosão Sagrada', 'magia', 'Éter', 'Uma explosão de Éter atinge todos numa pequena área.', 4, '2d6', 'Área pequena', 'Instantânea', '', 'Mago', 5, ''),
  ('Marca da Verdade', 'magia', 'Éter', 'O alvo é marcado por Éter e sofre −2 nos testes.', 4, null, 'Médio', '2 turnos', '', 'Feiticeiro', 6, ''),
  ('Gume Radiante', 'magia', 'Éter', 'A arma do conjurador se cobre de Éter por um golpe.', 5, '2d8', 'Corpo a corpo', 'Instantânea', '', 'Paladino', 7, ''),
  ('Santuário', 'magia', 'Éter', 'Uma zona de Éter dificulta o movimento dos inimigos.', 6, null, 'Área média', '3 turnos', '', 'Mago', 9, ''),
  ('Raio Divino', 'magia', 'Éter', 'Um feixe concentrado de Éter atravessa a distância.', 8, '3d8', 'Longo', 'Instantânea', '', 'Feiticeiro', 11, ''),
  ('Avatar Celestial', 'magia', 'Éter', 'O conjurador se torna um avatar de Éter: +2 em ataques.', 9, null, 'Pessoal', 'Cena', '', 'Paladino', 13, ''),
  ('Queda dos Céus', 'magia', 'Éter', 'Éter desaba sobre a área com força total.', 11, '4d8', 'Área média', 'Instantânea', '', 'Mago', 16, ''),
  ('Luz Aprisionadora', 'magia', 'Éter', 'O alvo é tomado por Éter e não consegue agir.', 13, null, 'Médio', '3 turnos', '', 'Feiticeiro', 18, ''),
  ('Tique Cortante', 'magia', 'Ananque', 'Uma pequena descarga de Ananque atinge o alvo.', 2, '1d6', 'Curto', 'Instantânea', '', 'Mago', 1, ''),
  ('Couraça de Engrenagens', 'magia', 'Ananque', 'Uma proteção de Ananque envolve o conjurador: +1 de Defesa.', 2, null, 'Pessoal', 'Cena', '', 'Sacerdote', 2, ''),
  ('Ponteiro Arremessado', 'magia', 'Ananque', 'Um projétil de Ananque viaja até o alvo.', 3, '1d8+1', 'Médio', 'Instantânea', '', 'Feiticeiro', 3, ''),
  ('Remendo do Tempo', 'magia', 'Ananque', 'A energia de Ananque recupera 1d8 de Vida de um aliado.', 3, null, 'Toque', 'Instantânea', '', 'Sacerdote', 3, ''),
  ('Badalada', 'magia', 'Ananque', 'Uma explosão de Ananque atinge todos numa pequena área.', 4, '2d6', 'Área pequena', 'Instantânea', '', 'Mago', 5, ''),
  ('Marca do Prazo', 'magia', 'Ananque', 'O alvo é marcado por Ananque e sofre −2 nos testes.', 4, null, 'Médio', '2 turnos', '', 'Feiticeiro', 6, ''),
  ('Gume do Instante', 'magia', 'Ananque', 'A arma do conjurador se cobre de Ananque por um golpe.', 5, '2d8', 'Corpo a corpo', 'Instantânea', '', 'Paladino', 7, ''),
  ('Areia Lenta', 'magia', 'Ananque', 'Uma zona de Ananque dificulta o movimento dos inimigos.', 6, null, 'Área média', '3 turnos', '', 'Mago', 9, ''),
  ('Linha do Destino', 'magia', 'Ananque', 'Um feixe concentrado de Ananque atravessa a distância.', 8, '3d8', 'Longo', 'Instantânea', '', 'Feiticeiro', 11, ''),
  ('Avatar da Ordem', 'magia', 'Ananque', 'O conjurador se torna um avatar de Ananque: +2 em ataques.', 9, null, 'Pessoal', 'Cena', '', 'Paladino', 13, ''),
  ('Fim do Ciclo', 'magia', 'Ananque', 'Ananque desaba sobre a área com força total.', 11, '4d8', 'Área média', 'Instantânea', '', 'Mago', 16, ''),
  ('Tempo Parado', 'magia', 'Ananque', 'O alvo é tomado por Ananque e não consegue agir.', 13, null, 'Médio', '3 turnos', '', 'Feiticeiro', 18, ''),
  ('Faísca Solar', 'magia', 'Hemera', 'Uma pequena descarga de Hemera atinge o alvo.', 2, '1d6', 'Curto', 'Instantânea', '', 'Mago', 1, ''),
  ('Escudo da Aurora', 'magia', 'Hemera', 'Uma proteção de Hemera envolve o conjurador: +1 de Defesa.', 2, null, 'Pessoal', 'Cena', '', 'Sacerdote', 2, ''),
  ('Orbe do Meio-Dia', 'magia', 'Hemera', 'Um projétil de Hemera viaja até o alvo.', 3, '1d8+1', 'Médio', 'Instantânea', '', 'Feiticeiro', 3, ''),
  ('Calor Restaurador', 'magia', 'Hemera', 'A energia de Hemera recupera 1d8 de Vida de um aliado.', 3, null, 'Toque', 'Instantânea', '', 'Sacerdote', 3, ''),
  ('Explosão de Luz', 'magia', 'Hemera', 'Uma explosão de Hemera atinge todos numa pequena área.', 4, '2d6', 'Área pequena', 'Instantânea', '', 'Mago', 5, ''),
  ('Marca do Sol', 'magia', 'Hemera', 'O alvo é marcado por Hemera e sofre −2 nos testes.', 4, null, 'Médio', '2 turnos', '', 'Feiticeiro', 6, ''),
  ('Gume Dourado', 'magia', 'Hemera', 'A arma do conjurador se cobre de Hemera por um golpe.', 5, '2d8', 'Corpo a corpo', 'Instantânea', '', 'Paladino', 7, ''),
  ('Areia Escaldante', 'magia', 'Hemera', 'Uma zona de Hemera dificulta o movimento dos inimigos.', 6, null, 'Área média', '3 turnos', '', 'Mago', 9, ''),
  ('Lança do Zênite', 'magia', 'Hemera', 'Um feixe concentrado de Hemera atravessa a distância.', 8, '3d8', 'Longo', 'Instantânea', '', 'Feiticeiro', 11, ''),
  ('Avatar do Dia', 'magia', 'Hemera', 'O conjurador se torna um avatar de Hemera: +2 em ataques.', 9, null, 'Pessoal', 'Cena', '', 'Paladino', 13, ''),
  ('Queda do Sol', 'magia', 'Hemera', 'Hemera desaba sobre a área com força total.', 11, '4d8', 'Área média', 'Instantânea', '', 'Mago', 16, ''),
  ('Prisão de Luz', 'magia', 'Hemera', 'O alvo é tomado por Hemera e não consegue agir.', 13, null, 'Médio', '3 turnos', '', 'Feiticeiro', 18, ''),
  ('Passo da Aurora', 'magia', 'Hemera', 'O conjurador se desloca 6 metros envolto em Hemera.', 3, null, 'Pessoal', 'Instantânea', '', 'Ladino', 4, ''),
  ('Onda da Alvorada', 'magia', 'Hemera', 'Uma onda de Hemera fere inimigos e cura aliados próximos em 1d6.', 8, '2d10', 'Curto', 'Instantânea', '', 'Sacerdote', 12, ''),
  ('Ataque: Adaga', 'poder', null, 'Ataque básico com adaga. Leve; pode ser arremessada.', 0, '1d4', 'Corpo a corpo', 'Instantânea', 'Adaga equipado(a)', 'Ladino', 1, ''),
  ('Ataque: Faca de caça', 'poder', null, 'Ataque básico com faca de caça. Leve.', 0, '1d4+1', 'Corpo a corpo', 'Instantânea', 'Faca de caça equipado(a)', 'Atirador', 1, ''),
  ('Ataque: Espada curta', 'poder', null, 'Ataque básico com espada curta. Leve.', 0, '1d6', 'Corpo a corpo', 'Instantânea', 'Espada curta equipado(a)', 'Ladino', 1, ''),
  ('Ataque: Espada longa', 'poder', null, 'Ataque básico com espada longa.', 0, '1d8', 'Corpo a corpo', 'Instantânea', 'Espada longa equipado(a)', 'Cavaleiro', 1, ''),
  ('Ataque: Montante', 'poder', null, 'Ataque básico com montante. Duas mãos.', 0, '2d6', 'Corpo a corpo', 'Instantânea', 'Montante equipado(a)', 'Cavaleiro', 1, ''),
  ('Ataque: Sabre', 'poder', null, 'Ataque básico com sabre. Leve.', 0, '1d6+1', 'Corpo a corpo', 'Instantânea', 'Sabre equipado(a)', 'Ladino', 1, ''),
  ('Ataque: Rapieira', 'poder', null, 'Ataque básico com rapieira. Crítico 19+.', 0, '1d8', 'Corpo a corpo', 'Instantânea', 'Rapieira equipado(a)', 'Ladino', 1, ''),
  ('Ataque: Machadinha', 'poder', null, 'Ataque básico com machadinha. Pode ser arremessada.', 0, '1d6', 'Corpo a corpo', 'Instantânea', 'Machadinha equipado(a)', 'Atirador', 1, ''),
  ('Ataque: Machado de guerra', 'poder', null, 'Ataque básico com machado de guerra. Duas mãos.', 0, '1d10', 'Corpo a corpo', 'Instantânea', 'Machado de guerra equipado(a)', 'Cavaleiro', 1, ''),
  ('Ataque: Maça', 'poder', null, 'Ataque básico com maça. Impacto.', 0, '1d8', 'Corpo a corpo', 'Instantânea', 'Maça equipado(a)', 'Sacerdote', 1, ''),
  ('Ataque: Martelo de guerra', 'poder', null, 'Ataque básico com martelo de guerra. Duas mãos; impacto.', 0, '1d10', 'Corpo a corpo', 'Instantânea', 'Martelo de guerra equipado(a)', 'Paladino', 1, ''),
  ('Ataque: Mangual', 'poder', null, 'Ataque básico com mangual. Ignora 1 de Defesa de escudos.', 0, '1d8+1', 'Corpo a corpo', 'Instantânea', 'Mangual equipado(a)', 'Paladino', 1, ''),
  ('Ataque: Lança', 'poder', null, 'Ataque básico com lança. Alcança 3 metros.', 0, '1d8', 'Corpo a corpo', 'Instantânea', 'Lança equipado(a)', 'Cavaleiro', 1, ''),
  ('Ataque: Alabarda', 'poder', null, 'Ataque básico com alabarda. Duas mãos; alcança 3 metros.', 0, '1d10', 'Corpo a corpo', 'Instantânea', 'Alabarda equipado(a)', 'Cavaleiro', 1, ''),
  ('Ataque: Foice', 'poder', null, 'Ataque básico com foice. Duas mãos.', 0, '1d8', 'Corpo a corpo', 'Instantânea', 'Foice equipado(a)', 'Feiticeiro', 1, ''),
  ('Ataque: Gadanha', 'poder', null, 'Ataque básico com gadanha. Duas mãos.', 0, '2d4+1', 'Corpo a corpo', 'Instantânea', 'Gadanha equipado(a)', 'Feiticeiro', 1, ''),
  ('Ataque: Chicote', 'poder', null, 'Ataque básico com chicote. Alcança 3 metros; pode desarmar.', 0, '1d4', 'Curto', 'Instantânea', 'Chicote equipado(a)', 'Ladino', 1, ''),
  ('Ataque: Cajado', 'poder', null, 'Ataque básico com cajado. Duas mãos; foco de magia.', 0, '1d6', 'Corpo a corpo', 'Instantânea', 'Cajado equipado(a)', 'Mago', 1, ''),
  ('Ataque: Bordão', 'poder', null, 'Ataque básico com bordão. Duas mãos.', 0, '1d6', 'Corpo a corpo', 'Instantânea', 'Bordão equipado(a)', 'Sacerdote', 1, ''),
  ('Ataque: Manoplas', 'poder', null, 'Ataque básico com manoplas. Desarmado.', 0, '1d4+1', 'Corpo a corpo', 'Instantânea', 'Manoplas equipado(a)', 'Paladino', 1, ''),
  ('Ataque: Garras de ferro', 'poder', null, 'Ataque básico com garras de ferro. Leve.', 0, '1d6', 'Corpo a corpo', 'Instantânea', 'Garras de ferro equipado(a)', 'Ladino', 1, ''),
  ('Ataque: Escudo', 'poder', null, 'Ataque básico com escudo. +2 de Defesa quando equipado.', 0, '1d4', 'Corpo a corpo', 'Instantânea', 'Escudo equipado(a)', 'Cavaleiro', 1, ''),
  ('Ataque: Arco curto', 'poder', null, 'Ataque básico com arco curto. Duas mãos.', 0, '1d6', 'Médio', 'Instantânea', 'Arco curto equipado(a)', 'Atirador', 1, ''),
  ('Ataque: Arco longo', 'poder', null, 'Ataque básico com arco longo. Duas mãos.', 0, '1d8', 'Longo', 'Instantânea', 'Arco longo equipado(a)', 'Atirador', 1, ''),
  ('Ataque: Besta leve', 'poder', null, 'Ataque básico com besta leve. Recarregar gasta o movimento.', 0, '1d8', 'Longo', 'Instantânea', 'Besta leve equipado(a)', 'Atirador', 1, ''),
  ('Ataque: Besta', 'poder', null, 'Ataque básico com besta. Recarregar gasta o movimento.', 0, '1d10', 'Longo', 'Instantânea', 'Besta equipado(a)', 'Atirador', 1, ''),
  ('Ataque: Funda', 'poder', null, 'Ataque básico com funda.', 0, '1d4', 'Médio', 'Instantânea', 'Funda equipado(a)', 'Atirador', 1, ''),
  ('Ataque: Dardos', 'poder', null, 'Ataque básico com dardos. Arremesso.', 0, '1d4', 'Curto', 'Instantânea', 'Dardos equipado(a)', 'Ladino', 1, ''),
  ('Ataque: Azagaia', 'poder', null, 'Ataque básico com azagaia. Arremesso.', 0, '1d6', 'Médio', 'Instantânea', 'Azagaia equipado(a)', 'Atirador', 1, ''),
  ('Golpe Guardião', 'poder', null, 'Uma técnica defensiva que transforma bloqueio em contra-ataque.', 0, '1d8+1', 'Corpo a corpo', 'Instantânea', 'Escudo equipado', 'Cavaleiro', 1, ''),
  ('Investida', 'poder', null, 'Avança e golpeia com o peso do corpo.', 0, '1d8+2', 'Corpo a corpo', 'Instantânea', 'Mover em linha reta antes do ataque', 'Cavaleiro', 1, ''),
  ('Corte Giratório', 'poder', null, 'Atinge todos os inimigos adjacentes.', 0, '1d8', 'Corpo a corpo', 'Instantânea', 'Espada ou machado', 'Cavaleiro', 4, ''),
  ('Muralha de Aço', 'poder', null, 'Até o próximo turno, a Defesa sobe 4.', 0, null, 'Pessoal', '1 turno', 'Escudo equipado', 'Cavaleiro', 5, ''),
  ('Golpe Esmagador', 'poder', null, 'Um golpe pesado que derruba o alvo se falhar em Força.', 0, '2d8', 'Corpo a corpo', 'Instantânea', 'Arma de duas mãos', 'Cavaleiro', 8, ''),
  ('Ataque Furtivo', 'poder', null, 'Golpe preciso num ponto fraco.', 0, '2d6', 'Corpo a corpo', 'Instantânea', 'Alvo distraído ou flanqueado', 'Ladino', 1, ''),
  ('Lâmina Dupla', 'poder', null, 'Ataca duas vezes com armas leves; a segunda sem bônus.', 0, '1d6', 'Corpo a corpo', 'Instantânea', 'Duas armas leves', 'Ladino', 3, ''),
  ('Desarmar', 'poder', null, 'Arranca a arma do alvo se ele falhar em Agilidade.', 0, null, 'Corpo a corpo', 'Instantânea', 'Chicote ou arma leve', 'Ladino', 4, ''),
  ('Golpe Venenoso', 'poder', null, 'O alvo sofre 1d4 por turno durante 3 turnos.', 0, '1d6', 'Corpo a corpo', '3 turnos', 'Veneno aplicado na arma', 'Ladino', 6, ''),
  ('Sombra Mortal', 'poder', null, 'Sai das sombras com um golpe devastador.', 0, '3d6', 'Corpo a corpo', 'Instantânea', 'Estar escondido', 'Ladino', 10, ''),
  ('Tiro Certeiro', 'poder', null, 'Mira com calma e acerta um ponto vital.', 0, '1d8+2', 'Longo', 'Instantânea', 'Arco ou besta', 'Atirador', 1, ''),
  ('Chuva de Flechas', 'poder', null, 'Dispara várias flechas para o alto sobre uma área.', 0, '1d6', 'Área média', 'Instantânea', 'Arco', 'Atirador', 5, ''),
  ('Flecha Perfurante', 'poder', null, 'Atravessa o primeiro alvo e atinge o de trás.', 0, '2d6', 'Longo', 'Instantânea', 'Arco longo ou besta', 'Atirador', 7, ''),
  ('Tiro Imobilizador', 'poder', null, 'Prende o pé do alvo no chão.', 0, '1d6', 'Longo', '1 turno', 'Arco ou besta', 'Atirador', 4, ''),
  ('Olho de Falcão', 'poder', null, 'Crítico em 18+ com armas à distância.', 0, null, 'Pessoal', 'Cena', 'Arma à distância', 'Atirador', 9, ''),
  ('Golpe Sagrado', 'poder', null, 'A arma brilha com fé e fere criaturas corrompidas.', 0, '1d8+3', 'Corpo a corpo', 'Instantânea', 'Arma corpo a corpo', 'Paladino', 1, ''),
  ('Juramento', 'poder', null, 'Escolhe um inimigo: +2 para acertá-lo até o fim da cena.', 0, null, 'Pessoal', 'Cena', '', 'Paladino', 3, ''),
  ('Martelo do Juízo', 'poder', null, 'Um golpe que faz o chão tremer.', 0, '2d8+2', 'Corpo a corpo', 'Instantânea', 'Martelo ou maça', 'Paladino', 9, ''),
  ('Foice Ceifadora', 'poder', null, 'Varre em meia-lua todos à frente.', 0, '2d6', 'Corpo a corpo', 'Instantânea', 'Foice ou gadanha', 'Feiticeiro', 5, ''),
  ('Golpe Arcano', 'poder', null, 'O cajado descarrega energia ao tocar o alvo.', 0, '1d6+2', 'Corpo a corpo', 'Instantânea', 'Cajado', 'Mago', 1, ''),
  ('Bastão Giratório', 'poder', null, 'Golpeia e afasta o alvo 2 metros.', 0, '1d6', 'Corpo a corpo', 'Instantânea', 'Cajado ou bordão', 'Sacerdote', 3, ''),
  ('Soco de Ferro', 'poder', null, 'Dois socos rápidos com as manoplas.', 0, '1d6+1', 'Corpo a corpo', 'Instantânea', 'Manoplas', 'Paladino', 2, ''),
  ('Arremesso Preciso', 'poder', null, 'Lança a arma com precisão; ela cai perto do alvo.', 0, '1d6+1', 'Médio', 'Instantânea', 'Arma de arremesso', 'Atirador', 2, ''),
  ('Contra-ataque', 'poder', null, 'Quando um inimigo erra, revida na hora.', 0, '1d6', 'Corpo a corpo', 'Reação', 'Ter sido atacado e errado', 'Cavaleiro', 6, '')
on conflict ((lower(name)), type) do nothing;

insert into monsters (name, category, difficulty, base_health, min_health, max_health, armor, description)
select 'Diabrete do Caos', 'Caos', 'Baixa', 8, 5, 11, 11, 'Criaturinha feita de faíscas instáveis.'
where not exists (select 1 from monsters where lower(name) = lower('Diabrete do Caos') and deleted_at is null);

insert into monster_attacks (monster_id, name, damage_formula, description)
select m.id, 'Mordida faiscante', '1d6', '' from monsters m
where lower(m.name) = lower('Diabrete do Caos') and m.deleted_at is null
  and not exists (select 1 from monster_attacks a where a.monster_id = m.id and lower(a.name) = lower('Mordida faiscante'));

insert into monster_attacks (monster_id, name, damage_formula, description)
select m.id, 'Estilhaço', '1d4+1', 'Arremessa um fragmento de realidade.' from monsters m
where lower(m.name) = lower('Diabrete do Caos') and m.deleted_at is null
  and not exists (select 1 from monster_attacks a where a.monster_id = m.id and lower(a.name) = lower('Estilhaço'));

insert into monsters (name, category, difficulty, base_health, min_health, max_health, armor, description)
select 'Aberração Fendida', 'Caos', 'Alta', 34, 26, 42, 13, 'Corpo que nunca termina de se formar.'
where not exists (select 1 from monsters where lower(name) = lower('Aberração Fendida') and deleted_at is null);

insert into monster_attacks (monster_id, name, damage_formula, description)
select m.id, 'Garras múltiplas', '2d6', '' from monsters m
where lower(m.name) = lower('Aberração Fendida') and m.deleted_at is null
  and not exists (select 1 from monster_attacks a where a.monster_id = m.id and lower(a.name) = lower('Garras múltiplas'));

insert into monster_attacks (monster_id, name, damage_formula, description)
select m.id, 'Grito da Ruptura', '1d10', 'Abala a Sanidade de quem ouve.' from monsters m
where lower(m.name) = lower('Aberração Fendida') and m.deleted_at is null
  and not exists (select 1 from monster_attacks a where a.monster_id = m.id and lower(a.name) = lower('Grito da Ruptura'));

insert into monsters (name, category, difficulty, base_health, min_health, max_health, armor, description)
select 'Lobo de Musgo', 'Gaia', 'Baixa', 12, 8, 16, 11, 'Lobo antigo coberto de musgo e raízes. Habilidades: Uivo da Mata: Chama outros lobos.'
where not exists (select 1 from monsters where lower(name) = lower('Lobo de Musgo') and deleted_at is null);

insert into monster_attacks (monster_id, name, damage_formula, description)
select m.id, 'Mordida', '1d6+1', '' from monsters m
where lower(m.name) = lower('Lobo de Musgo') and m.deleted_at is null
  and not exists (select 1 from monster_attacks a where a.monster_id = m.id and lower(a.name) = lower('Mordida'));

insert into monsters (name, category, difficulty, base_health, min_health, max_health, armor, description)
select 'Ent Partido', 'Gaia', 'Alta', 40, 32, 48, 15, 'Árvore desperta e furiosa.'
where not exists (select 1 from monsters where lower(name) = lower('Ent Partido') and deleted_at is null);

insert into monster_attacks (monster_id, name, damage_formula, description)
select m.id, 'Pancada de galho', '2d8', '' from monsters m
where lower(m.name) = lower('Ent Partido') and m.deleted_at is null
  and not exists (select 1 from monster_attacks a where a.monster_id = m.id and lower(a.name) = lower('Pancada de galho'));

insert into monster_attacks (monster_id, name, damage_formula, description)
select m.id, 'Raízes', '1d6', 'Imobiliza se falhar em Agilidade.' from monsters m
where lower(m.name) = lower('Ent Partido') and m.deleted_at is null
  and not exists (select 1 from monster_attacks a where a.monster_id = m.id and lower(a.name) = lower('Raízes'));

insert into monsters (name, category, difficulty, base_health, min_health, max_health, armor, description)
select 'Afogado', 'Ponto', 'Média', 16, 12, 20, 11, 'Marinheiro que voltou das profundezas.'
where not exists (select 1 from monsters where lower(name) = lower('Afogado') and deleted_at is null);

insert into monster_attacks (monster_id, name, damage_formula, description)
select m.id, 'Agarrar', '1d6', 'Puxa para a água.' from monsters m
where lower(m.name) = lower('Afogado') and m.deleted_at is null
  and not exists (select 1 from monster_attacks a where a.monster_id = m.id and lower(a.name) = lower('Agarrar'));

insert into monster_attacks (monster_id, name, damage_formula, description)
select m.id, 'Golpe encharcado', '1d8', '' from monsters m
where lower(m.name) = lower('Afogado') and m.deleted_at is null
  and not exists (select 1 from monster_attacks a where a.monster_id = m.id and lower(a.name) = lower('Golpe encharcado'));

insert into monsters (name, category, difficulty, base_health, min_health, max_health, armor, description)
select 'Serpente da Maré', 'Ponto', 'Alta', 36, 28, 44, 14, 'Serpente marinha das tempestades.'
where not exists (select 1 from monsters where lower(name) = lower('Serpente da Maré') and deleted_at is null);

insert into monster_attacks (monster_id, name, damage_formula, description)
select m.id, 'Mordida', '2d6+2', '' from monsters m
where lower(m.name) = lower('Serpente da Maré') and m.deleted_at is null
  and not exists (select 1 from monster_attacks a where a.monster_id = m.id and lower(a.name) = lower('Mordida'));

insert into monster_attacks (monster_id, name, damage_formula, description)
select m.id, 'Jato de água', '1d10', 'Empurra 3 metros.' from monsters m
where lower(m.name) = lower('Serpente da Maré') and m.deleted_at is null
  and not exists (select 1 from monster_attacks a where a.monster_id = m.id and lower(a.name) = lower('Jato de água'));

insert into monsters (name, category, difficulty, base_health, min_health, max_health, armor, description)
select 'Sombra Faminta', 'Érebo', 'Média', 14, 10, 18, 13, 'Sombra que se alimenta de luz. Habilidades: Apagar: Apaga tochas próximas.'
where not exists (select 1 from monsters where lower(name) = lower('Sombra Faminta') and deleted_at is null);

insert into monster_attacks (monster_id, name, damage_formula, description)
select m.id, 'Toque gelado', '1d8', '' from monsters m
where lower(m.name) = lower('Sombra Faminta') and m.deleted_at is null
  and not exists (select 1 from monster_attacks a where a.monster_id = m.id and lower(a.name) = lower('Toque gelado'));

insert into monsters (name, category, difficulty, base_health, min_health, max_health, armor, description)
select 'Arauto do Silêncio', 'Érebo', 'Mortal', 48, 40, 56, 16, 'Ninguém ouve seus passos. Habilidades: Silêncio absoluto: Ninguém conjura magia falada por 2 turnos.'
where not exists (select 1 from monsters where lower(name) = lower('Arauto do Silêncio') and deleted_at is null);

insert into monster_attacks (monster_id, name, damage_formula, description)
select m.id, 'Lâmina muda', '2d8+3', '' from monsters m
where lower(m.name) = lower('Arauto do Silêncio') and m.deleted_at is null
  and not exists (select 1 from monster_attacks a where a.monster_id = m.id and lower(a.name) = lower('Lâmina muda'));

insert into monsters (name, category, difficulty, base_health, min_health, max_health, armor, description)
select 'Mariposa do Sono', 'Nix', 'Baixa', 6, 4, 8, 10, 'Mariposa de pó prateado. Habilidades: Pó sonífero: Sono se falhar em Vigor.'
where not exists (select 1 from monsters where lower(name) = lower('Mariposa do Sono') and deleted_at is null);

insert into monster_attacks (monster_id, name, damage_formula, description)
select m.id, 'Asa cortante', '1d4', '' from monsters m
where lower(m.name) = lower('Mariposa do Sono') and m.deleted_at is null
  and not exists (select 1 from monster_attacks a where a.monster_id = m.id and lower(a.name) = lower('Asa cortante'));

insert into monsters (name, category, difficulty, base_health, min_health, max_health, armor, description)
select 'Devorador de Sonhos', 'Nix', 'Alta', 30, 24, 36, 13, 'Alimenta-se de pesadelos alheios.'
where not exists (select 1 from monsters where lower(name) = lower('Devorador de Sonhos') and deleted_at is null);

insert into monster_attacks (monster_id, name, damage_formula, description)
select m.id, 'Garra onírica', '2d6', '' from monsters m
where lower(m.name) = lower('Devorador de Sonhos') and m.deleted_at is null
  and not exists (select 1 from monster_attacks a where a.monster_id = m.id and lower(a.name) = lower('Garra onírica'));

insert into monster_attacks (monster_id, name, damage_formula, description)
select m.id, 'Pesadelo', '1d10', 'Dano na Sanidade.' from monsters m
where lower(m.name) = lower('Devorador de Sonhos') and m.deleted_at is null
  and not exists (select 1 from monster_attacks a where a.monster_id = m.id and lower(a.name) = lower('Pesadelo'));

insert into monsters (name, category, difficulty, base_health, min_health, max_health, armor, description)
select 'Cão Acorrentado', 'Tártaro', 'Média', 18, 14, 22, 12, 'Cão do Tártaro preso a correntes quebradas.'
where not exists (select 1 from monsters where lower(name) = lower('Cão Acorrentado') and deleted_at is null);

insert into monster_attacks (monster_id, name, damage_formula, description)
select m.id, 'Mordida infernal', '1d8+2', '' from monsters m
where lower(m.name) = lower('Cão Acorrentado') and m.deleted_at is null
  and not exists (select 1 from monster_attacks a where a.monster_id = m.id and lower(a.name) = lower('Mordida infernal'));

insert into monster_attacks (monster_id, name, damage_formula, description)
select m.id, 'Corrente', '1d6', 'Prende o alvo.' from monsters m
where lower(m.name) = lower('Cão Acorrentado') and m.deleted_at is null
  and not exists (select 1 from monster_attacks a where a.monster_id = m.id and lower(a.name) = lower('Corrente'));

insert into monsters (name, category, difficulty, base_health, min_health, max_health, armor, description)
select 'Carcereiro Profano', 'Tártaro', 'Lendária', 70, 60, 80, 17, 'Guardião que fugiu da própria prisão. Habilidades: Grilhões: Aprisiona por 2 turnos.'
where not exists (select 1 from monsters where lower(name) = lower('Carcereiro Profano') and deleted_at is null);

insert into monster_attacks (monster_id, name, damage_formula, description)
select m.id, 'Chicote de correntes', '3d6', '' from monsters m
where lower(m.name) = lower('Carcereiro Profano') and m.deleted_at is null
  and not exists (select 1 from monster_attacks a where a.monster_id = m.id and lower(a.name) = lower('Chicote de correntes'));

insert into monsters (name, category, difficulty, base_health, min_health, max_health, armor, description)
select 'Fogo-Fátuo Sagrado', 'Éter', 'Baixa', 7, 5, 9, 12, 'Luz que guia ou engana.'
where not exists (select 1 from monsters where lower(name) = lower('Fogo-Fátuo Sagrado') and deleted_at is null);

insert into monster_attacks (monster_id, name, damage_formula, description)
select m.id, 'Clarão', '1d6', 'Cega por 1 turno.' from monsters m
where lower(m.name) = lower('Fogo-Fátuo Sagrado') and m.deleted_at is null
  and not exists (select 1 from monster_attacks a where a.monster_id = m.id and lower(a.name) = lower('Clarão'));

insert into monsters (name, category, difficulty, base_health, min_health, max_health, armor, description)
select 'Sentinela Celeste', 'Éter', 'Alta', 38, 30, 46, 16, 'Estátua alada que pune os corrompidos.'
where not exists (select 1 from monsters where lower(name) = lower('Sentinela Celeste') and deleted_at is null);

insert into monster_attacks (monster_id, name, damage_formula, description)
select m.id, 'Espada de luz', '2d8', '' from monsters m
where lower(m.name) = lower('Sentinela Celeste') and m.deleted_at is null
  and not exists (select 1 from monster_attacks a where a.monster_id = m.id and lower(a.name) = lower('Espada de luz'));

insert into monster_attacks (monster_id, name, damage_formula, description)
select m.id, 'Julgamento', '3d6', 'Só contra criaturas corrompidas.' from monsters m
where lower(m.name) = lower('Sentinela Celeste') and m.deleted_at is null
  and not exists (select 1 from monster_attacks a where a.monster_id = m.id and lower(a.name) = lower('Julgamento'));

insert into monsters (name, category, difficulty, base_health, min_health, max_health, armor, description)
select 'Autômato do Relógio', 'Ananque', 'Média', 20, 16, 24, 15, 'Engrenagens que seguem ordens antigas. Habilidades: Ritmo: Age duas vezes a cada 3 turnos.'
where not exists (select 1 from monsters where lower(name) = lower('Autômato do Relógio') and deleted_at is null);

insert into monster_attacks (monster_id, name, damage_formula, description)
select m.id, 'Engrenagem', '1d8+1', '' from monsters m
where lower(m.name) = lower('Autômato do Relógio') and m.deleted_at is null
  and not exists (select 1 from monster_attacks a where a.monster_id = m.id and lower(a.name) = lower('Engrenagem'));

insert into monsters (name, category, difficulty, base_health, min_health, max_health, armor, description)
select 'Tecelã do Destino', 'Ananque', 'Mortal', 52, 44, 60, 15, 'Aranha que tece fios do futuro. Habilidades: Teia do destino: O alvo rola o próximo teste com o pior resultado.'
where not exists (select 1 from monsters where lower(name) = lower('Tecelã do Destino') and deleted_at is null);

insert into monster_attacks (monster_id, name, damage_formula, description)
select m.id, 'Fio cortante', '2d8', '' from monsters m
where lower(m.name) = lower('Tecelã do Destino') and m.deleted_at is null
  and not exists (select 1 from monster_attacks a where a.monster_id = m.id and lower(a.name) = lower('Fio cortante'));

-- Bestiario expandido (24/10): 2 monstros por nivel (1-20) por elemento, 40 por elemento. Em lote (1 comando por tabela) para caber no tempo da Vercel.

insert into monsters (name, category, difficulty, base_health, min_health, max_health, armor, description)
select v.* from (values
  ('Diabrete da Fenda', 'Caos', 'Baixa', 11, 8, 14, 10, 'Nível 1. Criatura de Caos.'),
  ('Diabrete Estilhaçado', 'Caos', 'Baixa', 14, 11, 17, 11, 'Nível 1. Criatura de Caos.'),
  ('Diabrete do Acaso', 'Caos', 'Baixa', 16, 12, 20, 10, 'Nível 2. Criatura de Caos.'),
  ('Diabrete Sem Forma', 'Caos', 'Baixa', 19, 15, 23, 11, 'Nível 2. Criatura de Caos.'),
  ('Gárgula Torta da Fenda', 'Caos', 'Baixa', 21, 16, 26, 11, 'Nível 3. Criatura de Caos.'),
  ('Gárgula Torta Estilhaçada', 'Caos', 'Baixa', 24, 19, 29, 12, 'Nível 3. Criatura de Caos.'),
  ('Gárgula Torta do Acaso', 'Caos', 'Baixa', 26, 20, 32, 11, 'Nível 4. Criatura de Caos.'),
  ('Gárgula Torta Sem Forma', 'Caos', 'Baixa', 29, 23, 35, 12, 'Nível 4. Criatura de Caos.'),
  ('Quimera Pequena da Fenda', 'Caos', 'Média', 31, 24, 38, 11, 'Nível 5. Criatura de Caos.'),
  ('Quimera Pequena Estilhaçada', 'Caos', 'Média', 34, 27, 41, 12, 'Nível 5. Criatura de Caos.'),
  ('Quimera Pequena do Acaso', 'Caos', 'Média', 36, 28, 44, 12, 'Nível 6. Criatura de Caos.'),
  ('Quimera Pequena Sem Forma', 'Caos', 'Média', 39, 31, 47, 13, 'Nível 6. Criatura de Caos.'),
  ('Cão Fractal da Fenda', 'Caos', 'Média', 41, 32, 50, 12, 'Nível 7. Criatura de Caos.'),
  ('Cão Fractal Estilhaçado', 'Caos', 'Média', 44, 35, 53, 13, 'Nível 7. Criatura de Caos.'),
  ('Cão Fractal do Acaso', 'Caos', 'Média', 46, 36, 56, 12, 'Nível 8. Criatura de Caos.'),
  ('Cão Fractal Sem Forma', 'Caos', 'Média', 49, 39, 59, 13, 'Nível 8. Criatura de Caos.'),
  ('Golem Instável da Fenda', 'Caos', 'Média', 51, 40, 62, 13, 'Nível 9. Criatura de Caos.'),
  ('Golem Instável Estilhaçado', 'Caos', 'Média', 54, 43, 65, 14, 'Nível 9. Criatura de Caos.'),
  ('Golem Instável do Acaso', 'Caos', 'Alta', 56, 44, 68, 13, 'Nível 10. Criatura de Caos.'),
  ('Golem Instável Sem Forma', 'Caos', 'Alta', 59, 47, 71, 14, 'Nível 10. Criatura de Caos.'),
  ('Aberração da Fenda', 'Caos', 'Alta', 61, 48, 74, 13, 'Nível 11. Criatura de Caos.'),
  ('Aberração Estilhaçada', 'Caos', 'Alta', 64, 51, 77, 14, 'Nível 11. Criatura de Caos.'),
  ('Aberração do Acaso', 'Caos', 'Alta', 66, 52, 80, 14, 'Nível 12. Criatura de Caos.'),
  ('Aberração Sem Forma', 'Caos', 'Alta', 69, 55, 83, 15, 'Nível 12. Criatura de Caos.'),
  ('Devorador de Formas da Fenda', 'Caos', 'Alta', 71, 56, 86, 14, 'Nível 13. Criatura de Caos.'),
  ('Devorador de Formas Estilhaçado', 'Caos', 'Alta', 74, 59, 89, 15, 'Nível 13. Criatura de Caos.'),
  ('Devorador de Formas do Acaso', 'Caos', 'Alta', 76, 60, 92, 14, 'Nível 14. Criatura de Caos.'),
  ('Devorador de Formas Sem Forma', 'Caos', 'Alta', 79, 63, 95, 15, 'Nível 14. Criatura de Caos.'),
  ('Quimera da Fenda', 'Caos', 'Mortal', 81, 64, 98, 15, 'Nível 15. Criatura de Caos.'),
  ('Quimera Estilhaçada', 'Caos', 'Mortal', 84, 67, 101, 16, 'Nível 15. Criatura de Caos.'),
  ('Quimera do Acaso', 'Caos', 'Mortal', 86, 68, 104, 15, 'Nível 16. Criatura de Caos.'),
  ('Quimera Sem Forma', 'Caos', 'Mortal', 89, 71, 107, 16, 'Nível 16. Criatura de Caos.'),
  ('Colosso Partido da Fenda', 'Caos', 'Mortal', 91, 72, 110, 15, 'Nível 17. Criatura de Caos.'),
  ('Colosso Partido Estilhaçado', 'Caos', 'Mortal', 94, 75, 113, 16, 'Nível 17. Criatura de Caos.'),
  ('Colosso Partido do Acaso', 'Caos', 'Mortal', 96, 76, 116, 16, 'Nível 18. Criatura de Caos.'),
  ('Colosso Partido Sem Forma', 'Caos', 'Mortal', 99, 79, 119, 17, 'Nível 18. Criatura de Caos.'),
  ('Avatar da Ruptura da Fenda', 'Caos', 'Lendária', 101, 80, 122, 16, 'Nível 19. Criatura de Caos.'),
  ('Avatar da Ruptura Estilhaçado', 'Caos', 'Lendária', 104, 83, 125, 17, 'Nível 19. Criatura de Caos.'),
  ('Avatar da Ruptura do Acaso', 'Caos', 'Lendária', 106, 84, 128, 16, 'Nível 20. Criatura de Caos.'),
  ('Avatar da Ruptura Sem Forma', 'Caos', 'Lendária', 109, 87, 131, 17, 'Nível 20. Criatura de Caos.'),
  ('Rato do Mato da Mata', 'Gaia', 'Baixa', 11, 8, 14, 10, 'Nível 1. Criatura de Gaia.'),
  ('Rato do Mato de Raiz', 'Gaia', 'Baixa', 14, 11, 17, 11, 'Nível 1. Criatura de Gaia.'),
  ('Rato do Mato das Pedras', 'Gaia', 'Baixa', 16, 12, 20, 10, 'Nível 2. Criatura de Gaia.'),
  ('Rato do Mato Ancestral', 'Gaia', 'Baixa', 19, 15, 23, 11, 'Nível 2. Criatura de Gaia.'),
  ('Javali da Mata', 'Gaia', 'Baixa', 21, 16, 26, 11, 'Nível 3. Criatura de Gaia.'),
  ('Javali de Raiz', 'Gaia', 'Baixa', 24, 19, 29, 12, 'Nível 3. Criatura de Gaia.'),
  ('Javali das Pedras', 'Gaia', 'Baixa', 26, 20, 32, 11, 'Nível 4. Criatura de Gaia.'),
  ('Javali Ancestral', 'Gaia', 'Baixa', 29, 23, 35, 12, 'Nível 4. Criatura de Gaia.'),
  ('Lobo de Musgo da Mata', 'Gaia', 'Média', 31, 24, 38, 11, 'Nível 5. Criatura de Gaia.'),
  ('Lobo de Musgo de Raiz', 'Gaia', 'Média', 34, 27, 41, 12, 'Nível 5. Criatura de Gaia.'),
  ('Lobo de Musgo das Pedras', 'Gaia', 'Média', 36, 28, 44, 12, 'Nível 6. Criatura de Gaia.'),
  ('Lobo de Musgo Ancestral', 'Gaia', 'Média', 39, 31, 47, 13, 'Nível 6. Criatura de Gaia.'),
  ('Urso Pardo da Mata', 'Gaia', 'Média', 41, 32, 50, 12, 'Nível 7. Criatura de Gaia.'),
  ('Urso Pardo de Raiz', 'Gaia', 'Média', 44, 35, 53, 13, 'Nível 7. Criatura de Gaia.'),
  ('Urso Pardo das Pedras', 'Gaia', 'Média', 46, 36, 56, 12, 'Nível 8. Criatura de Gaia.'),
  ('Urso Pardo Ancestral', 'Gaia', 'Média', 49, 39, 59, 13, 'Nível 8. Criatura de Gaia.'),
  ('Treant Jovem da Mata', 'Gaia', 'Média', 51, 40, 62, 13, 'Nível 9. Criatura de Gaia.'),
  ('Treant Jovem de Raiz', 'Gaia', 'Média', 54, 43, 65, 14, 'Nível 9. Criatura de Gaia.'),
  ('Treant Jovem das Pedras', 'Gaia', 'Alta', 56, 44, 68, 13, 'Nível 10. Criatura de Gaia.'),
  ('Treant Jovem Ancestral', 'Gaia', 'Alta', 59, 47, 71, 14, 'Nível 10. Criatura de Gaia.'),
  ('Golem de Pedra da Mata', 'Gaia', 'Alta', 61, 48, 74, 13, 'Nível 11. Criatura de Gaia.'),
  ('Golem de Pedra de Raiz', 'Gaia', 'Alta', 64, 51, 77, 14, 'Nível 11. Criatura de Gaia.'),
  ('Golem de Pedra das Pedras', 'Gaia', 'Alta', 66, 52, 80, 14, 'Nível 12. Criatura de Gaia.'),
  ('Golem de Pedra Ancestral', 'Gaia', 'Alta', 69, 55, 83, 15, 'Nível 12. Criatura de Gaia.'),
  ('Basilisco da Mata', 'Gaia', 'Alta', 71, 56, 86, 14, 'Nível 13. Criatura de Gaia.'),
  ('Basilisco de Raiz', 'Gaia', 'Alta', 74, 59, 89, 15, 'Nível 13. Criatura de Gaia.'),
  ('Basilisco das Pedras', 'Gaia', 'Alta', 76, 60, 92, 14, 'Nível 14. Criatura de Gaia.'),
  ('Basilisco Ancestral', 'Gaia', 'Alta', 79, 63, 95, 15, 'Nível 14. Criatura de Gaia.'),
  ('Ent Antigo da Mata', 'Gaia', 'Mortal', 81, 64, 98, 15, 'Nível 15. Criatura de Gaia.'),
  ('Ent Antigo de Raiz', 'Gaia', 'Mortal', 84, 67, 101, 16, 'Nível 15. Criatura de Gaia.'),
  ('Ent Antigo das Pedras', 'Gaia', 'Mortal', 86, 68, 104, 15, 'Nível 16. Criatura de Gaia.'),
  ('Ent Antigo Ancestral', 'Gaia', 'Mortal', 89, 71, 107, 16, 'Nível 16. Criatura de Gaia.'),
  ('Wyrm da Terra da Mata', 'Gaia', 'Mortal', 91, 72, 110, 15, 'Nível 17. Criatura de Gaia.'),
  ('Wyrm da Terra de Raiz', 'Gaia', 'Mortal', 94, 75, 113, 16, 'Nível 17. Criatura de Gaia.'),
  ('Wyrm da Terra das Pedras', 'Gaia', 'Mortal', 96, 76, 116, 16, 'Nível 18. Criatura de Gaia.'),
  ('Wyrm da Terra Ancestral', 'Gaia', 'Mortal', 99, 79, 119, 17, 'Nível 18. Criatura de Gaia.'),
  ('Avatar da Montanha da Mata', 'Gaia', 'Lendária', 101, 80, 122, 16, 'Nível 19. Criatura de Gaia.'),
  ('Avatar da Montanha de Raiz', 'Gaia', 'Lendária', 104, 83, 125, 17, 'Nível 19. Criatura de Gaia.'),
  ('Avatar da Montanha das Pedras', 'Gaia', 'Lendária', 106, 84, 128, 16, 'Nível 20. Criatura de Gaia.'),
  ('Avatar da Montanha Ancestral', 'Gaia', 'Lendária', 109, 87, 131, 17, 'Nível 20. Criatura de Gaia.'),
  ('Caranguejo das Marés', 'Ponto', 'Baixa', 11, 8, 14, 10, 'Nível 1. Criatura de Ponto.'),
  ('Caranguejo Abissal', 'Ponto', 'Baixa', 14, 11, 17, 11, 'Nível 1. Criatura de Ponto.'),
  ('Caranguejo da Névoa', 'Ponto', 'Baixa', 16, 12, 20, 10, 'Nível 2. Criatura de Ponto.'),
  ('Caranguejo das Tempestades', 'Ponto', 'Baixa', 19, 15, 23, 11, 'Nível 2. Criatura de Ponto.'),
  ('Afogado das Marés', 'Ponto', 'Baixa', 21, 16, 26, 11, 'Nível 3. Criatura de Ponto.'),
  ('Afogado Abissal', 'Ponto', 'Baixa', 24, 19, 29, 12, 'Nível 3. Criatura de Ponto.'),
  ('Afogado da Névoa', 'Ponto', 'Baixa', 26, 20, 32, 11, 'Nível 4. Criatura de Ponto.'),
  ('Afogado das Tempestades', 'Ponto', 'Baixa', 29, 23, 35, 12, 'Nível 4. Criatura de Ponto.'),
  ('Sereia Sombria das Marés', 'Ponto', 'Média', 31, 24, 38, 11, 'Nível 5. Criatura de Ponto.'),
  ('Sereia Sombria Abissal', 'Ponto', 'Média', 34, 27, 41, 12, 'Nível 5. Criatura de Ponto.'),
  ('Sereia Sombria da Névoa', 'Ponto', 'Média', 36, 28, 44, 12, 'Nível 6. Criatura de Ponto.'),
  ('Sereia Sombria das Tempestades', 'Ponto', 'Média', 39, 31, 47, 13, 'Nível 6. Criatura de Ponto.'),
  ('Tubarão do Abismo das Marés', 'Ponto', 'Média', 41, 32, 50, 12, 'Nível 7. Criatura de Ponto.'),
  ('Tubarão do Abismo Abissal', 'Ponto', 'Média', 44, 35, 53, 13, 'Nível 7. Criatura de Ponto.'),
  ('Tubarão do Abismo da Névoa', 'Ponto', 'Média', 46, 36, 56, 12, 'Nível 8. Criatura de Ponto.'),
  ('Tubarão do Abismo das Tempestades', 'Ponto', 'Média', 49, 39, 59, 13, 'Nível 8. Criatura de Ponto.'),
  ('Elemental da Água das Marés', 'Ponto', 'Média', 51, 40, 62, 13, 'Nível 9. Criatura de Ponto.'),
  ('Elemental da Água Abissal', 'Ponto', 'Média', 54, 43, 65, 14, 'Nível 9. Criatura de Ponto.'),
  ('Elemental da Água da Névoa', 'Ponto', 'Alta', 56, 44, 68, 13, 'Nível 10. Criatura de Ponto.'),
  ('Elemental da Água das Tempestades', 'Ponto', 'Alta', 59, 47, 71, 14, 'Nível 10. Criatura de Ponto.'),
  ('Polvo Gigante das Marés', 'Ponto', 'Alta', 61, 48, 74, 13, 'Nível 11. Criatura de Ponto.'),
  ('Polvo Gigante Abissal', 'Ponto', 'Alta', 64, 51, 77, 14, 'Nível 11. Criatura de Ponto.'),
  ('Polvo Gigante da Névoa', 'Ponto', 'Alta', 66, 52, 80, 14, 'Nível 12. Criatura de Ponto.'),
  ('Polvo Gigante das Tempestades', 'Ponto', 'Alta', 69, 55, 83, 15, 'Nível 12. Criatura de Ponto.'),
  ('Serpente da Maré das Marés', 'Ponto', 'Alta', 71, 56, 86, 14, 'Nível 13. Criatura de Ponto.'),
  ('Serpente da Maré Abissal', 'Ponto', 'Alta', 74, 59, 89, 15, 'Nível 13. Criatura de Ponto.'),
  ('Serpente da Maré da Névoa', 'Ponto', 'Alta', 76, 60, 92, 14, 'Nível 14. Criatura de Ponto.'),
  ('Serpente da Maré das Tempestades', 'Ponto', 'Alta', 79, 63, 95, 15, 'Nível 14. Criatura de Ponto.'),
  ('Naga das Marés', 'Ponto', 'Mortal', 81, 64, 98, 15, 'Nível 15. Criatura de Ponto.'),
  ('Naga Abissal', 'Ponto', 'Mortal', 84, 67, 101, 16, 'Nível 15. Criatura de Ponto.'),
  ('Naga da Névoa', 'Ponto', 'Mortal', 86, 68, 104, 15, 'Nível 16. Criatura de Ponto.'),
  ('Naga das Tempestades', 'Ponto', 'Mortal', 89, 71, 107, 16, 'Nível 16. Criatura de Ponto.'),
  ('Leviatã Jovem das Marés', 'Ponto', 'Mortal', 91, 72, 110, 15, 'Nível 17. Criatura de Ponto.'),
  ('Leviatã Jovem Abissal', 'Ponto', 'Mortal', 94, 75, 113, 16, 'Nível 17. Criatura de Ponto.'),
  ('Leviatã Jovem da Névoa', 'Ponto', 'Mortal', 96, 76, 116, 16, 'Nível 18. Criatura de Ponto.'),
  ('Leviatã Jovem das Tempestades', 'Ponto', 'Mortal', 99, 79, 119, 17, 'Nível 18. Criatura de Ponto.'),
  ('Avatar da Tempestade das Marés', 'Ponto', 'Lendária', 101, 80, 122, 16, 'Nível 19. Criatura de Ponto.'),
  ('Avatar da Tempestade Abissal', 'Ponto', 'Lendária', 104, 83, 125, 17, 'Nível 19. Criatura de Ponto.'),
  ('Avatar da Tempestade da Névoa', 'Ponto', 'Lendária', 106, 84, 128, 16, 'Nível 20. Criatura de Ponto.'),
  ('Avatar da Tempestade das Tempestades', 'Ponto', 'Lendária', 109, 87, 131, 17, 'Nível 20. Criatura de Ponto.'),
  ('Morcego Sombrio Sem Luz', 'Érebo', 'Baixa', 11, 8, 14, 10, 'Nível 1. Criatura de Érebo.'),
  ('Morcego Sombrio do Silêncio', 'Érebo', 'Baixa', 14, 11, 17, 11, 'Nível 1. Criatura de Érebo.'),
  ('Morcego Sombrio Oculto', 'Érebo', 'Baixa', 16, 12, 20, 10, 'Nível 2. Criatura de Érebo.'),
  ('Morcego Sombrio das Trevas', 'Érebo', 'Baixa', 19, 15, 23, 11, 'Nível 2. Criatura de Érebo.'),
  ('Sombra Sem Luz', 'Érebo', 'Baixa', 21, 16, 26, 11, 'Nível 3. Criatura de Érebo.'),
  ('Sombra do Silêncio', 'Érebo', 'Baixa', 24, 19, 29, 12, 'Nível 3. Criatura de Érebo.'),
  ('Sombra Oculta', 'Érebo', 'Baixa', 26, 20, 32, 11, 'Nível 4. Criatura de Érebo.'),
  ('Sombra das Trevas', 'Érebo', 'Baixa', 29, 23, 35, 12, 'Nível 4. Criatura de Érebo.'),
  ('Rastejante Sem Luz', 'Érebo', 'Média', 31, 24, 38, 11, 'Nível 5. Criatura de Érebo.'),
  ('Rastejante do Silêncio', 'Érebo', 'Média', 34, 27, 41, 12, 'Nível 5. Criatura de Érebo.'),
  ('Rastejante Oculto', 'Érebo', 'Média', 36, 28, 44, 12, 'Nível 6. Criatura de Érebo.'),
  ('Rastejante das Trevas', 'Érebo', 'Média', 39, 31, 47, 13, 'Nível 6. Criatura de Érebo.'),
  ('Espectro Sem Luz', 'Érebo', 'Média', 41, 32, 50, 12, 'Nível 7. Criatura de Érebo.'),
  ('Espectro do Silêncio', 'Érebo', 'Média', 44, 35, 53, 13, 'Nível 7. Criatura de Érebo.'),
  ('Espectro Oculto', 'Érebo', 'Média', 46, 36, 56, 12, 'Nível 8. Criatura de Érebo.'),
  ('Espectro das Trevas', 'Érebo', 'Média', 49, 39, 59, 13, 'Nível 8. Criatura de Érebo.'),
  ('Assassino Sem Rosto Sem Luz', 'Érebo', 'Média', 51, 40, 62, 13, 'Nível 9. Criatura de Érebo.'),
  ('Assassino Sem Rosto do Silêncio', 'Érebo', 'Média', 54, 43, 65, 14, 'Nível 9. Criatura de Érebo.'),
  ('Assassino Sem Rosto Oculto', 'Érebo', 'Alta', 56, 44, 68, 13, 'Nível 10. Criatura de Érebo.'),
  ('Assassino Sem Rosto das Trevas', 'Érebo', 'Alta', 59, 47, 71, 14, 'Nível 10. Criatura de Érebo.'),
  ('Devorador de Luz Sem Luz', 'Érebo', 'Alta', 61, 48, 74, 13, 'Nível 11. Criatura de Érebo.'),
  ('Devorador de Luz do Silêncio', 'Érebo', 'Alta', 64, 51, 77, 14, 'Nível 11. Criatura de Érebo.'),
  ('Devorador de Luz Oculto', 'Érebo', 'Alta', 66, 52, 80, 14, 'Nível 12. Criatura de Érebo.'),
  ('Devorador de Luz das Trevas', 'Érebo', 'Alta', 69, 55, 83, 15, 'Nível 12. Criatura de Érebo.'),
  ('Arauto do Silêncio Sem Luz', 'Érebo', 'Alta', 71, 56, 86, 14, 'Nível 13. Criatura de Érebo.'),
  ('Arauto do Silêncio do Silêncio', 'Érebo', 'Alta', 74, 59, 89, 15, 'Nível 13. Criatura de Érebo.'),
  ('Arauto do Silêncio Oculto', 'Érebo', 'Alta', 76, 60, 92, 14, 'Nível 14. Criatura de Érebo.'),
  ('Arauto do Silêncio das Trevas', 'Érebo', 'Alta', 79, 63, 95, 15, 'Nível 14. Criatura de Érebo.'),
  ('Tecelão de Trevas Sem Luz', 'Érebo', 'Mortal', 81, 64, 98, 15, 'Nível 15. Criatura de Érebo.'),
  ('Tecelão de Trevas do Silêncio', 'Érebo', 'Mortal', 84, 67, 101, 16, 'Nível 15. Criatura de Érebo.'),
  ('Tecelão de Trevas Oculto', 'Érebo', 'Mortal', 86, 68, 104, 15, 'Nível 16. Criatura de Érebo.'),
  ('Tecelão de Trevas das Trevas', 'Érebo', 'Mortal', 89, 71, 107, 16, 'Nível 16. Criatura de Érebo.'),
  ('Dragão Sombrio Sem Luz', 'Érebo', 'Mortal', 91, 72, 110, 15, 'Nível 17. Criatura de Érebo.'),
  ('Dragão Sombrio do Silêncio', 'Érebo', 'Mortal', 94, 75, 113, 16, 'Nível 17. Criatura de Érebo.'),
  ('Dragão Sombrio Oculto', 'Érebo', 'Mortal', 96, 76, 116, 16, 'Nível 18. Criatura de Érebo.'),
  ('Dragão Sombrio das Trevas', 'Érebo', 'Mortal', 99, 79, 119, 17, 'Nível 18. Criatura de Érebo.'),
  ('Avatar do Esquecido Sem Luz', 'Érebo', 'Lendária', 101, 80, 122, 16, 'Nível 19. Criatura de Érebo.'),
  ('Avatar do Esquecido do Silêncio', 'Érebo', 'Lendária', 104, 83, 125, 17, 'Nível 19. Criatura de Érebo.'),
  ('Avatar do Esquecido Oculto', 'Érebo', 'Lendária', 106, 84, 128, 16, 'Nível 20. Criatura de Érebo.'),
  ('Avatar do Esquecido das Trevas', 'Érebo', 'Lendária', 109, 87, 131, 17, 'Nível 20. Criatura de Érebo.'),
  ('Mariposa Lunar', 'Nix', 'Baixa', 11, 8, 14, 10, 'Nível 1. Criatura de Nix.'),
  ('Mariposa dos Sonhos', 'Nix', 'Baixa', 14, 11, 17, 11, 'Nível 1. Criatura de Nix.'),
  ('Mariposa Estelar', 'Nix', 'Baixa', 16, 12, 20, 10, 'Nível 2. Criatura de Nix.'),
  ('Mariposa da Meia-Noite', 'Nix', 'Baixa', 19, 15, 23, 11, 'Nível 2. Criatura de Nix.'),
  ('Gato Onírico Lunar', 'Nix', 'Baixa', 21, 16, 26, 11, 'Nível 3. Criatura de Nix.'),
  ('Gato Onírico dos Sonhos', 'Nix', 'Baixa', 24, 19, 29, 12, 'Nível 3. Criatura de Nix.'),
  ('Gato Onírico Estelar', 'Nix', 'Baixa', 26, 20, 32, 11, 'Nível 4. Criatura de Nix.'),
  ('Gato Onírico da Meia-Noite', 'Nix', 'Baixa', 29, 23, 35, 12, 'Nível 4. Criatura de Nix.'),
  ('Fada do Sono Lunar', 'Nix', 'Média', 31, 24, 38, 11, 'Nível 5. Criatura de Nix.'),
  ('Fada do Sono dos Sonhos', 'Nix', 'Média', 34, 27, 41, 12, 'Nível 5. Criatura de Nix.'),
  ('Fada do Sono Estelar', 'Nix', 'Média', 36, 28, 44, 12, 'Nível 6. Criatura de Nix.'),
  ('Fada do Sono da Meia-Noite', 'Nix', 'Média', 39, 31, 47, 13, 'Nível 6. Criatura de Nix.'),
  ('Lobo Lunar Lunar', 'Nix', 'Média', 41, 32, 50, 12, 'Nível 7. Criatura de Nix.'),
  ('Lobo Lunar dos Sonhos', 'Nix', 'Média', 44, 35, 53, 13, 'Nível 7. Criatura de Nix.'),
  ('Lobo Lunar Estelar', 'Nix', 'Média', 46, 36, 56, 12, 'Nível 8. Criatura de Nix.'),
  ('Lobo Lunar da Meia-Noite', 'Nix', 'Média', 49, 39, 59, 13, 'Nível 8. Criatura de Nix.'),
  ('Devorador de Sonhos Lunar', 'Nix', 'Média', 51, 40, 62, 13, 'Nível 9. Criatura de Nix.'),
  ('Devorador de Sonhos dos Sonhos', 'Nix', 'Média', 54, 43, 65, 14, 'Nível 9. Criatura de Nix.'),
  ('Devorador de Sonhos Estelar', 'Nix', 'Alta', 56, 44, 68, 13, 'Nível 10. Criatura de Nix.'),
  ('Devorador de Sonhos da Meia-Noite', 'Nix', 'Alta', 59, 47, 71, 14, 'Nível 10. Criatura de Nix.'),
  ('Pesadelo Vivo Lunar', 'Nix', 'Alta', 61, 48, 74, 13, 'Nível 11. Criatura de Nix.'),
  ('Pesadelo Vivo dos Sonhos', 'Nix', 'Alta', 64, 51, 77, 14, 'Nível 11. Criatura de Nix.'),
  ('Pesadelo Vivo Estelar', 'Nix', 'Alta', 66, 52, 80, 14, 'Nível 12. Criatura de Nix.'),
  ('Pesadelo Vivo da Meia-Noite', 'Nix', 'Alta', 69, 55, 83, 15, 'Nível 12. Criatura de Nix.'),
  ('Coruja Estelar Lunar', 'Nix', 'Alta', 71, 56, 86, 14, 'Nível 13. Criatura de Nix.'),
  ('Coruja Estelar dos Sonhos', 'Nix', 'Alta', 74, 59, 89, 15, 'Nível 13. Criatura de Nix.'),
  ('Coruja Estelar Estelar', 'Nix', 'Alta', 76, 60, 92, 14, 'Nível 14. Criatura de Nix.'),
  ('Coruja Estelar da Meia-Noite', 'Nix', 'Alta', 79, 63, 95, 15, 'Nível 14. Criatura de Nix.'),
  ('Íncubo Lunar', 'Nix', 'Mortal', 81, 64, 98, 15, 'Nível 15. Criatura de Nix.'),
  ('Íncubo dos Sonhos', 'Nix', 'Mortal', 84, 67, 101, 16, 'Nível 15. Criatura de Nix.'),
  ('Íncubo Estelar', 'Nix', 'Mortal', 86, 68, 104, 15, 'Nível 16. Criatura de Nix.'),
  ('Íncubo da Meia-Noite', 'Nix', 'Mortal', 89, 71, 107, 16, 'Nível 16. Criatura de Nix.'),
  ('Dragão da Lua Lunar', 'Nix', 'Mortal', 91, 72, 110, 15, 'Nível 17. Criatura de Nix.'),
  ('Dragão da Lua dos Sonhos', 'Nix', 'Mortal', 94, 75, 113, 16, 'Nível 17. Criatura de Nix.'),
  ('Dragão da Lua Estelar', 'Nix', 'Mortal', 96, 76, 116, 16, 'Nível 18. Criatura de Nix.'),
  ('Dragão da Lua da Meia-Noite', 'Nix', 'Mortal', 99, 79, 119, 17, 'Nível 18. Criatura de Nix.'),
  ('Avatar da Noite Lunar', 'Nix', 'Lendária', 101, 80, 122, 16, 'Nível 19. Criatura de Nix.'),
  ('Avatar da Noite dos Sonhos', 'Nix', 'Lendária', 104, 83, 125, 17, 'Nível 19. Criatura de Nix.'),
  ('Avatar da Noite Estelar', 'Nix', 'Lendária', 106, 84, 128, 16, 'Nível 20. Criatura de Nix.'),
  ('Avatar da Noite da Meia-Noite', 'Nix', 'Lendária', 109, 87, 131, 17, 'Nível 20. Criatura de Nix.'),
  ('Verme Pútrido Corrompido', 'Tártaro', 'Baixa', 11, 8, 14, 10, 'Nível 1. Criatura de Tártaro.'),
  ('Verme Pútrido Acorrentado', 'Tártaro', 'Baixa', 14, 11, 17, 11, 'Nível 1. Criatura de Tártaro.'),
  ('Verme Pútrido Profano', 'Tártaro', 'Baixa', 16, 12, 20, 10, 'Nível 2. Criatura de Tártaro.'),
  ('Verme Pútrido do Abismo', 'Tártaro', 'Baixa', 19, 15, 23, 11, 'Nível 2. Criatura de Tártaro.'),
  ('Cão Infernal Corrompido', 'Tártaro', 'Baixa', 21, 16, 26, 11, 'Nível 3. Criatura de Tártaro.'),
  ('Cão Infernal Acorrentado', 'Tártaro', 'Baixa', 24, 19, 29, 12, 'Nível 3. Criatura de Tártaro.'),
  ('Cão Infernal Profano', 'Tártaro', 'Baixa', 26, 20, 32, 11, 'Nível 4. Criatura de Tártaro.'),
  ('Cão Infernal do Abismo', 'Tártaro', 'Baixa', 29, 23, 35, 12, 'Nível 4. Criatura de Tártaro.'),
  ('Carniçal Corrompido', 'Tártaro', 'Média', 31, 24, 38, 11, 'Nível 5. Criatura de Tártaro.'),
  ('Carniçal Acorrentado', 'Tártaro', 'Média', 34, 27, 41, 12, 'Nível 5. Criatura de Tártaro.'),
  ('Carniçal Profano', 'Tártaro', 'Média', 36, 28, 44, 12, 'Nível 6. Criatura de Tártaro.'),
  ('Carniçal do Abismo', 'Tártaro', 'Média', 39, 31, 47, 13, 'Nível 6. Criatura de Tártaro.'),
  ('Diabo Menor Corrompido', 'Tártaro', 'Média', 41, 32, 50, 12, 'Nível 7. Criatura de Tártaro.'),
  ('Diabo Menor Acorrentado', 'Tártaro', 'Média', 44, 35, 53, 13, 'Nível 7. Criatura de Tártaro.'),
  ('Diabo Menor Profano', 'Tártaro', 'Média', 46, 36, 56, 12, 'Nível 8. Criatura de Tártaro.'),
  ('Diabo Menor do Abismo', 'Tártaro', 'Média', 49, 39, 59, 13, 'Nível 8. Criatura de Tártaro.'),
  ('Ogro Corrompido Corrompido', 'Tártaro', 'Média', 51, 40, 62, 13, 'Nível 9. Criatura de Tártaro.'),
  ('Ogro Corrompido Acorrentado', 'Tártaro', 'Média', 54, 43, 65, 14, 'Nível 9. Criatura de Tártaro.'),
  ('Ogro Corrompido Profano', 'Tártaro', 'Alta', 56, 44, 68, 13, 'Nível 10. Criatura de Tártaro.'),
  ('Ogro Corrompido do Abismo', 'Tártaro', 'Alta', 59, 47, 71, 14, 'Nível 10. Criatura de Tártaro.'),
  ('Carcereiro Corrompido', 'Tártaro', 'Alta', 61, 48, 74, 13, 'Nível 11. Criatura de Tártaro.'),
  ('Carcereiro Acorrentado', 'Tártaro', 'Alta', 64, 51, 77, 14, 'Nível 11. Criatura de Tártaro.'),
  ('Carcereiro Profano', 'Tártaro', 'Alta', 66, 52, 80, 14, 'Nível 12. Criatura de Tártaro.'),
  ('Carcereiro do Abismo', 'Tártaro', 'Alta', 69, 55, 83, 15, 'Nível 12. Criatura de Tártaro.'),
  ('Abominação Corrompida', 'Tártaro', 'Alta', 71, 56, 86, 14, 'Nível 13. Criatura de Tártaro.'),
  ('Abominação Acorrentada', 'Tártaro', 'Alta', 74, 59, 89, 15, 'Nível 13. Criatura de Tártaro.'),
  ('Abominação Profano', 'Tártaro', 'Alta', 76, 60, 92, 14, 'Nível 14. Criatura de Tártaro.'),
  ('Abominação do Abismo', 'Tártaro', 'Alta', 79, 63, 95, 15, 'Nível 14. Criatura de Tártaro.'),
  ('Senhor das Correntes Corrompido', 'Tártaro', 'Mortal', 81, 64, 98, 15, 'Nível 15. Criatura de Tártaro.'),
  ('Senhor das Correntes Acorrentado', 'Tártaro', 'Mortal', 84, 67, 101, 16, 'Nível 15. Criatura de Tártaro.'),
  ('Senhor das Correntes Profano', 'Tártaro', 'Mortal', 86, 68, 104, 15, 'Nível 16. Criatura de Tártaro.'),
  ('Senhor das Correntes do Abismo', 'Tártaro', 'Mortal', 89, 71, 107, 16, 'Nível 16. Criatura de Tártaro.'),
  ('Titã Aprisionado Corrompido', 'Tártaro', 'Mortal', 91, 72, 110, 15, 'Nível 17. Criatura de Tártaro.'),
  ('Titã Aprisionado Acorrentado', 'Tártaro', 'Mortal', 94, 75, 113, 16, 'Nível 17. Criatura de Tártaro.'),
  ('Titã Aprisionado Profano', 'Tártaro', 'Mortal', 96, 76, 116, 16, 'Nível 18. Criatura de Tártaro.'),
  ('Titã Aprisionado do Abismo', 'Tártaro', 'Mortal', 99, 79, 119, 17, 'Nível 18. Criatura de Tártaro.'),
  ('Avatar do Abismo Corrompido', 'Tártaro', 'Lendária', 101, 80, 122, 16, 'Nível 19. Criatura de Tártaro.'),
  ('Avatar do Abismo Acorrentado', 'Tártaro', 'Lendária', 104, 83, 125, 17, 'Nível 19. Criatura de Tártaro.'),
  ('Avatar do Abismo Profano', 'Tártaro', 'Lendária', 106, 84, 128, 16, 'Nível 20. Criatura de Tártaro.'),
  ('Avatar do Abismo do Abismo', 'Tártaro', 'Lendária', 109, 87, 131, 17, 'Nível 20. Criatura de Tártaro.'),
  ('Fogo-Fátuo Radiante', 'Éter', 'Baixa', 11, 8, 14, 10, 'Nível 1. Criatura de Éter.'),
  ('Fogo-Fátuo Sagrado', 'Éter', 'Baixa', 14, 11, 17, 11, 'Nível 1. Criatura de Éter.'),
  ('Fogo-Fátuo dos Céus', 'Éter', 'Baixa', 16, 12, 20, 10, 'Nível 2. Criatura de Éter.'),
  ('Fogo-Fátuo Divino', 'Éter', 'Baixa', 19, 15, 23, 11, 'Nível 2. Criatura de Éter.'),
  ('Pomba de Luz Radiante', 'Éter', 'Baixa', 21, 16, 26, 11, 'Nível 3. Criatura de Éter.'),
  ('Pomba de Luz Sagrada', 'Éter', 'Baixa', 24, 19, 29, 12, 'Nível 3. Criatura de Éter.'),
  ('Pomba de Luz dos Céus', 'Éter', 'Baixa', 26, 20, 32, 11, 'Nível 4. Criatura de Éter.'),
  ('Pomba de Luz Divina', 'Éter', 'Baixa', 29, 23, 35, 12, 'Nível 4. Criatura de Éter.'),
  ('Guardião de Pedra Radiante', 'Éter', 'Média', 31, 24, 38, 11, 'Nível 5. Criatura de Éter.'),
  ('Guardião de Pedra Sagrado', 'Éter', 'Média', 34, 27, 41, 12, 'Nível 5. Criatura de Éter.'),
  ('Guardião de Pedra dos Céus', 'Éter', 'Média', 36, 28, 44, 12, 'Nível 6. Criatura de Éter.'),
  ('Guardião de Pedra Divino', 'Éter', 'Média', 39, 31, 47, 13, 'Nível 6. Criatura de Éter.'),
  ('Leão Alado Radiante', 'Éter', 'Média', 41, 32, 50, 12, 'Nível 7. Criatura de Éter.'),
  ('Leão Alado Sagrado', 'Éter', 'Média', 44, 35, 53, 13, 'Nível 7. Criatura de Éter.'),
  ('Leão Alado dos Céus', 'Éter', 'Média', 46, 36, 56, 12, 'Nível 8. Criatura de Éter.'),
  ('Leão Alado Divino', 'Éter', 'Média', 49, 39, 59, 13, 'Nível 8. Criatura de Éter.'),
  ('Anjo Caído Radiante', 'Éter', 'Média', 51, 40, 62, 13, 'Nível 9. Criatura de Éter.'),
  ('Anjo Caído Sagrado', 'Éter', 'Média', 54, 43, 65, 14, 'Nível 9. Criatura de Éter.'),
  ('Anjo Caído dos Céus', 'Éter', 'Alta', 56, 44, 68, 13, 'Nível 10. Criatura de Éter.'),
  ('Anjo Caído Divino', 'Éter', 'Alta', 59, 47, 71, 14, 'Nível 10. Criatura de Éter.'),
  ('Sentinela Celeste Radiante', 'Éter', 'Alta', 61, 48, 74, 13, 'Nível 11. Criatura de Éter.'),
  ('Sentinela Celeste Sagrado', 'Éter', 'Alta', 64, 51, 77, 14, 'Nível 11. Criatura de Éter.'),
  ('Sentinela Celeste dos Céus', 'Éter', 'Alta', 66, 52, 80, 14, 'Nível 12. Criatura de Éter.'),
  ('Sentinela Celeste Divino', 'Éter', 'Alta', 69, 55, 83, 15, 'Nível 12. Criatura de Éter.'),
  ('Grifo Dourado Radiante', 'Éter', 'Alta', 71, 56, 86, 14, 'Nível 13. Criatura de Éter.'),
  ('Grifo Dourado Sagrado', 'Éter', 'Alta', 74, 59, 89, 15, 'Nível 13. Criatura de Éter.'),
  ('Grifo Dourado dos Céus', 'Éter', 'Alta', 76, 60, 92, 14, 'Nível 14. Criatura de Éter.'),
  ('Grifo Dourado Divino', 'Éter', 'Alta', 79, 63, 95, 15, 'Nível 14. Criatura de Éter.'),
  ('Serafim Radiante', 'Éter', 'Mortal', 81, 64, 98, 15, 'Nível 15. Criatura de Éter.'),
  ('Serafim Sagrado', 'Éter', 'Mortal', 84, 67, 101, 16, 'Nível 15. Criatura de Éter.'),
  ('Serafim dos Céus', 'Éter', 'Mortal', 86, 68, 104, 15, 'Nível 16. Criatura de Éter.'),
  ('Serafim Divino', 'Éter', 'Mortal', 89, 71, 107, 16, 'Nível 16. Criatura de Éter.'),
  ('Querubim de Guerra Radiante', 'Éter', 'Mortal', 91, 72, 110, 15, 'Nível 17. Criatura de Éter.'),
  ('Querubim de Guerra Sagrado', 'Éter', 'Mortal', 94, 75, 113, 16, 'Nível 17. Criatura de Éter.'),
  ('Querubim de Guerra dos Céus', 'Éter', 'Mortal', 96, 76, 116, 16, 'Nível 18. Criatura de Éter.'),
  ('Querubim de Guerra Divino', 'Éter', 'Mortal', 99, 79, 119, 17, 'Nível 18. Criatura de Éter.'),
  ('Avatar Celestial Radiante', 'Éter', 'Lendária', 101, 80, 122, 16, 'Nível 19. Criatura de Éter.'),
  ('Avatar Celestial Sagrado', 'Éter', 'Lendária', 104, 83, 125, 17, 'Nível 19. Criatura de Éter.'),
  ('Avatar Celestial dos Céus', 'Éter', 'Lendária', 106, 84, 128, 16, 'Nível 20. Criatura de Éter.'),
  ('Avatar Celestial Divino', 'Éter', 'Lendária', 109, 87, 131, 17, 'Nível 20. Criatura de Éter.'),
  ('Grilo de Latão de Bronze', 'Ananque', 'Baixa', 11, 8, 14, 10, 'Nível 1. Criatura de Ananque.'),
  ('Grilo de Latão das Horas', 'Ananque', 'Baixa', 14, 11, 17, 11, 'Nível 1. Criatura de Ananque.'),
  ('Grilo de Latão do Destino', 'Ananque', 'Baixa', 16, 12, 20, 10, 'Nível 2. Criatura de Ananque.'),
  ('Grilo de Latão Eterno', 'Ananque', 'Baixa', 19, 15, 23, 11, 'Nível 2. Criatura de Ananque.'),
  ('Autômato de Bronze', 'Ananque', 'Baixa', 21, 16, 26, 11, 'Nível 3. Criatura de Ananque.'),
  ('Autômato das Horas', 'Ananque', 'Baixa', 24, 19, 29, 12, 'Nível 3. Criatura de Ananque.'),
  ('Autômato do Destino', 'Ananque', 'Baixa', 26, 20, 32, 11, 'Nível 4. Criatura de Ananque.'),
  ('Autômato Eterno', 'Ananque', 'Baixa', 29, 23, 35, 12, 'Nível 4. Criatura de Ananque.'),
  ('Aranha do Relógio de Bronze', 'Ananque', 'Média', 31, 24, 38, 11, 'Nível 5. Criatura de Ananque.'),
  ('Aranha do Relógio das Horas', 'Ananque', 'Média', 34, 27, 41, 12, 'Nível 5. Criatura de Ananque.'),
  ('Aranha do Relógio do Destino', 'Ananque', 'Média', 36, 28, 44, 12, 'Nível 6. Criatura de Ananque.'),
  ('Aranha do Relógio Eterna', 'Ananque', 'Média', 39, 31, 47, 13, 'Nível 6. Criatura de Ananque.'),
  ('Guarda Mecânico de Bronze', 'Ananque', 'Média', 41, 32, 50, 12, 'Nível 7. Criatura de Ananque.'),
  ('Guarda Mecânico das Horas', 'Ananque', 'Média', 44, 35, 53, 13, 'Nível 7. Criatura de Ananque.'),
  ('Guarda Mecânico do Destino', 'Ananque', 'Média', 46, 36, 56, 12, 'Nível 8. Criatura de Ananque.'),
  ('Guarda Mecânico Eterno', 'Ananque', 'Média', 49, 39, 59, 13, 'Nível 8. Criatura de Ananque.'),
  ('Corvo do Destino de Bronze', 'Ananque', 'Média', 51, 40, 62, 13, 'Nível 9. Criatura de Ananque.'),
  ('Corvo do Destino das Horas', 'Ananque', 'Média', 54, 43, 65, 14, 'Nível 9. Criatura de Ananque.'),
  ('Corvo do Destino do Destino', 'Ananque', 'Alta', 56, 44, 68, 13, 'Nível 10. Criatura de Ananque.'),
  ('Corvo do Destino Eterno', 'Ananque', 'Alta', 59, 47, 71, 14, 'Nível 10. Criatura de Ananque.'),
  ('Tecelã de Bronze', 'Ananque', 'Alta', 61, 48, 74, 13, 'Nível 11. Criatura de Ananque.'),
  ('Tecelã das Horas', 'Ananque', 'Alta', 64, 51, 77, 14, 'Nível 11. Criatura de Ananque.'),
  ('Tecelã do Destino', 'Ananque', 'Alta', 66, 52, 80, 14, 'Nível 12. Criatura de Ananque.'),
  ('Tecelã Eterna', 'Ananque', 'Alta', 69, 55, 83, 15, 'Nível 12. Criatura de Ananque.'),
  ('Golem de Bronze de Bronze', 'Ananque', 'Alta', 71, 56, 86, 14, 'Nível 13. Criatura de Ananque.'),
  ('Golem de Bronze das Horas', 'Ananque', 'Alta', 74, 59, 89, 15, 'Nível 13. Criatura de Ananque.'),
  ('Golem de Bronze do Destino', 'Ananque', 'Alta', 76, 60, 92, 14, 'Nível 14. Criatura de Ananque.'),
  ('Golem de Bronze Eterno', 'Ananque', 'Alta', 79, 63, 95, 15, 'Nível 14. Criatura de Ananque.'),
  ('Cronomante Perdido de Bronze', 'Ananque', 'Mortal', 81, 64, 98, 15, 'Nível 15. Criatura de Ananque.'),
  ('Cronomante Perdido das Horas', 'Ananque', 'Mortal', 84, 67, 101, 16, 'Nível 15. Criatura de Ananque.'),
  ('Cronomante Perdido do Destino', 'Ananque', 'Mortal', 86, 68, 104, 15, 'Nível 16. Criatura de Ananque.'),
  ('Cronomante Perdido Eterno', 'Ananque', 'Mortal', 89, 71, 107, 16, 'Nível 16. Criatura de Ananque.'),
  ('Juiz das Horas de Bronze', 'Ananque', 'Mortal', 91, 72, 110, 15, 'Nível 17. Criatura de Ananque.'),
  ('Juiz das Horas das Horas', 'Ananque', 'Mortal', 94, 75, 113, 16, 'Nível 17. Criatura de Ananque.'),
  ('Juiz das Horas do Destino', 'Ananque', 'Mortal', 96, 76, 116, 16, 'Nível 18. Criatura de Ananque.'),
  ('Juiz das Horas Eterno', 'Ananque', 'Mortal', 99, 79, 119, 17, 'Nível 18. Criatura de Ananque.'),
  ('Avatar da Ordem de Bronze', 'Ananque', 'Lendária', 101, 80, 122, 16, 'Nível 19. Criatura de Ananque.'),
  ('Avatar da Ordem das Horas', 'Ananque', 'Lendária', 104, 83, 125, 17, 'Nível 19. Criatura de Ananque.'),
  ('Avatar da Ordem do Destino', 'Ananque', 'Lendária', 106, 84, 128, 16, 'Nível 20. Criatura de Ananque.'),
  ('Avatar da Ordem Eterno', 'Ananque', 'Lendária', 109, 87, 131, 17, 'Nível 20. Criatura de Ananque.')
) as v(name, category, difficulty, base_health, min_health, max_health, armor, description)
where not exists (select 1 from monsters m where lower(m.name) = lower(v.name) and m.deleted_at is null);

insert into monster_attacks (monster_id, name, damage_formula, description)
select m.id, v.attack, v.formula, '' from (values
  ('Diabrete da Fenda', 'Mordida', '1d8'),
  ('Diabrete da Fenda', 'Investida', '1d6'),
  ('Diabrete Estilhaçado', 'Mordida', '1d8'),
  ('Diabrete Estilhaçado', 'Investida', '1d6'),
  ('Diabrete do Acaso', 'Mordida', '1d8+1'),
  ('Diabrete do Acaso', 'Investida', '1d6+1'),
  ('Diabrete Sem Forma', 'Mordida', '1d8+1'),
  ('Diabrete Sem Forma', 'Investida', '1d6+1'),
  ('Gárgula Torta da Fenda', 'Garra', '1d8+1'),
  ('Gárgula Torta da Fenda', 'Golpe Rápido', '1d6+1'),
  ('Gárgula Torta Estilhaçada', 'Garra', '1d8+1'),
  ('Gárgula Torta Estilhaçada', 'Golpe Rápido', '1d6+1'),
  ('Gárgula Torta do Acaso', 'Garra', '1d8+2'),
  ('Gárgula Torta do Acaso', 'Golpe Rápido', '1d6+2'),
  ('Gárgula Torta Sem Forma', 'Garra', '1d8+2'),
  ('Gárgula Torta Sem Forma', 'Golpe Rápido', '1d6+2'),
  ('Quimera Pequena da Fenda', 'Estilhaço', '2d8+2'),
  ('Quimera Pequena da Fenda', 'Rajada de Caos', '2d6+2'),
  ('Quimera Pequena Estilhaçada', 'Estilhaço', '2d8+2'),
  ('Quimera Pequena Estilhaçada', 'Rajada de Caos', '2d6+2'),
  ('Quimera Pequena do Acaso', 'Estilhaço', '2d8+3'),
  ('Quimera Pequena do Acaso', 'Rajada de Caos', '2d6+3'),
  ('Quimera Pequena Sem Forma', 'Estilhaço', '2d8+3'),
  ('Quimera Pequena Sem Forma', 'Rajada de Caos', '2d6+3'),
  ('Cão Fractal da Fenda', 'Investida', '2d8+3'),
  ('Cão Fractal da Fenda', 'Golpe Pesado', '2d6+3'),
  ('Cão Fractal Estilhaçado', 'Investida', '2d8+3'),
  ('Cão Fractal Estilhaçado', 'Golpe Pesado', '2d6+3'),
  ('Cão Fractal do Acaso', 'Investida', '2d8+4'),
  ('Cão Fractal do Acaso', 'Golpe Pesado', '2d6+4'),
  ('Cão Fractal Sem Forma', 'Investida', '2d8+4'),
  ('Cão Fractal Sem Forma', 'Golpe Pesado', '2d6+4'),
  ('Golem Instável da Fenda', 'Pancada', '2d8+4'),
  ('Golem Instável da Fenda', 'Golpe Pesado', '2d6+4'),
  ('Golem Instável Estilhaçado', 'Pancada', '2d8+4'),
  ('Golem Instável Estilhaçado', 'Golpe Pesado', '2d6+4'),
  ('Golem Instável do Acaso', 'Pancada', '3d8+5'),
  ('Golem Instável do Acaso', 'Golpe Pesado', '3d6+5'),
  ('Golem Instável Sem Forma', 'Pancada', '3d8+5'),
  ('Golem Instável Sem Forma', 'Golpe Pesado', '3d6+5'),
  ('Aberração da Fenda', 'Tentáculo', '3d8+5'),
  ('Aberração da Fenda', 'Golpe Pesado', '3d6+5'),
  ('Aberração Estilhaçada', 'Tentáculo', '3d8+5'),
  ('Aberração Estilhaçada', 'Golpe Pesado', '3d6+5'),
  ('Aberração do Acaso', 'Tentáculo', '3d8+6'),
  ('Aberração do Acaso', 'Golpe Pesado', '3d6+6'),
  ('Aberração Sem Forma', 'Tentáculo', '3d8+6'),
  ('Aberração Sem Forma', 'Golpe Pesado', '3d6+6'),
  ('Devorador de Formas da Fenda', 'Engolir', '3d8+6'),
  ('Devorador de Formas da Fenda', 'Investida', '3d6+6'),
  ('Devorador de Formas Estilhaçado', 'Engolir', '3d8+6'),
  ('Devorador de Formas Estilhaçado', 'Investida', '3d6+6'),
  ('Devorador de Formas do Acaso', 'Engolir', '3d8+7'),
  ('Devorador de Formas do Acaso', 'Investida', '3d6+7'),
  ('Devorador de Formas Sem Forma', 'Engolir', '3d8+7'),
  ('Devorador de Formas Sem Forma', 'Investida', '3d6+7'),
  ('Quimera da Fenda', 'Sopro do Caos', '4d8+7'),
  ('Quimera da Fenda', 'Rajada de Caos', '4d6+7'),
  ('Quimera Estilhaçada', 'Sopro do Caos', '4d8+7'),
  ('Quimera Estilhaçada', 'Rajada de Caos', '4d6+7'),
  ('Quimera do Acaso', 'Sopro do Caos', '4d8+8'),
  ('Quimera do Acaso', 'Rajada de Caos', '4d6+8'),
  ('Quimera Sem Forma', 'Sopro do Caos', '4d8+8'),
  ('Quimera Sem Forma', 'Rajada de Caos', '4d6+8'),
  ('Colosso Partido da Fenda', 'Esmagar', '4d8+8'),
  ('Colosso Partido da Fenda', 'Golpe Pesado', '4d6+8'),
  ('Colosso Partido Estilhaçado', 'Esmagar', '4d8+8'),
  ('Colosso Partido Estilhaçado', 'Golpe Pesado', '4d6+8'),
  ('Colosso Partido do Acaso', 'Esmagar', '4d8+9'),
  ('Colosso Partido do Acaso', 'Golpe Pesado', '4d6+9'),
  ('Colosso Partido Sem Forma', 'Esmagar', '4d8+9'),
  ('Colosso Partido Sem Forma', 'Golpe Pesado', '4d6+9'),
  ('Avatar da Ruptura da Fenda', 'Ruptura', '4d8+9'),
  ('Avatar da Ruptura da Fenda', 'Rajada de Caos', '4d6+9'),
  ('Avatar da Ruptura Estilhaçado', 'Ruptura', '4d8+9'),
  ('Avatar da Ruptura Estilhaçado', 'Rajada de Caos', '4d6+9'),
  ('Avatar da Ruptura do Acaso', 'Ruptura', '5d8+10'),
  ('Avatar da Ruptura do Acaso', 'Rajada de Caos', '5d6+10'),
  ('Avatar da Ruptura Sem Forma', 'Ruptura', '5d8+10'),
  ('Avatar da Ruptura Sem Forma', 'Rajada de Caos', '5d6+10'),
  ('Rato do Mato da Mata', 'Mordida', '1d8'),
  ('Rato do Mato da Mata', 'Investida', '1d6'),
  ('Rato do Mato de Raiz', 'Mordida', '1d8'),
  ('Rato do Mato de Raiz', 'Investida', '1d6'),
  ('Rato do Mato das Pedras', 'Mordida', '1d8+1'),
  ('Rato do Mato das Pedras', 'Investida', '1d6+1'),
  ('Rato do Mato Ancestral', 'Mordida', '1d8+1'),
  ('Rato do Mato Ancestral', 'Investida', '1d6+1'),
  ('Javali da Mata', 'Presa', '1d8+1'),
  ('Javali da Mata', 'Investida', '1d6+1'),
  ('Javali de Raiz', 'Presa', '1d8+1'),
  ('Javali de Raiz', 'Investida', '1d6+1'),
  ('Javali das Pedras', 'Presa', '1d8+2'),
  ('Javali das Pedras', 'Investida', '1d6+2'),
  ('Javali Ancestral', 'Presa', '1d8+2'),
  ('Javali Ancestral', 'Investida', '1d6+2'),
  ('Lobo de Musgo da Mata', 'Mordida', '2d8+2'),
  ('Lobo de Musgo da Mata', 'Investida', '2d6+2'),
  ('Lobo de Musgo de Raiz', 'Mordida', '2d8+2'),
  ('Lobo de Musgo de Raiz', 'Investida', '2d6+2'),
  ('Lobo de Musgo das Pedras', 'Mordida', '2d8+3'),
  ('Lobo de Musgo das Pedras', 'Investida', '2d6+3'),
  ('Lobo de Musgo Ancestral', 'Mordida', '2d8+3'),
  ('Lobo de Musgo Ancestral', 'Investida', '2d6+3'),
  ('Urso Pardo da Mata', 'Garra', '2d8+3'),
  ('Urso Pardo da Mata', 'Golpe Rápido', '2d6+3'),
  ('Urso Pardo de Raiz', 'Garra', '2d8+3'),
  ('Urso Pardo de Raiz', 'Golpe Rápido', '2d6+3'),
  ('Urso Pardo das Pedras', 'Garra', '2d8+4'),
  ('Urso Pardo das Pedras', 'Golpe Rápido', '2d6+4'),
  ('Urso Pardo Ancestral', 'Garra', '2d8+4'),
  ('Urso Pardo Ancestral', 'Golpe Rápido', '2d6+4'),
  ('Treant Jovem da Mata', 'Galho', '2d8+4'),
  ('Treant Jovem da Mata', 'Golpe Pesado', '2d6+4'),
  ('Treant Jovem de Raiz', 'Galho', '2d8+4'),
  ('Treant Jovem de Raiz', 'Golpe Pesado', '2d6+4'),
  ('Treant Jovem das Pedras', 'Galho', '3d8+5'),
  ('Treant Jovem das Pedras', 'Golpe Pesado', '3d6+5'),
  ('Treant Jovem Ancestral', 'Galho', '3d8+5'),
  ('Treant Jovem Ancestral', 'Golpe Pesado', '3d6+5'),
  ('Golem de Pedra da Mata', 'Punho de Rocha', '3d8+5'),
  ('Golem de Pedra da Mata', 'Golpe Pesado', '3d6+5'),
  ('Golem de Pedra de Raiz', 'Punho de Rocha', '3d8+5'),
  ('Golem de Pedra de Raiz', 'Golpe Pesado', '3d6+5'),
  ('Golem de Pedra das Pedras', 'Punho de Rocha', '3d8+6'),
  ('Golem de Pedra das Pedras', 'Golpe Pesado', '3d6+6'),
  ('Golem de Pedra Ancestral', 'Punho de Rocha', '3d8+6'),
  ('Golem de Pedra Ancestral', 'Golpe Pesado', '3d6+6'),
  ('Basilisco da Mata', 'Olhar Pétreo', '3d8+6'),
  ('Basilisco da Mata', 'Rajada de Gaia', '3d6+6'),
  ('Basilisco de Raiz', 'Olhar Pétreo', '3d8+6'),
  ('Basilisco de Raiz', 'Rajada de Gaia', '3d6+6'),
  ('Basilisco das Pedras', 'Olhar Pétreo', '3d8+7'),
  ('Basilisco das Pedras', 'Rajada de Gaia', '3d6+7'),
  ('Basilisco Ancestral', 'Olhar Pétreo', '3d8+7'),
  ('Basilisco Ancestral', 'Rajada de Gaia', '3d6+7'),
  ('Ent Antigo da Mata', 'Pisotear', '4d8+7'),
  ('Ent Antigo da Mata', 'Golpe Pesado', '4d6+7'),
  ('Ent Antigo de Raiz', 'Pisotear', '4d8+7'),
  ('Ent Antigo de Raiz', 'Golpe Pesado', '4d6+7'),
  ('Ent Antigo das Pedras', 'Pisotear', '4d8+8'),
  ('Ent Antigo das Pedras', 'Golpe Pesado', '4d6+8'),
  ('Ent Antigo Ancestral', 'Pisotear', '4d8+8'),
  ('Ent Antigo Ancestral', 'Golpe Pesado', '4d6+8'),
  ('Wyrm da Terra da Mata', 'Investida', '4d8+8'),
  ('Wyrm da Terra da Mata', 'Golpe Pesado', '4d6+8'),
  ('Wyrm da Terra de Raiz', 'Investida', '4d8+8'),
  ('Wyrm da Terra de Raiz', 'Golpe Pesado', '4d6+8'),
  ('Wyrm da Terra das Pedras', 'Investida', '4d8+9'),
  ('Wyrm da Terra das Pedras', 'Golpe Pesado', '4d6+9'),
  ('Wyrm da Terra Ancestral', 'Investida', '4d8+9'),
  ('Wyrm da Terra Ancestral', 'Golpe Pesado', '4d6+9'),
  ('Avatar da Montanha da Mata', 'Terremoto', '4d8+9'),
  ('Avatar da Montanha da Mata', 'Rajada de Gaia', '4d6+9'),
  ('Avatar da Montanha de Raiz', 'Terremoto', '4d8+9'),
  ('Avatar da Montanha de Raiz', 'Rajada de Gaia', '4d6+9'),
  ('Avatar da Montanha das Pedras', 'Terremoto', '5d8+10'),
  ('Avatar da Montanha das Pedras', 'Rajada de Gaia', '5d6+10'),
  ('Avatar da Montanha Ancestral', 'Terremoto', '5d8+10'),
  ('Avatar da Montanha Ancestral', 'Rajada de Gaia', '5d6+10'),
  ('Caranguejo das Marés', 'Pinça', '1d8'),
  ('Caranguejo das Marés', 'Golpe Rápido', '1d6'),
  ('Caranguejo Abissal', 'Pinça', '1d8'),
  ('Caranguejo Abissal', 'Golpe Rápido', '1d6'),
  ('Caranguejo da Névoa', 'Pinça', '1d8+1'),
  ('Caranguejo da Névoa', 'Golpe Rápido', '1d6+1'),
  ('Caranguejo das Tempestades', 'Pinça', '1d8+1'),
  ('Caranguejo das Tempestades', 'Golpe Rápido', '1d6+1'),
  ('Afogado das Marés', 'Agarrar', '1d8+1'),
  ('Afogado das Marés', 'Golpe Pesado', '1d6+1'),
  ('Afogado Abissal', 'Agarrar', '1d8+1'),
  ('Afogado Abissal', 'Golpe Pesado', '1d6+1'),
  ('Afogado da Névoa', 'Agarrar', '1d8+2'),
  ('Afogado da Névoa', 'Golpe Pesado', '1d6+2'),
  ('Afogado das Tempestades', 'Agarrar', '1d8+2'),
  ('Afogado das Tempestades', 'Golpe Pesado', '1d6+2'),
  ('Sereia Sombria das Marés', 'Canto', '2d8+2'),
  ('Sereia Sombria das Marés', 'Rajada de Ponto', '2d6+2'),
  ('Sereia Sombria Abissal', 'Canto', '2d8+2'),
  ('Sereia Sombria Abissal', 'Rajada de Ponto', '2d6+2'),
  ('Sereia Sombria da Névoa', 'Canto', '2d8+3'),
  ('Sereia Sombria da Névoa', 'Rajada de Ponto', '2d6+3'),
  ('Sereia Sombria das Tempestades', 'Canto', '2d8+3'),
  ('Sereia Sombria das Tempestades', 'Rajada de Ponto', '2d6+3'),
  ('Tubarão do Abismo das Marés', 'Mordida', '2d8+3'),
  ('Tubarão do Abismo das Marés', 'Investida', '2d6+3'),
  ('Tubarão do Abismo Abissal', 'Mordida', '2d8+3'),
  ('Tubarão do Abismo Abissal', 'Investida', '2d6+3'),
  ('Tubarão do Abismo da Névoa', 'Mordida', '2d8+4'),
  ('Tubarão do Abismo da Névoa', 'Investida', '2d6+4'),
  ('Tubarão do Abismo das Tempestades', 'Mordida', '2d8+4'),
  ('Tubarão do Abismo das Tempestades', 'Investida', '2d6+4'),
  ('Elemental da Água das Marés', 'Jato', '2d8+4'),
  ('Elemental da Água das Marés', 'Rajada de Ponto', '2d6+4'),
  ('Elemental da Água Abissal', 'Jato', '2d8+4'),
  ('Elemental da Água Abissal', 'Rajada de Ponto', '2d6+4'),
  ('Elemental da Água da Névoa', 'Jato', '3d8+5'),
  ('Elemental da Água da Névoa', 'Rajada de Ponto', '3d6+5'),
  ('Elemental da Água das Tempestades', 'Jato', '3d8+5'),
  ('Elemental da Água das Tempestades', 'Rajada de Ponto', '3d6+5'),
  ('Polvo Gigante das Marés', 'Tentáculos', '3d8+5'),
  ('Polvo Gigante das Marés', 'Golpe Pesado', '3d6+5'),
  ('Polvo Gigante Abissal', 'Tentáculos', '3d8+5'),
  ('Polvo Gigante Abissal', 'Golpe Pesado', '3d6+5'),
  ('Polvo Gigante da Névoa', 'Tentáculos', '3d8+6'),
  ('Polvo Gigante da Névoa', 'Golpe Pesado', '3d6+6'),
  ('Polvo Gigante das Tempestades', 'Tentáculos', '3d8+6'),
  ('Polvo Gigante das Tempestades', 'Golpe Pesado', '3d6+6'),
  ('Serpente da Maré das Marés', 'Mordida', '3d8+6'),
  ('Serpente da Maré das Marés', 'Investida', '3d6+6'),
  ('Serpente da Maré Abissal', 'Mordida', '3d8+6'),
  ('Serpente da Maré Abissal', 'Investida', '3d6+6'),
  ('Serpente da Maré da Névoa', 'Mordida', '3d8+7'),
  ('Serpente da Maré da Névoa', 'Investida', '3d6+7'),
  ('Serpente da Maré das Tempestades', 'Mordida', '3d8+7'),
  ('Serpente da Maré das Tempestades', 'Investida', '3d6+7'),
  ('Naga das Marés', 'Tridente', '4d8+7'),
  ('Naga das Marés', 'Investida', '4d6+7'),
  ('Naga Abissal', 'Tridente', '4d8+7'),
  ('Naga Abissal', 'Investida', '4d6+7'),
  ('Naga da Névoa', 'Tridente', '4d8+8'),
  ('Naga da Névoa', 'Investida', '4d6+8'),
  ('Naga das Tempestades', 'Tridente', '4d8+8'),
  ('Naga das Tempestades', 'Investida', '4d6+8'),
  ('Leviatã Jovem das Marés', 'Engolir', '4d8+8'),
  ('Leviatã Jovem das Marés', 'Investida', '4d6+8'),
  ('Leviatã Jovem Abissal', 'Engolir', '4d8+8'),
  ('Leviatã Jovem Abissal', 'Investida', '4d6+8'),
  ('Leviatã Jovem da Névoa', 'Engolir', '4d8+9'),
  ('Leviatã Jovem da Névoa', 'Investida', '4d6+9'),
  ('Leviatã Jovem das Tempestades', 'Engolir', '4d8+9'),
  ('Leviatã Jovem das Tempestades', 'Investida', '4d6+9'),
  ('Avatar da Tempestade das Marés', 'Relâmpago', '4d8+9'),
  ('Avatar da Tempestade das Marés', 'Rajada de Ponto', '4d6+9'),
  ('Avatar da Tempestade Abissal', 'Relâmpago', '4d8+9'),
  ('Avatar da Tempestade Abissal', 'Rajada de Ponto', '4d6+9'),
  ('Avatar da Tempestade da Névoa', 'Relâmpago', '5d8+10'),
  ('Avatar da Tempestade da Névoa', 'Rajada de Ponto', '5d6+10'),
  ('Avatar da Tempestade das Tempestades', 'Relâmpago', '5d8+10'),
  ('Avatar da Tempestade das Tempestades', 'Rajada de Ponto', '5d6+10'),
  ('Morcego Sombrio Sem Luz', 'Mordida', '1d8'),
  ('Morcego Sombrio Sem Luz', 'Investida', '1d6'),
  ('Morcego Sombrio do Silêncio', 'Mordida', '1d8'),
  ('Morcego Sombrio do Silêncio', 'Investida', '1d6'),
  ('Morcego Sombrio Oculto', 'Mordida', '1d8+1'),
  ('Morcego Sombrio Oculto', 'Investida', '1d6+1'),
  ('Morcego Sombrio das Trevas', 'Mordida', '1d8+1'),
  ('Morcego Sombrio das Trevas', 'Investida', '1d6+1'),
  ('Sombra Sem Luz', 'Toque Gelado', '1d8+1'),
  ('Sombra Sem Luz', 'Rajada de Érebo', '1d6+1'),
  ('Sombra do Silêncio', 'Toque Gelado', '1d8+1'),
  ('Sombra do Silêncio', 'Rajada de Érebo', '1d6+1'),
  ('Sombra Oculta', 'Toque Gelado', '1d8+2'),
  ('Sombra Oculta', 'Rajada de Érebo', '1d6+2'),
  ('Sombra das Trevas', 'Toque Gelado', '1d8+2'),
  ('Sombra das Trevas', 'Rajada de Érebo', '1d6+2'),
  ('Rastejante Sem Luz', 'Garra', '2d8+2'),
  ('Rastejante Sem Luz', 'Golpe Rápido', '2d6+2'),
  ('Rastejante do Silêncio', 'Garra', '2d8+2'),
  ('Rastejante do Silêncio', 'Golpe Rápido', '2d6+2'),
  ('Rastejante Oculto', 'Garra', '2d8+3'),
  ('Rastejante Oculto', 'Golpe Rápido', '2d6+3'),
  ('Rastejante das Trevas', 'Garra', '2d8+3'),
  ('Rastejante das Trevas', 'Golpe Rápido', '2d6+3'),
  ('Espectro Sem Luz', 'Lamento', '2d8+3'),
  ('Espectro Sem Luz', 'Rajada de Érebo', '2d6+3'),
  ('Espectro do Silêncio', 'Lamento', '2d8+3'),
  ('Espectro do Silêncio', 'Rajada de Érebo', '2d6+3'),
  ('Espectro Oculto', 'Lamento', '2d8+4'),
  ('Espectro Oculto', 'Rajada de Érebo', '2d6+4'),
  ('Espectro das Trevas', 'Lamento', '2d8+4'),
  ('Espectro das Trevas', 'Rajada de Érebo', '2d6+4'),
  ('Assassino Sem Rosto Sem Luz', 'Lâmina', '2d8+4'),
  ('Assassino Sem Rosto Sem Luz', 'Golpe Rápido', '2d6+4'),
  ('Assassino Sem Rosto do Silêncio', 'Lâmina', '2d8+4'),
  ('Assassino Sem Rosto do Silêncio', 'Golpe Rápido', '2d6+4'),
  ('Assassino Sem Rosto Oculto', 'Lâmina', '3d8+5'),
  ('Assassino Sem Rosto Oculto', 'Golpe Rápido', '3d6+5'),
  ('Assassino Sem Rosto das Trevas', 'Lâmina', '3d8+5'),
  ('Assassino Sem Rosto das Trevas', 'Golpe Rápido', '3d6+5'),
  ('Devorador de Luz Sem Luz', 'Apagar', '3d8+5'),
  ('Devorador de Luz Sem Luz', 'Rajada de Érebo', '3d6+5'),
  ('Devorador de Luz do Silêncio', 'Apagar', '3d8+5'),
  ('Devorador de Luz do Silêncio', 'Rajada de Érebo', '3d6+5'),
  ('Devorador de Luz Oculto', 'Apagar', '3d8+6'),
  ('Devorador de Luz Oculto', 'Rajada de Érebo', '3d6+6'),
  ('Devorador de Luz das Trevas', 'Apagar', '3d8+6'),
  ('Devorador de Luz das Trevas', 'Rajada de Érebo', '3d6+6'),
  ('Arauto do Silêncio Sem Luz', 'Lâmina Muda', '3d8+6'),
  ('Arauto do Silêncio Sem Luz', 'Golpe Rápido', '3d6+6'),
  ('Arauto do Silêncio do Silêncio', 'Lâmina Muda', '3d8+6'),
  ('Arauto do Silêncio do Silêncio', 'Golpe Rápido', '3d6+6'),
  ('Arauto do Silêncio Oculto', 'Lâmina Muda', '3d8+7'),
  ('Arauto do Silêncio Oculto', 'Golpe Rápido', '3d6+7'),
  ('Arauto do Silêncio das Trevas', 'Lâmina Muda', '3d8+7'),
  ('Arauto do Silêncio das Trevas', 'Golpe Rápido', '3d6+7'),
  ('Tecelão de Trevas Sem Luz', 'Teia Sombria', '4d8+7'),
  ('Tecelão de Trevas Sem Luz', 'Rajada de Érebo', '4d6+7'),
  ('Tecelão de Trevas do Silêncio', 'Teia Sombria', '4d8+7'),
  ('Tecelão de Trevas do Silêncio', 'Rajada de Érebo', '4d6+7'),
  ('Tecelão de Trevas Oculto', 'Teia Sombria', '4d8+8'),
  ('Tecelão de Trevas Oculto', 'Rajada de Érebo', '4d6+8'),
  ('Tecelão de Trevas das Trevas', 'Teia Sombria', '4d8+8'),
  ('Tecelão de Trevas das Trevas', 'Rajada de Érebo', '4d6+8'),
  ('Dragão Sombrio Sem Luz', 'Sopro Negro', '4d8+8'),
  ('Dragão Sombrio Sem Luz', 'Rajada de Érebo', '4d6+8'),
  ('Dragão Sombrio do Silêncio', 'Sopro Negro', '4d8+8'),
  ('Dragão Sombrio do Silêncio', 'Rajada de Érebo', '4d6+8'),
  ('Dragão Sombrio Oculto', 'Sopro Negro', '4d8+9'),
  ('Dragão Sombrio Oculto', 'Rajada de Érebo', '4d6+9'),
  ('Dragão Sombrio das Trevas', 'Sopro Negro', '4d8+9'),
  ('Dragão Sombrio das Trevas', 'Rajada de Érebo', '4d6+9'),
  ('Avatar do Esquecido Sem Luz', 'Esquecimento', '4d8+9'),
  ('Avatar do Esquecido Sem Luz', 'Rajada de Érebo', '4d6+9'),
  ('Avatar do Esquecido do Silêncio', 'Esquecimento', '4d8+9'),
  ('Avatar do Esquecido do Silêncio', 'Rajada de Érebo', '4d6+9'),
  ('Avatar do Esquecido Oculto', 'Esquecimento', '5d8+10'),
  ('Avatar do Esquecido Oculto', 'Rajada de Érebo', '5d6+10'),
  ('Avatar do Esquecido das Trevas', 'Esquecimento', '5d8+10'),
  ('Avatar do Esquecido das Trevas', 'Rajada de Érebo', '5d6+10'),
  ('Mariposa Lunar', 'Pó Sonífero', '1d8'),
  ('Mariposa Lunar', 'Rajada de Nix', '1d6'),
  ('Mariposa dos Sonhos', 'Pó Sonífero', '1d8'),
  ('Mariposa dos Sonhos', 'Rajada de Nix', '1d6'),
  ('Mariposa Estelar', 'Pó Sonífero', '1d8+1'),
  ('Mariposa Estelar', 'Rajada de Nix', '1d6+1'),
  ('Mariposa da Meia-Noite', 'Pó Sonífero', '1d8+1'),
  ('Mariposa da Meia-Noite', 'Rajada de Nix', '1d6+1'),
  ('Gato Onírico Lunar', 'Arranhão', '1d8+1'),
  ('Gato Onírico Lunar', 'Golpe Rápido', '1d6+1'),
  ('Gato Onírico dos Sonhos', 'Arranhão', '1d8+1'),
  ('Gato Onírico dos Sonhos', 'Golpe Rápido', '1d6+1'),
  ('Gato Onírico Estelar', 'Arranhão', '1d8+2'),
  ('Gato Onírico Estelar', 'Golpe Rápido', '1d6+2'),
  ('Gato Onírico da Meia-Noite', 'Arranhão', '1d8+2'),
  ('Gato Onírico da Meia-Noite', 'Golpe Rápido', '1d6+2'),
  ('Fada do Sono Lunar', 'Feitiço', '2d8+2'),
  ('Fada do Sono Lunar', 'Rajada de Nix', '2d6+2'),
  ('Fada do Sono dos Sonhos', 'Feitiço', '2d8+2'),
  ('Fada do Sono dos Sonhos', 'Rajada de Nix', '2d6+2'),
  ('Fada do Sono Estelar', 'Feitiço', '2d8+3'),
  ('Fada do Sono Estelar', 'Rajada de Nix', '2d6+3'),
  ('Fada do Sono da Meia-Noite', 'Feitiço', '2d8+3'),
  ('Fada do Sono da Meia-Noite', 'Rajada de Nix', '2d6+3'),
  ('Lobo Lunar Lunar', 'Mordida', '2d8+3'),
  ('Lobo Lunar Lunar', 'Investida', '2d6+3'),
  ('Lobo Lunar dos Sonhos', 'Mordida', '2d8+3'),
  ('Lobo Lunar dos Sonhos', 'Investida', '2d6+3'),
  ('Lobo Lunar Estelar', 'Mordida', '2d8+4'),
  ('Lobo Lunar Estelar', 'Investida', '2d6+4'),
  ('Lobo Lunar da Meia-Noite', 'Mordida', '2d8+4'),
  ('Lobo Lunar da Meia-Noite', 'Investida', '2d6+4'),
  ('Devorador de Sonhos Lunar', 'Garra Onírica', '2d8+4'),
  ('Devorador de Sonhos Lunar', 'Golpe Rápido', '2d6+4'),
  ('Devorador de Sonhos dos Sonhos', 'Garra Onírica', '2d8+4'),
  ('Devorador de Sonhos dos Sonhos', 'Golpe Rápido', '2d6+4'),
  ('Devorador de Sonhos Estelar', 'Garra Onírica', '3d8+5'),
  ('Devorador de Sonhos Estelar', 'Golpe Rápido', '3d6+5'),
  ('Devorador de Sonhos da Meia-Noite', 'Garra Onírica', '3d8+5'),
  ('Devorador de Sonhos da Meia-Noite', 'Golpe Rápido', '3d6+5'),
  ('Pesadelo Vivo Lunar', 'Terror', '3d8+5'),
  ('Pesadelo Vivo Lunar', 'Rajada de Nix', '3d6+5'),
  ('Pesadelo Vivo dos Sonhos', 'Terror', '3d8+5'),
  ('Pesadelo Vivo dos Sonhos', 'Rajada de Nix', '3d6+5'),
  ('Pesadelo Vivo Estelar', 'Terror', '3d8+6'),
  ('Pesadelo Vivo Estelar', 'Rajada de Nix', '3d6+6'),
  ('Pesadelo Vivo da Meia-Noite', 'Terror', '3d8+6'),
  ('Pesadelo Vivo da Meia-Noite', 'Rajada de Nix', '3d6+6'),
  ('Coruja Estelar Lunar', 'Garras', '3d8+6'),
  ('Coruja Estelar Lunar', 'Golpe Rápido', '3d6+6'),
  ('Coruja Estelar dos Sonhos', 'Garras', '3d8+6'),
  ('Coruja Estelar dos Sonhos', 'Golpe Rápido', '3d6+6'),
  ('Coruja Estelar Estelar', 'Garras', '3d8+7'),
  ('Coruja Estelar Estelar', 'Golpe Rápido', '3d6+7'),
  ('Coruja Estelar da Meia-Noite', 'Garras', '3d8+7'),
  ('Coruja Estelar da Meia-Noite', 'Golpe Rápido', '3d6+7'),
  ('Íncubo Lunar', 'Sussurro', '4d8+7'),
  ('Íncubo Lunar', 'Rajada de Nix', '4d6+7'),
  ('Íncubo dos Sonhos', 'Sussurro', '4d8+7'),
  ('Íncubo dos Sonhos', 'Rajada de Nix', '4d6+7'),
  ('Íncubo Estelar', 'Sussurro', '4d8+8'),
  ('Íncubo Estelar', 'Rajada de Nix', '4d6+8'),
  ('Íncubo da Meia-Noite', 'Sussurro', '4d8+8'),
  ('Íncubo da Meia-Noite', 'Rajada de Nix', '4d6+8'),
  ('Dragão da Lua Lunar', 'Sopro Lunar', '4d8+8'),
  ('Dragão da Lua Lunar', 'Rajada de Nix', '4d6+8'),
  ('Dragão da Lua dos Sonhos', 'Sopro Lunar', '4d8+8'),
  ('Dragão da Lua dos Sonhos', 'Rajada de Nix', '4d6+8'),
  ('Dragão da Lua Estelar', 'Sopro Lunar', '4d8+9'),
  ('Dragão da Lua Estelar', 'Rajada de Nix', '4d6+9'),
  ('Dragão da Lua da Meia-Noite', 'Sopro Lunar', '4d8+9'),
  ('Dragão da Lua da Meia-Noite', 'Rajada de Nix', '4d6+9'),
  ('Avatar da Noite Lunar', 'Noite Eterna', '4d8+9'),
  ('Avatar da Noite Lunar', 'Rajada de Nix', '4d6+9'),
  ('Avatar da Noite dos Sonhos', 'Noite Eterna', '4d8+9'),
  ('Avatar da Noite dos Sonhos', 'Rajada de Nix', '4d6+9'),
  ('Avatar da Noite Estelar', 'Noite Eterna', '5d8+10'),
  ('Avatar da Noite Estelar', 'Rajada de Nix', '5d6+10'),
  ('Avatar da Noite da Meia-Noite', 'Noite Eterna', '5d8+10'),
  ('Avatar da Noite da Meia-Noite', 'Rajada de Nix', '5d6+10'),
  ('Verme Pútrido Corrompido', 'Mordida', '1d8'),
  ('Verme Pútrido Corrompido', 'Investida', '1d6'),
  ('Verme Pútrido Acorrentado', 'Mordida', '1d8'),
  ('Verme Pútrido Acorrentado', 'Investida', '1d6'),
  ('Verme Pútrido Profano', 'Mordida', '1d8+1'),
  ('Verme Pútrido Profano', 'Investida', '1d6+1'),
  ('Verme Pútrido do Abismo', 'Mordida', '1d8+1'),
  ('Verme Pútrido do Abismo', 'Investida', '1d6+1'),
  ('Cão Infernal Corrompido', 'Mordida Infernal', '1d8+1'),
  ('Cão Infernal Corrompido', 'Investida', '1d6+1'),
  ('Cão Infernal Acorrentado', 'Mordida Infernal', '1d8+1'),
  ('Cão Infernal Acorrentado', 'Investida', '1d6+1'),
  ('Cão Infernal Profano', 'Mordida Infernal', '1d8+2'),
  ('Cão Infernal Profano', 'Investida', '1d6+2'),
  ('Cão Infernal do Abismo', 'Mordida Infernal', '1d8+2'),
  ('Cão Infernal do Abismo', 'Investida', '1d6+2'),
  ('Carniçal Corrompido', 'Garra Pútrida', '2d8+2'),
  ('Carniçal Corrompido', 'Golpe Rápido', '2d6+2'),
  ('Carniçal Acorrentado', 'Garra Pútrida', '2d8+2'),
  ('Carniçal Acorrentado', 'Golpe Rápido', '2d6+2'),
  ('Carniçal Profano', 'Garra Pútrida', '2d8+3'),
  ('Carniçal Profano', 'Golpe Rápido', '2d6+3'),
  ('Carniçal do Abismo', 'Garra Pútrida', '2d8+3'),
  ('Carniçal do Abismo', 'Golpe Rápido', '2d6+3'),
  ('Diabo Menor Corrompido', 'Tridente', '2d8+3'),
  ('Diabo Menor Corrompido', 'Investida', '2d6+3'),
  ('Diabo Menor Acorrentado', 'Tridente', '2d8+3'),
  ('Diabo Menor Acorrentado', 'Investida', '2d6+3'),
  ('Diabo Menor Profano', 'Tridente', '2d8+4'),
  ('Diabo Menor Profano', 'Investida', '2d6+4'),
  ('Diabo Menor do Abismo', 'Tridente', '2d8+4'),
  ('Diabo Menor do Abismo', 'Investida', '2d6+4'),
  ('Ogro Corrompido Corrompido', 'Clava', '2d8+4'),
  ('Ogro Corrompido Corrompido', 'Golpe Pesado', '2d6+4'),
  ('Ogro Corrompido Acorrentado', 'Clava', '2d8+4'),
  ('Ogro Corrompido Acorrentado', 'Golpe Pesado', '2d6+4'),
  ('Ogro Corrompido Profano', 'Clava', '3d8+5'),
  ('Ogro Corrompido Profano', 'Golpe Pesado', '3d6+5'),
  ('Ogro Corrompido do Abismo', 'Clava', '3d8+5'),
  ('Ogro Corrompido do Abismo', 'Golpe Pesado', '3d6+5'),
  ('Carcereiro Corrompido', 'Chicote de Correntes', '3d8+5'),
  ('Carcereiro Corrompido', 'Golpe Rápido', '3d6+5'),
  ('Carcereiro Acorrentado', 'Chicote de Correntes', '3d8+5'),
  ('Carcereiro Acorrentado', 'Golpe Rápido', '3d6+5'),
  ('Carcereiro Profano', 'Chicote de Correntes', '3d8+6'),
  ('Carcereiro Profano', 'Golpe Rápido', '3d6+6'),
  ('Carcereiro do Abismo', 'Chicote de Correntes', '3d8+6'),
  ('Carcereiro do Abismo', 'Golpe Rápido', '3d6+6'),
  ('Abominação Corrompida', 'Esmagar', '3d8+6'),
  ('Abominação Corrompida', 'Golpe Pesado', '3d6+6'),
  ('Abominação Acorrentada', 'Esmagar', '3d8+6'),
  ('Abominação Acorrentada', 'Golpe Pesado', '3d6+6'),
  ('Abominação Profano', 'Esmagar', '3d8+7'),
  ('Abominação Profano', 'Golpe Pesado', '3d6+7'),
  ('Abominação do Abismo', 'Esmagar', '3d8+7'),
  ('Abominação do Abismo', 'Golpe Pesado', '3d6+7'),
  ('Senhor das Correntes Corrompido', 'Correntes', '4d8+7'),
  ('Senhor das Correntes Corrompido', 'Golpe Pesado', '4d6+7'),
  ('Senhor das Correntes Acorrentado', 'Correntes', '4d8+7'),
  ('Senhor das Correntes Acorrentado', 'Golpe Pesado', '4d6+7'),
  ('Senhor das Correntes Profano', 'Correntes', '4d8+8'),
  ('Senhor das Correntes Profano', 'Golpe Pesado', '4d6+8'),
  ('Senhor das Correntes do Abismo', 'Correntes', '4d8+8'),
  ('Senhor das Correntes do Abismo', 'Golpe Pesado', '4d6+8'),
  ('Titã Aprisionado Corrompido', 'Punho', '4d8+8'),
  ('Titã Aprisionado Corrompido', 'Golpe Pesado', '4d6+8'),
  ('Titã Aprisionado Acorrentado', 'Punho', '4d8+8'),
  ('Titã Aprisionado Acorrentado', 'Golpe Pesado', '4d6+8'),
  ('Titã Aprisionado Profano', 'Punho', '4d8+9'),
  ('Titã Aprisionado Profano', 'Golpe Pesado', '4d6+9'),
  ('Titã Aprisionado do Abismo', 'Punho', '4d8+9'),
  ('Titã Aprisionado do Abismo', 'Golpe Pesado', '4d6+9'),
  ('Avatar do Abismo Corrompido', 'Portão Aberto', '4d8+9'),
  ('Avatar do Abismo Corrompido', 'Rajada de Tártaro', '4d6+9'),
  ('Avatar do Abismo Acorrentado', 'Portão Aberto', '4d8+9'),
  ('Avatar do Abismo Acorrentado', 'Rajada de Tártaro', '4d6+9'),
  ('Avatar do Abismo Profano', 'Portão Aberto', '5d8+10'),
  ('Avatar do Abismo Profano', 'Rajada de Tártaro', '5d6+10'),
  ('Avatar do Abismo do Abismo', 'Portão Aberto', '5d8+10'),
  ('Avatar do Abismo do Abismo', 'Rajada de Tártaro', '5d6+10'),
  ('Fogo-Fátuo Radiante', 'Clarão', '1d8'),
  ('Fogo-Fátuo Radiante', 'Rajada de Éter', '1d6'),
  ('Fogo-Fátuo Sagrado', 'Clarão', '1d8'),
  ('Fogo-Fátuo Sagrado', 'Rajada de Éter', '1d6'),
  ('Fogo-Fátuo dos Céus', 'Clarão', '1d8+1'),
  ('Fogo-Fátuo dos Céus', 'Rajada de Éter', '1d6+1'),
  ('Fogo-Fátuo Divino', 'Clarão', '1d8+1'),
  ('Fogo-Fátuo Divino', 'Rajada de Éter', '1d6+1'),
  ('Pomba de Luz Radiante', 'Bicada', '1d8+1'),
  ('Pomba de Luz Radiante', 'Investida', '1d6+1'),
  ('Pomba de Luz Sagrada', 'Bicada', '1d8+1'),
  ('Pomba de Luz Sagrada', 'Investida', '1d6+1'),
  ('Pomba de Luz dos Céus', 'Bicada', '1d8+2'),
  ('Pomba de Luz dos Céus', 'Investida', '1d6+2'),
  ('Pomba de Luz Divina', 'Bicada', '1d8+2'),
  ('Pomba de Luz Divina', 'Investida', '1d6+2'),
  ('Guardião de Pedra Radiante', 'Punho', '2d8+2'),
  ('Guardião de Pedra Radiante', 'Golpe Pesado', '2d6+2'),
  ('Guardião de Pedra Sagrado', 'Punho', '2d8+2'),
  ('Guardião de Pedra Sagrado', 'Golpe Pesado', '2d6+2'),
  ('Guardião de Pedra dos Céus', 'Punho', '2d8+3'),
  ('Guardião de Pedra dos Céus', 'Golpe Pesado', '2d6+3'),
  ('Guardião de Pedra Divino', 'Punho', '2d8+3'),
  ('Guardião de Pedra Divino', 'Golpe Pesado', '2d6+3'),
  ('Leão Alado Radiante', 'Garra', '2d8+3'),
  ('Leão Alado Radiante', 'Golpe Rápido', '2d6+3'),
  ('Leão Alado Sagrado', 'Garra', '2d8+3'),
  ('Leão Alado Sagrado', 'Golpe Rápido', '2d6+3'),
  ('Leão Alado dos Céus', 'Garra', '2d8+4'),
  ('Leão Alado dos Céus', 'Golpe Rápido', '2d6+4'),
  ('Leão Alado Divino', 'Garra', '2d8+4'),
  ('Leão Alado Divino', 'Golpe Rápido', '2d6+4'),
  ('Anjo Caído Radiante', 'Lâmina', '2d8+4'),
  ('Anjo Caído Radiante', 'Golpe Rápido', '2d6+4'),
  ('Anjo Caído Sagrado', 'Lâmina', '2d8+4'),
  ('Anjo Caído Sagrado', 'Golpe Rápido', '2d6+4'),
  ('Anjo Caído dos Céus', 'Lâmina', '3d8+5'),
  ('Anjo Caído dos Céus', 'Golpe Rápido', '3d6+5'),
  ('Anjo Caído Divino', 'Lâmina', '3d8+5'),
  ('Anjo Caído Divino', 'Golpe Rápido', '3d6+5'),
  ('Sentinela Celeste Radiante', 'Espada de Luz', '3d8+5'),
  ('Sentinela Celeste Radiante', 'Golpe Rápido', '3d6+5'),
  ('Sentinela Celeste Sagrado', 'Espada de Luz', '3d8+5'),
  ('Sentinela Celeste Sagrado', 'Golpe Rápido', '3d6+5'),
  ('Sentinela Celeste dos Céus', 'Espada de Luz', '3d8+6'),
  ('Sentinela Celeste dos Céus', 'Golpe Rápido', '3d6+6'),
  ('Sentinela Celeste Divino', 'Espada de Luz', '3d8+6'),
  ('Sentinela Celeste Divino', 'Golpe Rápido', '3d6+6'),
  ('Grifo Dourado Radiante', 'Investida', '3d8+6'),
  ('Grifo Dourado Radiante', 'Golpe Pesado', '3d6+6'),
  ('Grifo Dourado Sagrado', 'Investida', '3d8+6'),
  ('Grifo Dourado Sagrado', 'Golpe Pesado', '3d6+6'),
  ('Grifo Dourado dos Céus', 'Investida', '3d8+7'),
  ('Grifo Dourado dos Céus', 'Golpe Pesado', '3d6+7'),
  ('Grifo Dourado Divino', 'Investida', '3d8+7'),
  ('Grifo Dourado Divino', 'Golpe Pesado', '3d6+7'),
  ('Serafim Radiante', 'Julgamento', '4d8+7'),
  ('Serafim Radiante', 'Rajada de Éter', '4d6+7'),
  ('Serafim Sagrado', 'Julgamento', '4d8+7'),
  ('Serafim Sagrado', 'Rajada de Éter', '4d6+7'),
  ('Serafim dos Céus', 'Julgamento', '4d8+8'),
  ('Serafim dos Céus', 'Rajada de Éter', '4d6+8'),
  ('Serafim Divino', 'Julgamento', '4d8+8'),
  ('Serafim Divino', 'Rajada de Éter', '4d6+8'),
  ('Querubim de Guerra Radiante', 'Lança', '4d8+8'),
  ('Querubim de Guerra Radiante', 'Investida', '4d6+8'),
  ('Querubim de Guerra Sagrado', 'Lança', '4d8+8'),
  ('Querubim de Guerra Sagrado', 'Investida', '4d6+8'),
  ('Querubim de Guerra dos Céus', 'Lança', '4d8+9'),
  ('Querubim de Guerra dos Céus', 'Investida', '4d6+9'),
  ('Querubim de Guerra Divino', 'Lança', '4d8+9'),
  ('Querubim de Guerra Divino', 'Investida', '4d6+9'),
  ('Avatar Celestial Radiante', 'Luz Final', '4d8+9'),
  ('Avatar Celestial Radiante', 'Rajada de Éter', '4d6+9'),
  ('Avatar Celestial Sagrado', 'Luz Final', '4d8+9'),
  ('Avatar Celestial Sagrado', 'Rajada de Éter', '4d6+9'),
  ('Avatar Celestial dos Céus', 'Luz Final', '5d8+10'),
  ('Avatar Celestial dos Céus', 'Rajada de Éter', '5d6+10'),
  ('Avatar Celestial Divino', 'Luz Final', '5d8+10'),
  ('Avatar Celestial Divino', 'Rajada de Éter', '5d6+10'),
  ('Grilo de Latão de Bronze', 'Ferroada', '1d8'),
  ('Grilo de Latão de Bronze', 'Investida', '1d6'),
  ('Grilo de Latão das Horas', 'Ferroada', '1d8'),
  ('Grilo de Latão das Horas', 'Investida', '1d6'),
  ('Grilo de Latão do Destino', 'Ferroada', '1d8+1'),
  ('Grilo de Latão do Destino', 'Investida', '1d6+1'),
  ('Grilo de Latão Eterno', 'Ferroada', '1d8+1'),
  ('Grilo de Latão Eterno', 'Investida', '1d6+1'),
  ('Autômato de Bronze', 'Engrenagem', '1d8+1'),
  ('Autômato de Bronze', 'Golpe Rápido', '1d6+1'),
  ('Autômato das Horas', 'Engrenagem', '1d8+1'),
  ('Autômato das Horas', 'Golpe Rápido', '1d6+1'),
  ('Autômato do Destino', 'Engrenagem', '1d8+2'),
  ('Autômato do Destino', 'Golpe Rápido', '1d6+2'),
  ('Autômato Eterno', 'Engrenagem', '1d8+2'),
  ('Autômato Eterno', 'Golpe Rápido', '1d6+2'),
  ('Aranha do Relógio de Bronze', 'Fio Cortante', '2d8+2'),
  ('Aranha do Relógio de Bronze', 'Golpe Rápido', '2d6+2'),
  ('Aranha do Relógio das Horas', 'Fio Cortante', '2d8+2'),
  ('Aranha do Relógio das Horas', 'Golpe Rápido', '2d6+2'),
  ('Aranha do Relógio do Destino', 'Fio Cortante', '2d8+3'),
  ('Aranha do Relógio do Destino', 'Golpe Rápido', '2d6+3'),
  ('Aranha do Relógio Eterna', 'Fio Cortante', '2d8+3'),
  ('Aranha do Relógio Eterna', 'Golpe Rápido', '2d6+3'),
  ('Guarda Mecânico de Bronze', 'Alabarda', '2d8+3'),
  ('Guarda Mecânico de Bronze', 'Golpe Rápido', '2d6+3'),
  ('Guarda Mecânico das Horas', 'Alabarda', '2d8+3'),
  ('Guarda Mecânico das Horas', 'Golpe Rápido', '2d6+3'),
  ('Guarda Mecânico do Destino', 'Alabarda', '2d8+4'),
  ('Guarda Mecânico do Destino', 'Golpe Rápido', '2d6+4'),
  ('Guarda Mecânico Eterno', 'Alabarda', '2d8+4'),
  ('Guarda Mecânico Eterno', 'Golpe Rápido', '2d6+4'),
  ('Corvo do Destino de Bronze', 'Bicada', '2d8+4'),
  ('Corvo do Destino de Bronze', 'Investida', '2d6+4'),
  ('Corvo do Destino das Horas', 'Bicada', '2d8+4'),
  ('Corvo do Destino das Horas', 'Investida', '2d6+4'),
  ('Corvo do Destino do Destino', 'Bicada', '3d8+5'),
  ('Corvo do Destino do Destino', 'Investida', '3d6+5'),
  ('Corvo do Destino Eterno', 'Bicada', '3d8+5'),
  ('Corvo do Destino Eterno', 'Investida', '3d6+5'),
  ('Tecelã de Bronze', 'Teia do Destino', '3d8+5'),
  ('Tecelã de Bronze', 'Rajada de Ananque', '3d6+5'),
  ('Tecelã das Horas', 'Teia do Destino', '3d8+5'),
  ('Tecelã das Horas', 'Rajada de Ananque', '3d6+5'),
  ('Tecelã do Destino', 'Teia do Destino', '3d8+6'),
  ('Tecelã do Destino', 'Rajada de Ananque', '3d6+6'),
  ('Tecelã Eterna', 'Teia do Destino', '3d8+6'),
  ('Tecelã Eterna', 'Rajada de Ananque', '3d6+6'),
  ('Golem de Bronze de Bronze', 'Punho', '3d8+6'),
  ('Golem de Bronze de Bronze', 'Golpe Pesado', '3d6+6'),
  ('Golem de Bronze das Horas', 'Punho', '3d8+6'),
  ('Golem de Bronze das Horas', 'Golpe Pesado', '3d6+6'),
  ('Golem de Bronze do Destino', 'Punho', '3d8+7'),
  ('Golem de Bronze do Destino', 'Golpe Pesado', '3d6+7'),
  ('Golem de Bronze Eterno', 'Punho', '3d8+7'),
  ('Golem de Bronze Eterno', 'Golpe Pesado', '3d6+7'),
  ('Cronomante Perdido de Bronze', 'Retardar', '4d8+7'),
  ('Cronomante Perdido de Bronze', 'Rajada de Ananque', '4d6+7'),
  ('Cronomante Perdido das Horas', 'Retardar', '4d8+7'),
  ('Cronomante Perdido das Horas', 'Rajada de Ananque', '4d6+7'),
  ('Cronomante Perdido do Destino', 'Retardar', '4d8+8'),
  ('Cronomante Perdido do Destino', 'Rajada de Ananque', '4d6+8'),
  ('Cronomante Perdido Eterno', 'Retardar', '4d8+8'),
  ('Cronomante Perdido Eterno', 'Rajada de Ananque', '4d6+8'),
  ('Juiz das Horas de Bronze', 'Sentença', '4d8+8'),
  ('Juiz das Horas de Bronze', 'Rajada de Ananque', '4d6+8'),
  ('Juiz das Horas das Horas', 'Sentença', '4d8+8'),
  ('Juiz das Horas das Horas', 'Rajada de Ananque', '4d6+8'),
  ('Juiz das Horas do Destino', 'Sentença', '4d8+9'),
  ('Juiz das Horas do Destino', 'Rajada de Ananque', '4d6+9'),
  ('Juiz das Horas Eterno', 'Sentença', '4d8+9'),
  ('Juiz das Horas Eterno', 'Rajada de Ananque', '4d6+9'),
  ('Avatar da Ordem de Bronze', 'Inevitável', '4d8+9'),
  ('Avatar da Ordem de Bronze', 'Rajada de Ananque', '4d6+9'),
  ('Avatar da Ordem das Horas', 'Inevitável', '4d8+9'),
  ('Avatar da Ordem das Horas', 'Rajada de Ananque', '4d6+9'),
  ('Avatar da Ordem do Destino', 'Inevitável', '5d8+10'),
  ('Avatar da Ordem do Destino', 'Rajada de Ananque', '5d6+10'),
  ('Avatar da Ordem Eterno', 'Inevitável', '5d8+10'),
  ('Avatar da Ordem Eterno', 'Rajada de Ananque', '5d6+10')
) as v(monster, attack, formula)
join monsters m on lower(m.name) = lower(v.monster) and m.deleted_at is null
where not exists (select 1 from monster_attacks a where a.monster_id = m.id and lower(a.name) = lower(v.attack));

-- ficha que ja foi mostrada numa campanha: a trava da mesa (sheet.stats/powers = 'mestre') vale
-- enquanto o dono for membro, mesmo que ele tire ou troque o personagem compartilhado
create table if not exists campaign_character_links (
  campaign_id uuid not null references campaigns(id) on delete cascade,
  character_id uuid not null references characters(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (campaign_id, character_id)
);
insert into campaign_character_links (campaign_id, character_id)
  select campaign_id, coalesce(shared_character_id, character_id) from campaign_members
   where coalesce(shared_character_id, character_id) is not null
  on conflict do nothing;

-- mapa-item: quem recebeu o mapa de qual cena (o inventario e editavel pelo jogador, entao a
-- permissao de abrir o mapa fica aqui no servidor)
create table if not exists campaign_map_grants (
  campaign_id uuid not null references campaigns(id) on delete cascade,
  scene_id uuid not null references campaign_scenes(id) on delete cascade,
  character_id uuid not null references characters(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (scene_id, character_id)
);

-- pedidos de acao ao mestre (regra 'pedir'): o jogador tenta pegar item, passar por porta ou atacar,
-- o pedido fica aqui; aprovado, o servidor executa a acao original de novo (conferindo tudo na hora)
create table if not exists campaign_action_requests (
  id uuid primary key default uuid_generate_v4(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  scene_id uuid references campaign_scenes(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  character_id uuid references characters(id) on delete set null,
  token_id uuid references campaign_tokens(id) on delete set null,
  kind text not null check (kind in ('pickup', 'enter', 'exit', 'attack')),
  payload jsonb not null default '{}',
  summary text not null default '',
  status text not null default 'pending' check (status in ('pending', 'approved', 'denied', 'expired')),
  created_at timestamptz not null default now(),
  decided_at timestamptz
);
create index if not exists campaign_action_requests_campaign_idx on campaign_action_requests (campaign_id, status, created_at);

-- ===== viagens pelo mar (24/10) =====
-- barcos da campanha (tabela compartilhada com a loja/NPCs, que vendem e alugam barcos):
-- home_scene_id + x/y = onde o barco esta agora (porto ou mar); convés e porão sao cenas
create table if not exists campaign_boats (
  id uuid primary key default uuid_generate_v4(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  name text not null,
  type text not null,
  owner_character_id uuid references characters(id) on delete set null,
  home_scene_id uuid references campaign_scenes(id) on delete set null,
  x double precision not null default 0,
  y double precision not null default 0,
  deck_scene_id uuid references campaign_scenes(id) on delete set null,
  hold_scene_id uuid references campaign_scenes(id) on delete set null,
  rented_until timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists campaign_boats_campaign_idx on campaign_boats (campaign_id);

-- viagem: o barco anda por uma rota (celulas da cena de mar) do porto de origem ao de destino;
-- progresso = progress + (agora - progress_at) * speed / tamanho da rota enquanto 'sailing'
create table if not exists campaign_voyages (
  id uuid primary key default uuid_generate_v4(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  boat_id uuid not null references campaign_boats(id) on delete cascade,
  sea_scene_id uuid not null references campaign_scenes(id) on delete cascade,
  from_scene_id uuid references campaign_scenes(id) on delete set null,
  from_port text,
  to_scene_id uuid references campaign_scenes(id) on delete set null,
  to_port text,
  from_x double precision,
  from_y double precision,
  route jsonb not null default '[]',
  status text not null default 'sailing' check (status in ('sailing', 'paused', 'arrived', 'returned')),
  progress double precision not null default 0,
  speed double precision not null default 1,
  progress_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  ended_at timestamptz
);
alter table campaign_voyages add column if not exists from_x double precision;
alter table campaign_voyages add column if not exists from_y double precision;
create index if not exists campaign_voyages_campaign_idx on campaign_voyages (campaign_id, status);
create index if not exists campaign_voyages_boat_idx on campaign_voyages (boat_id, status);

-- ===== economia: mercadores NPC, precos por lugar, alugueis (24/10) =====
-- multiplicadores: preco final = base do item x campanha x cena x area da cena x mercador
alter table campaigns add column if not exists price_mult numeric not null default 1;
-- 1 dia de aluguel sem o relogio do mundo = estas horas reais
alter table campaigns add column if not exists rent_hours_per_day numeric not null default 2;
-- minutos do mundo que ja passaram (o relogio do mestre so guarda a hora do dia): conta prazos
alter table campaigns add column if not exists world_minutes bigint not null default 0;
alter table campaign_scenes add column if not exists price_mult numeric not null default 1;
-- areas do mapa com preco proprio: [{ id, name, x, y, w, h, mult }] em celulas
alter table campaign_scenes add column if not exists price_areas jsonb not null default '[]';
-- aparencia em pixel art do NPC (mesmo formato da ficha) e movimento do token
alter table campaign_npcs add column if not exists appearance jsonb;
alter table campaign_tokens add column if not exists wander jsonb;
-- loja vira mercador: modelo, NPC dono, multiplicador, recompra
alter table campaign_shops add column if not exists archetype text;
alter table campaign_shops add column if not exists npc_id uuid references campaign_npcs(id) on delete set null;
alter table campaign_shops add column if not exists greeting text not null default '';
alter table campaign_shops add column if not exists price_mult numeric not null default 1;
alter table campaign_shops add column if not exists buys boolean not null default false;
alter table campaign_shops add column if not exists buy_rate numeric not null default 0.5;
alter table campaign_shops add column if not exists buy_categories jsonb not null default '[]';
create index if not exists campaign_shops_npc_idx on campaign_shops (npc_id);
alter table campaign_shop_items add column if not exists catalog_id text;
alter table campaign_shop_items add column if not exists kind text not null default 'item';
alter table campaign_shop_items add column if not exists rent_per_day int;
alter table campaign_shop_items add column if not exists rent_only boolean not null default false;
alter table campaign_shop_items add column if not exists unlimited boolean not null default false;
alter table campaign_shop_items add column if not exists base_stock int;
alter table campaign_shop_items add column if not exists icon text;
alter table campaign_shop_items add column if not exists boat_type text;

-- alugueis: o item alugado vai para o inventario (id guardado aqui) e volta sozinho no prazo
create table if not exists campaign_rentals (
  id uuid primary key default uuid_generate_v4(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  shop_id uuid references campaign_shops(id) on delete set null,
  item_id uuid references campaign_shop_items(id) on delete set null,
  user_id uuid references users(id) on delete set null,
  character_id uuid references characters(id) on delete cascade,
  inventory_item_id text,
  boat_id uuid references campaign_boats(id) on delete set null,
  name text not null,
  kind text not null default 'item',
  days int not null default 1,
  price int not null default 0,
  ends_at timestamptz,
  ends_world_minutes bigint,
  status text not null default 'active' check (status in ('active', 'returned', 'ended')),
  created_at timestamptz not null default now(),
  ended_at timestamptz
);
create index if not exists campaign_rentals_campaign_idx on campaign_rentals (campaign_id, status);

-- livro-caixa do comercio (compras, vendas, alugueis, devolucoes, reposicao)
create table if not exists campaign_trades (
  id uuid primary key default uuid_generate_v4(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  shop_id uuid references campaign_shops(id) on delete set null,
  user_id uuid references users(id) on delete set null,
  character_id uuid references characters(id) on delete set null,
  kind text not null check (kind in ('compra', 'venda', 'aluguel', 'devolucao', 'reposicao')),
  item_name text not null default '',
  quantity int not null default 1,
  unit_price int not null default 0,
  total int not null default 0,
  meta jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists campaign_trades_campaign_idx on campaign_trades (campaign_id, created_at desc);
create index if not exists campaign_trades_shop_idx on campaign_trades (shop_id, created_at desc);

-- pedido ao mestre tambem para comprar/vender/alugar (regra 'trade'); o tipo fica livre (palavra
-- curta) para os outros sistemas (viagens) criarem os proprios pedidos sem brigar pela constraint
alter table campaign_action_requests drop constraint if exists campaign_action_requests_kind_check;
alter table campaign_action_requests add constraint campaign_action_requests_kind_check check (kind ~ '^[a-z_]{1,30}$');

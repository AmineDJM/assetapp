-- ============================================================================
-- Patrimoine — schéma initial
--
-- Conventions
--   * Les dates métier (échéance, réalisation) sont des `date` : une échéance
--     est une date, pas un instant. Aucun décalage de fuseau possible.
--   * Les horodatages système sont des `timestamptz`.
--   * Les valeurs contraintes utilisent des CHECK plutôt que des types enum :
--     même garantie d'intégrité, migrations plus simples.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- Horodatage automatique
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- profiles
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id                       uuid primary key references auth.users (id) on delete cascade,
  display_name             text,
  timezone                 text        not null default 'Africa/Algiers',
  default_currency         text        not null default 'EUR',
  email_reminders_enabled  boolean     not null default true,
  default_reminder_days    integer[]   not null default '{30,7,1,0}',
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  constraint profiles_currency_format check (default_currency ~ '^[A-Z]{3}$')
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Création automatique du profil à l'inscription.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, nullif(new.raw_user_meta_data ->> 'display_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- assets — biens immobiliers et véhicules
-- ----------------------------------------------------------------------------
create table if not exists public.assets (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid        not null references auth.users (id) on delete cascade,
  name             text        not null,
  type             text        not null,
  subtype          text,
  country          text,
  city             text,
  address          text,
  default_currency text,
  notes            text,
  is_active        boolean     not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint assets_name_not_blank check (length(btrim(name)) > 0),
  constraint assets_type_valid     check (type in ('property', 'vehicle')),
  constraint assets_currency_format
    check (default_currency is null or default_currency ~ '^[A-Z]{3}$'),
  -- Permet à `obligations` de référencer (asset_id, user_id) : un bien ne peut
  -- pas porter l'obligation d'un autre utilisateur, garanti par la base.
  constraint assets_id_user_unique unique (id, user_id)
);

create trigger assets_set_updated_at
  before update on public.assets
  for each row execute function public.set_updated_at();

create index if not exists assets_user_id_idx on public.assets (user_id);
create index if not exists assets_user_active_idx on public.assets (user_id, is_active);

-- ----------------------------------------------------------------------------
-- obligations — la fréquence est TOUJOURS un nombre entier de jours
-- ----------------------------------------------------------------------------
create table if not exists public.obligations (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid        not null references auth.users (id) on delete cascade,
  asset_id             uuid        not null,
  name                 text        not null,
  type                 text        not null,
  category             text,
  frequency_days       integer     not null,
  calculation_basis    text        not null default 'scheduled',
  next_due_date        date        not null,
  expected_amount      numeric(14, 2),
  currency             text,
  reminder_days_before integer[]   not null default '{30,7,1,0}',
  notes                text,
  is_active            boolean     not null default true,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint obligations_asset_fk
    foreign key (asset_id, user_id)
    references public.assets (id, user_id)
    on delete cascade,
  constraint obligations_name_not_blank check (length(btrim(name)) > 0),
  constraint obligations_frequency_positive check (frequency_days > 0),
  constraint obligations_type_valid check (
    type in ('payment', 'declaration', 'renewal', 'maintenance', 'administrative', 'other')
  ),
  constraint obligations_basis_valid
    check (calculation_basis in ('scheduled', 'completion')),
  constraint obligations_amount_positive
    check (expected_amount is null or expected_amount >= 0),
  constraint obligations_currency_format
    check (currency is null or currency ~ '^[A-Z]{3}$'),
  -- Idem : garantit que les completions pointent vers une obligation du même
  -- utilisateur.
  constraint obligations_id_user_unique unique (id, user_id)
);

create trigger obligations_set_updated_at
  before update on public.obligations
  for each row execute function public.set_updated_at();

create index if not exists obligations_user_id_idx on public.obligations (user_id);
create index if not exists obligations_asset_id_idx on public.obligations (asset_id);
create index if not exists obligations_next_due_date_idx on public.obligations (next_due_date);
create index if not exists obligations_user_due_idx
  on public.obligations (user_id, next_due_date)
  where is_active;

-- ----------------------------------------------------------------------------
-- obligation_completions — historique immuable
--
-- `expected_amount_snapshot` fige le montant prévu au moment de la validation :
-- modifier l'obligation plus tard ne doit pas réécrire le passé.
-- ----------------------------------------------------------------------------
create table if not exists public.obligation_completions (
  id                       uuid primary key default gen_random_uuid(),
  user_id                  uuid        not null references auth.users (id) on delete cascade,
  obligation_id            uuid        not null,
  scheduled_due_date       date        not null,
  completed_date           date        not null,
  expected_amount_snapshot numeric(14, 2),
  actual_amount            numeric(14, 2),
  currency                 text,
  notes                    text,
  created_at               timestamptz not null default now(),
  constraint completions_obligation_fk
    foreign key (obligation_id, user_id)
    references public.obligations (id, user_id)
    on delete cascade,
  constraint completions_amount_positive
    check (actual_amount is null or actual_amount >= 0),
  constraint completions_currency_format
    check (currency is null or currency ~ '^[A-Z]{3}$')
);

create index if not exists completions_obligation_id_idx
  on public.obligation_completions (obligation_id);
create index if not exists completions_completed_date_idx
  on public.obligation_completions (completed_date desc);
create index if not exists completions_user_completed_idx
  on public.obligation_completions (user_id, completed_date desc);

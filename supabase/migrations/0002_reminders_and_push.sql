-- ============================================================================
-- Patrimoine — rappels et notifications push
-- ============================================================================

-- ----------------------------------------------------------------------------
-- reminder_logs — anti-doublon des rappels
--
-- La contrainte d'unicité est la garantie réelle : même si le cron est rejoué,
-- un rappel identique ne peut pas partir deux fois.
--
-- `days_before = -1` est la sentinelle « obligation en retard » : elle permet
-- d'alerter une seule fois par échéance dépassée, au lieu de chaque jour.
-- ----------------------------------------------------------------------------
create table if not exists public.reminder_logs (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid        not null references auth.users (id) on delete cascade,
  obligation_id uuid        not null,
  due_date      date        not null,
  days_before   integer     not null,
  channel       text        not null,
  sent_at       timestamptz not null default now(),
  constraint reminder_logs_obligation_fk
    foreign key (obligation_id, user_id)
    references public.obligations (id, user_id)
    on delete cascade,
  constraint reminder_logs_channel_valid check (channel in ('email', 'push')),
  constraint reminder_logs_days_before_valid check (days_before >= -1),
  constraint reminder_logs_unique
    unique (obligation_id, due_date, days_before, channel)
);

create index if not exists reminder_logs_user_sent_idx
  on public.reminder_logs (user_id, sent_at desc);

-- ----------------------------------------------------------------------------
-- push_subscriptions — un enregistrement par appareil/navigateur
--
-- Un même utilisateur doit pouvoir recevoir les rappels sur son iPhone, son PC
-- et son Mac simultanément : rien ne limite le nombre d'abonnements par
-- utilisateur. `endpoint` est unique globalement (un navigateur donné ne peut
-- appartenir qu'à un seul compte).
--
-- `endpoint`, `p256dh` et `auth` sont des secrets : le RLS ci-dessous est
-- indispensable, ils ne doivent jamais fuiter vers un autre utilisateur.
-- ----------------------------------------------------------------------------
create table if not exists public.push_subscriptions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid        not null references auth.users (id) on delete cascade,
  endpoint     text        not null,
  p256dh       text        not null,
  auth         text        not null,
  user_agent   text,
  device_name  text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  last_used_at timestamptz,
  constraint push_subscriptions_endpoint_unique unique (endpoint)
);

create trigger push_subscriptions_set_updated_at
  before update on public.push_subscriptions
  for each row execute function public.set_updated_at();

create index if not exists push_subscriptions_user_id_idx
  on public.push_subscriptions (user_id);

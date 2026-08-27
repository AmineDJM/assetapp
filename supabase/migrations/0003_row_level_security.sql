-- ============================================================================
-- Patrimoine — Row Level Security
--
-- Aucune table applicative n'est lisible sans RLS. La sécurité ne repose
-- jamais sur le frontend : même avec la clé anonyme et une requête forgée à la
-- main, un utilisateur ne peut voir que ses propres lignes.
-- ============================================================================

alter table public.profiles              enable row level security;
alter table public.assets                enable row level security;
alter table public.obligations           enable row level security;
alter table public.obligation_completions enable row level security;
alter table public.reminder_logs         enable row level security;
alter table public.push_subscriptions    enable row level security;

-- ----------------------------------------------------------------------------
-- profiles
-- ----------------------------------------------------------------------------
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated using (auth.uid() = id);

drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles
  for insert to authenticated with check (auth.uid() = id);

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- Pas de policy DELETE : un profil disparaît avec son compte auth.

-- ----------------------------------------------------------------------------
-- assets
-- ----------------------------------------------------------------------------
drop policy if exists assets_select on public.assets;
create policy assets_select on public.assets
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists assets_insert on public.assets;
create policy assets_insert on public.assets
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists assets_update on public.assets;
create policy assets_update on public.assets
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists assets_delete on public.assets;
create policy assets_delete on public.assets
  for delete to authenticated using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- obligations
-- ----------------------------------------------------------------------------
drop policy if exists obligations_select on public.obligations;
create policy obligations_select on public.obligations
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists obligations_insert on public.obligations;
create policy obligations_insert on public.obligations
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists obligations_update on public.obligations;
create policy obligations_update on public.obligations
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists obligations_delete on public.obligations;
create policy obligations_delete on public.obligations
  for delete to authenticated using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- obligation_completions
-- ----------------------------------------------------------------------------
drop policy if exists completions_select on public.obligation_completions;
create policy completions_select on public.obligation_completions
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists completions_insert on public.obligation_completions;
create policy completions_insert on public.obligation_completions
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists completions_update on public.obligation_completions;
create policy completions_update on public.obligation_completions
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists completions_delete on public.obligation_completions;
create policy completions_delete on public.obligation_completions
  for delete to authenticated using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- reminder_logs — écrits par le cron (service role, qui contourne le RLS).
-- L'utilisateur peut relire son propre historique de rappels.
-- ----------------------------------------------------------------------------
drop policy if exists reminder_logs_select on public.reminder_logs;
create policy reminder_logs_select on public.reminder_logs
  for select to authenticated using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- push_subscriptions
-- ----------------------------------------------------------------------------
drop policy if exists push_subscriptions_select on public.push_subscriptions;
create policy push_subscriptions_select on public.push_subscriptions
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists push_subscriptions_insert on public.push_subscriptions;
create policy push_subscriptions_insert on public.push_subscriptions
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists push_subscriptions_update on public.push_subscriptions;
create policy push_subscriptions_update on public.push_subscriptions
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists push_subscriptions_delete on public.push_subscriptions;
create policy push_subscriptions_delete on public.push_subscriptions
  for delete to authenticated using (auth.uid() = user_id);

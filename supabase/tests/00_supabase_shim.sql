-- ============================================================================
-- Environnement Supabase minimal pour tester les migrations en local.
--
-- Recrée uniquement ce dont les migrations ont besoin : le schéma `auth`,
-- `auth.uid()`, les rôles `anon` / `authenticated` / `service_role` et le
-- schéma `storage`. À n'appliquer QUE sur une base de test locale — jamais sur
-- un projet Supabase, qui fournit déjà tout cela.
--
-- Voir `npm run test:db`.
-- ============================================================================

create extension if not exists "pgcrypto";

do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end $$;

create schema if not exists auth;
create schema if not exists storage;

create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  raw_user_meta_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Supabase expose l'identité via un GUC contenant les claims du JWT.
create or replace function auth.uid() returns uuid language plpgsql stable as $$
declare claims text := current_setting('request.jwt.claims', true);
begin
  if claims is null or claims = '' then return null; end if;
  return (claims::jsonb ->> 'sub')::uuid;
end $$;

create table if not exists storage.buckets (
  id text primary key, name text not null, public boolean not null default false
);
create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets (id),
  name text not null,
  owner uuid
);
alter table storage.objects enable row level security;

create or replace function storage.foldername(name text) returns text[]
language sql immutable as $$ select string_to_array(name, '/') $$;

grant usage on schema public, auth, storage to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;

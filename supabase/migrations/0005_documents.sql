-- ============================================================================
-- Patrimoine — documents (préparation)
--
-- La V1 ne propose pas d'interface de gestion documentaire : le cœur de
-- l'application (échéances, recalcul, rappels) fonctionne entièrement sans.
-- Cette migration pose la table et les règles d'accès pour que l'ajout de
-- factures, contrats ou cartes grises ne demande plus qu'un écran, sans
-- toucher au modèle de sécurité.
--
-- Appliquer cette migration est optionnel.
-- ============================================================================

create table if not exists public.documents (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid        not null references auth.users (id) on delete cascade,
  asset_id      uuid,
  obligation_id uuid,
  file_path     text        not null,
  original_name text        not null,
  mime_type     text,
  size_bytes    bigint,
  created_at    timestamptz not null default now(),
  constraint documents_asset_fk
    foreign key (asset_id, user_id) references public.assets (id, user_id) on delete cascade,
  constraint documents_obligation_fk
    foreign key (obligation_id, user_id) references public.obligations (id, user_id) on delete cascade,
  constraint documents_target_required
    check (asset_id is not null or obligation_id is not null)
);

create index if not exists documents_user_id_idx on public.documents (user_id);
create index if not exists documents_asset_id_idx on public.documents (asset_id);
create index if not exists documents_obligation_id_idx on public.documents (obligation_id);

alter table public.documents enable row level security;

drop policy if exists documents_select on public.documents;
create policy documents_select on public.documents
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists documents_insert on public.documents;
create policy documents_insert on public.documents
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists documents_update on public.documents;
create policy documents_update on public.documents
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists documents_delete on public.documents;
create policy documents_delete on public.documents
  for delete to authenticated using (auth.uid() = user_id);

-- Bucket privé. Chaque fichier est rangé sous `<user_id>/...`, ce que les
-- policies ci-dessous vérifient.
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

drop policy if exists documents_storage_select on storage.objects;
create policy documents_storage_select on storage.objects
  for select to authenticated
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists documents_storage_insert on storage.objects;
create policy documents_storage_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists documents_storage_delete on storage.objects;
create policy documents_storage_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);

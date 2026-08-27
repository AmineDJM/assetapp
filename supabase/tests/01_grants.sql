-- Privilèges accordés par défaut par Supabase au rôle `authenticated`.
-- Le RLS reste la seule barrière : ces GRANT n'ouvrent aucune donnée.
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant select, insert, update, delete on all tables in schema storage to authenticated;

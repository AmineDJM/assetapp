-- ============================================================================
-- Tests d'isolation et d'intégrité de la base.
--
-- Deux comptes, Alice et Bob. Chaque bloc vérifie qu'une opération interdite
-- échoue réellement au niveau PostgreSQL — pas seulement dans l'interface.
--
--   npm run test:db
-- ============================================================================

\set ON_ERROR_STOP on
\pset pager off

-- Deux comptes : Alice et Bob. Bob ne doit jamais voir quoi que ce soit d'Alice.
insert into auth.users (id, email) values
  ('11111111-1111-4111-8111-111111111111', 'alice@example.com'),
  ('22222222-2222-4222-8222-222222222222', 'bob@example.com');

\echo '── Le trigger d inscription a-t-il créé les profils ?'
select count(*) as profils_crees from public.profiles;

-- ---------------------------------------------------------------------------
\echo ''
\echo '── Alice crée un bien et une obligation'
set role authenticated;
set request.jwt.claims = '{"sub":"11111111-1111-4111-8111-111111111111"}';

insert into public.assets (user_id, name, type, subtype, default_currency)
values ('11111111-1111-4111-8111-111111111111', 'Audi Q3', 'vehicle', 'Voiture', 'EUR');

insert into public.obligations
  (user_id, asset_id, name, type, category, frequency_days, calculation_basis,
   next_due_date, expected_amount, currency)
select '11111111-1111-4111-8111-111111111111', id, 'Assurance', 'payment', 'Assurance',
       365, 'scheduled', date '2026-09-04', 620, 'EUR'
from public.assets where name = 'Audi Q3';

select count(*) as biens_visibles_par_alice from public.assets;
-- Mémorise les identifiants réels pour tester l'accès direct de Bob.
select id as alice_asset_id from public.assets where name = 'Audi Q3' \gset
select id as alice_obligation_id from public.obligations where name = 'Assurance' \gset
set app.alice_asset_id = :'alice_asset_id';
set app.alice_obligation_id = :'alice_obligation_id';

-- ---------------------------------------------------------------------------
\echo ''
\echo '── Bob ne voit rien d Alice (RLS)'
set request.jwt.claims = '{"sub":"22222222-2222-4222-8222-222222222222"}';
select count(*) as biens_visibles_par_bob from public.assets;
select count(*) as obligations_visibles_par_bob from public.obligations;

\echo '── Bob ne peut pas rattacher une obligation au bien d Alice, même en connaissant son id'
do $$
begin
  insert into public.obligations (user_id, asset_id, name, type, frequency_days,
                                  calculation_basis, next_due_date)
  values ('22222222-2222-4222-8222-222222222222',
          current_setting('app.alice_asset_id')::uuid, 'Vol', 'payment',
          30, 'scheduled', current_date);
  raise exception 'ÉCHEC : insertion acceptée';
exception
  when foreign_key_violation then
    raise notice 'OK : la clé étrangère (asset_id, user_id) rend le rattachement impossible';
  when insufficient_privilege then
    raise notice 'OK : RLS refuse le rattachement';
end $$;

\echo '── Bob ne peut pas usurper le user_id d Alice'
do $$
begin
  insert into public.assets (user_id, name, type)
  values ('11111111-1111-4111-8111-111111111111', 'Usurpation', 'property');
  raise exception 'ÉCHEC : usurpation acceptée';
exception
  when insufficient_privilege then raise notice 'OK : RLS refuse l usurpation de user_id';
end $$;

\echo '── Bob ne peut pas modifier ni supprimer les données d Alice'
with piratage as (update public.assets set name = 'Piraté' returning 1)
select count(*) as lignes_modifiees_par_bob from piratage;

with suppression as (delete from public.obligations returning 1)
select count(*) as lignes_supprimees_par_bob from suppression;

\echo '── Bob ne peut pas non plus viser directement l id de l obligation d Alice'
with cible as (
  update public.obligations set next_due_date = current_date
  where id = current_setting('app.alice_obligation_id')::uuid returning 1
)
select count(*) as lignes_touchees_par_bob from cible;

-- ---------------------------------------------------------------------------
\echo ''
\echo '── Alice valide son assurance (RPC transactionnelle)'
set request.jwt.claims = '{"sub":"11111111-1111-4111-8111-111111111111"}';

select previous_due_date, next_due_date
from public.mark_obligation_complete(
  (select id from public.obligations where name = 'Assurance'),
  date '2026-09-03',   -- payé un jour en avance
  date '2027-09-04',   -- calculé par lib/recurrence (base « date prévue »)
  615,
  'Payé en ligne'
);

\echo '── L obligation et l historique sont cohérents'
select next_due_date as nouvelle_echeance from public.obligations where name = 'Assurance';
select scheduled_due_date, completed_date, expected_amount_snapshot, actual_amount, currency
from public.obligation_completions;

-- ---------------------------------------------------------------------------
\echo ''
\echo '── Bob ne peut pas valider une obligation d Alice'
set request.jwt.claims = '{"sub":"22222222-2222-4222-8222-222222222222"}';
do $$
begin
  perform public.mark_obligation_complete(
    current_setting('app.alice_obligation_id')::uuid, current_date, current_date + 30, null, null);
  raise exception 'ÉCHEC : validation acceptée';
exception
  when sqlstate 'P0002' then raise notice 'OK : l obligation d Alice est introuvable pour Bob';
end $$;

\echo '── Bob ne peut pas annuler la validation d Alice'
set request.jwt.claims = '{"sub":"22222222-2222-4222-8222-222222222222"}';
do $$
begin
  perform public.undo_obligation_completion(
    '33333333-3333-4333-8333-333333333333'
  );
  raise exception 'ÉCHEC : annulation acceptée';
exception
  when sqlstate 'P0002' then raise notice 'OK : validation introuvable pour Bob';
end $$;

-- ---------------------------------------------------------------------------
\echo ''
\echo '── Alice annule sa validation : l échéance est restaurée'
set request.jwt.claims = '{"sub":"11111111-1111-4111-8111-111111111111"}';
select restored_due_date
from public.undo_obligation_completion((select id from public.obligation_completions limit 1));

select next_due_date as echeance_restauree from public.obligations where name = 'Assurance';
select count(*) as lignes_historique_restantes from public.obligation_completions;

-- ---------------------------------------------------------------------------
\echo ''
\echo '── Contraintes métier'
do $$
begin
  insert into public.obligations (user_id, asset_id, name, type, frequency_days,
                                  calculation_basis, next_due_date)
  select '11111111-1111-4111-8111-111111111111', id, 'Zéro', 'payment', 0, 'scheduled', current_date
  from public.assets limit 1;
  raise exception 'ÉCHEC : fréquence 0 acceptée';
exception
  when check_violation then raise notice 'OK : frequency_days = 0 refusé';
end $$;

do $$
begin
  insert into public.obligations (user_id, asset_id, name, type, frequency_days,
                                  calculation_basis, next_due_date)
  select '11111111-1111-4111-8111-111111111111', id, 'Négatif', 'payment', -10, 'scheduled', current_date
  from public.assets limit 1;
  raise exception 'ÉCHEC : fréquence négative acceptée';
exception
  when check_violation then raise notice 'OK : frequency_days = -10 refusé';
end $$;

do $$
begin
  insert into public.obligations (user_id, asset_id, name, type, frequency_days,
                                  calculation_basis, next_due_date)
  select '11111111-1111-4111-8111-111111111111', id, 'Base', 'payment', 30, 'mensuel', current_date
  from public.assets limit 1;
  raise exception 'ÉCHEC : base de calcul « mensuel » acceptée';
exception
  when check_violation then raise notice 'OK : calculation_basis invalide refusé';
end $$;

-- ---------------------------------------------------------------------------
\echo ''
\echo '── Anti-doublon des rappels'
reset role;
insert into public.reminder_logs (user_id, obligation_id, due_date, days_before, channel)
select '11111111-1111-4111-8111-111111111111', id, date '2027-09-04', 7, 'push'
from public.obligations where name = 'Assurance';

do $$
begin
  insert into public.reminder_logs (user_id, obligation_id, due_date, days_before, channel)
  select '11111111-1111-4111-8111-111111111111', id, date '2027-09-04', 7, 'push'
  from public.obligations where name = 'Assurance';
  raise exception 'ÉCHEC : doublon de rappel accepté';
exception
  when unique_violation then raise notice 'OK : rappel identique refusé (obligation, date, seuil, canal)';
end $$;

\echo '── Mêmes échéance et seuil sur un autre canal : autorisé'
insert into public.reminder_logs (user_id, obligation_id, due_date, days_before, channel)
select '11111111-1111-4111-8111-111111111111', id, date '2027-09-04', 7, 'email'
from public.obligations where name = 'Assurance';
select channel, days_before from public.reminder_logs order by channel;

-- ---------------------------------------------------------------------------
\echo ''
\echo '── Un même appareil ne peut appartenir qu à un seul compte'
insert into public.push_subscriptions (user_id, endpoint, p256dh, auth, device_name)
values ('11111111-1111-4111-8111-111111111111', 'https://push.example/abc', 'k', 'a', 'iPhone');
do $$
begin
  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth)
  values ('22222222-2222-4222-8222-222222222222', 'https://push.example/abc', 'k', 'a');
  raise exception 'ÉCHEC : endpoint dupliqué accepté';
exception
  when unique_violation then raise notice 'OK : endpoint unique';
end $$;

\echo '── Plusieurs appareils pour un même utilisateur : autorisé'
insert into public.push_subscriptions (user_id, endpoint, p256dh, auth, device_name)
values
  ('11111111-1111-4111-8111-111111111111', 'https://push.example/pc', 'k', 'a', 'Chrome · Windows'),
  ('11111111-1111-4111-8111-111111111111', 'https://push.example/mac', 'k', 'a', 'Safari · Mac');
select count(*) as appareils_alice from public.push_subscriptions
where user_id = '11111111-1111-4111-8111-111111111111';

\echo '── Bob ne voit pas les endpoints push d Alice'
set role authenticated;
set request.jwt.claims = '{"sub":"22222222-2222-4222-8222-222222222222"}';
select count(*) as endpoints_visibles_par_bob from public.push_subscriptions;
reset role;

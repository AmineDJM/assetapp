-- ============================================================================
-- Patrimoine — opérations transactionnelles
--
-- « Marquer comme fait » écrit dans deux tables : l'historique et l'obligation.
-- Le faire en deux requêtes exposerait au cas « historique créé mais échéance
-- non recalculée ». Ces fonctions plpgsql s'exécutent dans une transaction
-- unique : les deux écritures réussissent ou aucune.
--
-- Le CALCUL de la prochaine échéance reste dans `lib/recurrence` côté
-- applicatif : une seule implémentation, couverte par les tests unitaires, et
-- réutilisée par l'aperçu du formulaire comme par le cron. Ces fonctions ne
-- font que valider et écrire.
--
-- `security invoker` : le RLS s'applique normalement, la vérification
-- d'appartenance explicite ci-dessous est une seconde barrière.
-- ============================================================================

create or replace function public.mark_obligation_complete(
  p_obligation_id  uuid,
  p_completed_date date,
  p_next_due_date  date,
  p_actual_amount  numeric default null,
  p_notes          text    default null
)
returns table (
  completion_id     uuid,
  previous_due_date date,
  next_due_date     date
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id     uuid := auth.uid();
  v_obligation  public.obligations%rowtype;
  v_completion  public.obligation_completions%rowtype;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;

  if p_completed_date is null or p_next_due_date is null then
    raise exception 'DATE_REQUIRED' using errcode = '22004';
  end if;

  if p_next_due_date < date '1900-01-01' or p_next_due_date > date '2200-01-01' then
    raise exception 'NEXT_DUE_DATE_OUT_OF_RANGE' using errcode = '22008';
  end if;

  if p_actual_amount is not null and p_actual_amount < 0 then
    raise exception 'AMOUNT_NEGATIVE' using errcode = '22003';
  end if;

  select * into v_obligation
    from public.obligations
   where id = p_obligation_id
   for update;

  if not found then
    raise exception 'OBLIGATION_NOT_FOUND' using errcode = 'P0002';
  end if;

  if v_obligation.user_id <> v_user_id then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  insert into public.obligation_completions (
    user_id, obligation_id, scheduled_due_date, completed_date,
    expected_amount_snapshot, actual_amount, currency, notes
  )
  values (
    v_user_id, v_obligation.id, v_obligation.next_due_date, p_completed_date,
    v_obligation.expected_amount, p_actual_amount, v_obligation.currency,
    nullif(btrim(coalesce(p_notes, '')), '')
  )
  returning * into v_completion;

  update public.obligations
     set next_due_date = p_next_due_date
   where id = v_obligation.id;

  completion_id     := v_completion.id;
  previous_due_date := v_obligation.next_due_date;
  next_due_date     := p_next_due_date;
  return next;
end;
$$;

-- ----------------------------------------------------------------------------
-- Annulation (« Annuler » du toast).
--
-- Restaure l'échéance précédente et supprime la ligne d'historique. Seule la
-- dernière validation d'une obligation peut être annulée : annuler une
-- validation ancienne réécrirait l'historique de façon incohérente.
-- ----------------------------------------------------------------------------
create or replace function public.undo_obligation_completion(p_completion_id uuid)
returns table (
  obligation_id     uuid,
  restored_due_date date
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id    uuid := auth.uid();
  v_completion public.obligation_completions%rowtype;
  v_latest_id  uuid;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;

  select * into v_completion
    from public.obligation_completions
   where id = p_completion_id
   for update;

  if not found then
    raise exception 'COMPLETION_NOT_FOUND' using errcode = 'P0002';
  end if;

  if v_completion.user_id <> v_user_id then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  select id into v_latest_id
    from public.obligation_completions
   where obligation_completions.obligation_id = v_completion.obligation_id
   order by created_at desc, id desc
   limit 1;

  if v_latest_id <> v_completion.id then
    raise exception 'NOT_LATEST_COMPLETION' using errcode = '55000';
  end if;

  update public.obligations
     set next_due_date = v_completion.scheduled_due_date
   where id = v_completion.obligation_id;

  delete from public.obligation_completions where id = v_completion.id;

  obligation_id     := v_completion.obligation_id;
  restored_due_date := v_completion.scheduled_due_date;
  return next;
end;
$$;

revoke all on function public.mark_obligation_complete(uuid, date, date, numeric, text) from public;
revoke all on function public.undo_obligation_completion(uuid) from public;
grant execute on function public.mark_obligation_complete(uuid, date, date, numeric, text) to authenticated;
grant execute on function public.undo_obligation_completion(uuid) to authenticated;

-- Preserve the historical row while freeing its canonical projection key for
-- the regenerated replacement. This keeps older clients compatible with the
-- existing history-wide idempotency index.
create or replace function public.archive_superseded_generated_session_key()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  archived_key text;
begin
  if new.generated_session_lifecycle = 'superseded'
    and old.generated_session_lifecycle is distinct from 'superseded'
    and new.generated_session_key is not null
    and new.generated_session_key is not distinct from old.generated_session_key
  then
    archived_key := old.generated_session_key || ':superseded:' || old.id::text;
    new.generated_session_key := archived_key;
    new.session_payload := coalesce(new.session_payload, '{}'::jsonb) || jsonb_build_object(
      'canonicalGeneratedSessionKey', old.generated_session_key,
      'archivedGeneratedSessionKey', archived_key
    );
  end if;
  return new;
end;
$$;

revoke all on function public.archive_superseded_generated_session_key() from public, anon, authenticated;

drop trigger if exists archive_superseded_generated_session_key
  on public.generated_training_sessions;

create trigger archive_superseded_generated_session_key
before update of generated_session_lifecycle
on public.generated_training_sessions
for each row
execute function public.archive_superseded_generated_session_key();

comment on function public.archive_superseded_generated_session_key() is
  'Archives a superseded generated-session key before uniqueness checks so regenerated canonical content can replace it without deleting history.';

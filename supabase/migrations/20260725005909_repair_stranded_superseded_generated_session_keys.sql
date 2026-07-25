-- Repair superseded rows that were committed before the archive-key trigger
-- existed. Those rows still own the canonical uniqueness key and prevent a
-- regenerated replacement from being inserted on retry.
update public.generated_training_sessions
set
  session_payload = coalesce(session_payload, '{}'::jsonb) || jsonb_build_object(
    'canonicalGeneratedSessionKey', generated_session_key,
    'archivedGeneratedSessionKey', generated_session_key || ':superseded:' || id::text,
    'supersededKeyRepair', '20260725005909'
  ),
  generated_session_key = generated_session_key || ':superseded:' || id::text
where generated_session_lifecycle = 'superseded'
  and generated_session_key is not null
  and right(generated_session_key, length(':superseded:' || id::text))
    <> ':superseded:' || id::text;

-- Make the guard idempotent and cover both newly inserted superseded history
-- and any update that leaves a row superseded. The suffix check prevents an
-- already archived key from being changed twice.
create or replace function public.archive_superseded_generated_session_key()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  canonical_key text;
  archived_key text;
  archive_suffix text;
begin
  archive_suffix := ':superseded:' || new.id::text;

  if new.generated_session_lifecycle = 'superseded'
    and new.generated_session_key is not null
    and right(new.generated_session_key, length(archive_suffix)) <> archive_suffix
  then
    canonical_key := new.generated_session_key;
    archived_key := canonical_key || archive_suffix;
    new.generated_session_key := archived_key;
    new.session_payload := coalesce(new.session_payload, '{}'::jsonb) || jsonb_build_object(
      'canonicalGeneratedSessionKey', canonical_key,
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
before insert or update of generated_session_lifecycle, generated_session_key
on public.generated_training_sessions
for each row
execute function public.archive_superseded_generated_session_key();

comment on function public.archive_superseded_generated_session_key() is
  'Idempotently archives keys owned by superseded generated sessions so a retry can reuse the canonical projection key without deleting history.';

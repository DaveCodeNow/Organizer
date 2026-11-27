-- Haushalt-App: Datenbankschema für den Sync.
-- Einmal im Supabase-Dashboard unter „SQL Editor“ einfügen und ausführen (kann gefahrlos erneut ausgeführt werden).
--
-- Alle Datensätze aller Tabellen der App liegen generisch in `records`: eine Zeile pro Eintrag,
-- der Inhalt als JSON. So braucht eine neue Tabelle in der App keine Änderung am Backend.
-- Row Level Security sorgt dafür, dass jede Person nur ihre eigenen Daten sieht.

create table if not exists public.records (
  user_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  tbl        text        not null,
  id         text        not null,
  data       jsonb,
  deleted    boolean     not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, tbl, id)
);

create index if not exists records_user_updated on public.records (user_id, updated_at);

-- Zeitstempel immer vom Server setzen (Uhren der Geräte können abweichen)
create or replace function public.records_touch() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists records_touch on public.records;
create trigger records_touch before insert or update on public.records
  for each row execute function public.records_touch();

-- Zugriff nur auf eigene Zeilen
alter table public.records enable row level security;

drop policy if exists "eigene Daten lesen" on public.records;
drop policy if exists "eigene Daten anlegen" on public.records;
drop policy if exists "eigene Daten ändern" on public.records;
drop policy if exists "eigene Daten löschen" on public.records;

create policy "eigene Daten lesen" on public.records
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "eigene Daten anlegen" on public.records
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "eigene Daten ändern" on public.records
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "eigene Daten löschen" on public.records
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Realtime: andere Geräte werden sofort über Änderungen benachrichtigt
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'records'
  ) then
    alter publication supabase_realtime add table public.records;
  end if;
end $$;

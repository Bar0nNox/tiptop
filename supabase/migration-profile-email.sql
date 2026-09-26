-- ============================================================================
-- TipTop — migration-profile-email.sql                   (v1.22.0)
--
-- `profiles.email` suit désormais l'adresse du compte.
--
-- LE DÉFAUT CORRIGÉ
-- `profiles.email` n'était renseigné qu'à l'inscription (`handle_new_user`,
-- `after insert on auth.users`). Aucun déclencheur ne suivait un changement
-- d'adresse. Conséquences constatées au §5.3 du roadmap :
--   · la liste des collaborateurs affichait l'ancienne adresse ;
--   · `core-renew` transmettait une adresse périmée dans
--     `metadata.customerEmail` à chaque prélèvement.
--
-- LE CORRECTIF
--   1. Déclencheur `after update of email on auth.users`. Supabase ne modifie
--      `auth.users.email` qu'APRÈS confirmation du lien envoyé à la nouvelle
--      adresse, jamais à la demande : le profil ne suit donc qu'une adresse
--      effectivement confirmée. La demande en attente vit dans
--      `auth.users.email_change`, que l'on ne lit pas.
--   2. Rattrapage des profils déjà désynchronisés.
--
-- CE QUI NE CHANGE PAS
--   · Le droit d'écriture du navigateur sur `profiles` reste limité à `lang`
--     (§6). La fonction est `security definer` : c'est elle qui écrit, pas le
--     rôle `authenticated`.
--   · Les relances de fin d'essai lisent déjà `auth.users.email` et non
--     `profiles.email` (§5.2) : elles ne dépendaient pas de ce correctif.
--
-- Idempotent.
-- ============================================================================

begin;

create or replace function public.sync_profile_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
     set email = new.email
   where id = new.id
     and email is distinct from new.email;
  return new;
end;
$$;

-- La fonction n'a pas à être appelable directement par un client.
revoke all on function public.sync_profile_email() from public;

drop trigger if exists on_auth_user_email_updated on auth.users;
create trigger on_auth_user_email_updated
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute function public.sync_profile_email();

-- Rattrapage. Le nombre de lignes touchées est affiché : un rattrapage dont le
-- décompte n'est pas lu est le défaut constaté sur la purge du 25/08/2026.
do $$
declare n bigint;
begin
  update public.profiles p
     set email = u.email
    from auth.users u
   where u.id = p.id
     and p.email is distinct from u.email;
  get diagnostics n = row_count;
  raise notice 'profiles.email rattrapé sur % ligne(s).', n;
end $$;

-- Contrôle final : plus aucun écart.
do $$
begin
  if exists (select 1 from public.profiles p join auth.users u on u.id = p.id
             where p.email is distinct from u.email) then
    raise exception 'Des profils restent désynchronisés après rattrapage.';
  end if;
end $$;

commit;

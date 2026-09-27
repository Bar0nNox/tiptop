-- ============================================================================
-- TipTop — migration-decor-scope.sql                     (v1.23.0)
--
-- Élargit la liste blanche du collaborateur (`doc_locked_part`, v1.15.0) à
-- deux clés du document :
--
--   · `decor`  — éléments de décor (piscine, scène, bar…), NOUVEAUX en v1.23.0.
--     Ils décrivent la salle, pas l'événement : même statut que les repères
--     d'orientation (`edges`), que la v1.15.0 a ouverts au collaborateur.
--
--   · `groups` — regroupements « même table » / « côte à côte », présents dans
--     le document depuis la v1.18.0 et JAMAIS ajoutés à cette liste.
--
-- LE DÉFAUT CORRIGÉ AU PASSAGE (`groups`)
-- La liste blanche fonctionne comme prévu : une clé ajoutée plus tard est
-- verrouillée par défaut. Mais la v1.18.0 a ajouté `groups` sans l'ouvrir. Deux
-- conséquences, constatées à la lecture des sources le 27/09/2026 et non encore
-- éprouvées en base :
--   1. un collaborateur qui crée ou modifie un regroupement voit son
--      enregistrement refusé (COLLAB_SCOPE_DOC) — message « hors périmètre »,
--      puis rechargement : le travail est perdu ;
--   2. `normalize()` ajoute `groups: []` à tout document qui ne l'a pas. Sur un
--      plan créé avant la v1.18.0 et que le propriétaire n'a pas réenregistré
--      depuis, la PREMIÈRE écriture d'un collaborateur, quelle qu'elle soit,
--      est refusée.
-- `decor` aurait subi exactement le même sort : `normalize()` ajoute
-- `decor: []` — d'où ce correctif dans la même migration, avant la livraison
-- des pages.
--
-- CE QUI NE CHANGE PAS : le nom, la couleur, la date, `eventName`, `themeColor`
-- restent verrouillés ; toute AUTRE clé ajoutée plus tard le restera aussi.
--
-- ⚠ À exécuter AVANT de déposer la v1.23.0 : sans elle, tout collaborateur
-- ouvrant un plan verrait sa première écriture refusée (`decor: []` ajouté).
--
-- Idempotent.
-- ============================================================================

begin;

do $$
begin
  if not exists (select 1 from pg_proc where proname = 'doc_locked_part') then
    raise exception 'Fonction doc_locked_part() absente — exécuter migration-collab-scope.sql d''abord.';
  end if;
end $$;

create or replace function public.doc_locked_part(doc jsonb)
returns jsonb
language sql
immutable
as $$
  select (coalesce(doc, '{}'::jsonb))
           - '_writer'      -- marqueur d'écriture, jamais significatif
           - 'tables'       -- ✅ modifiable par le collaborateur
           - 'guests'       -- ✅
           - 'nextTable'    -- ✅ compteur lié aux tables
           - 'edges'        -- ✅ repères d'orientation (décrivent la salle)
           - 'groups'       -- ✅ regroupements (v1.18.0) — ouvert en v1.23.0
           - 'decor';       -- ✅ éléments de décor (v1.23.0, décrivent la salle)
$$;

-- Contrôles : ce qui doit s'ouvrir s'ouvre, ce qui doit rester fermé le reste.
do $$
declare
  base jsonb := '{"eventName":"E","themeColor":"#EAC873","tables":[],"guests":[],"edges":{}}';
begin
  if public.doc_locked_part(base) is distinct from
     public.doc_locked_part(base || '{"groups":[{"id":"g","members":["a","b"]}],"decor":[{"id":"d"}]}') then
    raise exception 'groups / decor restent verrouillés.';
  end if;
  if public.doc_locked_part(base) is not distinct from
     public.doc_locked_part(base || '{"themeColor":"#FF0000"}') then
    raise exception 'themeColor n''est plus verrouillée.';
  end if;
  if public.doc_locked_part(base) is not distinct from
     public.doc_locked_part(base || '{"eventName":"Autre"}') then
    raise exception 'eventName n''est plus verrouillé.';
  end if;
  if public.doc_locked_part(base) is not distinct from
     public.doc_locked_part(base || '{"cleFuture":1}') then
    raise exception 'Une clé inconnue n''est plus verrouillée par défaut.';
  end if;
end $$;

commit;

-- =========================================================================
-- Contrôle au navigateur, connecté en COLLABORATEUR (le SQL Editor s'exécute
-- en rôle de service et ne prouve rien) :
--   const c = window.getSupabaseClient();
--   const id = new URLSearchParams(location.search).get("event");
--   // doit RÉUSSIR : ajout d'un élément de décor
--   console.log(await c.from("events").update({ doc: {...state,
--     decor:[...(state.decor||[]), {id:"dX",kind:"rect",label:"Test",w:200,h:120,x:500,y:500}]} }).eq("id", id));
--   // doit ÉCHOUER : changement de couleur
--   console.log(await c.from("events").update({ doc: {...state, themeColor:"#FF0000"} }).eq("id", id));
-- =========================================================================

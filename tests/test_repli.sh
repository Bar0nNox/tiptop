#!/bin/bash
# Contrôle du correctif n°1 : le repli silencieux sur le sandbox est supprimé.
# Deux volets — sans le volet POSITIF, l'échec ne prouverait rien (le module
# pourrait échouer pour une tout autre raison).
CORE="$(cd "$(dirname "$0")/../supabase/functions/_shared" && pwd)/core.ts"
echo 'import "'"$CORE"'"; console.log("MODULE CHARGE");' > /tmp/imp_tiptop.ts

echo "--- Volet NÉGATIF : sans CORE_API_BASE, le module doit REFUSER de se charger ---"
sortie=$(env -u CORE_API_BASE -u CORE_AUTH_BASE /tmp/deno run --allow-read --allow-env --no-lock /tmp/imp_tiptop.ts 2>&1)
if echo "$sortie" | grep -q "CORE_API_BASE absent"; then
  echo "  OK   refus explicite, message nommant le secret"
elif echo "$sortie" | grep -q "MODULE CHARGE"; then
  echo "  ECHEC le module s'est chargé — le repli sandbox est TOUJOURS EN PLACE"; exit 1
else
  echo "  ECHEC refus, mais pour un autre motif :"; echo "$sortie" | head -3; exit 1
fi

echo "--- Volet POSITIF : avec les secrets, le module doit se charger ---"
sortie=$(CORE_API_BASE="https://api.corebycarlo.com/api/v1/partner" \
         CORE_AUTH_BASE="https://api.corebycarlo.com/api/v1/auth/partner" \
         /tmp/deno run --allow-read --allow-env --no-lock /tmp/imp_tiptop.ts 2>&1)
if echo "$sortie" | grep -q "MODULE CHARGE"; then
  echo "  OK   chargement normal"
else
  echo "  ECHEC le module refuse alors que les secrets sont posés :"; echo "$sortie" | head -3; exit 1
fi

echo "--- Aucune URL sandbox ne subsiste dans le fichier ---"
n=$(grep -c "sandbox-api.corebycarlo.com" "$CORE")
echo "  occurrences : $n (attendu 0)"
[ "$n" -eq 0 ] || exit 1
echo
echo "  Correctif n°1 vérifié."

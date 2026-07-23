# TipTop — Guide de mise en ligne, pas à pas

Ce guide est écrit pour être suivi sans connaissance technique. Chaque section correspond
à un site web (un « outil ») sur lequel vous allez créer un compte et cliquer sur des boutons.
Suivez les sections **dans l'ordre**. Comptez environ 2 à 3 heures au total la première fois.

Vous n'aurez **rien à installer** sur votre ordinateur : tout se fait dans le navigateur.

À la fin, TipTop sera en ligne et testable. Le paiement réel (Stripe) est laissé de côté
pour l'instant, comme convenu — vous activerez un compte de test « à la main ».

---

## Ce dont vous avez besoin avant de commencer

- Une adresse email.
- Le dossier `tiptop-saas` (les fichiers du projet), décompressé sur votre ordinateur.
- Un moyen de paiement (certains services demandent une carte pour créer le compte, même
  sur les offres gratuites — vous ne serez pas facturé aux volumes de départ).

Gardez à portée de main un document (un simple bloc-notes) où **noter les clés** que je vous
demanderai de copier. On les appellera :
- `URL_SUPABASE`
- `CLE_PUBLIQUE_SUPABASE`
- `ID_GOOGLE`
- `SECRET_GOOGLE`
- `CLE_STRIPE`
- `SECRET_WEBHOOK_STRIPE`
- `ADRESSE_DU_SITE`

---

## Outil 1 — Supabase (la base de données et les comptes utilisateurs)

Supabase stocke les événements et gère les comptes de vos clients.

### 1.1 Créer le projet
1. Allez sur **https://supabase.com** et cliquez sur **Start your project** / **Sign in**.
   Créez un compte (avec Google ou une adresse email).
2. Une fois connecté, cliquez sur **New project**.
3. Donnez un nom (ex. `tiptop`).
4. **Region** : choisissez **Central EU (Frankfurt)**. *C'est important — c'est ce qui garde
   les données en Europe pour le RGPD.*
5. Choisissez un mot de passe pour la base de données (notez-le quelque part, vous n'en
   aurez pas besoin tout de suite mais gardez-le).
6. Cliquez sur **Create new project** et patientez 1 à 2 minutes que le projet s'initialise.

### 1.2 Récupérer les deux clés
1. Dans le menu de gauche, cliquez sur l'icône **Settings** (roue dentée) tout en bas.
2. Cliquez sur **API**.
3. Vous voyez un champ **Project URL** : copiez-le, notez-le comme `URL_SUPABASE`.
   (Il ressemble à `https://abcdefgh.supabase.co`.)
4. Un peu plus bas, section **Project API keys**, copiez la clé nommée **anon / public** :
   notez-la comme `CLE_PUBLIQUE_SUPABASE`. *Cette clé est faite pour être publique, aucun risque.*

### 1.3 Créer les tables (copier-coller un texte, une seule fois)
1. Dans le menu de gauche, cliquez sur **SQL Editor**.
2. Cliquez sur **New query**.
3. Ouvrez le fichier `supabase/schema.sql` du dossier du projet avec un éditeur de texte
   (Bloc-notes, TextEdit…), sélectionnez **tout** le contenu, copiez-le.
4. Collez-le dans la grande zone de l'éditeur SQL de Supabase.
5. Cliquez sur **Run** (en bas à droite). Vous devez voir « Success ». *Cela crée les tables
   et les règles de sécurité. À faire une seule fois.*

### 1.4 Activer la connexion par email et par Google
1. Menu de gauche > **Authentication** > **Sign In / Providers** (ou **Providers**).
2. **Email** est normalement déjà activé. Laissez-le tel quel.
3. **Google** : cliquez dessus, activez-le. Il vous demande un **Client ID** et un
   **Client Secret**. Vous ne les avez pas encore — on les obtient à l'Outil 2.
   **Laissez cet onglet ouvert**, on y reviendra à l'étape 2.4.

> Repère : ne fermez pas Supabase, vous y revenez plusieurs fois.

---

## Outil 2 — Google Cloud (le bouton « Se connecter avec Google »)

C'est l'étape la plus fastidieuse. Prenez votre temps, suivez à la lettre.

### 2.1 Créer un projet Google
1. Allez sur **https://console.cloud.google.com**. Connectez-vous avec un compte Google.
2. En haut, cliquez sur le sélecteur de projet puis **New Project**. Nommez-le `tiptop`,
   cliquez **Create**, puis sélectionnez ce projet.

### 2.2 Configurer l'écran de consentement
1. Menu (☰) > **APIs & Services** > **OAuth consent screen**.
2. Choisissez **External**, cliquez **Create**.
3. Remplissez : nom de l'application (`TipTop`), votre email de support, votre email
   développeur. Le reste peut rester vide. **Save and continue** jusqu'au bout.
4. À l'étape « Test users », vous pouvez ajouter votre propre email pour tester.
   **Save and continue**, puis **Back to dashboard**.

### 2.3 Créer les identifiants
1. **APIs & Services** > **Credentials**.
2. **Create Credentials** > **OAuth client ID**.
3. **Application type** : **Web application**.
4. Section **Authorized redirect URIs** : cliquez **Add URI** et collez cette adresse,
   en remplaçant la partie du milieu par votre `URL_SUPABASE` :
   ```
   https://VOTRE-URL-SUPABASE.supabase.co/auth/v1/callback
   ```
   (Exemple : si `URL_SUPABASE` = `https://abcdefgh.supabase.co`, vous collez
   `https://abcdefgh.supabase.co/auth/v1/callback`.)
5. Cliquez **Create**. Une fenêtre affiche **Client ID** et **Client secret** :
   notez-les comme `ID_GOOGLE` et `SECRET_GOOGLE`.

### 2.4 Revenir sur Supabase pour coller ces valeurs
1. Retournez sur l'onglet Supabase (Authentication > Providers > Google).
2. Collez `ID_GOOGLE` dans **Client ID** et `SECRET_GOOGLE` dans **Client Secret**.
3. Cliquez **Save**.

> Le bouton « Se connecter avec Google » de TipTop fonctionnera une fois le site en ligne (Outil 4).

---

## Outil 3 — Stripe (les paiements — préparation seulement)

On crée le compte et on récupère les clés, **sans définir de tarif** pour l'instant.

### 3.1 Créer le compte
1. Allez sur **https://stripe.com**, créez un compte.
2. Restez en **mode Test** (interrupteur « Test mode » en haut à droite, activé).
   *En mode test, aucun vrai paiement n'a lieu.*

### 3.2 Récupérer la clé secrète
1. Menu **Developers** > **API keys**.
2. Copiez la **Secret key** (commence par `sk_test_...`) : notez-la comme `CLE_STRIPE`.

### 3.3 Le webhook — à faire APRÈS avoir déployé les fonctions (Outil 5)
On y revient plus bas. Pour l'instant, passez à l'Outil 4.

> Les tarifs (produits Stripe) seront créés plus tard, quand vous les aurez décidés.
> Tant qu'ils n'existent pas, le bouton « S'abonner » renverra une erreur — c'est normal
> et sans gravité : on contournera avec un compte de test à l'étape finale.

---

## Outil 4 — OVH (nom de domaine + hébergement du site)

On achète le nom de domaine et l'hébergement chez OVH, puis on y dépose les fichiers de
TipTop. Tout au même endroit, société française, coût fixe.

### 4.1 Acheter le domaine et l'hébergement
1. Allez sur **https://www.ovhcloud.com/fr/** > **Web Cloud** > **Hébergement web**.
2. Choisissez une offre d'hébergement mutualisé (l'offre **Perso** suffit largement pour
   démarrer ; les offres supérieures servent surtout si vous hébergez plusieurs sites).
3. Pendant la commande, OVH vous propose d'**associer un nom de domaine**. Saisissez le nom
   voulu (ex. `tiptop.fr`), vérifiez qu'il est disponible, et ajoutez-le à la commande.
   *Domaine + hébergement dans la même commande = tout est lié automatiquement.*
4. Créez votre compte OVH, réglez la commande. Comptez quelques minutes à quelques heures
   pour que l'hébergement et le domaine soient activés (vous recevez un email de confirmation).

> Notez votre nom de domaine complet : ce sera votre `ADRESSE_DU_SITE`, sous la forme
> `https://www.tiptop.fr` (ou sans `www`, on le fixera à l'étape 4.4).

### 4.2 Activer le HTTPS (le cadenas de sécurité)
1. Connectez-vous à l'**espace client OVH** > **Hébergements** > votre hébergement.
2. Onglet **Multisite** : vérifiez que votre domaine y figure. Si une option **SSL** /
   **certificat** est proposée, activez-la (certificat gratuit Let's Encrypt).
3. Onglet **Informations générales** ou **Paramètres du serveur** : cherchez l'option
   **Forcer HTTPS** et activez-la. *Cela garantit que le site s'ouvre toujours en `https://`.*

> L'activation du certificat peut prendre jusqu'à 24 h. Ne vous inquiétez pas si le cadenas
> n'apparaît pas immédiatement.

### 4.3 Renseigner vos clés dans le projet AVANT de déposer les fichiers
1. Sur votre ordinateur, ouvrez le fichier `shared/supabase-config.js` (avec le Bloc-notes).
2. Remplacez :
   - `https://VOTRE-PROJET.supabase.co` par votre `URL_SUPABASE`,
   - `VOTRE_ANON_KEY` par votre `CLE_PUBLIQUE_SUPABASE`.
3. Enregistrez le fichier.

### 4.4 Déposer les fichiers du site
OVH range les fichiers d'un site dans un dossier appelé **`www`**. On y met tout le contenu
du dossier `tiptop-saas`.

Deux façons de déposer les fichiers, au choix :

**Méthode A — Explorateur de fichiers OVH (dans le navigateur, le plus simple)**
1. Espace client OVH > votre hébergement > onglet **FTP - SSH**, puis cliquez sur
   **Explorateur de fichiers** (ou utilisez l'outil « File Manager » proposé).
2. Entrez dans le dossier **`www`**.
3. **Supprimez** le fichier de démonstration éventuellement présent (souvent `index.html`
   d'OVH qui affiche « Congratulations »).
4. **Envoyez** tout le contenu du dossier `tiptop-saas` : `index.html`, `auth.html`,
   `dashboard.html`, `event.html`, `.htaccess`, et le dossier `shared/`.
   ⚠️ Déposez le **contenu** du dossier, pas le dossier `tiptop-saas` lui-même — les fichiers
   doivent être directement dans `www`, pas dans `www/tiptop-saas`.
   ⚠️ N'envoyez **pas** le dossier `supabase/` : ces fichiers servent uniquement à Supabase
   (Outil 5), ils n'ont rien à faire sur l'hébergement web.

**Méthode B — Logiciel FTP (FileZilla, gratuit)**
1. Dans l'email d'activation OVH, vous avez un identifiant et un serveur FTP. Récupérez aussi
   le mot de passe FTP dans l'espace client (onglet FTP - SSH, vous pouvez le réinitialiser).
2. Installez **FileZilla** (https://filezilla-project.org), connectez-vous avec ces
   informations, ouvrez le dossier `www`, et glissez-y le contenu de `tiptop-saas`
   (mêmes règles que ci-dessus : contenu directement dans `www`, sans le dossier `supabase/`).

### 4.5 Vérifier
Ouvrez votre domaine (`https://www.tiptop.fr`) dans le navigateur : la page d'accueil de
TipTop doit apparaître. Notez l'adresse exacte qui fonctionne (avec ou sans `www`) comme
`ADRESSE_DU_SITE` — c'est celle que vous utiliserez à l'étape 4.6.

### 4.6 Autoriser cette adresse dans Supabase
1. Retour sur Supabase > **Authentication** > **URL Configuration**.
2. Dans **Site URL**, collez votre `ADRESSE_DU_SITE` (ex. `https://www.tiptop.fr`).
3. Dans **Redirect URLs**, ajoutez la même adresse suivie de `/**`
   (ex. `https://www.tiptop.fr/**`). **Save**.

> Rappel important : à l'Outil 2 (Google Cloud, étape 2.3), l'adresse de redirection que vous
> avez renseignée pointe vers Supabase, pas vers votre domaine — elle reste correcte, ne la
> changez pas. Le domaine, lui, n'intervient que dans Site URL / Redirect URLs ci-dessus.

---

## Outil 5 — Les fonctions de paiement (dans Supabase, sans rien installer)

Supabase permet de créer ces petites fonctions directement dans son tableau de bord.
Vous allez en créer **trois**, en copiant-collant du texte fourni dans le projet.

### 5.1 Enregistrer les « secrets » (mots de passe des fonctions)
1. Sur Supabase > **Settings** (roue dentée) > **Edge Functions** > onglet **Secrets**
   (ou **Project Settings > Functions > Secrets** selon l'affichage).
2. Ajoutez ces secrets un par un (bouton **Add new secret**), nom puis valeur :
   - `STRIPE_SECRET_KEY` = votre `CLE_STRIPE`
   - `SITE_URL` = votre `ADRESSE_DU_SITE`
   - `STRIPE_WEBHOOK_SECRET` = laissez vide pour l'instant, on le remplira en 5.4
   (Les valeurs `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` sont ajoutées
   automatiquement par Supabase, ne les touchez pas.)

### 5.2 Créer la première fonction
1. Menu de gauche > **Edge Functions** > **Deploy a new function** > **Via Editor**.
2. Nommez-la **exactement** : `create-checkout-session`.
3. Effacez le code d'exemple. Ouvrez sur votre ordinateur le fichier
   `supabase/functions/create-checkout-session/index.ts`, copiez **tout** son contenu,
   collez-le dans l'éditeur.
4. Cliquez **Deploy**.

### 5.3 Répéter pour les deux autres
Refaites exactement 5.2 pour :
- fonction `customer-portal` ← contenu de `supabase/functions/customer-portal/index.ts`
- fonction `stripe-webhook` ← contenu de `supabase/functions/stripe-webhook/index.ts`

> Note pour `stripe-webhook` : si l'éditeur propose une option **« Verify JWT »** ou
> **« Enforce JWT verification »**, **désactivez-la** pour cette fonction uniquement
> (Stripe l'appelle sans identifiant Supabase ; sa sécurité est assurée autrement).
> Les deux autres fonctions gardent le réglage par défaut.

### 5.4 Brancher le webhook Stripe
1. Retournez sur Stripe > **Developers** > **Webhooks** > **Add endpoint**.
2. Dans **Endpoint URL**, collez votre `URL_SUPABASE` suivie de
   `/functions/v1/stripe-webhook`
   (ex. `https://abcdefgh.supabase.co/functions/v1/stripe-webhook`).
3. **Select events** : ajoutez ces trois événements —
   `checkout.session.completed`, `customer.subscription.updated`,
   `customer.subscription.deleted`. Cliquez **Add endpoint**.
4. Sur la page du webhook créé, cliquez **Reveal** sous **Signing secret** :
   copiez la valeur (commence par `whsec_...`).
5. Retour sur Supabase > Settings > Edge Functions > Secrets : renseignez
   `STRIPE_WEBHOOK_SECRET` avec cette valeur. **Save**.

---

## Outil 6 — Tester que tout marche

### 6.1 Créer votre compte de test
1. Ouvrez votre `ADRESSE_DU_SITE` dans le navigateur.
2. Cliquez **Créer un compte**, inscrivez-vous avec votre email. Confirmez via l'email reçu.
3. Connectez-vous. Vous arrivez sur le tableau de bord. Il indiquera « aucun abonnement » —
   c'est attendu (pas encore de tarif).

### 6.2 Activer votre compte « à la main » (contourne le paiement)
1. Sur Supabase > **SQL Editor** > **New query**.
2. Collez la ligne suivante en remplaçant l'email par le vôtre :
   ```sql
   update profiles set subscription_status = 'active' where email = 'vous@exemple.fr';
   ```
3. **Run**. Votre compte est maintenant « actif ».

### 6.3 Essayer le produit
1. Rechargez le tableau de bord de TipTop. Vous pouvez maintenant **créer un événement**.
2. Ouvrez-le, ajoutez des tables et des invités, testez l'export.
3. Pour vérifier la synchronisation temps réel : ouvrez le **même** événement dans un second
   navigateur (ou une fenêtre privée), connecté au même compte, et vérifiez que les
   modifications d'un côté apparaissent de l'autre.

Si tout cela fonctionne, la partie technique est en place.

---

## Ce qu'il reste, plus tard

- **Définir les tarifs** puis créer les produits correspondants dans Stripe, et renseigner
  leurs identifiants dans les secrets Supabase (`STRIPE_PRICE_...`). Le bouton « S'abonner »
  deviendra alors fonctionnel.
- **Passer Stripe en mode « Live »** (vrais paiements) une fois les tests concluants.
- **Rédiger les mentions légales** (CGV, CGU, politique de confidentialité) — obligatoire
  avant d'ouvrir au public. Ce n'est pas technique, mais c'est bloquant.

---

## En cas de blocage

- Une erreur « accès refusé » à la création d'événement = le compte n'est pas « actif ».
  Refaites 6.2.
- Le bouton Google ne marche pas = vérifiez que l'adresse de redirection (2.3, point 4)
  correspond exactement à votre `URL_SUPABASE`, et que Site URL / Redirect URLs sont
  bien renseignés (4.3).
- Le bouton « S'abonner » renvoie une erreur = normal tant qu'aucun tarif n'est créé.

/* =========================================================================
   TipTop — Internationalisation (i18n)
   FR / EN. Détection automatique depuis le navigateur, sélecteur pour changer,
   choix mémorisé (localStorage + profil quand une session existe).

   Utilisation dans le HTML :
     <h1 data-i18n="landing_title">…texte FR par défaut…</h1>
     <input data-i18n-placeholder="search_placeholder">
     <button data-i18n="save"></button>            (texte injecté)
     <span data-i18n-html="legal_note">…</span>     (contenu HTML autorisé)
     <button data-i18n-aria="close">✕</button>      (libellé lecteur d'écran)

   En JS :
     t("save")                → chaîne traduite
     t("days_left", {n: 3})   → interpolation {n}
     applyI18n(root)          → (ré)applique sur un sous-arbre nouvellement créé
     setLang("en")            → change la langue et ré-applique
   ========================================================================= */
(function () {
  "use strict";

  const SUPPORTED = ["fr", "en"];
  const FALLBACK = "en";           // langue de repli si le navigateur n'est ni FR ni EN
  const STORE_KEY = "tiptop_lang";

  const DICT = {
    fr: {
      // — Commun —
      save: "Enregistrer", cancel: "Annuler", confirm: "Confirmer", close: "Fermer",
      delete: "Supprimer", create: "Créer", back: "Retour", loading: "Chargement…",
      ok_understood: "J'ai compris",
      logout: "Se déconnecter", my_account: "Mon compte", my_events: "Mes événements",
      // — Accueil (index) —
      landing_login: "Se connecter",
      landing_title: "Le plan de table de votre événement, à plusieurs, en temps réel.",
      landing_sub: "Placez vos invités, gérez les régimes et incompatibilités, collaborez avec votre équipe — et exportez en un clic.",
      landing_cta: "Créer un compte",
      feat_auto_title: "Placement automatique",
      feat_auto_desc: "Respecte les groupes et les incompatibilités entre invités.",
      feat_collab_title: "Collaboration en temps réel",
      feat_collab_desc: "Votre équipe modifie le même plan, en direct.",
      feat_export_title: "Export PNG / JSON",
      feat_export_desc: "Partagez ou imprimez le plan final en un clic.",
      // — Authentification —
      auth_signin: "Se connecter", auth_signup: "Créer un compte",
      auth_email: "Adresse e-mail", auth_password: "Mot de passe",
      auth_signin_btn: "Se connecter", auth_signup_btn: "Créer mon compte",
      auth_forgot_link: "Mot de passe oublié ?",
      auth_forgot_title: "Réinitialiser le mot de passe",
      auth_forgot_sub: "Indiquez votre adresse : nous vous enverrons un lien pour choisir un nouveau mot de passe.",
      auth_forgot_btn: "Envoyer le lien",
      auth_forgot_sending: "Envoi…",
      auth_forgot_sent: "Si un compte existe pour cette adresse, un lien vient d'être envoyé. Pensez à vérifier vos indésirables.",
      auth_back_to_login: "← Retour à la connexion",
      reset_title: "Choisir un nouveau mot de passe",
      reset_sub: "Saisissez le mot de passe que vous souhaitez utiliser désormais.",
      reset_new_password: "Nouveau mot de passe",
      reset_confirm_password: "Confirmer le mot de passe",
      reset_btn: "Enregistrer le mot de passe",
      reset_saving: "Enregistrement…",
      reset_mismatch: "Les deux mots de passe ne correspondent pas.",
      reset_too_short: "Le mot de passe doit contenir au moins 8 caractères.",
      reset_done: "Mot de passe modifié. Vous allez être redirigé.",
      reset_invalid_link: "Ce lien est expiré ou a déjà été utilisé. Demandez-en un nouveau depuis la page de connexion.",
      reset_checking: "Vérification du lien…",
      auth_google: "Continuer avec Google",
      auth_to_signup: "Pas encore de compte ? Créez-en un",
      auth_to_signin: "Déjà un compte ? Connectez-vous",
      auth_check_email: "Vérifiez votre boîte mail pour confirmer votre inscription.",
      auth_bad_credentials: "E-mail ou mot de passe incorrect.",
      auth_sub_login: "Accédez à vos plans de table.",
      auth_sub_signup: "Quelques secondes suffisent.",
      auth_or: "ou",
      auth_wait: "Veuillez patienter…",
      auth_logging_in: "Connexion…", auth_creating: "Création…",
      auth_redirecting: "Redirection…",
      auth_account_created: "Compte créé. Un e-mail de confirmation vient de vous être envoyé — cliquez sur le lien qu'il contient, puis connectez-vous ici.",
      auth_google_unavailable: "Connexion Google indisponible.",
      // — Tableau de bord —
      dash_new_event: "+ Nouvel événement",
      dash_no_events: "Aucun événement pour l'instant.",
      dash_shared_badge: "Partagé avec vous",
      dash_modified: "Modifié le {date}",
      dash_event_on: "Le {date}",
      dash_trial: "Essai gratuit — {n} jour(s) restant(s), un événement inclus. Aucune carte requise.",
      dash_active: "Abonnement actif ({period}) — valable jusqu'au {date}.",
      dash_canceled: "Abonnement résilié — accès jusqu'au {date}.",
      dash_past_due: "Le dernier prélèvement a échoué. Une nouvelle tentative est programmée.",
      dash_inactive_trial_over: "Votre essai gratuit est terminé — vos plans sont conservés, abonnez-vous pour les modifier de nouveau.",
      dash_readonly_badge: "Lecture seule",
      dash_sub_monthly: "S'abonner — 9,90 €/mois",
      // Relances de fin d'essai (v1.20.0) — confirmation depuis un lien d'e-mail
      dash_sub_confirm_title: "Confirmer votre abonnement",
      dash_sub_confirm_monthly: "Formule mensuelle, 9,90 € par mois, résiliable à tout moment. Vous allez être redirigé vers la page sécurisée de notre prestataire de paiement pour enregistrer votre carte.",
      dash_sub_confirm_annual: "Formule annuelle, 89,90 € par an — deux mois et demi offerts par rapport au mensuel, résiliable à tout moment. Vous allez être redirigé vers la page sécurisée de notre prestataire de paiement pour enregistrer votre carte.",
      dash_sub_confirm_go: "Continuer",
      dash_sub_already_title: "Vous êtes déjà abonné",
      dash_sub_already_msg: "Votre abonnement est actif. Vous pouvez le consulter depuis « Mon compte ».",
      // Page de désabonnement
      unsub_title: "Désabonnement — TipTop",
      unsub_heading: "Ne plus recevoir ces messages ?",
      unsub_intro: "Vous ne recevrez plus de relance au sujet de votre essai gratuit. Les messages concernant votre compte et votre abonnement continueront d'être envoyés.",
      unsub_confirm: "Confirmer",
      unsub_keep: "Continuer à les recevoir",
      unsub_done_heading: "Vous êtes désabonné",
      unsub_done_body: "Vous ne recevrez plus de relance d'essai. Votre compte est inchangé.",
      unsub_bad_heading: "Ce lien n'est pas valide",
      unsub_bad_body: "Le lien semble incomplet. Ouvrez-le de nouveau depuis l'e-mail, ou écrivez-nous et nous nous en occupons.",
      unsub_back: "Retour à TipTop",
      unsub_error: "Une erreur est survenue. Réessayez dans un instant.",
      dash_sub_annual: "S'abonner — 89,90 €/an",
      dash_new_event_name: "Nouvel événement",
      dash_event_name_label: "Nom de l'événement",
      dash_load_error: "Impossible de charger vos événements.",
      dash_redirecting: "Redirection…",
      dash_sub_indisponible: "Abonnement indisponible",
      dash_sub_needed_title: "Abonnement requis",
      dash_sub_needed_msg: "Un abonnement actif est nécessaire pour créer un événement.",
      dash_pay_not_init: "Paiement non initié",
      dash_card_failed_title: "Enregistrement de la carte échoué",
      dash_card_failed_msg: "Votre carte n'a pas pu être enregistrée. Vous pouvez réessayer.",
      dash_del_event_title: "Supprimer cet événement ?",
      dash_del_event_msg: "Cette action est irréversible. Le plan de table et la liste des invités seront perdus.",
      dash_del_event_msg_trial: "Cette action est irréversible.\n\nVotre essai gratuit inclut un seul événement : une fois celui-ci supprimé, vous ne pourrez pas en créer un autre pendant l'essai.",
      dash_keep: "Conserver",
      dash_trial_one_event_title: "Un seul événement pendant l'essai",
      dash_trial_one_event_msg: "Votre essai gratuit inclut un seul événement. Abonnez-vous pour en créer d'autres.",
      dash_create_failed: "Création impossible",
      dash_days_left: "Essai gratuit — {n} jour(s) restant(s), un événement inclus. Aucune carte requise.",
      dash_active_until: "Abonnement actif ({period}) — valable jusqu'au {date}.",
      dash_past_due_msg: "Le dernier prélèvement a échoué. Une nouvelle tentative est programmée — vérifiez la validité de votre carte pour éviter l'interruption du service.",
      // — Période —
      period_monthly: "mensuel", period_annual: "annuel",
      // — Éditeur —
      // — Éditeur : interface —
      ed_table_prefix: "Table",
      ed_placed_counter: "placés",
      ed_no_seat: "{n} sans siège",
      ed_unresolved: "{n} incompatibilité(s) non résolue(s)",
      ed_detected: "{n} invité(s) détecté(s)",
      ed_added: "{n} invité(s) ajouté(s)",
      ed_drop_to_unassign: "Lâcher ici pour retirer l'invité de sa table",
      ed_table_name_ph: "ex. Table des mariés",
      ed_filter_guests: "Filtrer les invités…",
      ed_open_guest_list: "Ouvrir la liste des invités",
      ed_no_event: "Aucun événement spécifié. Retournez au tableau de bord.",
      ed_event_not_found: "Événement introuvable ou accès refusé.",
      ed_guests: "Invités", ed_diners: "Convives",
      ed_no_guest_yet: "Aucun invité pour l'instant.", ed_import_list: "Importer une liste",
      ed_empty_room: "La salle est vide",
      ed_empty_hint: "Ajoutez une table ronde ou rectangulaire pour commencer.",
      ed_table_hint: "Cliquez sur une table pour modifier son nom, sa forme et son nombre de couverts.",
      ed_table_settings: "Paramètres de la table",
      ed_table_name: "Nom de la table", ed_shape: "Forme",
      ed_round: "Ronde", ed_rect: "Rectangulaire",
      ed_orientation: "Orientation", ed_horizontal: "Horizontale", ed_vertical: "Verticale",
      ed_ends: "Places en bout (têtes de table)", ed_seats: "Nombre de couverts",
      ed_seats_short: "couverts",
      ed_diet_generic: "Régime particulier",
      ed_zoom_in: "Zoomer", ed_zoom_out: "Dézoomer", ed_zoom_reset: "Réinitialiser le zoom",
      ed_rename_event: "Cliquez pour renommer l'événement",
      ed_seated: "Placé",
      dash_finalizing: "Carte enregistrée. Finalisation du paiement…",
      dash_invalid_response: "réponse invalide",
      dash_sub_unavailable_msg: "Impossible de démarrer l'abonnement : {reason}",

      ed_delete_table_btn: "Supprimer la table",
      ed_import_title: "Importer la liste d'invités",
      ed_import_hint1: "Un invité par ligne. Colonnes séparées par une virgule :",
      ed_import_cols: "Nom, Groupe, Régime",
      ed_import_hint2: ". Seul le nom est obligatoire.",
      ed_import_file: "Importer un fichier .csv / .txt",
      ed_import_replace: "Remplacer la liste existante",
      ed_import_add: "Ajouter à la liste",
      ed_edit_guest: "Modifier l'invité",
      ed_name: "Nom", ed_group: "Groupe", ed_diet: "Régime / note",
      ed_group_ph: "ex. Amis",
      ed_diet_ph: "ex. Végétarien, allergie fruits de mer…",
      ed_import_ph: "Jean Dupont, Famille mariée\nClaire Martin, Famille mariée, Végétarienne\nLéo Bernard, Amis\nSofia Rossi, Collègues, Sans gluten",
      ed_plus_one: "Accompagné d'un +1 (ajoute un convive lié)",
      ed_relations: "Placement",
      ed_relations_help: "Pour chaque invité : ensemble, séparés, ou sans contrainte.",
      ed_rel_none: "—",
      ed_rel_same_table: "Même table",
      ed_rel_next_to: "Côte à côte",
      ed_rel_not_table: "Pas à la même table",
      ed_rel_not_next: "Pas côte à côte",
      ed_no_other_guest: "Aucun autre invité.",
      ed_issues_left: "{n} contrainte(s) non respectée(s) — bord rouge.",
      ed_avoid: "Ne pas asseoir avec",
      ed_delete_guest: "Supprimer l'invité",
      ed_auto_desc: "Répartit les invités en tenant au mieux les groupes et les séparations définis dans chaque fiche : « même table » et « côte à côte » d'un côté, « pas à la même table » et « pas côte à côte » de l'autre. Les contraintes restées non tenues gardent leur bord rouge.",
      ed_auto_fill: "Compléter les sièges libres",
      ed_auto_reset: "Vider et tout replacer",
      ed_save_export: "Sauvegarde & export",
      ed_customization: "Personnalisation",
      ed_event_name: "Nom de l'événement", ed_theme_color: "Couleur de l'interface",
      ed_event_date: "Date de l'événement", ed_no_date: "Sans date",
      ed_date_cleared: "Date retirée.",
      ed_export_print: "Imprimer / Exporter en PDF",
      ed_import_plan: "Importer un plan (.json)",
      ed_autosave_note: "Votre travail est sauvegardé automatiquement dans ce navigateur.",
      // — Éditeur : messages —
      ed_clash_warn: "Attention : {a} et {b} sont marqués « ne pas asseoir ensemble ».",
      ed_guest_picked: "Invité sélectionné — touchez un siège pour le placer.",
      ed_seat_picked: "Convive sélectionné — cliquez un autre siège pour le déplacer.",
      ed_delete_selected_table: "Supprimer la table sélectionnée ?",
      ed_add_guest_name: "Nom de l'invité", ed_add_guest_ph: "Prénom Nom", ed_add: "Ajouter",
      ed_delete_guest_q: "Supprimer « {name} » ?",
      ed_delete_guest_msg: "L'invité sera retiré de la liste et de sa place. Son éventuel +1 sera supprimé également.",
      ed_keep: "Conserver",
      ed_need_guests: "Importez d'abord des invités.",
      ed_need_tables: "Ajoutez d'abord des tables.",
      ed_no_guest_detected: "Aucun invité détecté.",
      ed_plan_imported: "Plan importé.", ed_invalid_file: "Fichier invalide.",
      ed_nothing_export: "Rien à exporter.",
      ed_export_failed: "L'export a échoué. Rechargez la page puis réessayez.",
      ed_reset_confirm: "Tout effacer",
      ed_save_interrupted: "Enregistrement en ligne interrompu — vos modifications restent sauvegardées sur cet appareil et seront renvoyées automatiquement.",
      ed_remove_access_q: "Retirer cet accès ?",
      ed_remove_access_msg: "Cette personne n'aura plus accès à ce plan de table. Vous pourrez lui envoyer un nouveau lien plus tard.",
      ed_remove_access_fail: "Impossible de retirer cet accès.",
      ed_access_removed: "Accès retiré.",
      ed_share_sub_only: "Partage réservé aux abonnés",
      ed_share_sub_only_msg: "La collaboration n'est pas incluse dans l'essai gratuit. Abonnez-vous pour partager vos plans de table.",
      ed_cap_title: "Nombre maximum atteint",
      ed_cap_msg: "Ce plan de table a atteint son nombre maximum de collaborateurs. Retirez un accès existant pour en inviter un autre.",
      ed_link_failed: "Lien non créé",
      ed_link_failed_msg: "Impossible de créer le lien pour le moment. Réessayez dans un instant.",
      ed_link_copied: "Lien copié.",
      ed_saving: "Enregistrement…",
      ed_retry: "Connexion instable, nouvelle tentative…",
      ed_save_failed: "Échec de l'enregistrement. Vos dernières modifications ne sont pas encore en ligne — elles seront renvoyées dès que possible.",
      ed_viewer_note: "Vous consultez ce plan de table en lecture seule.",
      ed_placer_note: "Vous pouvez déplacer les invités sur ce plan. Les tables, les fiches et les réglages sont gérés par le propriétaire.",
      ed_scope_readonly: "Votre accès est en lecture seule.",
      ed_scope_denied: "Le nom et la couleur de l'événement sont réservés à son propriétaire. La modification a été annulée.",
      ed_list_unavailable: "Liste indisponible.",
      ed_since: "depuis le {date}",
      ed_add_round: "Table ronde", ed_add_rect: "Table rectangulaire",
      ed_import: "Importer invités", ed_auto: "Placement automatique",
      ed_add_guest: "Ajouter un invité", ed_search: "Rechercher un invité…",
      ed_export_png: "Exporter en PNG", ed_export_json: "Exporter (JSON)",
      ed_reset: "Tout effacer", ed_placed: "{done} / {total} placés",
      ed_role_placer: "Placement des invités", ed_role_viewer: "Lecture seule",
      // Abonnement expiré (v1.19.0) — distinct du rôle « lecture seule »
      ed_sub_expired: "Abonnement expiré — consultation seule. Vos plans sont conservés.",
      ed_sub_expired_cta: "S'abonner",
      ed_role_collab: "Collaborateur",
      ed_collab_note: "Vous pouvez modifier les tables et les invités de ce plan. Le nom et la couleur de l'événement sont gérés par son propriétaire.",
      ed_delete_table: "Supprimer cette table ?",
      ed_delete_table_msg: "Les convives qui y étaient placés retourneront dans la liste des invités.",
      ed_reset_title: "Tout effacer ?",
      ed_reset_msg: "Toutes les tables et tous les invités de cet événement seront supprimés. Cette action est irréversible.",
      ed_share_title: "Partage & collaboration",
      ed_share_saved: "Toutes les modifications sont enregistrées — synchronisé en temps réel.",
      ed_invite_person: "Inviter une personne",
      ed_create_link: "Créer un lien",
      ed_copy_link: "Copier le lien",
      ed_link_note: "Ce lien est valable 7 jours. La personne devra créer un compte.",
      ed_who_has_access: "Personnes ayant accès",
      ed_nobody_yet: "Personne pour l'instant.",
      ed_remove_access: "Retirer",
      // — Mon compte —
      acc_back: "← Mes événements",
      acc_identity_hint: "Adresse de connexion et sécurité.",
      acc_connection: "Connexion",
      acc_save_email: "Modifier l'adresse",
      acc_email_note: "Un message de confirmation sera envoyé à la nouvelle adresse. Le changement ne prend effet qu'une fois ce lien ouvert.",
      acc_save_password: "Modifier le mot de passe",
      acc_password_ph: "8 caractères minimum",
      acc_new_email_ph: "nouvelle@adresse.fr",
      acc_google_note: "Vous vous connectez avec Google : votre mot de passe est géré par Google.",
      acc_sub_hint: "Formule en cours, échéance et moyen de paiement.",
      acc_status: "Statut", acc_plan: "Formule", acc_card: "Carte enregistrée",
      acc_next_due: "Prochaine échéance", acc_trial_end: "Fin de l'essai",
      acc_access_until: "Accès jusqu'au", acc_retry_on: "Nouvelle tentative", acc_since: "Depuis le",
      acc_badge_trial: "Essai gratuit", acc_badge_canceled: "Résilié", acc_badge_active: "Actif",
      acc_badge_past_due: "Paiement en échec", acc_badge_inactive: "Inactif",
      acc_plan_monthly: "Mensuelle (9,90 €/mois)", acc_plan_annual: "Annuelle (89,90 €/an)",
      acc_subscribe: "S'abonner", acc_none: "Aucune", acc_registered: "Enregistrée",
      acc_billing_hint: "Historique de vos paiements.",
      acc_no_payments: "Aucun paiement pour le moment.",
      acc_history_unavailable: "Historique indisponible.",
      acc_col_date: "Date", acc_col_plan: "Formule", acc_col_status: "Statut", acc_col_amount: "Montant",
      acc_paid: "Payé", acc_pending: "En cours",
      acc_account_hint: "Récupérer vos données, ou fermer définitivement votre compte.",
      acc_export_done: "Export téléchargé.", acc_export_failed: "Export impossible pour le moment.",
      acc_email_needed: "Indiquez une adresse.",
      acc_email_sent: "Un message de confirmation vient d'être envoyé à {email}.",
      acc_password_short: "Le mot de passe doit contenir au moins 8 caractères.",
      acc_password_changed: "Mot de passe modifié.",
      acc_cancel_title: "Résilier votre abonnement ?",
      acc_cancel_msg: "Votre accès reste ouvert jusqu'au {date}. Aucun prélèvement ne sera effectué ensuite.\n\nVotre carte enregistrée sera supprimée : pour reprendre l'abonnement, vous devrez la saisir à nouveau.",
      acc_cancel_confirm: "Résilier", acc_cancel_keep: "Conserver mon abonnement",
      acc_canceled_ok: "Abonnement résilié. Accès maintenu jusqu'au {date}.",
      acc_resumed: "Résiliation annulée.",
      acc_card_needed_title: "Carte à réenregistrer",
      acc_card_needed_msg: "Votre résiliation est annulée. Comme votre carte avait été supprimée, enregistrez-en une nouvelle depuis le tableau de bord pour que le prochain prélèvement puisse aboutir.",
      acc_del_title: "Supprimer définitivement votre compte ?",
      acc_del_msg: "Tous vos événements, plans de table et listes d'invités seront effacés. Les personnes avec qui vous avez partagé un plan de table en perdront l'accès.\n\nCette action est irréversible.",
      acc_del_confirm_btn: "Supprimer mon compte",
      acc_del_confirm_title: "Confirmation",
      acc_del_confirm_msg: "Saisissez SUPPRIMER pour confirmer.",
      acc_del_word: "SUPPRIMER",
      acc_del_failed: "Suppression impossible",
      acc_deleted_title: "Compte supprimé",
      acc_deleted_msg: "Votre compte et vos données ont été supprimés. Merci d'avoir utilisé TipTop.",
      acc_title: "Mon compte",
      acc_identity: "Identité", acc_subscription: "Abonnement",
      acc_billing: "Facturation", acc_account: "Compte",
      acc_email: "Adresse e-mail", acc_change_email: "Changer d'adresse e-mail",
      acc_change_password: "Changer de mot de passe",
      acc_export: "Exporter mes données", acc_delete: "Supprimer mon compte",
      acc_cancel_sub: "Résilier mon abonnement", acc_resume_sub: "Reprendre mon abonnement",
      // — Invitation —
      join_title: "Rejoindre un plan de table",
      join_checking: "Vérification de votre invitation…",
      join_granted: "Accès accordé",
      join_open: "Ouvrir le plan de table",
      join_unavailable: "Invitation indisponible",
      join_back_home: "Retour à l'accueil",
      join_continue: "Continuer",
      join_incomplete: "Ce lien est incomplet. Demandez-en un nouveau à la personne qui vous a invité.",
      join_cannot_verify: "Impossible de vérifier cette invitation pour le moment. Réessayez dans un instant.",
      join_you_have_access: "Vous avez accès à <b>{name}</b>.",
      role_owner: "Propriétaire",
      join_need_account: "Créez un compte ou connectez-vous pour accéder à ce plan de table. Votre invitation sera appliquée automatiquement.",
      // — Sélecteur de langue —
      lang_label: "Langue", lang_fr: "Français", lang_en: "English",
      display_label: "Affichage",
      theme_label: "Thème", theme_default: "Couleur", theme_mono: "Noir & blanc",
      ed_seat_names_label: "Noms sur les sièges",
      ed_seat_names_initials: "Initiales", ed_seat_names_full: "Noms complets",
    },
    en: {
      save: "Save", cancel: "Cancel", confirm: "Confirm", close: "Close",
      delete: "Delete", create: "Create", back: "Back", loading: "Loading…",
      ok_understood: "Got it",
      logout: "Sign out", my_account: "My account", my_events: "My events",
      landing_login: "Sign in",
      landing_title: "Your event's seating plan — together, in real time.",
      landing_sub: "Seat your guests, handle diets and conflicts, collaborate with your team — and export in one click.",
      landing_cta: "Create an account",
      feat_auto_title: "Automatic seating",
      feat_auto_desc: "Respects guest groups and incompatibilities.",
      feat_collab_title: "Real-time collaboration",
      feat_collab_desc: "Your team edits the same plan, live.",
      feat_export_title: "PNG / JSON export",
      feat_export_desc: "Share or print the final plan in one click.",
      auth_signin: "Sign in", auth_signup: "Create an account",
      auth_email: "Email address", auth_password: "Password",
      auth_signin_btn: "Sign in", auth_signup_btn: "Create my account",
      auth_forgot_link: "Forgot your password?",
      auth_forgot_title: "Reset your password",
      auth_forgot_sub: "Enter your email address and we'll send you a link to choose a new password.",
      auth_forgot_btn: "Send the link",
      auth_forgot_sending: "Sending…",
      auth_forgot_sent: "If an account exists for this address, a link has just been sent. Remember to check your spam folder.",
      auth_back_to_login: "← Back to sign in",
      reset_title: "Choose a new password",
      reset_sub: "Enter the password you'd like to use from now on.",
      reset_new_password: "New password",
      reset_confirm_password: "Confirm password",
      reset_btn: "Save password",
      reset_saving: "Saving…",
      reset_mismatch: "The two passwords don't match.",
      reset_too_short: "The password must be at least 8 characters.",
      reset_done: "Password updated. You'll be redirected shortly.",
      reset_invalid_link: "This link has expired or has already been used. Request a new one from the sign-in page.",
      reset_checking: "Checking the link…",
      auth_google: "Continue with Google",
      auth_to_signup: "No account yet? Create one",
      auth_to_signin: "Already have an account? Sign in",
      auth_check_email: "Check your inbox to confirm your registration.",
      auth_bad_credentials: "Incorrect email or password.",
      auth_sub_login: "Access your seating plans.",
      auth_sub_signup: "It only takes a few seconds.",
      auth_or: "or",
      auth_wait: "Please wait…",
      auth_logging_in: "Signing in…", auth_creating: "Creating…",
      auth_redirecting: "Redirecting…",
      auth_account_created: "Account created. A confirmation email has just been sent — click the link inside, then sign in here.",
      auth_google_unavailable: "Google sign-in unavailable.",
      dash_new_event: "+ New event",
      dash_no_events: "No events yet.",
      dash_shared_badge: "Shared with you",
      dash_modified: "Edited on {date}",
      dash_event_on: "On {date}",
      dash_trial: "Free trial — {n} day(s) left, one event included. No card required.",
      dash_active: "Active subscription ({period}) — valid until {date}.",
      dash_canceled: "Subscription cancelled — access until {date}.",
      dash_past_due: "The last payment failed. A new attempt is scheduled.",
      dash_inactive_trial_over: "Your free trial has ended — your plans are kept; subscribe to edit them again.",
      dash_readonly_badge: "Read-only",
      dash_sub_monthly: "Subscribe — €9.90/month",
      // Trial reminders (v1.20.0) — confirmation from an email link
      dash_sub_confirm_title: "Confirm your subscription",
      dash_sub_confirm_monthly: "Monthly plan, €9.90 per month, cancel any time. You will be taken to our payment provider's secure page to register your card.",
      dash_sub_confirm_annual: "Yearly plan, €89.90 per year — two and a half months free compared with monthly, cancel any time. You will be taken to our payment provider's secure page to register your card.",
      dash_sub_confirm_go: "Continue",
      dash_sub_already_title: "You are already subscribed",
      dash_sub_already_msg: "Your subscription is active. You can review it from \"My account\".",
      // Unsubscribe page
      unsub_title: "Unsubscribe — TipTop",
      unsub_heading: "Stop receiving these emails?",
      unsub_intro: "You will no longer receive reminders about your free trial. Emails about your account and your subscription will continue to be sent.",
      unsub_confirm: "Confirm",
      unsub_keep: "Keep receiving them",
      unsub_done_heading: "You are unsubscribed",
      unsub_done_body: "You will not receive any further trial reminders. Your account is unchanged.",
      unsub_bad_heading: "This link is not valid",
      unsub_bad_body: "The link appears incomplete. Open it again from the email, or write to us and we will take care of it.",
      unsub_back: "Back to TipTop",
      unsub_error: "Something went wrong. Please try again in a moment.",
      dash_sub_annual: "Subscribe — €89.90/year",
      dash_new_event_name: "New event",
      dash_event_name_label: "Event name",
      dash_load_error: "Unable to load your events.",
      dash_redirecting: "Redirecting…",
      dash_sub_indisponible: "Subscription unavailable",
      dash_sub_needed_title: "Subscription required",
      dash_sub_needed_msg: "An active subscription is required to create an event.",
      dash_pay_not_init: "Payment not initiated",
      dash_card_failed_title: "Card registration failed",
      dash_card_failed_msg: "Your card could not be registered. You can try again.",
      dash_del_event_title: "Delete this event?",
      dash_del_event_msg: "This cannot be undone. The seating plan and guest list will be lost.",
      dash_del_event_msg_trial: "This cannot be undone.\n\nYour free trial includes a single event: once deleted, you won't be able to create another one during the trial.",
      dash_keep: "Keep",
      dash_trial_one_event_title: "One event during the trial",
      dash_trial_one_event_msg: "Your free trial includes a single event. Subscribe to create more.",
      dash_create_failed: "Creation failed",
      dash_days_left: "Free trial — {n} day(s) left, one event included. No card required.",
      dash_active_until: "Active subscription ({period}) — valid until {date}.",
      dash_past_due_msg: "The last payment failed. A new attempt is scheduled — please check your card is valid to avoid interruption.",
      period_monthly: "monthly", period_annual: "yearly",
      // — Editor: interface —
      ed_table_prefix: "Table",
      ed_placed_counter: "seated",
      ed_no_seat: "{n} without a seat",
      ed_unresolved: "{n} unresolved conflict(s)",
      ed_detected: "{n} guest(s) detected",
      ed_added: "{n} guest(s) added",
      ed_drop_to_unassign: "Drop here to unseat the guest",
      ed_table_name_ph: "e.g. Head table",
      ed_filter_guests: "Filter guests…",
      ed_open_guest_list: "Open guest list",
      ed_no_event: "No event specified. Return to the dashboard.",
      ed_event_not_found: "Event not found, or access denied.",
      ed_guests: "Guests", ed_diners: "Diners",
      ed_no_guest_yet: "No guests yet.", ed_import_list: "Import a list",
      ed_empty_room: "The room is empty",
      ed_empty_hint: "Add a round or rectangular table to get started.",
      ed_table_hint: "Click a table to change its name, shape and number of seats.",
      ed_table_settings: "Table settings",
      ed_table_name: "Table name", ed_shape: "Shape",
      ed_round: "Round", ed_rect: "Rectangular",
      ed_orientation: "Orientation", ed_horizontal: "Horizontal", ed_vertical: "Vertical",
      ed_ends: "Seats at the ends (head of table)", ed_seats: "Number of seats",
      ed_seats_short: "seats",
      ed_diet_generic: "Special diet",
      ed_zoom_in: "Zoom in", ed_zoom_out: "Zoom out", ed_zoom_reset: "Reset zoom",
      ed_rename_event: "Click to rename the event",
      ed_seated: "Seated",
      dash_finalizing: "Card registered. Finalising payment…",
      dash_invalid_response: "invalid response",
      dash_sub_unavailable_msg: "Could not start the subscription: {reason}",

      ed_delete_table_btn: "Delete table",
      ed_import_title: "Import guest list",
      ed_import_hint1: "One guest per line. Columns separated by a comma:",
      ed_import_cols: "Name, Group, Diet",
      ed_import_hint2: ". Only the name is required.",
      ed_import_file: "Import a .csv / .txt file",
      ed_import_replace: "Replace the existing list",
      ed_import_add: "Add to the list",
      ed_edit_guest: "Edit guest",
      ed_name: "Name", ed_group: "Group", ed_diet: "Diet / note",
      ed_group_ph: "e.g. Friends",
      ed_diet_ph: "e.g. Vegetarian, shellfish allergy…",
      ed_import_ph: "James Turner, Bride's family\nClaire Bennett, Bride's family, Vegetarian\nLeo Harper, Friends\nSofia Rossi, Colleagues, Gluten-free",
      ed_plus_one: "With a +1 (adds a linked diner)",
      ed_relations: "Seating rules",
      ed_relations_help: "For each guest: together, apart, or no constraint.",
      ed_rel_none: "—",
      ed_rel_same_table: "Same table",
      ed_rel_next_to: "Side by side",
      ed_rel_not_table: "Not same table",
      ed_rel_not_next: "Not side by side",
      ed_no_other_guest: "No other guest.",
      ed_issues_left: "{n} constraint(s) not met — red border.",
      ed_avoid: "Do not seat with",
      ed_delete_guest: "Delete guest",
      ed_auto_desc: "Seats guests while honouring, as far as possible, the groups and separations set on each guest card: \u201csame table\u201d and \u201cside by side\u201d on one hand, \u201cnot at the same table\u201d and \u201cnot side by side\u201d on the other. Constraints left unmet keep their red border.",
      ed_auto_fill: "Fill empty seats",
      ed_auto_reset: "Clear and reseat everyone",
      ed_save_export: "Save & export",
      ed_customization: "Customisation",
      ed_event_name: "Event name", ed_theme_color: "Interface colour",
      ed_event_date: "Event date", ed_no_date: "No date",
      ed_date_cleared: "Date removed.",
      ed_export_print: "Print / Export as PDF",
      ed_import_plan: "Import a plan (.json)",
      ed_autosave_note: "Your work is saved automatically in this browser.",
      // — Editor: messages —
      ed_clash_warn: "Warning: {a} and {b} are marked as \u00ab do not seat together \u00bb.",
      ed_guest_picked: "Guest selected — tap a seat to place them.",
      ed_seat_picked: "Diner selected — click another seat to move them.",
      ed_delete_selected_table: "Delete the selected table?",
      ed_add_guest_name: "Guest name", ed_add_guest_ph: "First name Last name", ed_add: "Add",
      ed_delete_guest_q: "Delete \u00ab {name} \u00bb?",
      ed_delete_guest_msg: "The guest will be removed from the list and from their seat. Any +1 will be deleted too.",
      ed_keep: "Keep",
      ed_need_guests: "Import guests first.",
      ed_need_tables: "Add tables first.",
      ed_no_guest_detected: "No guest detected.",
      ed_plan_imported: "Plan imported.", ed_invalid_file: "Invalid file.",
      ed_nothing_export: "Nothing to export.",
      ed_export_failed: "Export failed. Reload the page and try again.",
      ed_reset_confirm: "Clear all",
      ed_save_interrupted: "Online saving interrupted — your changes remain saved on this device and will be sent again automatically.",
      ed_remove_access_q: "Remove this access?",
      ed_remove_access_msg: "This person will no longer have access to this seating plan. You can send them a new link later.",
      ed_remove_access_fail: "Unable to remove this access.",
      ed_access_removed: "Access removed.",
      ed_share_sub_only: "Sharing is for subscribers",
      ed_share_sub_only_msg: "Collaboration is not included in the free trial. Subscribe to share your seating plans.",
      ed_cap_title: "Maximum reached",
      ed_cap_msg: "This seating plan has reached its maximum number of collaborators. Remove an existing access to invite someone else.",
      ed_link_failed: "Link not created",
      ed_link_failed_msg: "Unable to create the link right now. Please try again shortly.",
      ed_link_copied: "Link copied.",
      ed_saving: "Saving…",
      ed_retry: "Unstable connection, retrying…",
      ed_save_failed: "Saving failed. Your latest changes are not online yet — they will be sent again as soon as possible.",
      ed_viewer_note: "You are viewing this seating plan in read-only mode.",
      ed_placer_note: "You can move guests on this plan. Tables, guest details and settings are managed by the owner.",
      ed_scope_readonly: "Your access is read-only.",
      ed_scope_denied: "The event name and colour are reserved for its owner. The change has been reverted.",
      ed_list_unavailable: "List unavailable.",
      ed_since: "since {date}",
      ed_add_round: "Round table", ed_add_rect: "Rectangular table",
      ed_import: "Import guests", ed_auto: "Automatic seating",
      ed_add_guest: "Add a guest", ed_search: "Search a guest…",
      ed_export_png: "Export as PNG", ed_export_json: "Export (JSON)",
      ed_reset: "Clear all", ed_placed: "{done} / {total} seated",
      ed_role_placer: "Guest seating", ed_role_viewer: "Read-only",
      // Expired subscription (v1.19.0) — distinct from the "viewer" role
      ed_sub_expired: "Subscription expired — viewing only. Your plans are kept.",
      ed_sub_expired_cta: "Subscribe",
      ed_role_collab: "Collaborator",
      ed_collab_note: "You can edit the tables and guests of this plan. The event name and colour are managed by its owner.",
      ed_delete_table: "Delete this table?",
      ed_delete_table_msg: "Guests seated here will return to the guest list.",
      ed_reset_title: "Clear everything?",
      ed_reset_msg: "All tables and guests for this event will be deleted. This cannot be undone.",
      ed_share_title: "Sharing & collaboration",
      ed_share_saved: "All changes saved — synced in real time.",
      ed_invite_person: "Invite someone",
      ed_create_link: "Create a link",
      ed_copy_link: "Copy link",
      ed_link_note: "This link is valid for 7 days. The person will need to create an account.",
      ed_who_has_access: "People with access",
      ed_nobody_yet: "No one yet.",
      ed_remove_access: "Remove",
      acc_back: "← My events",
      acc_identity_hint: "Sign-in address and security.",
      acc_connection: "Sign-in method",
      acc_save_email: "Change address",
      acc_email_note: "A confirmation message will be sent to the new address. The change only takes effect once that link is opened.",
      acc_save_password: "Change password",
      acc_password_ph: "8 characters minimum",
      acc_new_email_ph: "new@address.com",
      acc_google_note: "You sign in with Google: your password is managed by Google.",
      acc_sub_hint: "Current plan, renewal date and payment method.",
      acc_status: "Status", acc_plan: "Plan", acc_card: "Saved card",
      acc_next_due: "Next payment", acc_trial_end: "Trial ends",
      acc_access_until: "Access until", acc_retry_on: "Next attempt", acc_since: "Since",
      acc_badge_trial: "Free trial", acc_badge_canceled: "Cancelled", acc_badge_active: "Active",
      acc_badge_past_due: "Payment failed", acc_badge_inactive: "Inactive",
      acc_plan_monthly: "Monthly (€9.90/month)", acc_plan_annual: "Yearly (€89.90/year)",
      acc_subscribe: "Subscribe", acc_none: "None", acc_registered: "Registered",
      acc_billing_hint: "Your payment history.",
      acc_no_payments: "No payments yet.",
      acc_history_unavailable: "History unavailable.",
      acc_col_date: "Date", acc_col_plan: "Plan", acc_col_status: "Status", acc_col_amount: "Amount",
      acc_paid: "Paid", acc_pending: "Pending",
      acc_account_hint: "Retrieve your data, or permanently close your account.",
      acc_export_done: "Export downloaded.", acc_export_failed: "Export unavailable right now.",
      acc_email_needed: "Please enter an address.",
      acc_email_sent: "A confirmation message has just been sent to {email}.",
      acc_password_short: "The password must be at least 8 characters.",
      acc_password_changed: "Password updated.",
      acc_cancel_title: "Cancel your subscription?",
      acc_cancel_msg: "Your access remains open until {date}. No further payment will be taken.\n\nYour saved card will be deleted: to resume the subscription, you'll need to enter it again.",
      acc_cancel_confirm: "Cancel subscription", acc_cancel_keep: "Keep my subscription",
      acc_canceled_ok: "Subscription cancelled. Access maintained until {date}.",
      acc_resumed: "Cancellation reverted.",
      acc_card_needed_title: "Card must be re-registered",
      acc_card_needed_msg: "Your cancellation has been reverted. As your card had been deleted, please register a new one from the dashboard so the next payment can go through.",
      acc_del_title: "Permanently delete your account?",
      acc_del_msg: "All your events, seating plans and guest lists will be erased. People you shared a seating plan with will lose access.\n\nThis cannot be undone.",
      acc_del_confirm_btn: "Delete my account",
      acc_del_confirm_title: "Confirmation",
      acc_del_confirm_msg: "Type DELETE to confirm.",
      acc_del_word: "DELETE",
      acc_del_failed: "Deletion failed",
      acc_deleted_title: "Account deleted",
      acc_deleted_msg: "Your account and data have been deleted. Thank you for using TipTop.",
      acc_title: "My account",
      acc_identity: "Identity", acc_subscription: "Subscription",
      acc_billing: "Billing", acc_account: "Account",
      acc_email: "Email address", acc_change_email: "Change email address",
      acc_change_password: "Change password",
      acc_export: "Export my data", acc_delete: "Delete my account",
      acc_cancel_sub: "Cancel my subscription", acc_resume_sub: "Resume my subscription",
      join_title: "Join a seating plan",
      join_checking: "Checking your invitation…",
      join_granted: "Access granted",
      join_open: "Open the seating plan",
      join_unavailable: "Invitation unavailable",
      join_back_home: "Back to home",
      join_continue: "Continue",
      join_incomplete: "This link is incomplete. Ask the person who invited you for a new one.",
      join_cannot_verify: "Unable to verify this invitation right now. Please try again shortly.",
      join_you_have_access: "You have access to <b>{name}</b>.",
      role_owner: "Owner",
      join_need_account: "Create an account or sign in to access this seating plan. Your invitation will be applied automatically.",
      lang_label: "Language", lang_fr: "Français", lang_en: "English",
      display_label: "Display",
      theme_label: "Theme", theme_default: "Colour", theme_mono: "Black & white",
      ed_seat_names_label: "Names on seats",
      ed_seat_names_initials: "Initials", ed_seat_names_full: "Full names",
    },
  };

  // — Détection de la langue —
  function detect() {
    try {
      const stored = localStorage.getItem(STORE_KEY);
      if (stored && SUPPORTED.includes(stored)) return stored;
    } catch (e) {}
    const nav = (navigator.language || navigator.userLanguage || "").slice(0, 2).toLowerCase();
    return SUPPORTED.includes(nav) ? nav : FALLBACK;
  }

  let LANG = detect();
  document.documentElement.lang = LANG;

  function t(key, vars) {
    let s = (DICT[LANG] && DICT[LANG][key] != null) ? DICT[LANG][key]
          : (DICT[FALLBACK][key] != null ? DICT[FALLBACK][key] : key);
    if (vars) for (const k in vars) s = s.replace(new RegExp("\\{" + k + "\\}", "g"), vars[k]);
    return s;
  }

  // — Application sur le DOM —
  function applyI18n(root) {
    root = root || document;
    root.querySelectorAll("[data-i18n]").forEach(el => {
      const key = el.getAttribute("data-i18n");
      if (DICT[LANG][key] != null || DICT[FALLBACK][key] != null) el.textContent = t(key);
    });
    root.querySelectorAll("[data-i18n-html]").forEach(el => {
      const key = el.getAttribute("data-i18n-html");
      if (DICT[LANG][key] != null || DICT[FALLBACK][key] != null) el.innerHTML = t(key);
    });
    root.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
      const key = el.getAttribute("data-i18n-placeholder");
      if (DICT[LANG][key] != null || DICT[FALLBACK][key] != null) el.setAttribute("placeholder", t(key));
    });
    root.querySelectorAll("[data-i18n-title]").forEach(el => {
      const key = el.getAttribute("data-i18n-title");
      if (DICT[LANG][key] != null || DICT[FALLBACK][key] != null) el.setAttribute("title", t(key));
    });
    // Libellés lus par les lecteurs d'écran. Distinct de `title` : un bouton
    // à icône porte souvent les deux, et seul `aria-label` est annoncé.
    root.querySelectorAll("[data-i18n-aria]").forEach(el => {
      const key = el.getAttribute("data-i18n-aria");
      if (DICT[LANG][key] != null || DICT[FALLBACK][key] != null) el.setAttribute("aria-label", t(key));
    });
  }

  // `persistToProfile` à false quand l'appel vient de la lecture du profil
  // lui-même : inutile de réécrire ce qu'on vient d'y lire.
  function setLang(lang, persistToProfile) {
    if (!SUPPORTED.includes(lang)) return;
    if (persistToProfile === undefined) persistToProfile = true;
    LANG = lang;
    document.documentElement.lang = lang;
    try { localStorage.setItem(STORE_KEY, lang); } catch (e) {}
    applyI18n(document);
    const sel = document.querySelector(".lang-switch");
    if (sel && sel.value !== lang) sel.value = lang;
    document.dispatchEvent(new CustomEvent("i18n:changed", { detail: { lang } }));
    // Si une session existe, on mémorise aussi la préférence côté profil (best effort).
    if (persistToProfile && window.getSupabaseClient) {
      try {
        const sb = window.getSupabaseClient();
        sb.auth.getUser().then(({ data }) => {
          if (data && data.user) sb.from("profiles").update({ lang }).eq("id", data.user.id);
        });
      } catch (e) {}
    }
  }

  // — Sélecteur de langue injectable —
  function mountLangSwitcher(container) {
    if (!container) return;
    const sel = document.createElement("select");
    sel.className = "lang-switch";
    sel.setAttribute("aria-label", t("lang_label"));
    SUPPORTED.forEach(code => {
      const o = document.createElement("option");
      o.value = code; o.textContent = code.toUpperCase();
      if (code === LANG) o.selected = true;
      sel.appendChild(o);
    });
    sel.addEventListener("change", () => setLang(sel.value));
    container.appendChild(sel);
  }

  // Retire le masquage anti-FOUC posé par le snippet inline du <head>.
  function reveal() {
    document.documentElement.classList.remove("i18n-pending");
  }

  function applyAndReveal() {
    applyI18n(document);
    reveal();
  }

  // Applique dès que le DOM est prêt (les scripts en fin de body s'exécutent après le parse).
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", applyAndReveal);
  } else {
    applyAndReveal();
  }

  /* Préférence enregistrée au profil : elle suit l'utilisateur d'un appareil à
     l'autre, là où localStorage reste local. On ne la lit que si aucun choix n'a
     été fait sur CET appareil — un choix explicite local reste prioritaire, sinon
     changer de langue ici serait aussitôt écrasé par le profil.
     Lecture asynchrone (après la session) : sur un nouvel appareil, la langue peut
     donc basculer juste après le chargement. Acceptable, et sans récidive puisque
     le choix est alors mémorisé localement. */
  function syncLangFromProfile() {
    let hasLocalChoice = false;
    try { hasLocalChoice = !!localStorage.getItem(STORE_KEY); } catch (e) {}
    if (hasLocalChoice || !window.getSupabaseClient) return;
    try {
      const sb = window.getSupabaseClient();
      sb.auth.getUser().then(({ data }) => {
        if (!data || !data.user) return;
        sb.from("profiles").select("lang").eq("id", data.user.id).single()
          .then(({ data: row }) => {
            if (row && row.lang && SUPPORTED.includes(row.lang) && row.lang !== LANG) {
              setLang(row.lang, false);
            }
          }, () => {});
      }, () => {});
    } catch (e) {}
  }
  syncLangFromProfile();

  window.t = t;
  window.applyI18n = applyI18n;
  window.setLang = setLang;
  window.getLang = () => LANG;
  window.mountLangSwitcher = mountLangSwitcher;
})();

/*
  ============================================================
  CHEZ BOBETTE — RÉGLAGES DU SITE
  Modifiez les valeurs ci-dessous : le site se met à jour partout
  (premier écran, affichettes, fiche de tournage, visite, pied de page).

  LES MENTIONS « EXEMPLE »
  Une ligne qui porte   exemple: true   est une supposition : le site
  l'affiche avec une petite étiquette jaune « exemple ».
    - Le propriétaire confirme une valeur : corrigez-la, puis effacez
      « exemple: true » sur cette ligne.
    - Tout est confirmé : mettez  mentionsExemple: false  ci-dessous.
      C'est le seul réglage à changer, toutes les étiquettes disparaissent.

  Les lignes « _en » sont la version anglaise.
  ============================================================
*/
window.BOBETTE = {
  mentionsExemple: true,

  adresse: "850, avenue Duluth Est",
  adresse_en: "850 Duluth Avenue East",
  ville: "Montréal (Québec)",
  quartier: "Plateau-Mont-Royal",

  // Les annuaires donnent 514 522-2612 ; la vitrine semble dire 522-2672. À vérifier avec le propriétaire.
  telephone: { valeur: "514 522-2612", exemple: true },
  // Reçoit les demandes de tournage tant que le formulaire en ligne n'est pas branché.
  courriel: { valeur: "proprietaire@exemple.com", exemple: true },

  // jours : 0 = dimanche, 1 = lundi … 6 = samedi. Heures au format 24 h.
  heures: [
    { jours: "Lundi au vendredi", jours_en: "Monday to Friday", court: "Lun – ven", court_en: "Mon – Fri",
      j: [1, 2, 3, 4, 5], ouvre: "08:00", ferme: "23:00" },                                   // donné par Jupiterre
    { jours: "Samedi et dimanche", jours_en: "Saturday and Sunday", court: "Sam – dim", court_en: "Sat – Sun",
      j: [6, 0], ouvre: "09:00", ferme: "21:00", exemple: true }
  ],
  achalandage: {
    texte: "Plus tranquille en matinée la semaine. Plus achalandé le dimanche.",
    texte_en: "Quieter on weekday mornings. Busiest on Sundays.",
    exemple: true
  },

  // L'ordre compte : 0 = laveuse, 1 = sécheuse, 2 = service tout inclus, 3 = manteaux d'hiver.
  // La laveuse (ligne 0) est le prix affiché au premier écran.
  tarifs: [
    { nom: "Laveuse", nom_en: "Washer", prix: "3,50 $", prix_en: "$3.50", exemple: true },
    { nom: "Sécheuse", nom_en: "Dryer", prix: "0,25 $ par tranche", prix_en: "$0.25 per time block", exemple: true },
    { nom: "Service tout inclus", nom_en: "Full-service wash", court: "Tout inclus", court_en: "Full service", prix: "8,25 $", prix_en: "$8.25",
      note: "Affiché en vitrine", note_en: "Posted in the window" },
    { nom: "Manteau d'hiver", nom_en: "Winter coat", prix: "12 $ · 2 pour 20 $", prix_en: "$12 · 2 for $20",
      note: "Affiché en vitrine", note_en: "Posted in the window" }
  ],

  // Bon à savoir. Ne changez pas les « id » : la visite animée s'en sert.
  pratique: [
    { id: "paiement", titre: "Monnaie", titre_en: "Coins",
      texte: "Les machines prennent les pièces de 25 ¢.", texte_en: "The machines take quarters." },
    { id: "monnayeur", titre: "Monnayeur", titre_en: "Change machine",
      texte: "Un monnayeur sur place change vos billets.", texte_en: "A change machine on site breaks your bills.", exemple: true },
    { id: "wifi", titre: "Wi-Fi", titre_en: "Wi-Fi",
      texte: "Wi-Fi gratuit pendant la brassée.", texte_en: "Free Wi-Fi while your load runs.", exemple: true },
    { id: "geante", titre: "Laveuse géante", titre_en: "Giant washer",
      texte: "Pour les tapis et les douillettes.", texte_en: "For rugs and comforters." },
    { id: "express", titre: "Bobette express", titre_en: "Bobette express",
      texte: "Cueillette et livraison sur appel.", texte_en: "Pickup and delivery by phone." }
  ],

  // Fiche technique pour les maisons de production.
  // Valeur vide ("") = le site affiche « à confirmer avec le propriétaire ». Ne rien inventer ici.
  lieu: [
    { nom: "Tarif de location", nom_en: "Rental rate", valeur: "", valeur_en: "" },
    { nom: "Surface", nom_en: "Floor area", valeur: "", valeur_en: "" },
    { nom: "Hauteur de plafond", nom_en: "Ceiling height", valeur: "", valeur_en: "" },
    { nom: "Électricité", nom_en: "Power", valeur: "", valeur_en: "" },
    { nom: "Stationnement et camions", nom_en: "Parking and trucks", valeur: "", valeur_en: "" },
    { nom: "Heures de tournage", nom_en: "Shooting hours", valeur: "", valeur_en: "" }
  ],

  // Tournages déjà faits sur place, avec l'accord de la production. Une ligne par production, par exemple :
  // { titre: "Nom de la série", annee: "2026", type: "Série", type_en: "Series", diffuseur: "Radio-Canada" }
  // Liste vide = le site n'en parle pas du tout.
  tournages: [],

  // Les vidéos de la visite sont des images provisoires. Mettre false après le tournage sur place.
  visiteProvisoire: true
};
